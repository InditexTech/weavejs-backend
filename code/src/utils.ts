// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import fs from "fs";
import path from "path";
import { AccessToken, DefaultAzureCredential } from "@azure/identity";

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
  // Define the safe root directory: <projectRoot>/temp
  const safeRoot = path.resolve(process.cwd(), "temp") + path.sep;
  // Resolve the absolute file path
  const absFilePath = path.resolve(filePath);
  // Ensure the target path is within the safe root
  if (!absFilePath.startsWith(safeRoot)) {
    throw new Error("Invalid or unsafe file path detected");
  }
  const buffer = Buffer.from(base64String, "base64");
  await fs.promises.mkdir(path.dirname(absFilePath), { recursive: true });
  await fs.promises.writeFile(absFilePath, buffer);
};

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function getAzureWebPubSubCredentialsToken(): Promise<AccessToken> {
  const credential = new DefaultAzureCredential();
  const scope = "https://webpubsub.azure.com/.default";
  const token = await credential.getToken(scope, {});
  return token;
}

export async function getDatabaseCloudCredentialsToken(): Promise<AccessToken> {
  const credential = new DefaultAzureCredential();
  const scope = "https://ossrdbms-aad.database.windows.net/.default";
  const token = await credential.getToken(scope, {});
  return token;
}

export function isAbsoluteUrl(url: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url);
}

export function stripOrigin(url: string): string {
  const parsedUrl = new URL(url);
  return parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
}

export function parseDataURL(dataUrl: string): {
  mimeType: string;
  base64: string;
} {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) {
    throw new Error("Invalid Data URL");
  }
  const mimeType = match[1];
  const base64 = match[2];
  return { mimeType, base64 };
}
