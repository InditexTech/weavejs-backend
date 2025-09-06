// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { DefaultAzureCredential } from "@azure/identity";
import { WebPubSubServiceClient } from "@azure/web-pubsub";
import { getServiceConfig } from "../config/config.js";
import { getLogger } from "../logger/logger.js";

let logger = null as unknown as ReturnType<typeof getLogger>;
let serviceClient: WebPubSubServiceClient | null = null;

export const setupCommBus = () => {
  logger = getLogger().child({ module: "comm-bus" });

  logger.info("Setting up");

  const credentials = new DefaultAzureCredential();

  const config = getServiceConfig();

  const endpoint = config.pubsub.endpoint;
  const hubName = config.pubsub.hubName;
  serviceClient = new WebPubSubServiceClient(endpoint, credentials, hubName);

  logger.info("Module ready");
};

export const getCommBus = () => {
  if (!serviceClient) {
    throw new Error("Communication bus not initialized");
  }

  return serviceClient;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const broadcastToRoom = async (roomId: string, message: any) => {
  if (!serviceClient) {
    throw new Error("Communication bus not initialized");
  }

  const group = `${roomId}.commbus`;

  const existGroup = await serviceClient.groupExists(group);

  if (existGroup) {
    await serviceClient.group(group).sendToAll(message);
  }
};
