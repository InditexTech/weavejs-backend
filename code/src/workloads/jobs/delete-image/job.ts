// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import pgBoss from "pg-boss";
import Emittery from "emittery";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";
import { getLogger } from "../../../logger/logger.js";
import { notifyRoomClients } from "../../../api/v2/controllers/getServerSideEvents.js";
import { createTask, updateTask } from "../../../database/controllers/task.js";
import {
  deleteImage,
  getImage,
  updateImage,
} from "../../../database/controllers/image.js";
import {
  DeleteImageJobData,
  DeleteImageJobEvents,
  DeleteImageJobWorkData,
} from "./types.js";
import { JOB_DELETE_IMAGE_QUEUE_NAME } from "./constants.js";

export class DeleteImageJob {
  private logger: ReturnType<typeof getLogger>;
  private boss: pgBoss;
  private eventEmitter: Emittery<DeleteImageJobEvents>;
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

    this.eventEmitter = new Emittery<DeleteImageJobEvents>();
    this.persistenceHandler = new ImagesPersistenceHandler();

    this.logger.info("Delete image / job created");
  }

  async start() {
    this.onNew();
    this.onProcessing();
    this.onComplete();
    this.onFailed();

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

        this.eventEmitter.emit("job:deleteImage:processing", {
          jobId: id,
          clientId,
          userId,
          roomId,
          payload: {
            imageId,
          },
        });

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
    payload: { imageId },
  }: DeleteImageJobWorkData) {
    this.logger.info(`Received delete image job: ${jobId}`);

    this.logger.info(`Delete image: ${imageId}, of room: ${roomId}`);

    const deleted = await deleteImage({
      roomId,
      imageId,
    });

    if (deleted === 1) {
      const fileName = `${roomId}/${imageId}`;
      await this.persistenceHandler.delete(fileName);

      this.boss.complete(JOB_DELETE_IMAGE_QUEUE_NAME, jobId, {
        status: "OK",
        clientId,
      });

      this.eventEmitter.emit("job:deleteImage:completed", {
        jobId,
        clientId,
        userId,
        roomId,
        payload: {
          imageId,
        },
      });
    } else {
      this.boss.fail(JOB_DELETE_IMAGE_QUEUE_NAME, jobId, {
        status: "KO",
        error: "Image not found",
      });

      this.eventEmitter.emit("job:deleteImage:failed", {
        jobId,
        userId,
        clientId,
        roomId,
        payload: {
          imageId,
        },
        error: "Image not found",
      });
    }
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

    const jobId = await this.boss.send(JOB_DELETE_IMAGE_QUEUE_NAME, jobData);

    if (!jobId) {
      throw new Error("Error creating delete image job");
    }

    this.eventEmitter.emit("job:deleteImage:new", {
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

  private async getImageData({
    roomId,
    imageId,
  }: {
    roomId: string;
    imageId: string;
  }): Promise<string | null> {
    let dataBase64Image = null;

    const image = await getImage({
      roomId,
      imageId,
    });
    if (image) {
      const fileName = `${roomId}/${imageId}`;

      if (await this.persistenceHandler.exists(fileName)) {
        const { response } = await this.persistenceHandler.fetch(fileName);

        if (response && response.readableStreamBody) {
          const chunks: Buffer[] = [];
          for await (const chunk of response.readableStreamBody) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }

          const buffer = Buffer.concat(chunks);
          dataBase64Image = `data:${image.mimeType};base64,${buffer.toString("base64")}`;
        }
      }
    }

    return dataBase64Image;
  }

  private onNew() {
    this.eventEmitter.on("job:deleteImage:new", async (data) => {
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

      notifyRoomClients(roomId, {
        jobId,
        type: "deleteImage",
        status: "created",
      });

      const dataBase64Image = await this.getImageData({ roomId, imageId });
      await updateTask(
        {
          jobId,
        },
        {
          metadata: {
            imageId,
            dataBase64Image,
          },
        }
      );

      notifyRoomClients(roomId, {
        jobId,
        type: "deleteImage",
        status: "created",
      });

      this.logger.info(
        `Delete image / created new job / ${jobId} / ${clientId}`
      );
    });
  }

  private onProcessing() {
    this.eventEmitter.on("job:deleteImage:processing", async (data) => {
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

      notifyRoomClients(roomId, {
        jobId,
        type: "deleteImage",
        status: "active",
      });

      this.logger.info(
        `Delete image / job stated active / ${jobId} / ${clientId}`
      );
    });
  }

  private onComplete() {
    this.eventEmitter.on("job:deleteImage:completed", async (data) => {
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

      notifyRoomClients(roomId, {
        jobId,
        type: "deleteImage",
        status: "completed",
      });

      this.logger.info(
        `Delete image / job completed / ${jobId} / ${clientId} / ${imageId})`
      );
    });
  }

  private onFailed() {
    this.eventEmitter.on("job:deleteImage:failed", async (data) => {
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

      notifyRoomClients(roomId, {
        jobId,
        type: "deleteImage",
        status: "failed",
      });

      this.logger.error(
        `Delete image / job failed: / ${jobId} / ${clientId} / ${error}`
      );
    });
  }
}
