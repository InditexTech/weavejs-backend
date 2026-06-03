// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import pgBoss from "pg-boss";
import { getLogger } from "../../../logger/logger.js";
import { createTask, updateTask } from "../../../database/controllers/task.js";
import {
  EditFallbackImageJobComplete,
  EditFallbackImageJobData,
  EditFallbackImageJobFailed,
  EditFallbackImageJobNew,
  EditFallbackImageJobWorkData,
} from "./types.js";
import { JOB_EDIT_FALLBACK_IMAGE_QUEUE_NAME } from "./constants.js";
import { broadcastToRoom } from "../../../comm-bus/comm-bus.js";
import { getDatabaseInstance } from "@/database/database.js";
import { getBlobServiceClient, getContainerClient } from "@/storage/storage.js";

export class EditFallbackImageJob {
  private logger: ReturnType<typeof getLogger>;
  private boss: pgBoss;

  static async create(
    tasksManagerInstance: pgBoss,
  ): Promise<EditFallbackImageJob> {
    await this.createJobQueue(tasksManagerInstance);
    await tasksManagerInstance.purgeQueue(JOB_EDIT_FALLBACK_IMAGE_QUEUE_NAME);

    return new EditFallbackImageJob(tasksManagerInstance);
  }

  private static async createJobQueue(instance: pgBoss) {
    await getDatabaseInstance().query(`SELECT pg_advisory_lock(42)`);

    try {
      await instance.createQueue(JOB_EDIT_FALLBACK_IMAGE_QUEUE_NAME, {
        name: JOB_EDIT_FALLBACK_IMAGE_QUEUE_NAME,
        policy: "singleton",
      });
    } finally {
      await getDatabaseInstance().query(`SELECT pg_advisory_unlock(42)`);
    }
  }

  constructor(tasksManagerInstance: pgBoss) {
    this.logger = getLogger().child({ module: "edit-fallback-image-job" });

    this.boss = tasksManagerInstance;

    this.logger.info("Job created");
  }

  async start() {
    await this.boss.work<EditFallbackImageJobWorkData>(
      JOB_EDIT_FALLBACK_IMAGE_QUEUE_NAME,
      async ([job]) => {
        const { id, data } = job;
        const { clientId, roomId, userId } = data;

        if (data.payload.kind === "add") {
          this.logger.info(
            `Starting add fallback image job: ${id} in room: ${roomId}`,
          );

          await this.editFallbackImageJob({
            jobId: id,
            clientId,
            userId,
            roomId,
            payload: {
              imageId: data.payload.imageId,
              kind: "add",
              dataURL: data.payload.dataURL,
            },
          });
        }
        if (data.payload.kind === "delete") {
          this.logger.info(
            `Starting delete fallback image job: ${id} in room: ${roomId}`,
          );

          await this.editFallbackImageJob({
            jobId: id,
            clientId,
            userId,
            roomId,
            payload: {
              imageId: data.payload.imageId,
              kind: "delete",
            },
          });
        }
      },
    );
  }

