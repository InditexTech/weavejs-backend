// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import test from "node:test";
import assert from "node:assert/strict";
import { createLogger, redact } from "./logger.ts";
import { buildPoolConfig } from "./database.ts";

test("emails are redacted from every log level", () => {
  const lines: string[] = [];
  const logger = createLogger((line) => lines.push(line));

  logger.info("protected jane.doe+x@inditex.com kept");
  logger.warn("owner Bob@Example.co.uk not found");
  logger.error("failed for a@b.com");

  assert.equal(lines.length, 3);
  for (const line of lines) {
    assert.doesNotMatch(line, /@/);
  }
  assert.match(lines[0]!, /\[redacted-email\]/);
});

test("text without emails is unchanged", () => {
  assert.equal(redact("rooms=12 blobs=3"), "rooms=12 blobs=3");
});

test("the pool is built from the database settings", () => {
  const config = buildPoolConfig({
    DATABASE_HOST: "db.example.com",
    DATABASE_PORT: "5433",
    DATABASE_NAME: "weave",
    DATABASE_USERNAME: "actions",
    DATABASE_PASSWORD: "secret",
    DATABASE_SSL: "true",
  });
  assert.equal(config.host, "db.example.com");
  assert.equal(config.port, 5433);
  assert.equal(config.database, "weave");
  assert.equal(config.user, "actions");
  assert.deepEqual(config.ssl, { rejectUnauthorized: true });
});

test("certificate verification can be relaxed explicitly and defaults to on", () => {
  const env = {
    DATABASE_HOST: "h",
    DATABASE_NAME: "d",
    DATABASE_USERNAME: "u",
    DATABASE_PASSWORD: "p",
    DATABASE_SSL: "true",
  };
  assert.deepEqual(buildPoolConfig(env).ssl, { rejectUnauthorized: true });
  assert.deepEqual(
    buildPoolConfig({ ...env, DATABASE_SSL_REJECT_UNAUTHORIZED: "false" }).ssl,
    { rejectUnauthorized: false },
  );
  assert.equal(
    buildPoolConfig({ ...env, DATABASE_SSL: "false" }).ssl,
    undefined,
  );
});

test("missing database settings fail fast", () => {
  assert.throws(
    () => buildPoolConfig({ DATABASE_HOST: "h" }),
    /DATABASE_NAME, DATABASE_USERNAME, DATABASE_PASSWORD must be defined/,
  );
});
