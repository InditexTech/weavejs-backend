// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import fs from "fs";
import path from "path";

export async function streamToBuffer(
  readableStream: NodeJS.ReadableStream
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    readableStream.on<Uint8Array>("data", (data: Uint8Array) => {
      chunks.push(data);
    });
    readableStream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on("error", reject);
  });
}

export const keyEscaper = (key: any) => {
  const keyString = JSON.stringify(key);
  return keyString;
};

export const saveBase64ToFile = async (
  base64String: string,
  filePath: string
): Promise<void> => {
  const buffer = Buffer.from(base64String, "base64");
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, buffer);
};
