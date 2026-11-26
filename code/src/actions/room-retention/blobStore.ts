// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import type { RetentionConfig } from "./config.js";
import type { BlobInfo, BlobStore } from "./sweep.js";

export const createBlobStore = (
  storage: RetentionConfig["storage"],
): BlobStore => {
  const service = storage.connectionString
    ? BlobServiceClient.fromConnectionString(storage.connectionString)
    : new BlobServiceClient(
        `https://${storage.accountName}.blob.core.windows.net`,
        new DefaultAzureCredential(),
      );

  return {
    containerExists: (container) =>
      service.getContainerClient(container).exists(),

    async *list(container): AsyncIterable<BlobInfo> {
      for await (const blob of service
        .getContainerClient(container)
        .listBlobsFlat()) {
        yield {
          name: blob.name,
          createdOn: blob.properties.createdOn,
          lastModified: blob.properties.lastModified,
        };
      }
    },

    async delete(container, name) {
      await service
        .getContainerClient(container)
        .getBlobClient(name)
        .deleteIfExists({ deleteSnapshots: "include" });
    },
  };
};
