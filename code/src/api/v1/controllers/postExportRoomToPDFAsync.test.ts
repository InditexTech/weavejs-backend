// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import test, { mock } from "node:test";
import assert from "node:assert/strict";

const startExportRoomToPdfJob = mock.fn(async () => "job-1");

mock.module("@/workloads/workloads.js", {
  namedExports: { getJobHandler: () => ({ startExportRoomToPdfJob }) },
});
mock.module("@/workloads/constants.js", {
  namedExports: { JOB_HANDLERS: { EXPORT_ROOM_TO_PDF: "x" } },
});

const { postExportRoomToPDFAsyncController } = await import(
  "./postExportRoomToPDFAsync.ts"
);

test("attributes the job to the session user, not the header", async () => {
  const res = {
    status() {
      return res;
    },
    json() {
      return res;
    },
  };
  await postExportRoomToPDFAsyncController()(
    {
      params: { roomId: "room-a" },
      headers: { "x-weave-user-id": "someone-else", "x-weave-client-id": "c1" },
      session: { user: { id: "user-1" } },
      body: {
        roomId: "room-a",
        type: "area",
        area: { x: 0, y: 0, width: 10, height: 10 },
        options: {},
      },
    } as never,
    res as never,
  );
  const args = startExportRoomToPdfJob.mock.calls[0].arguments as unknown[];
  assert.equal(args[0], "c1");
  assert.equal(args[1], "room-a");
  assert.equal(args[2], "user-1");
});
