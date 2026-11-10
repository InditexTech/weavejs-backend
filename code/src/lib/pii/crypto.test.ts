// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createPiiCrypto, isEncrypted, parsePiiKeys } from "./crypto.ts";

const b64Key = () => randomBytes(32).toString("base64");

const build = (encryptionKeys = `v1:${b64Key()}`) =>
  createPiiCrypto(parsePiiKeys(encryptionKeys, b64Key()));

test("random mode round-trips and is non deterministic", () => {
  const pii = build();
  const a = pii.encrypt("Jesús Piñeiro", "user.name", "random");
  const b = pii.encrypt("Jesús Piñeiro", "user.name", "random");
  assert.notEqual(a, b);
  assert.ok(isEncrypted(a));
  assert.equal(pii.decrypt(a, "user.name"), "Jesús Piñeiro");
});

test("deterministic mode is stable and round-trips", () => {
  const pii = build();
  const a = pii.encrypt("a@b.com", "user.email", "deterministic");
  const b = pii.encrypt("a@b.com", "user.email", "deterministic");
  const c = pii.encrypt("c@b.com", "user.email", "deterministic");
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.equal(pii.decrypt(a, "user.email"), "a@b.com");
});

test("ciphertext is bound to its context", () => {
  const pii = build();
  const a = pii.encrypt("x", "user.name", "random");
  assert.throws(() => pii.decrypt(a, "user.image"));
});

test("legacy plaintext passes through decrypt", () => {
  const pii = build();
  assert.equal(pii.decrypt("plain@mail.com", "user.email"), "plain@mail.com");
  assert.equal(pii.decrypt("", "user.name"), "");
});

test("tampered ciphertext fails", () => {
  const pii = build();
  const a = pii.encrypt("secret", "user.name", "random");
  const parts = a.split(":");
  parts[4] = Buffer.from("tampered").toString("base64url");
  assert.throws(() => pii.decrypt(parts.join(":"), "user.name"));
});

test("key rotation: new key encrypts, old key still decrypts", () => {
  const k1 = b64Key();
  const k2 = b64Key();
  const blind = b64Key();
  const old = createPiiCrypto(parsePiiKeys(`v1:${k1}`, blind));
  const rotated = createPiiCrypto(parsePiiKeys(`v2:${k2},v1:${k1}`, blind));
  const legacy = old.encrypt("name", "user.name", "random");
  assert.equal(rotated.decrypt(legacy, "user.name"), "name");
  assert.ok(
    rotated.encrypt("name", "user.name", "random").startsWith("enc:v2:"),
  );
  assert.throws(() =>
    old.decrypt(rotated.encrypt("n", "user.name", "random"), "user.name"),
  );
});

test("invalid keys are rejected", () => {
  assert.throws(() => parsePiiKeys(undefined, b64Key()));
  assert.throws(() => parsePiiKeys("v1:abcd", b64Key()));
  assert.throws(() => parsePiiKeys(`nokeyid${b64Key()}`, b64Key()));
  assert.throws(() => parsePiiKeys(`v1:${b64Key()}`, "short"));
});
