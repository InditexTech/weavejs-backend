// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  createPiiCrypto,
  isEncrypted,
  parsePiiKeys,
} from "../../lib/pii/crypto.js";
import type { RetentionConfig } from "./config.js";
import { buildContainerSpecs } from "./containers.js";
import { assertKnownRoomTables, type TransactionalPool } from "./database.js";
import { deleteRooms, type DeleteRoomsSummary } from "./deleteRoom.js";
import { AbortRun } from "./errors.js";
import { loadLiveSet } from "./liveSet.js";
import {
  findOwnerProtectedRooms,
  loadUserEmails,
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

export const buildEmailDecryptor = (
  config: Pick<RetentionConfig, "piiEncryptionKeys" | "piiBlindIndexKey">,
): ((value: string) => string) => {
  if (!config.piiEncryptionKeys) {
    return (value) => {
      if (isEncrypted(value)) {
        throw new AbortRun(
          "user emails are encrypted but PII_ENCRYPTION_KEYS is not set",
        );
      }
      return value;
    };
  }

  // Decrypting does not use the blind index key, a placeholder is enough.
  const blindIndexKey =
    config.piiBlindIndexKey ?? Buffer.alloc(32).toString("base64");
  const pii = createPiiCrypto(
    parsePiiKeys(config.piiEncryptionKeys, blindIndexKey),
  );

  return (value) => pii.decrypt(value, "user.email");
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
    `retention run started, dry-run=${config.dryRun}, protected rooms=${config.protectedRooms.size}, protected emails=${config.protectedEmails.size}`,
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

  const userEmails = await loadUserEmails(pool, buildEmailDecryptor(config));
  const owner = await findOwnerProtectedRooms(
    pool,
    candidates,
    config.protectedEmails,
    userEmails,
  );

  const roomsToDelete = candidates.filter((id) => !owner.rooms.has(id));

  log(
    `rooms: total=${totalRooms}, older than the limit and unprotected by room=${candidates.length}, protected by room=${protectedByRoom}, protected by owner=${owner.rooms.size}, to delete=${roomsToDelete.length}`,
  );
  log(
    `owners: users loaded=${owner.stats.usersLoaded}, protected emails without a user=${owner.stats.protectedEmailsWithoutUser}, owners without a user=${owner.stats.ownersWithoutUser}`,
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
