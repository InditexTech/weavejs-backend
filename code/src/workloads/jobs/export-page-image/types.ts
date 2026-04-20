// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type ExportPageToImageJobNew = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    roomData: string;
    options: {
      format: "image/png" | "image/jpeg" | "image/webp";
      backgroundColor: string;
      padding: number;
      pixelRatio: number;
      quality: number;
    };
    responseType: "base64" | "blob" | "zip";
  } & (
    | {
        type: "nodes";
        nodes: string[];
      }
    | {
        type: "area";
        area: { x: number; y: number; width: number; height: number };
      }
  );
};

export type ExportPageToImageJobProcessing = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    roomData: string;
    options: {
      format: "image/png" | "image/jpeg" | "image/webp";
      backgroundColor: string;
      padding: number;
      pixelRatio: number;
      quality: number;
    };
    responseType: "base64" | "blob" | "zip";
  } & (
    | {
        type: "nodes";
        nodes: string[];
      }
    | {
        type: "area";
        area: { x: number; y: number; width: number; height: number };
      }
  );
};

export type ExportPageToImageJobComplete = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    roomData: string;
    options: {
      format: "image/png" | "image/jpeg" | "image/webp";
      backgroundColor: string;
      padding: number;
      pixelRatio: number;
      quality: number;
    };
    responseType: "base64" | "blob" | "zip";
  } & (
    | {
        type: "nodes";
        nodes: string[];
      }
    | {
        type: "area";
        area: { x: number; y: number; width: number; height: number };
      }
  );
  exportedImageId: string;
};

export type ExportPageToImageJobFailed = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    roomData: string;
    options: {
      format: "image/png" | "image/jpeg" | "image/webp";
      backgroundColor: string;
      padding: number;
      pixelRatio: number;
      quality: number;
    };
    responseType: "base64" | "blob" | "zip";
  } & (
    | {
        type: "nodes";
        nodes: string[];
      }
    | {
        type: "area";
        area: { x: number; y: number; width: number; height: number };
      }
  );
  error: string;
};

export type ExportPageToImageJobData = {
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    roomData: string;
    options: {
      format: "image/png" | "image/jpeg" | "image/webp";
      backgroundColor: string;
      padding: number;
      pixelRatio: number;
      quality: number;
    };
    responseType: "base64" | "blob" | "zip";
  } & (
    | {
        type: "nodes";
        nodes: string[];
      }
    | {
        type: "area";
        area: { x: number; y: number; width: number; height: number };
      }
  );
};

export type ExportPageToImageJobWorkData = {
  jobId: string;
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    roomData: string;
    options: {
      format: "image/png" | "image/jpeg" | "image/webp";
      backgroundColor: string;
      padding: number;
      pixelRatio: number;
      quality: number;
    };
    responseType: "base64" | "blob" | "zip";
  } & (
    | {
        type: "nodes";
        nodes: string[];
      }
    | {
        type: "area";
        area: { x: number; y: number; width: number; height: number };
      }
  );
};
