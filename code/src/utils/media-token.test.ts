// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import test from "node:test";
import assert from "node:assert/strict";
import { signMediaToken, verifyMediaToken } from "./media-token.ts";

const KEY = "k".repeat(36);
const PATH = "/api/v1/weavejs/rooms/R/images/I";

test("accepts a valid token for its path", () => {
  const token = signMediaToken(KEY, PATH);
  assert.equal(verifyMediaToken(KEY, token, PATH), true);
});

test("rejects an expired token", () => {
  const token = signMediaToken(KEY, PATH, 1000, 1_000_000);
  assert.equal(verifyMediaToken(KEY, token, PATH, 1_001_001), false);
});

test("rejects a tampered signature", () => {
  const token = signMediaToken(KEY, PATH);
  const [exp, sig] = token.split(".");
  const bad = `${exp}.${sig.slice(0, -1)}${sig.endsWith("A") ? "B" : "A"}`;
  assert.equal(verifyMediaToken(KEY, bad, PATH), false);
});

test("rejects a tampered expiry", () => {
  const token = signMediaToken(KEY, PATH);
  const [exp, sig] = token.split(".");
  assert.equal(
    verifyMediaToken(KEY, `${Number(exp) + 100000}.${sig}`, PATH),
    false,
  );
});

test("rejects a different path", () => {
  const token = signMediaToken(KEY, PATH);
  assert.equal(
    verifyMediaToken(KEY, token, "/api/v1/weavejs/rooms/S/images/I"),
    false,
  );
  assert.equal(verifyMediaToken(KEY, token, "/ai/v1/mcp-rooms"), false);
});

test("rejects a token signed with another key", () => {
  const token = signMediaToken("o".repeat(36), PATH);
  assert.equal(verifyMediaToken(KEY, token, PATH), false);
});

test("rejects malformed input", () => {
  for (const bad of [undefined, null, 5, "", ".", "a.b", "1.2.3", "9999999999999.", ["x"]]) {
    assert.equal(verifyMediaToken(KEY, bad, PATH), false);
  }
});

test("works with an empty key", () => {
  const token = signMediaToken("", PATH);
  assert.equal(verifyMediaToken("", token, PATH), true);
});
