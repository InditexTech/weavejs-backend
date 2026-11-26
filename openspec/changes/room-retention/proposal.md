# Proposal

## Why

Rooms and everything attached to them (pages, tasks, images, videos, templates, threads, AI chats, and blobs in twelve storage containers) are never hard-deleted. The only cleanup is `cleanup-storage/`, a blob-only job with no age check, a stale hardcoded whitelist, and coverage of just two containers, with no known scheduler. Production already holds hundreds of rooms. Issue #185 asks that rooms older than 7 days be hard-deleted, with protected rooms and protected owners. The probe change proved a GitHub Actions workflow can reach and write to the databases of `azure-develop` and `azure-pro`.

## What Changes

- Add a room retention job, run by a GitHub Actions workflow on a 4-hour cron and on manual dispatch, that hard-deletes rooms whose `createdAt` is more than 7 days old.
- A room is protected, and left fully untouched, if its `roomId` is on a protected rooms list or if any of its **owners** is on a protected users list. Both lists, the users identified by email, live in GitHub Actions environment variables, never in git. Because `auth."user".email` is stored encrypted, the job decrypts owner emails to match them.
- Delete each eligible room and all of its database rows in one transaction, in an order that respects the existing foreign keys.
- After the database phase, sweep blobs across all twelve storage containers and delete those whose owning room, page or presentation is no longer in the database, subject to the protected rooms list and a grace period.
- Add safeguards: `DRY_RUN`, abort on a failed or empty database read, an abort threshold on the number of rooms and blobs to delete, a concurrency lock, and a failure alert.
- Retire `cleanup-storage/` and the dead `storage:cleanup` script.
- Out of scope: age-based cleanup of presentation images in rooms that still exist, UI changes, and any change to how rooms are created or archived.

## Capabilities

### New Capabilities
- `room-retention`: when rooms become eligible for hard deletion, how protection by room and by owner works, what is deleted from the database and storage, and the safeguards around the scheduled job.

### Modified Capabilities
<!-- None. Existing room and page access specs are unchanged. -->

## Impact

- New code in `code/src/actions/room-retention/` (database access, owner email decryption, blob sweep), reusing `code/src/lib/pii`, the database config used by `pii:backfill`, and the Azure Blob SDK.
- New workflow `.github/workflows/code-room-retention.yml` with cron, `workflow_dispatch`, a concurrency group, and Azure OIDC login for blob access. The probe workflow stays as a connectivity check.
- New environment secrets and variables for `azure-develop` and `azure-pro`: protected rooms, protected owner emails, PII keys, dry-run and threshold settings. The existing `ACTIONS_DATABASE_*` user needs DELETE on all room-related tables.
- Removes `cleanup-storage/`, its deploy workflow, and the `storage:cleanup` script from `code/package.json`.
- Destructive in production: the first runs must be `DRY_RUN`, and the abort threshold must be tuned against the roughly 300 existing rooms.
