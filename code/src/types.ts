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
    hubName: string;
    persistFrequencySeg: number;
  };
  storage: {
    accountName: string;
    rooms: {
      containerName: string;
    };
    images: {
      containerName: string;
    };
  };
  ai: {
    password: string;
  };
  azureCsClient: {
    endpoint: string;
    apiKey: string;
    timeoutSecs: number;
  };
  gcpClient: {
    vertexEndpoint: string;
    fluxEndpoint: string;
    timeoutSecs: number;
    configKey: string;
  };
};

export type RoomsEventHandlerOptions = {
  persistFrequencySeg: number;
};
