---
name: app-login
description: Log in to a QA or staging environment as any app's user, unattended, via the admin login-as API. Use when you need a session in QA's app.
---

# Log in as an app user on a shared environment

Fill the placeholders from your project's profile; keep the steps.

The admin console's user **Login** button calls `POST <LOGIN_AS_ENDPOINT>` (for example `/admin/api/user/<userId>/login-as`):
- That call is authorised by a system-admin token. Check how the header is sent: some admin APIs take a raw `authorization: <token>` with no `Bearer` prefix.
- It returns an app JWT (typically short-lived, e.g. 24 h) that carries an app-id claim such as `appId`.
- The app only needs that JWT in `localStorage.<TOKEN_STORAGE_KEY>` on the same origin.

**Allowed envs:** only the ones listed in the script's `envs` config, e.g. `dev` (<QA_ENV_URL>), `staging` (<STAGING_URL>) and the release env (<RELEASE_ENV_URL>). <PROD> and customer instances need approval first; leave them out of `envs`.

## Steps

1. **Find the app.** Take the env and app id from <QA_TEAM>'s comment ("ENV Dev, app 42") or from their video frames.

2. **Log in:**
   ```bash
   APP_LOGIN_CONFIG=~/.config/app-login/config.json \
     node scripts/login.mjs --env dev --app <TEST_APP> [--user <id>] [--path /some-page] [--state /tmp/dev-<TEST_APP>.json]
   ```
   - Configure it once: copy [`scripts/app-login.example.json`](scripts/app-login.example.json) (the documented shape of the flow) and fill `envs` and the three endpoints. Any key can be overridden by an env var: `APP_LOGIN_ENVS` (`dev=https://…,staging=https://…` or JSON), `APP_LOGIN_ADMIN_LOGIN_PATH`, `APP_LOGIN_USERS_PATH`, `APP_LOGIN_LOGIN_AS_PATH` (with `{userId}`), `APP_LOGIN_ADMIN_TOKEN_FIELDS` (comma list), `APP_LOGIN_TOKEN_FIELD`, `APP_LOGIN_AUTH_HEADER`, `APP_LOGIN_AUTH_SCHEME` (empty = raw token), `APP_LOGIN_USER_APP_FIELD`, `APP_LOGIN_USER_ROLE_FIELD`, `APP_LOGIN_ADMIN_ROLE`, `APP_LOGIN_APP_CLAIM`, `APP_LOGIN_STORAGE_KEY`, `APP_LOGIN_COOKIE`, `APP_LOGIN_CREDS_DIR`, `APP_LOGIN_ADMIN_CONSOLE_PATH`, `APP_LOGIN_LOGIN_PAGE_PATH`, `APP_LOGIN_DEFAULT_PATH`, `CDP_PORT`. Missing env map or endpoints exit 2.
   - It picks the app's admin-role user, or the first user if there's none. `--user` overrides this.
   - If a CDP Chrome is running on `CDP_PORT` (default 9333), it opens a new tab already logged in at `--path` and prints `TAB <id> <url>`.
   - `--state` writes a Playwright storageState file (mode 600) for headless use: `browser.newContext({storageState})`.
   - It prints `OK env=… app=… user=… exp=…` and checks the token's app claim matches. It never prints tokens; keep it that way.

3. **Handle exit code 3 (`NO_ADMIN_SESSION`).** Neither admin-token source is available. Ask a human to do one of these, and do nothing else:
   - log in to that env's admin console (<ADMIN_URL>) in the CDP Chrome (its admin cookie, `cookieName` in the config, keeps the session);
   - create `<CONFIG_DIR>/<env>.json` (default `~/.config/app-login/<env>.json`) containing `{"login": "...", "password": "..."}`, chmod 600. This makes it fully unattended.

   Other exit codes: 2 bad arguments or config, 4 no users for the app, 5 the token is for a different app.

Done when the tab or state file opens QA's app on the screen you need.

## Credential rules

- Admin credentials and tokens stay in `<CONFIG_DIR>` (mode 600) or in the CDP profile. Never in repos, flow scripts, MRs/PRs, <TRACKER> or chat.
- A login-as session acts as a real user in QA's app. Read freely; ask before creating or editing data.
