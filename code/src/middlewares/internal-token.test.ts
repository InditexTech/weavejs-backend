// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { signMediaToken } from "../utils/media-token.ts";

const MASTER = "m".repeat(36);

mock.module("@/config/config.js", {
  namedExports: { getServiceConfig: () => ({ internalToken: MASTER }) },
});

const { internalToken } = await import("./internal-token.ts");
const { stripInternalToken } = await import("./http-logger.ts");

const BASE = "/api/v1";
const PATH = "/weavejs/rooms/R/images/I";

const run = (req: Record<string, unknown>) => {
  const r = {
    method: "GET",
    baseUrl: BASE,
    path: PATH,
    headers: {},
    query: {},
    ...req,
  } as { isInternalRequest?: boolean };
  let nextCalled = false;
  internalToken(r as never, {} as never, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  return r.isInternalRequest === true;
};

test("accepts the master token header", () => {
  assert.equal(run({ headers: { "x-internal-token": MASTER } }), true);
});

test("rejects a wrong header token", () => {
  assert.equal(run({ headers: { "x-internal-token": "x" } }), false);
});

test("accepts a valid _t for its own path", () => {
  const t = signMediaToken(MASTER, `${BASE}${PATH}`);
  assert.equal(run({ query: { _t: t } }), true);
});

test("rejects _t on another path or on mcp-rooms", () => {
  const t = signMediaToken(MASTER, `${BASE}${PATH}`);
  assert.equal(run({ query: { _t: t }, path: "/weavejs/rooms/S/images/I" }), false);
  assert.equal(run({ query: { _t: t }, baseUrl: "/ai/v1", path: "/mcp-rooms" }), false);
});

test("rejects _t on non GET/HEAD", () => {
  const t = signMediaToken(MASTER, `${BASE}${PATH}`);
  assert.equal(run({ query: { _t: t }, method: "DELETE" }), false);
});

test("rejects an expired _t", () => {
  const t = signMediaToken(MASTER, `${BASE}${PATH}`, 1000, Date.now() - 5000);
  assert.equal(run({ query: { _t: t } }), false);
});

test("rejects the master token in ?_token=", () => {
  assert.equal(run({ query: { _token: MASTER } }), false);
});

test("logger omits _t and _token", () => {
  assert.equal(stripInternalToken("/a?x=1&_t=1.abc&_token=z"), "/a?x=1");
  assert.equal(stripInternalToken("/a?_t=1.abc"), "/a");
  assert.equal(stripInternalToken("/a?%5Ft=1.abc&y=2"), "/a?y=2");
});
