// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import fs from "node:fs";
import path from "node:path";
import { imageSize } from "image-size";
import pgBoss from "pg-boss";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";
import {
  RemoveImageBackgroundJobComplete,
  RemoveImageBackgroundJobData,
  RemoveImageBackgroundJobFailed,
  RemoveImageBackgroundJobNew,
  RemoveImageBackgroundJobProcessing,
  RemoveImageBackgroundJobWorkData,
} from "./types.js";
import { JOB_REMOVE_IMAGE_BACKGROUND_QUEUE_NAME } from "./constants.js";
import { getLogger } from "../../../logger/logger.js";
import { saveBase64ToFile } from "../../../utils.js";
import { removeBackground } from "@imgly/background-removal-node";
import { createTask, updateTask } from "../../../database/controllers/task.js";
import {
  createImage,
  updateImage,
} from "../../../database/controllers/image.js";
import { broadcastToRoom } from "../../../comm-bus/comm-bus.js";

export class RemoveImageBackgroundJob {
  private logger: ReturnType<typeof getLogger>;
  private boss: pgBoss;
  private persistenceHandler: ImagesPersistenceHandler;

  static async create(
    tasksManagerInstance: pgBoss
  ): Promise<RemoveImageBackgroundJob> {
    this.createJobQueue(tasksManagerInstance);
    await tasksManagerInstance.purgeQueue(
      JOB_REMOVE_IMAGE_BACKGROUND_QUEUE_NAME
    );

    return new RemoveImageBackgroundJob(tasksManagerInstance);
  }

  private static async createJobQueue(instance: pgBoss) {
    await instance.createQueue(JOB_REMOVE_IMAGE_BACKGROUND_QUEUE_NAME, {
      name: JOB_REMOVE_IMAGE_BACKGROUND_QUEUE_NAME,
      policy: "singleton",
    });
  }

  constructor(tasksManagerInstance: pgBoss) {
    this.logger = getLogger().child({ module: "remove-background-job" });

    this.boss = tasksManagerInstance;

    this.persistenceHandler = new ImagesPersistenceHandler();

    this.logger.info("Job created");
  }

  async start() {
    await this.boss.work<RemoveImageBackgroundJobWorkData>(
      JOB_REMOVE_IMAGE_BACKGROUND_QUEUE_NAME,
      async ([job]) => {
        const { id, data } = job;
        const {
          clientId,
          roomId,
          userId,
          payload: { imageId, newImageId, image },
        } = data;

        await this.removeImageBackgroundJob({
          jobId: id,
          clientId,
          roomId,
          userId,
          payload: {
            newImageId,
            imageId,
            image,
          },
        });
      }
    );
  }

  private async myBlobToUIntDemo(blob: Blob) {
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return new Uint8Array(buffer);
  }

  private async removeImageBackgroundJob({
    jobId,
    clientId,
    roomId,
    userId,
    payload: { imageId, image, newImageId },
  }: RemoveImageBackgroundJobWorkData) {
    this.logger.info(`Received remove image background job: ${jobId}`);

    await this.onProcessing({
      jobId,
      clientId,
      roomId,
      userId,
      payload: {
        imageId,
        newImageId,
      },
    });

    const { dataBase64 } = image;

    const fileName = `${roomId}/${newImageId}`;
    const filePath = path.join(process.cwd(), "temp", fileName);

    await saveBase64ToFile(dataBase64, filePath);

    try {
      const blob: Blob = await removeBackground(filePath, {
        publicPath: `file://${path.join(process.cwd(), "public")}/`,
        output: { format: "image/png", quality: 1 },
      });

      // The result is a blob encoded as PNG. It can be converted to an URL to be used as HTMLImage.src
      const data = await this.myBlobToUIntDemo(blob);
      await this.persistenceHandler?.persist(
        fileName,
        { size: data.length, mimeType: "image/png" },
        data
      );
      await fs.promises.rm(filePath);

      this.boss.complete(JOB_REMOVE_IMAGE_BACKGROUND_QUEUE_NAME, jobId, {
        status: "OK",
        clientId,
        fileName,
        mimeType: "image/png",
      });

      this.onComplete({
        jobId,
        clientId,
        roomId,
        userId,
        payload: {
          imageId,
          newImageId,
          image,
        },
      });
    } catch (ex) {
      await fs.promises.rm(filePath);

      this.boss.fail(JOB_REMOVE_IMAGE_BACKGROUND_QUEUE_NAME, jobId, {
        status: "KO",
        error: "Error transforming the image",
        message: ex instanceof Error ? ex.message : String(ex),
      });

      await this.onFailed({
        jobId,
        clientId,
        roomId,
        userId,
        payload: {
          imageId,
          newImageId,
        },
        error: ex instanceof Error ? ex.message : String(ex),
      });
    }
  }

