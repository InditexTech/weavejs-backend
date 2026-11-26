# Design

## Context

See proposal.md for motivation and specs/room-retention/spec.md for the behavior. Observed constraints:

- **Database.** `weavejs_page`, `weavejs_room_user` and `weavejs_room_access` reference `weavejs_room` with `ON DELETE CASCADE`. Every other table keyed by room has **no FK to the room**: `weavejs_task`, `weavejs_image`, `weavejs_video`, `weavejs_template`, `weavejs_thread`, `weavejs_ai_chat`, `weavejs_connection`. `weavejs_thread_answer` cascades from threads and `weavejs_ai_chat_message` from chats. `weavejs_template.jobId/removalJobId` reference `weavejs_task` with `CASCADE`, while `weavejs_image` and `weavejs_video` reference `weavejs_task` **without** cascade, so deleting a task that an image or video row still references fails.
- **Ownership.** `weavejs_room_user.role` is `owner` or `user`. `weavejs_room_user.userId` has no FK to `auth."user"` and is the better-auth user id, an opaque string. `auth."user".email` is stored encrypted when `PII_ENCRYPTION_ENABLED=true`, so protection is by user ID. The frontend will display each user's own ID (InditexTech/weavejs-frontend#235); IDs differ per environment.
- **Storage.** Twelve containers: configured `rooms`, `images`, `videos`; hardcoded `generated-images`, `exported-images`, `exported-pdf`, `pages-thumbnails`, `rooms-thumbnails`, `templates-images`, `standalone-images`, `standalone-instance-image-data`, `presentation-images`. Names are keyed by `pageId` (rooms only), `roomId` (all others) or `presentationModeId` (presentation images, resolved through `weavejs_task.metadata`). `instanceId` in standalone and template routes is a `roomId`.
- **GitHub runners cannot reach storage.** The runner experiment (issue #185) proved the database is reachable from a GitHub-hosted runner with a password user, but the storage account answers `403 AuthorizationFailure` to the runner, even for a request with no credentials, so a network rule blocks it. The old `cleanup-storage` job ran inside Azure. The backend already reaches both the database and the storage account from inside Azure.
- **pg-boss in the backend.** `FEATURE_WORKLOADS=true` in `azure-develop` and `azure-pro`. `code/src/workloads/workloads.ts` creates queues with `policy: "singleton"`, registers handlers with `boss.work`, renews the database token by swapping pg-boss instances, and calls `boss.clearStorage()` on every boot, so queued jobs do not survive a restart and schedules would need to be re-registered. Active jobs expire after 15 minutes unless the queue sets a longer expiry.
- **Machine token precedent.** `middlewares/internal-token.ts` compares an `x-internal-token` header in constant time. `INTERNAL_SERVICE_TOKEN` is also the key that signs media URLs, so it is too powerful to hand to GitHub.
- **Existing core.** `code/src/actions/room-retention/` already implements selection, owner protection, per-room deletion, live set, container mapping, sweep and safeguards over small interfaces (`Queryable`, `TransactionalPool`, `BlobStore`), with unit and integration tests and a local CLI.
- **Production size.** About 300 rooms in `azure-pro`.

## Goals / Non-Goals

**Goals:**
- Delete expired, unprotected rooms atomically in the database and clean all their blobs, from where both are reachable.
- Keep the protected lists in GitHub variables, editable without a backend deploy.
- Make wrong configuration fail closed, not delete data.

**Non-Goals:**
- Age-based expiry of presentation images or other data inside rooms that survive.
- Changing how rooms are created, archived, or authorized.
- A UI to manage protected lists.
- Distributed blob-and-database atomicity. The design tolerates orphans instead.
- Scheduling inside pg-boss. GitHub stays the scheduler and the alerting channel.

## Decisions

- **Run in the deployed backend, scheduled from GitHub.** The runner cannot reach storage, the backend can. Alternatives: a Container Apps job (new infra, new image, config in Azure), a self-hosted runner (infra). The backend needs no new infrastructure.
- **Keep the core in `code/src/actions/room-retention/` and add thin backend wiring.** The core stays pure over its interfaces and keeps the local CLI (`npm run retention:run`) for dry runs against a local database. New code lives in `code/src/workloads/jobs/room-retention/` (one class that owns both queues, plus the deps built from the app's configuration), and in `code/src/api/v3/controllers/` with the routes in the v3 router, which is mounted only when workloads are enabled.
- **Two chained pg-boss queues**, `room-retention` and `blob-sweep`, both `policy: "singleton"` with a long expiry (hours). The database job, on success, enqueues the sweep with the same configuration. The configuration travels in the job data. The result summary is stored with `boss.complete(queue, id, output)` and read back for the status endpoint. A failed database job does not enqueue the sweep. `weavejs_task` is not used: it requires a room and is meant for per-room user tasks.
- **Database access through the app's Sequelize connection.** An adapter implements `Queryable` and `TransactionalPool` on top of the existing connection manager (raw queries, and a dedicated raw connection per room for `BEGIN`/`COMMIT`). This reuses the app's credentials and token renewal. Alternative: a second `pg` pool in the job, which would duplicate the token logic. To be confirmed in a task that the Sequelize version exposes what the adapter needs.
- **Blob access through the app's storage settings.** A `BlobStore` built from the existing storage configuration (account name with `DefaultAzureCredential`, or connection string), as the persistence handlers do.
- **Authenticated trigger.** `POST /api/v3/{hub}/retention/runs` starts a run and `GET /api/v3/{hub}/retention/runs/:runId` returns the state and summary. They are reached through the frontend proxy, so the workflow calls `${APP_HOST}/weavebff/api/v3/${hub}/retention/runs` with the hub name from `AZURE_WEB_PUBSUB_HUB_NAME`. Both require header `x-retention-token`, compared in constant time against a dedicated `RETENTION_TRIGGER_TOKEN` (new field in the service config). When it is empty, the routes answer 404. The routes sit outside the session middleware, behind the existing IP rate limit. Alternative: reuse `INTERNAL_SERVICE_TOKEN`; rejected because it also signs media URLs.
- **Configuration in the request body**, validated with a schema: protected rooms and user IDs (arrays), limits, grace hours, `dryRun` (defaults to true). Unknown fields and invalid values are rejected with 400. This keeps GitHub variables as the source of truth, with no backend deploy to change a list. The token holder can therefore choose the lists and limits; that is the same power as holding the token.
- **Selection entirely in SQL.** Candidates: `SELECT "roomId" FROM weavejs_room WHERE "createdAt" < cutoff AND "roomId" <> ALL(protectedRooms)`. Owner protection: a room is dropped if `weavejs_room_user` has a row with `role = 'owner'` and `"userId" = ANY(protectedUserIds)`. The match is on the membership row, so it holds even if the account was deleted.
- **Reporting.** Only counts are logged and returned (`protected user ids`, `without a user`). A listed ID that matches no row in `auth."user"` is counted, since it is most likely a typo.
- **Per-room transaction.** For each eligible room: `BEGIN`, `SELECT ... FROM weavejs_room WHERE roomId = $1 FOR UPDATE SKIP LOCKED`, re-check `createdAt`, then delete in FK-safe order: `weavejs_image` and `weavejs_video` rows of the room, then `weavejs_template`, `weavejs_task`, `weavejs_thread`, `weavejs_ai_chat`, `weavejs_connection`, finally `weavejs_room` (which cascades pages, `weavejs_room_user`, `weavejs_room_access`), then `COMMIT`. Images and videos go before tasks because their `jobId` FKs do not cascade. Each room is its own transaction so one failure affects one room.
- **Schema guard.** Before selecting anything, the job lists every table in `public` with a `roomId` column and aborts if one is not in the delete list, so a table added later cannot be left behind silently. Verified FK actions on a migrated schema: `weavejs_page`, `weavejs_room_user`, `weavejs_room_access` -> room `CASCADE`; `weavejs_thread_answer` -> thread and `weavejs_ai_chat_message` -> chat `CASCADE`; `weavejs_template.jobId/removalJobId` -> task `CASCADE`; `weavejs_image` and `weavejs_video` `jobId/removalJobId` -> task `NO ACTION`; `weavejs_task`, `weavejs_thread`, `weavejs_ai_chat`, `weavejs_connection`, `weavejs_image`, `weavejs_video`, `weavejs_template` have no FK to the room.
- **Database first, blobs after (reconcile sweep).** Blobs are deleted by comparing storage to the database, not per room. Operations are idempotent and a failure, or a restart that empties pg-boss, only leaves orphans for the next run.
- **Live set built after the database phase.** `roomIds` from `weavejs_room`, `pageIds` from `weavejs_page`, `presentationModeIds` from `weavejs_task` rows of type `presentationMode`. Protected rooms and owners need no special blob rule: their rows stay, so their keys stay live.
- **Container-to-key table** drives the sweep: `rooms` blobs key on the name with a `-image-fallback` suffix stripped; `presentation-images` keys on the first path segment against `presentationModeIds`; every other container keys on the first path segment (or the whole name for `rooms-thumbnails`) against `roomIds`. A blob is deleted only if its key is in no live set, not in the protected rooms list, and it was neither created nor modified within the grace period (default 24 hours); a blob with no timestamps is kept.
- **Safeguards.** Abort before any deletion if the DB read fails, if there are no rooms, if rooms to delete exceed the room limit, or if blobs to delete exceed the blob limit or the blob percentage. Dry run reports and deletes nothing, and is the default when the request omits it.
- **Workflow: trigger and poll.** `.github/workflows/code-room-retention.yml` keeps `schedule: 0 */4 * * *`, `workflow_dispatch`, the `plan` job and the matrix over `azure-develop` and `azure-pro`, and `concurrency: room-retention` with `cancel-in-progress: false`. Each matrix job runs `.github/scripts/room-retention-run.sh`, which builds the JSON body from the GitHub variables with `jq` (nothing is interpolated into the script text), sends the token through a curl config so it never shows in a process list, `POST`s to the backend, polls the status endpoint until completed, failed or a timeout (a few hours), prints the summary, and fails otherwise. It has `permissions: contents: read` and needs no Azure login, no database or storage settings. A 409 (a run is already in progress), a 404 while polling (the run was lost, usually a restart), and a run that reports failures all fail the workflow. The failure-alert and keep-alive jobs stay.
- **Configuration.** GitHub environment variables, sent in the body: `RETENTION_PROTECTED_ROOMS`, `RETENTION_PROTECTED_USER_IDS`, `RETENTION_DRY_RUN`, `RETENTION_MAX_ROOMS_TO_DELETE`, `RETENTION_MAX_BLOBS_TO_DELETE`, `RETENTION_MAX_BLOBS_PERCENT`, `RETENTION_BLOB_GRACE_HOURS`; `APP_HOST` already exists. GitHub secret `RETENTION_TRIGGER_TOKEN` (a different value per environment), also written to the backend `.env` by `code-deploy.yml`. The lists are variables because they hold only opaque IDs.
- **Retire `cleanup-storage/`** with its workflow and the `storage:cleanup` script after the new job has run for real. Two cleanup mechanisms with different rules are a hazard. The remaining leftovers are in issue #190.

## Risks / Trade-offs

- [A trigger endpoint on the public URL can delete data] -> dedicated token compared in constant time, endpoint off when unset, IP rate limit, dry run by default, abort limits.
- [The app's database identity has broader rights than a dedicated user] -> the deletes use a fixed, tested statement list and the schema guard; the endpoint is the only entry point.
- [Wrong database or empty live set marks all blobs as orphans] -> abort on no rooms, blob-count and percentage limits, and a dry-run period.
- [First run deletes years of accumulated data] -> dry-run first, review counts and sample names, raise limits deliberately.
- [The backend restarts during a run, and pg-boss storage is cleared on boot] -> room deletions are per-room transactions and the sweep is idempotent; the next trigger repeats whatever was left, and the workflow reports the interrupted run as failed.
- [A long job in the API process] -> it is mostly I/O; blobs are listed as a stream; a long queue expiry prevents pg-boss from failing it at 15 minutes.
- [Removing a name from the protected lists mass-deletes at the next run] -> abort threshold, and documented behavior.
- [A missed table or FK in the delete order makes room deletion fail] -> per-room transaction rolls back, the failure is reported, and the schema guard aborts on unknown tables.
- [A blob is uploaded just before its database row commits] -> the grace period.
- [Presentation images are keyed through tasks, so keeping a task keeps its images] -> accepted; same lifetime as the room.
- [A protected user's ID is wrong or differs per environment] -> unmatched IDs are reported in every summary.
- [GitHub disables the schedule after 60 days of inactivity] -> keep-alive and failure alerting.
- [The backend is down or mid-deploy when the workflow triggers] -> the workflow fails and alerts; the next trigger retries.

## Migration Plan

1. Build the backend wiring and the workflow behind the token. With no `RETENTION_TRIGGER_TOKEN` set, the endpoints are disabled, so merging changes nothing.
2. Create `RETENTION_TRIGGER_TOKEN` in both environments, add it to the deploy `.env`, and deploy the backend to `azure-develop`.
3. Run the workflow manually on `azure-develop` with `DRY_RUN=true` and review the summary. Correct the protected lists, whose IDs differ per environment.
4. Repeat on `azure-pro`, then tune the limits against the dry-run counts.
5. Run the real deletion once manually on `azure-develop`, then `azure-pro`.
6. Turn on the schedule with dry-run off per environment.
7. Retire `cleanup-storage/` after confirming nothing runs it, and complete issue #190.
8. Rollback: set `RETENTION_DRY_RUN=true`, remove the token, or disable the workflow. Deleted data is not recoverable, so rely on dry-run, limits and database backups.

## Open Questions

- Does the backend's database identity have DELETE on every table in the delete list? Resolve in the first dry run followed by a real run on `azure-develop`; a missing right shows up as a failed room, not as data loss.
- Does anything currently run the `cleanup-storage` image? Ask infra; it must be disabled before the first real run.
- Are there Azure lifecycle rules on any of the twelve containers? Informational, does not change the design.
- Final values of the limits and the grace period (defaults: 50 rooms, 5000 blobs, 50%, 24 hours). Tune from dry-run output.
