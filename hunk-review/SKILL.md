---
name: hunk-review
description: Pull the human's inline comments off a live Hunk diff-review session and resolve each one. Use when the user has Hunk open and says "read my comments", "address the review", "use the hunk skill", "fix my review notes", or otherwise points at notes they left on a diff.
---

# Hunk review comments

Fetch what the user wrote on the diff, then work each note. This skill is about their
comments — not about reviewing the code yourself. For the raw command surface see the
vendor skill at `$(hunk skill path)`.

The TUI belongs to the user: never run `hunk diff` or `hunk show`.

## Grab the comments

`hunk` is often not on the agent's PATH. Use `HUNK=$(command -v hunk || echo ~/.hunk/bin/hunk)`.

```bash
$HUNK session list                                   # confirm a session exists
$HUNK session comment list --repo . --type user      # ← the work item
$HUNK session review --repo . --include-notes --json # same notes, with line anchors
```

Without `--type user` you get the legacy live-agent view, not their notes. `comment list`
gives only the file and hunk; take the line each note sits on from `review --json`
(`reviewNotes[].newRange`, or `oldRange` for a deleted line). Read that line before
answering: "can this be reused?" means the line it's anchored to, not the whole file.

`hunk session list` also shows whether the session is **staged** or working-tree. On a
staged session a comment's line numbers refer to the staged blob, so read it with
`git show :<path>` when they disagree with the file on disk.

## Do not author your own

Comments are input here, not output. Only write comments when the user explicitly asks
for a review. If you already added some before they pointed you at theirs, drop them:

```bash
hunk session comment rm --repo . <comment-id>
```

## Resolve each one

Every comment gets an outcome — **fixed**, **answered**, or **needs their call**.
Nothing is silently skipped, including the ones that are just a question.

Resolve against, in order of authority:

1. **This conversation** — a comment often refers to something already established here.
2. **The linked ticket** (Jira, Linear, GitHub issue, …) — the requirement usually settles "should this exist at
   all" questions. A deletion that looks like scope creep is frequently an explicit
   requirement. Fetch it rather than guessing.
3. **CLAUDE.md / AGENTS.md** — the repo's own conventions decide most style comments
   ("tailwind", "move to helper file", "too many comments"). Read them; don't recite
   them from memory, and don't restate them back at the user.
4. **The code** — last, and only to confirm a specific claim.

One-word comments (`comment`, `tailwind`) mean "apply the standing convention here" —
look it up in CLAUDE.md rather than asking what they meant.

## Report

Point-by-point, in the user's own numbering or ordering. A table for the mechanical
fixes, prose for the judgement calls. Name explicitly the ones only they can decide,
and say what you did **not** do.

Use `hunk session navigate --repo . --file <path> --new-line <n>` to steer their view
while you explain (`--next-comment` jumps to their next note). Answer in chat, not by
adding comments back into their session.

## Keep their view alive

A working-tree session goes empty once you commit, and a staged one does once you
unstage. After either, point it back at the change; their notes survive a reload:

```bash
$HUNK session reload --repo . -- diff <base-sha>   # whole branch, e.g. the merge-base with main
$HUNK session reload --repo . -- diff --staged     # back to the staged view
```

Say in your report which diff the window now shows.

## Notes that widen the scope

A note like "can this be shared?" often points at code the change copied from its
siblings, so fixing it means editing files outside the ticket. Show the copies with a
count, then ask how far to go: everything in this PR, only the new code, a stacked
refactor PR under this one, or a follow-up ticket. Don't touch the siblings before they answer.

## Answering discipline

They will check, and they may have sources you don't.

- Concede in one line when refuted; don't relitigate.
- Say "unverified" when you couldn't check something (a dependency that isn't installed
  locally, a service you can't reach) instead of asserting.
- Grep hits are not consumers — near-miss names (`SelectWithGrouping` vs
  `MultiSelectWithGrouping`) inflate counts. Split matches before quoting a number.
- Flag disagreement once, then follow their decision.
