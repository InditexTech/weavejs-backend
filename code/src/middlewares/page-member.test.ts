// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import test, { mock } from "node:test";
import assert from "node:assert/strict";

type PageRow = { roomId: string; pageId: string; status: string };

const pages: PageRow[] = [
  { roomId: "room-a", pageId: "page-a", status: "active" },
  { roomId: "room-a", pageId: "page-archived", status: "archived" },
  { roomId: "room-b", pageId: "page-b", status: "active" },
];
const members = new Set(["room-a:user-1"]);

mock.module("@/database/controllers/page.js", {
  namedExports: {
    getPageByPageId: async ({ pageId }: { pageId: string }) =>
      pages.find((p) => p.pageId === pageId) ?? null,
  },
});
mock.module("@/database/controllers/room-user.js", {
  namedExports: {
    getRoomUser: async ({
      roomId,
      userId,
    }: {
      roomId: string;
      userId: string;
    }) => (members.has(`${roomId}:${userId}`) ? { roomId, userId } : null),
  },
});

const { pageMember } = await import("./page-member.ts");

const run = async (params: Record<string, string>) => {
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
  await pageMember(
    { params, session: { user: { id: "user-1" } } } as never,
    res as never,
    () => {
      nextCalled = true;
    },
  );
  return { status, nextCalled };
};

test("allows a member of the page's room", async () => {
  const r = await run({ pageId: "page-a" });
  assert.equal(r.nextCalled, true);
  assert.equal(r.status, 0);
});

const denied: [string, Record<string, string>][] = [
  ["a non member", { pageId: "page-b" }],
  ["an id without a page row", { pageId: "orphan-blob-id" }],
  ["an archived page", { pageId: "page-archived" }],
  ["a room id used as page id", { pageId: "room-a" }],
  ["a request with only :roomId", { roomId: "room-a" }],
];

for (const [name, params] of denied) {
  test(`denies ${name}`, async () => {
    const r = await run(params);
    assert.equal(r.nextCalled, false);
    assert.equal(r.status, 403);
  });
}
