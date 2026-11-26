// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// Runs the retention core through the Sequelize adapter used by the backend,
// against a real PostgreSQL where all migrations were applied. Skipped unless
// RETENTION_TEST_DATABASE_URL is set (see retention.integration.test.ts).

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Sequelize } from "sequelize";
import { acquireIntegrationLock } from "./integrationLock.ts";
import { buildContainerNames, type RetentionConfig } from "./config.ts";
import type { TransactionalPool } from "./database.ts";
import { deleteRoom } from "./deleteRoom.ts";
import { runRetention } from "./run.ts";
import { retentionCutoff, selectCandidateRooms } from "./selectCandidates.ts";
import { createSequelizeDb, storageFromAppConfig } from "./sequelizeAdapter.ts";
import type { BlobInfo, BlobStore } from "./sweep.ts";
import { KNOWN_ROOM_TABLES } from "./tables.ts";

const url = process.env.RETENTION_TEST_DATABASE_URL;
const skip = url ? false : "RETENTION_TEST_DATABASE_URL is not set";

const prefix = `sq${randomUUID().slice(0, 8)}-`;
const id = (name: string) => `${prefix}${name}`;
const DAY = 24 * 60 * 60 * 1000;
const now = new Date();
const daysAgo = (days: number) => new Date(now.getTime() - days * DAY);

let sequelize: Sequelize;
let db: TransactionalPool;

const run = (sql: string, bind: unknown[] = []) =>
  sequelize.query(sql, { bind: bind as never });

const insertRoom = (name: string, createdAt: Date) =>
  run(
    `INSERT INTO weavejs_room ("roomId", name, kind, status, "createdAt", "updatedAt")
     VALUES ($1, $1, 'room', 'active', $2, now())`,
    [id(name), createdAt],
  );

const insertContent = async (room: string) => {
  await run(
    `INSERT INTO weavejs_page ("pageId", "roomId", name, position, status)
     VALUES ($1, $2, $1, 1, 'active')`,
    [id(`${room}-page`), id(room)],
  );
  await run(
    `INSERT INTO weavejs_task ("jobId", "roomId", "userId", type, status, metadata)
     VALUES ($1, $2, 'u', 'presentationMode', 'completed', $3)`,
    [
      id(`${room}-job`),
      id(room),
      JSON.stringify({ presentationModeId: id(`${room}-presentation`) }),
    ],
  );
  await run(
    `INSERT INTO weavejs_image ("roomId", "imageId", operation, status, "jobId")
     VALUES ($1, $2, 'upload', 'completed', $3)`,
    [id(room), id(`${room}-image`), id(`${room}-job`)],
  );
  await run(
    `INSERT INTO weavejs_room_user ("roomId", "userId", role) VALUES ($1, $2, 'owner')`,
    [id(room), id(`${room}-owner`)],
  );
};

