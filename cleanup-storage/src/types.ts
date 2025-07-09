// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type ActionConfig = {
  dryRun: boolean;
  storage: {
    accountName: string;
    rooms: {
      containerName: string;
    };
    images: {
      containerName: string;
    };
  };
};
