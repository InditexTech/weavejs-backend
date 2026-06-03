// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0


export type ImageSizeGemini = "1K" | "2K" | "4K";

export type ImageSizeChatGTP = "1024x1024" | "1024x1536" | "1536x1024";

export type ImageAspectRatioGemini =
  | "1:1"
  | "2:3"
  | "3:2"
  | "3:4"
  | "4:3"
  | "9:16"
  | "16:9"
  | "21:9";

export type ImageAspectRatioChatGTP = "1:1" | "1:5" | "5:1";

export type ImageQualityChatGTP = "low" | "medium" | "high";

export type AvailableImageModels =
  | "openai/gpt-image-1"
  | "gemini-3.1-flash-image-preview";

export type ImageOptions =
  | {
      model: "openai/gpt-image-1";
      samples: number;
      aspectRatio: ImageAspectRatioChatGTP;
      quality: ImageQualityChatGTP;
      size: ImageSizeChatGTP;
    }
  | {
      model: "gemini-3.1-flash-image-preview";
      samples: number;
      aspectRatio: ImageAspectRatioGemini;
      quality?: undefined;
      size: ImageSizeGemini;
    };

export type GeneratedImage = {
  imageId: string;
  status: "generating" | "generated" | "prohibited_content" | "failed";
  url?: string;
};
