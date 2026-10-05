// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP } from "node:net";
import type { LookupFunction } from "node:net";

export const DESTINATION_NOT_ALLOWED = "Destination not allowed";

const blockList = new BlockList();

// Deny-list ranges written as parts, they are never connected to.
const BLOCKED_V4: [number[], number][] = [
  [[0, 0, 0, 0], 8], // "this" network
  [[10, 0, 0, 0], 8], // RFC 1918
  [[100, 64, 0, 0], 10], // CGNAT
  [[127, 0, 0, 0], 8], // loopback
  [[169, 254, 0, 0], 16], // link-local / cloud metadata
  [[172, 16, 0, 0], 12], // RFC 1918
  [[192, 0, 0, 0], 24], // IETF protocol assignments
  [[192, 0, 2, 0], 24], // documentation
  [[192, 168, 0, 0], 16], // RFC 1918
  [[198, 18, 0, 0], 15], // benchmarking
  [[198, 51, 100, 0], 24], // documentation
  [[203, 0, 113, 0], 24], // documentation
  [[224, 0, 0, 0], 4], // multicast
  [[240, 0, 0, 0], 4], // reserved + broadcast
];

// Leading hextets of each range, the rest is zero.
const BLOCKED_V6: [number[], number][] = [
  [[], 96], // unspecified, loopback, IPv4-compatible
  [[0x64, 0xff9b], 96], // NAT64
  [[0x100], 64], // discard-only
  [[0x2001, 0xdb8], 32], // documentation
  [[0xfc00], 7], // unique-local
  [[0xfe80], 10], // link-local
  [[0xff00], 8], // multicast
];

for (const [octets, prefix] of BLOCKED_V4) {
  blockList.addSubnet(octets.join("."), prefix, "ipv4");
}

for (const [hextets, prefix] of BLOCKED_V6) {
  const padded = [...hextets, ...new Array<number>(8 - hextets.length).fill(0)];
  blockList.addSubnet(
    padded.map((h) => h.toString(16)).join(":"),
    prefix,
    "ipv6",
  );
}

const MAPPED_V6 = /^(?:0{0,4}:){2,5}ffff:(.+)$/i;

const mappedToIpv4 = (address: string): string | null => {
  const match = MAPPED_V6.exec(address);
  if (!match) return null;

  const tail = match[1];
  if (isIP(tail) === 4) return tail;

  const hextets = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(tail);
  if (!hextets) return null;

  const hi = Number.parseInt(hextets[1], 16);
  const lo = Number.parseInt(hextets[2], 16);
  return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
};

/** Returns true for any address that is not a public unicast destination. Unparseable input is treated as blocked. */
export function isBlockedIp(address: string): boolean {
  const ip = address.replace(/^\[|\]$/g, "").split("%")[0];
  const family = isIP(ip);

  if (family === 0) {
    return true;
  }

  if (family === 6) {
    const mapped = mappedToIpv4(ip);
    if (mapped) {
      return blockList.check(mapped, "ipv4");
    }
    return blockList.check(ip, "ipv6");
  }

  return blockList.check(ip, "ipv4");
}

/**
 * Throws if the URL is unsafe to fetch server-side. Checks scheme and IP
 * literals only; hostnames are validated at connection time by safeFetchBuffer.
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

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error(DESTINATION_NOT_ALLOWED);
  }

  if (isIP(hostname) !== 0 && isBlockedIp(hostname)) {
    throw new Error(DESTINATION_NOT_ALLOWED);
  }
}

// Resolves the host and hands the socket only validated addresses, so the
// connection cannot use an address that was not checked.
const validatingLookup: LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
    if (
      err ||
      addresses.length === 0 ||
      addresses.some((a) => isBlockedIp(a.address))
    ) {
      callback(new Error(DESTINATION_NOT_ALLOWED), "", 0);
      return;
    }

    if (options.all) {
      callback(null, addresses);
      return;
    }

    callback(null, addresses[0].address, addresses[0].family);
  });
};

/**
 * Fetches a user-supplied URL without following redirects, connecting only to
 * validated public addresses, with a size cap and timeout.
 */
export function safeFetchBuffer(
  urlString: string,
  { maxBytes, timeoutMs = 10_000 }: { maxBytes: number; timeoutMs?: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      assertSafeUrl(urlString);
    } catch (ex) {
      reject(ex);
      return;
    }

    const url = new URL(urlString);
    const client = url.protocol === "https:" ? https : http;

    const req = client.request(
      {
        protocol: url.protocol,
        hostname: url.hostname.replace(/^\[|\]$/g, ""),
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        lookup: validatingLookup,
      },
      (res) => {
        const status = res.statusCode ?? 0;

        if (status < 200 || status >= 300) {
          res.resume();
          reject(new Error(`Failed to fetch image: ${status}`));
          return;
        }

        const contentLength = Number(res.headers["content-length"]);
        if (!Number.isNaN(contentLength) && contentLength > maxBytes) {
          res.resume();
          reject(
            new Error(
              `Image response too large: ${contentLength} bytes (max ${maxBytes})`,
            ),
          );
          return;
        }

        const chunks: Buffer[] = [];
        let total = 0;

        res.on("data", (chunk: Buffer) => {
          total += chunk.length;
          if (total > maxBytes) {
            req.destroy(
              new Error(
                `Image response exceeds size limit of ${maxBytes} bytes`,
              ),
            );
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      },
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("Request timed out"));
    });
    req.on("error", reject);
    req.end();
  });
}
