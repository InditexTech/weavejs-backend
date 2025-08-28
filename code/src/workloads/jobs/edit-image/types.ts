// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type EditImageKind =
  | "editImage"
  | "editImageMask"
  | "editImageReferences";

export type EditImageParameters = {
  prompt: string;
  sampleCount: 1 | 2 | 3 | 4;
  size: "1024x1024" | "1024x1536" | "1536x1024";
  quality: "low" | "medium" | "high";
  moderation: "low" | "auto";
} & (
  | {
      editKind: "editImage";
      image: string;
    }
  | {
      editKind: "editImageMask";
      image: string;
      imageMask: string;
    }
  | {
      editKind: "editImageReferences";
      image: string;
      referenceImages: string[];
    }
);

export type EditImageJobNew = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: EditImageParameters;
  imagesIds: string[];
};

export type EditImageJobProcessing = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  editKind: EditImageKind;
  imagesIds: string[];
};

export type EditImageJobComplete = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  editKind: EditImageKind;
  imagesIds: string[];
};

export type EditImageJobFailed = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  error: string;
  editKind: EditImageKind;
  imagesIds: string[];
};

export interface EditImageEvents {
  "job:editImage:new": EditImageJobNew;
  "job:editImage:processing": EditImageJobProcessing;
  "job:editImage:completed": EditImageJobComplete;
  "job:editImage:failed": EditImageJobFailed;
}

export type EditImageJobData = {
  clientId: string;
  roomId: string;
  userId: string;
  payload: EditImageParameters;
  imagesIds: string[];
};

export type EditImageJobWorkData = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: EditImageParameters;
  imagesIds: string[];
};
