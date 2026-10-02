// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { ServerContext } from "@modelcontextprotocol/server";
import { getRoomUser } from "@/database/controllers/room-user.js";
import { getPage } from "@/database/controllers/page.js";

export type McpCaller = { internal: boolean; userId?: string };

// Same message for "unknown target" and "not a member" so callers cannot
// probe which rooms or pages exist.
export const ROOM_ACCESS_ERROR =
  "Room or page not found, or you don't have access to it.";

export const roomAccessErrorResult = () => ({
  isError: true,
  content: [{ type: "text" as const, text: `Error: ${ROOM_ACCESS_ERROR}` }],
  structuredContent: { error: ROOM_ACCESS_ERROR },
});

export const getMcpCaller = (ctx: ServerContext): McpCaller => {
  const extra = ctx.http?.authInfo?.extra;
  return {
    internal: extra?.internal === true,
    userId: typeof extra?.userId === "string" ? extra.userId : undefined,
  };
};

/**
 * Authorizes a room-bound tool call and returns the document id to use.
 * The caller never supplies the document id: it is derived from the page,
 * which must be an active page of the given room.
 */
export const authorizeRoomPage = async (
  ctx: ServerContext,
  roomId: string,
  pageId: string,
): Promise<{ docId: string } | null> => {
  const caller = getMcpCaller(ctx);

  if (!caller.internal) {
    if (!caller.userId) {
      return null;
    }

    const member = await getRoomUser({ roomId, userId: caller.userId });
    if (!member) {
      return null;
    }
  }

  const page = await getPage({ roomId, pageId });
  if (!page) {
    return null;
  }

  return { docId: page.pageId };
};
