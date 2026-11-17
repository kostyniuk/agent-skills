---
name: quartr-video
description: Build or rebuild a narrated Quartr onboarding/tour video (slides + recorded app screencast + TTS voice + subtitles) and its Notion encyclopedia pages. Use when asked to make a new onboarding video, re-record or re-voice a chapter, or update the encyclopedia.
---

# Quartr onboarding video

Videos live in `/Users/alex/videos`, one folder per video. The template is
`admin-app-overview/` (video 2, ~9:42); copy it for a new video and change only the content
files (`script.json`, `slides/scenes.mjs`, `scripts/segs.mjs`, `encyclopedia.json`) and
the per-video constants at the top of each script (ids in `timeline.py` LEAD/TAIL, title
and output names in `finalize.sh`, Notion parent in `notion_build.py`). Read each script's
head before running it: the scripts are the source of truth for flags and paths. Run
everything from the video folder.

| Folder | Video | Voice |
|---|---|---|
| `quartr-onboarding/` | 1: Quartr terminology, EN + UK subs | ElevenLabs "Alice" (`scripts/tts.py`) |
| `admin-app-overview/` | 2: Admin App feature tour, EN | OpenAI `gpt-4o-mini-tts` "marin" (`scripts/tts_openai.py`) |

## Ground rules (the user's standing preferences)

- **Length**: ~10 minutes, full coverage of every feature. Budget ~8k narration characters
  (video 2 is 23 segments / 7.9k chars). A 4-minute cut was rejected.
- **Autonomous**: work end to end without check-ins. Credentials are already saved in
  `~/.config/quartr-video/` (chmod 600): `openai.key`, `elevenlabs.key` (free tier, nearly
  exhausted: prefer OpenAI), `notion.key`, `env-logins.json` (dev logins from 1Password,
  incl. `super_admin_dev`). Reuse these; ask only if a key is rejected.
- **Dev env, not local**: record against `https://admin.app.dev.quartr.com`. Dev holds no
  private data; mutating it for a demo is fine when you revert afterwards and verify the
  revert (see `scripts/revert*.mjs`).
- **Encyclopedia**: every video also feeds the Notion "Admin App Encyclopedia" (one page per
  feature: clip + screenshots + plain-English explanation).

## Pipeline

1. **Script**: write `script.json`, an array of `{id, visual: "slide"|"app", title, text}`.
   Ids sort in play order (`b01_intro`, `b02_nav`, …). Write for the ear: spell out what TTS
   mangles ("Command K", "Q and A", "S and P"); `scripts/subs.py` REPL maps them back to
   `⌘K`, `Q&A`, `S&P` in the subtitles.
2. **Voice**: `python3 scripts/tts_openai.py [segId ...]`. Writes `audio/<id>.mp3` and
   `audio/<id>.json` (per-character timings, aligned from Whisper word timings). Skips
   segments that already have a `.json`; pass ids to redo them. Check every `match` ratio
   printed is ≥0.95; a low ratio means the narration drifted from the text, so regenerate.
3. **Timeline + subs**: `python3 scripts/timeline.py && python3 scripts/subs.py` →
   `build/timeline.json` (each segment's window = lead + audio + tail), `subs/en.srt|vtt`.
   Rerun both whenever any audio changes; every later step reads the timeline.
4. **Slides**: `node scripts/render-slides.mjs stills` to eyeball, then
   `node scripts/render-slides.mjs video [segId ...]` → `build/scene_<id>.mp4`. Elements in
   `slides/scenes.mjs` animate in on `data-at="<narration phrase>"` or `data-t="<seconds>"`.
5. **App recordings**: `node scripts/record-seg.mjs dry [segId ...]` first (fast, writes
   `build/dry_*.jpg`), then without `dry` → `build/seg_<id>.mp4`. Each segment in
   `scripts/segs.mjs` is a list of parts: `setup` loads the page off-camera, `steps` fire on
   narration phrases via `at(seg, 'phrase')`. The phrase must appear verbatim in the
   segment's text (`scripts/check-phrases.mjs` checks all of them). Helpers `h.click`,
   `h.box`, `h.call(key, value)` (callout chip) and `h.clear` come from `scripts/overlay.js`.
6. **Finalize**: `bash scripts/finalize.sh` → `out/<name>.mp4` (soft EN subs) and
   `out/<name>_captions-en.mp4` (burned-in captions) + `.srt`/`.vtt`. It prints each output's
   duration; `compose.py` prints `WARN duration` for any segment whose clip length differs
   from its timeline window: re-render that segment.
7. **QC**: pull frames at ~10 timestamps across the final video
   (`ffmpeg -ss <t> -i out/….mp4 -frames:v 1 build/qc_<t>.jpg`) and look at every one:
   no login screens, error toasts, empty tables or stray cursors. Done when every frame is
   clean and the durations match.
8. **Encyclopedia**: `python3 scripts/notion_build.py [--only key ...]` (video 2 pages, from
   `encyclopedia.json`) or `python3 scripts/notion_basics.py` (video 1 pages, from
   `encyclopedia_basics.json`). Parent page `406d78a9-9812-809b-9956-fd8462466e8f`. Re-running
   archives the pages it created before (state in `build/notion_state*.json`). Clips are cut
   from the captioned video at segment boundaries; helpers in `scripts/notion_lib.py`.

## Dev admin app gotchas

All handled in `admin-app-overview/scripts/auth.mjs` (`login()`, `guard(ctx)`); copy it
rather than rediscovering them.

- **gulf** (`admin.gulf.dev.quartr.com`) returns 401 for seed users, and the app signs out on
  any gulf 401 → login loop. Abort gulf requests.
- **captain** rejects seed-user tokens: stub `/v1/me` and `assignmentcandidates` (with CORS
  headers), and strip `includeTeamAssignments` from `admin/v2/events/table` POST bodies.
  Leave `/v1/me` unstubbed on `/permissions`.
- **Toasts**: hide sonner toasts with `style.display = 'none'`; removing their nodes crashes
  React.
- **Session**: storage state expires in ~15–30 min; re-login when `build/state_*.json` is
  older than 15 min.
- **Demo data**: dev's last 30 days are mostly test events and dev S3 blocks PDF previews
  (403). Use 2025-10-23 (Q3 2025 Nordic reporting day) and SBAB Bank (`/companies/15304`).
