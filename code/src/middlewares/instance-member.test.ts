// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import test, { mock } from "node:test";
import assert from "node:assert/strict";

const members = new Set(["instance-a:user-1"]);

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

const { instanceMember } = await import("./instance-member.ts");

const run = async (instanceId: string, userId: string) => {
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
  await instanceMember(
    { params: { instanceId }, session: { user: { id: userId } } } as never,
    res as never,
    () => {
      nextCalled = true;
    },
  );
  return { status, nextCalled };
};

test("allows a member of the instance", async () => {
  const r = await run("instance-a", "user-1");
  assert.equal(r.nextCalled, true);
});

test("denies a non member", async () => {
  const r = await run("instance-a", "user-2");
  assert.equal(r.nextCalled, false);
  assert.equal(r.status, 403);
});
