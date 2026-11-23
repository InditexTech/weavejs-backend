# room-access Specification

## Purpose

Room and instance scoped routes authorize the caller through membership of the room or instance named in the path, so a logged-in user cannot reach realtime channels, export jobs, or standalone content of rooms they do not belong to.

## Requirements

### Requirement: Realtime bus requires room membership
The system SHALL issue a realtime bus access token, and join a user to a room's bus group, only if the authenticated user is a member of the room identified by `:roomId`. The bus identity SHALL be the authenticated session user; the `:userId` path segment SHALL be ignored.

#### Scenario: Member negotiates the bus
- **WHEN** a member of room R calls `GET /{hub}/rooms/R/bus/<anyUserId>`
- **THEN** a token is issued for the session user, not for `<anyUserId>`

#### Scenario: Member joins the bus group
- **WHEN** a member of room R calls `POST /{hub}/rooms/R/bus/<anyUserId>`
- **THEN** the session user is added to R's bus group

#### Scenario: Non-member negotiates the bus
- **WHEN** a user who is not a member of room R calls `GET /{hub}/rooms/R/bus/<userId>`
- **THEN** the response is 403 and no token is issued

#### Scenario: Non-member joins the bus group
- **WHEN** a user who is not a member of room R calls `POST /{hub}/rooms/R/bus/<userId>`
- **THEN** the response is 403 and the user is not added to the group

### Requirement: Global bus channel is open to authenticated users
The system SHALL allow any authenticated user to negotiate and join the global bus channel, identified by the exact id `weavejsGlobal`, without room membership. No other id SHALL receive this exception.

#### Scenario: Authenticated user uses the global channel
- **WHEN** an authenticated user who belongs to no room calls the bus routes with `:roomId` equal to `weavejsGlobal`
- **THEN** the request proceeds

#### Scenario: Lookalike id
- **WHEN** a non-member calls the bus routes with `:roomId` equal to `weavejsGlobal-x` or `WEAVEJSGLOBAL`
- **THEN** the response is 403

### Requirement: Export jobs require room membership
The system SHALL start a page, room PDF or frames PDF export job only if the authenticated user is a member of the room identified by `:roomId`. The job SHALL be attributed to the session user; the `x-weave-user-id` header SHALL NOT determine attribution.

#### Scenario: Member starts an export
- **WHEN** a member of room R calls `POST /{hub}/rooms/R/export`, `/export/pdf` or `/frames/export/pdf` with a valid payload
- **THEN** a job is started attributed to the session user's id

#### Scenario: Spoofed user header
- **WHEN** a member sends `x-weave-user-id: someone-else` with an export request
- **THEN** the job is attributed to the session user, not `someone-else`

#### Scenario: Non-member starts an export
- **WHEN** a user who is not a member of room R calls any of the three export routes
- **THEN** the response is 403 and no job is started

### Requirement: Standalone routes require instance membership
The system SHALL allow a request to `/{hub}/standalone/:instanceId/...` (images, image data, image upload, threads and thread answers) only if the authenticated user is a member of the room identified by `:instanceId`.

#### Scenario: Member uses standalone images
- **WHEN** a member of instance I calls a standalone image route for I (list, upload, metadata, data GET or PUT)
- **THEN** the request proceeds

#### Scenario: Member uses standalone threads
- **WHEN** a member of instance I calls a standalone thread or thread-answer route for I
- **THEN** the request proceeds

#### Scenario: Non-member uses standalone images
- **WHEN** a user who is not a member of instance I calls any standalone image route for I
- **THEN** the response is 403

#### Scenario: Non-member uses standalone threads
- **WHEN** a user who is not a member of instance I calls any standalone thread or thread-answer route for I
- **THEN** the response is 403

### Requirement: Room-scoped content routes require room membership
The system SHALL allow room JSON export, chat (list, read, create, update, delete), video listing, store error simulation and AI chat streaming requests for `:roomId` only if the authenticated user is a member of that room.

#### Scenario: Member uses a room content route
- **WHEN** a member of room R calls one of these routes for R
- **THEN** the request proceeds

#### Scenario: Non-member uses a room content route
- **WHEN** a user who is not a member of room R calls one of these routes for R
- **THEN** the response is 403
