// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { getActionConfig } from "./config.js";

let blobServiceClient: BlobServiceClient | null = null;
let roomsContainerClient: ContainerClient | null = null;
let imagesContainerClient: ContainerClient | null = null;

export async function setupStorage() {
  const config = getActionConfig();

  const {
    storage: {
      connectionString,
      rooms: { containerName },
      images: { containerName: imagesContainerName },
    },
  } = config;

  blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
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
    prefix: room,
  })) {
    rooms.push(blob.name);
  }

  return rooms;
}

export async function deleteRoom(blobName: string) {
  if (!roomsContainerClient) {
    throw new Error("Container client not initialized");
  }

  if (!roomsContainerClient.getBlobClient(blobName).exists()) {
    return;
  }

  const blobClient = roomsContainerClient.getBlobClient(blobName);

  await blobClient.delete();
}

export async function deleteRoomImage(blobName: string) {
  if (!imagesContainerClient) {
    throw new Error("Container client not initialized");
  }

  if (!imagesContainerClient.getBlobClient(blobName).exists()) {
    return;
  }

  const blobClient = imagesContainerClient.getBlobClient(blobName);

  await blobClient.delete();
}
