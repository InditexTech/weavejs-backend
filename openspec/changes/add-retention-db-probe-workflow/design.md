# Design

## Context

See proposal.md for motivation. Observed constraints:

- Existing workflows (`code-deploy.yml`, `code-deploy-cleanup-storage.yml`) use `workflow_dispatch` with an `ENVIRONMENT` choice (`azure-develop`, `azure-development`, `azure-pro`, `azure-production`), `azure/login@v2` with OIDC (`id-token: write`), and read DB settings from environment secrets/vars. None connects to Postgres.
- The backend authenticates to Postgres with an Entra token (scope `https://ossrdbms-aad.database.windows.net/.default`) when `DATABASE_CLOUD_CREDENTIALS=true`; the password is then the token.
- `auth."user".email` may be stored encrypted: `code/src/lib/pii` encrypts it deterministically (`enc:<keyId>:d:...`) when `PII_ENCRYPTION_ENABLED=true`, and reads decrypt transparently. A SQL `lower(email) = ANY(...)` match would not work on encrypted values.
- Room data lives in `weavejs_room`, `weavejs_room_user` (`role` is `owner`/`user`) and `auth."user"`.

## Goals / Non-Goals

**Goals:**
- One manual workflow whose first failing step identifies the failing layer (identity, token, network/SSL, DB role, privileges).
- Exercise the same DB configuration names the deploy workflow uses.
- Guarantee the probe cannot alter data.

**Non-Goals:**
- Any retention, whitelist, blob or scheduling logic.
- Provisioning the DB role, grants, or network access (infra owns those).
- A reusable composite action. Extract shared login/connection steps only when the retention workflow needs them.

## Decisions

- **Plain `psql` in the workflow, no Node project.** The probe is a handful of SQL statements; `psql` (preinstalled on `ubuntu-24.04`, otherwise `postgresql-client`) keeps it dependency-free. Alternative: reuse `cleanup-storage` TypeScript with `pg`; rejected because it adds a build step and a dependency to a throwaway gate.
- **Token from the Azure CLI.** After `azure/login`, `az account get-access-token --resource-type oss-rdbms` yields the Entra token, passed as `PGPASSWORD` and masked with `::add-mask::`. Alternative: `@azure/identity` in Node; rejected for the same reason as above. The token scope matches what the backend requests.
- **Connection settings from the same names as deploy.** `AZURE_DATABASE_HOST/PORT/NAME/USERNAME/SSL` secrets and `AZURE_DATABASE_CLOUD_CREDENTIALS` var. `PGSSLMODE=require` when `AZURE_DATABASE_SSL=true`. If `AZURE_DATABASE_CLOUD_CREDENTIALS` is not `true`, the probe fails fast with a clear message, since the intended path is Entra auth.
- **Fail-fast, one named step per check.** Each check is its own workflow step so the Actions UI shows which layer failed, and the failure table in the issue maps step to fix.
- **Write check is always rolled back.** Run `BEGIN; DELETE FROM weavejs_room WHERE false; ROLLBACK;` in one `psql` invocation, with an explicit `ROLLBACK`. A `WHERE false` delete verifies the DELETE privilege without touching rows, and the explicit `ROLLBACK` is a second safeguard. The same is done for `weavejs_room_user`.
- **Counts only in logs.** Output row counts and the encrypted/plaintext email counts (`email LIKE 'enc:%'`). Never `SELECT` emails, names, or IDs, because Actions logs of a public repo are visible.
- **Email encryption report.** Reports `total`, `encrypted`, `plaintext` for `auth."user".email`. This feeds the later design: if encrypted, the retention job must encrypt the whitelist emails with the same deterministic scheme (needing `PII_ENCRYPTION_KEYS`), or resolve users through the application's PII layer.
- **Environment-scoped, manual only.** `workflow_dispatch` with an `ENVIRONMENT` choice and `permissions: id-token: write, contents: read`. No schedule. Alternative: also run on `pull_request`; rejected since it would hit production-like environments from untrusted branches and secrets are not available to forks.

## Risks / Trade-offs

- [Runner cannot reach Postgres (private endpoint/firewall)] -> That is the answer the probe exists to give; outcome is a self-hosted runner, an allow rule, or the deployed-job fallback in issue #185.
- [Service principal has no Postgres role] -> Probe fails at `SELECT 1`; infra creates the Entra-mapped role with least privilege.
- [Probe credentials could leak in logs] -> Mask the token, never echo secrets, `set +x`, and log counts only.
- [`DELETE ... WHERE false` proves privilege but not that a real delete would pass FK/triggers] -> Acceptable for a gate; the retention change tests real deletes under `DRY_RUN` first.
- [Probe runs against production] -> Read-only by construction, and manual with an explicit environment choice.

## Migration Plan

1. Add the workflow in a PR; merge it to the default branch (manual workflows must exist there to be dispatched, though a dispatch from a branch also works for testing).
2. Run it on `azure-develop`, then `azure-pro`/`azure-production`, and record results in issue #185.
3. Rollback: delete the workflow file. No data or infra is changed by this change.

## Open Questions

- Is `psql` guaranteed on the chosen runner image, or should the workflow install `postgresql-client`? Resolve during implementation by checking the runner.
- Which of the environment names are real target databases (`azure-develop` vs `azure-development`, `azure-pro` vs `azure-production`)? Run on the ones that exist.
