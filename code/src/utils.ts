// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import * as Y from "yjs";
import fs from "fs";
import path from "path";
import { type AccessToken, DefaultAzureCredential } from "@azure/identity";

export async function streamToBuffer(
  readableStream: NodeJS.ReadableStream,
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

export const keyEscaper = (key: unknown) => {
  const keyString = JSON.stringify(key);
  return keyString;
};

export const saveBase64ToFile = async (
  base64String: string,
  filePath: string,
): Promise<void> => {
  // Define the safe root directory: <projectRoot>/temp
  const safeRoot = path.resolve(process.cwd(), "temp") + path.sep;
  const absFilePath = path.resolve(filePath);
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

/**
 * Throws if the given URL is unsafe to fetch server-side (SSRF guard).
 * Blocks non-http/https schemes and private/reserved IP ranges including
 * loopback, RFC 1918 ranges, link-local (169.254.x.x / AWS IMDS), and
 * carrier-grade NAT (100.64.x.x).
 */
export function assertSafeUrl(urlString: string): void {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error(`Invalid URL: ${urlString}`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Blocked URL scheme: ${url.protocol}`);
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, ""); // strip IPv6 brackets

  // Loopback / localhost
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.startsWith("127.")
  ) {
    throw new Error(`Blocked loopback address: ${hostname}`);
  }

  // Private/reserved IPv4 ranges
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    const isPrivate =
      a === 0 || // 0.0.0.0/8
      a === 10 || // 10.0.0.0/8 RFC 1918
      (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 CGNAT
      (a === 169 && b === 254) || // 169.254.0.0/16 link-local / AWS IMDS
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 RFC 1918
      (a === 192 && b === 168) || // 192.168.0.0/16 RFC 1918
      a >= 240; // 240.0.0.0/4 reserved

    if (isPrivate) {
      throw new Error(`Blocked private/reserved IP address: ${hostname}`);
    }
  }
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

export function getStateAsJson(actualState: Uint8Array<ArrayBufferLike>) {
  const document = new Y.Doc();
  Y.applyUpdate(document, actualState);
  const actualStateString = JSON.stringify(document.getMap("weave").toJSON());
  const actualStateJson = JSON.parse(actualStateString);
  return { document, actualStateJson };
}

export function jsonToUint8Array(
  json: Record<string, unknown>,
): Uint8Array<ArrayBufferLike> {
  const doc = new Y.Doc();

  const weave = doc.getMap("weave");

  Object.entries(json).forEach(([key, value]) => {
    weave.set(key, value);
  });

  const update = Y.encodeStateAsUpdate(doc);

  return Buffer.from(update);
}
