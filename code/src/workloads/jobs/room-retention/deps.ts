// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { createBlobStore } from "@/actions/room-retention/blobStore.js";
import {
  createSequelizeDb,
  storageFromAppConfig,
} from "@/actions/room-retention/sequelizeAdapter.js";
import type { BlobStore } from "@/actions/room-retention/sweep.js";
import { getServiceConfig } from "@/config/config.js";
import { getDatabaseInstance } from "@/database/database.js";
import { getLogger } from "@/logger/logger.js";
import type { RoomRetentionDeps } from "./job.js";

// The database connection, storage settings and logger of the running
// backend, so the job uses the same identity and network as the application.
export const createRoomRetentionDeps = (): RoomRetentionDeps => {
  const logger = getLogger().child({ module: "room-retention-job" });
  let store: BlobStore | null = null;

  const getStorage = () =>
    storageFromAppConfig(
      getServiceConfig().storage,
      process.env.AZURE_STORAGE_GENERATED_IMAGES_CONTAINER_NAME,
    );

  return {
    getDb: () => createSequelizeDb(getDatabaseInstance()),
    getStore: () => (store ??= createBlobStore(getStorage())),
    getStorage,
    now: () => new Date(),
    log: (message) => logger.info(message),
  };
};
