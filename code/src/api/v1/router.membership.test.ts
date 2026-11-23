// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./router.ts", import.meta.url), "utf8");

const routes = [
  ...source.matchAll(
    /router\.(get|post|put|delete)\(\s*`([^`]+)`,([\s\S]*?)\n\s*\);/g,
  ),
].map((m) => ({
  method: m[1].toUpperCase(),
  path: m[2],
  middlewares: m[3],
}));

const find = (method: string, suffix: string) =>
  routes.filter((r) => r.method === method && r.path.endsWith(suffix));

const expectGuarded = (
  method: string,
  suffix: string,
  middleware: string,
  count = 1,
) => {
  const found = find(method, suffix);
  assert.equal(found.length, count, `${method} ${suffix} route count`);
  for (const r of found) {
    const idx = r.middlewares.indexOf(middleware);
    assert.ok(
      idx > r.middlewares.indexOf("auth"),
      `${r.path} needs ${middleware} after auth`,
    );
  }
};

test("bus routes use busMember", () => {
  expectGuarded("GET", "/rooms/:roomId/bus/:userId", "busMember");
  expectGuarded("POST", "/rooms/:roomId/bus/:userId", "busMember");
});

test("export routes use roomMember", () => {
  expectGuarded("POST", "/rooms/:roomId/export", "roomMember");
  expectGuarded("POST", "/rooms/:roomId/export/pdf", "roomMember");
  expectGuarded("POST", "/rooms/:roomId/frames/export/pdf", "roomMember");
});

test("every standalone route uses instanceMember", () => {
  const standalone = routes.filter((r) =>
    r.path.includes("/standalone/:instanceId/"),
  );
  assert.equal(standalone.length, 15);
  for (const r of standalone) {
    assert.ok(
      r.middlewares.indexOf("instanceMember") > r.middlewares.indexOf("auth"),
      `${r.method} ${r.path} needs instanceMember after auth`,
    );
  }
});

test("previously unguarded room routes use roomMember", () => {
  expectGuarded("GET", "/rooms/:roomId/json", "roomMember");
  expectGuarded("GET", "/rooms/:roomId/chats", "roomMember");
  expectGuarded("POST", "/rooms/:roomId/chats", "roomMember");
  expectGuarded("GET", "/rooms/:roomId/chats/:chatId", "roomMember");
  expectGuarded("PUT", "/rooms/:roomId/chats/:chatId", "roomMember");
  expectGuarded("DELETE", "/rooms/:roomId/chats/:chatId", "roomMember");
  expectGuarded("GET", "/rooms/:roomId/videos", "roomMember");
  expectGuarded("GET", "/rooms/:roomId/ai/chats/:chatId/stream", "roomMember");
});
