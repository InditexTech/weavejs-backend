// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import test from "node:test";
import assert from "node:assert/strict";
import { buildContainerNames } from "./config.ts";
import { parseRetentionRunRequest, toRetentionConfig } from "./request.ts";

const storage = {
  accountName: "account",
  connectionString: undefined,
  containers: buildContainerNames({
    rooms: "rooms",
    images: "images",
    videos: "videos",
  }),
};

const parse = (body: unknown) => {
  const result = parseRetentionRunRequest(body);
  assert.ok(result.success, "expected a valid request");
  return result.data;
};

const invalid = (body: unknown) => {
  const result = parseRetentionRunRequest(body);
  assert.ok(!result.success, "expected an invalid request");
  return result.issues;
};

test("a full body maps to the retention configuration", () => {
  const config = toRetentionConfig(
    parse({
      dryRun: false,
      protectedRooms: ["room-a", " room-b "],
      protectedUserIds: ["user-1"],
      maxRoomsToDelete: 10,
      maxBlobsToDelete: 200,
      maxBlobsPercent: 25,
      blobGraceHours: 12,
    }),
    storage,
  );

  assert.equal(config.dryRun, false);
  assert.deepEqual([...config.protectedRooms], ["room-a", "room-b"]);
  assert.deepEqual([...config.protectedUserIds], ["user-1"]);
  assert.equal(config.maxRoomsToDelete, 10);
  assert.equal(config.maxBlobsToDelete, 200);
  assert.equal(config.maxBlobsPercent, 25);
  assert.equal(config.blobGraceHours, 12);
  assert.equal(config.storage.containers.rooms, "rooms");
});

test("an empty or missing body is a dry run with the default limits", () => {
  for (const body of [{}, undefined, null]) {
    const request = parse(body);
    assert.equal(request.dryRun, true);
    assert.deepEqual(request.protectedRooms, []);
    assert.deepEqual(request.protectedUserIds, []);
    assert.equal(request.maxRoomsToDelete, 50);
    assert.equal(request.maxBlobsToDelete, 5000);
    assert.equal(request.maxBlobsPercent, 50);
    assert.equal(request.blobGraceHours, 24);
  }
});

test("an omitted dryRun is true and only a boolean false disables it", () => {
  assert.equal(parse({ protectedRooms: ["a"] }).dryRun, true);
  assert.equal(parse({ dryRun: false }).dryRun, false);
  for (const value of ["false", 0, null, "no"]) {
    assert.ok(invalid({ dryRun: value }).length > 0);
  }
});

test("negative or out of range limits are rejected", () => {
  assert.equal(invalid({ maxRoomsToDelete: -1 })[0]!.path, "maxRoomsToDelete");
  assert.equal(invalid({ maxBlobsToDelete: -5 })[0]!.path, "maxBlobsToDelete");
  assert.equal(invalid({ maxBlobsPercent: 101 })[0]!.path, "maxBlobsPercent");
  assert.equal(invalid({ blobGraceHours: -1 })[0]!.path, "blobGraceHours");
  assert.ok(invalid({ maxRoomsToDelete: 1.5 }).length > 0);
  assert.ok(invalid({ maxRoomsToDelete: "10" }).length > 0);
});

test("malformed lists are rejected", () => {
  assert.ok(invalid({ protectedRooms: "room-a,room-b" }).length > 0);
  assert.ok(invalid({ protectedRooms: [1] }).length > 0);
  assert.ok(invalid({ protectedUserIds: [""] }).length > 0);
  assert.ok(invalid({ protectedUserIds: ["  "] }).length > 0);
  assert.ok(
    invalid({ protectedRooms: Array.from({ length: 1001 }, (_, i) => `r${i}`) })
      .length > 0,
  );
});

test("unknown fields are rejected so a typo cannot change a run", () => {
  const issues = invalid({ dryrun: false });
  assert.ok(issues.length > 0);
  assert.ok(invalid({ protectedEmails: ["a@b.com"] }).length > 0);
  assert.ok(invalid("not an object").length > 0);
  assert.ok(invalid([]).length > 0);
});

test("deleting every room must be allowed explicitly and is off by default", () => {
  assert.equal(parse({}).allowDeleteAllRooms, false);
  assert.equal(parse({ allowDeleteAllRooms: true }).allowDeleteAllRooms, true);
  assert.ok(invalid({ allowDeleteAllRooms: "true" }).length > 0);
  const config = toRetentionConfig(
    parse({ allowDeleteAllRooms: true }),
    storage,
  );
  assert.equal(config.allowDeleteAllRooms, true);
});

test("entries pasted from another format are rejected, not silently ignored", () => {
  for (const entry of [
    '""',
    "''",
    '"room-a"',
    "room-a,room-b",
    "room-a;room-b",
    "room a",
    "[room-a]",
    "{room-a}",
    "`room-a`",
  ]) {
    assert.ok(
      invalid({ protectedRooms: [entry] }).length > 0,
      `room entry ${entry}`,
    );
    assert.ok(
      invalid({ protectedUserIds: [entry] }).length > 0,
      `user entry ${entry}`,
    );
  }
});

test("legacy room names and generated ids are accepted", () => {
  const request = parse({
    protectedRooms: [
      "showcase-presentation",
      "25-05-2025-presentacion-final",
      "0b6f6d5e-5a3c-4d3b-9a43-2f6a1b0c8d11",
    ],
    protectedUserIds: ["6SKFjtxdsvgFsJyuWhQCb5343nre32JR"],
  });
  assert.equal(request.protectedRooms.length, 3);
  assert.equal(request.protectedUserIds.length, 1);
});

test("ids are case sensitive and kept as sent", () => {
  const request = parse({ protectedUserIds: ["AbC", "abc"] });
  assert.deepEqual(request.protectedUserIds, ["AbC", "abc"]);
});
