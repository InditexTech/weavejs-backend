# Tasks

## 1. Server-generated page ids

- [x] 1.1 In `code/src/api/v1/controllers/pages/postPage.ts`, stop reading `pageId` from the body and generate `crypto.randomUUID()`; use it for `createPage`, template materialization, `getPageIndex`, both `pageCreated` broadcasts and the response. Verify with a test that a body `pageId` is ignored and the response contains a different UUID.
- [x] 1.2 Remove the "Page already exists" pre-check and the swallow-and-refetch `catch` that depended on a client id; return 500 on creation failure. Verify with a test that a creation error yields 500.
- [x] 1.3 Add a test that `DELETE .../pages/:pageId` sets `status: "archived"` and retains the row. Run `npm test` in `code/` and verify it passes.

## 2. Page-scoped authorization

- [x] 2.1 Change `pageMember` to read `req.params.pageId` and reject pages whose `status` is `archived` with 403. Verify with unit tests: member allowed; non-member 403; no page row 403; archived 403; page of another room 403.
- [x] 2.2 In `code/src/api/v1/router.ts`, rename `:roomId` to `:pageId` on every `pageMember`-guarded route (`connect`, room state, threads, thread answers). Verify with a grep that no `pageMember` route still uses `:roomId` and that URLs are textually unchanged apart from the param name.
- [x] 2.3 Update `getRoomConnect.ts`, `getRoomStorage.ts` and the thread and thread-answer controllers (`getThreads`, `getThread`, `postThread`, `putThread`, `delThread`, `getThreadAnswers`, `getThreadAnswer`, `postThreadAnswer`, `putThreadAnswer`, `delThreadAnswer`) to read `req.params.pageId`. Verify with `npx tsc --noEmit` and a grep showing no remaining `req.params.roomId` reads on those routes.

## 3. Remove unscoped storage listing

- [x] 3.1 Remove the `GET /{hub}/rooms` route and import from `router.ts` and delete `controllers/getRoomsStorage.ts`; remove `listRooms` from `storage/storage.ts` if unused. Verify with `npx tsc --noEmit` and a test or grep confirming `GET /{hub}/rooms` is not registered while `GET /rooms` is.

## 4. Integration and release checks

- [x] 4.1 Run lint, type check and `npm test` in `code/`; verify all pass.
- [x] 4.2 Add release notes to `CHANGELOG.md` covering the removed endpoint and the frontend-first rollout order, and verify they match the proposal.
