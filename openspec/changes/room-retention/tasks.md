# Tasks

## 1. Configuration and shared foundations

- [x] 1.1 Create `code/src/actions/room-retention/config.ts` that parses and validates the environment (protected rooms, protected emails, dry-run default true, `MAX_ROOMS_TO_DELETE`, `MAX_BLOBS_TO_DELETE`, `BLOB_GRACE_HOURS`, storage container names, database settings); verify with unit tests that missing or invalid values fail fast, lists are trimmed, and emails are lowercased
- [x] 1.2 Add a `pg` pool factory in `code/src/actions/room-retention/database.ts` reusing `config/config.cjs` and password auth with `rejectUnauthorized: true`, and a logger that never prints emails; verify with a unit test that the logger redacts email-like strings and that the pool is built from the expected settings
- [x] 1.3 Inventory every table holding `roomId` from a database with all migrations applied, record the FK-safe delete order and each FK action in the design, and add a schema guard that aborts a run when a table with a `roomId` column is not in the delete list; verify with a test that the guard accepts the migrated schema and rejects an unknown table

## 2. Selection of rooms to delete

- [x] 2.1 Implement the candidate query (older than 7 days, not in protected rooms) in `selectCandidates.ts`; verify with an integration test on a throwaway Postgres schema that 8-day-old, 6-day-old, archived and protected-room fixtures are classified as the spec scenarios require
- [x] 2.2 Implement owner protection in `ownerProtection.ts`: load owners of candidate rooms, decrypt `auth."user".email` with all `PII_ENCRYPTION_KEYS` (plaintext passes through), lowercase, compare to the protected set; verify with unit tests for encrypted and plaintext emails, mixed case, two owners with one protected, member-only protected user, protected email matching no user, and owner with no user record, and that only counts are logged
- [x] 2.3 Add the safeguards for the room phase (no rooms in the database, database read failure, `MAX_ROOMS_TO_DELETE`) in `safeguards.ts`; verify with unit tests that each condition aborts before any deletion and reports counts

## 3. Database deletion

- [x] 3.1 Implement `deleteRoom.ts`: one transaction per room with `FOR UPDATE SKIP LOCKED`, a re-check of age, deletes in the order from task 1.3, and rollback on error; verify with an integration test that a deleted room leaves no row with its `roomId` in any table, and that forcing a failure on one statement leaves the room fully intact
- [x] 3.2 Make one room's failure not stop the run and mark the run failed at the end; verify with a test where the first of three rooms fails and the other two are deleted and the exit status is non-zero
- [x] 3.3 Implement dry-run for the database phase (report only); verify nothing is deleted in a dry-run integration test

## 4. Blob sweep

- [x] 4.1 Implement the live-set builder (`roomId`s, `pageId`s, and `presentationModeId`s from `presentationMode` tasks) in `liveSet.ts`; verify with an integration test that a deleted room's page and presentation IDs are absent and a protected room's are present
- [x] 4.2 Implement the container-to-key mapping for all twelve containers in `containers.ts` (name rules from the design, `-image-fallback` suffix, first path segment, whole name for `rooms-thumbnails`); verify with a table-driven unit test covering one real-looking blob name per container
- [x] 4.3 Implement the sweep in `sweep.ts`: list blobs per container, keep live, protected-listed and recent blobs, delete orphans, and apply `MAX_BLOBS_TO_DELETE` and a percentage limit before deleting; verify with unit tests on an in-memory blob client for each keep and delete scenario in the spec, including interrupted-run repair
- [x] 4.4 Wire dry-run into the sweep; verify a dry-run lists orphans per container and deletes none

## 5. Entry point

- [x] 5.1 Implement `action.ts` that runs config, selection, database deletion, live-set, sweep and a summary of counts, and add `"retention:run"` to `code/package.json` (`tsx` like `pii:backfill`); verify `npm run retention:run -- --help` or a dry-run against a local database prints the plan and exits 0
- [x] 5.2 Add a README next to the action documenting the variables, dry-run, thresholds and how to read the summary; verify the documented dry-run command runs as written

## 6. Workflow

- [x] 6.1 Create `.github/workflows/code-room-retention.yml` with `schedule: 0 */4 * * *` plus `workflow_dispatch`, a matrix over `azure-develop` and `azure-pro`, `concurrency: room-retention` with `cancel-in-progress: false`, `id-token: write`, Azure login, and the environment secrets and variables; verify with `actionlint`
- [ ] 6.2 Add failure alerting (open or update a GitHub issue on a failed scheduled run) and a keep-alive so the schedule is not disabled; verify by forcing a failure on a branch and seeing the issue, and by reading the workflow for the keep-alive step
- [ ] 6.3 Run the workflow manually on `azure-develop` with `RETENTION_DRY_RUN=true` and review the summary; verify the schema guard passes against the real schema, it lists candidate rooms and orphan blobs per container, deletes nothing, the database certificate is accepted (or `DATABASE_SSL_REJECT_UNAUTHORIZED` is set deliberately), and the log contains no email address
- [ ] 6.4 Set the protected rooms and protected emails variables on both environments (including legacy room names from `cleanup-storage/src/whitelist.json` where still relevant) and confirm via a dry-run that those rooms and owner-protected rooms are not candidates; verify by comparing the counts of protected, unmatched and owner-without-user reported

## 7. Rollout

- [ ] 7.1 Confirm with infra whether anything runs the `cleanup-storage` image and disable it; verify with a written confirmation recorded in issue #185
- [ ] 7.2 Run a real (non-dry-run) execution manually on `azure-develop`, then `azure-pro` after reviewing dry-run counts and setting the limits; verify the target rooms and their blobs are gone, protected ones remain, and a second run finds nothing to delete
- [ ] 7.3 Enable the schedule with dry-run off in both environments; verify the first scheduled runs succeed and the summary stays within the limits
- [ ] 7.4 Remove `cleanup-storage/`, `.github/workflows/code-deploy-cleanup-storage.yml` and the `storage:cleanup` script, and drop the legacy whitelist file; verify with `git grep` that no references remain and `npm run build` still passes
