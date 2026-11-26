// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type ContainerSpec, ownerExists } from "./containers.js";
import type { LiveSet } from "./liveSet.js";

export type BlobInfo = {
  name: string;
  createdOn?: Date;
  lastModified?: Date;
};

export type BlobRef = { container: string; name: string };

export interface BlobStore {
  containerExists: (container: string) => Promise<boolean>;
  list: (container: string) => AsyncIterable<BlobInfo>;
  delete: (container: string, name: string) => Promise<void>;
}

export type SweepPlan = {
  totalBlobs: number;
  orphans: BlobRef[];
  perContainer: Record<string, { total: number; orphans: number }>;
  missingContainers: string[];
};

const HOUR_MS = 60 * 60 * 1000;

// A blob whose age cannot be determined is kept.
const isRecent = (blob: BlobInfo, now: Date, graceHours: number): boolean => {
  const times = [blob.createdOn, blob.lastModified]
    .filter((value): value is Date => value instanceof Date)
    .map((value) => value.getTime());

  if (times.length === 0) {
    return true;
  }

  return now.getTime() - Math.max(...times) < graceHours * HOUR_MS;
};

export const planSweep = async (
  store: BlobStore,
  specs: ContainerSpec[],
  live: LiveSet,
  protectedRooms: ReadonlySet<string>,
  graceHours: number,
  now: Date,
): Promise<SweepPlan> => {
  const plan: SweepPlan = {
    totalBlobs: 0,
    orphans: [],
    perContainer: {},
    missingContainers: [],
  };

  for (const spec of specs) {
    if (!(await store.containerExists(spec.name))) {
      plan.missingContainers.push(spec.name);
      continue;
    }

    const stats = { total: 0, orphans: 0 };

    for await (const blob of store.list(spec.name)) {
      stats.total++;

      if (
        ownerExists(spec, blob.name, live) ||
        protectedRooms.has(spec.ownerKey(blob.name)) ||
        isRecent(blob, now, graceHours)
      ) {
        continue;
      }

      stats.orphans++;
      plan.orphans.push({ container: spec.name, name: blob.name });
    }

    plan.totalBlobs += stats.total;
    plan.perContainer[spec.name] = stats;
  }

  return plan;
};

export type SweepResult = {
  deleted: number;
  failed: { ref: BlobRef; message: string }[];
};

export const executeSweep = async (
  store: BlobStore,
  orphans: BlobRef[],
  dryRun: boolean,
  log: (message: string) => void,
): Promise<SweepResult> => {
  const result: SweepResult = { deleted: 0, failed: [] };

  for (const ref of orphans) {
    if (dryRun) {
      log(`[dry-run] would delete blob ${ref.container}/${ref.name}`);
      continue;
    }

    try {
      await store.delete(ref.container, ref.name);
      result.deleted++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.failed.push({ ref, message });
      log(`blob ${ref.container}/${ref.name} failed: ${message}`);
    }
  }

  return result;
};
