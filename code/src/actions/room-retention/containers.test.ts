// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import test from "node:test";
import assert from "node:assert/strict";
import { parseRetentionConfig } from "./config.ts";
import { buildContainerSpecs, ownerExists } from "./containers.ts";
import type { LiveSet } from "./liveSet.ts";

const config = parseRetentionConfig({
  AZURE_STORAGE_ACCOUNT_NAME: "account",
  AZURE_STORAGE_ROOMS_CONTAINER_NAME: "rooms",
  AZURE_STORAGE_IMAGES_CONTAINER_NAME: "images",
  AZURE_STORAGE_VIDEOS_CONTAINER_NAME: "videos",
});
const specs = buildContainerSpecs(config.storage.containers);
const spec = (name: string) => specs.find((entry) => entry.name === name)!;

const live: LiveSet = {
  roomIds: new Set(["room-1"]),
  pageIds: new Set(["page-1"]),
  presentationModeIds: new Set(["presentation-1"]),
};

test("all twelve containers are covered", () => {
  assert.equal(specs.length, 12);
  assert.equal(new Set(specs.map((entry) => entry.name)).size, 12);
});

const cases: [string, string, string, boolean][] = [
  // container, blob name, expected owner key, owner is live
  ["rooms", "page-1", "page-1", true],
  ["rooms", "page-1-image-fallback", "page-1", true],
  ["rooms", "room-1", "room-1", true],
  ["rooms", "page-gone", "page-gone", false],
  ["rooms", "page-gone-image-fallback", "page-gone", false],
  ["rooms-thumbnails", "room-1", "room-1", true],
  ["rooms-thumbnails", "room-gone", "room-gone", false],
  ["images", "room-1/image-9", "room-1", true],
  ["images", "room-gone/image-9", "room-gone", false],
  ["videos", "room-1/video-1-placeholder", "room-1", true],
  ["generated-images", "room-1/chat-1/image-1", "room-1", true],
  ["exported-images", "room-1/image-1", "room-1", true],
  ["exported-pdf", "room-gone/pdf-1", "room-gone", false],
  ["pages-thumbnails", "room-1/page-1", "room-1", true],
  ["templates-images", "room-1/uuid", "room-1", true],
  ["standalone-images", "room-gone/uuid", "room-gone", false],
  ["standalone-instance-image-data", "room-1/image-1", "room-1", true],
  ["presentation-images", "presentation-1/page-1", "presentation-1", true],
  [
    "presentation-images",
    "presentation-gone/page-1",
    "presentation-gone",
    false,
  ],
  // A presentation id is not a room, and a room id is not a presentation id.
  ["presentation-images", "room-1/page-1", "room-1", false],
  ["images", "presentation-1/page-1", "presentation-1", false],
  // A page id does not own blobs outside the rooms container.
  ["images", "page-1/image-1", "page-1", false],
];

for (const [container, blob, key, exists] of cases) {
  test(`${container}: ${blob} is owned by ${key} (${exists ? "live" : "orphan"})`, () => {
    assert.equal(spec(container).ownerKey(blob), key);
    assert.equal(ownerExists(spec(container), blob, live), exists);
  });
}
