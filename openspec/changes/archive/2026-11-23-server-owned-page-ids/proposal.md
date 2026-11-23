# Proposal

## Why

Page ids are chosen by the client (`POST /rooms/:roomId/pages` trusts `body.pageId`), and the page id keys the Yjs blob, thread records and realtime groups. A client can therefore claim an id that already has leftover blobs or threads. Page-scoped authorization is also ambiguous: `pageMember` reads the page id from a path param named `:roomId`, which invites a "fix" with `roomMember` that would break the app. Tracked in GH-166.

## What Changes

- `postPage` generates the `pageId` server-side (UUID) and ignores any client-supplied `pageId`. The created page, including its `pageId`, is returned in the response.
- Rename the route param from `:roomId` to `:pageId` on all `pageMember`-guarded routes (`connect`, `GET /rooms/:roomId` room state, threads, thread answers). Client-visible URLs do not change. `pageMember` reads `req.params.pageId`.
- `pageMember` denies access when the page does not exist **or is archived**.
- Page delete stays a soft-archive. Ids are server-generated and never re-issued, so no blob or thread cleanup is needed to prevent re-claiming.
- **BREAKING**: remove `GET /{hub}/rooms` (lists the whole storage container, carries a TODO to restrict or remove). No caller in `weavejs-frontend` (`code/api/get-rooms.ts` is unused).
- Tests: creation ignores client ids; membership check denies ids without a page row and archived pages; delete remains archive.

### Rollout constraint

All four frontend create flows (`pages.grid`, `pages.list`, `use-create-page-from-template`, `use-manage-room-pages`) use the locally generated `pageId` in `onSuccess` and ignore the response. Shipping this backend first would make clients navigate to a non-existent id (403). The frontend counterpart (use the id returned by the API) must be released before, or together with, this change.

## Capabilities

### New Capabilities
- `page-ids`: page identifiers are generated and owned by the server; client-supplied ids are ignored.
- `page-access`: page-scoped routes authorize through the page id path param (`:pageId`) and the page's room membership, denying missing or archived pages.
- `room-storage-listing`: the unscoped storage listing endpoint is removed.

### Modified Capabilities

None. `openspec/specs/` is currently empty.

## Impact

- Code: `code/src/api/v1/controllers/pages/postPage.ts`, `code/src/middlewares/page-member.ts`, `code/src/api/v1/router.ts`, thread and thread-answer controllers (param name only), `getRoomsStorage.ts` (removed), `listRooms` in `storage/storage.ts` if unused afterwards.
- API: `GET /{hub}/rooms` removed; `POST .../pages` no longer honors `pageId` in the body.
- Cross-repo: `weavejs-frontend` must stop sending `pageId`, use the response id, and delete `api/get-rooms.ts`.
- Out of scope / follow-up: purge or migration of legacy orphan blobs and thread keys; mismatch between the model's composite key `(roomId, pageId)` and the migration's `pageId`-only primary key.
