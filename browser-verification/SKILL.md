---
name: browser-verification
description: Drive web apps in a browser (Playwright or CDP Chrome) to reproduce bugs and capture proof. Use when a check needs the app, portal, admin console or legacy pages, locally or on a QA env.
---

# Browser verification

Fill the placeholders from your project's profile; keep the steps.

Pick one **driver** per job:

| Driver | When | Session |
|---|---|---|
| **Playwright script** (`node flow.mjs`) | Repeatable flows: red/green on the local stack, before/after recordings, anything you run twice | Seed `localStorage.<TOKEN_STORAGE_KEY>`, or a `storageState` file |
| **Playwright MCP** (`browser_*` tools) | Exploring an unfamiliar screen step by step, reading the accessibility snapshot | Lost when the MCP browser closes |
| **CDP Chrome** (headed Chrome, port `<CDP_PORT>`, persistent profile) | QA's envs, logged-in sessions that must survive, anything a human has to see or touch (logging in for you, SSO, captcha) | Survives restarts while the profile lives outside /tmp |

A human can't see a headless Playwright browser. When you need the human (to log in, or to watch), use the CDP Chrome on their display. Never say "the browser is open" about a headless one.

## Sessions and credentials

- **Local stack:** get a JWT from the login endpoint, e.g. `POST <LOCAL_URL>/<LOGIN_ENDPOINT>` ([`local-stack`](../local-stack/SKILL.md)). Seed `localStorage.<TOKEN_STORAGE_KEY>` before the first navigation, on any same-origin page such as `/robots.txt`. Use the exact key the app reads; a near-miss name (`authToken` for `accessToken`) leaves you silently logged out.
- **<QA_ENV_URL> / <STAGING_URL>, as any app's user:** use [`app-login`](../app-login/SKILL.md). It asks the admin service (`<LOGIN_AS_ENDPOINT>`) for a login-as token and opens a logged-in CDP tab or writes a `storageState` file.
- **Start the CDP Chrome** with a profile outside /tmp so sessions survive reboots:
  `DISPLAY=:0 nohup google-chrome --user-data-dir=$HOME/.config/<PROJECT>-chrome-profile --remote-debugging-port=<CDP_PORT> --no-first-run >/dev/null 2>&1 &`.
  Check it with `curl -s localhost:<CDP_PORT>/json/list`.
- **Saved credential files** live in `~/.config/<tool>/` with mode 600. Tokens never get printed, written into flow scripts or pasted into reports. Read them into env vars.
- **reCAPTCHA v3** (or similar bot scoring) on shared-env and <PROD> login scores headless browsers as bots. Use login-as, or route the login call and inject the env's captcha bypass secret, read from config and never printed.

## Driving the page

CDP helpers live in `scripts/`. They take a tab id or a URL substring. Env vars: `CDP_PORT` (default 9222), `CDP_HOST` (default 127.0.0.1).

- `node scripts/cdp.mjs <tab> eval '<js>'` evaluates JS and prints the result (awaits promises).
- `nav <url> [waitMs]` navigates; `text [n]` prints the page's innerText; `shot <file.png> [full]` takes a screenshot; `vp <w> <h>` sets the viewport.
- `net <ms> [reload]` reports every 4xx/5xx response and uncaught exception during the window.
- `node scripts/click.mjs <tab> '<js returning an element>'` sends a real mouse click. React, data-grid widgets (e.g. Kendo) and some framework-bound links ignore `el.click()`.
- `node scripts/fclick.mjs <tab> '<js using d>'` clicks inside the first same-origin iframe (`d` is the iframe's document). Legacy server-rendered settings pages embedded in the app (e.g. loaded with `?embedded=true`) render there.

UI rules that cost re-runs:
- **Prove a UI claim along the user's path:** click the filter, type the date, press Apply. Seeding `localStorage` or calling the API sets up state; it proves nothing about what a user sees.
- Buttons and tabs are often CSS-uppercased. Match text case-insensitively.
- Wait on `domcontentloaded` plus a condition (an element, a response). Apps that long-poll never reach `networkidle`.
- **Data grids (e.g. Kendo):** rows are `tr.k-master-row`. Scroll hidden columns into view by setting `scrollLeft` on `.k-grid-header-wrap` and `.k-grid-content`. Column lookup, filters and multiselects: use the helpers in [`flow-recording`](../flow-recording/SKILL.md) (`scripts/lib.mjs`).
- **Per-user state persists:** grid filters, column order, board views/splits and list date ranges. Set them explicitly and record the state you used.
- Actions can move into an overflow dropdown once a form has enough of them. Open the dropdown first.
- Hidden inputs behind custom checkboxes: click the visible icon, not the input.

## Assert below the screen

- In Playwright, collect failures with `page.on('response', r => r.status() >= 400 && bad.push(...))`, plus `pageerror` and console errors. Assert none on the affected endpoints, not just the DOM text.
- With the CDP Chrome, run `cdp.mjs <tab> net 15000` while you act, or with `reload`.
- On failures, quote the error-source / request-id response headers your gateway sets (e.g. `x-error-source`, `x-error-source-request-id`). They name the downstream service that failed.
- After a save, reload and re-read the state.

## Capture

- **Screenshots:** take them with `shot`, crop with PIL to the part that proves the point, and blur personal data with `GaussianBlur`. Open each one with Read before using it.
- **Viewport overrides** reset when the websocket closes. Set the override and take the screenshot in the same script run.
- **Downloads** (Export PDF and similar): send `Browser.setDownloadBehavior` on the browser websocket. Render the PDF with `pdftoppm -png -r 110`, and count rows with `pdftotext`.
- **Proof that lives outside the app** (<PAYMENT_PROVIDER> settings such as Stripe, <LOG_SERVICE> logs): render the read-only data into a small HTML table and screenshot it in the CDP Chrome.
- **Video of a flow:** use [`flow-recording`](../flow-recording/SKILL.md).
- **Video of a CLI next to the browser it opens:** use [`terminal-recording`](../terminal-recording/SKILL.md).

## Safety on shared envs

- In <QA_TEAM>'s apps, read and navigate freely; ask before creating or editing data.
- One agent per CDP tab. Open your own tab with `json/new` and leave tabs you didn't open alone.
- Close Playwright contexts and browsers you started. Delete only the files you created.
