// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import test from "node:test";
import assert from "node:assert/strict";
import { parseRetentionConfig } from "./config.ts";
import { buildContainerSpecs } from "./containers.ts";
import type { LiveSet } from "./liveSet.ts";
import {
  type BlobInfo,
  type BlobStore,
  executeSweep,
  planSweep,
} from "./sweep.ts";

const config = parseRetentionConfig({
  AZURE_STORAGE_ACCOUNT_NAME: "account",
  AZURE_STORAGE_ROOMS_CONTAINER_NAME: "rooms",
  AZURE_STORAGE_IMAGES_CONTAINER_NAME: "images",
  AZURE_STORAGE_VIDEOS_CONTAINER_NAME: "videos",
});
const specs = buildContainerSpecs(config.storage.containers);

const now = new Date("2026-12-01T12:00:00Z");
const old = new Date("2026-11-01T00:00:00Z");
const recent = new Date("2026-12-01T06:00:00Z");

const live: LiveSet = {
  roomIds: new Set(["room-1"]),
  pageIds: new Set(["page-1"]),
  presentationModeIds: new Set(["presentation-1"]),
};

const memoryStore = (
  containers: Record<string, BlobInfo[]>,
): BlobStore & { deleted: string[] } => {
  const deleted: string[] = [];
  return {
    deleted,
    containerExists: async (name) => name in containers,
    async *list(name) {
      for (const blob of containers[name] ?? []) {
        yield blob;
      }
    },
    delete: async (container, name) => {
      deleted.push(`${container}/${name}`);
    },
  };
};

const aged = (name: string, date = old): BlobInfo => ({
  name,
  createdOn: date,
  lastModified: date,
});

test("blobs of existing rooms, pages and presentations are kept", async () => {
  const store = memoryStore({
    rooms: [aged("page-1"), aged("page-1-image-fallback")],
    images: [aged("room-1/image-1")],
    "presentation-images": [aged("presentation-1/page-1")],
  });
  const plan = await planSweep(store, specs, live, new Set(), 24, now);
  assert.equal(plan.orphans.length, 0);
  assert.equal(plan.totalBlobs, 4);
});

test("orphaned blobs of a deleted room are removed in every container", async () => {
  const store = memoryStore({
    rooms: [aged("page-gone"), aged("page-gone-image-fallback")],
    "rooms-thumbnails": [aged("room-gone")],
    images: [aged("room-gone/image-1")],
    videos: [aged("room-gone/video-1"), aged("room-gone/video-1-placeholder")],
    "generated-images": [aged("room-gone/chat/image")],
    "exported-pdf": [aged("room-gone/pdf-1")],
    "presentation-images": [aged("presentation-gone/page-1")],
  });
  const plan = await planSweep(store, specs, live, new Set(), 24, now);
  assert.equal(plan.orphans.length, 9);
  assert.equal(plan.perContainer["videos"]!.orphans, 2);
});

test("a presentation image follows its task, not its room", async () => {
  const store = memoryStore({
    "presentation-images": [
      aged("presentation-1/page-1"),
      aged("room-1/page-1"),
      aged("presentation-gone/page-1"),
    ],
  });
  const plan = await planSweep(store, specs, live, new Set(), 24, now);
  assert.deepEqual(plan.orphans.map((blob) => blob.name).sort(), [
    "presentation-gone/page-1",
    "room-1/page-1",
  ]);
});

test("recent blobs are kept, old ones are removed, undated ones are kept", async () => {
  const store = memoryStore({
    images: [
      aged("room-gone/recent", recent),
      aged("room-gone/old"),
      { name: "room-gone/undated" },
      { name: "room-gone/modified", createdOn: old, lastModified: recent },
    ],
  });
  const plan = await planSweep(store, specs, live, new Set(), 24, now);
  assert.deepEqual(
    plan.orphans.map((blob) => blob.name),
    ["room-gone/old"],
  );
});

test("protected legacy room names are kept", async () => {
  const store = memoryStore({
    rooms: [aged("showcase-presentation"), aged("legacy-other")],
    images: [aged("showcase-presentation/image-1")],
  });
  const plan = await planSweep(
    store,
    specs,
    live,
    new Set(["showcase-presentation"]),
    24,
    now,
  );
  assert.deepEqual(
    plan.orphans.map((blob) => blob.name),
    ["legacy-other"],
  );
});

test("legacy blobs with no database owner are removed once old", async () => {
  const store = memoryStore({ rooms: [aged("legacy-room")] });
  const plan = await planSweep(store, specs, live, new Set(), 24, now);
  assert.equal(plan.orphans.length, 1);
});

test("missing containers are reported and skipped", async () => {
  const store = memoryStore({ rooms: [aged("page-1")] });
  const plan = await planSweep(store, specs, live, new Set(), 24, now);
  assert.equal(plan.missingContainers.length, 11);
  assert.ok(plan.missingContainers.includes("images"));
});

test("a dry run lists orphans and deletes none", async () => {
  const store = memoryStore({ images: [aged("room-gone/image-1")] });
  const plan = await planSweep(store, specs, live, new Set(), 24, now);
  const logs: string[] = [];
  const result = await executeSweep(store, plan.orphans, true, (m) =>
    logs.push(m),
  );
  assert.equal(store.deleted.length, 0);
  assert.equal(result.deleted, 0);
  assert.match(
    logs[0]!,
    /\[dry-run\] would delete blob images\/room-gone\/image-1/,
  );
});

test("a real run deletes orphans and records failures", async () => {
  const store = memoryStore({
    images: [aged("room-gone/a"), aged("room-gone/b")],
  });
  const failing: BlobStore = {
    ...store,
    delete: async (container, name) => {
      if (name === "room-gone/b") {
        throw new Error("boom");
      }
      await store.delete(container, name);
    },
  };
  const plan = await planSweep(store, specs, live, new Set(), 24, now);
  const result = await executeSweep(failing, plan.orphans, false, () => {});
  assert.equal(result.deleted, 1);
  assert.equal(result.failed.length, 1);
  assert.equal(store.deleted.length, 1);
});

test("an interrupted run is repaired by the next one", async () => {
  const containers = {
    images: [aged("room-gone/a"), aged("room-gone/b")],
  };
  const store = memoryStore(containers);
  const flaky: BlobStore = {
    ...store,
    delete: async (container, name) => {
      if (name === "room-gone/b") {
        throw new Error("interrupted");
      }
      await store.delete(container, name);
      containers.images = containers.images.filter(
        (blob) => blob.name !== name,
      );
    },
  };
  const first = await planSweep(store, specs, live, new Set(), 24, now);
  await executeSweep(flaky, first.orphans, false, () => {});

  const second = await planSweep(
    memoryStore(containers),
    specs,
    live,
    new Set(),
    24,
    now,
  );
  assert.deepEqual(
    second.orphans.map((blob) => blob.name),
    ["room-gone/b"],
  );
});
