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

test("denies a non member", async () => {
  const r = await run({ pageId: "page-b" });
  assert.equal(r.nextCalled, false);
  assert.equal(r.status, 403);
});

test("denies an id without a page row", async () => {
  const r = await run({ pageId: "orphan-blob-id" });
  assert.equal(r.nextCalled, false);
  assert.equal(r.status, 403);
});

test("denies an archived page", async () => {
  const r = await run({ pageId: "page-archived" });
  assert.equal(r.nextCalled, false);
  assert.equal(r.status, 403);
});

test("does not treat a room id in :roomId as a page id", async () => {
  const r = await run({ roomId: "room-a" });
  assert.equal(r.nextCalled, false);
  assert.equal(r.status, 403);
});

test("a room id is not accepted as page id", async () => {
  const r = await run({ pageId: "room-a" });
  assert.equal(r.nextCalled, false);
  assert.equal(r.status, 403);
});
