---
name: local-stack
description: "Run and prove code on the local stack (<LOCAL_URL>): start services, load a branch, log in, call APIs, query local DBs. Use for local red/green checks or when the stack misbehaves."
---

# Local stack

Fill the placeholders from your project's profile; keep the steps. `<REPOS_DIR>` is where your checkouts live, `<COMPOSE_DIR>` the compose repo, `<STACK_SCRIPT>` its wrapper script, `<DB_CONTAINER>` / `<NGINX_CONTAINER>` / `<FRONTEND_CONTAINER>` / `<LEGACY_CONTAINER>` the container names, `<CORE_DB>` the main database.

`<LOCAL_URL>` serves your checkouts in `<REPOS_DIR>/<repo>` through nginx. It is the one environment where you control the code and the data, so before/after evidence comes from here.

## Steps

1. **Bring it up.**
   - Run `docker ps --format '{{.Names}} {{.Status}}'`. If services are missing, start them in **waves** of 3–5 containers, about 40 s apart, and check `docker exec <DB_CONTAINER> pg_isready -U postgres` between waves.
   - Starting about 18 at once restarts Postgres under the memory spike. Every backend then exits with "the database system is starting up", and `docker start` doesn't retry.
   - Some services are easy to miss because nothing fails loudly without them: list the ones whose absence makes a flow spin, hang or break silently (e.g. a quoting, messaging or inventory service) and check them explicitly.
   - After restarting a container, run `docker exec <NGINX_CONTAINER> nginx -s reload`, because nginx caches container IPs.

2. **Put your code on the stack.** Pick the row for what you changed:

   | Code | How |
   |---|---|
   | Hot-reloading frontend | `<FRONTEND_CONTAINER>` bind-mounts the frontend source folders (and shared frontend packages) from the **main checkout** and hot-reloads. Check out your branch there, then wait for the compile-done line (e.g. `✓ Compiled`) in `docker logs` |
   | Rebuilt backend service | `<STACK_SCRIPT> up --build -d <service>` builds from `<REPOS_DIR>/<service>`, then reload nginx. Poll until it answers |
   | Shared libraries | `--build` reuses the cached dependency (npm) layer, so use `<STACK_SCRIPT> build --no-cache <svc>` to really pull a new shared-library version. For unpublished lib changes, use the `link-libs` skill |
   | Prebuilt legacy bundle | `<LEGACY_CONTAINER>` serves a **prebuilt** minified bundle (e.g. `app.min.js`), not mounted from the repo. Back it up first (`docker cp` to `/tmp/<bundle>.bak-<ticket>`), apply your change to the bundle, verify, then restore it |

   - Only one owner switches the frontend main checkout at a time. Everyone else works in worktrees.
   - Never use a test wrapper script whose teardown removes the live dev containers; find out which script that is in your compose repo before running any.

3. **Prove the stack runs your code.** Pick a check:
   - **Frontend:** make a deliberate visible change (a probe), see it render, then revert it.
   - **Backend:** read the changed file inside the container: `docker exec <svc-container> cat <container-src>/<path>`.
   - **Libs:** `cat <container-src>/node_modules/<lib>/package.json` per container.

   Done when you've seen your code, not assumed it.

4. **Get the before state.** "Before" means the target branch without the fix. Check out `origin/<base>` or revert your change in the mounted tree, prove it reloaded (step 3), and capture red. Then restore your branch and capture green.

5. **Log in, call APIs, query data.** See [API-AND-DB.md](API-AND-DB.md): JWT login for `<TEST_APP>`, API secrets, DB names and working fixture ids. In short:
   - **UI:** seed `localStorage.<TOKEN_STORAGE_KEY>`.
   - **APIs:** send the token exactly as the API expects it (some take a raw `Authorization: <jwt>` with no `Bearer`).
   - **DB:** `docker exec <DB_CONTAINER> psql -U postgres -d <CORE_DB> -Atc "…"`.

6. **Clean up.**
   - Delete the test data you created, or list it in your report.
   - Restore any patched bundle or mounted file.
   - Put the frontend main checkout back on the branch it was on.

## Worktrees

- **Never change a main checkout** someone else, or `<LOCAL_URL>`, is using. Make your own: `git -C <REPOS_DIR>/<repo> worktree add <REPOS_DIR>/wt/<repo>-<ticket> -b <branch> origin/<base>`.
- **node_modules:**
  - backend repos can symlink the main checkout's `node_modules`;
  - a Turbopack/Next.js frontend needs hardlinks: `cp -al` both the repo-root and the app-folder `node_modules`. Turbopack panics on symlinks that point outside the filesystem root.
- **Remove worktrees** when the MR/PR is merged: `git worktree remove`.

## Traps already paid for

- **Version drift:** a rebuilt container can pull a newer shared models library and run its migration (for example `DROP COLUMN … CASCADE`). Every older container then 500s, login included.
  - Recover by re-adding the dropped column (`ADD COLUMN IF NOT EXISTS`), then restart the service holding the leaked pool connections ("sorry, too many clients already").
  - Check versions per container before blaming code.
- **Deprecated services:** a service retired on `<DEV_BRANCH>` may still serve `<LIVE_BRANCH>` code. Don't rebuild it or verify against it, except for `<LIVE_BRANCH>` code that production still serves through it.
- **Host tests:** some service tests run on the host against the stack Postgres, e.g.
  `env NODE_ENV=test NODE_PATH=. ./node_modules/.bin/_mocha "<file>"` (plus whatever loader the repo needs).
  When they clone a template DB, `<CORE_DB>` is safe. Run tests only when the task allows it.
- **<PAYMENT_PROVIDER>** payments (e.g. Stripe) need webhook forwarding: use the `local-payment-webhooks` skill.
