---
name: proof-video
description: Make a narrated demo video that proves a backend change end to end: a real click in the local app, then the database rows that click just created, shown live in a desktop DB client. Slides, voice-over and captions included.
disable-model-invocation: true
argument-hint: "What to prove? (the change or PR, the screen and action that trigger it, the table that records it)"
---

# Proof video

Fill the placeholders from your project's profile; keep the steps.

Prove $ARGUMENTS in a narrated video of one to three minutes that a reviewer can follow without the code: why the change exists, a real action in the running app, then the database showing the rows that action created. The **proof** is the pairing: the click on screen, then rows whose `created_at` falls in the last minute. A query alone, without the click, proves nothing.

Script paths are relative to this skill folder. `scripts/setup.sh <project-dir>` creates a working project with every script, the fonts and the input helpers; run each command below from that project. Needs macOS (the DB capture uses `screencapture` and CoreGraphics input), node, python3, ffmpeg, and an ElevenLabs API key in a file (`XI_KEY_FILE`).

## Steps

1. **Pin the proof.** Write one sentence: "On `<LOCAL_URL>` running `<branch@sha>`, clicking `<control>` on `<screen>` writes `<rows>` to `<table>`." Find the screen by grepping the frontend for the client call, and pick a record whose state makes the change visible. Done when you can name the control, the record, the query, and each column the video will show.

2. **Stage it safely.** Run the stack locally ([`local-stack`](../local-stack/SKILL.md)). Point the backend's upstream URLs at `scripts/read-through-stub.ts`: reads pass through to `<DEV_ENV>` and writes are answered locally, so real clicks change nothing shared. Edit its `UPSTREAMS`, `READ_POSTS` and `synthesise` for your services. For services you don't run, list them in `BLOCK_HOSTS` so the page doesn't show their errors. Done when the screen loads with real-looking data, and a dry click shows the write's request in the network log.

3. **Write the narration.** In `script.json`, add an intro slide, the app segment, the DB segment (`"visual": "datagrip"`) and an outro slide (start from the example). Every action the video shows fires on a phrase of its segment's narration, so write that phrase into the text. Spell out spoken forms ("status two hundred") and map them to their written form for captions in `subs-replace.json`. Then:
   ```bash
   XI_KEY_FILE=<key-file> python3 scripts/tts.py && python3 scripts/timeline.py
   ```
   Done when `build/timeline.json` lists every segment with its window, and each audio clip sounds right.

4. **Make the slides.** In `slides/scenes.mjs`, add one scene per slide segment. Each element appears on its `data-at` phrase. Run `node scripts/render-slides.mjs stills`, view the stills, fix any overlaps, then run `node scripts/render-slides.mjs video`.

5. **Record the app segment.** Copy `scripts/app-steps.example.mjs` and write the steps: `hl` (box and cursor), `call` (a callout), and `click` (a real click), each after `await T(at('<phrase>'))`.
   - Dry run first, with `APP_URL`, `APP_USER` and `APP_PASS` set: `node scripts/record-app.mjs <segment> <steps.mjs> dry`. View a few frames.
   - Then record the real take. The click happens for real.

   Done when the log shows the write's 2xx and no 4xx/5xx you can't explain, and the frames show the cursor on the control and the confirmation on screen.

6. **Record the DB segment within the minute.** Prepare the client first with [`reference/desktop-app-capture.md`](reference/desktop-app-capture.md): permissions, window, layout, and calibrated scroll beats in `db-segment.json`. Select every column, ordered as the narration reads them, and filter `created_at` to the last minute. Then start `python3 scripts/record-db.py db-segment.json` straight after the real app take, so the only rows on screen are the ones the click made. Done when the recording shows the query running, the new rows, and every column scrolled into view, ending on `created_at`.

7. **Assemble and check.** Run `NAME=<name> TITLE="<title>" scripts/finalize.sh`.
   - **Duration warning:** if `compose.py` warns about a segment's length, pad it with `tpad` and rerun.
   - **Frame check:** pull six frames across the timeline into one contact sheet and view it.

   Done when every frame passes: captions in a sans-serif font, the click and its confirmation visible, the rows with their `created_at`, and the last column reached.

8. **Attach and clean up.**
   - **PR:** attach `out/<name>_captions-en.mp4` (`gh pr edit <n> --body-file <f> --attach <mp4>`). gh leaves the local path in the body and appends the upload URL at the end; move the URL into place with a second `gh pr edit`.
   - **Provenance:** say which commit the stack ran. If the PR's head moved since, say whether its tree is identical to the one recorded.
   - **Clean up:** stop the servers you started, restore anything you changed in the DB client, and list the rows the demo left in the local database.

## Rules

- **Writes stay on the local stack.** Shared environments are read-only: send their writes to the stub.
- **Keep the DB client at its normal zoom.** Larger zoom wraps the query and hides columns; the 16:9 window already records at 1080p.
- **One take per proof.** A failed take means re-recording both the app and the DB segment, because the one-minute filter only shows rows from the latest click.
- **Keys stay in files.** Pass them by path (`XI_KEY_FILE`), and never print one.
