# Proposal

## Why

The server-side renderer rewrites media URLs in `canvas/weave.ts` (`transformMediaUrl`) by concatenating the stripped path into `http://localhost:<port>` and appending the master `INTERNAL_SERVICE_TOKEN` as `?_token=`. A crafted `imageURL` such as `/weavebff@evil.com/x` changes the URL authority, so the renderer fetches `evil.com` and sends it the master token. That token bypasses `auth` and `roomMember` on image/video routes of every room and on `/ai/v1/mcp-rooms`. Hostile URLs can reach the renderer through client-written Yjs attributes, user-uploaded room documents and template image sources, and any export job (page image, PDF, presentation, thumbnail) triggers the fetch. Other branches also pass untrusted values through: unknown relative paths reach the canvas backend as filesystem paths, and `..` segments escape the `/weavebff` API surface.

## What Changes

- Parse media URLs once and accept only a strict allowlist of known media routes (the routes guarded by `internalToken`: room images v1/v2, room videos and placeholders, chat images). Anything else resolves to `""`.
- Build the internal target from `new URL("http://localhost:<port>/")`, set the path through `pathname`, merge the query through `URLSearchParams`, and assert `protocol`, `hostname` and `port` before returning it.
- Reject unknown relative paths instead of passing them through. **BREAKING** for any non-`/weavebff` relative image source (none known).
- Remove the "absolute URL to own localhost" branch. **BREAKING** for any persisted `localhost:<port>` URL (none known). All remaining absolute URLs go through `assertSafeUrl`.
- Replace `?_token=<master>` with a short-lived `?_t=<exp>.<sig>` token: an HMAC over method and exact path, keyed by a value derived from the internal token. It is valid for one resource and expires in minutes.
- `internalToken` middleware accepts `_t` (valid signature, matching path, not expired) and no longer accepts `?_token=`. **BREAKING** for external callers using `?_token=`. The `x-internal-token` header stays for the MCP client.
- Redact `_t` in the HTTP logger.
- Regression tests for hostile and legitimate inputs, and for token verification.

Non-goals: write-time validation of persisted URLs (clients can bypass it, render-time is the gate), migration of existing data, frontend changes, pre-resolving images in-process.

## Capabilities

### New Capabilities
- `renderer-media-urls`: how the server-side renderer maps persisted media URLs to fetchable URLs, and how renderer-to-service requests are authenticated.

### Modified Capabilities

## Impact

- `code/src/canvas/weave.ts` (`transformMediaUrl`), `code/src/middlewares/internal-token.ts`, `code/src/middlewares/http-logger.ts`, a new signing helper and tests.
- Routes guarded by `internalToken` (images, videos, placeholders, chat images, `/ai/v1/mcp-rooms`) gain scoped-token acceptance; `?_token=` stops working.
- Callers of `renderWeaveRoom` (export workers, `text-render-check`) keep their signature. `text-render-check` uses port `0` and an empty token and must still work.
- No database, storage or frontend change.
