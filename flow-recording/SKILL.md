---
name: flow-recording
description: Record a video of a UI flow on the local stack and attach it to the MR/PR and the <TRACKER> ticket. Use when a fix needs before/after video or a demo.
---

# Flow recording

Fill the placeholders from your project's profile; keep the steps.

Record a webm of the changed flow, upload it to <CODE_HOST>, post it as an MR/PR note (MR below).
Script paths below are relative to this skill folder. GitLab renders webm uploads as an inline video
player. Everything needed lives in this folder; nothing depends on session memory or repo-local
files.

## One-time setup

```bash
scripts/setup.sh
```

It registers the `playwright` MCP server (user scope) with a config it generates from
`config/playwright-mcp.config.template.json` into `config/playwright-mcp.config.json`, filling the
`__OUT__` (recordings dir) and `__SKILL__` (this folder) placeholders with absolute paths (headless
Chromium, 1920x1080, video on). It also downloads Chromium and checks `glab api user`. Log in with
`glab auth login` if that check fails. Restart Claude Code afterwards: MCP tools only load at session
start. Recordings land in `~/mr-recordings` (override with `MR_RECORDINGS_DIR` before running setup).

The scripts read the app and login from env vars. Export them for your stack:

| Variable | Meaning | Default |
|---|---|---|
| `DEV_URL` | `<LOCAL_URL>`, base URL of the app | `http://localhost:3000` |
| `DEV_USER` / `DEV_PASS` | `<TEST_USER>` credentials | none, required for form login |
| `LOGIN_PATH` | login page path | `/login` |
| `LOGIN_FRAME` | selector of the iframe holding the login form, empty when the form is in the page | empty |
| `LOGIN_USER_SELECTOR` / `LOGIN_PASS_SELECTOR` / `LOGIN_SUBMIT_SELECTOR` | form fields | `input[type=email]` / `input[type=password]` / `button[type=submit]` |
| `DEV_TOKEN` / `TOKEN_STORAGE_KEY` | token login for `record-local-token.mjs`: the token and its `<TOKEN_STORAGE_KEY>` in localStorage | none / `accessToken` |
| `GITLAB_HOST` / `GITLAB_TOKEN` | `<CODE_HOST>` host and an optional token overriding glab's | `gitlab.com` / glab's |

`reference/dev-environment.md` has the details, and flags which of its values are examples rather
than facts - check them against your own stack before trusting them.

## Workflow

0. **Check `glab api user` first.** The stored OAuth token expires silently; a dead token only
   surfaces at the upload step, after the recording work is already done.
1. **Pick the flow.** Read the MR diff (`glab mr diff <iid>` or a <CODE_HOST> MCP) and choose the
   single flow that proves the change. Keep it under two minutes.
2. **Warm up.** A dev server that compiles each page on first visit (e.g. Next.js dev mode) shows
   long spinners in a video. Visit every page of the flow once without recording:
   ```bash
   node scripts/warmup.mjs /list-page /detail-page
   ```
   It logs in, opens each path, and prints per-page times. Run it right before recording.
3. **Record.** Use the `playwright` MCP tools (`browser_navigate`, `browser_click`, `browser_type`,
   `browser_snapshot`), then `browser_close`. The webm is written only when the context closes. Rename
   `page@<hash>.webm` to a meaningful name. Login steps and known routes are in
   `reference/dev-environment.md`; read it before driving the UI.
   Fallback when the MCP tools are not loaded: `scripts/record.sh <name>` runs
   `scripts/record-template.mjs`, which runs the `flow` function once unrecorded as its own warm-up,
   then records it. Edit the `flow` function in a copy for a different flow. For an app that takes a
   token instead of a login form, `node scripts/record-local-token.mjs <name> <flow-module.mjs>`
   (with `DEV_TOKEN`) seeds localStorage and records the module's exported `flow`.
4. **Check** two or three screenshots before uploading. A spinner or 404 in the video is worse than
   no video.
   Check the *flow* too, not just that it worked: a video that drives an unrelated control, or
   acts on an element that is in the DOM but hidden, proves nothing to a reviewer even when the
   assertions pass. Prefer `.first()` on a scoped container over a page-wide selector, and assert
   visibility (`offsetParent !== null`) rather than element count when a panel is collapsible.
5. **Attach to the MR.**
   ```bash
   scripts/attach-to-mr.sh <project-path-or-id> <mr-iid> <file.webm> ["intro text"]
   ```
   Prints the note id, the upload markdown, and `NOTE_URL=` — the deep link to the note, which is
   what step 6 needs. The script is GitLab-only; on GitHub there is no uploads API for PR comments,
   so attach the video through the web UI (drag into the comment box) or host it elsewhere and link it.
