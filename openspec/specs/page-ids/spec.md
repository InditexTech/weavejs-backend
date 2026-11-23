# page-ids Specification

## Purpose

Page identifiers are owned by the server. Clients cannot choose, claim or reuse a page id, which prevents taking over ids that already key storage blobs, threads or realtime groups.

## Requirements

### Requirement: Server generates page ids
The system SHALL generate the `pageId` of every new page on the server as a UUID. Any `pageId` supplied in the create-page request body SHALL be ignored.

#### Scenario: Client sends its own pageId
- **WHEN** a room member sends `POST /rooms/:roomId/pages` with `pageId: "abc"` in the body
- **THEN** the page is created with a server-generated UUID that is not `"abc"`
- **AND** the response is 201 and contains the generated `pageId`

#### Scenario: Client omits pageId
- **WHEN** a room member sends `POST /rooms/:roomId/pages` without a `pageId`
- **THEN** the page is created with a server-generated UUID and the response contains it

#### Scenario: Legacy id format
- **WHEN** a client sends a legacy-format id such as `<roomId>-<uuid>`
- **THEN** it is ignored like any other client-supplied id

### Requirement: Generated id is used consistently
The system SHALL use the generated `pageId` for the page record, template materialization, the returned page and the `pageCreated` events broadcast globally and to the room.

#### Scenario: Events carry generated id
- **WHEN** a page is created
- **THEN** both `pageCreated` broadcasts carry the generated `pageId`, not any client-supplied value

### Requirement: Page deletion keeps ids reserved
The system SHALL keep page deletion as a soft archive. An archived page's id SHALL NOT be re-issued to any new page.

#### Scenario: Delete archives
- **WHEN** a room member deletes a page
- **THEN** the page status becomes `archived` and the row is retained

#### Scenario: New pages never reuse ids
- **WHEN** any new page is created after another was archived
- **THEN** its id differs from every existing page id, archived or not
