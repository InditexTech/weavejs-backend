// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type GeneratePresentationModePageImagePageWorkerResult =
  | {
      status: "OK";
      fileName: string;
    }
  | {
      status: "KO";
      error: string;
    };

export type GeneratePresentationModePageImagePageWorkerPayload = {
  jobId: string;
  pageId: string;
  instanceId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any;
  roomData: string;
  options: {
    padding: number;
    pixelRatio: number;
  };
} & {
  type: "area";
  area: { x: number; y: number; width: number; height: number };
};
