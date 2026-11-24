// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-unused-vars */
import test, { mock } from "node:test";
import assert from "node:assert/strict";

const getRooms = mock.fn(async (..._args: unknown[]) => [{ roomId: "r1" }]);
const getTotalRooms = mock.fn(async (..._args: unknown[]) => 1);

mock.module("@/database/controllers/room.js", {
  namedExports: {
    getRooms,
    getTotalRooms,
    ROOM_SORT_FIELDS: ["createdAt", "updatedAt", "name"],
  },
});

const { getRoomsController } = await import("./getRooms.ts");

const call = async (query: Record<string, string>) => {
  let status = 200;
  let payload: unknown;
  const res = {
    status(code: number) {
      status = code;
      return res;
    },
    json(p: unknown) {
      payload = p;
      return res;
    },
  };
  await getRoomsController()(
    { query, session: { user: { id: "u1" } } } as never,
    res as never,
  );
  return { status, payload };
};

test("passes no sort so the data layer defaults apply", async () => {
  getRooms.mock.resetCalls();
  const { status, payload } = await call({});
  assert.equal(status, 200);
  assert.deepEqual(payload, { items: [{ roomId: "r1" }], total: 1 });
  const options = getRooms.mock.calls[0]!.arguments[1] as Record<
    string,
    unknown
  >;
  assert.equal(options.sort, undefined);
  assert.equal(options.order, undefined);
});

test("forwards a valid sort and order", async () => {
  getRooms.mock.resetCalls();
  const { status } = await call({ sort: "name", order: "ASC" });
  assert.equal(status, 200);
  const options = getRooms.mock.calls[0]!.arguments[1] as Record<
    string,
    unknown
  >;
  assert.equal(options.sort, "name");
  assert.equal(options.order, "asc");
});

test("rejects an unknown sort field", async () => {
  getRooms.mock.resetCalls();
  const { status } = await call({ sort: "roomId; DROP TABLE" });
  assert.equal(status, 400);
  assert.equal(getRooms.mock.callCount(), 0);
});

test("rejects an invalid order", async () => {
  const { status } = await call({ order: "sideways" });
  assert.equal(status, 400);
});
