// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type ExportToImageWorkerResult =
  | {
      status: "OK";
      fileName: string;
    }
  | {
      status: "KO";
      error: string;
    };

export type ExportPageImageFormat = "image/png" | "image/jpeg";

export type ExportPageImageWorkerPayload = {
  jobId: string;
  roomId: string;
  imageId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any;
  roomData: string;
  options: {
    format: ExportPageImageFormat;
    backgroundColor: string;
    padding: number;
    pixelRatio: number;
    quality: number;
  };
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

export type StateResource = {
  id: string;
  type: string;
  internalId: string;
  url: string;
};
