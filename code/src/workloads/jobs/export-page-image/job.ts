// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pgBoss from "pg-boss";
import {
  ExportPageToImageJobComplete,
  ExportPageToImageJobData,
  ExportPageToImageJobFailed,
  ExportPageToImageJobNew,
  ExportPageToImageJobProcessing,
  ExportPageToImageJobWorkData,
} from "./types.js";
import { JOB_EXPORT_PAGE_IMAGE_QUEUE_NAME } from "./constants.js";
import { getLogger } from "../../../logger/logger.js";
import { createTask, updateTask } from "../../../database/controllers/task.js";
import { broadcastToRoom } from "../../../comm-bus/comm-bus.js";
import { runWorker } from "@/workers/workers.js";
import {
  ExportPageImageFormat,
  ExportPageImageWorkerPayload,
  ExportToImageWorkerResult,
} from "./workers/types.js";
import { getServiceConfig } from "@/config/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ExportPageToImageJob {
  private logger: ReturnType<typeof getLogger>;
  private boss: pgBoss;

  static async create(
    tasksManagerInstance: pgBoss,
  ): Promise<ExportPageToImageJob> {
    this.createJobQueue(tasksManagerInstance);
    await tasksManagerInstance.purgeQueue(JOB_EXPORT_PAGE_IMAGE_QUEUE_NAME);

    return new ExportPageToImageJob(tasksManagerInstance);
  }

  private static async createJobQueue(instance: pgBoss) {
    await instance.createQueue(JOB_EXPORT_PAGE_IMAGE_QUEUE_NAME, {
      name: JOB_EXPORT_PAGE_IMAGE_QUEUE_NAME,
      policy: "singleton",
    });
  }

  constructor(tasksManagerInstance: pgBoss) {
    this.logger = getLogger().child({ module: "export-page-to-image-job" });

    this.boss = tasksManagerInstance;

    this.logger.info("Job created");
  }

  async start() {
    await this.boss.work<ExportPageToImageJobWorkData>(
      JOB_EXPORT_PAGE_IMAGE_QUEUE_NAME,
      async ([job]) => {
        const { id, data } = job;
        const { clientId, roomId, userId, payload } = data;

        await this.ExportPageToImageJob({
          jobId: id,
          clientId,
          roomId,
          userId,
          payload,
        });
      },
    );
  }

  private async ExportPageToImageJob({
    jobId,
    clientId,
    roomId,
    userId,
    payload,
  }: ExportPageToImageJobWorkData) {
    this.logger.info(`Received export page to image job: ${jobId}`);

    await this.onProcessing({
      jobId,
      clientId,
      roomId,
      userId,
      payload,
    });

    try {
      const exportedImageId = uuidv4();

      let result: ExportToImageWorkerResult | undefined = undefined;

      switch (payload.type) {
        case "nodes": {
          result = await runWorker<
            ExportPageImageWorkerPayload,
            ExportToImageWorkerResult
          >(path.join(__dirname, "./workers/exportPageToImage.js"), {
            jobId,
            roomId,
            imageId: exportedImageId,
            config: getServiceConfig(),
            roomData: payload.roomData,
            nodes: payload.nodes,
            type: "nodes",
            options: {
              ...payload.options,
              format: payload.options.format as ExportPageImageFormat,
            },
          });
          break;
        }
        case "area": {
          result = await runWorker<
            ExportPageImageWorkerPayload,
            ExportToImageWorkerResult
          >(path.join(__dirname, "./workers/exportPageToImage.js"), {
            jobId,
            roomId,
            imageId: exportedImageId,
            config: getServiceConfig(),
            roomData: payload.roomData,
            area: payload.area,
            type: "area",
            options: {
              ...payload.options,
              format: payload.options.format as ExportPageImageFormat,
            },
          });
          break;
        }
        default:
          break;
      }

      let hasError = false;
      if (!result || result?.status === "KO") {
        hasError = true;
      }

      if (hasError) {
        this.boss.fail(JOB_EXPORT_PAGE_IMAGE_QUEUE_NAME, jobId, {
          status: "KO",
          error: "Error exporting the nodes",
          message: "Error exporting the nodes",
        });

        await this.onFailed({
          jobId,
          clientId,
          roomId,
          userId,
          payload,
          error: "Error exporting the page nodes",
        });
        throw new Error("Export failed in worker");
      } else {
        this.boss.complete(JOB_EXPORT_PAGE_IMAGE_QUEUE_NAME, jobId, {
          status: "OK",
          clientId,
          roomId,
          exportedImageId,
          mimeType: "image/png",
        });

        await this.onComplete({
          jobId,
          clientId,
          roomId,
          userId,
          exportedImageId,
          payload,
        });
      }
    } catch (ex) {
      this.boss.fail(JOB_EXPORT_PAGE_IMAGE_QUEUE_NAME, jobId, {
        status: "KO",
        error: "Error exporting the page nodes",
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

  async startExportPageToImageJob(
    clientId: string,
    roomId: string,
    userId: string,
    payload: {
      roomData: string;
      options: {
        format: "image/png" | "image/jpeg" | "image/webp";
        backgroundColor: string;
        padding: number;
        pixelRatio: number;
        quality: number;
      };
      responseType: "base64" | "blob" | "zip";
    } & (
      | {
          type: "nodes";
          nodes: string[];
        }
      | {
          type: "area";
          area: { x: number; y: number; width: number; height: number };
        }
    ),
  ): Promise<string> {
    const jobData: ExportPageToImageJobData = {
      clientId,
      roomId,
      userId,
      payload,
    };

    const jobId = await this.boss.send(
      JOB_EXPORT_PAGE_IMAGE_QUEUE_NAME,
      jobData,
    );

    if (!jobId) {
      throw new Error("Error creating export page to image job");
    }

    await this.onNew({
      jobId,
      clientId,
      roomId,
      userId,
      payload,
    });

    return jobId;
  }

  private async onNew(data: ExportPageToImageJobNew) {
    const { jobId, clientId, userId, roomId, payload } = data;

    await createTask({
      jobId,
      roomId,
      userId,
      type: "exportPageToImage",
      status: "created",
      opened: false,
      metadata: payload,
    });

    broadcastToRoom(roomId, {
      jobId,
      type: "exportPageToImage",
      userId,
      clientId,
      status: "created",
    });

    this.logger.info(
      `Export page to image / created new job / ${jobId} / ${clientId}`,
    );
  }

  private async onProcessing(data: ExportPageToImageJobProcessing) {
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
      type: "exportPageToImage",
      userId,
      clientId,
      status: "active",
    });

    this.logger.info(
      `Export page to image / job stated active / ${jobId} / ${clientId}`,
    );
  }

  private async onComplete(data: ExportPageToImageJobComplete) {
    const { jobId, roomId, userId, clientId, payload, exportedImageId } = data;

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
      type: "exportPageToImage",
      status: "completed",
      userId,
      clientId,
      data: {
        exportedImageId,
        extension: payload.options.format.split("/")[1],
        responseType: payload.responseType,
      },
    });

    this.logger.info(
      `Export page to image / job completed / ${jobId} / ${clientId}`,
    );
  }

  private async onFailed(data: ExportPageToImageJobFailed) {
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
      type: "exportPageToImage",
      status: "failed",
    });

    this.logger.error(
      `Export page to image / job failed: / ${jobId} / ${clientId} / ${error}`,
    );
  }
}
