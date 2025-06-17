// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { getActionConfig } from "./config.js";
import {
  deleteRoom,
  deleteRoomImage,
  fetchRoomImages,
  fetchRooms,
  setupStorage,
} from "./storage.js";
import whitelist from "./whitelist.json" with { type: "json" };

(async () => {
  const config = getActionConfig();
  console.log(`configuration:`);
  console.log(`- storage:`);
  console.log(`--- connection string: ${config.storage.connectionString}`);
  console.log(
    `--- rooms container name: ${config.storage.rooms.containerName}`
  );
  console.log(
    `--- images container name: ${config.storage.images.containerName}`
  );
  console.log(`- dry-run: ${config.dryRun}`);
  console.log("");

  console.log("Setting up storage...");
  await setupStorage();
  console.log("Storage setup complete");
  console.log("");

  console.log("Fetching rooms...");
  const rooms: string[] = await fetchRooms();
  console.log(`Rooms fetching complete [${rooms.length}]`);
  console.log("");

  console.log(`Rooms:`);
  for (const room of rooms) {
    console.log(`- ${room}`);
  }
  console.log("");

  console.log(`Whitelist:`);
  for (const room of whitelist) {
    console.log(`- ${room}`);
  }
  console.log("");

  const roomsToDelete = rooms.filter((room) => !whitelist.includes(room));
  console.log(`Rooms to delete [${roomsToDelete.length}]`);
  console.log("");

  console.log("Fetching rooms images...");
  let imagesAmount = 0;
  const roomsImages: Record<string, string[]> = {};
  for (const room of roomsToDelete) {
    const roomImages = await fetchRoomImages(room);
    roomsImages[room] = roomImages;
    imagesAmount += roomImages.length;
  }
  console.log(`Rooms images fetching complete [${imagesAmount}]`);
  console.log("");

  console.log("Deleting rooms images...");
  for (const room of roomsToDelete) {
    const roomImages = roomsImages[room];
    for (const image of roomImages) {
      process.stdout.write(".");
      if (!config.dryRun) {
        await deleteRoomImage(image);
      }
    }
  }
  console.log("");
  console.log("Rooms images deletion complete");
  console.log("");

  console.log("Deleting rooms...");
  for (const room of roomsToDelete) {
    process.stdout.write(".");
    if (!config.dryRun) {
      await deleteRoom(room);
    }
  }
  console.log("");
  console.log("Rooms images deletion complete");
  console.log("");

  console.log("Storage cleanup complete");
})();
