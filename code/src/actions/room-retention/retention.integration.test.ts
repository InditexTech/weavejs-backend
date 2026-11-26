// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// Runs against a real PostgreSQL where all migrations were applied. It is
// skipped unless RETENTION_TEST_DATABASE_URL is set, for example:
//
//   RETENTION_TEST_DATABASE_URL=postgres://postgres@localhost:54329/weave_test \
//     npm test
//
// Every fixture uses a unique prefix and is removed afterwards.

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { createPiiCrypto, parsePiiKeys } from "../../lib/pii/crypto.ts";
import { parseRetentionConfig } from "./config.ts";
import { deleteRoom, deleteRooms } from "./deleteRoom.ts";
import { loadLiveSet } from "./liveSet.ts";
import { runRetention } from "./run.ts";
import {
  countRooms,
  retentionCutoff,
  selectCandidateRooms,
} from "./selectCandidates.ts";
import { assertKnownRoomTables, type TransactionalPool } from "./database.ts";
import { KNOWN_ROOM_TABLES } from "./tables.ts";
import type { BlobInfo, BlobStore } from "./sweep.ts";

const url = process.env.RETENTION_TEST_DATABASE_URL;
const skip = url ? false : "RETENTION_TEST_DATABASE_URL is not set";

const prefix = `rt${randomUUID().slice(0, 8)}-`;
const id = (name: string) => `${prefix}${name}`;
const DAY = 24 * 60 * 60 * 1000;
const now = new Date();
const daysAgo = (days: number) => new Date(now.getTime() - days * DAY);

let pool: Pool;

const insertRoom = (name: string, createdAt: Date, status = "active") =>
  pool.query(
    `INSERT INTO weavejs_room ("roomId", name, kind, status, "createdAt", "updatedAt")
     VALUES ($1, $1, 'room', $2, $3, now())`,
    [id(name), status, createdAt],
  );

const insertPage = (room: string, page: string) =>
  pool.query(
    `INSERT INTO weavejs_page ("pageId", "roomId", name, position, status)
     VALUES ($1, $2, $1, 1, 'active')`,
    [id(page), id(room)],
  );

const insertUser = (user: string, email: string) =>
  pool.query(`INSERT INTO auth."user" (id, name, email) VALUES ($1, $1, $2)`, [
    id(user),
    email,
  ]);

const insertMember = (room: string, user: string, role: string) =>
  pool.query(
    `INSERT INTO weavejs_room_user ("roomId", "userId", role) VALUES ($1, $2, $3)`,
    [id(room), id(user), role],
  );

const insertTask = (
  room: string,
  job: string,
  type: string,
  metadata: object,
) =>
  pool.query(
    `INSERT INTO weavejs_task ("jobId", "roomId", "userId", type, status, metadata)
     VALUES ($1, $2, 'u', $3, 'completed', $4)`,
    [id(job), id(room), type, JSON.stringify(metadata)],
  );

const insertEverything = async (room: string) => {
  await insertPage(room, `${room}-page`);
  await insertTask(room, `${room}-job`, "presentationMode", {
    presentationModeId: id(`${room}-presentation`),
  });
  await pool.query(
    `INSERT INTO weavejs_image ("roomId", "imageId", operation, status, "jobId")
     VALUES ($1, $2, 'upload', 'completed', $3)`,
    [id(room), id(`${room}-image`), id(`${room}-job`)],
  );
  await pool.query(
    `INSERT INTO weavejs_video ("roomId", "videoId", operation, status, "jobId")
     VALUES ($1, $2, 'upload', 'completed', $3)`,
    [id(room), id(`${room}-video`), id(`${room}-job`)],
  );
  await pool.query(
    `INSERT INTO weavejs_template ("roomId", "templateId", status, name, "linkedNodeType", "templateData", "createdAt", "updatedAt", "jobId")
     VALUES ($1, $2, 'completed', 't', 'frame', '{}', now(), now(), $3)`,
    [id(room), id(`${room}-template`), id(`${room}-job`)],
  );
  await pool.query(
    `INSERT INTO weavejs_thread ("threadId", "userId", "roomId", "userMetadata", x, y, status)
     VALUES ($1, 'u', $2, '{}', 0, 0, 'active')`,
    [id(`${room}-thread`), id(room)],
  );
  await pool.query(
    `INSERT INTO weavejs_thread_answer ("answerId", "threadId", "userId", "userMetadata", content)
     VALUES ($1, $2, 'u', '{}', 'hi')`,
    [id(`${room}-answer`), id(`${room}-thread`)],
  );
  await pool.query(
    `INSERT INTO weavejs_ai_chat ("chatId", "roomId", "resourceId", title, status)
     VALUES ($1, $2, 'r', 't', 'active')`,
    [id(`${room}-chat`), id(room)],
  );
  await pool.query(
    `INSERT INTO weavejs_ai_chat_message (id, "messageId", "chatId", role, parts)
     VALUES ($1, $1, $2, 'user', '[]')`,
    [id(`${room}-message`), id(`${room}-chat`)],
  );
  await pool.query(
    `INSERT INTO weavejs_connection ("connectionId", "roomId", status)
     VALUES ($1, $2, 'active')`,
    [id(`${room}-connection`), id(room)],
  );
  await pool.query(
    `INSERT INTO weavejs_room_access (id, "roomId", "userId", code, "validUntilUTC")
     VALUES ($1, $2, 'u', 'c', now())`,
    [id(`${room}-access`), id(room)],
  );
};

