// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pgBoss from "pg-boss";
import {
  PresentationModeImagesJobComplete,
  PresentationModeImagesJobData,
  PresentationModeImagesJobFailed,
  PresentationModeImagesJobNew,
  PresentationModeImagesJobProcessing,
  PresentationModeImagesJobWorkData,
} from "./types.js";
import { JOB_PRESENTATION_MODE_IMAGES_QUEUE_NAME } from "./constants.js";
import { getLogger } from "../../../logger/logger.js";
import { createTask, updateTask } from "../../../database/controllers/task.js";
import { broadcastToRoom } from "../../../comm-bus/comm-bus.js";
import { runWorker } from "@/workers/workers.js";
import { getServiceConfig } from "@/config/config.js";
import {
  GeneratePresentationModePageImagePageWorkerPayload,
  GeneratePresentationModePageImagePageWorkerResult,
} from "./workers/types.js";
import { getRoomAllPages } from "@/database/controllers/page.js";
import { getBlobServiceClient, getContainerClient } from "@/storage/storage.js";
import { Readable } from "node:stream";
import { getDatabaseInstance } from "@/database/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PresentationModeImagesJob {
  private logger: ReturnType<typeof getLogger>;
  private boss: pgBoss;

  static async create(
    tasksManagerInstance: pgBoss,
  ): Promise<PresentationModeImagesJob> {
    this.createJobQueue(tasksManagerInstance);
    await tasksManagerInstance.purgeQueue(
      JOB_PRESENTATION_MODE_IMAGES_QUEUE_NAME,
    );

    return new PresentationModeImagesJob(tasksManagerInstance);
  }

  private static async createJobQueue(instance: pgBoss) {
    await getDatabaseInstance().query(`SELECT pg_advisory_lock(42)`);

    try {
      await instance.createQueue(JOB_PRESENTATION_MODE_IMAGES_QUEUE_NAME, {
        name: JOB_PRESENTATION_MODE_IMAGES_QUEUE_NAME,
        policy: "singleton",
      });
    } finally {
      await getDatabaseInstance().query(`SELECT pg_advisory_unlock(42)`);
    }
  }

  constructor(tasksManagerInstance: pgBoss) {
    this.logger = getLogger().child({ module: "export-pdf-job" });

    this.boss = tasksManagerInstance;

    this.logger.info("Job created");
  }

  async start() {
    await this.boss.work<PresentationModeImagesJobWorkData>(
      JOB_PRESENTATION_MODE_IMAGES_QUEUE_NAME,
      async ([job]) => {
        const { id, data } = job;
        const { clientId, roomId, userId, payload } = data;

        await this.PresentationModeImagesJob({
          jobId: id,
          clientId,
          roomId,
          userId,
          payload,
        });
      },
    );
  }

  private async PresentationModeImagesJob({
    jobId,
    clientId,
    roomId,
    userId,
    payload,
  }: PresentationModeImagesJobWorkData) {
    this.logger.info(`Received presentation mode images job: ${jobId}`);

    await this.onProcessing({
      jobId,
      clientId,
      roomId,
      userId,
      payload,
    });

    try {
      const config = getServiceConfig();

      const pages = await getRoomAllPages({ roomId, status: "active" });
      const generatedImages = [];

      let hasError = false;

      broadcastToRoom(roomId, {
        jobId,
        type: "presentationMode",
        status: "active",
        userId,
        clientId,
        data: {
          pages: pages.length,
          loadedPages: 0,
          presentationModeId: payload.presentationModeId,
        },
      });

      let loadedPages = 0;
      for (const page of pages) {
        let roomData: string | undefined = undefined;
        try {
          roomData = await this.getRoomData(page.pageId);
        } catch (ex) {
          console.error(ex);
          // not JSON, all good
        }

        if (!roomData) {
          continue;
        }

        const result = await runWorker<
          GeneratePresentationModePageImagePageWorkerPayload,
          GeneratePresentationModePageImagePageWorkerResult
        >(path.join(__dirname, "./workers/generatePresentationModeImage.js"), {
          jobId,
          pageId: page.pageId,
          instanceId: payload.presentationModeId,
          roomData,
          area: payload.area,
          type: "area",
          options: payload.options,
          config,
        });

        if (result.status === "KO") {
          hasError = true;
        }
        if (result.status === "OK") {
          loadedPages++;
          broadcastToRoom(roomId, {
            jobId,
            type: "presentationMode",
            status: "active",
            userId,
            clientId,
            data: {
              loadedPages,
              presentationModeId: payload.presentationModeId,
            },
          });

          generatedImages.push({
            pageInfo: page.dataValues,
            imageURL: result.fileName,
          });
        }

        if (hasError) {
          break;
        }
      }

      if (hasError) {
        this.boss.fail(JOB_PRESENTATION_MODE_IMAGES_QUEUE_NAME, jobId, {
          status: "KO",
          error: "Error generating presentation mode images",
          message: "Failed to generate presentation mode images",
        });

        await this.onFailed({
          jobId,
          clientId,
          roomId,
          userId,
          payload,
          error: "Failed to generate pages images",
        });
        return;
      }

      if (pages.length !== generatedImages.length) {
        this.boss.fail(JOB_PRESENTATION_MODE_IMAGES_QUEUE_NAME, jobId, {
          status: "KO",
          error: "Error generating presentation mode images",
          message: "Not all room pages were exported successfully",
        });

        await this.onFailed({
          jobId,
          clientId,
          roomId,
          userId,
          payload,
          error: "Not all room pages were exported successfully",
        });
        return;
      }

      this.boss.complete(JOB_PRESENTATION_MODE_IMAGES_QUEUE_NAME, jobId, {
        status: "OK",
        clientId,
        roomId,
        presentationModeId: payload.presentationModeId,
      });

      await this.onComplete({
        jobId,
        clientId,
        roomId,
        userId,
        presentationModeId: payload.presentationModeId,
        payload,
      });
    } catch (ex) {
      this.boss.fail(JOB_PRESENTATION_MODE_IMAGES_QUEUE_NAME, jobId, {
        status: "KO",
        error: "Error generating presentation mode images",
        message: ex instanceof Error ? ex.message : String(ex),
      });

      await this.onFailed({
        jobId,
        clientId,
        roomId,
        userId,
        payload,
        error: ex instanceof Error ? ex.message : String(ex),
      });
    }
  }

  async startPresentationModeImagesJob(
    clientId: string,
    roomId: string,
    userId: string,
    payload: {
      roomId: string;
      type: "area";
      area: { x: number; y: number; width: number; height: number };
      options: {
        padding: number;
        pixelRatio: number;
      };
    },
  ): Promise<{ jobId: string; presentationModeId: string }> {
    const presentationModeId = uuidv4();

    const finalPayload = {
      ...payload,
      presentationModeId,
    };

    const jobData: PresentationModeImagesJobData = {
      clientId,
      roomId,
      userId,
      payload: finalPayload,
    };

    const jobId = await this.boss.send(
      JOB_PRESENTATION_MODE_IMAGES_QUEUE_NAME,
      jobData,
    );

    if (!jobId) {
      throw new Error("Error generating presentation mode images job");
    }

    await this.onNew({
      jobId,
      clientId,
      roomId,
      userId,
      payload: finalPayload,
    });

    return { jobId, presentationModeId };
  }

  private async onNew(data: PresentationModeImagesJobNew) {
    const { jobId, clientId, userId, roomId, payload } = data;

    await createTask({
      jobId,
      roomId,
      userId,
      type: "presentationMode",
      status: "created",
      opened: false,
      metadata: payload,
    });

    broadcastToRoom(roomId, {
      jobId,
      type: "presentationMode",
      userId,
      clientId,
      status: "created",
    });

    this.logger.info(
      `Presentation mode / created new job / ${jobId} / ${clientId}`,
    );
  }

  private async onProcessing(data: PresentationModeImagesJobProcessing) {
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
      type: "presentationMode",
      userId,
      clientId,
      status: "active",
    });

    this.logger.info(
      `Presentation mode / job stated active / ${jobId} / ${clientId}`,
    );
  }

  private async onComplete(data: PresentationModeImagesJobComplete) {
    const { jobId, roomId, userId, clientId, presentationModeId } = data;

    await updateTask(
      {
        jobId,
      },
      {
        status: "completed",
      },
    );

    broadcastToRoom(roomId, {
      jobId,
      type: "presentationMode",
      status: "completed",
      userId,
      clientId,
      data: {
        presentationModeId,
      },
    });

    this.logger.info(
      `Presentation mode / job completed / ${jobId} / ${clientId}`,
    );
  }

  private async onFailed(data: PresentationModeImagesJobFailed) {
    const { jobId, roomId, clientId, error, userId } = data;

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
      userId,
      clientId,
      type: "presentationMode",
      status: "failed",
    });

    this.logger.error(
      `Presentation mode / job failed: / ${jobId} / ${clientId} / ${error}`,
    );
  }

  private async streamToBuffer(readable: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];

    for await (const chunk of readable) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  async getRoomData(roomId: string): Promise<string | undefined> {
    try {
      const containerClient = getContainerClient();
      const blobServiceClient = getBlobServiceClient();

      if (!containerClient || !blobServiceClient) {
        return;
      }

      const blockBlobClient = containerClient.getBlockBlobClient(roomId);
      if (!(await blockBlobClient.exists())) {
        return;
      }

      const response = await blockBlobClient.download();

      if (!response.readableStreamBody) {
        return;
      }

      const buffer = await this.streamToBuffer(
        response.readableStreamBody as Readable,
      );

      return buffer.toString("base64");
    } catch (error) {
      console.log(error);
      return undefined;
    }
  }
}
