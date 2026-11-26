# Tasks

## 1. Workflow skeleton and connection setup

- [x] 1.1 Create `.github/workflows/code-probe-database.yml` with `workflow_dispatch` (`ENVIRONMENT` choice matching `code-deploy.yml`; no `BASELINE` input or checkout, since the probe uses no repo content and the workflow runs from the dispatched ref), `permissions: contents: read`, and env from the `AZURE_DATABASE_*` secrets; verify with `actionlint` that the workflow parses
- [x] 1.2 Add `ACTIONS_DATABASE_USERNAME` and `ACTIONS_DATABASE_PASSWORD` environment secrets (Entra/OIDC login was tried and replaced: the backend user is bound to another Entra identity); verify the job reads them on `azure-develop`
- [x] 1.3 Add a step that fails fast unless both secrets are set and exports `PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD`, with `PGSSLMODE=require` when `AZURE_DATABASE_SSL=true`; verify the run log shows secret values only as `***`

## 2. Probe checks

- [x] 2.1 Add a network step (`pg_isready` with a timeout) against `AZURE_DATABASE_HOST:AZURE_DATABASE_PORT`; verify it reports `accepting connections` on `azure-develop`
- [x] 2.2 Add a login step running `SELECT 1` as the probe user; verify it prints `login_ok` on `azure-develop` (a wrong-identity login was seen failing at this step and not an earlier one)
- [x] 2.3 Add a read-privilege step printing only `count(*)` for `weavejs_room`, `weavejs_room_user` and `auth."user"`; verify the log shows counts and no row data
- [x] 2.4 Add an email-encryption report step printing counts of total, `enc:`-prefixed, and plaintext `auth."user".email`; verify the log shows only the three numbers
- [x] 2.5 Add a delete-privilege step running `BEGIN; DELETE FROM weavejs_room WHERE false; DELETE FROM weavejs_room_user WHERE false; ROLLBACK;` in one `psql` call; verify a row count before and after is unchanged and the step passes only with DELETE privilege
- [x] 2.6 Ensure `psql` is available on the runner (install `postgresql-client` only if missing); verify the first run needs no manual intervention

## 3. Run and record results

- [x] 3.1 Dispatch the workflow on `azure-develop` and record the outcome of every step in issue #185; verify each step's result is documented, including the first failing step if any
- [x] 3.2 Dispatch it on the remaining real target environments (`azure-pro`) and record results in issue #185; verify the issue states which environments pass and what infra work (role, grants, network) is still needed
- [x] 3.3 Record the email-encryption finding in issue #185 so the retention design chooses between matching encrypted emails and resolving users through the PII layer
