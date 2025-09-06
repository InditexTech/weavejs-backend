// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import pgBoss from "pg-boss";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";
import {
  EditImageJobComplete,
  EditImageJobData,
  EditImageJobFailed,
  EditImageJobNew,
  EditImageJobProcessing,
  EditImageJobWorkData,
  EditImageParameters,
} from "./types.js";
import { JOB_EDIT_IMAGE_QUEUE_NAME } from "./constants.js";
import { getLogger } from "../../../logger/logger.js";
import { createTask, updateTask } from "../../../database/controllers/task.js";
import {
  createImage,
  updateImage,
} from "../../../database/controllers/image.js";
import { getServiceConfig } from "../../../config/config.js";
import { broadcastToRoom } from "../../../comm-bus/comm-bus.js";

export class EditImageJob {
  private logger: ReturnType<typeof getLogger>;
  private boss: pgBoss;
  private persistenceHandler: ImagesPersistenceHandler;

  static async create(tasksManagerInstance: pgBoss): Promise<EditImageJob> {
    this.createJobQueue(tasksManagerInstance);
    await tasksManagerInstance.purgeQueue(JOB_EDIT_IMAGE_QUEUE_NAME);

    return new EditImageJob(tasksManagerInstance);
  }

  private static async createJobQueue(instance: pgBoss) {
    await instance.createQueue(JOB_EDIT_IMAGE_QUEUE_NAME, {
      name: JOB_EDIT_IMAGE_QUEUE_NAME,
      policy: "singleton",
    });
  }

  constructor(tasksManagerInstance: pgBoss) {
    this.logger = getLogger().child({ module: "edit-image-job" });

    this.boss = tasksManagerInstance;

    this.persistenceHandler = new ImagesPersistenceHandler();

    this.logger.info("Job created");
  }

