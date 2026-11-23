# Tasks

## 1. Realtime bus

- [x] 1.1 Add `code/src/middlewares/bus-member.ts` that calls `next()` only for `roomId === "weavejsGlobal"` (strict equality, shared constant with `comm-bus.ts`) and otherwise delegates to `roomMember`; verify with `bus-member.test.ts` covering member, non-member (403), global id, and `weavejsGlobal-x` / `WEAVEJSGLOBAL` (403)
- [x] 1.2 Add `busMember` to `GET` and `POST /{hub}/rooms/:roomId/bus/:userId` in `code/src/api/v1/router.ts` after `auth`; verify a non-member gets 403 and the controllers are not invoked, and that the token and group join still use the session user id when `:userId` differs

## 2. Export jobs

- [x] 2.1 Add `roomMember` to `POST /rooms/:roomId/export`, `/export/pdf` and `/frames/export/pdf` in `router.ts` (after `auth`, before body parsers); verify non-member 403 and member pass-through in tests
- [x] 2.2 In `postExportPageToImageAsync.ts`, `postExportRoomToPDFAsync.ts` and `postExportFramesToPDFAsync.ts` take `userId` from `req.session.user.id` (no header fallback: `internalToken` is not mounted on these routes), keep `clientId` as header; verify a test where `x-weave-user-id` is spoofed yields a job attributed to the session user

## 3. Standalone instances

- [x] 3.1 Add `instanceMember` after `auth` to the 5 `/standalone/:instanceId/images*` routes (metadata, data GET, data PUT, list, upload); verify non-member 403 and member pass-through in tests
- [x] 3.2 Add `instanceMember` to the 10 standalone thread and thread-answer routes (`.../images/:imageId/threads` and `.../answers`, GET/POST/PUT/DELETE); verify non-member 403 and member pass-through in tests
- [x] 3.3 Check the standalone frontend flow (create standalone room, join by access link) still works by confirming `postRoom` and `putRoomAccess` insert the `room_user` row; verify with a manual run or a DB-backed test

## 4. Sweep and wrap-up

- [x] 4.1 Add `roomMember` to `/json`, the 5 chats routes, `/videos` list, `simulate-ws-error` and the AI stream route; verify `router.membership.test.ts` covers each and that routes already guarded in their controllers (rooms CRUD, access-link, add-*-to-room, image-fallback, AI message) and `POST /rooms/:roomId/upload` (creates a room) are left unchanged
- [x] 4.2 Run `npm run lint` and `npm test` in `code/`; verify both pass
