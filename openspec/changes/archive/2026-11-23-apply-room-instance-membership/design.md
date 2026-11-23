# Design

## Context

Membership middlewares already exist: `roomMember` (reads `:roomId`, skips internal requests) and `instanceMember` (reads `:instanceId`, same `getRoomUser` lookup). Both are applied on many routes in `code/src/api/v1/router.ts`; the routes in scope simply lack them. See proposal.md for motivation.

Observed facts that shape the approach:
- Standalone instances are rooms of kind `standalone`. The frontend creates them with `postRoom`, which inserts the owner into `room_user` in the same transaction; joiners are added by `putRoomAccess`. `instanceMember` therefore works without migration.
- The frontend opens two kinds of bus channel: per-room (`getCommBusNegotiate(room)`) and a global one using the literal id `weavejsGlobal`. The backend publishes only invalidation hints (`roomUpdated`, `pageCreated`, ...) carrying `roomId`/`pageId` to `weavejsGlobal.commbus`. `weavejsGlobal` is not a room, so a plain `roomMember` would 403 it.
- The bus controllers already use `req.session.user.id` and ignore `:userId`.
- Export controllers read `x-weave-user-id` and `x-weave-client-id` headers. The frontend sends `clientId` for every job; it is not on the session.
- Tests use `node:test` with `mock.module` (see `middlewares/page-member.test.ts`); `npm test` runs `src/**/*.test.ts`.

## Goals / Non-Goals

**Goals:**
- Every route listed in the proposal returns 403 to non-members and works unchanged for members.
- Keep the global bus channel working with no frontend change.

**Non-Goals:**
- Routes that already check membership in their controller, and `POST /rooms/:roomId/upload`, whose `:roomId` is a new room's name.
- Verifying that a standalone `imageId` belongs to its `instanceId` (follow-up).
- Changing `clientId` handling or the `x-weave-*` headers on non-export routes.

## Decisions

1. **New `busMember` middleware wrapping `roomMember`.** It calls `next()` when `req.params.roomId === "weavejsGlobal"` (strict equality) and otherwise delegates to `roomMember`. Applied to both bus routes.
   - Alternative: a separate `/{hub}/bus/global` route plus `roomMember` on the room route. Cleaner but needs a frontend release; rejected because the issue defers frontend work.
   - Alternative: register a real `weavejsGlobal` room and add all users. Rejected: it pollutes room data and membership.
   - Strict equality (no prefix, no case folding) avoids `weavejsGlobal-x` sneaking in. The constant should be shared with `comm-bus.ts`, which hardcodes the group name.

2. **Export attribution from session.** In the three export controllers, `userId = req.session!.user.id`. `clientId` stays a header, since it identifies the client tab and is not an identity claim. `internalToken` is not mounted on these routes, so every request has a session and there is no header fallback.

3. **`instanceMember` on all standalone routes, no controller changes.** Middleware order matches the rest of the router: `cors, session, auth, instanceMember, ...`.

4. **Tests.** One test file per group: `busMember` unit tests (member, non-member, global id, lookalike ids), and router-level or middleware-level tests proving 403 for non-members and pass-through for members on the export and standalone routes, plus an export test asserting session attribution beats a spoofed header.

## Risks / Trade-offs

- [Global channel is open to every authenticated user, leaking that room/page ids exist] → Accepted: payloads are ids only, and the frontend is already tracked to handle events defensively. Do not publish richer data to `weavejsGlobal`.
- [A legitimate flow uses a standalone or bus id that is not in `room_user`] → Frontend inspection found only member flows; verify with a manual run of standalone create/join and a bus connect before release.
- [`instanceMember` has no internal-request bypass, unlike `roomMember`] → No internal caller reaches standalone routes today; leave it unaligned.

## Migration Plan

Pure behavior tightening, no data migration. Deploy normally; rollback is reverting the router and middleware changes.
