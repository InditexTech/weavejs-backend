// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type ExportToIPdfWorkerResult =
  | {
      status: "OK";
      fileName: string;
    }
  | {
      status: "KO";
      error: string;
    };

export type ExportFramesToPdfWorkerPayload = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any;
  roomId: string;
  pdfId: string;
  roomData: string;
  pages: { title: string; nodes: string[] }[];
  options: {
    backgroundColor: string;
    padding: number;
    pixelRatio: number;
  };
};
