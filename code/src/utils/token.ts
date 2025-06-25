// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { JWT } from "google-auth-library";

const getAccessToken = async () => {
  if (!process.env.ACCESS_KEY_JSON) {
    throw new Error("ACCESS_KEY_JSON not found in environment variables");
  }

  const config = JSON.parse(process.env.ACCESS_KEY_JSON);

  const client = new JWT({
    email: config.client_email,
    key: config.private_key,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  return client.getAccessToken();
};

(async () => {
  const accessToken = await getAccessToken();
  console.log("accessToken", accessToken);
})();
