// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export const JOB_ROOM_RETENTION_QUEUE_NAME = "room-retention";
export const JOB_BLOB_SWEEP_QUEUE_NAME = "blob-sweep";

// pg-boss fails active jobs after 15 minutes by default, listing every blob of
// twelve containers can take longer.
export const ROOM_RETENTION_JOB_EXPIRE_SECONDS = 6 * 60 * 60;
