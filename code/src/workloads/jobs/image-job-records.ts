// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { decodeImageOrThrow } from "../../images/validate.js";
import { createTask } from "../../database/controllers/task.js";
import { createImage } from "../../database/controllers/image.js";

type ImageJobRecordsInput = {
  jobId: string;
  roomId: string;
  userId: string;
  imageId: string;
  newImageId: string;
  taskType: Parameters<typeof createTask>[0]["type"];
  operation: Parameters<typeof createImage>[0]["operation"];
  image: { dataBase64: string; contentType: string };
};

// Validates the image first so a bad payload leaves no task or image rows.
export async function createImageJobRecords({
  jobId,
  roomId,
  userId,
  imageId,
  newImageId,
  taskType,
  operation,
  image,
}: ImageJobRecordsInput) {
  const { width, height } = await decodeImageOrThrow(image.dataBase64);

  await createTask({
    jobId,
    roomId,
    userId,
    type: taskType,
    status: "created",
    opened: false,
    metadata: { imageId, newImageId },
  });

  await createImage({
    roomId,
    imageId: newImageId,
    operation,
    status: "pending",
    mimeType: image.contentType,
    fileName: `${roomId}/${newImageId}`,
    width,
    height,
    aspectRatio: width / height,
    jobId,
    removalJobId: null,
    removalStatus: null,
  });
}