const rowsReferencing = async (room: string): Promise<number> => {
  let total = 0;
  for (const table of KNOWN_ROOM_TABLES) {
    const { rows } = await pool.query(
      `SELECT count(*)::int AS total FROM ${table} WHERE "roomId" = $1`,
      [id(room)],
    );
    total += rows[0].total;
  }
  return total;
};

const cleanup = async () => {
  for (const table of [
    "weavejs_image",
    "weavejs_video",
    "weavejs_template",
    "weavejs_thread",
    "weavejs_ai_chat",
    "weavejs_connection",
    "weavejs_task",
    "weavejs_room",
  ]) {
    await pool.query(`DELETE FROM ${table} WHERE "roomId" LIKE $1`, [
      `${prefix}%`,
    ]);
  }
  await pool.query(`DELETE FROM auth."user" WHERE id LIKE $1`, [`${prefix}%`]);
};

before(async () => {
  if (!url) return;
  pool = new Pool({ connectionString: url, max: 3 });
});

after(async () => {
  if (!url) return;
  await cleanup();
  await pool.end();
});

test("the schema guard accepts the migrated schema", { skip }, async () => {
  await assertKnownRoomTables(pool);
});

test(
  "candidates are old, unprotected rooms, archived ones included",
  { skip },
  async () => {
    await insertRoom("old", daysAgo(8));
    await insertRoom("old-archived", daysAgo(8), "archived");
    await insertRoom("recent", daysAgo(6));
    await insertRoom("protected", daysAgo(30));
    await insertRoom("updated-but-old", daysAgo(9));
    await pool.query(
      `UPDATE weavejs_room SET "updatedAt" = now() WHERE "roomId" = $1`,
      [id("updated-but-old")],
    );

    const candidates = (
      await selectCandidateRooms(pool, [id("protected")], now)
    ).filter((room) => room.startsWith(prefix));

    assert.deepEqual(candidates.sort(), [
      id("old"),
      id("old-archived"),
      id("updated-but-old"),
    ]);
    assert.ok((await countRooms(pool)) >= 5);
  },
);

test("deleting a room leaves no row referencing it", { skip }, async () => {
  await insertRoom("full", daysAgo(10));
  await insertEverything("full");
  await insertUser("someone", `someone-${prefix}@example.com`);
  await insertMember("full", "someone", "owner");
  assert.ok((await rowsReferencing("full")) > 5);

  const result = await deleteRoom(
    pool as unknown as TransactionalPool,
    id("full"),
    retentionCutoff(now),
  );

  assert.equal(result, "deleted");
  assert.equal(await rowsReferencing("full"), 0);
  for (const [table, column] of [
    ["weavejs_thread_answer", "answerId"],
    ["weavejs_ai_chat_message", "messageId"],
  ]) {
    const { rows } = await pool.query(
      `SELECT count(*)::int AS total FROM ${table} WHERE "${column}" LIKE $1`,
      [`${prefix}%`],
    );
    assert.equal(rows[0].total, 0, `${table} rows must cascade`);
  }
});

test("a room that is no longer old enough is skipped", { skip }, async () => {
  await insertRoom("fresh", daysAgo(1));
  const result = await deleteRoom(
    pool as unknown as TransactionalPool,
    id("fresh"),
    retentionCutoff(now),
  );
  assert.equal(result, "skipped");
  assert.equal(await rowsReferencing("fresh"), 1);
});

