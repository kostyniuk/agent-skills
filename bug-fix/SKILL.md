---
name: bug-fix
description: Take one bug from ticket to a verified MR/PR and through the post-merge tracker handoff. Use when fixing or triaging a tracker bug, a QA reopen, or reviewer comments on a fix.
---

# Fix a bug

Fill the placeholders from your project's profile; keep the steps.

The job is to **clear the ticket**, not only to write code. Every ticket you touch ends in exactly one **outcome**: fixed, retest/close, product question, needs live data, or needs dev attention. Each outcome leaves a trace in <TRACKER>. A ticket you looked at and left without a trace is still on the backlog.

Never merge MRs (MR/PR on <CODE_HOST>). The developer reviews and merges.

## Steps

1. **Read the whole ticket:** description, every comment, attachments (download the screenshots and QA videos and look at them) and linked tickets. Note the reporter's env, app and exact steps.

2. **Find the root cause** on the code the reporter's env runs: `<LIVE_BRANCH>` for <PROD> and the release env, `<DEV_BRANCH>` for the staging and QA envs. Use `git fetch origin` and `git grep … origin/<branch>`. The root cause comes with clear repro steps someone else can follow. Done when you can point at file:line and say why it produces exactly the reported symptom.

3. **Choose the outcome.**
   - **Fix it** when it's small. Small means roughly ≤ 50 non-test lines, reproducible and verifiable locally, with no migration or backfill, and not a risky core flow (pricing engine, checkout, job routing). Several repos with small changes is still small: one MR per repo.
   - **Otherwise route it** without code, using the matching checklist in [`tracker-ops`](../tracker-ops/SKILL.md) and the comment shape in [`ticket-communication`](../ticket-communication/SKILL.md):

   | Finding | Outcome |
   |---|---|
   | Already fixed (name the fixing MR and release), or the feature is gone on the reporter's branch | Retest / close |
   | Needs a business decision | Product question → In clarification |
   | Needs customer data you can't read (a restricted-region <PROD>, export-controlled data, a customer's own tickets) | Needs Live data, or <SUPPORT> asks the customer |
   | Big, risky, or can't be verified locally | Needs dev attention |
   | Can't reproduce | Ask the reporter to re-check, with the exact steps you tried |
   | The test case or docs disagree with current behaviour that customers rely on | Propose updating the test case or doc (fix the doc before closing) |
   | Rare, awkward or "only cosmetic" | Still a bug: find the cause, then fix or route it. "Won't fix" needs a cause |

4. **Branch in a worktree.**
   - Choose the base branch per bug. The default is `<DEV_BRANCH>`; use `<LIVE_BRANCH>` only when this bug has to reach <PROD> with the current release, and say why in the MR.
   - Fix version: the release `<LIVE_BRANCH>` ships for `<LIVE_BRANCH>` work (not a patch version), the next release for `<DEV_BRANCH>` work.
   - Create the worktree as in [`local-stack`](../local-stack/SKILL.md) (Worktrees), branch name `<TICKET-KEY>`.
   - Check whether an MR for this ticket already exists, and whether it is merged, before touching its branch.
   - **Adjacent bugs found on the way:** tiny and in the same area → include it and name it in the MR; otherwise a separate small MR, or a tech-debt ticket with the reasoning when the proper fix is big. Scope never widens silently. A finding that is outside the ticket's scope gets a short comment, not code.

5. **Go red** on the base branch, per [`verify-fix`](../verify-fix/SKILL.md). No red, no fix.

6. **Fix minimally.** Apply [`review-rules`](../review-rules/SKILL.md) and the repo's `CLAUDE.md`/`AGENTS.md` while you write, not afterwards. Run the tests for the files you touched; follow the repo's AGENTS.md if it restricts test or lint runs.

7. **Go green** on the final code, and capture before/after evidence ([`verify-fix`](../verify-fix/SKILL.md)).

8. **Review.** Run `review-rules/scripts/review-lint.sh origin/<base>` in the worktree and fix every hit. Then spawn a read-only reviewer sub-agent on `git diff origin/<base>...HEAD` with [`review-rules`](../review-rules/SKILL.md). Fix the real findings, and repeat the review until it finds nothing new.

9. **Commit and push.**
   - Use the `commit` skill: `Fix: <TICKET-KEY>: <summary>`, a markdown bullet body and the merge-risk line ([`merge-risk`](../merge-risk/SKILL.md)).
   - Pre-commit hooks run. `--no-verify` is allowed only when the hook fails on files you didn't change; say so in your report.
   - Push with `git push -u origin <TICKET-KEY>`. A push can auto-create a junk MR against `<DEV_BRANCH>`: retarget or close it before creating the MR with the <CODE_HOST> CLI (e.g. `glab mr create`, `gh pr create`), which otherwise fails with a conflict (409).

10. **Open the MR.**
    - Write the description per [`MR-DESCRIPTION.md`](../ticket-communication/MR-DESCRIPTION.md), with the evidence embedded via the <CODE_HOST> upload API.
    - Wait for the pipeline: poll the <CODE_HOST> pipelines for the MR's head ref (e.g. `projects/<id>/pipelines?ref=refs/merge-requests/<iid>/head`), and fix failures.
    - Move the ticket to In Progress or In Review with the fix version set ([`tracker-ops`](../tracker-ops/SKILL.md)).

11. **Report:**
    - outcome and root cause (file:line);
    - MR URL and pipeline status;
    - merge risk;
    - evidence;
    - the <TRACKER> changes;
    - test data you created;
    - the worktree path;
    - anything that needs the developer.

## After the developer merges

1. Confirm the merge for every MR of the ticket. Then confirm deploy provenance for the env <QA_TEAM> will use ([`deploy-check`](../deploy-check/SKILL.md)).
2. Run the merged-ticket checklist ([`tracker-ops`](../tracker-ops/SKILL.md)), then post or update the QA comment ([`ticket-communication`](../ticket-communication/SKILL.md)).
3. Transition to Ready for testing.
4. Remove the worktree.

## QA reopens

1. Read QA's new comment and evidence. Note the env, app and every bit of UI state.
2. Check provenance first: is the fix on the branch QA's env runs? A `<DEV_BRANCH>`-only fix reopened on the release env is a deploy gap, not a new bug.
3. Reproduce on QA's env and app ([`verify-fix`](../verify-fix/SKILL.md) step 3). Then:
   - **real** → fix it on the same branch, amend or add a commit, and **replace** the evidence;
   - **a different bug** → explain the difference, with screenshots from their env.
4. Don't post anything until the investigation is done, if the developer asked you to hold.

## Reviewer comments on your MR

- Treat each one as a rule. Fix it in the MR, and generalise it: does the same pattern exist elsewhere in the diff or in sibling MRs? When it's new, propose adding it to [`review-rules`](../review-rules/SKILL.md).
- Keep the rework minimal: "do it quickly" means no evidence refresh unless behaviour changed.
- Force-push only your own branch, with `--force-with-lease=<branch>:<expected-sha>`.
