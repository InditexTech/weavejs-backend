// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type ServiceConfig = {
  service: {
    hostname: string;
    port: number;
  };
  pubsub: {
    endpoint: string;
    key: string;
    hubName: string;
    validOrigin: string;
    persistFrequencySeg: number;
  };
  storage: {
    connectionString: string;
    rooms: {
      containerName: string;
    };
    images: {
      containerName: string;
    };
  };
};

export type RoomsEventHandlerOptions = {
  persistFrequencySeg: number;
};
