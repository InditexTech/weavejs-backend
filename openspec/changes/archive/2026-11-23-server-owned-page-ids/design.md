# Design

## Context

- `pageMember` (`code/src/middlewares/page-member.ts`) reads the page id from `req.params.roomId`, looks the page up with `getPageByPageId`, then checks `getRoomUser(page.roomId, userId)`. It does not check `status`.
- It guards `connect`, `GET /{hub}/rooms/:roomId` (blob download), threads and thread answers in `code/src/api/v1/router.ts`. The thread controllers compare `thread.roomId` (which stores the page id) to `req.params.roomId`.
- `postPage` takes `pageId` from the body, checks existence only within `(roomId, pageId)`, and swallows creation errors into a fallback lookup.
- `delPage` soft-archives (`status: "archived"`).
- The frontend currently sends ids as `<roomId>-<uuid>` or plain UUID and uses its local id after creation (see proposal, Rollout constraint).

## Goals / Non-Goals

**Goals:**
- Page ids are unguessable, server-generated and never reused.
- Param name matches meaning on page-scoped routes.

**Non-Goals:**
- Purge or migration of legacy orphan blobs/thread keys.
- Resolving the composite-key vs `pageId`-only primary key mismatch.
- Changing client-visible URLs or the soft-archive semantics.

## Decisions

1. **Ignore the body `pageId`, generate `crypto.randomUUID()`.** Alternative: accept UUIDs only and reject collisions. Rejected: three of four frontend flows send `<roomId>-<uuid>`, so a UUID-only rule would reject them, and collision checks across blobs/threads add queries for little gain. Ignoring is simplest and old clients still work apart from the rollout caveat.
2. **Rename the param, not the URL.** Routes become `/{hub}/rooms/:pageId...` for the guarded set; `pageMember` reads `req.params.pageId`. Thread and answer controllers keep reading the same value; they are updated to read `req.params.pageId` so they do not silently get `undefined`. Alternative: leave controllers on `roomId`. Rejected: Express would no longer populate `roomId` on those routes.
3. **Reject archived pages in `pageMember`.** Soft-deleted pages remain in the DB but should not be reachable via realtime, state or threads. Alternative: only check existence. Rejected: archived pages would stay readable and writable.
4. **Keep soft-archive; no cleanup.** Never re-issuing ids removes the claim-over-leftover-data risk, so purging blobs and threads is not needed here.
5. **Remove `GET /{hub}/rooms` outright.** No frontend caller exists. `getRoomsStorageController` is deleted and its route and import removed; `listRooms` is removed from `storage/storage.ts` if nothing else uses it. Alternative: admin-gate it. Rejected: no admin concept in this path and no consumer.
6. **Return the created page's `pageId`.** The existing response (`page.dataValues` plus `index`) already includes it; keep that shape.

## Risks / Trade-offs

- [Old frontend uses its local id after create and gets 403] → Release the frontend change first (or together); documented in the proposal.
- [Param rename misses a route and a controller reads `undefined`] → Tests per guarded route family and a grep of `req.params.roomId` in thread controllers.
- [Legacy ids coexist with plain UUIDs] → Treat ids as opaque strings; do not parse them.
- [Orphan blobs/threads remain] → Accepted; follow-up audit.
- [Archived-page denial changes behavior for any client that reopens archived pages] → Frontend has no archived-page restore flow in what was inspected; confirm before release.

## Migration Plan

1. Ship the frontend using the response `pageId` and no longer sending it.
2. Ship this backend change.
3. Rollback: revert the backend; the frontend remains compatible since it only reads the response.
