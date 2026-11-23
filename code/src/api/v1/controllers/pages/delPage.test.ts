// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import test, { mock } from "node:test";
import assert from "node:assert/strict";

const updatePage = mock.fn(async () => 1);
const deletePage = mock.fn(async () => 1);

mock.module("@/comm-bus/comm-bus.js", {
  namedExports: { broadcastToGlobal: () => {}, broadcastToRoom: () => {} },
});
mock.module("@/database/controllers/page.js", {
  namedExports: {
    getPage: async () => ({ roomId: "r", pageId: "p" }),
    getPageByIndex: async () => null,
    getPageIndex: async () => 1,
    updatePage,
    deletePage,
  },
});

const { delPageController } = await import("./delPage.ts");

test("delete archives the page and does not remove the row", async () => {
  let status = 0;
  const res = {
    status(code: number) {
      status = code;
      return res;
    },
    json() {
      return res;
    },
  };

  await delPageController()(
    { params: { roomId: "r", pageId: "p" } } as never,
    res as never,
  );

  assert.equal(status, 200);
  assert.equal(updatePage.mock.callCount(), 1);
  assert.deepEqual(updatePage.mock.calls[0].arguments, [
    { roomId: "r", pageId: "p" },
    { status: "archived" },
  ]);
  assert.equal(deletePage.mock.callCount(), 0);
});
