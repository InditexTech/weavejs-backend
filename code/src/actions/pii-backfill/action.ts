// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// One-off, idempotent backfill that encrypts the existing plaintext PII.
//
//   npm run pii:backfill -- --dry-run
//   npm run pii:backfill
//
// Rollout order:
//   1. Deploy this version with PII_ENCRYPTION_ENABLED=false (reads decrypt,
//      writes stay plaintext).
//   2. Run this script against the target database.
//   3. Set PII_ENCRYPTION_ENABLED=true and redeploy.

import { Pool } from "pg";
import { getPiiCrypto } from "../../lib/pii/index.js";
import { AUTH_PII_FIELDS } from "../../lib/pii/auth-adapter.js";
import { getDatabaseCloudCredentialsToken } from "../../utils.js";

const BATCH_SIZE = 500;
const dryRun = process.argv.includes("--dry-run");

// auth.<table> => logical model name used by the encryption contexts
const TABLES: Record<string, string> = { user: "user", account: "account" };

const quote = (identifier: string) => `"${identifier.replace(/"/g, '""')}"`;

async function run() {
  const pii = getPiiCrypto();

  const pool = new Pool({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    user: process.env.DATABASE_USERNAME,
    password:
      process.env.DATABASE_CLOUD_CREDENTIALS === "true"
        ? async () => (await getDatabaseCloudCredentialsToken()).token
        : process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ...(process.env.DATABASE_SSL === "true" && {
      ssl: { rejectUnauthorized: true },
    }),
    max: 2,
  });

  try {
    for (const [table, model] of Object.entries(TABLES)) {
      const fields = AUTH_PII_FIELDS[model]!;
      const columns = Object.keys(fields);
      const notEncrypted = columns
        .map(
          (c) => `(${quote(c)} IS NOT NULL AND ${quote(c)} NOT LIKE 'enc:%')`,
        )
        .join(" OR ");

      if (dryRun) {
        const { rows } = await pool.query(
          `SELECT count(*) FROM auth.${quote(table)} WHERE ${notEncrypted}`,
        );
        console.log(`[dry-run] auth.${table}: ${rows[0].count} rows pending`);
        continue;
      }

      let total = 0;

      for (;;) {
        const { rows } = await pool.query(
          `SELECT id, ${columns.map(quote).join(", ")} FROM auth.${quote(table)}
           WHERE ${notEncrypted} ORDER BY id LIMIT ${BATCH_SIZE}`,
        );
        if (rows.length === 0) break;

        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          for (const row of rows) {
            const values: string[] = [];
            const sets: string[] = [];
            for (const column of columns) {
              const current = row[column];
              if (typeof current !== "string" || current.startsWith("enc:")) {
                continue;
              }
              // better-auth always looks users up by lowercased email.
              const plaintext =
                table === "user" && column === "email"
                  ? current.toLowerCase()
                  : current;
              values.push(
                pii.encrypt(plaintext, `${model}.${column}`, fields[column]!),
              );
              sets.push(`${quote(column)} = $${values.length}`);
            }
            if (sets.length === 0) continue;
            values.push(row.id);
            await client.query(
              `UPDATE auth.${quote(table)} SET ${sets.join(", ")} WHERE id = $${values.length}`,
              values,
            );
          }
          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }

        total += rows.length;
        console.log(`auth.${table}: ${total} rows encrypted`);
      }

      console.log(`auth.${table}: done (${total})`);
    }

    // Comments only keep the user id, the rest is resolved from auth.user.
    for (const table of ["weavejs_thread", "weavejs_thread_answer"]) {
      const pending = `"userMetadata" IS DISTINCT FROM jsonb_build_object('id', "userId")`;
      if (dryRun) {
        const { rows } = await pool.query(
          `SELECT count(*) FROM public.${quote(table)} WHERE ${pending}`,
        );
        console.log(`[dry-run] ${table}: ${rows[0].count} rows with user PII`);
        continue;
      }
      const result = await pool.query(
        `UPDATE public.${quote(table)} SET "userMetadata" = jsonb_build_object('id', "userId") WHERE ${pending}`,
      );
      console.log(`${table}: stripped user PII on ${result.rowCount} rows`);
    }

    const sessions = dryRun
      ? await pool.query(
          `SELECT count(*) FROM auth."session" WHERE "ipAddress" IS NOT NULL OR "userAgent" IS NOT NULL`,
        )
      : await pool.query(
          `UPDATE auth."session" SET "ipAddress" = NULL, "userAgent" = NULL
           WHERE "ipAddress" IS NOT NULL OR "userAgent" IS NOT NULL`,
        );
    console.log(
      dryRun
        ? `[dry-run] auth.session: ${sessions.rows[0].count} rows with IP / user agent`
        : `auth.session: cleared IP / user agent on ${sessions.rowCount} rows`,
    );
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
