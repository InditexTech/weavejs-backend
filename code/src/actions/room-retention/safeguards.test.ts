// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import test from "node:test";
import assert from "node:assert/strict";
import { AbortRun } from "./errors.ts";
import { assertBlobSafeguards, assertRoomSafeguards } from "./safeguards.ts";
import { assertKnownRoomTables, type Queryable } from "./database.ts";

test("an empty database aborts the run", () => {
  assert.throws(
    () => assertRoomSafeguards({ totalRooms: 0, toDelete: 0, maxRooms: 10 }),
    AbortRun,
  );
});

test("deleting every room is refused unless it is allowed explicitly", () => {
  assert.throws(
    () =>
      assertRoomSafeguards({ totalRooms: 298, toDelete: 298, maxRooms: 1000 }),
    /all 298 rooms would be deleted/,
  );
  assert.doesNotThrow(() =>
    assertRoomSafeguards({
      totalRooms: 298,
      toDelete: 298,
      maxRooms: 1000,
      allowDeleteAll: true,
    }),
  );
  assert.doesNotThrow(() =>
    assertRoomSafeguards({ totalRooms: 298, toDelete: 297, maxRooms: 1000 }),
  );
  assert.doesNotThrow(() =>
    assertRoomSafeguards({ totalRooms: 5, toDelete: 0, maxRooms: 1000 }),
  );
});

test("allowing every room does not lift the room limit", () => {
  assert.throws(
    () =>
      assertRoomSafeguards({
        totalRooms: 300,
        toDelete: 300,
        maxRooms: 100,
        allowDeleteAll: true,
      }),
    /exceed the limit of 100/,
  );
});

test("too many rooms aborts, at the limit passes", () => {
  assert.throws(
    () => assertRoomSafeguards({ totalRooms: 300, toDelete: 11, maxRooms: 10 }),
    /exceed the limit of 10/,
  );
  assert.doesNotThrow(() =>
    assertRoomSafeguards({ totalRooms: 300, toDelete: 10, maxRooms: 10 }),
  );
});

test("too many blobs, by count or by percentage, aborts", () => {
  assert.throws(
    () =>
      assertBlobSafeguards({
        totalBlobs: 100000,
        toDelete: 501,
        maxBlobs: 500,
        maxPercent: 90,
      }),
    /exceed the limit of 500/,
  );
  assert.throws(
    () =>
      assertBlobSafeguards({
        totalBlobs: 100,
        toDelete: 60,
        maxBlobs: 500,
        maxPercent: 50,
      }),
    /exceed 50%/,
  );
  assert.doesNotThrow(() =>
    assertBlobSafeguards({
      totalBlobs: 100,
      toDelete: 50,
      maxBlobs: 500,
      maxPercent: 50,
    }),
  );
  assert.doesNotThrow(() =>
    assertBlobSafeguards({
      totalBlobs: 0,
      toDelete: 0,
      maxBlobs: 500,
      maxPercent: 50,
    }),
  );
});

const dbWithTables = (tables: string[]): Queryable => ({
  query: async () => ({
    rows: tables.map((table_name) => ({ table_name })) as never[],
  }),
});

test("the schema guard accepts the known tables", async () => {
  await assertKnownRoomTables(
    dbWithTables([
      "weavejs_room",
      "weavejs_task",
      "weavejs_page",
      "weavejs_image",
    ]),
  );
});

test("the schema guard aborts on an unknown table with a roomId", async () => {
  await assert.rejects(
    assertKnownRoomTables(dbWithTables(["weavejs_room", "weavejs_new_table"])),
    /weavejs_new_table/,
  );
});
