// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { RetentionConfig } from "./config.js";
import { buildContainerSpecs } from "./containers.js";
import { assertKnownRoomTables, type TransactionalPool } from "./database.js";
import { deleteRooms, type DeleteRoomsSummary } from "./deleteRoom.js";
import { loadLiveSet } from "./liveSet.js";
import {
  findOwnerProtectedRooms,
  type OwnerProtectionStats,
} from "./ownerProtection.js";
import { assertBlobSafeguards, assertRoomSafeguards } from "./safeguards.js";
import {
  countRooms,
  retentionCutoff,
  selectCandidateRooms,
} from "./selectCandidates.js";
import {
  type BlobStore,
  executeSweep,
  planSweep,
  type SweepResult,
} from "./sweep.js";

export type RetentionSummary = {
  dryRun: boolean;
  candidateRooms: number;
  protectedByRoom: number;
  protectedByOwner: number;
  roomsToDelete: string[];
  owners: OwnerProtectionStats;
  rooms: DeleteRoomsSummary;
  blobs: {
    total: number;
    orphans: number;
    missingContainers: string[];
    perContainer: Record<string, { total: number; orphans: number }>;
    result: SweepResult;
  };
  failed: boolean;
};

export const runRetention = async ({
  config,
  pool,
  store,
  now,
  log,
}: {
  config: RetentionConfig;
  pool: TransactionalPool;
  store: BlobStore;
  now: Date;
  log: (message: string) => void;
}): Promise<RetentionSummary> => {
  log(
    `retention run started, dry-run=${config.dryRun}, protected rooms=${config.protectedRooms.size}, protected user ids=${config.protectedUserIds.size}`,
  );

  await assertKnownRoomTables(pool);

  const totalRooms = await countRooms(pool);

  const candidates = await selectCandidateRooms(
    pool,
    config.protectedRooms,
    now,
  );
  const protectedByRoom =
    (await selectCandidateRooms(pool, [], now)).length - candidates.length;

  const owner = await findOwnerProtectedRooms(
    pool,
    candidates,
    config.protectedUserIds,
  );

  const roomsToDelete = candidates.filter((id) => !owner.rooms.has(id));

  log(
    `rooms: total=${totalRooms}, older than the limit and unprotected by room=${candidates.length}, protected by room=${protectedByRoom}, protected by owner=${owner.rooms.size}, to delete=${roomsToDelete.length}`,
  );
  log(
    `owners: protected user ids=${owner.stats.protectedUserIds}, without a user=${owner.stats.protectedUserIdsWithoutUser}`,
  );

  assertRoomSafeguards({
    totalRooms,
    toDelete: roomsToDelete.length,
    maxRooms: config.maxRoomsToDelete,
  });

  const rooms = await deleteRooms(
    pool,
    roomsToDelete,
    retentionCutoff(now),
    config.dryRun,
    log,
  );

  // A real run already removed the rooms, a dry run simulates their removal.
  const live = await loadLiveSet(pool, config.dryRun ? roomsToDelete : []);
  const plan = await planSweep(
    store,
    buildContainerSpecs(config.storage.containers),
    live,
    config.protectedRooms,
    config.blobGraceHours,
    now,
  );

  for (const [container, stats] of Object.entries(plan.perContainer)) {
    log(`blobs ${container}: total=${stats.total}, orphans=${stats.orphans}`);
  }
  if (plan.missingContainers.length > 0) {
    log(`containers not found: ${plan.missingContainers.join(", ")}`);
  }

  assertBlobSafeguards({
    totalBlobs: plan.totalBlobs,
    toDelete: plan.orphans.length,
    maxBlobs: config.maxBlobsToDelete,
    maxPercent: config.maxBlobsPercent,
  });

  const result = await executeSweep(store, plan.orphans, config.dryRun, log);

  const failed = rooms.failed.length > 0 || result.failed.length > 0;
  log(
    `retention run finished, rooms deleted=${rooms.deleted.length}, rooms failed=${rooms.failed.length}, blobs ${config.dryRun ? "to delete" : "deleted"}=${config.dryRun ? plan.orphans.length : result.deleted}, blobs failed=${result.failed.length}`,
  );

  return {
    dryRun: config.dryRun,
    candidateRooms: candidates.length,
    protectedByRoom,
    protectedByOwner: owner.rooms.size,
    roomsToDelete,
    owners: owner.stats,
    rooms,
    blobs: {
      total: plan.totalBlobs,
      orphans: plan.orphans.length,
      missingContainers: plan.missingContainers,
      perContainer: plan.perContainer,
      result,
    },
    failed,
  };
};
