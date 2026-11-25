# Tasks

## 1. Workflow skeleton and connection setup

- [x] 1.1 Create `.github/workflows/code-probe-database.yml` with `workflow_dispatch` (`ENVIRONMENT` choice matching `code-deploy.yml`; no `BASELINE` input or checkout, since the probe uses no repo content and the workflow runs from the dispatched ref), `permissions: id-token: write, contents: read`, and env from the `AZURE_DATABASE_*` secrets/vars; verify with `actionlint` (or the Actions UI) that the workflow parses and appears under "Run workflow"
- [ ] 1.2 Add an `azure/login@v2` OIDC step; verify it succeeds on `azure-develop`
- [ ] 1.3 Add a step that fails fast unless `AZURE_DATABASE_CLOUD_CREDENTIALS` is `true`, fetches the Entra token with `az account get-access-token --resource-type oss-rdbms`, masks it with `::add-mask::`, and exports it as `PGPASSWORD` with `PGSSLMODE=require` when `AZURE_DATABASE_SSL=true`; verify the token is masked in the run log and that no secret value is printed

## 2. Probe checks

- [ ] 2.1 Add a network step (`pg_isready` or a `psql` connect with a timeout) against `AZURE_DATABASE_HOST:AZURE_DATABASE_PORT`; verify a failure here reports a clear network/SSL error and stops the job
- [ ] 2.2 Add a login step running `SELECT 1` as `AZURE_DATABASE_USERNAME`; verify a missing Postgres role fails this step and not an earlier one
- [ ] 2.3 Add a read-privilege step printing only `count(*)` for `weavejs_room`, `weavejs_room_user` and `auth."user"`; verify the log shows counts and no row data
- [ ] 2.4 Add an email-encryption report step printing counts of total, `enc:`-prefixed, and plaintext `auth."user".email`; verify the log shows only the three numbers
- [ ] 2.5 Add a delete-privilege step running `BEGIN; DELETE FROM weavejs_room WHERE false; DELETE FROM weavejs_room_user WHERE false; ROLLBACK;` in one `psql` call; verify a row count before and after is unchanged and the step passes only with DELETE privilege
- [ ] 2.6 Ensure `psql` is available on the runner (install `postgresql-client` only if missing); verify the first run needs no manual intervention

## 3. Run and record results

- [ ] 3.1 Dispatch the workflow on `azure-develop` and record the outcome of every step in issue #185; verify each step's result is documented, including the first failing step if any
- [ ] 3.2 Dispatch it on the remaining real target environments (`azure-pro`/`azure-production` as applicable) and record results in issue #185; verify the issue states which environments pass and what infra work (role, grants, network) is still needed
- [ ] 3.3 Record the email-encryption finding in issue #185 so the retention design chooses between matching encrypted emails and resolving users through the PII layer