  async startRemoveImageBackgroundJob(
    clientId: string,
    roomId: string,
    userId: string,
    imageId: string,
    image: { replaceImage?: string; dataBase64: string; contentType: string }
  ): Promise<string> {
    const newImageId = uuidv4();

    const jobData: RemoveImageBackgroundJobData = {
      clientId,
      roomId,
      userId,
      payload: {
        imageId,
        newImageId,
        image,
      },
    };

    const jobId = await this.boss.send(
      JOB_REMOVE_IMAGE_BACKGROUND_QUEUE_NAME,
      jobData
    );

    if (!jobId) {
      throw new Error("Error creating remove image background job");
    }

    await this.onNew({
      jobId,
      clientId,
      roomId,
      userId,
      payload: {
        newImageId,
        imageId,
        image,
      },
    });

    return jobId;
  }

  private async onNew(data: RemoveImageBackgroundJobNew) {
    const {
      jobId,
      clientId,
      userId,
      roomId,
      payload: { imageId, newImageId, image },
    } = data;

    await createTask({
      jobId,
      roomId,
      userId,
      type: "removeImageBackground",
      status: "created",
      opened: false,
      metadata: {
        imageId,
        newImageId,
      },
    });

    const imageBuffer = Buffer.from(image.dataBase64, "base64");

    if (imageBuffer) {
      const dimensions = imageSize(imageBuffer);

      const fileName = `${roomId}/${newImageId}`;

      await createImage({
        roomId,
        imageId: newImageId,
        operation: "background-removal",
        status: "pending",
        mimeType: image.contentType,
        fileName,
        width: dimensions.width,
        height: dimensions.height,
        aspectRatio: dimensions.width / dimensions.height,
        jobId,
        removalJobId: null,
        removalStatus: null,
      });
    }

    broadcastToRoom(roomId, {
      jobId,
      type: "removeImageBackground",
      status: "created",
    });

    this.logger.info(
      `Remove image background / created new job / ${jobId} / ${clientId}`
    );
  }

  private async onProcessing(data: RemoveImageBackgroundJobProcessing) {
    const {
      jobId,
      roomId,
      userId,
      clientId,
      payload: { newImageId },
    } = data;

    await updateImage(
      {
        roomId,
        imageId: newImageId,
      },
      {
        status: "working",
      }
    );

    await updateTask(
      {
        jobId,
      },
      {
        roomId,
        userId,
        status: "active",
      }
    );

    broadcastToRoom(roomId, {
      jobId,
      type: "removeImageBackground",
      status: "active",
    });

    this.logger.info(
      `Remove image background / job stated active / ${jobId} / ${clientId}`
    );
  }

  private async onComplete(data: RemoveImageBackgroundJobComplete) {
    const {
      jobId,
      roomId,
      clientId,
      payload: { imageId, newImageId, image },
    } = data;

    await updateImage(
      {
        roomId,
        imageId: newImageId,
      },
      {
        status: "completed",
      }
    );

    await updateTask(
      {
        jobId,
      },
      {
        status: "completed",
      }
    );

    broadcastToRoom(roomId, {
      jobId,
      type: "removeImageBackground",
      status: "completed",
      data: {
        imageId,
        image,
      },
    });

    this.logger.info(
      `Remove image background / job completed / ${jobId} / ${clientId} / ${imageId})`
    );
  }

  private async onFailed(data: RemoveImageBackgroundJobFailed) {
    const {
      jobId,
      roomId,
      clientId,
      error,
      payload: { newImageId },
    } = data;

    await updateImage(
      {
        roomId,
        imageId: newImageId,
      },
      {
        status: "failed",
      }
    );

    await updateTask(
      {
        jobId,
      },
      {
        status: "failed",
      }
    );

    broadcastToRoom(roomId, {
      jobId,
      type: "removeImageBackground",
      status: "failed",
    });

    this.logger.error(
      `Remove image background / job failed: / ${jobId} / ${clientId} / ${error}`
    );
  }
}
