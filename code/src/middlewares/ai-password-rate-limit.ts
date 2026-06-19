// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response, NextFunction } from "express";

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodically remove expired buckets to prevent unbounded memory growth.
const CLEANUP_INTERVAL_MS = WINDOW_MS;
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) {
      buckets.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS).unref();

/**
 * Rate-limits the AI password validation endpoint to prevent online
 * brute-force guessing of the shared AI password.
 *
 * Allows at most MAX_ATTEMPTS requests per IP within a sliding WINDOW_MS
 * window, then responds with 429 until the window expires.
 *
 * NOTE: This implementation is in-process and resets on restart. For
 * multi-instance deployments a shared store (e.g. Redis) should be used.
 */
export function aiPasswordRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() ??
    req.socket.remoteAddress ??
    "unknown";

  const now = Date.now();
  const existing = buckets.get(ip);

  if (!existing || now >= existing.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  existing.count += 1;

  if (existing.count > MAX_ATTEMPTS) {
    const retryAfterSecs = Math.ceil((existing.resetAt - now) / 1000);
    res.setHeader("Retry-After", String(retryAfterSecs));
    res.status(429).json({
      status: "KO",
      message: "Too many attempts. Please try again later.",
    });
    return;
  }

  next();
}
