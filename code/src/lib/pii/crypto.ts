// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";

// Format: enc:<keyId>:<mode>:<iv>:<ciphertext>:<tag> (base64url parts)
//  - mode "r": random IV, used for fields that are never searched.
//  - mode "d": deterministic IV (HMAC of the plaintext), used for fields that
//    must be searchable by equality (email). Same plaintext => same output.
const ENCRYPTED_REGEX =
  /^enc:([A-Za-z0-9_-]+):([rd]):([A-Za-z0-9_-]+):([A-Za-z0-9_-]*):([A-Za-z0-9_-]+)$/;

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;

export type PiiMode = "random" | "deterministic";

export type PiiKeys = {
  // The first key is used to encrypt, all of them to decrypt.
  encryptionKeys: { id: string; key: Buffer }[];
  blindIndexKey: Buffer;
};

const decodeKey = (value: string, name: string): Buffer => {
  const key = Buffer.from(value.trim(), "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(`${name} must be ${KEY_BYTES} bytes encoded as base64`);
  }
  return key;
};

export const parsePiiKeys = (
  encryptionKeys: string | undefined,
  blindIndexKey: string | undefined,
): PiiKeys => {
  if (!encryptionKeys || !blindIndexKey) {
    throw new Error("PII_ENCRYPTION_KEYS and PII_BLIND_INDEX_KEY are required");
  }

  const parsed = encryptionKeys
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separator = entry.indexOf(":");
      const id = entry.slice(0, separator);
      if (separator < 1 || !/^[A-Za-z0-9_-]+$/.test(id)) {
        throw new Error("PII_ENCRYPTION_KEYS entries must be <id>:<base64key>");
      }
      return {
        id,
        key: decodeKey(entry.slice(separator + 1), `PII key "${id}"`),
      };
    });

  if (parsed.length === 0) {
    throw new Error("PII_ENCRYPTION_KEYS has no keys");
  }

  return {
    encryptionKeys: parsed,
    blindIndexKey: decodeKey(blindIndexKey, "PII_BLIND_INDEX_KEY"),
  };
};

const b64 = (buffer: Buffer) => buffer.toString("base64url");

export const isEncrypted = (value: unknown): value is string =>
  typeof value === "string" && ENCRYPTED_REGEX.test(value);

export const createPiiCrypto = (keys: PiiKeys) => {
  const findKey = (id: string) => {
    const entry = keys.encryptionKeys.find((k) => k.id === id);
    if (!entry) {
      throw new Error(`PII encryption key "${id}" not configured`);
    }
    return entry.key;
  };

  const encrypt = (
    plaintext: string,
    context: string,
    mode: PiiMode,
  ): string => {
    const { id, key } = keys.encryptionKeys[0]!;
    const iv =
      mode === "deterministic"
        ? createHmac("sha256", keys.blindIndexKey)
            .update(`${id}|${context}|${plaintext}`)
            .digest()
            .subarray(0, IV_BYTES)
        : randomBytes(IV_BYTES);

    const cipher = createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from(context));
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);

    return `enc:${id}:${mode === "deterministic" ? "d" : "r"}:${b64(iv)}:${b64(ciphertext)}:${b64(cipher.getAuthTag())}`;
  };

  // Values that are not in the encrypted format (legacy plaintext) are
  // returned untouched, so reads keep working while a backfill is running.
  const decrypt = (value: string, context: string): string => {
    const match = ENCRYPTED_REGEX.exec(value);
    if (!match) {
      return value;
    }

    const [, keyId, , iv, ciphertext, tag] = match;
    const decipher = createDecipheriv(
      ALGORITHM,
      findKey(keyId!),
      Buffer.from(iv!, "base64url"),
    );
    decipher.setAAD(Buffer.from(context));
    decipher.setAuthTag(Buffer.from(tag!, "base64url"));

    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext!, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  };

  return { encrypt, decrypt };
};

export type PiiCrypto = ReturnType<typeof createPiiCrypto>;
