# Evidence formats

Evidence has exactly two states: **before** (the target branch, with the whole fix absent) and **after** (the MR's final code). Intermediate iterations never appear. When the fix changes, replace the after evidence and any text describing it, in the MR and in the <TRACKER> comment.

## By change type

| Change | Before / after evidence |
|---|---|
| UI (every frontend app) | Screenshots of the same screen and the same data. Use a short webm ([`flow-recording`](../flow-recording/SKILL.md)) when the bug involves a flow, motion or timing |
| Backend / API | The real request and the trimmed response, in a fenced block, from the unfixed container and from the fixed one |
| Data / query | The query and its output (ids and counts, no personal data) |
| Webhook / event / worker | The triggering action plus the container log lines or resulting DB rows, with timestamps |
| Performance | Measured timings of the same request, several runs each, called from the page with the raw token read from `<TOKEN_STORAGE_KEY>` |

## Where it goes

- **MR description:** the before → after pair goes in its Verification part; the format itself is owned by `ticket-communication` (`MR-DESCRIPTION.md`). Upload images to <CODE_HOST> (helpers in [`tracker-ops`](../tracker-ops/SKILL.md)) and embed them inline. A show-me diagram is allowed only in addition to real evidence.
- **<TRACKER>:** attach each image to the ticket. QA often can't open <CODE_HOST> upload links, which redirect to sign-in. Embed each image under a one-line caption in the QA comment, using the tracker's inline-attachment syntax. The comment's wording follows [`ticket-communication`](../ticket-communication/SKILL.md).
- **Files:** keep them in `${MR_RECORDINGS_DIR:-~/mr-recordings}/<TICKET-KEY>/`, named `<TICKET-KEY>-<env>-<app>-<what>.png`.

## Capture hygiene

- Crop to the part that proves the point.
- Blur emails, contact names and addresses with PIL `GaussianBlur` before uploading.
- Open every image with Read before uploading. A spinner, a 404, a login page or the wrong tab proves nothing; drop it and recapture.
- A video should drive the exact control under test. One that clicks a hidden or unrelated element passes no review, even if its assertions pass.
- Record before and after with the same flow script.
- Evidence from QA's env goes into <TRACKER> as proof for QA. The MR still needs the local before/after.
