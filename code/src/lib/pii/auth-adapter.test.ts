// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any */

import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { createPiiCrypto, isEncrypted, parsePiiKeys } from "./crypto.ts";
import { AUTH_PII_FIELDS, createPiiAdapterWrapper } from "./auth-adapter.ts";

const setup = (encryptWrites: boolean, db: Record<string, any[]>) => {
  const b64 = () => randomBytes(32).toString("base64");
  const keys = parsePiiKeys(`v1:${b64()}`, b64());
  const wrap = createPiiAdapterWrapper({
    pii: createPiiCrypto(keys),
    fields: AUTH_PII_FIELDS,
    encryptWrites,
  });
  const auth = betterAuth({
    secret: "x".repeat(40),
    baseURL: "http://localhost:3000",
    database: (options) => wrap(memoryAdapter(db)(options)),
  });
  return { auth, wrap, keys };
};

test("user PII is encrypted at rest and transparent to better-auth", async () => {
  const db: Record<string, any[]> = {
    user: [],
    session: [],
    account: [],
    verification: [],
  };
  const { auth } = setup(true, db);
  const ctx = await auth.$context;

  const created = await ctx.internalAdapter.createOAuthUser(
    {
      email: "Jesus@Example.com",
      name: "Jesús Piñeiro",
      image: "https://avatars.example/u/1",
      emailVerified: true,
    },
    {
      providerId: "github",
      accountId: "123",
      accessToken: "gho_secret",
      refreshToken: "ghr_secret",
    },
  );

  assert.equal(created.user.email, "jesus@example.com");
  assert.equal(created.user.name, "Jesús Piñeiro");

  const row = db.user![0];
  assert.ok(isEncrypted(row.email));
  assert.ok(isEncrypted(row.name));
  assert.ok(isEncrypted(row.image));
  assert.ok(!JSON.stringify(db).includes("jesus@example.com"));
  assert.ok(!JSON.stringify(db).includes("gho_secret"));
  assert.ok(isEncrypted(db.account![0].accessToken));

  const found = await ctx.internalAdapter.findUserByEmail("JESUS@example.com", {
    includeAccounts: true,
  });
  assert.equal(found?.user.id, created.user.id);
  assert.equal(found?.user.name, "Jesús Piñeiro");
  assert.equal(found?.user.image, "https://avatars.example/u/1");
  assert.equal(found?.accounts[0]?.accessToken, "gho_secret");

  const byId = await ctx.internalAdapter.findUserById(created.user.id);
  assert.equal(byId?.email, "jesus@example.com");

  const updated = await ctx.internalAdapter.updateUser(created.user.id, {
    name: "New Name",
  });
  assert.equal(updated.name, "New Name");
  assert.ok(isEncrypted(db.user![0].name));
});

test("legacy plaintext rows are readable and writes stay plaintext when disabled", async () => {
  const db: Record<string, any[]> = {
    user: [
      {
        id: "u1",
        name: "Legacy",
        email: "legacy@example.com",
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    session: [],
    account: [],
    verification: [],
  };
  const { auth } = setup(false, db);
  const ctx = await auth.$context;

  const found = await ctx.internalAdapter.findUserByEmail("legacy@example.com");
  assert.equal(found?.user.name, "Legacy");

  await ctx.internalAdapter.createUser({
    email: "new@example.com",
    name: "New",
    emailVerified: false,
  });
  assert.equal(db.user![1].email, "new@example.com");
});
