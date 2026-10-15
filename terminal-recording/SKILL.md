---
name: terminal-recording
description: Record a terminal (a CLI such as Claude Code or gh) side by side with the browser it opens, in one video.
disable-model-invocation: true
---

# Terminal + browser recording

Fill the placeholders from your project's profile; keep the steps.

Playwright only records browser pages. So turn the terminal into a page: **ttyd** serves a real shell
over a websocket, and xterm.js draws it in the browser. A tiny local host page puts that terminal in
an iframe on the left and a "browser" iframe on the right. Playwright records the host page, so
both sides land in **one** webm, in sync.

```
Playwright page (recorded) ── http://localhost:9034  host page   (STAGE_PORT)
 ├─ iframe #term ── http://localhost:7681  ttyd ── PTY ── bash ── your CLI   (TTYD_PORT)
 └─ iframe #web  ── whatever the CLI opened (fake xdg-open → right pane)
```

Typing goes through `page.keyboard` into xterm.js, and from there into the real PTY. With the DOM
renderer (`-t rendererType=dom`), the screen text sits in `.xterm-rows`, so a flow can wait on
terminal output just like on page text. A fake `xdg-open` first on the shell's `PATH` catches every
URL the CLI tries to open, and the flow loads it into the right pane.

## Setup (once, no sudo)

```bash
scripts/setup.sh
```

It downloads the static `ttyd` to `~/.local/bin` (override with `TTYD_BIN`, version with `TTYD_VERSION`),
installs Playwright and fetches Chromium. Videos go to `~/mr-recordings` (override with `MR_RECORDINGS_DIR`).

The stage reads these env vars:

| Variable | Default | Purpose |
| --- | --- | --- |
| `TTYD_BIN` | `~/.local/bin/ttyd` | ttyd binary |
| `TTYD_PORT` | `7681` | ttyd port (left pane) |
| `STAGE_PORT` | `9034` | host page port |
| `MR_RECORDINGS_DIR` | `~/mr-recordings` | where the webm lands |
| `CURSOR_OVERLAY` | `../flow-recording/scripts/cursor-overlay.js` | visible cursor script, injected when recording if the file exists |
| `RECORD` | unset | `1` records; anything else is a fast debug run |

## Writing a flow

`scripts/stage.mjs` does the plumbing. A flow is a short script in `scripts/examples/`:

```js
import {startStage} from '../stage.mjs';

const stage = await startStage({title: 'Terminal — my CLI', cwd: '/tmp/demo', prompt: 'demo $ '});
const {term, web, pause} = stage;
try {
  await term.run('my-cli login');                    // types it and presses Enter
  const url = await stage.nextBrowserRequest();      // what the CLI tried to open
  await web.open(url);                               // shows it in the right pane
  await web.frame.getByRole('button', {name: 'Allow'}).click();
  await term.waitFor(/Logged in/, {after: 'my-cli login'});
  await pause(3000);                                 // let the viewer read; ~0 when not recording
} finally {
  console.log('VIDEO=', await stage.stop());         // the webm is written when the context closes
}
```

Run it once without recording (`node examples/flow.mjs`) to debug, then for real with `RECORD=1`.
`pause()` shrinks to 200 ms on unrecorded runs, so debugging is fast.

`examples/claude-mcp-login.mjs` is a complete one: the real Claude Code CLI runs `claude mcp add` and
`claude mcp login`, the user signs in to <PROJECT> and clicks Allow in the right pane, then Claude
answers a prompt using the server's tools. Configure it with `MCP_URL`, `APP_USER` and `APP_PASS`
(required, a <TEST_USER> on the target env), plus `MCP_NAME` (default `project`), `PROMPT`,
`ALLOWED_TOOLS` (default: every tool of that server), `EMAIL_SELECTOR` / `PASS_SELECTOR` (login form
fields, default `#email` / `#pass`) and `DEMO_DIR`.

## Check, then attach

```bash
node scripts/frames.mjs ~/mr-recordings/<file>.webm 8 /tmp/frames   # no ffmpeg needed
```

Look at the frames before uploading. Then use the [`flow-recording`](../flow-recording/SKILL.md) skill's `attach-to-mr.sh` and its
<TRACKER> step. Its rules apply: authorised posting only, no customer data, and link the note, not the
upload.

## Gotchas already paid for

- **Never pass shell flags straight to ttyd.** Its getopt permutes argv, so `ttyd … bash -i` reads
  `-i` as ttyd's own interface option and segfaults. The stage wraps the shell in a script.
- **`-t rendererType=dom` is required** for `term.waitFor`. With the canvas or webgl renderer,
  `.xterm-rows` is empty.
- **CLIs open URLs with `xdg-open`, not `$BROWSER`** (Claude Code ignores `BROWSER`). The fake
  `xdg-open` covers both.
- **Nested Claude Code:** unset `CLAUDECODE` and `CLAUDE_*` (the stage does this by default) or the
  child thinks it runs inside a session. Its folder-trust dialog defaults to **"No, exit"**, so
  press ArrowDown, then Enter. It signals the end of an answer with `… for 12s · done 12:21 PM`;
  there's no "esc to interrupt" to wait for. It runs on the user's own account and settings, so
  limit tools with `--allowedTools` and keep prompts read-only unless writes are the point.
- **Claude Code OAuth needs https, or `localhost`** for the issuer. On a local stack, use
  `http://localhost:<port>` rather than a hosts-file name like <LOCAL_URL>.
- **A public https site in the right pane can't redirect to the CLI's `http://localhost` callback**
  (Chrome's Local Network Access blocks it, and the pane goes blank after Allow). This only happens
  in the iframe: a real top-level browser is fine. For recordings against a deployed env, launch
  Chromium with `--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessForNavigations,BlockInsecurePrivateNetworkRequests`.
- **Login behind reCAPTCHA v3** (typically <QA_ENV_URL> and <PROD>) scores headless Chromium as a bot (`403 invalid-score`). Route
  the login request (e.g. `**/<login-endpoint>*`) and set the body's captcha `token` to the env's test bypass secret,
  as your synthetic monitoring does. Read it into an env var; never print it.
- **Keep both iframes same-site** (`localhost` on different ports is fine). A cross-site iframe gets
  partitioned storage, so a localStorage login silently fails. `X-Frame-Options` or CSP
  `frame-ancestors` on the target blocks the pane outright.
- **One page = one video.** Opening a second tab (`context.newPage()`) writes a second webm. Keep
  everything in the host page's two panes.
- **The inherited `PS1` is dropped** by `bash -i`. Set the prompt through `--rcfile` (the stage does).
- Playwright's webm reports `duration = Infinity` until you seek to the end; `frames.mjs` handles it.
- ~4 MB per minute at 1920x1080. Check the <CODE_HOST> upload limit (gitlab.com: 100 MB).
