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

const quote = (identifier: string) => `"${identifier.replaceAll('"', '""')}"`;

type Row = Record<string, unknown> & { id: unknown };

const createPool = () =>
  new Pool({
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

const encryptRow = (
  pii: ReturnType<typeof getPiiCrypto>,
  table: string,
  model: string,
  columns: string[],
  fields: Record<string, string>,
  row: Row,
) => {
  const values: unknown[] = [];
  const sets: string[] = [];

  for (const column of columns) {
    const current = row[column];
    if (typeof current !== "string" || current.startsWith("enc:")) {
      continue;
    }
    // better-auth always looks users up by lowercased email.
    const plaintext =
      table === "user" && column === "email" ? current.toLowerCase() : current;
    values.push(pii.encrypt(plaintext, `${model}.${column}`, fields[column]!));
    sets.push(`${quote(column)} = $${values.length}`);
  }

  if (sets.length === 0) return null;

  values.push(row.id);
  return {
    text: `UPDATE auth.${quote(table)} SET ${sets.join(", ")} WHERE id = $${values.length}`,
    values,
  };
};

async function encryptBatch(
  pool: Pool,
  updates: { text: string; values: unknown[] }[],
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // A single client queues the statements, so they still run in order.
    await Promise.all(
      updates.map((update) => client.query(update.text, update.values)),
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function encryptTable(
  pool: Pool,
  pii: ReturnType<typeof getPiiCrypto>,
  table: string,
  model: string,
) {
  const fields = AUTH_PII_FIELDS[model]!;
  const columns = Object.keys(fields);
  const notEncrypted = columns
    .map((c) => `(${quote(c)} IS NOT NULL AND ${quote(c)} NOT LIKE 'enc:%')`)
    .join(" OR ");

  if (dryRun) {
    const { rows } = await pool.query(
      `SELECT count(*) FROM auth.${quote(table)} WHERE ${notEncrypted}`,
    );
    console.log(`[dry-run] auth.${table}: ${rows[0].count} rows pending`);
    return;
  }

  const processBatches = async (total: number): Promise<number> => {
    const { rows } = await pool.query<Row>(
      `SELECT id, ${columns.map(quote).join(", ")} FROM auth.${quote(table)}
       WHERE ${notEncrypted} ORDER BY id LIMIT ${BATCH_SIZE}`,
    );
    if (rows.length === 0) return total;

    const updates = rows
      .map((row) => encryptRow(pii, table, model, columns, fields, row))
      .filter((update) => update !== null);
    await encryptBatch(pool, updates);

    console.log(`auth.${table}: ${total + rows.length} rows encrypted`);
    return processBatches(total + rows.length);
  };

  const total = await processBatches(0);
  console.log(`auth.${table}: done (${total})`);
}

// Comments only keep the user id, the rest is resolved from auth.user.
async function stripCommentPii(pool: Pool, table: string) {
  const pending = `"userMetadata" IS DISTINCT FROM jsonb_build_object('id', "userId")`;

  if (dryRun) {
    const { rows } = await pool.query(
      `SELECT count(*) FROM public.${quote(table)} WHERE ${pending}`,
    );
    console.log(`[dry-run] ${table}: ${rows[0].count} rows with user PII`);
    return;
  }

  const result = await pool.query(
    `UPDATE public.${quote(table)} SET "userMetadata" = jsonb_build_object('id', "userId") WHERE ${pending}`,
  );
  console.log(`${table}: stripped user PII on ${result.rowCount} rows`);
}

async function clearSessionTracking(pool: Pool) {
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
}

async function run() {
  const pii = getPiiCrypto();
  const pool = createPool();

  try {
    await Promise.all(
      Object.entries(TABLES).map(([table, model]) =>
        encryptTable(pool, pii, table, model),
      ),
    );
    await Promise.all(
      ["weavejs_thread", "weavejs_thread_answer"].map((table) =>
        stripCommentPii(pool, table),
      ),
    );
    await clearSessionTracking(pool);
  } finally {
    await pool.end();
  }
}

try {
  await run();
} catch (error) {
  console.error(error);
  process.exit(1);
}
