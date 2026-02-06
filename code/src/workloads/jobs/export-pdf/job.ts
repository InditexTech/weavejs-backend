// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pgBoss from "pg-boss";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";
import {
  ExportPdfJobComplete,
  ExportPdfJobData,
  ExportPdfJobFailed,
  ExportPdfJobNew,
  ExportPdfJobProcessing,
  ExportPdfJobWorkData,
} from "./types.js";
import { JOB_EXPORT_PDF_QUEUE_NAME } from "./constants.js";
import { getLogger } from "../../../logger/logger.js";
import { createTask, updateTask } from "../../../database/controllers/task.js";
import { broadcastToRoom } from "../../../comm-bus/comm-bus.js";
import { runWorker } from "@/workers/workers.js";
import { getServiceConfig } from "@/config/config.js";
import { ExportToIPdfWorkerResult } from "./workers/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ExportPdfJob {
  private logger: ReturnType<typeof getLogger>;
  private boss: pgBoss;
  private persistenceHandler: ImagesPersistenceHandler;

  static async create(tasksManagerInstance: pgBoss): Promise<ExportPdfJob> {
    this.createJobQueue(tasksManagerInstance);
    await tasksManagerInstance.purgeQueue(JOB_EXPORT_PDF_QUEUE_NAME);

    return new ExportPdfJob(tasksManagerInstance);
  }

  private static async createJobQueue(instance: pgBoss) {
    await instance.createQueue(JOB_EXPORT_PDF_QUEUE_NAME, {
      name: JOB_EXPORT_PDF_QUEUE_NAME,
      policy: "singleton",
    });
  }

  constructor(tasksManagerInstance: pgBoss) {
    this.logger = getLogger().child({ module: "export-pdf-job" });

    this.boss = tasksManagerInstance;

    this.persistenceHandler = new ImagesPersistenceHandler("exported-pdf");

    this.logger.info("Job created");
  }

  async start() {
    await this.boss.work<ExportPdfJobWorkData>(
      JOB_EXPORT_PDF_QUEUE_NAME,
      async ([job]) => {
        const { id, data } = job;
        const { clientId, roomId, userId, payload } = data;

        await this.ExportPdfJob({
          jobId: id,
          clientId,
          roomId,
          userId,
          payload,
        });
      },
    );
  }

  private async ExportPdfJob({
    jobId,
    clientId,
    roomId,
    userId,
    payload,
  }: ExportPdfJobWorkData) {
    this.logger.info(`Received export pdf job: ${jobId}`);

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

      const resultBuffer = await runWorker<
        ExportToIPdfWorkerResult | { error: { name: string; message: string } }
      >(path.join(__dirname, "./workers/exportToPDF.js"), {
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
        this.boss.fail(JOB_EXPORT_PDF_QUEUE_NAME, jobId, {
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
        const finalBuffer = resultBuffer as Buffer;

        const fileName = `${roomId}/${exportedPdfId}`;
        await this.persistenceHandler?.persist(
          fileName,
          { size: finalBuffer.length, mimeType: "application/pdf" },
          finalBuffer,
        );

        this.boss.complete(JOB_EXPORT_PDF_QUEUE_NAME, jobId, {
          status: "OK",
          clientId,
          roomId,
          exportedPdfId,
          mimeType: "image/png",
        });

        this.onComplete({
          jobId,
          clientId,
          roomId,
          userId,
          exportedPdfId,
          payload,
        });
      }
    } catch (ex) {
      this.boss.fail(JOB_EXPORT_PDF_QUEUE_NAME, jobId, {
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

  async startExportPdfJob(
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
    const jobData: ExportPdfJobData = {
      clientId,
      roomId,
      userId,
      payload,
    };

    const jobId = await this.boss.send(JOB_EXPORT_PDF_QUEUE_NAME, jobData);

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

  private async onNew(data: ExportPdfJobNew) {
    const { jobId, clientId, userId, roomId, payload } = data;

    await createTask({
      jobId,
      roomId,
      userId,
      type: "exportPdf",
      status: "created",
      opened: false,
      metadata: payload,
    });

    broadcastToRoom(roomId, {
      jobId,
      type: "exportPdf",
      userId,
      clientId,
      status: "created",
    });

    this.logger.info(`Export pdf / created new job / ${jobId} / ${clientId}`);
  }

  private async onProcessing(data: ExportPdfJobProcessing) {
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
      type: "exportPdf",
      userId,
      clientId,
      status: "active",
    });

    this.logger.info(`Export pdf / job stated active / ${jobId} / ${clientId}`);
  }

  private async onComplete(data: ExportPdfJobComplete) {
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
      type: "exportPdf",
      status: "completed",
      userId,
      clientId,
      data: {
        exportedPdfId,
        responseType: payload.responseType,
      },
    });

    this.logger.info(`Export pdf / job completed / ${jobId} / ${clientId}`);
  }

  private async onFailed(data: ExportPdfJobFailed) {
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
      type: "exportPdf",
      status: "failed",
    });

    this.logger.error(
      `Export pdf / job failed: / ${jobId} / ${clientId} / ${error}`,
    );
  }
}
