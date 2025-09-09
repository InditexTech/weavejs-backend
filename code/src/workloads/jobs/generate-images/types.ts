// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type GenerateImagesParameters = {
  model: "openai/gpt-image-1" | "gemini/gemini-2.5-flash-image-preview";
  prompt: string;
  sampleCount: 1 | 2 | 3 | 4;
  size: "1024x1024" | "1024x1536" | "1536x1024";
  quality: "low" | "medium" | "high";
  moderation: "low" | "auto";
};

export type GenerateImagesJobNew = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: GenerateImagesParameters;
  imagesIds: string[];
};

export type GenerateImagesJobProcessing = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  imagesIds: string[];
};

export type GenerateImagesJobComplete = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  imagesIds: string[];
};

export type GenerateImagesJobFailed = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  error: string;
  imagesIds: string[];
};

export type GenerateImagesJobData = {
  clientId: string;
  roomId: string;
  userId: string;
  payload: GenerateImagesParameters;
  imagesIds: string[];
};

export type GenerateImagesJobWorkData = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: GenerateImagesParameters;
  imagesIds: string[];
};
