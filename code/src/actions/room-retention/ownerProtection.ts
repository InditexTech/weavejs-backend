// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { Queryable } from "./database.js";

export type OwnerProtectionStats = {
  protectedUserIds: number;
  protectedUserIdsWithoutUser: number;
  roomsProtectedByOwner: number;
};

// Rooms in `candidateRoomIds` that have at least one owner whose user id is in
// `protectedUserIds`. Only the owner role protects a room, and the match is on
// the id stored in the membership, so it holds even if the account is gone.
export const findOwnerProtectedRooms = async (
  db: Queryable,
  candidateRoomIds: string[],
  protectedUserIds: ReadonlySet<string>,
): Promise<{ rooms: Set<string>; stats: OwnerProtectionStats }> => {
  const ids = [...protectedUserIds];

  if (ids.length === 0) {
    return {
      rooms: new Set(),
      stats: {
        protectedUserIds: 0,
        protectedUserIdsWithoutUser: 0,
        roomsProtectedByOwner: 0,
      },
    };
  }

  const rooms = new Set<string>();

  if (candidateRoomIds.length > 0) {
    const { rows } = await db.query<{ roomId: string }>(
      `SELECT DISTINCT "roomId"
         FROM weavejs_room_user
        WHERE role = 'owner'
          AND "roomId" = ANY($1::text[])
          AND "userId" = ANY($2::text[])`,
      [candidateRoomIds, ids],
    );
    for (const row of rows) {
      rooms.add(row.roomId);
    }
  }

  // A listed id that matches no user is most likely a typo.
  const known = await db.query<{ id: string }>(
    `SELECT id FROM auth."user" WHERE id = ANY($1::text[])`,
    [ids],
  );

  return {
    rooms,
    stats: {
      protectedUserIds: ids.length,
      protectedUserIdsWithoutUser: ids.length - known.rows.length,
      roomsProtectedByOwner: rooms.size,
    },
  };
};
