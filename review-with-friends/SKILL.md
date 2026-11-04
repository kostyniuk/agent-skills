---
name: review-with-friends
description: Run /code-review through other providers' models (default GPT Sol 6.1 and Grok 4.7) in parallel and merge their reports. Use when the user says "review with friends", or asks to get the current change reviewed by Sol, Grok or other outside models.
---

# Review with friends

Run the two-axis [code-review](https://github.com/mattpocock/skills) through outside
models, one delegate per model, then report their findings side by side.

Needs a host that delegates to other providers' models (written for T3 Code's
`orchestrator_capabilities` and `delegate_task`) and the `code-review` skill installed.

## Reviewers

Default: GPT Sol 6.1 (`codex` / `gpt-6.1-sol`) and Grok 4.7 (`grok` /
`grok-4.7`), both at `reasoningEffort: high`. If the user names other models,
use those. Resolve each with `orchestrator_capabilities` (search the name).
If one is missing or disabled, say so. Never substitute another model.

## 1. Pin the change

- Fixed point: what the user names. Otherwise the merge-base with
  `origin/main` for committed work, or `HEAD` for uncommitted work.
- Check `git status --short`. Untracked files don't show in `git diff`, so
  list them for the reviewers by path.
- Fail here if the ref doesn't resolve or the change is empty.

## 2. Write the spec and brief files

Delegates get no history, so write two files under
`/tmp/review-with-friends/<branch-or-ticket>/`:

- `spec.md`: the ticket text (fetch it from `<TRACKER>` when the branch or commits
  name one) plus any extra requirements from the user's task. No spec: say so
  in the brief, and reviewers skip the Spec axis.
- `brief.md`: context for the reviewer's `/code-review` run, which holds:
  - The rules: read-only, so no edits, staging, commits, stashes or pushes.
    Only the test commands your repo marks safe. No servers.
  - The checkout path, the fixed point, the diff command, the commit list and
    the untracked paths.
  - The spec path, so the reviewer doesn't refetch it.
  - The standards files (root and nested `AGENTS.md`) and the sibling code to
    compare with.
  - Extra output after the skill's own report: tag each finding blocker /
    should / nit with file:line, then add `## Score` with N/10 and what would
    make it 10.

## 3. Launch in parallel

Start one `delegate_task` per reviewer in a single message:

- `role: "review"`, `isolation: "shared"`, `mode: "async"`.
- `target`: the reviewer's provider, model and options.
- `task`: start with the slash command so the reviewer runs the real skill,
  with its own parallel Standards and Spec sub-agents:
  "/code-review `<fixed point>`. Context in `<brief path>`, so read it first.
  Invoke the code-review skill itself (`$code-review` in Codex; source:
  the installed `code-review/SKILL.md`) and follow its full process,
  including spawning its Standards and Spec sub-agents in parallel. Read-only
  review: no edits, commits, stashes or pushes."
- Don't tell reviewers to skip sub-agents or to do both axes alone; that
  bypasses the skill.

Then end the turn. Completion wakes you, so don't poll.

## 4. Aggregate

- Before relaying a finding, check it against the code yourself. Drop the
  wrong ones and say why.
- Report each reviewer under its own heading, then show:
  - A table of score per reviewer.
  - Findings both reviewers raised.
  - Disagreements.
  - Your recommended fixes, kept to the task's scope.
- Fix only after the user agrees, or when the task already says to fix
  review findings.
- A re-review after fixes is a new `delegate_task` round, never a message to
  the old thread. Only look at changed code and the open findings, and stop
  after 3 rounds unless the user asks for more.
