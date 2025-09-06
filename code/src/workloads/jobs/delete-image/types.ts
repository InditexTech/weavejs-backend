// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type DeleteImageJobNew = {
  jobId: string;
  roomId: string;
  userId: string;
  clientId: string;
  payload: {
    imageId: string;
  };
};

export type DeleteImageJobProcessing = {
  jobId: string;
  roomId: string;
  userId: string;
  clientId: string;
  payload: {
    imageId: string;
  };
};

export type DeleteImageJobComplete = {
  jobId: string;
  roomId: string;
  userId: string;
  clientId: string;
  payload: {
    imageId: string;
  };
};

export type DeleteImageJobFailed = {
  jobId: string;
  roomId: string;
  userId: string;
  clientId: string;
  payload: {
    imageId: string;
  };
  error: string;
};

export type DeleteImageJobData = {
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    imageId: string;
  };
};

export type DeleteImageJobWorkData = {
  jobId: string;
  roomId: string;
  userId: string;
  clientId: string;
  payload: {
    imageId: string;
    dataImageBase64: string;
    mimeType: string;
  };
};
