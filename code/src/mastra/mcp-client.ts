// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { MCPClient } from "@mastra/mcp";
import { RequestContext } from "@mastra/core/request-context";
import { getServiceConfig } from "@/config/config.js";

const ROOM_TOOL_NAME = /(^|_)(get|add|update|delete)-node$/;

export const createInternalMcpClient = () =>
  new MCPClient({
    id: "weavejs-mcp-client",
    servers: {
      weavejsLocal: {
        url: new URL(`http://localhost:8081/ai/v1/mcp-rooms`),
        requestInit: {
          headers: { "x-internal-token": getServiceConfig().internalToken },
        },
      },
    },
  });

/**
 * The internal token is not tied to a user, so room tools must never trust the
 * roomId/pageId chosen by the model: they are overwritten from the request
 * context, which holds the room and page the user was authorized for.
 */
export const createBoundRequestContext = (roomId: string, pageId: string) => {
  const requestContext = new RequestContext();
  requestContext.set("roomId", roomId);
  requestContext.set("pageId", pageId);
  return requestContext;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const bindRoomTool = (tool: any) => {
  const bound = Object.assign(Object.create(Object.getPrototypeOf(tool)), tool);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bound.execute = (input: any, context: any) => {
    const roomId = context?.requestContext?.get("roomId");
    const pageId = context?.requestContext?.get("pageId");
    if (typeof roomId !== "string" || typeof pageId !== "string") {
      throw new TypeError(
        "Room tools require an authorized room and page context",
      );
    }
    return tool.execute({ ...input, roomId, pageId }, context);
  };
  return bound;
};

export const listBoundRoomTools = async () => {
  const tools = await createInternalMcpClient().listTools();
  return Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [
      name,
      ROOM_TOOL_NAME.test(name) ? bindRoomTool(tool) : tool,
    ]),
  );
};
