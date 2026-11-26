# Tasks

## 1. Configuration and shared foundations

- [x] 1.1 Create `code/src/actions/room-retention/config.ts` that parses and validates the environment (protected rooms, protected user ids, dry-run default true, `RETENTION_MAX_*` limits, `RETENTION_BLOB_GRACE_HOURS`, storage container names, database settings); verify with unit tests that missing or invalid values fail fast, lists are trimmed, blank lists mean nothing is protected, and user ids are case sensitive
- [x] 1.2 Add a `pg` pool factory in `code/src/actions/room-retention/database.ts` built from the `DATABASE_*` environment with password auth and certificate verification on by default (`DATABASE_SSL_REJECT_UNAUTHORIZED`), and a logger that never prints emails; verify with a unit test that the logger redacts email-like strings and that the pool is built from the expected settings
- [x] 1.3 Inventory every table holding `roomId` from a database with all migrations applied, record the FK-safe delete order and each FK action in the design, and add a schema guard that aborts a run when a table with a `roomId` column is not in the delete list; verify with a test that the guard accepts the migrated schema and rejects an unknown table

## 2. Selection of rooms to delete

- [x] 2.1 Implement the candidate query (older than 7 days, not in protected rooms) in `selectCandidates.ts`; verify with an integration test on a throwaway Postgres schema that 8-day-old, 6-day-old, archived and protected-room fixtures are classified as the spec scenarios require
- [x] 2.2 Implement owner protection in `ownerProtection.ts`: a candidate room is protected when an `owner` membership has a user id in the protected list, and listed ids that match no user are counted; verify with unit and integration tests for any-owner-is-enough, member-only protected user not protecting, a protected id matching no user, a deleted owner account still protecting, and no queries when the list is empty
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

## 6. Backend execution

- [x] 6.1 Add the request-configuration schema (protected rooms and user ids as arrays, limits, grace hours, `dryRun` defaulting to true, unknown fields rejected) that produces a `RetentionConfig`; verify with unit tests that a valid body maps correctly, that an omitted `dryRun` is true, and that negative limits, malformed lists and unknown fields are rejected
- [x] 6.2 Implement the app adapter: a `Queryable` and `TransactionalPool` over the app's Sequelize connection (raw queries and a dedicated raw connection per room for `BEGIN` and `COMMIT`) and a `BlobStore` from the app's storage settings; verify by running the existing end-to-end integration scenario through the adapter against the migrated Postgres, including the rollback-on-failure case
- [x] 6.3 Add the pg-boss jobs `room-retention` and `blob-sweep` in `code/src/workloads/jobs/` (singleton queues, long expiry, configuration in the job data, the database job enqueuing the sweep on success, summary stored as the job output) and register them in `setupWorkloads`; verify with an integration test on real pg-boss that a run completes with a summary, that a failing database job does not enqueue the sweep, and that a second start while a run is active does not run in parallel
- [x] 6.4 Add `retentionTriggerToken` to the service configuration, a constant-time token middleware, and the endpoints `POST /{hub}/retention/runs` and `GET /{hub}/retention/runs/:jobId` outside the session middleware and behind the IP rate limit; verify with tests that a valid request starts a run and returns its id, that a missing or wrong token gets 401, that an unset token makes both routes 404, that an invalid body gets 400 and starts nothing, that an unknown id gets 404, and that the summary has no email
- [x] 6.5 Add `RETENTION_TRIGGER_TOKEN` to the `.env` written by `.github/workflows/code-deploy.yml`; verify with `actionlint` and by reading that the value comes from a secret and is not echoed

## 7. Workflow

- [x] 7.1 Rewrite `.github/workflows/code-room-retention.yml` as trigger and poll: keep the schedule, dispatch, `plan` job, matrix and concurrency group, build the JSON body from the GitHub variables with `jq`, `POST` to `APP_HOST` with the token, poll the status until completed, failed or a timeout, print the summary, fail otherwise, and drop the Azure login, the database and storage environment and `id-token: write`; verify with `actionlint` and by running the same script steps against a local backend in dry-run, including a wrong token and a failed run
- [x] 7.2 Keep the failure-alert and keep-alive jobs working with the new shape; verify by reading that a failed or timed-out matrix job reaches the alert job and that the keep-alive step is unchanged
- [x] 7.3 Update the README in `code/src/actions/room-retention/` and the design notes for the in-backend flow (endpoints, token, request body, how to run a local dry run); verify the documented local dry-run and the documented `curl` example run as written

## 8. Rollout

- [x] 8.1 Create `RETENTION_TRIGGER_TOKEN` in `azure-develop` and `azure-pro` (different values) and deploy the backend to `azure-develop`; verify the start endpoint answers 401 without the token and starts a dry run with it
- [x] 8.2 Run the workflow manually on `azure-develop` with `DRY_RUN=true`; verify the summary lists candidate rooms and orphan blobs per container, deletes nothing, the schema guard passes, and the log contains no email address
- [x] 8.3 Correct the protected lists for each environment (user ids differ per environment, legacy room names from `cleanup-storage/src/whitelist.json` where still relevant) and repeat the dry run on `azure-pro`; verify the reported protected ids and unmatched ids are as expected and tighten the limits from the dry-run counts
- [x] 8.4 Confirm with infra whether anything runs the `cleanup-storage` image and disable it; verify with a written confirmation recorded in issue #185
- [x] 8.5 Run a real execution manually on `azure-develop`, then `azure-pro`; verify the target rooms and their blobs are gone, protected ones remain, a second run finds nothing to delete, and a deleting right is not missing
- [ ] 8.6 Enable the schedule with dry-run off in both environments; verify the first scheduled runs complete and the summary stays within the limits

## 9. Cleanup

- [ ] 9.1 Complete the checklist in issue #190 (temporary PR and branches, `ACTIONS_DATABASE_*` secrets and Postgres user, probe workflow, `cleanup-storage/` with its workflow, script and variables, registry images); verify with `git grep` that no references remain, `npm run build` still passes, and the issue is closed

## 10. Safeguards found during the rollout

- [x] 10.1 Reject list entries with quotes, brackets, spaces or separators in the request schema, and make the workflow script drop quotes, brackets and blank entries before sending; verify with unit tests that `""`, `"room-a"`, `room-a,room-b` and `[room-a]` are rejected, that legacy names and generated ids are accepted, and by running the script with `""` and `"a","b"` against a local backend and reading the body it sent
- [x] 10.2 Refuse a run that would delete every room unless the request sets `allowDeleteAllRooms` (default false, still bound by the room limit); verify with unit tests for the refusal, the explicit allow, and the limit still applying
- [x] 10.3 Return up to five sample blob names per container in the summary and print them in the workflow log; verify with a unit test on the sweep plan and by reading the printed summary from a local run of the script
