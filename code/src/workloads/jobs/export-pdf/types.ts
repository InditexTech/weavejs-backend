// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type ExportPdfJobNew = {
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

export type ExportPdfJobProcessing = {
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

export type ExportPdfJobComplete = {
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

export type ExportPdfJobFailed = {
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

export type ExportPdfJobData = {
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

export type ExportPdfJobWorkData = {
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
