// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type ExportRoomToPdfJobNew = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    roomId: string;
    type: "area";
    area: { x: number; y: number; width: number; height: number };
    options: {
      padding: number;
      pixelRatio: number;
    };
    responseType: "base64" | "blob" | "zip";
  };
};

export type ExportRoomToPdfJobProcessing = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    roomId: string;
    type: "area";
    area: { x: number; y: number; width: number; height: number };
    options: {
      padding: number;
      pixelRatio: number;
    };
    responseType: "base64" | "blob" | "zip";
  };
};

export type ExportRoomToPdfJobComplete = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    roomId: string;
    type: "area";
    area: { x: number; y: number; width: number; height: number };
    options: {
      padding: number;
      pixelRatio: number;
    };
    responseType: "base64" | "blob" | "zip";
  };
  exportedPdfId: string;
};

export type ExportRoomToPdfJobFailed = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    roomId: string;
    type: "area";
    area: { x: number; y: number; width: number; height: number };
    options: {
      padding: number;
      pixelRatio: number;
    };
    responseType: "base64" | "blob" | "zip";
  };
  error: string;
};

export type ExportRoomToPdfJobData = {
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    roomId: string;
    type: "area";
    area: { x: number; y: number; width: number; height: number };
    options: {
      padding: number;
      pixelRatio: number;
    };
    responseType: "base64" | "blob" | "zip";
  };
};

export type ExportRoomToPdfJobWorkData = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    roomId: string;
    type: "area";
    area: { x: number; y: number; width: number; height: number };
    options: {
      padding: number;
      pixelRatio: number;
    };
    responseType: "base64" | "blob" | "zip";
  };
};
