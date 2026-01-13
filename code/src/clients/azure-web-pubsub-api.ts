// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { getServiceConfig } from "../config/config.js";
import { getAzureWebPubSubCredentialsToken } from "../utils.js";

const AZURE_WEB_PUBSUB_CLIENT_TIMEOUT = 30; // seconds

export const listGroupConnections = async (roomId: string) => {
  let connections: string[] = [];

  try {
    const config = getServiceConfig();

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      AZURE_WEB_PUBSUB_CLIENT_TIMEOUT * 1000
    );

    const token = await getAzureWebPubSubCredentialsToken();
    const endpoint = `${config.pubsub.endpoint}/api/hubs/${config.pubsub.hubName}/groups/${roomId}/connections?api-version=2024-12-01`;
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token.token}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error("Error listing group connections");
    }

    const jsonData = await response.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connections = jsonData.value.map((conn: any) => conn.connectionId);
  } catch (error) {
    console.error("Error listing group connections:", error);
    connections = [];
  }

  return connections;
};
