// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import pgBoss from "pg-boss";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";
import {
  GenerateImagesJobComplete,
  GenerateImagesJobData,
  GenerateImagesJobFailed,
  GenerateImagesJobNew,
  GenerateImagesJobProcessing,
  GenerateImagesJobWorkData,
  GenerateImagesParameters,
} from "./types.js";
import { JOB_GENERATE_IMAGES_QUEUE_NAME } from "./constants.js";
import { getLogger } from "../../../logger/logger.js";
import { createTask, updateTask } from "../../../database/controllers/task.js";
import {
  createImage,
  updateImage,
} from "../../../database/controllers/image.js";
import { getServiceConfig } from "../../../config/config.js";
import { broadcastToRoom } from "../../../comm-bus/comm-bus.js";
import { parseDataURL } from "../../../utils.js";

export class GenerateImagesJob {
  private logger: ReturnType<typeof getLogger>;
  private boss: pgBoss;
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

    this.persistenceHandler = new ImagesPersistenceHandler();

    this.logger.info("Job created");
  }

  async start() {
    await this.boss.work<GenerateImagesJobWorkData>(
      JOB_GENERATE_IMAGES_QUEUE_NAME,
      async ([job]) => {
        const { id, data } = job;
        const { clientId, roomId, userId, payload, imagesIds } = data;

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

  private async generateWithGtpImageAPI({
    roomId,
    payload,
    imagesIds,
  }: GenerateImagesJobWorkData) {
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
        throw new Error("Error generating the images");
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
    } catch (ex) {
      console.error(ex);
      this.logger.error((ex as Error).message);
    }
  }

  private async generateWithChatCompletionAPI({
    roomId,
    payload,
    imagesIds,
  }: GenerateImagesJobWorkData) {
    const config = getServiceConfig();

    const { prompt, sampleCount } = payload;

    const requestBody = {
      model: "gemini/gemini-2.5-flash-image-preview",
      messages: [{ role: "user", content: prompt }],
      n: sampleCount,
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        config.liteLLM.timeoutSecs * 1000
      );

      const response = await fetch(
        `${config.liteLLM.endpoint}/litellm/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.liteLLM.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error("Error generating the images");
      }

      const jsonData = await response.json();

      for (let i = 0; i < jsonData.choices.length; i++) {
        const imageId = imagesIds[i];
        const fileName = `${roomId}/${imageId}`;

        const dataURL = jsonData.choices[i].message.image.url;
        const { mimeType, base64 } = parseDataURL(dataURL);
        const data = this.base64ToUint8Array(base64);
        await this.persistenceHandler?.persist(
          fileName,
          { size: data.length, mimeType },
          data
        );
      }
    } catch (ex) {
      console.error(ex);
      this.logger.error((ex as Error).message);
    }
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

    try {
      await this.onProcessing({
        jobId,
        clientId,
        roomId,
        userId,
        imagesIds,
      });

      const { model } = payload;

      if (model === "openai/gpt-image-1") {
        await this.generateWithGtpImageAPI({
          jobId,
          clientId,
          roomId,
          userId,
          payload,
          imagesIds,
        });
      }
      if (model === "gemini/gemini-2.5-flash-image-preview") {
        await this.generateWithChatCompletionAPI({
          jobId,
          clientId,
          roomId,
          userId,
          payload,
          imagesIds,
        });
      }

      await this.boss.complete(JOB_GENERATE_IMAGES_QUEUE_NAME, jobId, {
        status: "OK",
        clientId,
        imagesIds,
      });

      await this.onComplete({
        jobId,
        clientId,
        roomId,
        userId,
        imagesIds,
      });
    } catch (ex) {
      console.error(ex);
      this.logger.error((ex as Error).message);

      await this.boss.fail(JOB_GENERATE_IMAGES_QUEUE_NAME, jobId, {
        status: "KO",
        error: "Error generating the images",
      });

      this.onFailed({
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

    const jobId = await this.boss.sendAfter(
      JOB_GENERATE_IMAGES_QUEUE_NAME,
      jobData,
      {},
      1
    );

    if (!jobId) {
      throw new Error("Error creating images generation job");
    }

    await this.onNew({
      jobId,
      clientId,
      roomId,
      userId,
      payload: parameters,
      imagesIds,
    });

    return jobId;
  }

  private async onNew(data: GenerateImagesJobNew) {
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

    broadcastToRoom(roomId, {
      jobId,
      type: "generateImages",
      status: "created",
    });

    this.logger.info(
      `Generate images / created new job / ${jobId} / ${clientId}`
    );
  }

  private async onProcessing(data: GenerateImagesJobProcessing) {
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

    broadcastToRoom(roomId, {
      jobId,
      type: "generateImages",
      status: "active",
    });

    this.logger.info(
      `Generate images / job stated active / ${jobId} / ${clientId}`
    );
  }

  private async onComplete(data: GenerateImagesJobComplete) {
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

    broadcastToRoom(roomId, {
      jobId,
      type: "generateImages",
      status: "completed",
    });

    this.logger.info(
      `Generate images / job completed / ${jobId} / ${clientId})`
    );
  }

  private async onFailed(data: GenerateImagesJobFailed) {
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

    broadcastToRoom(roomId, {
      jobId,
      type: "generateImages",
      status: "failed",
    });

    this.logger.error(
      `Generate images / job failed: / ${jobId} / ${clientId} / ${error}`
    );
  }
}
