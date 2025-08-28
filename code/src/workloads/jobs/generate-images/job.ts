// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import pgBoss from "pg-boss";
import Emittery from "emittery";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";
import {
  GenerateImagesEvents,
  GenerateImagesJobData,
  GenerateImagesJobWorkData,
  GenerateImagesParameters,
} from "./types.js";
import { JOB_GENERATE_IMAGES_QUEUE_NAME } from "./constants.js";
import { getLogger } from "../../../logger/logger.js";
import { notifyRoomClients } from "../../../api/v2/controllers/getServerSideEvents.js";
import { createTask, updateTask } from "../../../database/controllers/task.js";
import {
  createImage,
  updateImage,
} from "../../../database/controllers/image.js";
import { getServiceConfig } from "../../../config/config.js";

export class GenerateImagesJob {
  private logger: ReturnType<typeof getLogger>;
  private boss: pgBoss;
  private eventEmitter: Emittery<GenerateImagesEvents>;
  private persistenceHandler: ImagesPersistenceHandler;

  static async create(
    tasksManagerInstance: pgBoss
  ): Promise<GenerateImagesJob> {
    this.createJobQueue(tasksManagerInstance);
    await tasksManagerInstance.purgeQueue(JOB_GENERATE_IMAGES_QUEUE_NAME);

    return new GenerateImagesJob(tasksManagerInstance);
  }

  private static async createJobQueue(instance: pgBoss) {
    await instance.createQueue(JOB_GENERATE_IMAGES_QUEUE_NAME, {
      name: JOB_GENERATE_IMAGES_QUEUE_NAME,
      policy: "singleton",
    });
  }

  constructor(tasksManagerInstance: pgBoss) {
    this.logger = getLogger().child({ module: "generate-images-job" });

    this.boss = tasksManagerInstance;

    this.eventEmitter = new Emittery<GenerateImagesEvents>();
    this.persistenceHandler = new ImagesPersistenceHandler();

    this.logger.info("Generate images / job created");
  }

  async start() {
    this.onNew();
    this.onProcessing();
    this.onComplete();
    this.onFailed();

    await this.boss.work<GenerateImagesJobWorkData>(
      JOB_GENERATE_IMAGES_QUEUE_NAME,
      async ([job]) => {
        const { id, data } = job;
        const { clientId, roomId, userId, payload, imagesIds } = data;

        this.eventEmitter.emit("job:generateImages:processing", {
          jobId: id,
          clientId,
          roomId,
          userId,
          imagesIds,
        });

        await this.generateImagesJob({
          jobId: id,
          clientId,
          roomId,
          userId,
          payload,
          imagesIds,
        });
      }
    );
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const cleanBase64 = base64.includes(",") ? base64.split(",")[1] : base64;
    return new Uint8Array(Buffer.from(cleanBase64, "base64"));
  }

