// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type DeleteTemplateJobNew = {
  jobId: string;
  roomId: string;
  userId: string;
  clientId: string;
  payload: {
    templateId: string;
  };
};

export type DeleteTemplateJobProcessing = {
  jobId: string;
  roomId: string;
  userId: string;
  clientId: string;
  payload: {
    templateId: string;
  };
};

export type DeleteTemplateJobComplete = {
  jobId: string;
  roomId: string;
  userId: string;
  clientId: string;
  payload: {
    templateId: string;
  };
};

export type DeleteTemplateJobFailed = {
  jobId: string;
  roomId: string;
  userId: string;
  clientId: string;
  payload: {
    templateId: string;
  };
  error: string;
};

export type DeleteTemplateJobData = {
  clientId: string;
  roomId: string;
  userId: string;
  payload: {
    templateId: string;
  };
};

export type DeleteTemplateJobWorkData = {
  jobId: string;
  roomId: string;
  userId: string;
  clientId: string;
  payload: {
    templateId: string;
  };
};