const failingOn = (statement: string): TransactionalPool => ({
  query: pool.query.bind(pool) as TransactionalPool["query"],
  connect: async () => {
    const client = await pool.connect();
    const query = client.query.bind(client) as (
      text: string,
      params?: unknown[],
    ) => Promise<unknown>;
    return {
      release: client.release.bind(client),
      query: (async (text: string, params?: unknown[]) => {
        if (text.startsWith(statement)) {
          throw new Error("forced failure");
        }
        return query(text, params);
      }) as never,
    };
  },
});

test("a failing statement rolls the whole room back", { skip }, async () => {
  await insertRoom("rollback", daysAgo(10));
  await insertEverything("rollback");
  const before = await rowsReferencing("rollback");

  await assert.rejects(
    deleteRoom(
      failingOn("DELETE FROM weavejs_task"),
      id("rollback"),
      retentionCutoff(now),
    ),
    /forced failure/,
  );

  assert.equal(await rowsReferencing("rollback"), before);
});

test("one failing room does not stop the others", { skip }, async () => {
  await insertRoom("batch-1", daysAgo(10));
  await insertRoom("batch-2", daysAgo(10));
  await insertRoom("batch-3", daysAgo(10));
  await insertEverything("batch-1");

  let calls = 0;
  const base = failingOn("never-matches");
  const flaky: TransactionalPool = {
    ...base,
    connect: async () => {
      calls++;
      return calls === 1
        ? failingOn("DELETE FROM weavejs_task").connect()
        : base.connect();
    },
  };

  const summary = await deleteRooms(
    flaky,
    [id("batch-1"), id("batch-2"), id("batch-3")],
    retentionCutoff(now),
    false,
    () => {},
  );

  assert.equal(summary.failed.length, 1);
  assert.deepEqual(summary.deleted.sort(), [id("batch-2"), id("batch-3")]);
  assert.equal(await rowsReferencing("batch-2"), 0);
});

test("a dry run deletes nothing", { skip }, async () => {
  await insertRoom("dry", daysAgo(10));
  const summary = await deleteRooms(
    pool as unknown as TransactionalPool,
    [id("dry")],
    retentionCutoff(now),
    true,
    () => {},
  );
  assert.equal(summary.deleted.length, 0);
  assert.equal(await rowsReferencing("dry"), 1);
});

test(
  "the live set excludes deleted rooms and keeps protected ones",
  { skip },
  async () => {
    await insertRoom("live-gone", daysAgo(10));
    await insertPage("live-gone", "live-gone-page");
    await insertTask("live-gone", "live-gone-job", "presentationMode", {
      presentationModeId: id("live-gone-presentation"),
    });
    await insertRoom("live-kept", daysAgo(10));
    await insertPage("live-kept", "live-kept-page");
    await insertTask("live-kept", "live-kept-job", "presentationMode", {
      presentationModeId: id("live-kept-presentation"),
    });
    await insertTask("live-kept", "live-kept-other", "exportPdf", {
      presentationModeId: id("not-a-presentation"),
    });

    const live = await loadLiveSet(pool, [id("live-gone")]);

    assert.ok(!live.roomIds.has(id("live-gone")));
    assert.ok(!live.pageIds.has(id("live-gone-page")));
    assert.ok(!live.presentationModeIds.has(id("live-gone-presentation")));
    assert.ok(live.roomIds.has(id("live-kept")));
    assert.ok(live.pageIds.has(id("live-kept-page")));
    assert.ok(live.presentationModeIds.has(id("live-kept-presentation")));
    assert.ok(!live.presentationModeIds.has(id("not-a-presentation")));
  },
);

const b64 = () => randomBytes(32).toString("base64");

