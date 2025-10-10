// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type FlipOrientation = "horizontal" | "vertical";

export type FlipImageJobNew = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    orientation: FlipOrientation;
    imageId: string;
    newImageId: string;
    image: {
      dataBase64: string;
      contentType: string;
    };
  };
};

export type FlipImageJobProcessing = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    orientation: FlipOrientation;
    imageId: string;
    newImageId: string;
  };
};

export type FlipImageJobComplete = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    orientation: FlipOrientation;
    imageId: string;
    newImageId: string;
    image: {
      dataBase64: string;
      contentType: string;
    };
  };
};

export type FlipImageJobFailed = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    orientation: FlipOrientation;
    imageId: string;
    newImageId: string;
  };
  error: string;
};

export type FlipImageJobData = {
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    orientation: FlipOrientation;
    imageId: string;
    newImageId: string;
    image: {
      dataBase64: string;
      contentType: string;
    };
  };
};

export type FlipImageJobWorkData = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    orientation: FlipOrientation;
    imageId: string;
    newImageId: string;
    image: {
      dataBase64: string;
      contentType: string;
    };
  };
};
