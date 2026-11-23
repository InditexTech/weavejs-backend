// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import { getOriginGuardMiddleware } from "./origin-guard.ts";

const guard = getOriginGuardMiddleware(["https://app.example.com"]);

const run = (method: string, headers: Record<string, string> = {}) => {
  let status = 0;
  let nextCalled = false;
  const res = {
    status(code: number) {
      status = code;
      return res;
    },
    json() {
      return res;
    },
  };
  guard({ method, headers } as never, res as never, () => {
    nextCalled = true;
  });
  return { status, nextCalled };
};

test("allows a POST from an allowed origin", () => {
  const r = run("POST", { origin: "https://app.example.com" });
  assert.equal(r.nextCalled, true);
});

test("rejects a POST from a foreign origin", () => {
  const r = run("POST", { origin: "https://evil.example.com" });
  assert.equal(r.status, 403);
  assert.equal(r.nextCalled, false);
});

test("rejects PUT and DELETE from a foreign origin", () => {
  assert.equal(run("PUT", { origin: "https://evil.example.com" }).status, 403);
  assert.equal(
    run("DELETE", { origin: "https://evil.example.com" }).status,
    403,
  );
});

test("falls back to the Referer origin when Origin is absent", () => {
  assert.equal(
    run("DELETE", { referer: "https://evil.example.com/page" }).status,
    403,
  );
  assert.equal(
    run("DELETE", { referer: "https://app.example.com/page?x=1" }).nextCalled,
    true,
  );
});

test("allows mutating requests with neither Origin nor Referer", () => {
  assert.equal(run("POST").nextCalled, true);
});

test("does not apply to safe methods", () => {
  const r = run("GET", { origin: "https://evil.example.com" });
  assert.equal(r.nextCalled, true);
  assert.equal(r.status, 0);
});

test("through an express app, a foreign-origin POST gets 403 and an allowed one reaches the handler", async () => {
  const app = express();
  app.use(["/api/v1", "/api/v2"], guard);
  let handled = 0;
  app.post("/api/v1/thing", (_req, res) => {
    handled++;
    res.status(200).json({ ok: true });
  });

  const server = app.listen(0);
  try {
    const { port } = server.address() as AddressInfo;
    const url = `http://127.0.0.1:${port}/api/v1/thing`;

    const denied = await fetch(url, {
      method: "POST",
      headers: { origin: "https://evil.example.com" },
    });
    assert.equal(denied.status, 403);
    assert.equal(handled, 0);

    const allowed = await fetch(url, {
      method: "POST",
      headers: { origin: "https://app.example.com" },
    });
    assert.equal(allowed.status, 200);
    assert.equal(handled, 1);
  } finally {
    server.close();
  }
});
