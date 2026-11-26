// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Pool, type PoolClient, type PoolConfig } from "pg";
import { AbortRun } from "./errors.js";
import { KNOWN_ROOM_TABLES } from "./tables.js";

type Env = Record<string, string | undefined>;

export type Queryable = {
  query: <Row = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ) => Promise<{ rows: Row[] }>;
};

export type TransactionalPool = Queryable & {
  connect: () => Promise<Queryable & { release: PoolClient["release"] }>;
};

export const buildPoolConfig = (env: Env): PoolConfig => {
  const missing = [
    "DATABASE_HOST",
    "DATABASE_NAME",
    "DATABASE_USERNAME",
    "DATABASE_PASSWORD",
  ].filter((name) => !env[name]?.trim());

  if (missing.length > 0) {
    throw new Error(`${missing.join(", ")} must be defined`);
  }

  const ssl = env.DATABASE_SSL === "true";

  return {
    host: env.DATABASE_HOST,
    port: Number(env.DATABASE_PORT || 5432),
    user: env.DATABASE_USERNAME,
    password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    ssl: ssl
      ? { rejectUnauthorized: env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
      : undefined,
    max: 2,
  };
};

export const createPool = (env: Env): Pool => new Pool(buildPoolConfig(env));

// Fails closed when the schema has a table keyed by roomId that the delete
// order does not know about, so a new table can never be left behind silently.
export const assertKnownRoomTables = async (db: Queryable): Promise<void> => {
  const { rows } = await db.query<{ table_name: string }>(
    `SELECT DISTINCT table_name
       FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'roomId'`,
  );

  const unknown = rows
    .map((row) => row.table_name)
    .filter((name) => !KNOWN_ROOM_TABLES.has(name));

  if (unknown.length > 0) {
    throw new AbortRun(
      `unknown tables with a roomId column, update the retention delete order: ${unknown.join(", ")}`,
    );
  }
};
