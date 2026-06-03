// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import { GoogleGenAI } from "@google/genai";
import { getDownscaleRatio } from "@inditextech/weave-sdk/server";
import { GeneratedImage, ImageOptions } from "../types.js";
import { ImagesPersistenceHandler } from "@/images/persistence.js";
import { getServiceConfig } from "@/config/config.js";
import { ReferenceImage } from "@/mastra/types.js";
import { getJobHandler } from "@/workloads/workloads.js";
import { EditFallbackImageJob } from "@/workloads/jobs/edit-fallback-image/job.js";
import { JOB_HANDLERS } from "@/workloads/constants.js";
import { createImage } from "@/database/controllers/image.js";

let imageHandler: ImagesPersistenceHandler | null = null;

export const initImageGenerationTool = async () => {
  const config = getServiceConfig();
  imageHandler = new ImagesPersistenceHandler(config);
  await imageHandler.setup();
};

export const generateImages = async (
  prompt: string,
  params: {
    roomId: string;
    threadId: string;
    resourceId: string;
    referenceImages: ReferenceImage[];
    imageOption: ImageOptions;
  },
  imageGenerationUpdate?: (params: {
    status: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
  }) => Promise<void>,
) => {
  if (!imageHandler) {
    await initImageGenerationTool();
  }

  const { imageOption } = params;

  const model = imageOption.model;

  if (model === "openai/gpt-image-1") {
    return await generateImagesFromChatGPT({
      prompt,
      params,
      imageGenerationUpdate,
    });
  }
  if (model === "gemini-3.1-flash-image-preview") {
    return await generateImagesFromGemini({
      prompt,
      params,
      imageGenerationUpdate,
    });
  }

  throw new Error(`Image model [${model}] not supported yet.`);
};

const generateImagesFromGemini = async ({
  prompt,
  params,
}: {
  prompt: string;
  params: {
    roomId: string;
    threadId: string;
    resourceId: string;
    referenceImages: ReferenceImage[];
    imageOption: ImageOptions;
  };
  imageGenerationUpdate?: (params: {
    status: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
  }) => Promise<void>;
}) => {
  const { roomId, referenceImages, imageOption } = params;

  const model = imageOption.model;

  if (model !== "gemini-3.1-flash-image-preview") {
    throw new Error(
      `Image model [${model}] not supported in Gemini generator.`,
    );
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
  });

  const generatedImages: GeneratedImage[] = Array.from(
    { length: imageOption.samples },
    () => ({
      imageId: uuidv4(),
      status: "generating",
      url: undefined,
    }),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imageGenerationPrompt: any[] = [
    { text: `${prompt}. Only generate a single image.` },
  ];
  const referencedImages = referenceImages ?? [];
  if (referencedImages.length > 0) {
    for (const refImage of referencedImages) {
      imageGenerationPrompt.push({
        inlineData: {
          mimeType: refImage.mimeType,
          data: refImage.dataBase64,
        },
      });
    }
  }

  for (let i = 0; i < generatedImages.length; i++) {
    const actualImage = generatedImages[i];

    // logger?.info(`Generating image ${i + 1} of ${generatedImages.length}`);
    // logger?.info(`Generating image prompt: ${imageGenerationPrompt[0].text}`);

    await imageGenerationUpdate?.({
      status: actualImage.status,
      data: {
        index: i,
        imageId: actualImage.imageId,
        url: undefined,
      },
    });

    const response = await ai.models.generateContent({
      model,
      contents: imageGenerationPrompt,
      config: {
        imageConfig: {
          aspectRatio: imageOption.aspectRatio,
          imageSize: imageOption.size,
        },
        responseModalities: ["Image"],
      },
    });

    if (!response.candidates) {
      actualImage.status = "failed";

      await imageGenerationUpdate?.({
        status: actualImage.status,
        data: {
          index: i,
          imageId: actualImage.imageId,
          reason: "No candidates returned from the model.",
          url: undefined,
        },
      });

      continue;
    }

    if (!response.candidates[0]) {
      actualImage.status = "failed";

      await imageGenerationUpdate?.({
        status: actualImage.status,
        data: {
          index: i,
          imageId: actualImage.imageId,
          reason: "No candidates returned from the model.",
          url: undefined,
        },
      });

      continue;
    }

    if (response.candidates[0].finishReason === "PROHIBITED_CONTENT") {
      actualImage.status = "prohibited_content";

      await imageGenerationUpdate?.({
        status: actualImage.status,
        data: {
          index: i,
          imageId: actualImage.imageId,
          reason: "Prohibited content detected, image generation failed.",
          url: undefined,
        },
      });

      continue;
    }

    for (const part of response.candidates[0].content?.parts || []) {
      if (part.inlineData && part.inlineData.data && part.inlineData.mimeType) {
        const buffer = base64ToUint8Array(part.inlineData.data);
        const imageId = actualImage.imageId;
        const imageName = `${roomId}/${imageId}`;

        await imageGenerationUpdate?.({
          status: "persisting",
          data: {
            index: i,
            imageId: actualImage.imageId,
            url: undefined,
          },
        });

        await imageHandler?.persist(
          imageName,
          {
            mimeType: part.inlineData.mimeType,
            size: buffer.length,
          },
          buffer,
        );

        const { mimeType, width, height } = await triggerImageFallbackAdd(
          roomId,
          imageId,
          buffer,
        );

        console.log(
          "Creating image record in the database for generated image",
          {
            roomId,
            imageId,
            mimeType,
            width,
            height,
          },
        );

        await createImage({
          roomId,
          imageId,
          operation: "uploaded",
          status: "completed",
          mimeType: mimeType,
          fileName: imageName,
          width: width,
          height: height,
          aspectRatio: width / height,
          jobId: null,
          removalJobId: null,
          removalStatus: null,
        });

        actualImage.status = "generated";
        actualImage.url = `${process.env.APP_HOST}/weavebff/api/v2/weavejs/rooms/${roomId}/images/${imageId}`;

        await imageGenerationUpdate?.({
          status: "generated",
          data: {
            index: i,
            imageId: actualImage.imageId,
            url: actualImage.url,
          },
        });
      }
    }
  }

  return generatedImages;
};

