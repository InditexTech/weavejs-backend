// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import test, { mock } from "node:test";
import assert from "node:assert/strict";
import express from "express";

const MASTER = "m".repeat(36);

mock.module("@/config/config.js", {
  namedExports: { getServiceConfig: () => ({ internalToken: MASTER }) },
});

const { mediaReadRateLimit } = await import("./api-rate-limit.ts");

const hit = async (headers: Record<string, string>, times: number) => {
  const app = express();
  app.get("/m", mediaReadRateLimit, (_req, res) => {
    res.send("ok");
  });
  const server = app.listen(0);
  const { port } = server.address() as { port: number };
  let last = 0;
  for (let i = 0; i < times; i++) {
    last = (await fetch(`http://localhost:${port}/m`, { headers })).status;
  }
  server.close();
  return last;
};

test("limits external media reads", async () => {
  assert.equal(await hit({}, 1201), 429);
});

test("does not limit requests with a valid internal credential", async () => {
  assert.equal(await hit({ "x-internal-token": MASTER }, 1201), 200);
});
