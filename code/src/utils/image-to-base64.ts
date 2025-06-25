// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");
const path = require("path");

const getImageBase64 = async (imageLoc: string): Promise<string> => {
  const imagePath = path.join(__dirname, imageLoc);
  console.log("imagePath", imagePath);
  const imageBuffer = fs.readFileSync(imagePath);

  const base64String = imageBuffer.toString("base64");

  return base64String;
};

(async () => {
  if (!process.env.IMAGE_PATH) {
    throw new Error("IMAGE_PATH not found in environment variables");
  }

  const accessToken = await getImageBase64(process.env.IMAGE_PATH);
  console.log("image Base64", accessToken);
})();
