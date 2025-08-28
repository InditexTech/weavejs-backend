// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type RemoveImageBackgroundJobNew = {
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

export type RemoveImageBackgroundJobProcessing = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    imageId: string;
    newImageId: string;
  };
};

export type RemoveImageBackgroundJobComplete = {
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

export type RemoveImageBackgroundJobFailed = {
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

export interface RemoveImageBackgroundEvents {
  "job:removeImageBackground:new": RemoveImageBackgroundJobNew;
  "job:removeImageBackground:processing": RemoveImageBackgroundJobProcessing;
  "job:removeImageBackground:completed": RemoveImageBackgroundJobComplete;
  "job:removeImageBackground:failed": RemoveImageBackgroundJobFailed;
}

export type RemoveImageBackgroundJobData = {
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

export type RemoveImageBackgroundJobWorkData = {
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
