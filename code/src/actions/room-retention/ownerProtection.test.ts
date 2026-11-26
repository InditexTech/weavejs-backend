// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createPiiCrypto, parsePiiKeys } from "../../lib/pii/crypto.ts";
import type { Queryable } from "./database.ts";
import { buildEmailDecryptor } from "./run.ts";
import { findOwnerProtectedRooms, loadUserEmails } from "./ownerProtection.ts";

const b64 = () => randomBytes(32).toString("base64");

const keys = `v1:${b64()}`;
const blind = b64();
const pii = createPiiCrypto(parsePiiKeys(keys, blind));
const encrypt = (email: string) =>
  pii.encrypt(email.toLowerCase(), "user.email", "deterministic");
const decrypt = buildEmailDecryptor({
  piiEncryptionKeys: keys,
  piiBlindIndexKey: blind,
});

const fakeDb = (
  users: { id: string; email: string | null }[],
  owners: { roomId: string; userId: string }[],
): Queryable => ({
  query: async (text: string) =>
    ({
      rows: text.includes('auth."user"') ? users : owners,
    }) as never,
});

test("encrypted, plaintext and mixed case emails are matched", async () => {
  const db = fakeDb(
    [
      { id: "u1", email: encrypt("Jane@Inditex.com") },
      { id: "u2", email: "Bob@Example.com" },
      { id: "u3", email: encrypt("carol@example.com") },
    ],
    [
      { roomId: "r1", userId: "u1" },
      { roomId: "r2", userId: "u2" },
      { roomId: "r3", userId: "u3" },
    ],
  );

  const emails = await loadUserEmails(db, decrypt);
  const { rooms, stats } = await findOwnerProtectedRooms(
    db,
    ["r1", "r2", "r3"],
    new Set(["jane@inditex.com", "bob@example.com"]),
    emails,
  );

  assert.deepEqual([...rooms].sort(), ["r1", "r2"]);
  assert.equal(stats.roomsProtectedByOwner, 2);
  assert.equal(stats.protectedEmailsWithoutUser, 0);
});

test("any protected owner is enough for a room with two owners", async () => {
  const db = fakeDb(
    [
      { id: "u1", email: "a@example.com" },
      { id: "u2", email: "b@example.com" },
    ],
    [
      { roomId: "r1", userId: "u1" },
      { roomId: "r1", userId: "u2" },
    ],
  );
  const emails = await loadUserEmails(db, decrypt);
  const { rooms } = await findOwnerProtectedRooms(
    db,
    ["r1"],
    new Set(["b@example.com"]),
    emails,
  );
  assert.deepEqual([...rooms], ["r1"]);
});

test("a protected email matching no user is counted and protects nothing", async () => {
  const db = fakeDb(
    [{ id: "u1", email: "a@example.com" }],
    [{ roomId: "r1", userId: "u1" }],
  );
  const emails = await loadUserEmails(db, decrypt);
  const { rooms, stats } = await findOwnerProtectedRooms(
    db,
    ["r1"],
    new Set(["ghost@example.com"]),
    emails,
  );
  assert.equal(rooms.size, 0);
  assert.equal(stats.protectedEmailsWithoutUser, 1);
});

test("an owner with no user record does not protect and is counted", async () => {
  const db = fakeDb(
    [{ id: "u1", email: "a@example.com" }],
    [{ roomId: "r1", userId: "deleted-user" }],
  );
  const emails = await loadUserEmails(db, decrypt);
  const { rooms, stats } = await findOwnerProtectedRooms(
    db,
    ["r1"],
    new Set(["a@example.com"]),
    emails,
  );
  assert.equal(rooms.size, 0);
  assert.equal(stats.ownersWithoutUser, 1);
});

test("only owner rows are consulted, membership never protects", async () => {
  const seen: string[] = [];
  const db: Queryable = {
    query: async (text: string) => {
      seen.push(text);
      return { rows: [] as never[] };
    },
  };
  await findOwnerProtectedRooms(
    db,
    ["r1"],
    new Set(["a@example.com"]),
    new Map([["u1", "a@example.com"]]),
  );
  assert.match(seen[0]!, /role = 'owner'/);
});

test("encrypted emails without keys abort instead of being skipped", async () => {
  const noKeys = buildEmailDecryptor({
    piiEncryptionKeys: undefined,
    piiBlindIndexKey: undefined,
  });
  assert.equal(noKeys("plain@example.com"), "plain@example.com");
  assert.throws(() => noKeys(encrypt("a@example.com")), /PII_ENCRYPTION_KEYS/);
});

test("decryption works after a key rotation with the old key kept", async () => {
  const oldPii = createPiiCrypto(parsePiiKeys(keys, blind));
  const stored = oldPii.encrypt(
    "old@example.com",
    "user.email",
    "deterministic",
  );
  const rotated = buildEmailDecryptor({
    piiEncryptionKeys: `v2:${b64()},${keys}`,
    piiBlindIndexKey: blind,
  });
  assert.equal(rotated(stored), "old@example.com");
});
