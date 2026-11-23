# Tasks

## 1. Shared image validation helper

- [x] 1.1 Add `decodeImageOrThrow` and `InvalidImageError` under `code/src/images/`; add `*.test.ts` covering valid PNG, garbage bytes, empty data, and zero dimensions; verify with `npm test` in `code/`
- [x] 1.2 Add a shared base64 size-limit constant and image payload zod schema used by v1 and v2 controllers; verify v1 controllers still compile and use it

## 2. Image endpoints and jobs

- [x] 2.1 Update v1 `postNegateImage`, `postGrayscaleImage`, `postFlipImage` to call the helper before `startXJob`, with try/catch mapping `InvalidImageError` to 400 and other errors to 500 JSON; verify via controller tests (mocked job handler) that malformed input returns 400 and the job handler is not called
- [x] 2.2 Update v2 `postRemoveBackground` to use the zod schema, helper and try/catch; verify a body without `image` returns 400 instead of throwing
- [x] 2.3 Update v2 `postUploadImage` to use the helper; verify an undecodable upload returns a 4xx and persists nothing
- [x] 2.4 Update `onNew` in negate, grayscale, flip and remove-image-background jobs: validate before `createTask`, drop the always-true `if (imageBuffer)`, wrap in try/catch; verify with a job test that a bad payload creates no task row
- [x] 2.5 Review each job's `work()` failure path; verify via test or reading that a processing error marks task/image failed and broadcasts, and does not throw out of the worker

## 3. Remove debug route

- [x] 3.1 Delete `api/v1/controllers/getSimulateStoreWsError.ts`, its import and route in `api/v1/router.ts`, and the `simulate-ws-error` line in `router.membership.test.ts`; verify `grep -r simulate-ws-error code/src` returns nothing and `npm test` passes
- [x] 3.2 Check for any other references (docs, README, frontend at `/Users/jesusmpc/Inditex/weavejs-frontend`) and remove them; verify the grep is clean

## 4. Origin guard

- [x] 4.1 Add `middlewares/origin-guard.ts` (Origin, then Referer-derived origin; POST/PUT/PATCH/DELETE only; allow when both absent) with `origin-guard.test.ts` covering allowed, foreign, Referer fallback, absent headers and GET; verify tests pass
- [x] 4.2 Mount the guard in `app.ts` for API routes (excluding `/api/auth/*`) using `getServiceConfig().cors.allowedOrigins`; verify with a request-level test that a foreign-origin POST gets 403 and an allowed one reaches the handler
- [x] 4.3 Document the behavior and its dependency on `CORS_ALLOWED_ORIGINS` in the README or deployment docs; verify the documented variable name matches `config.ts`

## 5. Process fault handlers

- [x] 5.1 Register `unhandledRejection` (log, continue) and `uncaughtException` (log, delayed `exit(1)`) in `server.ts`; extract into a small function so it is unit-testable, with a test asserting both listeners are registered and the exception path schedules exit; verify with `npm test`

## 6. Integration check

- [ ] 6.1 Start the server locally, POST malformed base64 to each of the five endpoints and confirm 4xx responses and that `/health` still answers; run `npm test` and `npm run lint` (if present) in `code/`
