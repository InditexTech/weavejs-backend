// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { Queryable } from "./database.js";
import { RETENTION_DAYS } from "./config.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export const retentionCutoff = (now: Date): Date =>
  new Date(now.getTime() - RETENTION_DAYS * DAY_MS);

export const countRooms = async (db: Queryable): Promise<number> => {
  const { rows } = await db.query<{ total: string }>(
    `SELECT count(*) AS total FROM weavejs_room`,
  );
  return Number(rows[0]?.total ?? 0);
};

export const selectCandidateRooms = async (
  db: Queryable,
  protectedRooms: Iterable<string>,
  now: Date,
): Promise<string[]> => {
  const { rows } = await db.query<{ roomId: string }>(
    `SELECT "roomId"
       FROM weavejs_room
      WHERE "createdAt" < $1
        AND NOT ("roomId" = ANY($2::text[]))
      ORDER BY "createdAt"`,
    [retentionCutoff(now), [...protectedRooms]],
  );
  return rows.map((row) => row.roomId);
};
