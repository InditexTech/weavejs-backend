# mutating-request-origin Specification

## Purpose

Mutating API requests carrying a browser Origin or Referer are accepted only from allowed origins, as defence in depth against cross-site request forgery that cookie SameSite settings alone do not prevent.

## Requirements

### Requirement: Mutating requests must come from an allowed origin
The system SHALL reject POST, PUT, PATCH and DELETE requests to the API with 403 when the request's `Origin` header, or, if `Origin` is absent, the origin of its `Referer` header, is present and not in the configured allowed origins (`CORS_ALLOWED_ORIGINS`).

#### Scenario: Allowed origin
- **WHEN** a POST arrives with `Origin` equal to an allowed origin
- **THEN** the request proceeds to normal handling

#### Scenario: Foreign origin
- **WHEN** a POST arrives with `Origin` not in the allowed origins
- **THEN** the response is 403 and the handler does not run

#### Scenario: Referer fallback
- **WHEN** a DELETE arrives with no `Origin` and a `Referer` whose origin is not allowed
- **THEN** the response is 403

#### Scenario: Non-browser client
- **WHEN** a mutating request has neither `Origin` nor `Referer`
- **THEN** the request proceeds to normal handling

### Requirement: Safe methods are not affected
The origin check SHALL NOT apply to GET, HEAD and OPTIONS requests, and no GET route SHALL change server state.

#### Scenario: Cross-origin GET
- **WHEN** a GET arrives from a non-allowed origin
- **THEN** the origin check does not reject it (CORS response headers still govern read access)

### Requirement: No state-changing debug route
The system SHALL NOT expose `GET /{hub}/rooms/:roomId/simulate-ws-error` or any equivalent debug endpoint that simulates a websocket failure.

#### Scenario: Debug route removed
- **WHEN** a room member requests `GET /{hub}/rooms/R/simulate-ws-error`
- **THEN** the response is 404 and no room host state changes
