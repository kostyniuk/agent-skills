---
name: ticket-monitor
description: Set up an unattended watcher that wakes on a schedule, finds new QA reopens and comments on your <TRACKER> bug tickets, handles each with one sub-agent (investigate, fix, reply), and leaves a morning report.
disable-model-invocation: true
argument-hint: "Interval (default 30 min) and what the monitor may do unattended"
---

# Ticket monitor

Fill the placeholders from your project's profile; keep the steps.

A **watcher** separates three jobs:
- **detect**, a deterministic script with no judgement;
- **handle**, one sub-agent per item, with judgement;
- **record**, which keeps the state file and the morning report.

Detection by script makes every run cheap and repeatable. The state file makes runs **idempotent**: an item is handled once, however many runs see it.

## Steps

1. **Agree the mandate** with the developer, and write it word for word into the scheduled prompt. Cover:
   - what the monitor may do unattended: investigate, push branches, open MR/PRs, reply on <TRACKER>;
   - what it never does: merge, move a ticket past In Review, message anyone outside <TRACKER>/<CODE_HOST>, decide product questions;
   - the interval;
   - when it should stop.

2. **Set up the state.**
   - Create `~/.claude/bug-monitor/` holding `state.json`: `{"lastCheck": "<now UTC>", "handledComments": [], "handledReopens": []}`. Add an empty `report.md`.
   - Copy `scripts/detect.py` there. It talks to the Jira Cloud REST API; for another <TRACKER>, port its two queries and keep the JSON output.
   - Export the configuration:
     - required: `JIRA_BASE` (site URL), `JIRA_PROJECT` (<PROJECT> key), `JIRA_EMAIL`, `JIRA_ME` (your accountId), `MONITOR_FORWARD_STATES` (comma list of statuses past development, e.g. `Ready for testing,QA Validation,Ready for deploy,Done,Won't do`);
     - optional: `MONITOR_LABELS` (comma list of every campaign label: merge-risk, triage and retest labels), `MONITOR_ISSUE_TYPE` (default `Bug`), `MONITOR_BOT_NAMES` (comma list of display names to ignore), `JIRA_TOKEN_FILE` (default `~/.config/jira-token`), `MONITOR_DIR` (default `~/.claude/bug-monitor`).

3. **Test the detector once by hand:** `python3 -I ~/.claude/bug-monitor/detect.py`. It prints JSON listing `items`, each a `reopen` or a `comment` with key, id and author. A campaign ticket is a bug of `MONITOR_ISSUE_TYPE` carrying one of `MONITOR_LABELS` or assigned to you. It counts as a reopen when someone else moved a campaign ticket out of a forward state (`MONITOR_FORWARD_STATES`). It counts as a comment when someone else commented on a campaign ticket, or mentioned you anywhere in <PROJECT>.

4. **Plan the handling** per [`fan-out-agents`](../fan-out-agents/SKILL.md): which models, how many agents at once, and how results reach the report.

5. **Schedule it** with the host's scheduler: cron, a CI schedule, or an agent host's scheduler (for example an interval task every 1800000 ms). Use the prompt below. Report the cadence and the next run time to the developer.

## The scheduled prompt

```
TICKET MONITOR RUN. Mandate (granted <date> by <developer>): <copied word for word>.
1. DETECT: run `python3 -I ~/.claude/bug-monitor/detect.py`. If items is empty: set lastCheck to this run's start time, append nothing, end with one short line.
2. HANDLE: one sub-agent per ticket, run per fan-out-agents (model, isolation, relaying results), never two agents for the same ticket. Each agent gets the full rules: follow bug-fix (reopens, reviewer comments), verify-fix, ticket-communication, tracker-ops; stay inside the mandate; return ticket, trigger, root cause, action (MR URL / comment id), and what needs the developer.
3. RECORD: add the handled ids to state.json, set lastCheck to this run's start time, and append one skimmable section per ticket to report.md (time UTC, ticket link, trigger, root cause, MR link, <TRACKER> comment id, open questions).
```

The skills named in HANDLE: [`bug-fix`](../bug-fix/SKILL.md), [`verify-fix`](../verify-fix/SKILL.md), [`ticket-communication`](../ticket-communication/SKILL.md), [`tracker-ops`](../tracker-ops/SKILL.md).

## Morning handoff

- Read `report.md` to the developer as a table: ticket, trigger, outcome, link, decision needed.
- Items that need a decision stay open in the report until the developer answers.
- Stop the schedule when the developer says so, or when the campaign ends. Leave `state.json` in place for the next campaign.

## Failure modes

- **Restart or cancellation:** the state file is the source of truth. The next run resumes from `lastCheck`; nothing is lost and nothing is redone.
- **Token expired (401):** record it in `report.md` and stop handling. A human has to renew the token.
- **Noise:** automation comments (app accounts) and your own comments are filtered out by the script. Add other bots to `MONITOR_BOT_NAMES`, rather than handling them in the prompt.
