# Design

## Context

See proposal.md for motivation and specs/room-retention/spec.md for the behavior. Observed constraints:

- **Database.** `weavejs_page`, `weavejs_room_user` and `weavejs_room_access` reference `weavejs_room` with `ON DELETE CASCADE`. Every other table keyed by room has **no FK to the room**: `weavejs_task`, `weavejs_image`, `weavejs_video`, `weavejs_template`, `weavejs_thread`, `weavejs_ai_chat`, `weavejs_connection`. `weavejs_thread_answer` cascades from threads and `weavejs_ai_chat_message` from chats. `weavejs_template.jobId/removalJobId` reference `weavejs_task` with `CASCADE`, while `weavejs_image` and `weavejs_video` reference `weavejs_task` **without** cascade, so deleting a task that an image or video row still references fails.
- **Ownership.** `weavejs_room_user.role` is `owner` or `user`. `weavejs_room_user.userId` has no FK to `auth."user"`.
- **Encrypted emails.** With `PII_ENCRYPTION_ENABLED=true`, `auth."user".email` is stored as `enc:<keyId>:d:<iv>:<ct>:<tag>`; every user in both environments is encrypted. `code/src/lib/pii/crypto.ts` can decrypt it with `PII_ENCRYPTION_KEYS` (all keys), with context `user.email`.
- **Storage.** Twelve containers: configured `rooms`, `images`, `videos`; hardcoded `generated-images`, `exported-images`, `exported-pdf`, `pages-thumbnails`, `rooms-thumbnails`, `templates-images`, `standalone-images`, `standalone-instance-image-data`, `presentation-images`. Names are keyed by `pageId` (rooms only), `roomId` (all others) or `presentationModeId` (presentation images, resolved through `weavejs_task.metadata`). `instanceId` in standalone and template routes is a `roomId`. Containers are auto-created on first use.
- **Existing precedent.** `code/src/actions/pii-backfill/action.ts` is a standalone script that opens a `pg` pool from `config/config.cjs`, supports password or cloud-token auth, and reuses `src/lib/pii`.
- **Probe results (issue #185).** From GitHub-hosted runners, the dedicated `ACTIONS_DATABASE_*` user can log in and read/delete in `azure-develop` and `azure-pro`. Production has ~300 rooms.
- **Old job.** `cleanup-storage/` handles only `rooms` and `images`, with no age check.

## Goals / Non-Goals

**Goals:**
- Delete expired, unprotected rooms atomically in the database and clean all their blobs.
- Make protection by room and by owner reliable with encrypted emails.
- Make wrong configuration fail closed, not delete data.

**Non-Goals:**
- Age-based expiry of presentation images or other data inside rooms that survive.
- Changing how rooms are created, archived, or authorized.
- A UI to manage protected lists.
- Distributed blob-and-database atomicity. The design tolerates orphans instead.

## Decisions

- **Code in `code/src/actions/room-retention/`, run with `tsx` from a workflow.** It reuses `src/lib/pii`, the DB config and the existing Azure SDK dependencies, following `pii-backfill`. Alternative: evolve `cleanup-storage` (separate package, would need a copy of the PII code). Rejected.
- **Plain `pg` pool, no Sequelize models.** The job needs set-based SQL over many tables and an explicit transaction per room. Authentication is password (`DATABASE_USERNAME`/`DATABASE_PASSWORD` from `ACTIONS_DATABASE_*`), as proven by the probe. TLS stays on with `rejectUnauthorized: true`, like `pii-backfill`. Alternative: Sequelize controllers (one delete per model, harder to keep in one transaction).
- **Selection: SQL for age and room protection, Node for owner protection.**
  1. `SELECT roomId FROM weavejs_room WHERE createdAt < now() - interval '7 days' AND roomId <> ALL(:protectedRooms)`.
  2. Load `(roomId, email)` for the `owner` rows of those candidates, join `auth."user"`, decrypt in Node with all PII keys, lowercase, compare to the protected set, and drop the protected rooms.
  Matching in SQL on the encrypted value would fail on key rotation or plaintext rows. The candidate set is small (old rooms only).
- **Owner emails are resolved only for candidates**, and only counts (`matched`, `unmatched`, `ownerWithoutUser`) are logged, never addresses, since Actions logs are public to repo readers.
- **Per-room transaction.** For each eligible room: `BEGIN`, `SELECT ... FROM weavejs_room WHERE roomId = $1 FOR UPDATE SKIP LOCKED`, re-check `createdAt`, then delete in FK-safe order: `weavejs_image` and `weavejs_video` rows of the room, then `weavejs_template`, `weavejs_task`, `weavejs_thread`, `weavejs_ai_chat`, `weavejs_connection`, finally `weavejs_room` (which cascades pages, `weavejs_room_user`, `weavejs_room_access`), then `COMMIT`. Images and videos go before tasks because their `jobId` FKs do not cascade. Each room is its own transaction so one failure affects one room. The exact table list is taken from the migrations and re-verified against a real schema in a task.
- **Database first, blobs after (reconcile sweep).** Blobs are deleted by comparing storage to the database, not per room. Operations are idempotent and a failure only leaves orphans for the next run. Alternative: delete a room's blobs before its row. Rejected: needs a per-room blob map across twelve containers, and a failure still leaves partial state.
- **Live set built after the database phase.** `roomIds` from `weavejs_room`, `pageIds` from `weavejs_page`, `presentationModeIds` from `weavejs_task` rows of type `presentationMode` (`metadata->>'presentationModeId'`). Protected rooms and owners need no special blob rule: their rows stay, so their keys stay live.
- **Container-to-key table** drives the sweep: `rooms` blobs key on the name with a `-image-fallback` suffix stripped (a `pageId` or a legacy `roomId`); `presentation-images` keys on the first path segment against `presentationModeIds`; every other container keys on the first path segment (or the whole name for `rooms-thumbnails`) against `roomIds`. A blob is deleted only if its key is in no live set, not in the protected rooms list, and it was neither created nor modified within the grace period (default 24 hours); a blob with no timestamps is kept.
- **Safeguards.** Abort before any deletion if the DB read fails, if there are no rooms, if rooms to delete exceed `RETENTION_MAX_ROOMS_TO_DELETE`, or if blobs to delete exceed `RETENTION_MAX_BLOBS_TO_DELETE` or `RETENTION_MAX_BLOBS_PERCENT` of listed blobs. `DRY_RUN` reports and deletes nothing. Dry-run is the default until explicitly disabled per environment.
- **Schema guard.** Before selecting anything, the job lists every table in `public` with a `roomId` column and aborts if one is not in the delete list, so a table added later cannot be left behind silently. Verified FK actions on a migrated schema: `weavejs_page`, `weavejs_room_user`, `weavejs_room_access` -> room `CASCADE`; `weavejs_thread_answer` -> thread and `weavejs_ai_chat_message` -> chat `CASCADE`; `weavejs_template.jobId/removalJobId` -> task `CASCADE`; `weavejs_image` and `weavejs_video` `jobId/removalJobId` -> task `NO ACTION`; `weavejs_task`, `weavejs_thread`, `weavejs_ai_chat`, `weavejs_connection`, `weavejs_image`, `weavejs_video`, `weavejs_template` have no FK to the room.
- **Workflow.** `.github/workflows/code-room-retention.yml`: `schedule: 0 */4 * * *` plus `workflow_dispatch`, a matrix over `azure-develop` and `azure-pro`, a `plan` job that selects the environments for the matrix, `concurrency: room-retention` with `cancel-in-progress: false` (GitHub keeps at most one pending run), `azure/login` (OIDC) for blobs, and `permissions: id-token: write, contents: read`. Failures open or update a GitHub issue. A step touches a keep-alive, or the failure alert doubles as it, to avoid GitHub disabling scheduled workflows after 60 days of repository inactivity.
- **Configuration.** Environment variable `RETENTION_PROTECTED_ROOMS` and environment **secret** `RETENTION_PROTECTED_EMAILS` (both comma-separated) on each GitHub environment. The emails are a secret because GitHub prints variable values in clear in step headers and the repository is public; `RETENTION_DRY_RUN`, `RETENTION_MAX_ROOMS_TO_DELETE`, `RETENTION_MAX_BLOBS_TO_DELETE`, `RETENTION_MAX_BLOBS_PERCENT`, `RETENTION_BLOB_GRACE_HOURS`. Secrets: `ACTIONS_DATABASE_USERNAME/PASSWORD`, `PII_ENCRYPTION_KEYS`, plus existing storage and Azure settings. The container names reuse `AZURE_STORAGE_*` variables where they exist.
- **Retire `cleanup-storage/`** with its workflow and the `storage:cleanup` script, in the final group, after the new job has run in dry-run. Alternative: keep it disabled. Rejected: two cleanup mechanisms with different rules are a hazard.

## Risks / Trade-offs

- [Wrong database or empty live set marks all blobs as orphans] -> abort on no rooms, blob-count and percentage limits, and a dry-run period.
- [First run deletes years of accumulated data] -> dry-run first, review counts and sample names, raise limits deliberately.
- [A protected owner's account was deleted, so protection silently lapses] -> report `ownerWithoutUser` counts; protection by room remains available.
- [Removing a name from the protected lists mass-deletes at the next run] -> abort threshold, and documented behavior.
- [A missed table or FK in the delete order makes room deletion fail] -> per-room transaction rolls back, the failure is reported, and a task verifies the order against the real schema in `azure-develop`.
- [A blob is uploaded just before its database row commits] -> the grace period.
- [Presentation images are keyed through tasks, so keeping a task keeps its images] -> accepted; same lifetime as the room.
- [PII keys in the workflow environment] -> environment secrets scoped to `azure-develop` and `azure-pro`, only decrypt is needed, and emails are never printed.
- [GitHub disables the schedule after 60 days of inactivity] -> keep-alive and failure alerting.

## Migration Plan

1. Merge the job and workflow with `RETENTION_DRY_RUN=true` in both environments. Run manually on `azure-develop` and review.
2. Create the protected lists, including the legacy room names from `cleanup-storage/src/whitelist.json` if still relevant.
3. Tune limits against the dry-run counts, run the real deletion once manually on `azure-develop`, then `azure-pro`.
4. Turn on the schedule with dry-run off per environment.
5. Retire `cleanup-storage/` after confirming nothing runs it (check for an Azure Container Apps job and storage lifecycle rules).
6. Rollback: set `RETENTION_DRY_RUN=true` or disable the workflow. Deleted data is not recoverable, so rely on dry-run, limits and database backups.

## Open Questions

- Does anything currently run the `cleanup-storage` image (a Container Apps job)? Resolve during implementation by asking infra; it must be disabled before the first real run.
- Are there Azure lifecycle rules on any of the twelve containers? Informational, does not change the design.
- Final values of the `RETENTION_MAX_*` limits and `RETENTION_BLOB_GRACE_HOURS` (defaults: 50 rooms, 5000 blobs, 50%, 24 hours). Tune from dry-run output.
