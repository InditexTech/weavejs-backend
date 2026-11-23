// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { mediaReadRateLimit } from "./api-rate-limit.ts";

const serve = (internal: boolean) => {
  const app = express();
  app.use((req, _res, next) => {
    req.isInternalRequest = internal;
    next();
  });
  app.get("/m", mediaReadRateLimit, (_req, res) => {
    res.send("ok");
  });
  return app.listen(0);
};

const hit = async (internal: boolean, times: number) => {
  const server = serve(internal);
  const { port } = server.address() as { port: number };
  let last = 0;
  for (let i = 0; i < times; i++) {
    last = (await fetch(`http://localhost:${port}/m`)).status;
  }
  server.close();
  return last;
};

test("limits external media reads", async () => {
  assert.equal(await hit(false, 601), 429);
});

test("does not limit internal media reads", async () => {
  assert.equal(await hit(true, 601), 200);
});
