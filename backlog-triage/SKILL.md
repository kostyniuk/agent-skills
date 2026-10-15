---
name: backlog-triage
description: Run a bug-backlog campaign on <PROJECT> — select tickets, triage them in parallel, fix the small ones with verified MRs, route the rest, and keep QA's retest queue ordered by effort.
disable-model-invocation: true
argument-hint: "A tracker query, a <TRACKER> filter/board URL, or a description of the tickets"
---

# Backlog triage campaign

Fill the placeholders from your project's profile; keep the steps. `<STRONG_MODEL>` is your most capable model, `<CHEAP_MODEL>` a cheaper, faster one.

The campaign goal is **a shrinking backlog**: every ticket in scope ends with an outcome and a trace in <TRACKER>. Small bugs get fixed and verified. Everything else is routed: retest/close, product question, needs live data, needs dev attention.

## Steps

1. **Select.**
   - Turn the argument into a <TRACKER> query (e.g. JQL) and list the tickets: key, summary, status, assignee, reporter, created, labels.
   - Skip tickets that someone else is actively working on (assigned to another developer, and updated recently). Report them instead of reassigning.
   - Done when the developer has seen the count and the skip list.

2. **Classify cheaply.** Run one read-only pass per ticket ([`fan-out-agents`](../fan-out-agents/SKILL.md), one `<CHEAP_MODEL>` agent each). Each agent reads the ticket and the code on the reporter's branch and returns:
   - the likely outcome;
   - the rough fix size;
   - the repos involved;
   - whether it reproduces locally.

   Group the tickets: fix candidates, retest/close, product, live data, dev attention.

3. **Dry-run the public part.** For the retest/close and routing groups, draft every <TRACKER> comment without posting it. Review the drafts against [`ticket-communication`](../ticket-communication/SKILL.md) and [`verify-fix`](../verify-fix/SKILL.md)'s claim checklist. Show the developer the groups and any doubtful verdicts, and post only after that.

4. **Fix the small ones.** Run one `<STRONG_MODEL>` agent per ticket on [`bug-fix`](../bug-fix/SKILL.md), in parallel, within the machine's concurrency limit.
   - Score each with [`merge-risk`](../merge-risk/SKILL.md), so the developer can merge the trivial ones first and review the risky ones carefully.
   - Relay results as they land.

5. **Route the rest** with the checklists in [`tracker-ops`](../tracker-ops/SKILL.md). Every routed ticket gets its label, its one comment, and the right status and assignee.

6. **Keep up with merges.** When the developer says "merged", run the merged-ticket checklist for each ticket (in [`tracker-ops`](../tracker-ops/SKILL.md)). Check every MR/PR of the ticket first; a backport to <LIVE_BRANCH> merging also counts.

7. **Order QA's queue.** For tickets waiting on <QA_TEAM> (your retest-or-close and ready-for-testing statuses):
   - estimate the QA effort (XS/S/M/L);
   - set the QA effort field (e.g. QA story points) and the `<LABEL_PREFIX>QA-Effort-*` label;
   - give the developer a shared filter sorted by effort ([`tracker-ops`](../tracker-ops/SKILL.md)).

   Before handing the queue over, check every comment in it: does it have the scope and env first, retest steps with an expected result, and the right QA person tagged? Are its "deployed" lines still current?

8. **Audit the trace.** Search the campaign's tickets for gaps: missing sprint, team, developer, story points, fix version or root cause; a wrong assignee (Done and Won't do go to the developer); stale comments. Fix the gaps.

Done when every ticket in scope has an outcome, the audit shows no gaps, and the developer has a short summary with filter links.

## Campaign labels

A suggested label set; `<LABEL_PREFIX>` (e.g. `AI-`) marks labels the campaign sets, so its trace is one filter away.

| Label | Meaning |
|---|---|
| `<LABEL_PREFIX>Merge-Risk-1-Trivial` … `<LABEL_PREFIX>Merge-Risk-5-Critical` | fixed by the campaign, with its merge risk |
| `<LABEL_PREFIX>Triage-Close-Or-Retest` | no code change; QA retests or closes |
| `<LABEL_PREFIX>Triage-Needs-Dev-Attention` | real bug, too big or risky for the campaign |
| `<LABEL_PREFIX>Triage-Needs-Live-Data` | needs data or logs the campaign can't read |
| `<LABEL_PREFIX>Triage-Close-No-Test` | close without a QA check (feature gone, duplicate, decision made); developer confirms before closing |
| `<LABEL_PREFIX>Retest-Quick` / `<LABEL_PREFIX>Retest-Later` | retest batches: cheap now / waits on a deploy or data |
| `<LABEL_PREFIX>QA-Effort-S/M/L` | QA effort, matching the QA effort field |

## Pacing

- Report progress in tables: ticket, outcome, MR, risk, next step.
- Ask the developer only for real decisions: a product call, a risky rollout, a customer-facing message. Decide everything else and report it.
- When the developer asks "is it stuck?", check the agents' output files before answering.
