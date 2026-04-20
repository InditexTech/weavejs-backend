// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { DefaultAzureCredential } from "@azure/identity";
import { WebPubSubServiceClient, AzureKeyCredential } from "@azure/web-pubsub";
import { getServiceConfig } from "../config/config.js";
import { getLogger } from "../logger/logger.js";

let logger = null as unknown as ReturnType<typeof getLogger>;
let serviceClient: WebPubSubServiceClient | null = null;

export const setupCommBus = () => {
  logger = getLogger().child({ module: "comm-bus" });

  logger.info("Setting up");

  const config = getServiceConfig();

  const endpoint = config.pubsub.endpoint;
  const key = config.pubsub.key;
  const hubName = config.pubsub.hubName;

  if (typeof key !== "undefined") {
    const credentials = new AzureKeyCredential(key);
    serviceClient = new WebPubSubServiceClient(endpoint, credentials, hubName);
  } else {
    const credentials = new DefaultAzureCredential();
    serviceClient = new WebPubSubServiceClient(endpoint, credentials, hubName);
  }

  logger.info("Module ready");
};

export const getCommBus = () => {
  if (!serviceClient) {
    throw new Error("Communication bus not initialized");
  }

  return serviceClient;
};

export const closeClientConnection = (connectionId: string) => {
  if (!serviceClient) {
    throw new Error("Communication bus not initialized");
  }

  serviceClient.closeConnection(connectionId);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const broadcastToGlobal = async (message: any) => {
  if (!serviceClient) {
    throw new Error("Communication bus not initialized");
  }
  const group = `weavejsGlobal.commbus`;

  try {
    const existGroup = await serviceClient.groupExists(group);

    if (existGroup) {
      await serviceClient.group(group).sendToAll(message);
    }
  } catch (error) {
    logger.error({ roomId: group, error }, "Error broadcasting to room");
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const broadcastToRoom = async (roomId: string, message: any) => {
  if (!serviceClient) {
    throw new Error("Communication bus not initialized");
  }

  try {
    const group = `${roomId}.commbus`;

    const existGroup = await serviceClient.groupExists(group);

    if (existGroup) {
      await serviceClient.group(group).sendToAll(message);
    }
  } catch (error) {
    logger.error({ roomId, error }, "Error broadcasting to room");
  }
};
