# Proposal

## Why

Issue #185 plans a retention job that hard-deletes rooms older than 7 days directly from a GitHub Actions workflow, with no deployed infra in between. Whether that is feasible is unknown: no workflow in the repo connects to Postgres today, all use GitHub-hosted `ubuntu-24.04` runners, the DB host is a secret, and the backend authenticates with Entra tokens (`AZURE_DATABASE_CLOUD_CREDENTIALS=true`). Building the destructive job before proving the connection would risk wasted work. This change delivers only the gate: a probe that proves the connection and privileges.

## What Changes

- Add a new manual workflow `.github/workflows/code-probe-database.yml` (`workflow_dispatch`, environment selectable like the existing deploy workflows).
- The probe reuses the real DB configuration (`AZURE_DATABASE_HOST`, `AZURE_DATABASE_PORT`, `AZURE_DATABASE_NAME`, `AZURE_DATABASE_USERNAME`, `AZURE_DATABASE_SSL`, `AZURE_DATABASE_CLOUD_CREDENTIALS`), so it also validates the DB config setup.
- It runs, in order, and stops at the first failure with a clear step name: Azure OIDC login, Entra token for the PostgreSQL scope, network/SSL connection, `SELECT 1`, read counts on `weavejs_room`, `weavejs_room_user` and `auth."user"`, and a `DELETE` on the room table inside a transaction that is always rolled back.
- It also reports, as counts only, how many `auth."user".email` values are stored encrypted (`enc:` prefix, see `code/src/lib/pii/crypto.ts`) versus plaintext. The backend can encrypt emails deterministically when `PII_ENCRYPTION_ENABLED=true`, which decides how the later email whitelist must be matched.
- The probe never persists any change and never prints secrets or personal data (counts only).
- Out of scope: the retention logic, whitelist handling, blob deletion, scheduling, and any change to `cleanup-storage/`. Those follow in separate changes once the probe passes in the target environments.

## Capabilities

### New Capabilities
<!-- None. This is CI tooling; no application behavior or requirement changes. -->

### Modified Capabilities
<!-- None. -->

## Impact

- New file: `.github/workflows/code-probe-database.yml`.
- Uses existing secrets, variables and Azure federated identity of the `azure-develop`, `azure-development`, `azure-pro` and `azure-production` environments. No new secrets are required by the probe itself.
- May surface infra work outside this repo: a Postgres role for the workflow's service principal, grants on the room tables, and network access (firewall rule or self-hosted runner). Those are outcomes of running the probe, not part of this change.
- No application code, API, or dependency changes.
