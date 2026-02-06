// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type ExportImageJobNew = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    roomData: string;
    nodes: string[];
    options: {
      format: "image/png" | "image/jpeg";
      backgroundColor: string;
      padding: number;
      pixelRatio: number;
      quality: number;
    };
    responseType: "base64" | "blob" | "zip";
  };
};

export type ExportImageJobProcessing = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    roomData: string;
    nodes: string[];
    options: {
      format: "image/png" | "image/jpeg";
      backgroundColor: string;
      padding: number;
      pixelRatio: number;
      quality: number;
    };
    responseType: "base64" | "blob" | "zip";
  };
};

export type ExportImageJobComplete = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    roomData: string;
    nodes: string[];
    options: {
      format: "image/png" | "image/jpeg";
      backgroundColor: string;
      padding: number;
      pixelRatio: number;
      quality: number;
    };
    responseType: "base64" | "blob" | "zip";
  };
  exportedImageId: string;
};

export type ExportImageJobFailed = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    roomData: string;
    nodes: string[];
    options: {
      format: "image/png" | "image/jpeg";
      backgroundColor: string;
      padding: number;
      pixelRatio: number;
      quality: number;
    };
    responseType: "base64" | "blob" | "zip";
  };
  error: string;
};

export type ExportImageJobData = {
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    roomData: string;
    nodes: string[];
    options: {
      format: "image/png" | "image/jpeg";
      backgroundColor: string;
      padding: number;
      pixelRatio: number;
      quality: number;
    };
    responseType: "base64" | "blob" | "zip";
  };
};

export type ExportImageJobWorkData = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    roomData: string;
    nodes: string[];
    options: {
      format: "image/png" | "image/jpeg";
      backgroundColor: string;
      padding: number;
      pixelRatio: number;
      quality: number;
    };
    responseType: "base64" | "blob" | "zip";
  };
};
