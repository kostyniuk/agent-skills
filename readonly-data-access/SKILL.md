---
name: readonly-data-access
description: Read staging, release-env and prod data, <LOG_SERVICE> logs and third-party config, read-only and without personal data. Use when a ticket needs real data, logs or a reporter's configuration.
---

# Read-only data access

Fill the placeholders from your project's profile; keep the steps.

Every access here is **read-only** and **minimal**: the rows and lines a question needs, with `LIMIT`. Real customer data stays out of chat, files, <TRACKER> and MR/PRs. Use ids and counts.

## Which source

| Need | Source | Gate |
|---|---|---|
| Local fixtures, anything writable | local stack Postgres ([`local-stack`](../local-stack/SKILL.md)) | none |
| A reporter's config on staging, data shape across many apps | staging DB `:<DB_PORT_STAGING>` (anonymised prod copy, next-release schema) | read-only |
| A reporter's config on the release env | release-env DB `:<DB_PORT_RELEASE>` | read-only |
| A reporter's config on the QA env | QA-env DB `:<DB_PORT_QA>` | read-only |
| Live <PROD> state (real configs, production records) | prod DB `:<DB_PORT_PROD>` | read-only, no personal data out |
| What happened at a time (errors, 4xx/5xx, timeouts) | <LOG_SERVICE> logs (e.g. CloudWatch) | read-only |
| Payment / webhook behaviour | <PAYMENT_PROVIDER> API (e.g. Stripe) with the test-account key | read-only, never print keys |
| Other regions, regulated (e.g. export-controlled) data | none | never tunnel or read credentials for these without asking <TEAM_LEAD> |

## Databases

1. **Tunnel**, only if it isn't already up:
   `pg_isready -h 127.0.0.1 -p <port> || ssh -fN -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -L 127.0.0.1:<port>:<db-host>:5432 <ssh-alias>`.
   - When the SSH aliases go through a cloud session manager (e.g. AWS SSM), an auth or session error means the SSO session expired: run the SSO login (e.g. `aws sso login`), which needs a human.
   - DB hosts are in the infrastructure config, `<CONFIG_DIR>/<env>/` (e.g. `terraform.tfvars`).
   - Never bind <DB_PORT_LOCAL> (the local docker Postgres).
2. **Credentials** come from `~/.pgpass` (`127.0.0.1:<port>:*:<user>:<password>`). The source is the DB password variable in the same infrastructure config. Never echo or pass a password on a command line.
3. **Query:**
   `PGOPTIONS='-c default_transaction_read_only=on' psql -w -h 127.0.0.1 -p <port> -U <db-user> -d <db> -Atc "<sql> LIMIT n"`.
   - Never unset read-only.
   - No long-running or locking queries; these are shared servers.
4. **Databases:** list your project's databases here: the main one (note its table-naming convention, e.g. singular names) and one per service. Note where history starts on each env (e.g. workflow logs on staging begin at a known date), so an empty result before it isn't read as "never happened".

## Logs

- **Auth and region:** the <LOG_SERVICE> CLI (e.g. `aws` via SSO), region `<REGION>`.
- **Log groups:** `<LOG_GROUP_PREFIX>-<env>.<service>`, one per env and service. Cluster logs (e.g. EKS) have their own group.
- **Query:** `aws logs filter-log-events --region <REGION> --log-group-name <LOG_GROUP_PREFIX>-<env>.<service> --start-time <ms> --end-time <ms> --filter-pattern '?AxiosError ?"status code 400"'`.
- **Gotcha:** a gateway service often logs the HTTP client error (e.g. AxiosError) but not the failing internal call's response body, and some services don't log their validation 400s at all. To find a 4xx reason, compare runs where only the input differs, or reproduce locally.

## Third-party config

- Read the config through the provider's API with the test-account key from the env config. For example, list the <PAYMENT_PROVIDER> webhook endpoints with their `status` and `enabled_events`.
- To use it as evidence, render the relevant fields into a small HTML table and screenshot it with the CDP Chrome ([`browser-verification`](../browser-verification/SKILL.md)). Leave keys and secrets out.

## Output rules

- Personal data (names, emails, addresses) never leaves the query. Report ids and counts.
- Name the env and DB with each fact: "staging main DB, 2026-10-14 09:20 UTC: 4 rows".
