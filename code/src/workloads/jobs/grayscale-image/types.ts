// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type GrayscaleImageJobNew = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    imageId: string;
    newImageId: string;
    image: {
      dataBase64: string;
      contentType: string;
    };
  };
};

export type GrayscaleImageJobProcessing = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    imageId: string;
    newImageId: string;
  };
};

export type GrayscaleImageJobComplete = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    imageId: string;
    newImageId: string;
    image: {
      dataBase64: string;
      contentType: string;
    };
  };
};

export type GrayscaleImageJobFailed = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    imageId: string;
    newImageId: string;
  };
  error: string;
};

export type GrayscaleImageJobData = {
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    imageId: string;
    newImageId: string;
    image: {
      dataBase64: string;
      contentType: string;
    };
  };
};

export type GrayscaleImageJobWorkData = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    imageId: string;
    newImageId: string;
    image: {
      dataBase64: string;
      contentType: string;
    };
  };
};