  async start() {
    await this.boss.work<EditImageJobWorkData>(
      JOB_EDIT_IMAGE_QUEUE_NAME,
      async ([job]) => {
        const { id, data } = job;
        const { clientId, roomId, userId, payload, imagesIds } = data;

        await this.editImageJob({
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

  private async editImageJob({
    jobId,
    clientId,
    roomId,
    userId,
    payload,
    imagesIds,
  }: EditImageJobWorkData) {
    this.logger.info(`Received edit image job: ${jobId}`);

    const config = getServiceConfig();

    const { prompt, sampleCount, size, quality, moderation, editKind, image } =
      payload;

    await this.onProcessing({
      jobId,
      clientId,
      roomId,
      userId,
      editKind,
      imagesIds,
    });

    const formData = new FormData();

    try {
      const blob = base64ToBlob(image);
      const file = new File([blob], "image.png", { type: blob.type });
      formData.append(
        editKind === "editImageReferences" ? "image[]" : "image",
        file
      );

      if (editKind === "editImageReferences") {
        const { referenceImages } = payload;
        for (let i = 0; i < referenceImages.length; i++) {
          const referenceImage = referenceImages[i];
          const referenceBlob = base64ToBlob(referenceImage);
          const referenceFile = new File(
            [referenceBlob],
            `reference_${i + 1}.png`,
            {
              type: referenceBlob.type,
            }
          );
          formData.append("image[]", referenceFile);
        }
      }

      if (editKind === "editImageMask") {
        const { imageMask } = payload;
        const maskBlob = base64ToBlob(imageMask);
        const file = new File([maskBlob], "mask.png", { type: blob.type });
        formData.append("mask", file);
      }

      formData.append("model", "gpt-image-1");
      formData.append("prompt", prompt);
      formData.append("size", size);
      formData.append("n", `${sampleCount}`);
      formData.append("quality", quality);
      formData.append("moderation", moderation);
      formData.append("output_format", "png");
    } catch (ex) {
      console.error(ex);
      await this.boss.fail(JOB_EDIT_IMAGE_QUEUE_NAME, jobId, {
        status: "KO",
        error: "Error generating the editing the image payload",
      });

      await this.onFailed({
        jobId,
        clientId,
        roomId,
        userId,
        editKind,
        imagesIds,
        error: "Error generating the. editing the image payload",
      });

      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        config.azureCsClient.timeoutSecs * 1000
      );

      const response = await fetch(
        `${config.azureCsClient.endpoint}/openai/deployments/gpt-image-1/images/edits?api-version=2025-04-01-preview`,
        {
          method: "POST",
          headers: {
            "Api-Key": config.azureCsClient.apiKey,
          },
          body: formData,
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

      await this.boss.complete(JOB_EDIT_IMAGE_QUEUE_NAME, jobId, {
        status: "OK",
        clientId,
        imagesIds,
      });

      await this.onComplete({
        jobId,
        clientId,
        roomId,
        userId,
        editKind,
        imagesIds,
      });
    } catch (ex) {
      console.error(ex);
      this.logger.error((ex as Error).message);

      await this.boss.fail(JOB_EDIT_IMAGE_QUEUE_NAME, jobId, {
        status: "KO",
        error: "Error editing the image",
      });

      await this.onFailed({
        jobId,
        userId,
        clientId,
        roomId,
        editKind,
        imagesIds,
        error: "Error editing the image",
      });
    }
  }

  async startEditImageJob(
    clientId: string,
    roomId: string,
    userId: string,
    parameters: EditImageParameters
  ): Promise<string> {
    const { sampleCount } = parameters;

    const imagesIds = [];
    for (let i = 0; i < sampleCount; i++) {
      const imageId = uuidv4();
      imagesIds.push(imageId);
    }

    const jobData: EditImageJobData = {
      clientId,
      roomId,
      userId,
      payload: parameters,
      imagesIds,
    };

    const jobId = await this.boss.sendAfter(
      JOB_EDIT_IMAGE_QUEUE_NAME,
      jobData,
      {},
      1
    );

    if (!jobId) {
      throw new Error("Error creating edit image job");
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

  private async onNew(data: EditImageJobNew) {
    const { jobId, clientId, userId, roomId, payload, imagesIds } = data;

    const { size, editKind } = payload;

    await createTask({
      jobId,
      roomId,
      userId,
      type: editKind,
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
        operation: "image-edition",
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
      type: editKind,
      status: "created",
    });

    this.logger.info(`Edit image / created new job / ${jobId} / ${clientId}`);
  }

  private async onProcessing(data: EditImageJobProcessing) {
    const { jobId, roomId, userId, clientId, editKind, imagesIds } = data;

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
      type: editKind,
      status: "active",
    });

    this.logger.info(`Edit image / job stated active / ${jobId} / ${clientId}`);
  }

  private async onComplete(data: EditImageJobComplete) {
    const { jobId, roomId, clientId, editKind, imagesIds } = data;

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
      type: editKind,
      status: "completed",
    });

    this.logger.info(`Edit image / job completed / ${jobId} / ${clientId})`);
  }

  private async onFailed(data: EditImageJobFailed) {
    const { jobId, roomId, clientId, error, editKind, imagesIds } = data;

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
      type: editKind,
      status: "failed",
    });

    this.logger.error(
      `Edit image / job failed: / ${jobId} / ${clientId} / ${error}`
    );
  }
}

const DATA_URL_REGEX = /^data:([a-z]+\/[a-z0-9.+-]+)?(;base64)?,/i;

function isValidDataURL(url: string): boolean {
  return DATA_URL_REGEX.test(url);
}

function base64ToBlob(dataURL: string): Blob {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, base64] = dataURL.split(",");

  if (!isValidDataURL(dataURL)) {
    throw new Error("Invalid data URL");
  }

  const mime = "image/png";

  const MAX_BASE64_LENGTH = 50 * 1024 * 1024; // Define a reasonable maximum length (50 MB)
  if (base64.length > MAX_BASE64_LENGTH) {
    throw new Error(
      `Base64 string exceeds maximum allowed length of ${MAX_BASE64_LENGTH} characters`
    );
  }

  const binary = atob(base64);
  const len = binary.length;
  const arrayBuffer = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    arrayBuffer[i] = binary.charCodeAt(i);
  }

  return new Blob([arrayBuffer], { type: mime });
}