  private async generateImagesJob({
    jobId,
    clientId,
    roomId,
    userId,
    payload,
    imagesIds,
  }: GenerateImagesJobWorkData) {
    this.logger.info(`Received generate image job: ${jobId}`);

    const config = getServiceConfig();

    const { prompt, sampleCount, size, quality, moderation } = payload;

    const requestBody = {
      model: "gpt-image-1",
      prompt,
      n: sampleCount,
      size,
      quality,
      moderation,
      output_format: "png",
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        config.azureCsClient.timeoutSecs * 1000
      );

      const response = await fetch(
        `${config.azureCsClient.endpoint}/openai/deployments/gpt-image-1/images/generations?api-version=2025-04-01-preview`,
        {
          method: "POST",
          headers: {
            "Api-Key": config.azureCsClient.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        this.boss.fail(JOB_GENERATE_IMAGES_QUEUE_NAME, jobId, {
          status: "KO",
          error: "Error generating the images",
        });

        this.eventEmitter.emit("job:generateImages:failed", {
          jobId,
          clientId,
          roomId,
          userId,
          imagesIds,
          error: "Error generating the images",
        });
      }

      const jsonData = await response.json();

      for (let i = 0; i < jsonData.data.length; i++) {
        const imageId = imagesIds[i];
        const fileName = `${roomId}/${imageId}`;

        const data = this.base64ToUint8Array(jsonData.data[i].b64_json);
        await this.persistenceHandler?.persist(
          fileName,
          { size: data.length, mimeType: "image/png" },
          data
        );
      }

      this.boss.complete(JOB_GENERATE_IMAGES_QUEUE_NAME, jobId, {
        status: "OK",
        clientId,
        imagesIds,
      });

      this.eventEmitter.emit("job:generateImages:completed", {
        jobId,
        clientId,
        roomId,
        userId,
        imagesIds,
      });
    } catch (ex) {
      this.logger.error((ex as Error).message);

      this.boss.fail(JOB_GENERATE_IMAGES_QUEUE_NAME, jobId, {
        status: "KO",
        error: "Error generating the images",
      });

      this.eventEmitter.emit("job:generateImages:failed", {
        jobId,
        clientId,
        roomId,
        userId,
        imagesIds,
        error: "Error generating the images",
      });
    }
  }

  async startGenerateImagesJob(
    clientId: string,
    roomId: string,
    userId: string,
    parameters: GenerateImagesParameters
  ): Promise<string> {
    const { sampleCount } = parameters;

    const imagesIds = [];
    for (let i = 0; i < sampleCount; i++) {
      const imageId = uuidv4();
      imagesIds.push(imageId);
    }

    const jobData: GenerateImagesJobData = {
      clientId,
      roomId,
      userId,
      payload: parameters,
      imagesIds,
    };

    const jobId = await this.boss.send(JOB_GENERATE_IMAGES_QUEUE_NAME, jobData);

    if (!jobId) {
      throw new Error("Error creating images generation job");
    }

    this.eventEmitter.emit("job:generateImages:new", {
      jobId,
      clientId,
      roomId,
      userId,
      payload: parameters,
      imagesIds,
    });

    return jobId;
  }

  private onNew() {
    this.eventEmitter.on("job:generateImages:new", async (data) => {
      const { jobId, clientId, userId, roomId, payload, imagesIds } = data;

      const { size } = payload;

      await createTask({
        jobId,
        roomId,
        userId,
        type: "generateImages",
        status: "created",
        opened: false,
        metadata: {
          payload,
        },
      });

      const sizeTokens = size.split("x");
      const width = parseInt(sizeTokens[0]);
      const height = parseInt(sizeTokens[1]);

      for (const imageId of imagesIds) {
        const fileName = `${roomId}/${imageId}`;

        await createImage({
          roomId,
          imageId,
          operation: "image-generation",
          status: "pending",
          mimeType: "image/png",
          fileName,
          width,
          height,
          aspectRatio: width / height,
          jobId,
          removalJobId: null,
          removalStatus: null,
        });
      }

      notifyRoomClients(roomId, {
        jobId,
        type: "generateImages",
        status: "created",
      });

      this.logger.info(
        `Generate images / created new job / ${jobId} / ${clientId}`
      );
    });
  }

  private onProcessing() {
    this.eventEmitter.on("job:generateImages:processing", async (data) => {
      const { jobId, roomId, userId, clientId, imagesIds } = data;

      for (const imageId of imagesIds) {
        await updateImage(
          {
            roomId,
            imageId,
          },
          {
            status: "working",
          }
        );
      }

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
        type: "generateImages",
        status: "active",
      });

      this.logger.info(
        `Generate images / job stated active / ${jobId} / ${clientId}`
      );
    });
  }

  private onComplete() {
    this.eventEmitter.on("job:generateImages:completed", async (data) => {
      const { jobId, roomId, clientId, imagesIds } = data;

      for (const imageId of imagesIds) {
        await updateImage(
          {
            roomId,
            imageId,
          },
          {
            status: "completed",
          }
        );
      }

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
        type: "generateImages",
        status: "completed",
      });

      this.logger.info(
        `Generate images / job completed / ${jobId} / ${clientId})`
      );
    });
  }

  private onFailed() {
    this.eventEmitter.on("job:generateImages:failed", async (data) => {
      const { jobId, roomId, clientId, error, imagesIds } = data;

      for (const imageId of imagesIds) {
        await updateImage(
          {
            roomId,
            imageId,
          },
          {
            status: "failed",
          }
        );
      }

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
        type: "generateImages",
        status: "failed",
      });

      this.logger.error(
        `Generate images / job failed: / ${jobId} / ${clientId} / ${error}`
      );
    });
  }
}
