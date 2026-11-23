// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import test, { mock } from "node:test";
import assert from "node:assert/strict";

const members = new Set(["room-a:user-1"]);

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

const { busMember } = await import("./bus-member.ts");

const run = async (roomId: string, userId = "user-1") => {
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
  await busMember(
    { params: { roomId }, session: { user: { id: userId } } } as never,
    res as never,
    () => {
      nextCalled = true;
    },
  );
  return { status, nextCalled };
};

test("allows a member of the room", async () => {
  const r = await run("room-a");
  assert.equal(r.nextCalled, true);
  assert.equal(r.status, 0);
});

test("denies a non member", async () => {
  const r = await run("room-a", "user-2");
  assert.equal(r.nextCalled, false);
  assert.equal(r.status, 403);
});

test("allows the global channel to a user without rooms", async () => {
  const r = await run("weavejsGlobal", "user-2");
  assert.equal(r.nextCalled, true);
  assert.equal(r.status, 0);
});

for (const id of ["weavejsGlobal-x", "WEAVEJSGLOBAL", "weavejsglobal", ""]) {
  test(`denies lookalike id "${id}"`, async () => {
    const r = await run(id, "user-2");
    assert.equal(r.nextCalled, false);
    assert.equal(r.status, 403);
  });
}
