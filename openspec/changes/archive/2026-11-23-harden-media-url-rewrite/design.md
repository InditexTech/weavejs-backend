## Context

`transformMediaUrl` (`code/src/canvas/weave.ts`) is the `urlTransformer` for `WeaveImageNode` and `WeaveVideoNode`. The SDK sets the returned string as `Image.src` on a skia-canvas / node-canvas image, so the renderer cannot send headers and only a URL string can carry a credential. Today the function concatenates `urlPath` into `http://localhost:<port>` (allowing `@host` authority injection and `..` traversal), appends the master `INTERNAL_SERVICE_TOKEN` as `?_token=`, passes unknown relative paths through (local-file read via the canvas backend) and trusts absolute `localhost:<port>` URLs.

The master token makes `internalToken` set `req.isInternalRequest`, which skips `auth` and `roomMember`. `internalToken` is applied to: v1 room images, videos, video placeholders, chat images; v2 room images; and `/ai/v1/mcp-rooms`. Frontend-written URLs are always `${apiEndpoint}/weavejs/rooms/{roomId}/(images|videos)/{id}[/placeholder]`; the backend mastra workflows write `${APP_HOST}/weavebff/api/v{1,2}/weavejs/rooms/...`.

Renderers run in worker threads that receive `config` (including `internalToken`) in their payload, so the signer has the key; the Express process verifies with `getServiceConfig()`.

## Goals / Non-Goals

**Goals:**
- Hostile `imageURL`/`videoURL` values cannot change the destination host, escape the allowed routes, read local files or capture the master token.
- A leaked renderer URL is useless outside its resource and a short window.

**Non-Goals:**
- Write-time validation (Yjs clients bypass it; render-time is authoritative).
- Pre-resolving images in-process, data migration, frontend changes.

## Decisions

1. **Allowlist, not blocklist.** Parse the source with `new URL(src, "http://base.invalid")` for relative inputs. Take the raw (non-decoded) pathname, reject any `%`-encoded `.`/`/`/`\` / `@`, any `\`, `//`, `..`, `.` segments and non-ASCII; then match against anchored regexes for the five media routes with id segments `[A-Za-z0-9_-]+` (UUIDs fit). Alternative: normalise and re-check a prefix. Rejected: more cases to get wrong; the legitimate set is tiny and enumerable.
2. **Build the target from a fixed origin.** `const target = new URL("http://localhost:" + port + "/")`, assign `target.pathname`, copy source query via `URLSearchParams` dropping `_t`/`_token`, set `_t`. Then assert `protocol === "http:"`, `hostname === "localhost"`, `port === String(port)` and return `""` otherwise. Defence in depth behind the allowlist.
3. **Signed scoped token `_t=<exp>.<sig>`.** `sig = base64url(HMAC-SHA256(key, "GET\n" + pathname + "\n" + exp))`, `key = HMAC(internalToken, "renderer-media-url")` so no new secret or config is needed and the master token is never sent. TTL 5 minutes (exports with many images may queue loads after the transform runs). The signed path is the post-strip service path, which equals `req.path` at the route (the app mounts routers at root; confirm when implementing). Query is not signed, since the media routes have no semantically relevant query; verification compares path only. Alternative: random per-render nonce store. Rejected: needs shared state across workers and the web process.
4. **`internalToken` middleware.** Order: header `x-internal-token` (timing-safe compare), else `_t` verification (timing-safe, expiry, path equality, GET/HEAD only). Remove `req.query._token`. Verification lives in a small helper module shared with the signer (`code/src/utils/media-token.ts`) so sign and verify cannot drift.
5. **Rule 2 removed; unknown relative rejected.** Absolute non-`/weavebff` URLs go through `assertSafeUrl` unchanged. `localhost`/`127.0.0.1` already fail `assertSafeUrl`, so removing Rule 2 closes the contradiction.
6. **Logger.** Extend `isTokenParam` to match `_t` as well as `_token` (keep `_token` stripping for old clients that may still send it).
7. **Empty-token configs.** `text-render-check` passes `internalToken: ""`, port `0`. The signer must not throw with an empty key; HMAC with an empty derived key is fine and the URL is never fetched there.

## Risks / Trade-offs

- [Breaking `?_token=`] External scripts using the query token stop working. → Header remains; call out in changelog. Assumption: renderer was the only user (user did not answer the keep-for-one-release question; default is remove).
- [Allowlist drift] A new media route used by the renderer will render blank. → Single route table next to the transformer plus a test enumerating every route guarded by `internalToken`.
- [Clock/TTL] Image loads started after the TTL would 401. → 5-minute TTL; loads begin on transform.
- [Weave SDK retries] If the SDK re-calls the transformer on retry, a fresh token is minted each time (acceptable).
- [Path equality assumption] If a proxy prefix changes `req.path` in some deployment, valid tokens fail. → Renderer always calls localhost directly; add a test through the real Express app mount.
