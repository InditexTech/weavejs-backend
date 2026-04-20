// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pgBoss from "pg-boss";
import {
  ExportRoomToPdfJobComplete,
  ExportRoomToPdfJobData,
  ExportRoomToPdfJobFailed,
  ExportRoomToPdfJobNew,
  ExportRoomToPdfJobProcessing,
  ExportRoomToPdfJobWorkData,
} from "./types.js";
import { JOB_EXPORT_ROOM_TO_PDF_QUEUE_NAME } from "./constants.js";
import { getLogger } from "../../../logger/logger.js";
import { createTask, updateTask } from "../../../database/controllers/task.js";
import { broadcastToRoom } from "../../../comm-bus/comm-bus.js";
import { runWorker } from "@/workers/workers.js";
import { getServiceConfig } from "@/config/config.js";
import {
  ExportRoomToPdfWorkerPayload,
  ExportRoomToPdfWorkerResult,
  ExportToImagePageWorkerPayload,
  ExportToImagePageWorkerResult,
} from "./workers/types.js";
import { getRoomAllPages } from "@/database/controllers/page.js";
import { getBlobServiceClient, getContainerClient } from "@/storage/storage.js";
import { Readable } from "node:stream";
import { getDatabaseInstance } from "@/database/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ExportRoomToPdfJob {
  private logger: ReturnType<typeof getLogger>;
  private boss: pgBoss;

  static async create(
    tasksManagerInstance: pgBoss,
  ): Promise<ExportRoomToPdfJob> {
    this.createJobQueue(tasksManagerInstance);
    await tasksManagerInstance.purgeQueue(JOB_EXPORT_ROOM_TO_PDF_QUEUE_NAME);

    return new ExportRoomToPdfJob(tasksManagerInstance);
  }

  private static async createJobQueue(instance: pgBoss) {
    await getDatabaseInstance().query(`SELECT pg_advisory_lock(42)`);

    try {
      await instance.createQueue(JOB_EXPORT_ROOM_TO_PDF_QUEUE_NAME, {
        name: JOB_EXPORT_ROOM_TO_PDF_QUEUE_NAME,
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
    await this.boss.work<ExportRoomToPdfJobWorkData>(
      JOB_EXPORT_ROOM_TO_PDF_QUEUE_NAME,
      async ([job]) => {
        const { id, data } = job;
        const { clientId, roomId, userId, payload } = data;

        await this.ExportRoomToPdfJob({
          jobId: id,
          clientId,
          roomId,
          userId,
          payload,
        });
      },
    );
  }

  private async ExportRoomToPdfJob({
    jobId,
    clientId,
    roomId,
    userId,
    payload,
  }: ExportRoomToPdfJobWorkData) {
    this.logger.info(`Received presentation mode images job: ${jobId}`);

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

      const pages = await getRoomAllPages({ roomId, status: "active" });
      const pagesImages = [];

      let hasError = false;

      for (const page of pages) {
        const exportedPageImageId = uuidv4();

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
          ExportToImagePageWorkerPayload,
          ExportToImagePageWorkerResult
        >(path.join(__dirname, "./workers/exportPageToImage.js"), {
          ...payload,
          jobId,
          roomId,
          imageId: exportedPageImageId,
          roomData,
          options: payload.options,
          config,
        });

        if (result.status === "KO") {
          hasError = true;
        }
        if (result.status === "OK") {
          pagesImages.push({
            pageInfo: page.dataValues,
            imageURL: result.fileName,
          });
        }

        if (hasError) {
          break;
        }
      }

      if (hasError) {
        this.boss.fail(JOB_EXPORT_ROOM_TO_PDF_QUEUE_NAME, jobId, {
          status: "KO",
          error: "Error exporting the room to pdf",
          message: "Failed to generate pages images",
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

      if (pages.length !== pagesImages.length) {
        this.boss.fail(JOB_EXPORT_ROOM_TO_PDF_QUEUE_NAME, jobId, {
          status: "KO",
          error: "Error exporting the room to pdf",
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

      const result = await runWorker<
        ExportRoomToPdfWorkerPayload,
        ExportRoomToPdfWorkerResult
      >(path.join(__dirname, "./workers/exportRoomToPDF.js"), {
        ...payload,
        jobId,
        roomId,
        pdfId: exportedPdfId,
        pages: pagesImages,
        config,
      });

      if (result.status === "KO") {
        hasError = true;
      }
      if (result.status === "OK") {
        this.boss.complete(JOB_EXPORT_ROOM_TO_PDF_QUEUE_NAME, jobId, {
          status: "OK",
          clientId,
          roomId,
          exportedPdfId,
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

      if (hasError) {
        this.boss.fail(JOB_EXPORT_ROOM_TO_PDF_QUEUE_NAME, jobId, {
          status: "KO",
          error: "Error exporting the room to pdf",
          message: "Failed to generate room pdf",
        });

        await this.onFailed({
          jobId,
          clientId,
          roomId,
          userId,
          payload,
          error: "Failed to generate room pdf",
        });
      }
    } catch (ex) {
      this.boss.fail(JOB_EXPORT_ROOM_TO_PDF_QUEUE_NAME, jobId, {
        status: "KO",
        error: "Error exporting the room to pdf",
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

  async startExportRoomToPdfJob(
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
      responseType: "base64" | "blob" | "zip";
    },
  ): Promise<string> {
    const jobData: ExportRoomToPdfJobData = {
      clientId,
      roomId,
      userId,
      payload,
    };

    const jobId = await this.boss.send(
      JOB_EXPORT_ROOM_TO_PDF_QUEUE_NAME,
      jobData,
    );

    if (!jobId) {
      throw new Error("Error creating export room to pdf job");
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

  private async onNew(data: ExportRoomToPdfJobNew) {
    const { jobId, clientId, userId, roomId, payload } = data;

    await createTask({
      jobId,
      roomId,
      userId,
      type: "exportRoomToPdf",
      status: "created",
      opened: false,
      metadata: payload,
    });

    broadcastToRoom(roomId, {
      jobId,
      type: "exportRoomToPdf",
      userId,
      clientId,
      status: "created",
    });

    this.logger.info(
      `Export room to pdf / created new job / ${jobId} / ${clientId}`,
    );
  }

  private async onProcessing(data: ExportRoomToPdfJobProcessing) {
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
      type: "exportRoomToPdf",
      userId,
      clientId,
      status: "active",
    });

    this.logger.info(
      `Export room to pdf / job stated active / ${jobId} / ${clientId}`,
    );
  }

  private async onComplete(data: ExportRoomToPdfJobComplete) {
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
      type: "exportRoomToPdf",
      status: "completed",
      userId,
      clientId,
      data: {
        exportedPdfId,
        responseType: payload.responseType,
      },
    });

    this.logger.info(
      `Export room to pdf / job completed / ${jobId} / ${clientId}`,
    );
  }

  private async onFailed(data: ExportRoomToPdfJobFailed) {
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
      type: "exportRoomToPdf",
      status: "failed",
    });

    this.logger.error(
      `Export room to pdf / job failed: / ${jobId} / ${clientId} / ${error}`,
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