const rowsReferencing = async (room: string): Promise<number> => {
  let total = 0;
  for (const table of KNOWN_ROOM_TABLES) {
    const { rows } = await db.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM ${table} WHERE "roomId" = $1`,
      [id(room)],
    );
    total += rows[0]!.total;
  }
  return total;
};

let releaseLock: (() => Promise<void>) | undefined;

before(async () => {
  if (!url) return;
  releaseLock = await acquireIntegrationLock(url);
  sequelize = new Sequelize(url, { dialect: "postgres", logging: false });
  db = createSequelizeDb(sequelize);
});

after(async () => {
  if (!url) return;
  for (const table of ["weavejs_image", "weavejs_task", "weavejs_room"]) {
    await run(`DELETE FROM ${table} WHERE "roomId" LIKE $1`, [`${prefix}%`]);
  }
  await sequelize.close();
  await releaseLock?.();
});

test(
  "plain queries accept array parameters and return rows",
  { skip },
  async () => {
    await insertRoom("old", daysAgo(10));
    await insertRoom("kept", daysAgo(10));
    await insertRoom("recent", daysAgo(1));

    const candidates = (
      await selectCandidateRooms(db, [id("kept")], now)
    ).filter((room) => room.startsWith(prefix));

    assert.deepEqual(candidates, [id("old")]);
  },
);

test(
  "a room is deleted with every row that references it",
  { skip },
  async () => {
    await insertRoom("full", daysAgo(10));
    await insertContent("full");
    assert.ok((await rowsReferencing("full")) >= 4);

    const result = await deleteRoom(db, id("full"), retentionCutoff(now));

    assert.equal(result, "deleted");
    assert.equal(await rowsReferencing("full"), 0);
  },
);

test("a failing statement rolls the whole room back", { skip }, async () => {
  await insertRoom("rollback", daysAgo(10));
  await insertContent("rollback");
  const before = await rowsReferencing("rollback");

  const failing: TransactionalPool = {
    ...db,
    connect: async () => {
      const client = await db.connect();
      return {
        release: client.release,
        query: (async (text: string, params?: unknown[]) => {
          if (text.startsWith("DELETE FROM weavejs_task")) {
            throw new Error("forced failure");
          }
          return client.query(text, params);
        }) as never,
      };
    },
  };

  await assert.rejects(
    deleteRoom(failing, id("rollback"), retentionCutoff(now)),
    /forced failure/,
  );
  assert.equal(await rowsReferencing("rollback"), before);
});

test(
  "a full run through the adapter deletes rooms and sweeps blobs",
  { skip },
  async () => {
    await insertRoom("e2e-old", daysAgo(10));
    await insertContent("e2e-old");
    await insertRoom("e2e-kept", daysAgo(10));
    await insertContent("e2e-kept");

    const aged = (name: string): BlobInfo => ({
      name,
      createdOn: daysAgo(20),
      lastModified: daysAgo(20),
    });
    const blobs: Record<string, BlobInfo[]> = {
      rooms: [aged(id("e2e-old-page")), aged(id("e2e-kept-page"))],
      images: [
        aged(`${id("e2e-old")}/image-1`),
        aged(`${id("e2e-kept")}/image-1`),
      ],
      "presentation-images": [
        aged(`${id("e2e-old-presentation")}/page`),
        aged(`${id("e2e-kept-presentation")}/page`),
      ],
    };
    const deleted: string[] = [];
    const store: BlobStore = {
      containerExists: async (name) => name in blobs,
      async *list(name) {
        for (const blob of blobs[name] ?? []) yield blob;
      },
      delete: async (container, name) => {
        deleted.push(`${container}/${name}`);
      },
    };

    const config: RetentionConfig = {
      dryRun: false,
      protectedRooms: new Set([id("e2e-kept")]),
      protectedUserIds: new Set(),
      maxRoomsToDelete: 100000,
      maxBlobsToDelete: 10000000,
      maxBlobsPercent: 100,
      blobGraceHours: 24,
      storage: storageFromAppConfig(
        {
          accountName: "account",
          rooms: { containerName: "rooms" },
          images: { containerName: "images" },
          videos: { containerName: "videos" },
        },
        undefined,
      ),
    };
    assert.deepEqual(
      config.storage.containers,
      buildContainerNames({
        rooms: "rooms",
        images: "images",
        videos: "videos",
      }),
    );

    const summary = await runRetention({
      config,
      pool: db,
      store,
      now,
      log: () => {},
    });

    assert.equal(summary.failed, false);
    assert.equal(await rowsReferencing("e2e-old"), 0);
    assert.ok((await rowsReferencing("e2e-kept")) > 0);
    assert.ok(deleted.includes(`rooms/${id("e2e-old-page")}`));
    assert.ok(deleted.includes(`images/${id("e2e-old")}/image-1`));
    assert.ok(
      deleted.includes(
        `presentation-images/${id("e2e-old-presentation")}/page`,
      ),
    );
    assert.ok(!deleted.includes(`rooms/${id("e2e-kept-page")}`));
    assert.ok(!deleted.includes(`images/${id("e2e-kept")}/image-1`));
    assert.ok(
      !deleted.includes(
        `presentation-images/${id("e2e-kept-presentation")}/page`,
      ),
    );
  },
);
