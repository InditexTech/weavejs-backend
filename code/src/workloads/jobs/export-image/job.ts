// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pgBoss from "pg-boss";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";
import {
  ExportImageJobComplete,
  ExportImageJobData,
  ExportImageJobFailed,
  ExportImageJobNew,
  ExportImageJobProcessing,
  ExportImageJobWorkData,
} from "./types.js";
import { JOB_EXPORT_IMAGE_QUEUE_NAME } from "./constants.js";
import { getLogger } from "../../../logger/logger.js";
import { createTask, updateTask } from "../../../database/controllers/task.js";
import { broadcastToRoom } from "../../../comm-bus/comm-bus.js";
import { runWorker } from "@/workers/workers.js";
import { ExportToImageWorkerResult } from "./workers/types.js";
import { getServiceConfig } from "@/config/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ExportImageJob {
  private logger: ReturnType<typeof getLogger>;
  private boss: pgBoss;
  private persistenceHandler: ImagesPersistenceHandler;

  static async create(tasksManagerInstance: pgBoss): Promise<ExportImageJob> {
    this.createJobQueue(tasksManagerInstance);
    await tasksManagerInstance.purgeQueue(JOB_EXPORT_IMAGE_QUEUE_NAME);

    return new ExportImageJob(tasksManagerInstance);
  }

  private static async createJobQueue(instance: pgBoss) {
    await instance.createQueue(JOB_EXPORT_IMAGE_QUEUE_NAME, {
      name: JOB_EXPORT_IMAGE_QUEUE_NAME,
      policy: "singleton",
    });
  }

  constructor(tasksManagerInstance: pgBoss) {
    this.logger = getLogger().child({ module: "export-image-job" });

    this.boss = tasksManagerInstance;

    this.persistenceHandler = new ImagesPersistenceHandler("exported-images");

    this.logger.info("Job created");
  }

  async start() {
    await this.boss.work<ExportImageJobWorkData>(
      JOB_EXPORT_IMAGE_QUEUE_NAME,
      async ([job]) => {
        const { id, data } = job;
        const { clientId, roomId, userId, payload } = data;

        await this.ExportImageJob({
          jobId: id,
          clientId,
          roomId,
          userId,
          payload,
        });
      },
    );
  }

  private async ExportImageJob({
    jobId,
    clientId,
    roomId,
    userId,
    payload,
  }: ExportImageJobWorkData) {
    this.logger.info(`Received export image job: ${jobId}`);

    await this.onProcessing({
      jobId,
      clientId,
      roomId,
      userId,
      payload,
    });

    try {
      const exportedImageId = uuidv4();

      const config = getServiceConfig();

      const resultBuffer = await runWorker<
        ExportToImageWorkerResult | { error: { name: string; message: string } }
      >(path.join(__dirname, "./workers/exportToImage.js"), {
        ...payload,
        config,
      });

      let hasError = false;
      try {
        const buf = Buffer.from(resultBuffer as Buffer);
        const data = JSON.parse(buf.toString("utf8"));
        if (data.error) {
          hasError = true;
        }
      } catch {
        // not JSON, all good
      }

      if (hasError) {
        this.boss.fail(JOB_EXPORT_IMAGE_QUEUE_NAME, jobId, {
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
          error: "Error exporting the nodes",
        });
        throw new Error("Export failed in worker");
      } else {
        const finalBuffer = resultBuffer as Buffer;

        const fileName = `${roomId}/${exportedImageId}`;
        // The result is a blob encoded as PNG. It can be converted to an URL to be used as HTMLImage.src
        await this.persistenceHandler?.persist(
          fileName,
          { size: finalBuffer.length, mimeType: "image/png" },
          finalBuffer,
        );

        this.boss.complete(JOB_EXPORT_IMAGE_QUEUE_NAME, jobId, {
          status: "OK",
          clientId,
          roomId,
          exportedImageId,
          mimeType: "image/png",
        });

        this.onComplete({
          jobId,
          clientId,
          roomId,
          userId,
          exportedImageId,
          payload,
        });
      }
    } catch (ex) {
      this.boss.fail(JOB_EXPORT_IMAGE_QUEUE_NAME, jobId, {
        status: "KO",
        error: "Error exporting the nodes",
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

  async startExportImageJob(
    clientId: string,
    roomId: string,
    userId: string,
    payload: {
      roomData: string;
      nodes: string[];
      options: {
        format: "image/png" | "image/jpeg";
        backgroundColor: string;
        padding: number;
        pixelRatio: number;
        quality: number;
      };
      responseType: "base64" | "blob" | "zip";
    },
  ): Promise<string> {
    const jobData: ExportImageJobData = {
      clientId,
      roomId,
      userId,
      payload,
    };

    const jobId = await this.boss.send(JOB_EXPORT_IMAGE_QUEUE_NAME, jobData);

    if (!jobId) {
      throw new Error("Error creating export image job");
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

  private async onNew(data: ExportImageJobNew) {
    const { jobId, clientId, userId, roomId, payload } = data;

    await createTask({
      jobId,
      roomId,
      userId,
      type: "exportImage",
      status: "created",
      opened: false,
      metadata: payload,
    });

    broadcastToRoom(roomId, {
      jobId,
      type: "exportImage",
      userId,
      clientId,
      status: "created",
    });

    this.logger.info(`Export image / created new job / ${jobId} / ${clientId}`);
  }

  private async onProcessing(data: ExportImageJobProcessing) {
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
      type: "exportImage",
      userId,
      clientId,
      status: "active",
    });

    this.logger.info(
      `Export image / job stated active / ${jobId} / ${clientId}`,
    );
  }

  private async onComplete(data: ExportImageJobComplete) {
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
      type: "exportImage",
      status: "completed",
      userId,
      clientId,
      data: {
        exportedImageId,
        responseType: payload.responseType,
      },
    });

    this.logger.info(`Export image / job completed / ${jobId} / ${clientId}`);
  }

  private async onFailed(data: ExportImageJobFailed) {
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
      type: "exportImage",
      status: "failed",
    });

    this.logger.error(
      `Export image / job failed: / ${jobId} / ${clientId} / ${error}`,
    );
  }
}
