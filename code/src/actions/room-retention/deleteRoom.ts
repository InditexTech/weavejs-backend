// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { TransactionalPool } from "./database.js";
import { ROOM_TABLE, ROOM_TABLES_DELETE_ORDER } from "./tables.js";

export type DeleteRoomResult = "deleted" | "skipped";

// Deletes a room and every row that references it in one transaction. A room
// that is locked by another run, or that is no longer older than `cutoff`, is
// skipped. Any error rolls back and leaves the room untouched.
export const deleteRoom = async (
  pool: TransactionalPool,
  roomId: string,
  cutoff: Date,
): Promise<DeleteRoomResult> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT "roomId"
         FROM ${ROOM_TABLE}
        WHERE "roomId" = $1 AND "createdAt" < $2
          FOR UPDATE SKIP LOCKED`,
      [roomId, cutoff],
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return "skipped";
    }

    for (const table of ROOM_TABLES_DELETE_ORDER) {
      await client.query(`DELETE FROM ${table} WHERE "roomId" = $1`, [roomId]);
    }
    await client.query(`DELETE FROM ${ROOM_TABLE} WHERE "roomId" = $1`, [
      roomId,
    ]);

    await client.query("COMMIT");
    return "deleted";
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
};

export type DeleteRoomsSummary = {
  deleted: string[];
  skipped: string[];
  failed: { roomId: string; message: string }[];
};

export const deleteRooms = async (
  pool: TransactionalPool,
  roomIds: string[],
  cutoff: Date,
  dryRun: boolean,
  log: (message: string) => void,
): Promise<DeleteRoomsSummary> => {
  const summary: DeleteRoomsSummary = { deleted: [], skipped: [], failed: [] };

  for (const roomId of roomIds) {
    if (dryRun) {
      log(`[dry-run] would delete room ${roomId}`);
      continue;
    }

    try {
      const result = await deleteRoom(pool, roomId, cutoff);
      summary[result].push(roomId);
      log(`room ${roomId} ${result}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      summary.failed.push({ roomId, message });
      log(`room ${roomId} failed: ${message}`);
    }
  }

  return summary;
};
