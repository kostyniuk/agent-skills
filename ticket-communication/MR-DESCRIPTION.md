# MR description format

The only place the MR/PR description format lives. Other skills point here, so a format change is an edit to this file alone.

## Rules

- Open with one or two sentences: what the user saw, and what changes.
- Then: **Cause** → **Fix** → **Verification** (before/after, final code only) → **Tests** → notes → `**Merge risk:** N/5 — reason` ([`merge-risk`](../merge-risk/SKILL.md)) → `<AGENT_FOOTER>`.
- Embed the before/after images inline, uploaded through the <CODE_HOST> upload API (helpers in [`tracker-ops`](../tracker-ops/SKILL.md)). Evidence shapes are in [`verify-fix`](../verify-fix/EVIDENCE.md).
- Add a show-me visual only when it makes the change faster to grasp, and only on top of the real evidence.
- When the API contract is unchanged, say so and why, so reviewers don't have to hunt for consumers.
- Add **Deploy / merge notes** for pairs and stacks (MRs that must merge or deploy together, or in order) and for anything that deletes data.
- Keep it short. A reviewer should understand it in under a minute; evidence detail can go in a comment.

## Template

```markdown
<What the user saw, and what changes — one or two sentences.>

**Cause:** <file:line and why it produced the symptom>

**Fix:** <what changed>

**Verification:**

| Before | After |
|---|---|
| ![before](<upload>) | ![after](<upload>) |

**Tests:** <added or updated tests, or why none>

<Optional: API contract unchanged because …; Deploy / merge notes>

**Merge risk:** N/5 — <reason>

<AGENT_FOOTER>
```
