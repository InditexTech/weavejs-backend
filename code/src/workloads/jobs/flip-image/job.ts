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
  FlipImageJobComplete,
  FlipImageJobData,
  FlipImageJobFailed,
  FlipImageJobNew,
  FlipImageJobProcessing,
  FlipImageJobWorkData,
  FlipOrientation,
} from "./types.js";
import { JOB_FLIP_IMAGE_QUEUE_NAME } from "./constants.js";
import { getLogger } from "../../../logger/logger.js";
import { saveBase64ToFile } from "../../../utils.js";
import sharp from "sharp";
import { createTask, updateTask } from "../../../database/controllers/task.js";
import {
  createImage,
  updateImage,
} from "../../../database/controllers/image.js";
import { broadcastToRoom } from "../../../comm-bus/comm-bus.js";

export class FlipImageJob {
  private logger: ReturnType<typeof getLogger>;
  private boss: pgBoss;
  private persistenceHandler: ImagesPersistenceHandler;

  static async create(tasksManagerInstance: pgBoss): Promise<FlipImageJob> {
    this.createJobQueue(tasksManagerInstance);
    await tasksManagerInstance.purgeQueue(JOB_FLIP_IMAGE_QUEUE_NAME);

    return new FlipImageJob(tasksManagerInstance);
  }

  private static async createJobQueue(instance: pgBoss) {
    await instance.createQueue(JOB_FLIP_IMAGE_QUEUE_NAME, {
      name: JOB_FLIP_IMAGE_QUEUE_NAME,
      policy: "singleton",
    });
  }

  constructor(tasksManagerInstance: pgBoss) {
    this.logger = getLogger().child({ module: "flip-image-job" });

    this.boss = tasksManagerInstance;

    this.persistenceHandler = new ImagesPersistenceHandler();

    this.logger.info("Job created");
  }

  async start() {
    await this.boss.work<FlipImageJobWorkData>(
      JOB_FLIP_IMAGE_QUEUE_NAME,
      async ([job]) => {
        const { id, data } = job;
        const {
          clientId,
          roomId,
          userId,
          payload: { orientation, imageId, newImageId, image },
        } = data;

        await this.FlipImageJob({
          jobId: id,
          clientId,
          roomId,
          userId,
          payload: {
            orientation,
            newImageId,
            imageId,
            image,
          },
        });
      }
    );
  }

  private async FlipImageJob({
    jobId,
    clientId,
    roomId,
    userId,
    payload: { orientation, imageId, image, newImageId },
  }: FlipImageJobWorkData) {
    this.logger.info(`Received flip image job: ${jobId}`);

    await this.onProcessing({
      jobId,
      clientId,
      roomId,
      userId,
      payload: {
        orientation,
        imageId,
        newImageId,
      },
    });

    const { dataBase64 } = image;

    const fileName = `${roomId}/${newImageId}`;
    const filePath = path.join(process.cwd(), "temp", fileName);

    await saveBase64ToFile(dataBase64, filePath);

    try {
      const sharpImage = sharp(filePath);
      const metadata = await sharpImage.metadata();

      let pipeline = sharpImage;
      if (metadata.format !== "png") {
        pipeline = sharpImage.png();
      }

      if (orientation === "horizontal") {
        pipeline = pipeline.flop();
      }
      if (orientation === "vertical") {
        pipeline = pipeline.flip();
      }

      const buffer = await pipeline.png().toBuffer();
      const realBuffer = new Uint8Array(buffer);

      // The result is a blob encoded as PNG. It can be converted to an URL to be used as HTMLImage.src
      await this.persistenceHandler?.persist(
        fileName,
        { size: realBuffer.length, mimeType: "image/png" },
        realBuffer
      );
      await fs.promises.rm(filePath);

      this.boss.complete(JOB_FLIP_IMAGE_QUEUE_NAME, jobId, {
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
          orientation,
          imageId,
          newImageId,
          image,
        },
      });
    } catch (ex) {
      await fs.promises.rm(filePath);

      this.boss.fail(JOB_FLIP_IMAGE_QUEUE_NAME, jobId, {
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
          orientation,
          imageId,
          newImageId,
        },
        error: ex instanceof Error ? ex.message : String(ex),
      });
    }
  }

  async startFlipImageJob(
    clientId: string,
    roomId: string,
    userId: string,
    imageId: string,
    orientation: FlipOrientation,
    image: {
      replaceImage?: string;
      dataBase64: string;
      contentType: string;
    }
  ): Promise<string> {
    const newImageId = uuidv4();

    const jobData: FlipImageJobData = {
      clientId,
      roomId,
      userId,
      payload: {
        orientation,
        imageId,
        newImageId,
        image,
      },
    };

    const jobId = await this.boss.send(JOB_FLIP_IMAGE_QUEUE_NAME, jobData);

    if (!jobId) {
      throw new Error("Error creating flip image job");
    }

    await this.onNew({
      jobId,
      clientId,
      roomId,
      userId,
      payload: {
        orientation,
        newImageId,
        imageId,
        image,
      },
    });

    return jobId;
  }

  private async onNew(data: FlipImageJobNew) {
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
      type: "flipImage",
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
        operation: "flip-image",
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
      type: "flipImage",
      status: "created",
    });

    this.logger.info(`Flip image / created new job / ${jobId} / ${clientId}`);
  }

  private async onProcessing(data: FlipImageJobProcessing) {
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
      type: "flipImage",
      status: "active",
    });

    this.logger.info(`Flip image / job stated active / ${jobId} / ${clientId}`);
  }

  private async onComplete(data: FlipImageJobComplete) {
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
      type: "flipImage",
      status: "completed",
      data: {
        imageId,
        image,
      },
    });

    this.logger.info(
      `Flip image / job completed / ${jobId} / ${clientId} / ${imageId})`
    );
  }

  private async onFailed(data: FlipImageJobFailed) {
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
      type: "flipImage",
      status: "failed",
    });

    this.logger.error(
      `Flip image / job failed: / ${jobId} / ${clientId} / ${error}`
    );
  }
}
