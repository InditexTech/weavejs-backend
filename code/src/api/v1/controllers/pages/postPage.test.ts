// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import test, { mock } from "node:test";
import assert from "node:assert/strict";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const createPage = mock.fn(async (data: Record<string, unknown>) => ({
  dataValues: data,
  ...data,
}));
const broadcastToGlobal = mock.fn();
const broadcastToRoom = mock.fn();

mock.module("@/comm-bus/comm-bus.js", {
  namedExports: { broadcastToGlobal, broadcastToRoom },
});
mock.module("@/database/controllers/page.js", {
  namedExports: {
    createPage,
    getLastPageRoom: async () => null,
    getPagePosition: async () => 0,
    getPageIndex: async () => 0,
  },
});
mock.module("@/database/controllers/template.js", {
  namedExports: { getTemplate: async () => null },
});
mock.module("@/templates/templates.js", {
  namedExports: { addTemplateToRoom: async () => undefined },
});

const { postPageController } = await import("./postPage.ts");

const makeRes = () => {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
      return res;
    },
  };
  return res;
};

test("ignores client supplied pageId and returns a generated UUID", async () => {
  createPage.mock.resetCalls();
  broadcastToGlobal.mock.resetCalls();
  broadcastToRoom.mock.resetCalls();
  const res = makeRes();

  await postPageController()(
    {
      params: { roomId: "room-1" },
      body: { pageId: "client-id", name: "P" },
    } as never,
    res as never,
  );

  assert.equal(res.statusCode, 201);
  const created = createPage.mock.calls[0].arguments[0];
  assert.notEqual(created.pageId, "client-id");
  assert.match(created.pageId as string, UUID_RE);
  assert.equal((res.body as { pageId: string }).pageId, created.pageId);
  assert.equal(
    broadcastToGlobal.mock.calls[0].arguments[0].payload.pageId,
    created.pageId,
  );
  assert.equal(
    broadcastToRoom.mock.calls[0].arguments[1].payload.pageId,
    created.pageId,
  );
});

test("generates distinct ids when pageId is omitted", async () => {
  createPage.mock.resetCalls();
  const body = { name: "P" };
  await postPageController()(
    { params: { roomId: "r" }, body } as never,
    makeRes() as never,
  );
  await postPageController()(
    { params: { roomId: "r" }, body } as never,
    makeRes() as never,
  );
  const [a, b] = createPage.mock.calls.map((c) => c.arguments[0].pageId);
  assert.match(a as string, UUID_RE);
  assert.notEqual(a, b);
});

test("returns 500 when page creation fails", async () => {
  createPage.mock.mockImplementationOnce(async () => {
    throw new Error("db down");
  });
  const res = makeRes();
  const original = console.error;
  console.error = () => {};
  try {
    await postPageController()(
      { params: { roomId: "r" }, body: { name: "P" } } as never,
      res as never,
    );
  } finally {
    console.error = original;
  }
  assert.equal(res.statusCode, 500);
});
