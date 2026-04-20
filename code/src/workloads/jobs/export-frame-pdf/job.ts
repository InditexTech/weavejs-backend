// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pgBoss from "pg-boss";
import {
  ExportFramesToPdfJobComplete,
  ExportFramesToPdfJobData,
  ExportFramesToPdfJobFailed,
  ExportFramesToPdfJobNew,
  ExportFramesToPdfJobProcessing,
  ExportFramesToPdfJobWorkData,
} from "./types.js";
import { JOB_EXPORT_FRAMES_TO_PDF_QUEUE_NAME } from "./constants.js";
import { getLogger } from "../../../logger/logger.js";
import { createTask, updateTask } from "../../../database/controllers/task.js";
import { broadcastToRoom } from "../../../comm-bus/comm-bus.js";
import { runWorker } from "@/workers/workers.js";
import { getServiceConfig } from "@/config/config.js";
import {
  ExportFramesToPdfWorkerPayload,
  ExportToIPdfWorkerResult,
} from "./workers/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ExportFramesToPdfJob {
  private logger: ReturnType<typeof getLogger>;
  private boss: pgBoss;

  static async create(
    tasksManagerInstance: pgBoss,
  ): Promise<ExportFramesToPdfJob> {
    this.createJobQueue(tasksManagerInstance);
    await tasksManagerInstance.purgeQueue(JOB_EXPORT_FRAMES_TO_PDF_QUEUE_NAME);

    return new ExportFramesToPdfJob(tasksManagerInstance);
  }

  private static async createJobQueue(instance: pgBoss) {
    await instance.createQueue(JOB_EXPORT_FRAMES_TO_PDF_QUEUE_NAME, {
      name: JOB_EXPORT_FRAMES_TO_PDF_QUEUE_NAME,
      policy: "singleton",
    });
  }

  constructor(tasksManagerInstance: pgBoss) {
    this.logger = getLogger().child({ module: "export-pdf-job" });

    this.boss = tasksManagerInstance;

    this.logger.info("Job created");
  }

  async start() {
    await this.boss.work<ExportFramesToPdfJobWorkData>(
      JOB_EXPORT_FRAMES_TO_PDF_QUEUE_NAME,
      async ([job]) => {
        const { id, data } = job;
        const { clientId, roomId, userId, payload } = data;

        await this.ExportFrameToPdfJob({
          jobId: id,
          clientId,
          roomId,
          userId,
          payload,
        });
      },
    );
  }

  private async ExportFrameToPdfJob({
    jobId,
    clientId,
    roomId,
    userId,
    payload,
  }: ExportFramesToPdfJobWorkData) {
    this.logger.info(`Received export frame to pdf job: ${jobId}`);

    await this.onProcessing({
      jobId,
      clientId,
      roomId,
      userId,
      payload,
    });

    try {
      const exportedPdfId = uuidv4();

      const config = getServiceConfig();

      const result = await runWorker<
        ExportFramesToPdfWorkerPayload,
        ExportToIPdfWorkerResult
      >(path.join(__dirname, "./workers/exportFramesToPDF.js"), {
        ...payload,
        roomId,
        pdfId: exportedPdfId,
        config,
      });

      let hasError = false;
      if (result.status === "KO") {
        hasError = true;
      }

      if (hasError) {
        this.boss.fail(JOB_EXPORT_FRAMES_TO_PDF_QUEUE_NAME, jobId, {
          status: "KO",
          error: "Error exporting to pdf",
          message: "Error exporting to pdf",
        });

        await this.onFailed({
          jobId,
          clientId,
          roomId,
          userId,
          payload,
          error: "Error exporting to pdf",
        });
        throw new Error("Export failed in worker");
      } else {
        this.boss.complete(JOB_EXPORT_FRAMES_TO_PDF_QUEUE_NAME, jobId, {
          status: "OK",
          clientId,
          roomId,
          exportedPdfId,
          mimeType: "image/png",
        });

        await this.onComplete({
          jobId,
          clientId,
          roomId,
          userId,
          exportedPdfId,
          payload,
        });
      }
    } catch (ex) {
      this.boss.fail(JOB_EXPORT_FRAMES_TO_PDF_QUEUE_NAME, jobId, {
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

  async startExportFramesToPdfJob(
    clientId: string,
    roomId: string,
    userId: string,
    payload: {
      roomData: string;
      pages: { title: string; nodes: string[] }[];
      options: {
        backgroundColor: string;
        padding: number;
        pixelRatio: number;
      };
      responseType: "base64" | "blob" | "zip";
    },
  ): Promise<string> {
    const jobData: ExportFramesToPdfJobData = {
      clientId,
      roomId,
      userId,
      payload,
    };

    const jobId = await this.boss.send(
      JOB_EXPORT_FRAMES_TO_PDF_QUEUE_NAME,
      jobData,
    );

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

  private async onNew(data: ExportFramesToPdfJobNew) {
    const { jobId, clientId, userId, roomId, payload } = data;

    await createTask({
      jobId,
      roomId,
      userId,
      type: "exportFramesToPdf",
      status: "created",
      opened: false,
      metadata: payload,
    });

    broadcastToRoom(roomId, {
      jobId,
      type: "exportFramesToPdf",
      userId,
      clientId,
      status: "created",
    });

    this.logger.info(
      `Export frame to pdf / created new job / ${jobId} / ${clientId}`,
    );
  }

  private async onProcessing(data: ExportFramesToPdfJobProcessing) {
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
      type: "exportFramesToPdf",
      userId,
      clientId,
      status: "active",
    });

    this.logger.info(
      `Export frame to pdf / job stated active / ${jobId} / ${clientId}`,
    );
  }

  private async onComplete(data: ExportFramesToPdfJobComplete) {
    const { jobId, roomId, userId, clientId, payload, exportedPdfId } = data;

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
      type: "exportFramesToPdf",
      status: "completed",
      userId,
      clientId,
      data: {
        exportedPdfId,
        responseType: payload.responseType,
      },
    });

    this.logger.info(
      `Export frame to pdf / job completed / ${jobId} / ${clientId}`,
    );
  }

  private async onFailed(data: ExportFramesToPdfJobFailed) {
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
      type: "exportFramesToPdf",
      status: "failed",
    });

    this.logger.error(
      `Export frame to pdf / job failed: / ${jobId} / ${clientId} / ${error}`,
    );
  }
}
