// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { createPiiCrypto, parsePiiKeys, type PiiCrypto } from "./crypto.js";

let instance: PiiCrypto | null = null;

export const getPiiCrypto = (): PiiCrypto => {
  if (!instance) {
    instance = createPiiCrypto(
      parsePiiKeys(
        process.env.PII_ENCRYPTION_KEYS,
        process.env.PII_BLIND_INDEX_KEY,
      ),
    );
  }
  return instance;
};

// Rollout switch: writes stay plaintext until the backfill has been run.
export const isPiiEncryptionEnabled = () =>
  process.env.PII_ENCRYPTION_ENABLED === "true";