6. **Attach to the <TRACKER> issue.** Do it in the same pass, not "later".
   - Upload the webm (and key screenshots) as <TRACKER> attachments with the helpers in [`tracker-ops`](../tracker-ops/SKILL.md). <QA_TEAM> can't open <CODE_HOST> uploads: they redirect to sign-in.
   - Link the file in the QA comment with the tracker's attachment syntax (e.g. `[^file.webm]` in Jira), and add the `NOTE_URL` from step 5 for reviewers.
   - Word the comment following [`ticket-communication`](../ticket-communication/SKILL.md).
   - If the change can't be recorded (backend-only, or an env the local stack can't run), still comment. Say why there is no video and what to check instead.

## Rules

- Post to an MR or a <TRACKER> ticket only when the user has authorised posting recordings. Otherwise
  run the upload, show the markdown, and ask.
- <TRACKER> comments are read by <QA_TEAM> and by people outside the team. Keep customer names, app ids
  and internal URLs out of them unless the ticket already has them.
- Never record customer-facing actions (emails to customers, sending a real order onward) or real
  customer data. Uploads are visible to everyone with project read access.
- gitlab.com upload limit is 100 MB; a 1080p webm is roughly 5-8 MB per minute (Playwright encodes at a fixed 1 Mbit/s VP8; resolution is the only quality lever).

## Kendo grid flows (data-grid list pages)

`scripts/lib.mjs` exports `waitForGridRows`, `columnFilter`, `clearFilterTags`, `selectFilterOption`
and `visibleOptions` for Kendo-style data grids (adapt the `.k-*` selectors for another grid
library). Use them instead of hand-rolling selectors — each one exists because of a failure that
cost a re-record:

- **Never hardcode a column index.** Column order and visibility are often saved per user and differ
  between sessions; resolve by header text (`columnFilter(page, 'STATUS')`).
- **Grid filters can persist in the user's table settings.** A filter applied by the warm pass is
  still there when the recorded pass starts, so the video opens already filtered. Clear it between the
  two passes in a separate non-recorded context, not just at the start of the flow.
- **`warmUp` caps `settle` at 1500ms**, so fixed sleeps that pass in the recorded pass fail in the
  warm one. Use condition-based waits (`waitForFunction`, `locator.waitFor`) for anything the server
  drives. Client-side history updates need `waitForFunction(() => location.href.includes(...))` —
  `waitForURL` waits for a navigation that never fires.
- **Multiselect selection is keyboard, not click.** Clicking a virtualised `.k-item` misses when the
  list re-renders. Type, wait for the match, then `page.keyboard` ArrowDown + Enter — and retry the
  whole sequence, because the search debounce makes it flaky either way.

To measure an endpoint from inside the logged-in page, call it with the token the app itself sends
(read it from the app's client store or `localStorage.getItem('<TOKEN_STORAGE_KEY>')`, in whatever
header shape the API expects — check one real request in the network panel). Useful for putting real
before/after numbers on a performance MR.

## Gotchas already paid for

- `glab api -F` cannot send multipart files. Upload with curl; the attach script does this.
- Linking an upload **outside** GitLab (e.g. from a <TRACKER> ticket) needs the API response's
  `full_path` (`/-/project/<id>/uploads/<secret>/<file>`), not a hand-built
  `/<group>/<project>/uploads/...` path — that shape 404s. The `markdown` field is a
  project-relative link and only resolves inside GitLab itself.
- Upload URLs are browser-session authenticated: curl with a token gets `302 -> /users/sign_in`
  even for a file that renders fine in an MR, so curl cannot verify a link is good. Open it in
  a signed-in browser instead.
- glab logged in via OAuth needs `Authorization: Bearer <token>`; `PRIVATE-TOKEN` returns 401. A
  personal access token needs the reverse. The attach script reads `is_oauth2` from glab config and
  picks the right header, or uses `GITLAB_TOKEN` if set.
- Headless Chromium has no OS cursor, so videos show none. `scripts/cursor-overlay.js` draws one
  (arrow plus a click ripple) and is injected into every page: via `browser.initScript` in the MCP
  config and `addInitScript` in the recorder. Playwright moves the mouse to the element before
  clicking, so the overlay follows real interaction; `page.mouse.move` adds deliberate travel.
- The current `@playwright/mcp` has no `--save-video` flag. Video is enabled through
  `browser.contextOptions.recordVideo` in the config file.
