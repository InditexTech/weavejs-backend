// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import test from "node:test";
import assert from "node:assert/strict";
import { parseRetentionConfig } from "./config.ts";

const baseEnv = {
  AZURE_STORAGE_ACCOUNT_NAME: "account",
  AZURE_STORAGE_ROOMS_CONTAINER_NAME: "rooms",
  AZURE_STORAGE_IMAGES_CONTAINER_NAME: "images",
  AZURE_STORAGE_VIDEOS_CONTAINER_NAME: "videos",
};

test("defaults are safe: dry run on and conservative limits", () => {
  const config = parseRetentionConfig(baseEnv);
  assert.equal(config.dryRun, true);
  assert.equal(config.maxRoomsToDelete, 50);
  assert.equal(config.maxBlobsToDelete, 5000);
  assert.equal(config.maxBlobsPercent, 50);
  assert.equal(config.blobGraceHours, 24);
  assert.equal(config.protectedRooms.size, 0);
  assert.equal(config.protectedUserIds.size, 0);
});

test("deleting every room is off unless explicitly enabled", () => {
  assert.equal(parseRetentionConfig(baseEnv).allowDeleteAllRooms, false);
  for (const value of ["", "1", "yes", "false"]) {
    assert.equal(
      parseRetentionConfig({
        ...baseEnv,
        RETENTION_ALLOW_DELETE_ALL_ROOMS: value,
      }).allowDeleteAllRooms,
      false,
    );
  }
  assert.equal(
    parseRetentionConfig({
      ...baseEnv,
      RETENTION_ALLOW_DELETE_ALL_ROOMS: "true",
    }).allowDeleteAllRooms,
    true,
  );
});

test("only an explicit false disables the dry run", () => {
  for (const value of ["", "0", "no", "TRUE", undefined]) {
    assert.equal(
      parseRetentionConfig({ ...baseEnv, RETENTION_DRY_RUN: value }).dryRun,
      true,
    );
  }
  assert.equal(
    parseRetentionConfig({ ...baseEnv, RETENTION_DRY_RUN: "false" }).dryRun,
    false,
  );
});

test("lists are trimmed and split on commas, semicolons and newlines", () => {
  const config = parseRetentionConfig({
    ...baseEnv,
    RETENTION_PROTECTED_ROOMS: " a , b;c\nd,, ",
    RETENTION_PROTECTED_USER_IDS: " u1 ;u2\n,,u3 ",
  });
  assert.deepEqual([...config.protectedRooms], ["a", "b", "c", "d"]);
  assert.deepEqual([...config.protectedUserIds], ["u1", "u2", "u3"]);
});

test("unset or blank lists mean nothing is protected", () => {
  for (const value of [undefined, "", "  ", " , ; "]) {
    const config = parseRetentionConfig({
      ...baseEnv,
      RETENTION_PROTECTED_ROOMS: value,
      RETENTION_PROTECTED_USER_IDS: value,
    });
    assert.equal(config.protectedRooms.size, 0);
    assert.equal(config.protectedUserIds.size, 0);
  }
});

test("user ids are case sensitive", () => {
  const config = parseRetentionConfig({
    ...baseEnv,
    RETENTION_PROTECTED_USER_IDS: "AbC,abc",
  });
  assert.equal(config.protectedUserIds.size, 2);
});

test("hardcoded container names and the generated images override", () => {
  const defaults = parseRetentionConfig(baseEnv).storage.containers;
  assert.equal(defaults.generatedImages, "generated-images");
  assert.equal(defaults.presentationImages, "presentation-images");
  assert.equal(defaults.rooms, "rooms");

  const overridden = parseRetentionConfig({
    ...baseEnv,
    AZURE_STORAGE_GENERATED_IMAGES_CONTAINER_NAME: "custom",
  }).storage.containers;
  assert.equal(overridden.generatedImages, "custom");
});

test("missing or invalid values fail fast", () => {
  assert.throws(
    () => parseRetentionConfig({ ...baseEnv, AZURE_STORAGE_ACCOUNT_NAME: "" }),
    /AZURE_STORAGE_ACCOUNT_NAME/,
  );
  assert.throws(
    () =>
      parseRetentionConfig({
        ...baseEnv,
        AZURE_STORAGE_ROOMS_CONTAINER_NAME: undefined,
      }),
    /AZURE_STORAGE_ROOMS_CONTAINER_NAME/,
  );
  assert.throws(
    () =>
      parseRetentionConfig({
        ...baseEnv,
        RETENTION_MAX_ROOMS_TO_DELETE: "many",
      }),
    /RETENTION_MAX_ROOMS_TO_DELETE/,
  );
  assert.throws(
    () =>
      parseRetentionConfig({ ...baseEnv, RETENTION_MAX_BLOBS_PERCENT: "101" }),
    /RETENTION_MAX_BLOBS_PERCENT/,
  );
  assert.throws(
    () =>
      parseRetentionConfig({ ...baseEnv, RETENTION_BLOB_GRACE_HOURS: "-1" }),
    /RETENTION_BLOB_GRACE_HOURS/,
  );
});
