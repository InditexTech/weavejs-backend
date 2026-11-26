// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// Runs the two chained pg-boss tasks on a real PostgreSQL where all migrations
// were applied. Skipped unless RETENTION_TEST_DATABASE_URL is set (see
// src/actions/room-retention/retention.integration.test.ts).

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import PgBoss from "pg-boss";
import { Sequelize } from "sequelize";
import { acquireIntegrationLock } from "@/actions/room-retention/integrationLock.js";
import { storageFromAppConfig } from "@/actions/room-retention/sequelizeAdapter.js";
import { createSequelizeDb } from "@/actions/room-retention/sequelizeAdapter.js";
import type { BlobInfo, BlobStore } from "@/actions/room-retention/sweep.js";
import {
  JOB_BLOB_SWEEP_QUEUE_NAME,
  JOB_ROOM_RETENTION_QUEUE_NAME,
} from "./constants.js";
import { RoomRetentionJob } from "./job.js";
import type { RunStatus } from "./types.js";

const url = process.env.RETENTION_TEST_DATABASE_URL;
const skip = url ? false : "RETENTION_TEST_DATABASE_URL is not set";

const prefix = `jb${randomUUID().slice(0, 8)}-`;
const id = (name: string) => `${prefix}${name}`;
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);
const SCHEMA = `pgboss_rt_${prefix.replace("-", "")}`;

let sequelize: Sequelize;
let boss: PgBoss;
let job: RoomRetentionJob;
let releaseLock: (() => Promise<void>) | undefined;
let blobs: Record<string, BlobInfo[]> = {};
let gate: Promise<void> | null = null;
const deleted: string[] = [];

const store: BlobStore = {
  containerExists: async (name) => name in blobs,
  async *list(name) {
    if (gate) {
      await gate;
    }
    for (const blob of blobs[name] ?? []) {
      yield blob;
    }
  },
  delete: async (container, name) => {
    deleted.push(`${container}/${name}`);
  },
};

const run = (sql: string, bind: unknown[] = []) =>
  sequelize.query(sql, { bind: bind as never });

