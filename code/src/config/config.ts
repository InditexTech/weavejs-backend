// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import { ServiceConfig } from "../types.js";
import { DEFAULT_PORT } from "../constants.js";

const databaseWithConnectionStringSchema = z.object({
  kind: z.literal("connection_string"),
  connection: z.object({
    connectionString: z.string().trim(),
  }),
  forceSync: z.boolean().default(false),
});

const databaseDetailedConnectionSchema = z.object({
  kind: z.literal("properties"),
  connection: z.object({
    host: z.string().trim(),
    port: z.number().min(1),
    db: z.string().trim(),
    username: z.string().trim(),
    password: z.string().trim(),
    ssl: z.boolean().default(false),
    cloudCredentials: z.boolean().default(false),
  }),
  forceSync: z.boolean().default(false),
});

const serviceConfigSchema = z.object({
  service: z.object({
    hostname: z
      .string({
        required_error:
          "Define the service hostname on the environment variable HOSTNAME",
      })
      .trim()
      .optional()
      .default("0.0.0.0"),
    port: z
      .number({
        required_error:
          "Define the service port on the environment variable PORT",
      })
      .int({ message: "The post must be an integer" })
      .optional()
      .default(DEFAULT_PORT),
  }),
  pubsub: z.object({
    endpoint: z
      .string({
        required_error:
          "Define the Azure Web PubSub endpoint on the environment variable AZURE_WEB_PUBSUB_ENDPOINT",
      })
      .trim(),
    hubName: z
      .string({
        required_error:
          "Define the Azure Web PubSub hub name on the environment variable AZURE_WEB_PUBSUB_HUB_NAME",
      })
      .trim(),
    persistFrequencySeg: z
      .number({
        required_error:
          "Define the room persistence frequency on the environment variable PERSIST_FREQUENCY_SEG",
      })
      .int({ message: "The persist frequency must be an integer" }),
  }),
  storage: z.object({
    accountName: z
      .string({
        required_error:
          "Define the Azure Storage account name on the environment variable AZURE_STORAGE_ACCOUNT_NAME",
      })
      .trim(),
    rooms: z.object({
      containerName: z
        .string({
          required_error:
            "Define the Azure Blob Storage container name for the rooms data on the environment variable AZURE_STORAGE_ROOMS_CONTAINER_NAME",
        })
        .trim(),
    }),
    images: z.object({
      containerName: z
        .string({
          required_error:
            "Define the Azure Blob Storage container name for the images data on the environment variable AZURE_STORAGE_IMAGES_CONTAINER_NAME",
        })
        .trim(),
    }),
  }),
  ai: z.object({
    password: z
      .string({
        required_error:
          "Define the AI password on the environment variable AI_PASSWORD",
      })
      .trim(),
  }),
  azureCsClient: z.object({
    endpoint: z
      .string({
        required_error:
          "Define the Azure CS endpoint on the environment variable AZURE_CS_ENDPOINT",
      })
      .trim(),
    apiKey: z
      .string({
        required_error:
          "Define the Azure CS api key on the environment variable AZURE_CS_API_KEY",
      })
      .trim(),
    timeoutSecs: z
      .number({
        required_error:
          "Define the Azure CS timeout on the environment variable AZURE_CS_TIMEOUT_SECS",
      })
      .int({ message: "The timeout must be an integer" }),
  }),
  features: z.object({
    workloads: z.boolean().default(false),
    threads: z.boolean().default(false),
  }),
  database: z.discriminatedUnion("kind", [
    databaseWithConnectionStringSchema,
    databaseDetailedConnectionSchema,
  ]),
});

