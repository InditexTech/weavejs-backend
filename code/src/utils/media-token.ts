// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { createHmac, timingSafeEqual } from "node:crypto";

export const MEDIA_TOKEN_TTL_MS = 5 * 60 * 1000;

const deriveKey = (internalToken: string) =>
  createHmac("sha256", internalToken).update("renderer-media-url").digest();

const sign = (internalToken: string, path: string, exp: string) =>
  createHmac("sha256", deriveKey(internalToken))
    .update(`GET\n${path}\n${exp}`)
    .digest("base64url");

/** Returns `<exp>.<sig>`, valid for a GET of exactly `path` until `exp`. */
export function signMediaToken(
  internalToken: string,
  path: string,
  ttlMs: number = MEDIA_TOKEN_TTL_MS,
  now: number = Date.now(),
): string {
  const exp = String(now + ttlMs);
  return `${exp}.${sign(internalToken, path, exp)}`;
}

export function verifyMediaToken(
  internalToken: string,
  token: unknown,
  path: string,
  now: number = Date.now(),
): boolean {
  if (typeof token !== "string") {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return false;
  }

  const [exp, signature] = parts;
  if (!/^\d{1,16}$/.test(exp) || Number(exp) <= now) {
    return false;
  }

  const expected = Buffer.from(sign(internalToken, path, exp));
  const received = Buffer.from(signature);

  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}
