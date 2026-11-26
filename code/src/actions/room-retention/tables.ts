// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// Tables whose rows are deleted explicitly for a room, in FK safe order:
//  - weavejs_image and weavejs_video reference weavejs_task without cascade,
//    so they must go before the tasks.
//  - weavejs_thread_answer and weavejs_ai_chat_message cascade from their
//    parents, weavejs_template cascades from weavejs_task.
//  - weavejs_page, weavejs_room_user and weavejs_room_access cascade from
//    weavejs_room.
export const ROOM_TABLES_DELETE_ORDER = [
  "weavejs_image",
  "weavejs_video",
  "weavejs_template",
  "weavejs_thread",
  "weavejs_ai_chat",
  "weavejs_connection",
  "weavejs_task",
] as const;

export const ROOM_TABLE = "weavejs_room";

// Tables with a roomId column that are deleted through a cascade or as
// children of another table.
export const CASCADED_ROOM_TABLES = [
  "weavejs_page",
  "weavejs_room_user",
  "weavejs_room_access",
] as const;

export const KNOWN_ROOM_TABLES: ReadonlySet<string> = new Set([
  ROOM_TABLE,
  ...ROOM_TABLES_DELETE_ORDER,
  ...CASCADED_ROOM_TABLES,
]);
