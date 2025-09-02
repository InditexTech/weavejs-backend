// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import pgBoss from "pg-boss";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";
import { getLogger } from "../../../logger/logger.js";
import { createTask, updateTask } from "../../../database/controllers/task.js";
import {
  deleteImage,
  getImage,
  updateImage,
} from "../../../database/controllers/image.js";
import {
  DeleteImageJobComplete,
  DeleteImageJobData,
  DeleteImageJobFailed,
  DeleteImageJobNew,
  DeleteImageJobWorkData,
} from "./types.js";
import { JOB_DELETE_IMAGE_QUEUE_NAME } from "./constants.js";
import { broadcastToRoom } from "../../../comm-bus/comm-bus.js";

export class DeleteImageJob {
  private logger: ReturnType<typeof getLogger>;
  private boss: pgBoss;
  private persistenceHandler: ImagesPersistenceHandler;

  static async create(tasksManagerInstance: pgBoss): Promise<DeleteImageJob> {
    this.createJobQueue(tasksManagerInstance);
    await tasksManagerInstance.purgeQueue(JOB_DELETE_IMAGE_QUEUE_NAME);

    return new DeleteImageJob(tasksManagerInstance);
  }

  private static async createJobQueue(instance: pgBoss) {
    await instance.createQueue(JOB_DELETE_IMAGE_QUEUE_NAME, {
      name: JOB_DELETE_IMAGE_QUEUE_NAME,
      policy: "singleton",
    });
  }

  constructor(tasksManagerInstance: pgBoss) {
    this.logger = getLogger().child({ module: "delete-image-job" });

    this.boss = tasksManagerInstance;

    this.persistenceHandler = new ImagesPersistenceHandler();

    this.logger.info("Delete image / job created");
  }

  async start() {
    await this.boss.work<DeleteImageJobWorkData>(
      JOB_DELETE_IMAGE_QUEUE_NAME,
      async ([job]) => {
        const { id, data } = job;
        const {
          clientId,
          roomId,
          userId,
          payload: { imageId, dataImageBase64, mimeType },
        } = data;

        await this.deleteImageJob({
          jobId: id,
          clientId,
          userId,
          roomId,
          payload: {
            imageId,
            dataImageBase64,
            mimeType,
          },
        });
      }
    );
  }

  private async deleteImageJob({
    jobId,
    userId,
    clientId,
    roomId,
    payload: { imageId, dataImageBase64, mimeType },
  }: DeleteImageJobWorkData) {
    this.logger.info(`Received delete image job: ${jobId}`);

    await this.onProcessing({
      jobId,
      clientId,
      userId,
      roomId,
      payload: {
        imageId,
        dataImageBase64,
        mimeType,
      },
    });

    this.logger.info(`Delete image: ${imageId}, of room: ${roomId}`);

    const imageObj = await getImage({
      roomId,
      imageId,
    });

    if (!imageObj) {
      await this.boss.fail(JOB_DELETE_IMAGE_QUEUE_NAME, jobId, {
        status: "KO",
        error: "Image not found",
      });

      await this.onFailed({
        jobId,
        userId,
        clientId,
        roomId,
        payload: {
          imageId,
        },
        error: "Image not found",
      });

      return;
    }

    await deleteImage({
      roomId,
      imageId,
    });

    try {
      const fileName = `${roomId}/${imageId}`;
      await this.persistenceHandler.delete(fileName);
    } catch (ex) {
      this.logger.error((ex as Error).message);
    }

    await this.boss.complete(JOB_DELETE_IMAGE_QUEUE_NAME, jobId, {
      status: "OK",
      clientId,
    });

    await this.onComplete({
      jobId,
      clientId,
      userId,
      roomId,
      payload: {
        imageId,
      },
    });
  }

  async startDeleteImageJob(
    clientId: string,
    roomId: string,
    userId: string,
    imageId: string
  ): Promise<string> {
    const jobData: DeleteImageJobData = {
      clientId,
      userId,
      roomId,
      payload: {
        imageId,
      },
    };

    const jobId = await this.boss.sendAfter(
      JOB_DELETE_IMAGE_QUEUE_NAME,
      jobData,
      {},
      1
    );

    if (!jobId) {
      throw new Error("Error creating delete image job");
    }

    await this.onNew({
      jobId,
      userId,
      clientId,
      roomId,
      payload: {
        imageId,
      },
    });

    return jobId;
  }

  private async onNew(data: DeleteImageJobNew) {
    const {
      jobId,
      clientId,
      userId,
      roomId,
      payload: { imageId },
    } = data;

    await createTask({
      jobId,
      roomId,
      userId,
      type: "deleteImage",
      status: "created",
      opened: false,
      metadata: {
        imageId,
        dataBase64Image: null,
      },
    });

    await updateImage(
      {
        roomId,
        imageId,
      },
      {
        removalJobId: jobId,
        removalStatus: "pending",
      }
    );

    broadcastToRoom(roomId, {
      jobId,
      type: "deleteImage",
      status: "created",
    });

    this.logger.info(`Delete image / created new job / ${jobId} / ${clientId}`);
  }

  private async onProcessing(data: DeleteImageJobWorkData) {
    const {
      jobId,
      roomId,
      userId,
      clientId,
      payload: { imageId },
    } = data;

    await updateImage(
      {
        roomId,
        imageId,
      },
      {
        removalStatus: "working",
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
      type: "deleteImage",
      status: "active",
    });

    this.logger.info(
      `Delete image / job stated active / ${jobId} / ${clientId}`
    );
  }

  private async onComplete(data: DeleteImageJobComplete) {
    const {
      jobId,
      roomId,
      clientId,
      payload: { imageId },
    } = data;

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
      type: "deleteImage",
      status: "completed",
    });

    this.logger.info(
      `Delete image / job completed / ${jobId} / ${clientId} / ${imageId})`
    );
  }

  private async onFailed(data: DeleteImageJobFailed) {
    const {
      jobId,
      clientId,
      roomId,
      error,
      payload: { imageId },
    } = data;

    await updateImage(
      {
        roomId,
        imageId,
      },
      {
        removalStatus: "failed",
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
      type: "deleteImage",
      status: "failed",
    });

    this.logger.error(
      `Delete image / job failed: / ${jobId} / ${clientId} / ${error}`
    );
  }
}
