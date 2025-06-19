// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import { ServiceConfig } from "../types.js";
import { DEFAULT_PORT } from "../constants.js";

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
    key: z
      .string({
        required_error:
          "Define the Azure Web PubSub key on the environment variable AZURE_WEB_PUBSUB_KEY",
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
    connectionString: z
      .string({
        required_error:
          "Define the Azure Blob Storage connection string on the environment variable AZURE_STORAGE_CONNECTION_STRING",
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
  gcpClient: z.object({
    endpoint: z
      .string({
        required_error:
          "Define the GCP Endpoint on the environment variable GCP_ENDPOINT",
      })
      .trim(),
    configKey: z
      .string({
        required_error:
          "Define the GCP client key on the environment variable GCP_CLIENT_CONFIG_KEY",
      })
      .trim(),
    timeoutSecs: z
      .number({
        required_error:
          "Define the GCP timeout on the environment variable GCP_TIMEOUT_SECS",
      })
      .int({ message: "The timeout must be an integer" }),
  }),
});

export function getServiceConfig(): ServiceConfig {
  const hostname = process.env.HOSTNAME;
  const port = parseInt(process.env.PORT || `${DEFAULT_PORT}`);

  const service = {
    hostname,
    port,
  };

  const endpoint = process.env.AZURE_WEB_PUBSUB_ENDPOINT;
  const key = process.env.AZURE_WEB_PUBSUB_KEY;
  const hubName = process.env.AZURE_WEB_PUBSUB_HUB_NAME;
  const persistFrequencySeg = parseInt(
    process.env.PERSIST_FREQUENCY_SEG || "10"
  );

  const pubsub = {
    endpoint,
    key,
    hubName,
    persistFrequencySeg,
  };

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const roomsContainerName = process.env.AZURE_STORAGE_ROOMS_CONTAINER_NAME;
  const imagesContainerName = process.env.AZURE_STORAGE_IMAGES_CONTAINER_NAME;

  const storage = {
    connectionString,
    rooms: {
      containerName: roomsContainerName,
    },
    images: {
      containerName: imagesContainerName,
    },
  };

  console.log(process.env);

  const gcpClientConfigKey = process.env.GCP_CLIENT_CONFIG_KEY;

  const gpcEndpoint = process.env.GCP_ENDPOINT;
  let timeoutSecs = 60;
  try {
    timeoutSecs = parseInt(process.env.GCP_TIMEOUT_SECS ?? "60");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    throw new Error("GCP_TIMEOUT_SECS must be an integer");
  }

  const gcpClient = {
    endpoint: gpcEndpoint,
    timeoutSecs,
    configKey: gcpClientConfigKey,
  };

  const aiPassword = process.env.AI_PASSWORD;

  const ai = {
    password: aiPassword,
  };

  const serviceConfig = { service, pubsub, storage, ai, gcpClient };

  return serviceConfigSchema.parse(serviceConfig);
}
