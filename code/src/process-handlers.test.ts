// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { registerProcessFaultHandlers } from "./process-handlers.ts";

const setup = () => {
  const proc = new EventEmitter();
  const logs: { obj: Record<string, unknown>; msg: string }[] = [];
  const exits: number[] = [];
  registerProcessFaultHandlers(
    { error: (obj, msg) => logs.push({ obj, msg }) },
    { proc, exit: (code) => exits.push(code), exitDelayMs: 5 },
  );
  return { proc, logs, exits };
};

test("registers both listeners", () => {
  const { proc } = setup();
  assert.equal(proc.listenerCount("unhandledRejection"), 1);
  assert.equal(proc.listenerCount("uncaughtException"), 1);
});

test("unhandledRejection is logged and does not exit", async () => {
  const { proc, logs, exits } = setup();
  proc.emit("unhandledRejection", new Error("boom"));
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(logs.length, 1);
  assert.equal(logs[0].msg, "unhandledRejection");
  assert.deepEqual(exits, []);
});

test("uncaughtException is logged and exits with code 1", async () => {
  const { proc, logs, exits } = setup();
  proc.emit("uncaughtException", new Error("boom"));
  assert.equal(logs[0].msg, "uncaughtException");
  assert.deepEqual(exits, []);
  await new Promise((r) => setTimeout(r, 30));
  assert.deepEqual(exits, [1]);
});
