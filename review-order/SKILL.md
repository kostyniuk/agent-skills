---
name: review-order
description: Lay out a branch's or PR's changes as a reading order that shows how it all works, file by file.
disable-model-invocation: true
argument-hint: "What to order? (PR link, branch, base SHA; default: current branch vs its base)"
---

Give the user a reading order for $ARGUMENTS, or the current branch's changes when no argument is given. Read in this order, the path is the story: a reviewer who follows it understands the change without jumping around.

1. **Collect the change set.** Find the base (PR base branch, the SHA the user named, or `git merge-base` with the parent branch) and list every changed file: `git diff --stat <base>`, plus `git status --short` for uncommitted and untracked work. Read each file's diff. Done when you hold the full list and can say in one sentence what the change does.

2. **Order it along the request path.** Follow one request or data flow through the change, from the outside in:
   1. **Context**: the existing code being replaced or extended, unchanged files included, so the reviewer knows the "before".
   2. **Contract**: shared types and schemas, leaves up to the top-level shape, then inputs (bodies, queries) and error shapes. Name the external spec they mirror, if any.
   3. **Wiring**: where the new code plugs in (routes registry, module index, config).
   4. **Behaviour, top-down**: controller or entry point → interface → service → helpers → config, each in call order.
   5. **Old vs new**: when the change replaces something, a short status-by-status or case-by-case comparison: what stayed the same, and what changed on purpose.
   6. **Tests as the spec**: tell them to read the `it(...)` names first; call out the cases that cover edge behaviour.
   7. **Consumers**: callers on the other side (clients, frontend) that changed.
   8. **Plumbing**: package.json, lockfile, barrels, CI files. Grouped, one line.
   9. **Evidence**: screenshots, logs, verification notes, if any exist.

   Skip a group the change doesn't have. Done when every changed file appears exactly once, in a group.

3. **Write it.** A heading per group. Each file is a clickable markdown link with one line on what to look for there: the decision, quirk, or gotcha it holds, not a restatement of its name. Point out comments in the code that explain a non-obvious choice. Define internal names the user may not know on first use.

4. **Offer the viewer.** If the user reviews in Hunk (`~/.hunk/bin/hunk`), note that untracked files only show once staged or added with `git add -N`, and offer to do it. Touch the index only when they say yes.