  private async editFallbackImageJob({
    jobId,
    userId,
    clientId,
    roomId,
    payload,
  }: EditFallbackImageJobWorkData) {
    this.logger.info(`Received edit fallback image job: ${jobId}`);

    await this.onProcessing({
      jobId,
      clientId,
      userId,
      roomId,
      payload,
    });

    const containerClient = getContainerClient();
    const blobServiceClient = getBlobServiceClient();

    if (!containerClient || !blobServiceClient) {
      await this.onFailed({
        jobId,
        userId,
        clientId,
        roomId,
        payload,
        error: "Container not found",
      });
      return;
    }

    const docName = `${roomId}-image-fallback`;

    const blockBlobClientFallbacks =
      containerClient.getBlockBlobClient(docName);

    const exists = await blockBlobClientFallbacks.exists();

    if (payload.kind === "add") {
      this.logger.info(`Add Image fallback to room: ${roomId}`);

      let actualJSON = {};

      try {
        if (exists) {
          const buffer = await blockBlobClientFallbacks.downloadToBuffer(
            undefined,
            undefined,
          );

          actualJSON = JSON.parse(buffer.toString("utf8"));
        }

        const newJSON = {
          ...actualJSON,
          [payload.imageId]: payload.dataURL,
        };

        await blockBlobClientFallbacks.upload(
          JSON.stringify(newJSON),
          Buffer.byteLength(JSON.stringify(newJSON)),
        );

        await this.onComplete({
          jobId,
          clientId,
          userId,
          roomId,
          payload,
        });
        return;
      } catch {
        await this.onFailed({
          jobId,
          userId,
          clientId,
          roomId,
          payload,
          error: "Error editing fallback image map",
        });
      }
    }
    if (payload.kind === "delete") {
      this.logger.info(`Delete Image fallback to room: ${roomId}`);

      let actualJSON = {};

      try {
        if (exists) {
          const buffer = await blockBlobClientFallbacks.downloadToBuffer(
            undefined,
            undefined,
          );

          actualJSON = JSON.parse(buffer.toString("utf8"));
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newJSON: any = {
          ...actualJSON,
        };
        delete newJSON[payload.imageId];

        await blockBlobClientFallbacks.upload(
          JSON.stringify(newJSON),
          Buffer.byteLength(JSON.stringify(newJSON)),
        );

        await this.onComplete({
          jobId,
          clientId,
          userId,
          roomId,
          payload,
        });
        return;
      } catch {
        await this.onFailed({
          jobId,
          userId,
          clientId,
          roomId,
          payload,
          error: "Error editing fallback image map",
        });
      }
    }
  }

  async startEditFallbackImageJob(
    clientId: string,
    roomId: string,
    userId: string,
    kind: "add" | "delete",
    imageId: string,
    dataURL?: string,
  ): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let payload: any = {
      kind,
    };
    if (kind === "add") {
      payload = {
        ...payload,
        imageId,
        dataURL: dataURL!,
      };
    } else {
      payload = {
        ...payload,
        imageId,
      };
    }

    console.log("Creating edit fallback image job with payload", roomId);

    const jobData: EditFallbackImageJobData = {
      clientId,
      userId,
      roomId,
      payload,
    };

    const jobId = await this.boss.sendAfter(
      JOB_EDIT_FALLBACK_IMAGE_QUEUE_NAME,
      jobData,
      {},
      1,
    );

    if (!jobId) {
      throw new Error("Error creating delete image job");
    }

    await this.onNew({
      jobId,
      userId,
      clientId,
      roomId,
      payload,
    });

    return jobId;
  }

  private async onNew(data: EditFallbackImageJobNew) {
    const { jobId, clientId, userId, roomId, payload } = data;

    await createTask({
      jobId,
      roomId,
      userId,
      type: "imageFallback",
      status: "created",
      opened: false,
      metadata: payload,
    });

    broadcastToRoom(roomId, {
      jobId,
      type: "fallbackImageUpdated",
      status: "created",
    });

    this.logger.info(
      `Fallback image edit / created new job / ${jobId} / ${clientId}`,
    );
  }

  private async onProcessing(data: EditFallbackImageJobWorkData) {
    const { jobId, roomId, userId, clientId } = data;

    await updateTask(
      {
        jobId,
      },
      {
        roomId,
        userId,
        status: "active",
      },
    );

    broadcastToRoom(roomId, {
      jobId,
      type: "fallbackImageUpdated",
      status: "active",
    });

    this.logger.info(
      `Fallback image edit / job stated active / ${jobId} / ${clientId}`,
    );
  }

  private async onComplete(data: EditFallbackImageJobComplete) {
    const { jobId, roomId, clientId } = data;

    await updateTask(
      {
        jobId,
      },
      {
        status: "completed",
      },
    );

    console.log("Broadcasting job completion to room", roomId, jobId);

    broadcastToRoom(roomId, {
      jobId,
      type: "fallbackImageUpdated",
      status: "completed",
    });

    this.logger.info(
      `Fallback image edit  / job completed / ${jobId} / ${clientId})`,
    );
  }

  private async onFailed(data: EditFallbackImageJobFailed) {
    const { jobId, clientId, roomId, error } = data;

    await updateTask(
      {
        jobId,
      },
      {
        status: "failed",
      },
    );

    broadcastToRoom(roomId, {
      jobId,
      type: "fallbackImageUpdated",
      status: "failed",
    });

    this.logger.error(
      `Fallback image edit / job failed: / ${jobId} / ${clientId} / ${error}`,
    );
  }
}
