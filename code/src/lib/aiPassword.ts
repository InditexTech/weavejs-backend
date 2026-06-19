// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { createHash, timingSafeEqual } from "crypto";

/**
 * Compares a provided AI password against the expected value using a
 * constant-time algorithm to prevent timing attacks.
 *
 * Both values are hashed with SHA-256 before comparison so that
 * `timingSafeEqual` always operates on fixed-length buffers regardless of
 * the input lengths.
 */
export function verifyAIPassword(
  provided: string | string[] | undefined,
  expected: string | undefined
): boolean {
  if (typeof provided !== "string" || typeof expected !== "string") {
    return false;
  }

  const providedHash = createHash("sha256").update(provided).digest();
  const expectedHash = createHash("sha256").update(expected).digest();

  return timingSafeEqual(providedHash, expectedHash);
}
