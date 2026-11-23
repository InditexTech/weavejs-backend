// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { decodeImageOrThrow } from "../../images/validate.js";
import { createTask } from "../../database/controllers/task.js";
import { createImage } from "../../database/controllers/image.js";
import { broadcastToRoom } from "../../comm-bus/comm-bus.js";
import { getLogger } from "../../logger/logger.js";

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

type NewImageJobData = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    imageId: string;
    newImageId: string;
    image: { dataBase64: string; contentType: string };
  };
};

export async function registerNewImageJob(
  data: NewImageJobData,
  {
    taskType,
    operation,
    label,
  }: Pick<ImageJobRecordsInput, "taskType" | "operation"> & { label: string },
) {
  const {
    jobId,
    clientId,
    roomId,
    userId,
    payload: { imageId, newImageId, image },
  } = data;

  try {
    await createImageJobRecords({
      jobId,
      roomId,
      userId,
      imageId,
      newImageId,
      taskType,
      operation,
      image,
    });

    try {
      await broadcastToRoom(roomId, {
        jobId,
        type: taskType,
        status: "created",
      });
    } catch (err) {
      getLogger()
        .child({ module: "image-job" })
        .error({ err, jobId }, "Failed to broadcast new job");
    }

    getLogger()
      .child({ module: "image-job" })
      .info(`${label} / created new job / ${jobId} / ${clientId}`);
  } catch (ex) {
    getLogger()
      .child({ module: "image-job" })
      .error({ err: ex, jobId }, "Failed to register new job");
    throw ex;
  }
}