const generateImagesFromChatGPT = async ({
  prompt,
  params,
}: {
  prompt: string;
  params: {
    roomId: string;
    threadId: string;
    resourceId: string;
    referenceImages: ReferenceImage[];
    imageOption: ImageOptions;
  };
  imageGenerationUpdate?: (params: {
    status: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
  }) => Promise<void>;
}) => {
  const { roomId, referenceImages, imageOption } = params;

  const model = imageOption.model;

  if (model !== "openai/gpt-image-1") {
    throw new Error(
      `Image model [${model}] not supported in ChatGPT generator.`,
    );
  }

  const generatedImages: GeneratedImage[] = Array.from(
    { length: imageOption.samples },
    () => ({
      imageId: uuidv4(),
      status: "generating",
      url: undefined,
    }),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imageGenerationPrompt: any[] = [
    { text: `${prompt}. Only generate a single image.` },
  ];
  const referencedImages = referenceImages ?? [];
  if (referencedImages.length > 0) {
    for (const refImage of referencedImages) {
      imageGenerationPrompt.push({
        inlineData: {
          mimeType: refImage.mimeType,
          data: refImage.dataBase64,
        },
      });
    }
  }

  for (let i = 0; i < generatedImages.length; i++) {
    try {
      const actualImage = generatedImages[i];

      // logger?.info(`Generating image ${i + 1} of ${generatedImages.length}`);
      // logger?.info(`Generating image prompt: ${imageGenerationPrompt[0].text}`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2 * 60 * 1000); // 2 minutes

      const requestBody = {
        model: "gpt-image-1",
        prompt,
        n: imageOption.samples,
        size: 1,
        quality: imageOption.quality,
        moderation: "auto",
        output_format: "png",
      };

      const endpoint = `${process.env.AZURE_CS_ENDPOINT ?? ""}/openai/deployments/gpt-image-1/images/generations?api-version=2025-04-01-preview`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Api-Key": process.env.AZURE_CS_API_KEY ?? "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error("Error generating the images");
      }

      const jsonData = await response.json();

      for (let i = 0; i < jsonData.data.length; i++) {
        const buffer = base64ToUint8Array(jsonData.data[i].b64_json);
        const imageId = uuidv4();
        const imageName = `${roomId}/${imageId}`;

        await imageHandler?.persist(
          imageName,
          {
            mimeType: "image/png",
            size: buffer.length,
          },
          buffer,
        );

        const { mimeType, width, height } = await triggerImageFallbackAdd(
          roomId,
          imageId,
          buffer,
        );

        await createImage({
          roomId,
          imageId,
          operation: "uploaded",
          status: "completed",
          mimeType: mimeType,
          fileName: imageName,
          width: width,
          height: height,
          aspectRatio: width / height,
          jobId: null,
          removalJobId: null,
          removalStatus: null,
        });

        actualImage.status = "generated";
        actualImage.url = `${process.env.APP_HOST}/weavebff/api/v2/weavejs/rooms/${roomId}/images/${imageId}`;
      }
    } catch (ex) {
      console.error(ex);
    }
  }

  return generatedImages;
};

const base64ToUint8Array = (base64: string): Uint8Array => {
  const cleanBase64 = base64.includes(",") ? base64.split(",")[1] : base64;
  return new Uint8Array(Buffer.from(cleanBase64, "base64"));
};

export const triggerImageFallbackAdd = async (
  roomId: string,
  imageId: string,
  buffer: Uint8Array<ArrayBufferLike>,
): Promise<{ mimeType: string; width: number; height: number }> => {
  const image = sharp(buffer);

  const meta = await image.metadata();
  const ratio = getDownscaleRatio(meta.width, meta.height);
  const downscaled = await image
    .resize({
      width: meta.width * ratio,
      withoutEnlargement: true,
    })
    .jpeg({ quality: 100 })
    .toBuffer();

  const dataURL = `data:image/jpeg;base64,${downscaled.toString("base64")}`;

  const jobHandler = getJobHandler<EditFallbackImageJob>(
    JOB_HANDLERS.EDIT_FALLBACK_IMAGE,
  );

  await jobHandler.startEditFallbackImageJob(
    "backend",
    roomId,
    "backend",
    "add",
    imageId,
    dataURL,
  );

  return {
    mimeType: `image/${meta.format}`,
    width: meta.width,
    height: meta.height,
  };
};
