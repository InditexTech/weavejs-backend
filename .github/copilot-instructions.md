# Copilot Instructions for Weave.js Backend

## Project Overview

This is the backend showcase for **Weave.js** — a real-time collaborative canvas platform (think Excalidraw/Miro/Figma). It handles WebSocket-based CRDT synchronization via Yjs, media storage, AI workloads, and an MCP server.

**Tech stack:** Express.js · TypeScript (strict, ESM) · Azure Web PubSub · Azure Blob Storage · PostgreSQL (Sequelize) · Mastra AI framework · better-auth

---

## Commands

All commands run from the `/code` folder.

```bash
npm install          # Install dependencies (also runs postinstall: copy assets + apply patches)
npm run dev          # Start dev server (vite-node src/server.ts)
npm run build        # Compile to dist/
npm run lint         # ESLint (TypeScript)
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier on src/

# Database migrations
npm run db:migrate:dev    # Run migrations (development)
npm run db:undo:dev       # Undo last migration (development)
npm run db:generate:migration --name <name>  # Generate new migration

# AI / MCP dev
npm run dev:llm      # Start Mastra dev server
```

There are no automated tests — verify changes manually or with the dev server.

---

## Architecture

### Startup sequence (`src/server.ts`)

The server initializes subsystems in order: logger → auth → workers → database → workloads → comm-bus → storage → store (Azure Web PubSub) → MCP server → HTTP listen.

Each subsystem follows the **singleton pattern**: a `setupX()` function initializes it once, and `getX()` throws if called before setup.

### Key modules

| Path | Role |
|------|------|
| `src/server.ts` | Entry point; orchestrates startup |
| `src/app.ts` | Express app, middleware, route registration |
| `src/store.ts` | Azure Web PubSub CRDT sync server; handles room lifecycle, persistence queue, cleanup |
| `src/config/config.ts` | Reads all env vars and validates via Zod schema |
| `src/database/` | Sequelize models + controllers (PostgreSQL) |
| `src/api/v1/`, `v2/`, `v3/` | Versioned REST API routers; v3 requires `FEATURE_WORKLOADS=true` |
| `src/comm-bus/` | Azure Web PubSub service client for broadcasting messages to rooms |
| `src/mastra/` | Mastra AI agents/workflows (orchestrator, room editor, image gen) |
| `src/mcp/` | MCP server exposed at `/ai/v1/mcp` (HTTP transport) |
| `src/lib/auth.ts` | better-auth setup (GitHub + Google OAuth, PostgreSQL-backed sessions) |
| `src/workers/` | Node.js worker threads |
| `src/workloads/` | Async job processing (enabled by `FEATURE_WORKLOADS`) |
| `src/logger/` | Pino-based logger with pino-pretty |

### Real-time sync flow

Clients connect to Azure Web PubSub via WebSocket. The backend runs a `WeaveAzureWebPubsubServer` (from `@inditextech/weave-store-azure-web-pubsub`) that:
1. Manages room sessions and tracks connections in PostgreSQL
2. Loads room state from Azure Blob Storage on first connection
3. Applies Yjs CRDT updates and persists back to Blob Storage via a `PQueue` (concurrency 1)
4. Periodically cleans up rooms with no active connections

### Feature flags (env vars)

- `FEATURE_WORKLOADS=true` — enables v3 API and workloads system
- `FEATURE_THREADS=true` — enables database setup and threads API
- `DISABLE_ROOMS_CLEANUP=true` — skip room memory cleanup

---

## Key Conventions

### Module initialization pattern

Every service module exports `setupX()` (async init, called once at startup) and `getX()` (returns the singleton, throws if not initialized):

```typescript
let instance: SomeType | null = null;

export const setupX = async () => { /* init */ instance = ...; };
export const getX = () => {
  if (!instance) throw new Error("X not initialized");
  return instance;
};
```

### Logging

Use scoped child loggers, never `console.log` in module code:

```typescript
const logger = getLogger().child({ module: "my-module" });
logger.info("...");
```

### Configuration

All configuration is loaded from environment variables in `src/config/config.ts` and validated with Zod. Never access `process.env` directly in feature code — call `getServiceConfig()` instead.

### Path aliases

Use `@/` as an alias for `src/`:

```typescript
import { getAuth } from "@/lib/auth.js";
```

### Import extensions

Always use `.js` extensions in imports (even for `.ts` source files), as required by NodeNext module resolution:

```typescript
import { setupLogger } from "./logger/logger.js";
```

### File headers

Every source file must start with an SPDX license header:

```typescript
// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0
```

### Commit messages

Follow Conventional Commits (enforced by commitlint):
```
feat: add video export endpoint
fix: handle missing room on cleanup
```

### API controller naming

Controllers follow `<verb><Resource>Controller` and live under `src/api/vN/controllers/`:
- `getImageController`, `postUploadImageController`, `delImageController`

### Database

- ORM: Sequelize with PostgreSQL
- Models defined in `src/database/models/`, controllers in `src/database/controllers/`
- Run `INITIALIZE_DB=true` env var to force-sync schema (development only, destructive)
- Supports both `DATABASE_URL` (connection string) and individual `DATABASE_HOST/PORT/NAME/USERNAME/PASSWORD` vars — not both simultaneously
- Azure managed identity credentials supported via `DATABASE_CLOUD_CREDENTIALS=true`

### Mastra AI

- Models referenced as LiteLLM strings, e.g. `"google/gemini-3.1-pro-preview"` — constants in `src/mastra/index.ts`
- Agents and workflows are lazily initialized inside `getMastra()`
- Dev studio: `npm run llm:studio`

### MCP server

Exposed at `http://localhost:8081/ai/v1/mcp` (HTTP transport). Test with:

```bash
npx @modelcontextprotocol/inspector --cli http://localhost:8081/ai/v1/mcp --transport http --method tools/call --tool-name get-available-node-types
```
