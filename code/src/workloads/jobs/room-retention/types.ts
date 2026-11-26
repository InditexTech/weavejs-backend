// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { RetentionRunRequest } from "@/actions/room-retention/request.js";
import type {
  BlobPhaseSummary,
  RoomPhaseSummary,
} from "@/actions/room-retention/run.js";

export type RoomRetentionJobData = { request: RetentionRunRequest };

export type BlobSweepJobData = {
  request: RetentionRunRequest;
  // Rooms the database task would delete, so a dry run plans the sweep as a
  // real run would see it.
  excludeRoomIds: string[];
  roomsJobId: string;
};

export type RoomRetentionJobOutput = {
  summary: RoomPhaseSummary;
  sweepJobId: string;
};

export type BlobSweepJobOutput = {
  blobs: CompactBlobSummary;
};

export type CompactBlobSummary = Omit<BlobPhaseSummary, "result"> & {
  deleted: number;
  failedCount: number;
  failedSample: { container: string; name: string; message: string }[];
};

export type RunState = "queued" | "active" | "completed" | "failed";

export type RunStatus = {
  id: string;
  state: RunState;
  // A completed run can still report failures, such as a room that was rolled
  // back. The caller should treat that as a failed run.
  failed: boolean;
  error?: string;
  dryRun?: boolean;
  rooms?: RoomPhaseSummary;
  blobs?: CompactBlobSummary;
};
