# Local APIs and databases

Fill the placeholders from your project's profile; keep the steps.

Base host `<LOCAL_URL>`, each service under its own prefix (`/<auth-service>`, `/<api-service>`, …).

## 1. Get a JWT

```bash
curl -s -X POST <LOCAL_URL>/<auth-service>/<LOGIN_PATH> \
  -H 'Content-Type: application/json' \
  -d '{"email":"<TEST_USER>","password":"<TEST_PASSWORD>"}'
```

Test App is **<TEST_APP>**. Read the token field out of the response body rather than assuming its name,
then export it: `JWT=<token>`. Tokens expire (~24h) — re-login rather than reusing an old one from
notes. Never commit or paste a token into a document.

## 2. JWT-authenticated APIs

```bash
curl -s <LOCAL_URL>/<api-service>/api/v1/<resource> -H "Authorization: $JWT"
```

## 3. Public API with an incoming secret

The public API of your API service (`engine-service` in the heading stands for it; e.g. `/public-api/v1`) often authenticates with an **API secret**, not the JWT. Create one with the JWT:

```bash
curl -s -X POST <LOCAL_URL>/<api-service>/api/v1/secret -H "Authorization: $JWT" \
  -H 'Content-Type: application/json' \
  -d '{"name":"probe","type":"INCOMING","ipAddresses":["0.0.0.0/0"]}'
```

The `secret` field (e.g. `<id>.<random>`) is returned **once** and is never readable again. Then:

```bash
curl -s <LOCAL_URL>/<api-service>/public-api/v1/<resource> -H "Authorization: $SECRET"
```

Check whether the `Bearer ` prefix is optional. **Delete the secret when done** (`DELETE /api/v1/secret/:id`) and keep its
value out of any file you write — redact to `<id>.xxxx` in docs.

Every auth failure may be an identical `401 Not Authorized`. On errors, look for headers naming the
downstream service that actually failed and its request id (e.g. `x-error-source`, `x-error-source-request-id`) — quote both, and
grep that service's container logs (`docker logs --tail 300 <svc-container>`) for the stack trace.

## 4. Driver script

For sweeps, write a small Python helper in the scratchpad rather than long curl chains: one `call()`
returning `{status, body, ms, errsource, reqid}`, results dumped to JSON per phase so coverage and
regressions can be computed afterwards. Read-only endpoints first, harvest real ids from the list
responses, then exercise writes.

## 5. Postgres — finding valid ids

```bash
export PGPASSWORD=<DB_PASSWORD>
psql -h 127.0.0.1 -p <DB_PORT_LOCAL> -U postgres -d <CORE_DB> -c "..."
```

Which database holds what (record your project's map here):

| Data | Database | Note |
|---|---|---|
| Core business entities (orders, parts, quotes, customers, catalogue) | **`<CORE_DB>`** | the core DB; note its table naming convention (singular vs plural) |
| Per-service domain data | `<service>_service` | its own naming convention |
| API metering / audit | `<api-service-db>` | e.g. a calls table |
| Other service DBs | — | per-service tables; watch for **abandoned DBs or stale copies of core tables that services no longer read** — checking them produces wrong conclusions |

Keep a list of `<TEST_APP>` fixture ids that work (an order, part, model version, quote, customer,
material, machine and group, a technology with form fields, a build) so you don't rediscover them each run. If they no longer work, create your own and update the list.

Two lookups that waste a cycle if guessed: form-dependent endpoints need an entity that has a section on the **active** form, and
creation flows often need a parent that already has every prerequisite (e.g. a customer *and*
a shipping address resolving to a delivery option).

## 6. Rules for a shared dev environment

- Delete only what you created. For pre-existing rows, write the same values back (idempotent) rather
  than changing them, and never `DELETE` a real business record.
- Some entities have no public delete — anything created that way stays.
- Repairing broken data is fine when asked, but record the exact SQL in the report.
- Don't send anything customer-facing (quote emails, sending a real order to production).
- Container images can be older than the working copy — check `docker images` ages and
  `docker exec <container> cat <file>` before blaming or crediting source you just read.
