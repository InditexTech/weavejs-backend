// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type EditFallbackImageJobNew = {
  jobId: string;
  roomId: string;
  userId: string;
  clientId: string;
  payload:
    | {
        kind: "add";
        imageId: string;
        dataURL: string;
      }
    | {
        kind: "delete";
        imageId: string;
      };
};

export type EditFallbackImageJobProcessing = {
  jobId: string;
  roomId: string;
  userId: string;
  clientId: string;
  payload:
    | {
        kind: "add";
        imageId: string;
        dataURL: string;
      }
    | {
        kind: "delete";
        imageId: string;
      };
};

export type EditFallbackImageJobComplete = {
  jobId: string;
  roomId: string;
  userId: string;
  clientId: string;
  payload:
    | {
        kind: "add";
        imageId: string;
        dataURL: string;
      }
    | {
        kind: "delete";
        imageId: string;
      };
};

export type EditFallbackImageJobFailed = {
  jobId: string;
  roomId: string;
  userId: string;
  clientId: string;
  payload:
    | {
        kind: "add";
        imageId: string;
        dataURL: string;
      }
    | {
        kind: "delete";
        imageId: string;
      };
  error: string;
};

export type EditFallbackImageJobData = {
  clientId: string;
  roomId: string;
  userId: string;
  payload:
    | {
        kind: "add";
        imageId: string;
        dataURL: string;
      }
    | {
        kind: "delete";
        imageId: string;
      };
};

export type EditFallbackImageJobWorkData = {
  jobId: string;
  roomId: string;
  userId: string;
  clientId: string;
  payload:
    | {
        kind: "add";
        imageId: string;
        dataURL: string;
      }
    | {
        kind: "delete";
        imageId: string;
      };
};
