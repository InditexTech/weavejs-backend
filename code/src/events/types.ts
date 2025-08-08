// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type JobComplete<P> = {
  jobId: string;
  clientId: string;
  payload: P;
};

export type JobFailed<P> = {
  jobId: string;
  clientId: string;
  error: string;
  payload?: P;
};
