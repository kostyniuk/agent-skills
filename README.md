# Agent skills for fixing bugs end to end

Skills for coding agents (Claude Code, Codex, Cursor, …) that take a bug from ticket to a verified MR/PR and through QA, and that run a whole bug backlog in parallel. They came out of a real backlog campaign: each rule comes from a code review, a QA reopen or a mistake an agent made.

The core idea is **verification**: an agent may only claim "fixed", "deployed" or "can't reproduce" when it has observed it, on the environment the reporter uses, with before/after evidence.

## Make them yours

The skills are project-neutral. Product-specific details are `<PLACEHOLDERS>`: fill them once for your project (the most used: `<TRACKER>`, `<CODE_HOST>`, `<DEV_BRANCH>`, `<LIVE_BRANCH>`, `<PROD>`, `<LOCAL_URL>`, `<QA_TEAM>`, `<PROJECT>`, `<LABEL_PREFIX>`). Keep the steps; replace the examples.

```bash
for d in $PWD/*/; do ln -sfn "$d" ~/.claude/skills/$(basename "$d"); done   # Claude Code
# or ~/.agents/skills/ for other agents
```

## Start here

| Skill | What it does |
|---|---|
| [`verify-fix`](verify-fix/SKILL.md) | The hub: observed vs inferred claims, red before the fix, green after, evidence formats |
| [`bug-fix`](bug-fix/SKILL.md) | One bug from ticket to a verified MR/PR and through the post-merge handoff |
| [`review-rules`](review-rules/SKILL.md) | A template for your team's review rules, plus a lint script for the mechanical ones |
| [`ticket-communication`](ticket-communication/SKILL.md) | QA comments, verdicts, reopen replies, MR descriptions ([`MR-DESCRIPTION.md`](ticket-communication/MR-DESCRIPTION.md)), customer replies |
| [`merge-risk`](merge-risk/SKILL.md) | A 1–5 merge-risk score in commits, MRs and labels |

## Tools the agent uses

| Skill | What it does |
|---|---|
| [`deploy-check`](deploy-check/SKILL.md) | Which code an env really runs; whether a fix is deployed there; waits for CI and redeploys the QA / staging env when it lags; re-patches a pinned release env |
| [`local-stack`](local-stack/SKILL.md) | Run a branch locally and prove it; local APIs and DBs |
| [`browser-verification`](browser-verification/SKILL.md) | Drive the app with Playwright or CDP Chrome; screenshots, network failures |
| [`app-login`](app-login/SKILL.md) | Log in as any app user on a QA env via an admin login-as API, unattended |
| [`readonly-data-access`](readonly-data-access/SKILL.md) | Read-only DB tunnels, logs and third-party config, no personal data out |
| [`flow-recording`](flow-recording/SKILL.md) | Record a UI flow as a video for the MR |
| [`terminal-recording`](terminal-recording/SKILL.md) | Record a terminal next to the browser it opens |
| [`tracker-ops`](tracker-ops/SKILL.md) | Jira REST helpers and the fixed/merged/retest/close checklists |

## At scale

| Skill | What it does |
|---|---|
| [`fan-out-agents`](fan-out-agents/SKILL.md) | Run many tickets through parallel sub-agents safely |
| [`backlog-triage`](backlog-triage/SKILL.md) | `/backlog-triage`: a whole bug-backlog campaign |
| [`ticket-monitor`](ticket-monitor/SKILL.md) | `/ticket-monitor`: an unattended watcher for QA reopens and comments |
