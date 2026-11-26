// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type PgBoss from "pg-boss";
import type { RetentionConfig } from "@/actions/room-retention/config.js";
import type { TransactionalPool } from "@/actions/room-retention/database.js";
import {
  type RetentionRunRequest,
  toRetentionConfig,
} from "@/actions/room-retention/request.js";
import {
  type BlobPhaseSummary,
  runBlobPhase,
  runRoomPhase,
} from "@/actions/room-retention/run.js";
import type { BlobStore } from "@/actions/room-retention/sweep.js";
import {
  JOB_BLOB_SWEEP_QUEUE_NAME,
  JOB_ROOM_RETENTION_QUEUE_NAME,
  ROOM_RETENTION_JOB_EXPIRE_SECONDS,
} from "./constants.js";
import type {
  BlobSweepJobData,
  BlobSweepJobOutput,
  CompactBlobSummary,
  RoomRetentionJobData,
  RoomRetentionJobOutput,
  RunState,
  RunStatus,
} from "./types.js";

const FAILED_SAMPLE_SIZE = 20;

// A retention job never retries by itself: a failed run is reported, and the
// next trigger starts a new one.
const QUEUE_OPTIONS = {
  policy: "singleton" as const,
  retryLimit: 0,
  expireInSeconds: ROOM_RETENTION_JOB_EXPIRE_SECONDS,
};
const SEND_OPTIONS = {
  retryLimit: 0,
  expireInSeconds: ROOM_RETENTION_JOB_EXPIRE_SECONDS,
};

export type RoomRetentionDeps = {
  getDb: () => TransactionalPool;
  getStore: () => BlobStore;
  getStorage: () => RetentionConfig["storage"];
  now: () => Date;
  log: (message: string) => void;
  pollingIntervalSeconds?: number;
};

export type StartRunResult = { runId: string } | { busy: true };

const toRunState = (state: string): RunState => {
  switch (state) {
    case "created":
    case "retry":
      return "queued";
    case "active":
      return "active";
    case "completed":
      return "completed";
    default:
      return "failed";
  }
};

const errorMessage = (output: unknown): string => {
  const message = (output as { message?: unknown } | null)?.message;
  return typeof message === "string" && message !== ""
    ? message
    : "the job failed";
};

const compactBlobs = (blobs: BlobPhaseSummary): CompactBlobSummary => {
  const { result, ...rest } = blobs;
  return {
    ...rest,
    deleted: result.deleted,
    failedCount: result.failed.length,
    failedSample: result.failed.slice(0, FAILED_SAMPLE_SIZE).map((entry) => ({
      container: entry.ref.container,
      name: entry.ref.name,
      message: entry.message,
    })),
  };
};

// Room retention as two chained background tasks. The database task deletes
// the expired rooms and, once it succeeds, enqueues the blob sweep. A single
// run executes at a time.
export class RoomRetentionJob {
  private boss: PgBoss;
  private deps: RoomRetentionDeps;

  static async create(
    boss: PgBoss,
    deps: RoomRetentionDeps,
  ): Promise<RoomRetentionJob> {
    for (const name of [
      JOB_ROOM_RETENTION_QUEUE_NAME,
      JOB_BLOB_SWEEP_QUEUE_NAME,
    ]) {
      await boss.createQueue(name, { name, ...QUEUE_OPTIONS });
      await boss.purgeQueue(name);
    }

    return new RoomRetentionJob(boss, deps);
  }

  constructor(boss: PgBoss, deps: RoomRetentionDeps) {
    this.boss = boss;
    this.deps = deps;
    deps.log("Job created");
  }

  async start() {
    const options = this.deps.pollingIntervalSeconds
      ? { pollingIntervalSeconds: this.deps.pollingIntervalSeconds }
      : {};

    await this.boss.work<RoomRetentionJobData>(
      JOB_ROOM_RETENTION_QUEUE_NAME,
      options,
      async ([job]) => this.runRooms(job!.id, job!.data),
    );

    await this.boss.work<BlobSweepJobData>(
      JOB_BLOB_SWEEP_QUEUE_NAME,
      options,
      async ([job]) => this.runSweep(job!.data),
    );
  }

