// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import fs from "fs";
import clipboard from "clipboardy";

const getImageBase64 = async (imagePath: string): Promise<string> => {
  const imageBuffer = fs.readFileSync(imagePath);

  const base64String = imageBuffer.toString("base64");

  return base64String;
};

(async () => {
  if (!process.env.IMAGE_PATH) {
    throw new Error("IMAGE_PATH not found in environment variables");
  }

  const imageBase64 = await getImageBase64(process.env.IMAGE_PATH);
  await clipboard.write(imageBase64);
  console.log("Image copied to clipboard");
})();
