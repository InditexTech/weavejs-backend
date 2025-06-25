// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { JWT } from "google-auth-library";

const getAccessToken = async () => {
  const keyJson = await import("./itx-moyaint-pre.json", {
    assert: { type: "json" },
  });

  const client = new JWT({
    email: keyJson.default.client_email,
    key: keyJson.default.private_key,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  return client.getAccessToken();
};

(async () => {
  const accessToken = await getAccessToken();
  console.log("accessToken", accessToken);
})();
