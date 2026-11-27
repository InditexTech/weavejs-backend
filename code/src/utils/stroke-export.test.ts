// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import {
  buildStrokeRoom,
  exportPng,
  inkStats,
  makeStroke,
  renderRoom,
  splitStroke,
} from "./stroke-fixtures.ts";

describe("stroke export", () => {
  const base = makeStroke("erased", { strokeWidth: 10, stroke: "#1565c0ff" });
  const pieces = splitStroke(base, 3);
  const untouched = makeStroke("untouched", { y: 220 });
  let room: Awaited<ReturnType<typeof renderRoom>>;

  before(async () => {
    room = await renderRoom(buildStrokeRoom([...pieces, untouched]));
  });

  after(async () => {
    await room.destroy();
  });

  it("splits a stroke into ordinary stroke pieces keeping the first id", () => {
    assert.equal(pieces.length, 3);
    assert.equal(pieces[0].id, "erased");
    assert.deepEqual(
      pieces.map((p) => p.props.stroke),
      Array(3).fill("#1565c0ff"),
    );
  });

  it("renders every split piece as a stroke node", () => {
    for (const piece of pieces) {
      const node = room.instance.getStage().findOne(`#${piece.id}`);
      assert.ok(node, `${piece.id} is in the stage`);
      assert.equal(node.getAttr("nodeType"), "stroke");
    }
  });

  it("exports each piece with ink", async () => {
    for (const piece of pieces) {
      const stats = await inkStats(await exportPng(room.instance, [piece.id]));
      assert.ok(stats.ink > 0, `${piece.id} has ink`);
    }
  });

  it("exports all pieces together through exportNodesServerSide", async () => {
    const ids = pieces.map((p) => p.id);
    const together = await inkStats(await exportPng(room.instance, ids));
    const first = await inkStats(await exportPng(room.instance, [ids[0]]));
    assert.ok(together.ink > first.ink);
    assert.ok(together.width >= first.width);
  });
});
