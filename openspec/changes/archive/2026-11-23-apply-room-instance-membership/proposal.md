# Proposal

## Why

Several room-scoped routes only require an authenticated session and never check that the caller belongs to the target room or instance. Any logged-in user can obtain a realtime bus token for another room's `<roomId>.commbus` group, start export jobs against another room, and read or write another instance's standalone images and threads. The membership middlewares already exist and are applied elsewhere; this change applies them consistently (GitHub issue #167).

## What Changes

- **Realtime bus**: `GET|POST /{hub}/rooms/:roomId/bus/:userId` requires room membership before a Web PubSub token is issued or the `<roomId>.commbus` group is joined. The literal id `weavejsGlobal` (the global invalidation channel used by the frontend) stays open to any authenticated user via an exact-match exception. The user id always comes from the session; `:userId` stays ignored.
- **Export jobs**: `POST /rooms/:roomId/export`, `/export/pdf` and `/frames/export/pdf` require room membership. `userId` attribution comes from the session instead of the `x-weave-user-id` header. `clientId` stays a header.
- **Standalone instances**: all `/standalone/:instanceId/images/*` routes (image metadata, image data GET/PUT, list, upload) and all standalone thread and thread-answer routes require instance membership. Standalone instances are rooms of kind `standalone` and are already registered in `room_user` by `postRoom` / `putRoomAccess`, so no data migration is needed.
- Tests per route group: non-member gets 403, member keeps working.
- **Sweep**: `roomMember` is also added to the remaining routes that had `:roomId` and no check anywhere: `GET /rooms/:roomId/json`, the five `/rooms/:roomId/chats*` routes, `GET /rooms/:roomId/videos`, `GET /rooms/:roomId/simulate-ws-error` and `GET /rooms/:roomId/ai/chats/:chatId/stream`.
- Already guarded inside their controllers and left alone: `/rooms/:roomId` GET/PUT/DELETE, `/rooms/access-link`, `add-template-to-room`, `add-image-template-to-room`, `image-fallback` GET/POST and the AI message POST. `POST /rooms/:roomId/upload` is also left alone: there `:roomId` is the name of a room that the route creates.
- Non-goal: checking that a standalone `imageId` belongs to its `instanceId`.

## Capabilities

### New Capabilities
- `room-access`: room and instance scoped routes (realtime bus, export jobs, standalone images and threads) authorize the caller through membership of the room or instance in the path.

### Modified Capabilities
<!-- none: page-access covers page-scoped routes and is unchanged -->

## Impact

- `code/src/api/v1/router.ts`: add `roomMember`, `instanceMember` and a new bus middleware to the listed routes.
- `code/src/middlewares/`: new `bus-member.ts` (allows `weavejsGlobal`, otherwise delegates to `roomMember`) with tests.
- `code/src/api/v1/controllers/postExport*.ts` (3 controllers): read `userId` from the session.
- New `node:test` files per route group.
- Behavior change: non-members now receive 403 on these routes. Existing frontend flows use real room ids for members, so no frontend change is required.
