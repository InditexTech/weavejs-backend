// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { MCPClient } from "@mastra/mcp";
import { getServiceConfig } from "@/config/config.js";

// Agents run on behalf of an already-authorized user request (the chat route
// enforces session + room membership), so they use the protected MCP endpoint
// with the internal service token.
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
