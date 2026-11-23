// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import test from "node:test";
import assert from "node:assert/strict";
import { transformMediaUrl } from "./media-url.ts";
import { verifyMediaToken } from "../utils/media-token.ts";

const KEY = "k".repeat(36);
const config = { service: { port: 3000 }, internalToken: KEY };
const R = "11111111-1111-1111-1111-111111111111";
const I = "22222222-2222-2222-2222-222222222222";
const IMG = `/api/v1/weavejs/rooms/${R}/images/${I}`;

const hostile = [
  `/weavebff@evil.example/x`,
  `http://x/weavebff@evil.example/`,
  `https://x/weavebff@evil.example${IMG}`,
  `/weavebff%40evil.example/`,
  `/weavebff${IMG}/../x`,
  `/weavebff/api/v1/weavejs/rooms/${R}/images/../../../../../ai/v1/mcp-rooms`,
  `/weavebff/api/v1/weavejs/rooms/${R}/images/%2e%2e/%2e%2e/x`,
  `/weavebff/%2e%2e/ai/v1/mcp-rooms`,
  `/weavebff${IMG.replace("/images/", "%2fimages%2f")}`,
  `/weavebff\\@evil.example/x`,
  `/weavebff\\..\\x`,
  `/weavebff//evil.example/x`,
  `/weavebff${IMG}//`,
  `/weavebff\t@evil.example/x`,
  `/weavebffoo${IMG}`,
  `/weavebff/api/v1/weavejs/rooms/${R}/members`,
  `/weavebff/ai/v1/mcp-rooms`,
  `/weavebff`,
  `//evil.example/weavebff${IMG}`,
  `/etc/passwd.png`,
  `assets/logo.png`,
  `file:///etc/passwd`,
  `data:image/png;base64,AAAA`,
  `http://localhost:3000${IMG}`,
  `http://127.0.0.1:3000${IMG}`,
  `http://10.0.0.5/a.png`,
  `http://169.254.169.254/latest`,
  ``,
];

for (const input of hostile) {
  test(`rejects ${JSON.stringify(input)}`, () => {
    assert.equal(transformMediaUrl(input, config), "");
  });
}

const assertInternal = (result: string, path: string) => {
  const url = new URL(result);
  assert.equal(url.protocol, "http:");
  assert.equal(url.hostname, "localhost");
  assert.equal(url.port, "3000");
  assert.equal(url.username, "");
  assert.equal(url.pathname, path);
  assert.equal(url.searchParams.has("_token"), false);
  assert.equal(result.includes(KEY), false);
  assert.equal(verifyMediaToken(KEY, url.searchParams.get("_t"), path), true);
  return url;
};

const legit: [string, string][] = [
  [`/weavebff${IMG}`, IMG],
  [`/weavebff/api/v2/weavejs/rooms/${R}/images/${I}`, `/api/v2/weavejs/rooms/${R}/images/${I}`],
  [`https://prod.example.com/weavebff${IMG}`, IMG],
  [`/weavebff/api/v1/weavejs/rooms/${R}/videos/${I}`, `/api/v1/weavejs/rooms/${R}/videos/${I}`],
  [`/weavebff/api/v1/weavejs/rooms/${R}/videos/${I}/placeholder`, `/api/v1/weavejs/rooms/${R}/videos/${I}/placeholder`],
  [`/weavebff/api/v1/weavejs/rooms/${R}/chats/${I}/images/${I}`, `/api/v1/weavejs/rooms/${R}/chats/${I}/images/${I}`],
];

for (const [input, path] of legit) {
  test(`rewrites ${input}`, () => {
    assertInternal(transformMediaUrl(input, config), path);
  });
}

test("keeps the query and drops incoming tokens", () => {
  const url = assertInternal(
    transformMediaUrl(
      `https://prod.example.com/weavebff${IMG}?w=100&_token=abc&_t=zzz#frag`,
      config,
    ),
    IMG,
  );
  assert.equal(url.searchParams.get("w"), "100");
  assert.equal(url.hash, "");
  assert.equal(url.searchParams.getAll("_t").length, 1);
});

test("passes public external URLs through", () => {
  assert.equal(
    transformMediaUrl("https://cdn.example.com/a.png", config),
    "https://cdn.example.com/a.png",
  );
});

test("works with port 0 and an empty token", () => {
  const out = transformMediaUrl(`/weavebff${IMG}`, {
    service: { port: 0 },
    internalToken: "",
  });
  assert.equal(new URL(out).port, "0");
});
