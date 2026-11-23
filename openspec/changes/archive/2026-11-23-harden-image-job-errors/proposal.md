# Proposal

## Why

Client-supplied base64 images reach `sharp(...).metadata()` inside the jobs' `onNew` with no error handling, and the controllers are `async` handlers on Express 4, which does not catch their rejections. A malformed payload therefore produces an `unhandledRejection`, and Node >= 15 terminates the whole process, dropping every room's realtime session. The v2 remove-background controller crashes even earlier by destructuring `req.body.image` unchecked. In addition, `GET /{hub}/rooms/:roomId/simulate-ws-error` is a debug route that changes state on a GET, is not actually gated to dev mode, and can be fired cross-site (e.g. via an `<img>` tag) because the session cookie is `SameSite=lax` with `crossSubDomainCookies` enabled. Tracked in InditexTech/weavejs-backend#169.

## What Changes

- Add a shared helper that decodes and validates a client-supplied base64 image (`sharp().metadata()`) before any task or image row is created, and use it in v1 negate/grayscale/flip, v2 remove-background and v2 upload-image.
- Controllers return a 400 JSON error for undecodable images and a 5xx JSON error for unexpected failures, instead of rejecting.
- v2 remove-background gains a zod payload schema (same shape and size limit as the v1 image controllers).
- Jobs' `onNew` no longer create an orphan task before validation, and keep a try/catch safety net so a failure fails the job rather than the process.
- **BREAKING**: remove `GET /{hub}/rooms/:roomId/simulate-ws-error`, its controller and its test expectation. No frontend caller exists.
- Add an Origin/Referer guard for mutating requests (POST/PUT/DELETE/PATCH) that rejects requests whose Origin (or Referer-derived origin) is not in `config.cors.allowedOrigins`. Requests with neither header are allowed.
- Register `unhandledRejection` (log, keep running) and `uncaughtException` (log, flush, `exit(1)`) handlers at server startup.

## Capabilities

### New Capabilities
- `image-input-validation`: client-supplied image payloads are validated before job creation, and malformed input yields a client error without affecting the process or leaving partial records.
- `mutating-request-origin`: mutating API requests from browsers must originate from an allowed origin.
- `process-fault-handling`: unhandled rejections and uncaught exceptions are logged, with defined continue/exit behaviour.

### Modified Capabilities
<!-- None: existing specs (room-access, page-access, ...) keep their requirements; the removed debug route was guarded only by room membership and is not specified there. -->

## Impact

- Code (`code/src`): `api/v1/controllers/{postNegateImage,postGrayscaleImage,postFlipImage}.ts`, `api/v2/controllers/{postRemoveBackground,postUploadImage}.ts`, `workloads/jobs/{negate-image,grayscale-image,flip-image,remove-image-background}/job.ts`, `api/v1/router.ts`, `api/v1/router.membership.test.ts`, `api/v1/controllers/getSimulateStoreWsError.ts` (deleted), `server.ts`, a new image helper, and a new origin middleware.
- APIs: one debug route removed; mutating routes may now answer 403 for foreign origins.
- Config: none new; reuses `CORS_ALLOWED_ORIGINS`.
- Assumptions: the Origin guard is enforced immediately (no log-only phase), and the deployment runs under a supervisor that restarts the process after `exit(1)`.
- Out of scope (follow-ups): other `sharp` call sites not fed by client base64 (`mcp/tools/get-image-metadata.ts`, mastra `image-generation.ts`, export workers).
