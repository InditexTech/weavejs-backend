// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type DeleteVideoJobNew = {
  jobId: string;
  roomId: string;
  userId: string;
  clientId: string;
  payload: {
    videoId: string;
  };
};

export type DeleteVideoJobProcessing = {
  jobId: string;
  roomId: string;
  userId: string;
  clientId: string;
  payload: {
    videoId: string;
  };
};

export type DeleteVideoJobComplete = {
  jobId: string;
  roomId: string;
  userId: string;
  clientId: string;
  payload: {
    videoId: string;
  };
};

export type DeleteVideoJobFailed = {
  jobId: string;
  roomId: string;
  userId: string;
  clientId: string;
  payload: {
    videoId: string;
  };
  error: string;
};

export type DeleteVideoJobData = {
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    videoId: string;
  };
};

export type DeleteVideoJobWorkData = {
  jobId: string;
  roomId: string;
  userId: string;
  clientId: string;
  payload: {
    videoId: string;
  };
};
