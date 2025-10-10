// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type NegateImageJobNew = {
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

export type NegateImageJobProcessing = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    imageId: string;
    newImageId: string;
  };
};

export type NegateImageJobComplete = {
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

export type NegateImageJobFailed = {
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

export type NegateImageJobData = {
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

export type NegateImageJobWorkData = {
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
