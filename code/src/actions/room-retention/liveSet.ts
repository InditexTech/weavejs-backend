// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { Queryable } from "./database.js";

export type LiveSet = {
  roomIds: Set<string>;
  pageIds: Set<string>;
  presentationModeIds: Set<string>;
};

// Identifiers that still own blobs. `excludeRoomIds` removes rooms that a
// dry run would delete, so the sweep plan matches what a real run would see.
export const loadLiveSet = async (
  db: Queryable,
  excludeRoomIds: string[] = [],
): Promise<LiveSet> => {
  const excluded = [...excludeRoomIds];

  const rooms = await db.query<{ roomId: string }>(
    `SELECT "roomId" FROM weavejs_room WHERE NOT ("roomId" = ANY($1::text[]))`,
    [excluded],
  );
  const pages = await db.query<{ pageId: string }>(
    `SELECT "pageId" FROM weavejs_page WHERE NOT ("roomId" = ANY($1::text[]))`,
    [excluded],
  );
  const presentations = await db.query<{ id: string | null }>(
    `SELECT metadata->>'presentationModeId' AS id
       FROM weavejs_task
      WHERE type = 'presentationMode' AND NOT ("roomId" = ANY($1::text[]))`,
    [excluded],
  );

  return {
    roomIds: new Set(rooms.rows.map((row) => row.roomId)),
    pageIds: new Set(pages.rows.map((row) => row.pageId)),
    presentationModeIds: new Set(
      presentations.rows
        .map((row) => row.id)
        .filter((id): id is string => typeof id === "string" && id !== ""),
    ),
  };
};
