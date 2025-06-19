// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { JWT } from "google-auth-library";
import { getServiceConfig } from "../config/config.js";

let gcpClient: JWT | null = null;

export const getGcpClient = () => {
  if (gcpClient) {
    return gcpClient;
  }

  const config = getServiceConfig();

  const configKey = config.gcpClient.configKey;
  const configKeyJson = JSON.parse(configKey);

  const client = new JWT({
    email: configKeyJson.client_email,
    key: configKeyJson.private_key,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  gcpClient = client;

  return gcpClient;
};
