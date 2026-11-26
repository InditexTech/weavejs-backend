// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import type { RetentionConfig } from "./config.js";

const idList = z.array(z.string().trim().min(1).max(200)).max(1000).default([]);

// Configuration of a run, sent by the scheduling workflow. Omitted values take
// safe defaults, and anything other than an explicit `dryRun: false` is a dry
// run. Unknown fields are rejected so a typo cannot silently change a run.
export const retentionRunRequestSchema = z.strictObject({
  dryRun: z.boolean().default(true),
  protectedRooms: idList,
  protectedUserIds: idList,
  maxRoomsToDelete: z.number().int().min(0).max(100_000).default(50),
  maxBlobsToDelete: z.number().int().min(0).max(10_000_000).default(5000),
  maxBlobsPercent: z.number().min(0).max(100).default(50),
  blobGraceHours: z
    .number()
    .min(0)
    .max(24 * 365)
    .default(24),
});

export type RetentionRunRequest = z.infer<typeof retentionRunRequestSchema>;

export type ParsedRetentionRunRequest =
  | { success: true; data: RetentionRunRequest }
  | { success: false; issues: { path: string; message: string }[] };

export const parseRetentionRunRequest = (
  body: unknown,
): ParsedRetentionRunRequest => {
  const parsed = retentionRunRequestSchema.safeParse(body ?? {});

  if (parsed.success) {
    return { success: true, data: parsed.data };
  }

  return {
    success: false,
    issues: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
};

export const toRetentionConfig = (
  request: RetentionRunRequest,
  storage: RetentionConfig["storage"],
): RetentionConfig => ({
  dryRun: request.dryRun,
  protectedRooms: new Set(request.protectedRooms),
  protectedUserIds: new Set(request.protectedUserIds),
  maxRoomsToDelete: request.maxRoomsToDelete,
  maxBlobsToDelete: request.maxBlobsToDelete,
  maxBlobsPercent: request.maxBlobsPercent,
  blobGraceHours: request.blobGraceHours,
  storage,
});
