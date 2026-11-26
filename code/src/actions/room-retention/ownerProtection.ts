// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { Queryable } from "./database.js";

export type OwnerProtectionStats = {
  usersLoaded: number;
  protectedEmails: number;
  protectedEmailsWithoutUser: number;
  ownersWithoutUser: number;
  roomsProtectedByOwner: number;
};

// Maps userId -> lowercase plaintext email. Emails can be stored encrypted
// (enc:...) or in plaintext, `decrypt` returns plaintext values untouched.
export const loadUserEmails = async (
  db: Queryable,
  decrypt: (value: string) => string,
): Promise<Map<string, string>> => {
  const { rows } = await db.query<{ id: string; email: string | null }>(
    `SELECT id, email FROM auth."user"`,
  );

  const emails = new Map<string, string>();
  for (const row of rows) {
    if (typeof row.email === "string") {
      emails.set(row.id, decrypt(row.email).trim().toLowerCase());
    }
  }
  return emails;
};

export const findOwnerProtectedRooms = async (
  db: Queryable,
  candidateRoomIds: string[],
  protectedEmails: ReadonlySet<string>,
  userEmails: ReadonlyMap<string, string>,
): Promise<{ rooms: Set<string>; stats: OwnerProtectionStats }> => {
  const knownEmails = new Set(userEmails.values());
  const rooms = new Set<string>();
  let ownersWithoutUser = 0;

  if (candidateRoomIds.length > 0 && protectedEmails.size > 0) {
    const { rows } = await db.query<{ roomId: string; userId: string }>(
      `SELECT "roomId", "userId"
         FROM weavejs_room_user
        WHERE role = 'owner' AND "roomId" = ANY($1::text[])`,
      [candidateRoomIds],
    );

    for (const owner of rows) {
      const email = userEmails.get(owner.userId);
      if (email === undefined) {
        ownersWithoutUser++;
        continue;
      }
      if (protectedEmails.has(email)) {
        rooms.add(owner.roomId);
      }
    }
  }

  let protectedEmailsWithoutUser = 0;
  for (const email of protectedEmails) {
    if (!knownEmails.has(email)) {
      protectedEmailsWithoutUser++;
    }
  }

  return {
    rooms,
    stats: {
      usersLoaded: userEmails.size,
      protectedEmails: protectedEmails.size,
      protectedEmailsWithoutUser,
      ownersWithoutUser,
      roomsProtectedByOwner: rooms.size,
    },
  };
};
