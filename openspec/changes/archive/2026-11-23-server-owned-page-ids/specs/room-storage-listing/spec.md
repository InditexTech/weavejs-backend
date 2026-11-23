# Spec Delta

## Purpose

The API does not expose an unscoped listing of the whole storage container, so callers cannot enumerate other users' room and page blobs.

## ADDED Requirements

### Requirement: No unscoped storage listing
The system SHALL NOT expose `GET /{hub}/rooms` or any other endpoint that lists storage blobs without scoping to the caller.

#### Scenario: Listing endpoint removed
- **WHEN** an authenticated client calls `GET /{hub}/rooms`
- **THEN** the response is 404

#### Scenario: Room list is unaffected
- **WHEN** an authenticated client calls `GET /rooms`
- **THEN** it still returns the rooms the user can access