const waitForRun = async (
  runId: string,
  done: (status: RunStatus) => boolean,
  timeoutMs = 30_000,
): Promise<RunStatus> => {
  const limit = Date.now() + timeoutMs;
  for (;;) {
    const status = await job.getRun(runId);
    if (status && done(status)) {
      return status;
    }
    if (Date.now() > limit) {
      throw new Error(`timed out, last status ${JSON.stringify(status)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
};

const finished = (status: RunStatus) =>
  status.state === "completed" || status.state === "failed";

before(async () => {
  if (!url) return;
  releaseLock = await acquireIntegrationLock(url);
  sequelize = new Sequelize(url, { dialect: "postgres", logging: false });

  boss = new PgBoss({
    connectionString: url,
    schema: SCHEMA,
    migrate: true,
    max: 4,
  });
  boss.on("error", () => undefined);
  await boss.start();

  job = await RoomRetentionJob.create(boss, {
    getDb: () => createSequelizeDb(sequelize),
    getStore: () => store,
    getStorage: () =>
      storageFromAppConfig(
        {
          accountName: "account",
          rooms: { containerName: "rooms" },
          images: { containerName: "images" },
          videos: { containerName: "videos" },
        },
        undefined,
      ),
    now: () => new Date(),
    log: () => undefined,
    pollingIntervalSeconds: 0.5,
  });
  await job.start();

  await run(
    `INSERT INTO weavejs_room ("roomId", name, kind, status, "createdAt", "updatedAt")
     VALUES ($1, $1, 'room', 'active', $2, now())`,
    [id("old"), daysAgo(10)],
  );
  await run(
    `INSERT INTO weavejs_page ("pageId", "roomId", name, position, status)
     VALUES ($1, $2, $1, 1, 'active')`,
    [id("old-page"), id("old")],
  );
  // A recent room, so the run never deletes every room.
  await run(
    `INSERT INTO weavejs_room ("roomId", name, kind, status, "createdAt", "updatedAt")
     VALUES ($1, $1, 'room', 'active', now(), now())`,
    [id("recent")],
  );
});

after(async () => {
  if (!url) return;
  await boss.stop({ graceful: false, wait: true }).catch(() => undefined);
  await run(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
  await run(`DELETE FROM weavejs_room WHERE "roomId" LIKE $1`, [`${prefix}%`]);
  await sequelize.close();
  await releaseLock?.();
});

const dryRunRequest = {
  dryRun: true,
  protectedRooms: [] as string[],
  protectedUserIds: [] as string[],
  maxRoomsToDelete: 100000,
  maxBlobsToDelete: 10_000_000,
  maxBlobsPercent: 100,
  blobGraceHours: 24,
};

test("a run completes with a summary of both tasks", { skip }, async () => {
  blobs = {
    rooms: [
      {
        name: id("old-page"),
        createdOn: daysAgo(20),
        lastModified: daysAgo(20),
      },
    ],
  };

  const started = await job.startRun(dryRunRequest);
  assert.ok("runId" in started, "the run should start");

  const status = await waitForRun(started.runId, finished);

  assert.equal(status.state, "completed");
  assert.equal(status.failed, false);
  assert.equal(status.dryRun, true);
  assert.ok(status.rooms!.roomsToDelete.includes(id("old")));
  assert.equal(status.rooms!.rooms.deleted.length, 0);
  // A dry run simulates the room deletion, so its page blob is an orphan.
  assert.equal(status.blobs!.orphans, 1);
  assert.deepEqual(status.blobs!.samples.rooms, [id("old-page")]);
  assert.equal(status.blobs!.deleted, 0);
  assert.equal(deleted.length, 0);

  const read = await job.getRun(started.runId);
  assert.equal(read!.state, "completed");
});

test("an unknown run is not found", { skip }, async () => {
  assert.equal(await job.getRun(randomUUID()), null);
});

test(
  "a database task that aborts does not start the sweep",
  { skip },
  async () => {
    blobs = {};
    const started = await job.startRun({
      ...dryRunRequest,
      maxRoomsToDelete: 0,
    });
    assert.ok("runId" in started);

    const status = await waitForRun(started.runId, finished);

    assert.equal(status.state, "failed");
    assert.equal(status.failed, true);
    assert.match(status.error ?? "", /exceed the limit of 0/);
    assert.equal(
      await boss.getQueueSize(JOB_BLOB_SWEEP_QUEUE_NAME, {
        before: "completed",
      }),
      0,
    );
    const sweeps = await run(
      `SELECT count(*) AS total FROM "${SCHEMA}".job WHERE name = $1`,
      [JOB_BLOB_SWEEP_QUEUE_NAME],
    );
    // Only the sweep of the first test exists, none was added by this run.
    assert.equal(Number((sweeps[0] as { total: string }[])[0]!.total), 1);
  },
);

test(
  "a second start while a run is in progress does not run in parallel",
  { skip },
  async () => {
    let release: () => void = () => undefined;
    gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    blobs = { rooms: [] };

    try {
      const first = await job.startRun(dryRunRequest);
      assert.ok("runId" in first);

      await waitForRun(first.runId, (status) => status.state === "active");

      const second = await job.startRun(dryRunRequest);
      assert.deepEqual(second, { busy: true });

      const queued = await boss.getQueueSize(JOB_ROOM_RETENTION_QUEUE_NAME, {
        before: "completed",
      });
      const sweeping = await boss.getQueueSize(JOB_BLOB_SWEEP_QUEUE_NAME, {
        before: "completed",
      });
      assert.ok(queued + sweeping >= 1);

      release();
      gate = null;

      const status = await waitForRun(first.runId, finished);
      assert.equal(status.state, "completed");

      const third = await job.startRun(dryRunRequest);
      assert.ok(
        "runId" in third,
        "a new run can start once the first finished",
      );
      await waitForRun(third.runId, finished);
    } finally {
      release();
      gate = null;
    }
  },
);