  // Starts a run unless one is queued or in progress.
  async startRun(request: RetentionRunRequest): Promise<StartRunResult> {
    const sizes = await Promise.all(
      [JOB_ROOM_RETENTION_QUEUE_NAME, JOB_BLOB_SWEEP_QUEUE_NAME].map((name) =>
        this.boss.getQueueSize(name, { before: "completed" }),
      ),
    );

    if (sizes.some((size) => size > 0)) {
      return { busy: true };
    }

    const runId = await this.boss.send(
      JOB_ROOM_RETENTION_QUEUE_NAME,
      { request } satisfies RoomRetentionJobData,
      SEND_OPTIONS,
    );

    return runId ? { runId } : { busy: true };
  }

  async getRun(runId: string): Promise<RunStatus | null> {
    const roomsJob = await this.boss.getJobById(
      JOB_ROOM_RETENTION_QUEUE_NAME,
      runId,
    );

    if (!roomsJob) {
      return null;
    }

    const roomsState = toRunState(roomsJob.state);

    if (roomsState === "failed") {
      return {
        id: runId,
        state: "failed",
        failed: true,
        error: errorMessage(roomsJob.output),
      };
    }

    const request = (roomsJob.data as RoomRetentionJobData).request;

    if (roomsState !== "completed") {
      return {
        id: runId,
        state: roomsState,
        failed: false,
        dryRun: request.dryRun,
      };
    }

    const roomsOutput = roomsJob.output as RoomRetentionJobOutput;
    const sweepJob = await this.boss.getJobById(
      JOB_BLOB_SWEEP_QUEUE_NAME,
      roomsOutput.sweepJobId,
    );

    if (!sweepJob) {
      return {
        id: runId,
        state: "failed",
        failed: true,
        dryRun: request.dryRun,
        rooms: roomsOutput.summary,
        error: "the blob sweep was lost, the backend probably restarted",
      };
    }

    const sweepState = toRunState(sweepJob.state);

    if (sweepState === "failed") {
      return {
        id: runId,
        state: "failed",
        failed: true,
        dryRun: request.dryRun,
        rooms: roomsOutput.summary,
        error: errorMessage(sweepJob.output),
      };
    }

    if (sweepState !== "completed") {
      return {
        id: runId,
        state: "active",
        failed: false,
        dryRun: request.dryRun,
        rooms: roomsOutput.summary,
      };
    }

    const blobs = (sweepJob.output as BlobSweepJobOutput).blobs;

    return {
      id: runId,
      state: "completed",
      failed: roomsOutput.summary.failed || blobs.failedCount > 0,
      dryRun: request.dryRun,
      rooms: roomsOutput.summary,
      blobs,
    };
  }

  private async runRooms(
    jobId: string,
    data: RoomRetentionJobData,
  ): Promise<RoomRetentionJobOutput> {
    const { request } = data;
    const config = toRetentionConfig(request, this.deps.getStorage());

    const summary = await runRoomPhase({
      config,
      pool: this.deps.getDb(),
      now: this.deps.now(),
      log: this.deps.log,
    });

    // The sweep follows only when this task did not abort. Rooms that failed
    // individually were rolled back, and the sweep is safe after them.
    const sweepJobId = await this.boss.send(
      JOB_BLOB_SWEEP_QUEUE_NAME,
      {
        request,
        excludeRoomIds: request.dryRun ? summary.roomsToDelete : [],
        roomsJobId: jobId,
      } satisfies BlobSweepJobData,
      SEND_OPTIONS,
    );

    if (!sweepJobId) {
      throw new Error("could not enqueue the blob sweep");
    }

    return { summary, sweepJobId };
  }

  private async runSweep(data: BlobSweepJobData): Promise<BlobSweepJobOutput> {
    const config = toRetentionConfig(data.request, this.deps.getStorage());

    const blobs = await runBlobPhase({
      config,
      pool: this.deps.getDb(),
      store: this.deps.getStore(),
      now: this.deps.now(),
      log: this.deps.log,
      excludeRoomIds: data.excludeRoomIds,
    });

    return { blobs: compactBlobs(blobs) };
  }
}
