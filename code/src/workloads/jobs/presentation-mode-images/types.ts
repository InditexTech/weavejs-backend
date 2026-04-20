// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type PresentationModeImagesJobNew = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    presentationModeId: string;
    roomId: string;
    type: "area";
    area: { x: number; y: number; width: number; height: number };
    options: {
      padding: number;
      pixelRatio: number;
    };
  };
};

export type PresentationModeImagesJobProcessing = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    presentationModeId: string;
    roomId: string;
    type: "area";
    area: { x: number; y: number; width: number; height: number };
    options: {
      padding: number;
      pixelRatio: number;
    };
  };
};

export type PresentationModeImagesJobComplete = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    presentationModeId: string;
    roomId: string;
    type: "area";
    area: { x: number; y: number; width: number; height: number };
    options: {
      padding: number;
      pixelRatio: number;
    };
  };
  presentationModeId: string;
};

export type PresentationModeImagesJobFailed = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    presentationModeId: string;
    roomId: string;
    type: "area";
    area: { x: number; y: number; width: number; height: number };
    options: {
      padding: number;
      pixelRatio: number;
    };
  };
  error: string;
};

export type PresentationModeImagesJobData = {
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    presentationModeId: string;
    roomId: string;
    type: "area";
    area: { x: number; y: number; width: number; height: number };
    options: {
      padding: number;
      pixelRatio: number;
    };
  };
};

export type PresentationModeImagesJobWorkData = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    presentationModeId: string;
    roomId: string;
    type: "area";
    area: { x: number; y: number; width: number; height: number };
    options: {
      padding: number;
      pixelRatio: number;
    };
  };
};
