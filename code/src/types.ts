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
    cleanupRoomsIntervalSeg: number;
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
  liteLLM: {
    endpoint: string;
    apiKey: string;
    timeoutSecs: number;
  };
  features: {
    workloads: boolean;
    threads: boolean;
  };
  database:
    | {
        kind: "connection_string";
        connection: {
          connectionString: string;
        };
        forceSync: boolean;
      }
    | {
        kind: "properties";
        connection: {
          host: string;
          port: number;
          db: string;
          username: string;
          password: string;
          ssl: boolean;
          cloudCredentials: boolean;
        };
        forceSync: boolean;
      };
};

export type RoomsEventHandlerOptions = {
  persistFrequencySeg: number;
};