export function getServiceConfig(): ServiceConfig {
  const hostname = process.env.HOSTNAME;
  const port = parseInt(process.env.PORT || `${DEFAULT_PORT}`);

  const service = {
    hostname,
    port,
  };

  const endpoint = process.env.AZURE_WEB_PUBSUB_ENDPOINT;
  const hubName = process.env.AZURE_WEB_PUBSUB_HUB_NAME;
  const persistFrequencySeg = parseInt(
    process.env.PERSIST_FREQUENCY_SEG || "10"
  );

  const pubsub = {
    endpoint,
    hubName,
    persistFrequencySeg,
  };

  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const roomsContainerName = process.env.AZURE_STORAGE_ROOMS_CONTAINER_NAME;
  const imagesContainerName = process.env.AZURE_STORAGE_IMAGES_CONTAINER_NAME;

  const storage = {
    accountName,
    rooms: {
      containerName: roomsContainerName,
    },
    images: {
      containerName: imagesContainerName,
    },
  };

  const azureCsClientApiKey = process.env.AZURE_CS_API_KEY;
  let azureCsTimeoutSecs = 60;
  try {
    azureCsTimeoutSecs = parseInt(process.env.AZURE_CS_TIMEOUT_SECS ?? "60");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    throw new Error("AZURE_CS_TIMEOUT_SECS must be an integer");
  }
  const azureCsClientEndpoint = process.env.AZURE_CS_ENDPOINT;

  const azureCsClient = {
    endpoint: azureCsClientEndpoint,
    apiKey: azureCsClientApiKey,
    timeoutSecs: azureCsTimeoutSecs,
  };

  const aiPassword = process.env.AI_PASSWORD;

  const ai = {
    password: aiPassword,
  };

  const databaseConnectionString = process.env.DATABASE_URL;
  const databaseHost = process.env.DATABASE_HOST;
  const databasePort = parseInt(process.env.DATABASE_PORT || "5434");
  const databaseName = process.env.DATABASE_NAME;
  const databaseUsername = process.env.DATABASE_USERNAME;
  let databasePassword = process.env.DATABASE_PASSWORD;
  const databaseSsl = process.env.DATABASE_SSL === "true";
  const databaseCloudCredentials =
    process.env.DATABASE_CLOUD_CREDENTIALS === "true";

  const databaseForceSync = process.env.DATABASE_FORCE_SYNC === "true";

  if (databaseCloudCredentials) {
    databasePassword = "cloud";
  }

  if (databaseHost && databaseConnectionString) {
    throw new Error(
      "cannot setup DATABASE_URL and DATABASE_HOST, please check"
    );
  }

  if (!databaseHost && !databaseConnectionString) {
    throw new Error(
      "must define a connection to the database, via connection string using DATABASE_URL env var or via detailed configuration using DATABASE_HOST, DATABASE_PORT, DATABASE_NAME, DATABASE_USERNAME, DATABASE_PASSWORD, DATABASE_SSL and DATABASE_CLOUD_CREDENTIALS env vars"
    );
  }

  let databaseConfig = null;
  if (databaseHost) {
    if (!databaseName) {
      throw new Error(
        "must define the database name via DATABASE_NAME env var"
      );
    }

    if (!databaseUsername) {
      throw new Error(
        "must define the database username via DATABASE_USERNAME env var"
      );
    }

    if (!databasePassword && !databaseCloudCredentials) {
      throw new Error(
        "must define the database password via DATABASE_PASSWORD env var"
      );
    }

    databaseConfig = {
      kind: "properties",
      connection: {
        host: databaseHost,
        port: databasePort,
        db: databaseName,
        username: databaseUsername,
        password: databasePassword,
        ssl: databaseSsl,
        cloudCredentials: databaseCloudCredentials,
      },
      forceSync: databaseForceSync,
    };
  }

  if (databaseConnectionString) {
    databaseConfig = {
      kind: "connection_string",
      connection: {
        connectionString: databaseConnectionString,
      },
      forceSync: databaseForceSync,
    };
  }

  const database = databaseConfig;

  const featureWorkloads = process.env.FEATURE_WORKLOADS === "true";
  const featureThreads = process.env.FEATURE_THREADS === "true";

  const serviceConfig = {
    service,
    pubsub,
    storage,
    ai,
    azureCsClient,
    features: {
      workloads: featureWorkloads,
      threads: featureThreads,
    },
    database,
  };

  return serviceConfigSchema.parse(serviceConfig);
}
