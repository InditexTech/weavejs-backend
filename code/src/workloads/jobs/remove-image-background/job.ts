// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import path from "node:path";
import mimeTypes from "mime-types";
import pgBoss from "pg-boss";
import Emittery from "emittery";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";
import {
  RemoveImageBackgroundEvents,
  RemoveImageBackgroundJobData,
  RemoveImageBackgroundJobWorkData,
} from "./types.js";
import { JOB_REMOVE_IMAGE_BACKGROUND_QUEUE_NAME } from "./constants.js";
import { getLogger } from "../../../logger/logger.js";
import { saveBase64ToFile } from "../../../utils.js";
import { removeBackground } from "@imgly/background-removal-node";
import { notifyClient } from "../../../api/v2/controllers/getServerSideEvents.js";
import { Sequelize } from "sequelize";

export class RemoveImageBackgroundJob {
  private logger: ReturnType<typeof getLogger>;
  private sequelize: Sequelize;
  private boss: pgBoss;
  private eventEmitter: Emittery<RemoveImageBackgroundEvents>;
  private persistenceHandler: ImagesPersistenceHandler;

  static async create(
    databaseInstance: Sequelize,
    tasksManagerInstance: pgBoss
  ): Promise<RemoveImageBackgroundJob> {
    this.createJobQueue(tasksManagerInstance);

    return new RemoveImageBackgroundJob(databaseInstance, tasksManagerInstance);
  }

  private static async createJobQueue(instance: pgBoss) {
    await instance.createQueue(JOB_REMOVE_IMAGE_BACKGROUND_QUEUE_NAME, {
      name: JOB_REMOVE_IMAGE_BACKGROUND_QUEUE_NAME,
      policy: "singleton",
    });
  }

  constructor(databaseInstance: Sequelize, tasksManagerInstance: pgBoss) {
    this.logger = getLogger().child({ module: "remove-background-job" });

    this.sequelize = databaseInstance;
    this.boss = tasksManagerInstance;

    this.eventEmitter = new Emittery<RemoveImageBackgroundEvents>();
    this.persistenceHandler = new ImagesPersistenceHandler();

    this.logger.info("Remove image background / job created");
  }

  async start() {
    this.onNew();
    this.onProcessing();
    this.onComplete();
    this.onFailed();

    await this.boss.work<RemoveImageBackgroundJobWorkData>(
      JOB_REMOVE_IMAGE_BACKGROUND_QUEUE_NAME,
      async ([job]) => {
        const { id, data } = job;
        const {
          clientId,
          roomId,
          userId,
          payload: { imageId, image },
        } = data;

        this.eventEmitter.emit("job:removeImageBackground:processing", {
          jobId: id,
          clientId,
          roomId,
          userId,
        });

        await this.removeImageBackgroundJob({
          jobId: id,
          clientId,
          roomId,
          userId,
          payload: {
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
    payload: { imageId, image },
  }: RemoveImageBackgroundJobWorkData) {
    this.logger.info(`Received job ${jobId}`);

    const { dataBase64, contentType } = image;

    const extension = mimeTypes.extension(contentType) || "png";
    const fileName = `${roomId}/${imageId}.${extension}`;
    const filePath = path.join(process.cwd(), "temp", fileName);

    await saveBase64ToFile(dataBase64, filePath);

    try {
      const blob: Blob = await removeBackground(filePath, {
        publicPath: `file://${path.join(process.cwd(), "public")}/`,
        output: { format: "image/png", quality: 1 },
      });

      // The result is a blob encoded as PNG. It can be converted to an URL to be used as HTMLImage.src
      const data = await this.myBlobToUIntDemo(blob);
      const fileNameRemoved = `${fileName}-removed`;
      await this.persistenceHandler?.persist(
        fileNameRemoved,
        { size: data.length, mimeType: "image/png" },
        data
      );
      await fs.promises.rm(filePath);

      this.boss.complete(JOB_REMOVE_IMAGE_BACKGROUND_QUEUE_NAME, jobId, {
        status: "OK",
        clientId,
        fileName: fileNameRemoved,
        mimeType: "image/png",
      });

      this.eventEmitter.emit("job:removeImageBackground:completed", {
        jobId,
        clientId,
        roomId,
        userId,
        payload: {
          imageId,
          image,
          newImage: {
            fileName: fileNameRemoved,
            mimeType: "image/png",
          },
        },
      });
    } catch (ex) {
      await fs.promises.rm(filePath);

      this.boss.fail(JOB_REMOVE_IMAGE_BACKGROUND_QUEUE_NAME, jobId, {
        status: "KO",
        error: "Error transforming the image",
        message: ex instanceof Error ? ex.message : String(ex),
      });

      this.eventEmitter.emit("job:removeImageBackground:failed", {
        jobId,
        clientId,
        roomId,
        userId,
        error: ex instanceof Error ? ex.message : String(ex),
      });
    }
  }

  async startRemoveImageBackgroundJob(
    clientId: string,
    roomId: string,
    userId: string,
    imageId: string,
    image: { dataBase64: string; contentType: string }
  ): Promise<string> {
    const jobData: RemoveImageBackgroundJobData = {
      clientId,
      roomId,
      userId,
      payload: {
        imageId,
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

    this.eventEmitter.emit("job:removeImageBackground:new", {
      jobId,
      clientId,
      roomId,
      userId,
      payload: {
        imageId,
        image,
      },
    });

    return jobId;
  }

  private onNew() {
    this.eventEmitter.on("job:removeImageBackground:new", (data) => {
      const { jobId, clientId } = data;

      notifyClient(clientId, {
        jobId,
        type: "removeImageBackground",
        status: "new",
      });

      this.logger.info(
        `Remove image background / registered new job / ${jobId} / ${clientId}`
      );
    });
  }

  private onProcessing() {
    this.eventEmitter.on("job:removeImageBackground:processing", (data) => {
      const { jobId, clientId } = data;

      notifyClient(clientId, {
        jobId,
        type: "removeImageBackground",
        status: "processing",
      });

      this.logger.info(
        `Remove image background / job stated processing / ${jobId} / ${clientId}`
      );
    });
  }

  private onComplete() {
    this.eventEmitter.on("job:removeImageBackground:completed", (data) => {
      const {
        jobId,
        clientId,
        payload: {
          imageId,
          image,
          newImage: { fileName, mimeType },
        },
      } = data;

      notifyClient(clientId, {
        jobId,
        type: "removeImageBackground",
        status: "completed",
        data: {
          imageId,
          image,
          newImage: { fileName, mimeType },
        },
      });

      this.logger.info(
        `Remove image background / job completed / ${jobId} / ${clientId} / ${fileName} (${mimeType})`
      );
    });
  }

  private onFailed() {
    this.eventEmitter.on("job:removeImageBackground:failed", (data) => {
      const { jobId, clientId, error } = data;

      notifyClient(clientId, {
        jobId,
        type: "removeImageBackground",
        status: "failed",
      });

      this.logger.error(
        `Remove image background / job failed: / ${jobId} / ${clientId} / ${error}`
      );
    });
  }
}
