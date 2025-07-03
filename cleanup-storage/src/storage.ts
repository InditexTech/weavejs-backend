// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { getActionConfig } from "./config.js";

let blobServiceClient: BlobServiceClient | null = null;
let roomsContainerClient: ContainerClient | null = null;
let imagesContainerClient: ContainerClient | null = null;

export async function setupStorage() {
  const config = getActionConfig();

  const {
    storage: {
      accountName,
      rooms: { containerName },
      images: { containerName: imagesContainerName },
    },
  } = config;


  const credential = new DefaultAzureCredential();
  const storageAccountUrl = `https://${accountName}.blob.core.windows.net`;
  blobServiceClient = new BlobServiceClient(storageAccountUrl, credential);
  
  roomsContainerClient = blobServiceClient.getContainerClient(containerName);
  imagesContainerClient =
    blobServiceClient.getContainerClient(imagesContainerName);
}

export async function fetchRooms(): Promise<string[]> {
  if (!roomsContainerClient) {
    throw new Error("Container client not initialized");
  }

  const rooms = [];

  for await (const blob of roomsContainerClient.listBlobsFlat()) {
    rooms.push(blob.name);
  }

  return rooms;
}

export async function fetchRoomImages(room: string) {
  if (!imagesContainerClient) {
    throw new Error("Container client not initialized");
  }

  const rooms = [];

  for await (const blob of imagesContainerClient.listBlobsFlat({
    prefix: `${room}/`,
  })) {
    rooms.push(blob.name);
  }

  return rooms;
}

export async function deleteRoom(blobName: string) {
  if (!roomsContainerClient) {
    throw new Error("Container client not initialized");
  }

  const blobClient = roomsContainerClient.getBlobClient(blobName);

  const deleteResult = await blobClient.deleteIfExists();

  console.log(deleteResult ? `${blobName} deleted` : `${blobName} not found`);
}

export async function deleteRoomImage(blobName: string) {
  if (!imagesContainerClient) {
    throw new Error("Container client not initialized");
  }

  const blobClient = imagesContainerClient.getBlobClient(blobName);

  const deleteResult = await blobClient.deleteIfExists();

  console.log(deleteResult ? `${blobName} deleted` : `${blobName} not found`);
}
