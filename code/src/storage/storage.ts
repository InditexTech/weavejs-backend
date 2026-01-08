// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { getLogger } from "../logger/logger.js";
import { getServiceConfig } from "../config/config.js";

let logger = null as unknown as ReturnType<typeof getLogger>;

let storageInitialized: boolean = false;
let blobServiceClient: BlobServiceClient | null = null;
let containerClient: ContainerClient | null = null;

export async function setupStorage() {
  logger = getLogger().child({ module: "storage" });

  logger.info("Setting up");

  const config = getServiceConfig();

  const {
    storage: {
      accountName,
      connectionString,
      rooms: { containerName },
    },
  } = config;

  if (typeof connectionString !== "undefined") {
    blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);

    containerClient = blobServiceClient.getContainerClient(containerName);
    if (!(await containerClient.exists())) {
      containerClient = (await blobServiceClient.createContainer(containerName))
        .containerClient;
    }
  } else {
    const credentials = new DefaultAzureCredential();
    const storageAccountUrl = `https://${accountName}.blob.core.windows.net`;
    blobServiceClient = new BlobServiceClient(storageAccountUrl, credentials);

    containerClient = blobServiceClient.getContainerClient(containerName);
    if (!(await containerClient.exists())) {
      containerClient = (await blobServiceClient.createContainer(containerName))
        .containerClient;
    }
  }

  storageInitialized = true;

  logger.info("Module ready");
}

export const isStorageInitialized = () => storageInitialized;

export const getBlobServiceClient = () => blobServiceClient;
export const getContainerClient = () => containerClient;

export const isStorageConnected = async () => {
  if (!storageInitialized) {
    await setupStorage();
  }

  if (!containerClient || !blobServiceClient) {
    return null;
  }

  const exists = await containerClient.exists();

  return exists;
};
