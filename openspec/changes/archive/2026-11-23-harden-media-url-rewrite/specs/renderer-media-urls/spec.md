# Spec Delta

## Purpose

Defines how the server-side renderer turns persisted media URLs into fetchable URLs and how it authenticates to the service, so a hostile URL stored in a room can never redirect the renderer or leak credentials.

## ADDED Requirements

### Requirement: Renderer only rewrites known media routes
The renderer SHALL map a persisted media URL to an internal service URL only if its path, after URL parsing and normalisation, matches one of the known media routes under the `/weavebff` prefix: room images (`/api/v1|v2/weavejs/rooms/{roomId}/images/{imageId}`), room videos (`/api/v1/weavejs/rooms/{roomId}/videos/{videoId}`), video placeholders (`.../videos/{videoId}/placeholder`) and chat images (`/api/v1/weavejs/rooms/{roomId}/chats/{chatId}/images/{imageId}`). Identifier segments SHALL be restricted to safe id characters. The origin of an absolute URL SHALL be ignored for matching. Any other URL under `/weavebff` SHALL resolve to an empty string.

#### Scenario: Relative media path
- **WHEN** the source is `/weavebff/api/v1/weavejs/rooms/R/images/I`
- **THEN** the result targets `http://localhost:<port>/api/v1/weavejs/rooms/R/images/I`

#### Scenario: Public absolute URL
- **WHEN** the source is `https://prod.example.com/weavebff/api/v2/weavejs/rooms/R/images/I?w=100`
- **THEN** the result targets the same path on `localhost:<port>` and keeps the `w=100` query

#### Scenario: Unknown route under the prefix
- **WHEN** the source is `/weavebff/api/v1/weavejs/rooms/R/members`
- **THEN** the result is an empty string

#### Scenario: Prefix lookalike
- **WHEN** the source is `/weavebffoo/api/v1/weavejs/rooms/R/images/I`
- **THEN** the result is an empty string

### Requirement: Rewritten URLs never leave the internal service
The renderer SHALL build the rewritten URL so that its protocol is `http:`, its hostname is `localhost` and its port is the service port, and SHALL return an empty string if any of these does not hold. Authority-altering syntax in the source (`@`, encoded `@`, backslashes, `//`, dot segments, encoded dot segments or slashes) SHALL NOT change the host or escape the allowed routes.

#### Scenario: Userinfo injection
- **WHEN** the source is `/weavebff@evil.example/x` or `http://x/weavebff@evil.example/`
- **THEN** the result is an empty string

#### Scenario: Encoded injection
- **WHEN** the source is `/weavebff%40evil.example/` or contains `%2e%2e` or `%2f` in the path
- **THEN** the result is an empty string

#### Scenario: Dot-segment traversal
- **WHEN** the source is `/weavebff/api/v1/weavejs/rooms/R/images/../../../../../ai/v1/mcp-rooms`
- **THEN** the result is an empty string

#### Scenario: Port mismatch
- **WHEN** the service port is `3000` and the rewrite would produce any other port
- **THEN** the result is an empty string

### Requirement: Unknown sources are rejected
The renderer SHALL return an empty string for a relative source that is not a recognised media path, so it is never handed to the canvas backend as a filesystem path. An absolute source that is not a recognised `/weavebff` media URL SHALL pass the SSRF guard or resolve to an empty string. Absolute URLs targeting `localhost` or `127.0.0.1` SHALL be rejected unless they match a known media route under the `/weavebff` prefix.

#### Scenario: Filesystem-like path
- **WHEN** the source is `/etc/passwd.png` or `assets/logo.png`
- **THEN** the result is an empty string

#### Scenario: Own localhost URL
- **WHEN** the source is `http://localhost:<port>/api/v1/weavejs/rooms/R/images/I`
- **THEN** the result is an empty string

#### Scenario: Public external URL
- **WHEN** the source is `https://cdn.example.com/a.png`
- **THEN** the result is the unchanged URL

#### Scenario: Private address
- **WHEN** the source is `http://10.0.0.5/a.png`
- **THEN** the result is an empty string

### Requirement: Renderer requests carry a scoped short-lived credential
A rewritten URL SHALL authenticate with a signed token in the `_t` query parameter that is bound to the HTTP method `GET`, the exact request path and an expiry time. The master internal token SHALL NOT appear in any rewritten URL. Any `_t` or `_token` parameter present in the source URL SHALL be discarded.

#### Scenario: Token in rewritten URL
- **WHEN** a media URL is rewritten
- **THEN** the result has a `_t` parameter and no `_token` parameter, and does not contain the master token

#### Scenario: Source supplies its own token
- **WHEN** the source query contains `_token=abc` or `_t=abc`
- **THEN** those parameters are absent from the result and a freshly signed `_t` is present

### Requirement: Scoped token is accepted only for its own resource
The service SHALL treat a request as internal when it carries a `_t` whose signature is valid, whose expiry has not passed and whose signed path equals the request path. A token for one path SHALL NOT authorise any other path, method or an `/ai/v1/mcp-rooms` request. The service SHALL NOT accept the master token in a `?_token=` query parameter. The `x-internal-token` header with the master token SHALL remain accepted.

#### Scenario: Valid token
- **WHEN** `GET /api/v1/weavejs/rooms/R/images/I?_t=<valid>` is sent with a token signed for that path
- **THEN** the request is treated as internal and no session or room membership is required

#### Scenario: Token reused on another path
- **WHEN** a token signed for room R image I is sent to room S image J or to `/ai/v1/mcp-rooms`
- **THEN** the request is not treated as internal

#### Scenario: Expired or tampered token
- **WHEN** `_t` is expired, has an altered signature or an altered expiry
- **THEN** the request is not treated as internal

#### Scenario: Master token in query string
- **WHEN** a request carries `?_token=<master token>`
- **THEN** the request is not treated as internal

#### Scenario: Header credential
- **WHEN** a request carries `x-internal-token` equal to the master token
- **THEN** the request is treated as internal

### Requirement: Scoped tokens are not logged
The HTTP logger SHALL omit the `_t` query parameter from logged URLs, as it does the legacy token parameter.

#### Scenario: Logged request
- **WHEN** a request with `_t=<value>` is logged
- **THEN** the logged URL contains no `_t` parameter and no signature value
