<!--
SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)

SPDX-License-Identifier: Apache-2.0
-->

# Room retention

Hard-deletes rooms created more than 7 days ago, and the blobs that no longer
belong to any room. It is run by `.github/workflows/code-room-retention.yml`
every 4 hours, and can be run by hand:

```bash
npm run retention:run            # dry run, deletes nothing
RETENTION_DRY_RUN=false npm run retention:run
```

Anything other than `RETENTION_DRY_RUN=false` is a dry run.

## What is protected

A room, with its pages, memberships, tasks and blobs, is never deleted if:

- its `roomId` is listed in `RETENTION_PROTECTED_ROOMS`, or
- at least one of its **owners** has an email listed in
  `RETENTION_PROTECTED_EMAILS`. Members with the `user` role do not protect a
  room.

Both lists are comma, semicolon or newline separated. Emails are matched
case-insensitively and may be stored encrypted in the database, in which case
`PII_ENCRYPTION_KEYS` (all keys, current and old) is needed to read them.

Blob names that are not rooms any more (legacy rooms) are kept when their name
is in `RETENTION_PROTECTED_ROOMS`.

## What a run does

1. Aborts if a table with a `roomId` column is not in the delete list
   (`tables.ts`), if the database has no rooms, or if more than
   `RETENTION_MAX_ROOMS_TO_DELETE` rooms would be deleted.
2. Deletes each eligible room and every row that references it in one
   transaction. A failing room is rolled back, reported, and retried next run.
3. Lists blobs in the 12 storage containers and deletes those whose owner (room,
   page or presentation) is no longer in the database, is not protected, and was
   not modified in the last `RETENTION_BLOB_GRACE_HOURS`. Aborts before deleting
   if more than `RETENTION_MAX_BLOBS_TO_DELETE` blobs, or more than
   `RETENTION_MAX_BLOBS_PERCENT` percent of them, would be deleted.

Logs report counts and identifiers. Anything that looks like an email is
redacted.

## Configuration

| Variable                                                          | Default            | Meaning                                    |
| ----------------------------------------------------------------- | ------------------ | ------------------------------------------ |
| `RETENTION_DRY_RUN`                                               | `true`             | `false` enables deletion                   |
| `RETENTION_PROTECTED_ROOMS`                                       | empty              | Protected room ids                         |
| `RETENTION_PROTECTED_EMAILS`                                      | empty              | Protected owner emails                     |
| `RETENTION_MAX_ROOMS_TO_DELETE`                                   | `50`               | Abort above this many rooms                |
| `RETENTION_MAX_BLOBS_TO_DELETE`                                   | `5000`             | Abort above this many blobs                |
| `RETENTION_MAX_BLOBS_PERCENT`                                     | `50`               | Abort above this share of listed blobs     |
| `RETENTION_BLOB_GRACE_HOURS`                                      | `24`               | Keep blobs modified more recently          |
| `DATABASE_HOST/PORT/NAME/USERNAME/PASSWORD/SSL`                   |                    | Connection (password auth)                 |
| `DATABASE_SSL_REJECT_UNAUTHORIZED`                                | `true`             | `false` skips certificate verification     |
| `AZURE_STORAGE_ACCOUNT_NAME` or `AZURE_STORAGE_CONNECTION_STRING` |                    | Blob access                                |
| `AZURE_STORAGE_ROOMS/IMAGES/VIDEOS_CONTAINER_NAME`                |                    | Configured containers                      |
| `AZURE_STORAGE_GENERATED_IMAGES_CONTAINER_NAME`                   | `generated-images` | Optional override                          |
| `PII_ENCRYPTION_KEYS`                                             |                    | Needed only when user emails are encrypted |

## Tests

Unit tests run with `npm test`. The integration tests need a PostgreSQL where
all migrations were applied, and are skipped without it:

```bash
RETENTION_TEST_DATABASE_URL=postgres://user:pass@localhost:5432/db npm test
```

Their fixtures use a unique prefix and are removed afterwards.