test(
  "an end to end run protects by room and by encrypted owner, and sweeps blobs",
  { skip },
  async () => {
    const keys = `v1:${b64()}`;
    const blind = b64();
    const pii = createPiiCrypto(parsePiiKeys(keys, blind));

    await insertUser(
      "vip",
      pii.encrypt(`vip-${prefix}@example.com`, "user.email", "deterministic"),
    );
    await insertUser("plain", `plain-${prefix}@example.com`);

    await insertRoom("e2e-old", daysAgo(10));
    await insertPage("e2e-old", "e2e-old-page");
    await insertMember("e2e-old", "plain", "owner");

    await insertRoom("e2e-vip", daysAgo(10));
    await insertPage("e2e-vip", "e2e-vip-page");
    await insertMember("e2e-vip", "vip", "owner");

    await insertRoom("e2e-member", daysAgo(10));
    await insertPage("e2e-member", "e2e-member-page");
    await insertMember("e2e-member", "plain", "owner");
    await insertMember("e2e-member", "vip", "user");

    await insertRoom("e2e-protected", daysAgo(10));
    await insertPage("e2e-protected", "e2e-protected-page");

    await insertRoom("e2e-recent", daysAgo(1));
    await insertPage("e2e-recent", "e2e-recent-page");

    const blobs: Record<string, BlobInfo[]> = {};
    const aged = (name: string): BlobInfo => ({
      name,
      createdOn: daysAgo(20),
      lastModified: daysAgo(20),
    });
    for (const room of [
      "e2e-old",
      "e2e-vip",
      "e2e-member",
      "e2e-protected",
      "e2e-recent",
    ]) {
      (blobs["rooms"] ??= []).push(aged(id(`${room}-page`)));
      (blobs["images"] ??= []).push(aged(`${id(room)}/image-1`));
    }
    (blobs["images"] ??= []).push(aged("legacy-protected/image-1"));
    (blobs["images"] ??= []).push(aged("legacy-gone/image-1"));

    const deleted: string[] = [];
    const store: BlobStore = {
      containerExists: async (name) => name in blobs,
      async *list(name) {
        for (const blob of blobs[name] ?? []) yield blob;
      },
      delete: async (container, name) => {
        deleted.push(`${container}/${name}`);
        blobs[container] = (blobs[container] ?? []).filter(
          (blob) => blob.name !== name,
        );
      },
    };

    const config = parseRetentionConfig({
      AZURE_STORAGE_ACCOUNT_NAME: "account",
      AZURE_STORAGE_ROOMS_CONTAINER_NAME: "rooms",
      AZURE_STORAGE_IMAGES_CONTAINER_NAME: "images",
      AZURE_STORAGE_VIDEOS_CONTAINER_NAME: "videos",
      RETENTION_DRY_RUN: "false",
      RETENTION_PROTECTED_ROOMS: `${id("e2e-protected")},legacy-protected`,
      RETENTION_PROTECTED_EMAILS: `VIP-${prefix}@example.com,ghost-${prefix}@example.com`,
      RETENTION_MAX_ROOMS_TO_DELETE: "10000",
      RETENTION_MAX_BLOBS_TO_DELETE: "100000",
      RETENTION_MAX_BLOBS_PERCENT: "100",
      PII_ENCRYPTION_KEYS: keys,
      PII_BLIND_INDEX_KEY: blind,
    });

    const exists = async (room: string) =>
      (
        await pool.query(`SELECT 1 FROM weavejs_room WHERE "roomId" = $1`, [
          id(room),
        ])
      ).rowCount === 1;

    const dry = await runRetention({
      config: { ...config, dryRun: true },
      pool: pool as unknown as TransactionalPool,
      store,
      now,
      log: () => {},
    });
    assert.ok(dry.roomsToDelete.includes(id("e2e-old")));
    assert.equal(deleted.length, 0);
    assert.ok(await exists("e2e-old"));

    const logs: string[] = [];
    const summary = await runRetention({
      config,
      pool: pool as unknown as TransactionalPool,
      store,
      now,
      log: (message) => logs.push(message),
    });

    // The deletion order across runs does not matter, only what survives.
    assert.ok(!(await exists("e2e-old")));
    assert.ok(!(await exists("e2e-member")));
    assert.ok(await exists("e2e-vip"));
    assert.ok(await exists("e2e-protected"));
    assert.ok(await exists("e2e-recent"));
    assert.equal(summary.owners.protectedEmailsWithoutUser, 1);

    assert.ok(deleted.includes(`images/${id("e2e-old")}/image-1`));
    assert.ok(deleted.includes(`rooms/${id("e2e-old-page")}`));
    assert.ok(deleted.includes(`images/${id("e2e-member")}/image-1`));
    assert.ok(deleted.includes("images/legacy-gone/image-1"));
    assert.ok(!deleted.includes(`images/${id("e2e-vip")}/image-1`));
    assert.ok(!deleted.includes(`rooms/${id("e2e-vip-page")}`));
    assert.ok(!deleted.includes(`images/${id("e2e-protected")}/image-1`));
    assert.ok(!deleted.includes(`images/${id("e2e-recent")}/image-1`));
    assert.ok(!deleted.includes("images/legacy-protected/image-1"));

    for (const line of logs) {
      assert.doesNotMatch(line, /@example\.com/);
    }

    const second = await runRetention({
      config,
      pool: pool as unknown as TransactionalPool,
      store,
      now,
      log: () => {},
    });
    assert.equal(second.blobs.orphans, 0);
  },
);
