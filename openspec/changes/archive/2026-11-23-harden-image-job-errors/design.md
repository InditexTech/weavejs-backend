# Design

## Context

See proposal.md for motivation. Current state (code/src):

- v1 negate/grayscale/flip controllers zod-validate shape and the 15 MB base64 cap, then call `jobHandler.startXJob(...)`, which `boss.send`s and then awaits `onNew`. `onNew` calls `createTask`, then `sharp(Buffer.from(b64)).metadata()` and `createImage`. Any throw propagates out of an `async` Express 4 handler as an unhandled rejection.
- v2 remove-background has no zod schema and destructures `req.body.image` directly.
- v2 `postUploadImage` already wraps `sharp` in try/catch; it is the pattern to reuse.
- The server has no `process.on` handlers. Startup is in `server.ts`.
- CORS is an explicit allowlist in `middlewares/cors.ts` (`config.cors.allowedOrigins`), used only for `/api/auth/*` plus per-route `cors` middleware. Session cookie is `SameSite=lax; Secure` with cross-subdomain cookies enabled.
- Router tests use `node:test` and regex-inspect `router.ts` source (`router.membership.test.ts`), including the debug route.

## Goals / Non-Goals

**Goals:**
- One validation point for client base64 images so bad input fails before any DB write.
- No known request path that can crash the process.
- Origin check with no new configuration.

**Non-Goals:**
- Hardening `sharp`/`ffmpeg` call sites not fed by client base64 (follow-up).
- Replacing Express 4 or adding a global async-wrapper for all controllers.
- CSRF tokens.

## Decisions

1. **Fail fast via a shared `decodeImageOrThrow(dataBase64)` helper** (new file under `images/`). It decodes the base64, rejects empty buffers, runs `sharp(buf).metadata()`, requires positive `width`/`height`, and returns `{ buffer, width, height }`. Failures throw a typed `InvalidImageError`. Controllers call it before `startXJob` and map `InvalidImageError` to 400. Alternative considered: catch in `onNew` and fail the task asynchronously; rejected because the client already received a 200 and a task row would exist.
   - `onNew` receives the decoded dimensions from the controller path where possible; otherwise it calls the helper itself. It creates the task only after validation succeeds, and wraps its body in try/catch that logs and rethrows an `Error` the controller turns into 500 (safety net).
2. **Controllers wrap the whole body in try/catch**: `InvalidImageError` -> 400 `{ status: "KO", message }`; anything else -> 500 JSON. Applied to the five endpoints. Alternative: `express-async-errors` or a wrapper; rejected to keep the change local and avoid a dependency.
3. **v2 remove-background gets the same zod schema** as v1 (shared constant for the 15 MB limit), replacing raw destructuring.
4. **Job `work()` failures**: the existing try/catch around processing is kept; verify it marks task/image failed and broadcasts. No new mechanism.
5. **Debug route is deleted** (controller file, router entry, `router.membership.test.ts` line and import). Not gated: there is no frontend caller and the issue allows removal.
6. **Origin guard as middleware** `middlewares/origin-guard.ts`, exporting a factory taking `allowedOrigins`. For methods POST/PUT/PATCH/DELETE it takes `req.headers.origin`, else `new URL(referer).origin`; if present and not in the allowlist it responds 403 JSON; if absent or Referer is unparsable-and-absent-Origin it calls `next()` (non-browser clients). It is mounted in `app.ts` with `app.use("/api", ...)` (or at the top of the v1/v2/v3 routers) so it runs before body parsing and any handler. Alternative: per-route placement; rejected as easy to forget. Unparsable Referer with no Origin is treated as absent (allowed) to avoid breaking odd clients; documented as a limitation.
7. **Process handlers** registered in `server.ts` before `start()` runs: `unhandledRejection` -> `logger.error` and continue; `uncaughtException` -> `logger.error`, then `setTimeout(() => process.exit(1), 100).unref()`-style delayed exit to flush. Alternative: exit on both; rejected because one rejected promise should not drop every room's websocket sessions.

## Risks / Trade-offs

- [Allowlist mismatch in some environment returns 403 to legitimate browser clients] -> Reuse the exact `CORS_ALLOWED_ORIGINS` value already needed for CORS to work; add unit tests; roll out with the env verified. A log-only phase was not requested.
- [`/assets` handler hardcodes `localhost:3000`, suggesting environments differ] -> Not touched; it serves GETs only and is not covered by the guard.
- [Keeping the process alive after `unhandledRejection` can mask bugs] -> Always logged at error level; alerts can key on the message.
- [`exit(1)` on `uncaughtException` drops sessions if no supervisor restarts it] -> Assumed supervised deployment; verify before release.
- [Double decode: controller validates, job decodes again] -> Acceptable (15 MB cap); the job re-decodes from the queued payload.

## Migration Plan

Single deploy, no data migration. Rollback is a revert. Confirm `CORS_ALLOWED_ORIGINS` contains every browser origin that calls the API before deploying.

## Open Questions

- Should the origin guard also cover `/api/auth/*` (better-auth already enforces `trustedOrigins`)? Default: exclude it.
