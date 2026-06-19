// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import { getLogger } from "../logger/logger.js";
import { isInitializeRequest, McpServer } from "@modelcontextprotocol/server";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import { registerTool as registerToolGenerateUuid } from "./tools/generate-uuid.js";
import { registerTool as registerToolMeasureStyledText } from "./tools/measure-styled-text.js";
import { mcpRateLimit } from "@/middlewares/mcp-rate-limit.js";
import { registerTool as registerToolGetNodeTypeSchema } from "./tools/get-node-type-schema.js";
import { registerTool as registerToolGetAvailableNodeTypes } from "./tools/get-available-node-types.js";
import { registerTool as registerToolGetNode } from "./tools/get-node.js";
import { registerTool as registerToolAddNode } from "./tools/add-node.js";
import { registerTool as registerToolUpdateNode } from "./tools/update-node.js";
import { registerTool as registerToolDeleteNode } from "./tools/delete-node.js";
import { registerTool as registerToolGetImageMetadata } from "./tools/get-image-metadata.js";
import express, { Application, Router, Request, Response } from "express";
import { getCorsMiddleware } from "@/middlewares/cors.js";
import {
  setupSkiaBackend,
} from "@inditextech/weave-sdk/server";
import { registerSkiaFonts } from "@/canvas/fonts.js";
import {
  WeaveElementAttributes,
  WeaveStateElement,
} from "@inditextech/weave-types";
import { NodeTypeInformation } from "./types.js";

let logger = null as unknown as ReturnType<typeof getLogger>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sessions: any = {};

const createMcpServer = (config: {
  getAvailableNodes: () => NodeTypeInformation[];
  createNodeTypeDefaultState: (
    nodeId: string,
    nodeType: string,
  ) => WeaveStateElement | undefined;
  addNodeState: (
    defaultNodeState: WeaveStateElement,
    props: WeaveElementAttributes,
  ) => WeaveStateElement | undefined;
  updateNodeState: (
    prevNodeState: WeaveStateElement,
    nextProps: WeaveElementAttributes,
  ) => WeaveStateElement | undefined;
}) => {
  const server = new McpServer({
    name: "weavejs",
    title: "WeaveJS MCP Server",
    description: "MCP server for WeaveJS",
    version: "1.0.0",
  });

  registerToolGenerateUuid(server);
  registerToolMeasureStyledText(server);
  registerToolGetNodeTypeSchema(server, config.getAvailableNodes);
  registerToolGetAvailableNodeTypes(server, config.getAvailableNodes);
  registerToolGetImageMetadata(server);
  registerToolGetNode(server);
  registerToolAddNode(
    server,
    config.getAvailableNodes,
    config.createNodeTypeDefaultState,
    config.addNodeState,
  );
  registerToolUpdateNode(
    server,
    config.getAvailableNodes,
    config.updateNodeState,
  );
  registerToolDeleteNode(server);

  return server;
};

export const setupMcpServer = async (
  app: Application,
  config: {
    getAvailableNodes: () => NodeTypeInformation[];
    createNodeTypeDefaultState: (
      nodeId: string,
      nodeType: string,
    ) => WeaveStateElement | undefined;
    addNodeState: (
      defaultNodeState: WeaveStateElement,
      props: WeaveElementAttributes,
    ) => WeaveStateElement | undefined;
    updateNodeState: (
      prevNodeState: WeaveStateElement,
      nextProps: WeaveElementAttributes,
    ) => WeaveStateElement | undefined;
  },
) => {
  logger = getLogger().child({ module: "mcp" });

  logger.info("Setting up");

  // Initialise Skia rendering backend once at startup rather than per-call.
  registerSkiaFonts();
  await setupSkiaBackend();

  const mcpBasePath = "/ai/v1";
  const router: Router = Router();

  const cors = getCorsMiddleware(mcpBasePath);

  router.use(express.json({ limit: "1mb" }));
  router.options("*", cors);

  router.post("/mcp", cors, mcpRateLimit, async (req, res) => {
    const sessionIdHeader = req.headers["mcp-session-id"] as string | undefined;
    let sessionEntry = null;

    // Case 1: Existing session found
    if (sessionIdHeader && sessions[sessionIdHeader]) {
      sessionEntry = sessions[sessionIdHeader]; // :contentReference[oaicite:11]{index=11}

      // Case 2: Initialization request → create new transport + server
    } else if (!sessionIdHeader && isInitializeRequest(req.body)) {
      const newSessionId = uuidv4();

      // Create a new transport for this session
      const transport = new NodeStreamableHTTPServerTransport({
        sessionIdGenerator: () => newSessionId,
        onsessioninitialized: (sid) => {
          sessions[sid] = { server, transport };
        },
      });

      // When this transport closes, clean up the session entry
      transport.onclose = () => {
        if (transport.sessionId && sessions[transport.sessionId]) {
          delete sessions[transport.sessionId];
        }
      };

      // Create and configure the new McpServer
      const server = createMcpServer(config);
      await server.connect(transport);

      // After `onsessioninitialized` fires, `sessions[newSessionId]` is set.
      // But we can also assign it here for immediate access.
      sessions[newSessionId] = { server, transport };
      sessionEntry = sessions[newSessionId];
    } else {
      // Neither a valid session nor an initialize request → return error
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
        id: null,
      });
      return;
    }

    // Forward the request to the transport of the retrieved/created session
    await sessionEntry.transport.handleRequest(req, res, req.body);
  });

  async function handleSessionRequest(req: Request, res: Response) {
    const sessionIdHeader = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionIdHeader || !sessions[sessionIdHeader]) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }
    const { transport } = sessions[sessionIdHeader];
    await transport.handleRequest(req, res);
  }

  router.get("/mcp", handleSessionRequest);
  router.delete("/mcp", handleSessionRequest);

  app.use(mcpBasePath, router);

  logger.info("Module ready");
};
