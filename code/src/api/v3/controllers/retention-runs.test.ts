// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import { retentionToken } from "../../../middlewares/retention-token.ts";
import { getRetentionRunController } from "./getRetentionRun.ts";
import { postRetentionRunController } from "./postRetentionRun.ts";

const TOKEN = "t".repeat(64);
const RUN_ID = "0b6f6d5e-5a3c-4d3b-9a43-2f6a1b0c8d11";

const started: unknown[] = [];
let startResult: unknown = { runId: RUN_ID };
let startError: Error | null = null;
let runs: Record<string, unknown> = {};
let token = TOKEN;

const noLog = () => ({ info: () => undefined, error: () => undefined });

let server: Server;
let base = "";

before(async () => {
  const app = express();
  app.use(express.json({ limit: "64kb" }));
  const guard = retentionToken(() => token);
  app.post(
    "/retention/runs",
    guard,
    postRetentionRunController({
      getLog: noLog,
      getJob: () => ({
        startRun: async (request) => {
          started.push(request);
          if (startError) throw startError;
          return startResult as never;
        },
      }),
    }),
  );
  app.get(
    "/retention/runs/:runId",
    guard,
    getRetentionRunController({
      getLog: noLog,
      getJob: () => ({
        getRun: async (id) => (runs[id] as never) ?? null,
      }),
    }),
  );
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.close();
});

const post = (body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${base}/retention/runs`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

const authorized = { "x-retention-token": TOKEN };

test("a valid request starts a run and returns its id", async () => {
  started.length = 0;
  startResult = { runId: RUN_ID };
  startError = null;

  const response = await post(
    { dryRun: false, protectedRooms: ["room-a"], maxRoomsToDelete: 5 },
    authorized,
  );

  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { status: "OK", runId: RUN_ID });
  assert.equal(started.length, 1);
  assert.equal((started[0] as { dryRun: boolean }).dryRun, false);
});

test("a request without dryRun starts a dry run", async () => {
  started.length = 0;
  const response = await post({}, authorized);

  assert.equal(response.status, 202);
  assert.equal((started[0] as { dryRun: boolean }).dryRun, true);
});

test("a missing or wrong token starts nothing", async () => {
  started.length = 0;

  assert.equal((await post({ dryRun: true })).status, 401);
  assert.equal(
    (await post({ dryRun: true }, { "x-retention-token": "x".repeat(64) }))
      .status,
    401,
  );
  assert.equal(started.length, 0);
});

test("without a configured token both routes are not found", async () => {
  token = "";
  try {
    started.length = 0;
    assert.equal((await post({}, authorized)).status, 404);
    const read = await fetch(`${base}/retention/runs/${RUN_ID}`, {
      headers: authorized,
    });
    assert.equal(read.status, 404);
    assert.equal(started.length, 0);
  } finally {
    token = TOKEN;
  }
});

test("an invalid configuration is rejected and starts nothing", async () => {
  started.length = 0;

  for (const body of [
    { maxRoomsToDelete: -1 },
    { protectedRooms: "room-a" },
    { dryrun: false },
    { dryRun: "false" },
    { maxBlobsPercent: 120 },
  ]) {
    const response = await post(body, authorized);
    assert.equal(response.status, 400, JSON.stringify(body));
    const payload = (await response.json()) as { errors: unknown[] };
    assert.ok(payload.errors.length > 0);
  }
  assert.equal(started.length, 0);
});

test("a run in progress answers conflict", async () => {
  startResult = { busy: true };
  try {
    const response = await post({}, authorized);
    assert.equal(response.status, 409);
  } finally {
    startResult = { runId: RUN_ID };
  }
});

test("a failure starting the run answers a server error", async () => {
  startError = new Error("database is down");
  try {
    const response = await post({}, authorized);
    assert.equal(response.status, 500);
    assert.doesNotMatch(
      JSON.stringify(await response.json()),
      /database is down/,
    );
  } finally {
    startError = null;
  }
});

test("the state and summary of a run can be read", async () => {
  runs = {
    [RUN_ID]: {
      id: RUN_ID,
      state: "completed",
      failed: false,
      dryRun: true,
      rooms: { roomsToDelete: ["r1"], owners: { protectedUserIds: 1 } },
      blobs: { orphans: 2 },
    },
  };

  const response = await fetch(`${base}/retention/runs/${RUN_ID}`, {
    headers: authorized,
  });
  const text = await response.text();

  assert.equal(response.status, 200);
  assert.equal(
    (JSON.parse(text) as { run: { state: string } }).run.state,
    "completed",
  );
  assert.doesNotMatch(text, /@/, "no email address in the summary");
});

test("reading requires the token", async () => {
  const response = await fetch(`${base}/retention/runs/${RUN_ID}`);
  assert.equal(response.status, 401);
});

test("an unknown or malformed run id is not found", async () => {
  runs = {};
  for (const id of [RUN_ID, "not-a-uuid", "1", "../etc/passwd"]) {
    const response = await fetch(
      `${base}/retention/runs/${encodeURIComponent(id)}`,
      { headers: authorized },
    );
    assert.equal(response.status, 404, id);
  }
});
