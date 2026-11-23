# page-access Specification

## Purpose

Page-scoped routes authorize the caller through the page identified in the path and that page's room membership, with a parameter name that states what the id is.

## Requirements

### Requirement: Page-scoped routes take the page id as :pageId
Routes that operate on a page (realtime `connect`, room state, threads and thread answers) SHALL receive the page id in a `:pageId` path parameter and authorize using that value. Request URLs seen by clients SHALL NOT change.

#### Scenario: Existing URLs keep working
- **WHEN** a client calls `GET /{hub}/rooms/<pageId>/threads`
- **THEN** the request matches the route and is authorized against `<pageId>`

### Requirement: Caller must be a member of the page's room
The system SHALL allow a page-scoped request only if the page exists, is not archived, and the authenticated user is a member of the room that owns the page.

#### Scenario: Member of the owning room
- **WHEN** a user who is a member of the page's room calls a page-scoped route with an active page id
- **THEN** the request proceeds

#### Scenario: Non-member
- **WHEN** a user who is not a member of the page's room calls a page-scoped route
- **THEN** the response is 403

#### Scenario: Id without a page row
- **WHEN** the path id matches a storage blob or thread key but no page row
- **THEN** the response is 403

#### Scenario: Archived page
- **WHEN** the path id belongs to an archived page
- **THEN** the response is 403

### Requirement: Page-scoped routes are not room-scoped
The system SHALL NOT authorize page-scoped routes by treating the path id as a room id.

#### Scenario: Page id is not a room id
- **WHEN** a user is a member of room R and calls a page-scoped route with a page id belonging to room S
- **THEN** the response is 403
