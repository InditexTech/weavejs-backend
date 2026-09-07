// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { timingSafeEqual } from "crypto";

// Upper bound on the byte length considered for comparison. Generous for any
// realistic shared-secret password while keeping the encoded buffers small
// and fixed-size.
const MAX_COMPARISON_BYTES = 512;

/**
 * Encodes a string as a fixed-size buffer: a 4-byte big-endian length prefix
 * followed by its UTF-8 bytes, zero-padded (or truncated) to
 * MAX_COMPARISON_BYTES.
 *
 * This lets `timingSafeEqual` compare the values directly - no hashing
 * involved - while the length prefix ensures two different-length inputs
 * can never be considered equal just because their zero-padded tails
 * happen to match.
 */
function toFixedSizeBuffer(input: string): Buffer {
  const raw = Buffer.from(input, "utf8");
  const length = Math.min(raw.length, MAX_COMPARISON_BYTES);

  const encoded = Buffer.alloc(4 + MAX_COMPARISON_BYTES);
  encoded.writeUInt32BE(length, 0);
  raw.copy(encoded, 4, 0, length);

  return encoded;
}

/**
 * Compares a provided AI password against the expected value using a
 * constant-time algorithm to prevent timing attacks.
 *
 * Both values are encoded to fixed-length buffers before comparison (see
 * `toFixedSizeBuffer`) so that `timingSafeEqual` always operates on
 * equal-length buffers regardless of the input lengths. No hashing is
 * involved: this compares a shared secret against itself, it does not hash
 * and store a password, so a cryptographic hash function is neither
 * required nor appropriate here.
 */
export function verifyAIPassword(
  provided: string | string[] | undefined,
  expected: string | undefined
): boolean {
  if (typeof provided !== "string" || typeof expected !== "string") {
    return false;
  }

  return timingSafeEqual(
    toFixedSizeBuffer(provided),
    toFixedSizeBuffer(expected)
  );
}
