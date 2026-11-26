// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import test from "node:test";
import assert from "node:assert/strict";
import { retentionToken } from "./retention-token.ts";

const TOKEN = "a".repeat(64);

const call = (token: string, headers: Record<string, unknown>) => {
  let status = 0;
  let payload: unknown;
  let nextCalled = false;
  const res = {
    status(code: number) {
      status = code;
      return res;
    },
    json(body: unknown) {
      payload = body;
      return res;
    },
  };
  retentionToken(() => token)({ headers } as never, res as never, () => {
    nextCalled = true;
  });
  return { status, payload, nextCalled };
};

test("the correct token passes", () => {
  const result = call(TOKEN, { "x-retention-token": TOKEN });
  assert.equal(result.nextCalled, true);
  assert.equal(result.status, 0);
});

test("a missing token is unauthorized", () => {
  const result = call(TOKEN, {});
  assert.equal(result.nextCalled, false);
  assert.equal(result.status, 401);
});

test("a wrong or empty token is unauthorized", () => {
  for (const value of ["b".repeat(64), "short", "", TOKEN.slice(0, -1)]) {
    const result = call(TOKEN, { "x-retention-token": value });
    assert.equal(result.nextCalled, false, `value "${value}"`);
    assert.equal(result.status, 401);
  }
});

test("a header that is not a plain string is unauthorized", () => {
  for (const value of [[TOKEN], [TOKEN, TOKEN], 42, undefined, null]) {
    const result = call(TOKEN, { "x-retention-token": value });
    assert.equal(result.nextCalled, false);
    assert.equal(result.status, 401);
  }
});

test("other credentials are not accepted", () => {
  const result = call(TOKEN, {
    "x-internal-token": TOKEN,
    authorization: `Bearer ${TOKEN}`,
  });
  assert.equal(result.nextCalled, false);
  assert.equal(result.status, 401);
});

test("without a configured token the routes do not exist", () => {
  for (const headers of [
    {},
    { "x-retention-token": "" },
    { "x-retention-token": TOKEN },
  ]) {
    const result = call("", headers);
    assert.equal(result.nextCalled, false);
    assert.equal(result.status, 404);
  }
});
