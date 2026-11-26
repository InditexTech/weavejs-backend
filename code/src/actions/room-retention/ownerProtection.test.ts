// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import test from "node:test";
import assert from "node:assert/strict";
import type { Queryable } from "./database.ts";
import { findOwnerProtectedRooms } from "./ownerProtection.ts";

const fakeDb = (
  owners: { roomId: string }[],
  users: { id: string }[],
): Queryable & { calls: { text: string; params: unknown[] }[] } => {
  const calls: { text: string; params: unknown[] }[] = [];
  return {
    calls,
    query: async (text: string, params: unknown[] = []) => {
      calls.push({ text, params });
      return {
        rows: text.includes('auth."user"') ? users : owners,
      } as never;
    },
  };
};

test("rooms with a protected owner are protected", async () => {
  const db = fakeDb([{ roomId: "r1" }, { roomId: "r3" }], [{ id: "u1" }]);
  const { rooms, stats } = await findOwnerProtectedRooms(
    db,
    ["r1", "r2", "r3"],
    new Set(["u1"]),
  );
  assert.deepEqual([...rooms].sort(), ["r1", "r3"]);
  assert.equal(stats.roomsProtectedByOwner, 2);
  assert.equal(stats.protectedUserIdsWithoutUser, 0);
});

test("only owner memberships are consulted, membership never protects", async () => {
  const db = fakeDb([], [{ id: "u1" }]);
  await findOwnerProtectedRooms(db, ["r1"], new Set(["u1"]));
  assert.match(db.calls[0]!.text, /role = 'owner'/);
  assert.deepEqual(db.calls[0]!.params, [["r1"], ["u1"]]);
});

test("a protected id matching no user is counted and protects nothing", async () => {
  const db = fakeDb([], [{ id: "u1" }]);
  const { rooms, stats } = await findOwnerProtectedRooms(
    db,
    ["r1"],
    new Set(["u1", "typo"]),
  );
  assert.equal(rooms.size, 0);
  assert.equal(stats.protectedUserIds, 2);
  assert.equal(stats.protectedUserIdsWithoutUser, 1);
});

test("no protected ids means no queries and no protection", async () => {
  const db = fakeDb([{ roomId: "r1" }], []);
  const { rooms, stats } = await findOwnerProtectedRooms(db, ["r1"], new Set());
  assert.equal(rooms.size, 0);
  assert.equal(stats.protectedUserIds, 0);
  assert.equal(db.calls.length, 0);
});

test("no candidate rooms still reports unmatched ids", async () => {
  const db = fakeDb([{ roomId: "r1" }], []);
  const { rooms, stats } = await findOwnerProtectedRooms(
    db,
    [],
    new Set(["ghost"]),
  );
  assert.equal(rooms.size, 0);
  assert.equal(stats.protectedUserIdsWithoutUser, 1);
  assert.equal(db.calls.length, 1);
});
