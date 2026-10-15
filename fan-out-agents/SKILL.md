---
name: fan-out-agents
description: Run many tickets or repos through parallel sub-agents safely: brief file, isolation, models, concurrency, relaying results, restarts. Use when delegating more than one task to sub-agents.
---

# Fan out agents

Fill the placeholders from your project's profile; keep the steps. `<STRONG_MODEL>` is your most capable model, `<CHEAP_MODEL>` a cheaper, faster one.

The main loop **orchestrates**: it picks the work, writes the brief, reviews what comes back and makes the cross-cutting calls. The sub-agents **execute**, one unit of work each. A sub-agent's report is **inferred** until the main loop checks it, and the user never sees it unless the main loop relays it.

## Steps

1. **Write the brief file once.** Put it in a file (for example `~/agent-work/AGENT_BRIEF.md`), so every agent reads the same rules. It points at the skills that hold them: [`bug-fix`](../bug-fix/SKILL.md), [`verify-fix`](../verify-fix/SKILL.md), [`review-rules`](../review-rules/SKILL.md), [`tracker-ops`](../tracker-ops/SKILL.md), [`ticket-communication`](../ticket-communication/SKILL.md). It adds only what this round needs:
   - the goal and the authorised actions (push, MR/PR, <TRACKER> writes; never merge);
   - read-only vs write mode for this round;
   - the return format: under 250 words, with outcome, root cause, MR URL, <TRACKER> ids, test data created and open questions.

   When a rule changes mid-run, update the file **and** SendMessage every running agent. They read the brief before it changed.

2. **One agent per ticket.** Batching several tickets into one agent is slower and mixes failures. Each prompt is self-contained: the <TICKET-KEY>, the repos and containers this agent owns, "read the brief first", and anything this ticket needs beyond the brief.

3. **Isolate them.**
   - **Code:** an own worktree per agent. Only one named owner may switch the main checkout that <LOCAL_URL> serves.
   - **Containers:** one agent per backend container rebuild.
   - **Data:** each agent creates its own test records, with distinct names, and lists them in its report. Never reuse another agent's records.
   - **Files:** each agent deletes only files it created. One agent once wiped every in-progress recording in the shared recordings folder while cleaning up.
   - **Browser:** each agent opens its own CDP tab.

4. **Pick the model explicitly.**
   - `<STRONG_MODEL>` for debugging, fixes, verification and reviews.
   - `<CHEAP_MODEL>` for mechanical passes: label sweeps, field audits, template edits.
   - Don't pick an expensive model by default; a fan-out multiplies its cost. A review that fanned out about 80 sub-agents on the most expensive model burned a whole usage limit in one afternoon.
   - Tell agents which model their own sub-agents may use.

5. **Cap concurrency by the machine, not by habit.** A full local stack can run dozens of containers. Too many agents rebuilding and recording at once OOM-kills the database. Start with the user's stated limit. Lower it when the host struggles (`free -g`, `uptime`, database restarts), and raise it when it doesn't.

6. **Collect results.**
   - **Nested results:** a sub-agent's own sub-agent reports to the **main** loop, not to its parent. When such a result arrives and the parent last said "waiting for …", forward it with SendMessage, or the parent stalls forever.
   - **Progress:** before telling the user an agent is "working", check its output file's last write time and tail.
   - **Spot-check** each report's key claims (MR exists, pipeline status, the <TRACKER> comment is posted and reads right) before relaying them.

7. **Survive restarts.** Host restarts cancel background agents silently. Keep progress on disk: the brief, a results journal, or the workflow journal. Resume only the units without a result; never redo finished ones.

Done when every unit has a checked result, and the user has the summary with links.

## Read-only first for public output

Anything that will be posted where others read it (<TRACKER> verdicts, comments to <QA_TEAM> or customers) goes through a read-only investigation round first, or a dry run of the batch. The main loop reviews it, then a second step posts. A dry-run audit once found 19 of 44 drafted verdict comments unusable for QA.
