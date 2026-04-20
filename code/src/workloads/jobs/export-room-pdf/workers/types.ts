// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { PageAttributes } from "@/database/models/page.js";

export type ExportRoomToPdfWorkerResult =
  | {
      status: "OK";
      fileName: string;
    }
  | {
      status: "KO";
      error: string;
    };

export type ExportRoomToPdfWorkerPayload = {
  jobId: string;
  roomId: string;
  pdfId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any;
  pages: {
    pageInfo: PageAttributes;
    imageURL: string;
  }[];
};

export type ExportToImagePageWorkerResult =
  | {
      status: "OK";
      fileName: string;
    }
  | {
      status: "KO";
      error: string;
    };

export type ExportToImagePageWorkerPayload = {
  jobId: string;
  roomId: string;
  imageId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any;
  roomData: string;
  options: {
    padding: number;
    pixelRatio: number;
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

export type ExportToIPdfWorkerResult =
  | {
      status: "OK";
      fileName: string;
    }
  | {
      status: "KO";
      error: string;
    };

export type ExportToIPdfWorkerPayload = {
  jobId: string;
  roomId: string;
  imageId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any;
  roomData: string;
  options: {
    padding: number;
    pixelRatio: number;
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
