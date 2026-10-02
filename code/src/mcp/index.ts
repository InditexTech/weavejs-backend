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
import express, {
  Application,
  Router,
  Request,
  RequestHandler,
  Response,
} from "express";
import { internalToken } from "@/middlewares/internal-token.js";
import { session } from "@/middlewares/session.js";
import { auth } from "@/middlewares/auth.js";
import { getCorsMiddleware } from "@/middlewares/cors.js";
import { setupSkiaBackend } from "@inditextech/weave-sdk/server";
import { registerSkiaFonts } from "@/canvas/fonts.js";
import {
  WeaveElementAttributes,
  WeaveStateElement,
} from "@inditextech/weave-types";
import { NodeTypeInformation } from "./types.js";

let logger = null as unknown as ReturnType<typeof getLogger>;

type McpScope = "public" | "rooms";

type McpConfig = {
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
};

const createMcpServer = (config: McpConfig, scope: McpScope) => {
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

  // Room-bound tools are only available on the authenticated endpoint.
  if (scope === "rooms") {
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
  }

  return server;
};

const getSessionOwner = (req: Request, scope: McpScope) => {
  if (scope === "public") {
    return "public";
  }
  if (req.isInternalRequest) {
    return "internal";
  }
  return req.session?.user?.id ? `user:${req.session.user.id}` : undefined;
};

const mountMcpEndpoint = (
  router: Router,
  path: string,
  scope: McpScope,
  config: McpConfig,
  cors: RequestHandler,
  guards: RequestHandler[],
) => {
  // Sessions are per endpoint and bound to the identity that created them.
  const sessions = new Map<
    string,
    {
      server: McpServer;
      transport: NodeStreamableHTTPServerTransport;
      owner: string;
    }
  >();

  // Exposes the caller identity to tool handlers (ctx.http.authInfo).
  const attachAuthInfo = (req: Request, owner: string) => {
    Object.assign(req, {
      auth: {
        token: "",
        clientId: "weavejs",
        scopes: [],
        extra: {
          internal: owner === "internal",
          userId: req.session?.user?.id,
        },
      },
    });
  };

  const handleSessionRequest = async (req: Request, res: Response) => {
    const owner = getSessionOwner(req, scope);
    const sessionIdHeader = req.headers["mcp-session-id"] as string | undefined;
    const entry = sessionIdHeader ? sessions.get(sessionIdHeader) : undefined;
    if (!entry || !owner) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }
    if (entry.owner !== owner) {
      res.status(403).send("Session does not belong to the caller");
      return;
    }
    attachAuthInfo(req, owner);
    await entry.transport.handleRequest(req, res);
  };

  router.post(
    path,
    cors,
    mcpRateLimit,
    ...guards,
    async (req: Request, res: Response) => {
      const owner = getSessionOwner(req, scope);
      const sessionIdHeader = req.headers["mcp-session-id"] as
        string | undefined;
      let sessionEntry = null;

      if (!owner) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Case 1: Existing session found
      if (sessionIdHeader && sessions.has(sessionIdHeader)) {
        sessionEntry = sessions.get(sessionIdHeader)!;

        if (sessionEntry.owner !== owner) {
          res.status(403).json({
            jsonrpc: "2.0",
            error: {
              code: -32000,
              message: "Forbidden: session does not belong to the caller",
            },
            id: null,
          });
          return;
        }

        // Case 2: Initialization request -> create new transport + server
      } else if (!sessionIdHeader && isInitializeRequest(req.body)) {
        const newSessionId = uuidv4();

        const transport = new NodeStreamableHTTPServerTransport({
          sessionIdGenerator: () => newSessionId,
          onsessioninitialized: (sid) => {
            sessions.set(sid, { server, transport, owner });
          },
        });

        // When this transport closes, clean up the session entry
        transport.onclose = () => {
          if (transport.sessionId) {
            sessions.delete(transport.sessionId);
          }
        };

        const server = createMcpServer(config, scope);
        await server.connect(transport);

        sessions.set(newSessionId, { server, transport, owner });
        sessionEntry = sessions.get(newSessionId)!;
      } else {
        // Neither a valid session nor an initialize request -> return error
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

      attachAuthInfo(req, owner);
      await sessionEntry.transport.handleRequest(req, res, req.body);
    },
  );

  router.get(path, cors, ...guards, handleSessionRequest);
  router.delete(path, cors, ...guards, handleSessionRequest);
};

export const setupMcpServer = async (app: Application, config: McpConfig) => {
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

  // Public endpoint: stateless tools only, no caller identity.
  mountMcpEndpoint(router, "/mcp", "public", config, cors, []);

  // Protected endpoint: room-bound tools, requires a session or internal trust.
  mountMcpEndpoint(router, "/mcp-rooms", "rooms", config, cors, [
    internalToken,
    session,
    auth,
  ]);

  app.use(mcpBasePath, router);

  logger.info("Module ready");
};
