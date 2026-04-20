// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type ExportFramesToPdfJobNew = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    roomData: string;
    pages: { title: string; nodes: string[] }[];
    options: {
      backgroundColor: string;
      padding: number;
      pixelRatio: number;
    };
    responseType: "base64" | "blob" | "zip";
  };
};

export type ExportFramesToPdfJobProcessing = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    roomData: string;
    pages: { title: string; nodes: string[] }[];
    options: {
      backgroundColor: string;
      padding: number;
      pixelRatio: number;
    };
    responseType: "base64" | "blob" | "zip";
  };
};

export type ExportFramesToPdfJobComplete = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    roomData: string;
    pages: { title: string; nodes: string[] }[];
    options: {
      backgroundColor: string;
      padding: number;
      pixelRatio: number;
    };
    responseType: "base64" | "blob" | "zip";
  };
  exportedPdfId: string;
};

export type ExportFramesToPdfJobFailed = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    roomData: string;
    pages: { title: string; nodes: string[] }[];
    options: {
      backgroundColor: string;
      padding: number;
      pixelRatio: number;
    };
    responseType: "base64" | "blob" | "zip";
  };
  error: string;
};

export type ExportFramesToPdfJobData = {
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    roomData: string;
    pages: { title: string; nodes: string[] }[];
    options: {
      backgroundColor: string;
      padding: number;
      pixelRatio: number;
    };
    responseType: "base64" | "blob" | "zip";
  };
};

export type ExportFramesToPdfJobWorkData = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    roomData: string;
    pages: { title: string; nodes: string[] }[];
    options: {
      backgroundColor: string;
      padding: number;
      pixelRatio: number;
    };
    responseType: "base64" | "blob" | "zip";
  };
};
