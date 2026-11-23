## 1. Scoped media token

- [x] 1.1 Add `code/src/utils/media-token.ts` with `signMediaToken(internalToken, path, ttlMs?)` and `verifyMediaToken(internalToken, token, path)` (HMAC-SHA256, derived key, `timingSafeEqual`, expiry check, empty-key safe)
- [x] 1.2 Unit tests: valid, expired, tampered sig, tampered exp, wrong path, malformed input, empty key

## 2. Middleware and logging

- [x] 2.1 Update `code/src/middlewares/internal-token.ts`: keep `x-internal-token` (timing-safe), accept valid `_t` for GET/HEAD on its own `req.path`, drop `req.query._token`
- [x] 2.2 Update `code/src/middlewares/http-logger.ts` to also strip `_t`
- [x] 2.3 Tests: header accepted, valid `_t` accepted, wrong path/mcp-rooms rejected, expired rejected, `?_token=` rejected, logger omits `_t`

## 3. Transformer rewrite

- [x] 3.1 Add a media route table (images v1/v2, videos, placeholders, chat images) in `code/src/canvas/` and verify it covers every `internalToken` media route in `api/v1/router.ts` and `api/v2/router.ts`
- [x] 3.2 Rewrite `transformMediaUrl` in `code/src/canvas/weave.ts`: parse, reject unsafe syntax, allowlist match, build via fixed-origin `URL` + `pathname` + `URLSearchParams`, drop incoming `_t`/`_token`, sign `_t`, assert protocol/host/port
- [x] 3.3 Reject unknown relative paths; remove the own-localhost branch; keep absolute external URLs on `assertSafeUrl`
- [x] 3.4 Update the function doc comment to the new rules
- [x] 3.5 Regression tests (`node:test`): `/weavebff@host/`, `http://x/weavebff@host/`, `/weavebff%40host/`, `/weavebff/../x`, encoded dot segments, `\`, `//host`, `/weavebffoo`, `/etc/passwd.png`, own-localhost absolute, private IP, `data:`/`file:`; plus legitimate image, video, placeholder and chat-image paths with relative and public absolute origins, query preservation and incoming `_token` stripping

## 4. Integration checks

- [x] 4.1 Confirm `text-render-check` (port 0, empty token) still renders
- [x] 4.2 Confirm an export render end-to-end fetches a room image through the signed URL (real Express mount, `req.path` equals signed path)
- [x] 4.3 Run `npm run lint` and `npm test` in `code/`
- [x] 4.4 Add a CHANGELOG note: `?_token=` query credential removed (**BREAKING**), unknown relative image sources now rejected
