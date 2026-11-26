# Proposal

## Why

Rooms and everything attached to them (pages, tasks, images, videos, templates, threads, AI chats, and blobs in twelve storage containers) are never hard-deleted. The only cleanup is `cleanup-storage/`, a blob-only job with no age check, a stale hardcoded whitelist, and coverage of just two containers. It ran inside Azure, never from GitHub. Production already holds hundreds of rooms. Issue #185 asks that rooms older than 7 days be hard-deleted, with protected rooms and protected owners.

A first attempt ran the job on a GitHub-hosted runner. The database was reachable, but the storage account refuses the runner: even a request with no credentials gets `403 AuthorizationFailure`, which is a network rule and not a credential or role problem. The deployed backend already reaches both the database and storage from inside Azure, and already runs background jobs on pg-boss in `azure-develop` and `azure-pro`. So the job runs in the backend, and GitHub only schedules it.

## What Changes

- Add a room retention job that runs **inside the deployed backend** as two chained pg-boss tasks: first the database deletion of rooms whose `createdAt` is more than 7 days old, then a sweep of orphaned blobs.
- A scheduled GitHub Actions workflow (every 4 hours, plus manual dispatch) starts a run by calling an **authenticated endpoint** of the backend with a dedicated token, waits for the result through a status endpoint, and fails and alerts if the run fails.
- A room is protected, and left fully untouched, if its `roomId` is on a protected rooms list or if any of its **owners** is on a protected users list. Users are identified by their user ID (opaque, so safe in a GitHub variable and in logs). Both lists stay in GitHub Actions environment variables and are sent with each request, so they change without a backend deploy. The frontend will show each user their own ID (InditexTech/weavejs-frontend#235).
- Delete each eligible room and all of its database rows in one transaction, in an order that respects the existing foreign keys.
- Sweep blobs across all twelve storage containers and delete those whose owning room, page or presentation is no longer in the database, subject to the protected rooms list and a grace period.
- Add safeguards: dry run by default, abort on a failed or empty database read, abort thresholds on the number of rooms and blobs to delete, a single run at a time, and a failure alert.
- Retire `cleanup-storage/` and the dead `storage:cleanup` script. Other leftovers from the runner experiment are tracked in issue #190.
- Out of scope: age-based cleanup of presentation images in rooms that still exist, UI changes, and any change to how rooms are created or archived.

## Capabilities

### New Capabilities
- `room-retention`: when rooms become eligible for hard deletion, how protection by room and by owner works, what is deleted from the database and storage, how a run is started, serialized and observed, and the safeguards around it.

### Modified Capabilities
<!-- None. Existing room and page access specs are unchanged. -->

## Impact

- Reused core in `code/src/actions/room-retention/` (selection, owner protection, deletion, live set, container mapping, sweep, safeguards). It stays usable as a local command for dry runs.
- New backend code: two pg-boss jobs registered in the workloads module, an adapter that gives the core the app's database connection and storage client, a request-configuration schema, a token middleware, and two endpoints (start and status).
- New secret `RETENTION_TRIGGER_TOKEN`, one value per environment, in GitHub and in the backend's runtime `.env` written by `code-deploy.yml`. The endpoint is disabled while it is unset.
- The workflow `.github/workflows/code-room-retention.yml` becomes a trigger-and-poll workflow. It needs only `APP_HOST` and the token: no Azure login, no database or storage settings, no runner database user.
- The backend's own database identity performs the deletes, so it needs DELETE on all room-related tables.
- Removes `cleanup-storage/`, its deploy workflow, and the `storage:cleanup` script; follow-up cleanup in #190.
- Destructive in production: the first runs must be dry runs, and the abort thresholds must be tuned against the roughly 300 existing rooms.
