// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { QueryTypes, type Sequelize } from "sequelize";
import type { RetentionConfig } from "./config.js";
import { buildContainerNames } from "./config.js";
import type { TransactionalPool } from "./database.js";

type RawConnection = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
};

type ConnectionManager = {
  getConnection: (options: {
    type: "read" | "write";
  }) => Promise<RawConnection>;
  releaseConnection: (connection: RawConnection) => Promise<void>;
};

// Gives the retention core the database connection the application already
// has, so it reuses its credentials and token renewal. Plain queries go through
// Sequelize, and a transaction takes one dedicated raw connection.
export const createSequelizeDb = (sequelize: Sequelize): TransactionalPool => {
  const manager = sequelize.connectionManager as unknown as ConnectionManager;

  return {
    query: async <Row = Record<string, unknown>>(
      text: string,
      params: unknown[] = [],
    ) => {
      const rows = await sequelize.query(text, {
        bind: params as never,
        type: QueryTypes.SELECT,
      });
      return { rows: rows as Row[] };
    },

    connect: async () => {
      const connection = await manager.getConnection({ type: "write" });
      return {
        query: (async (text: string, params?: unknown[]) =>
          connection.query(text, params)) as never,
        release: () => {
          void manager.releaseConnection(connection);
        },
      };
    },
  };
};

type AppStorageConfig = {
  accountName?: string;
  connectionString?: string;
  rooms: { containerName: string };
  images: { containerName: string };
  videos: { containerName: string };
};

// Storage settings of the running application, in the shape the core expects.
export const storageFromAppConfig = (
  storage: AppStorageConfig,
  generatedImagesOverride: string | undefined,
): RetentionConfig["storage"] => ({
  accountName: storage.accountName || undefined,
  connectionString: storage.connectionString || undefined,
  containers: buildContainerNames(
    {
      rooms: storage.rooms.containerName,
      images: storage.images.containerName,
      videos: storage.videos.containerName,
    },
    generatedImagesOverride,
  ),
});
