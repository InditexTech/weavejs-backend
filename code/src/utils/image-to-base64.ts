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
  const accessToken = await getImageBase64(
    "../../../assets/44d83348-16e9-4b58-9345-67fe4e42e467.png"
  );
  console.log("image Base64", accessToken);
})();
