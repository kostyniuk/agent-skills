---
name: ticket-communication
description: Write the issue-tracker QA comment, retest/close verdict, reopen reply, product question, MR/PR description or customer reply for a bug. Use before posting any of them.
---

# Ticket communication

Fill the placeholders from your project's profile; keep the steps. `<AGENT_FOOTER>` is your coding agent's attribution line.

Each audience reads one place, so each place gets only what that audience needs:

| Reader | Place | Voice | Contains |
|---|---|---|---|
| <QA_TEAM> | the <TRACKER> comment | short, business language | scope and env, what was wrong, what changed, how to retest |
| Reviewers | the MR/PR description (MR below) | technical | per [MR-DESCRIPTION.md](MR-DESCRIPTION.md) |
| <PRODUCT_OWNER> | a <TRACKER> comment tagging them | a concrete question | the options and what each would mean for users |
| Customer | an email draft for the developer to send | technical facts only | what happened and why, with times, units and behaviour |

## Steps

1. **Read the ticket's existing comments first.**
   - When you already have a comment on the ticket, and no one has replied to it yet, you'll **edit it in place**; you won't add another.
   - When a newer comment of yours contradicts an older one, delete the older one and the attachments only it embedded.
   - Never touch other people's comments.

2. **Write the first line as the scope and the environment.**
   - For example: "Fixed on <QA_ENV_URL> / <STAGING_URL> (<DEV_BRANCH>) only; production (<LIVE_BRANCH>) gets it with the release." Or: "Scope: only NEW records of this type; existing ones are unchanged."
   - QA reads the first line and tests exactly that. A scope note in the fourth paragraph once caused a reopen, because QA tested on an env without the fix.
   - Every env you name must be backed by [`deploy-check`](../deploy-check/SKILL.md).

3. **Write the body for the outcome.** Use one shape per ticket:
   - **Fixed:** "Fixed in `<repo>` !NNN." Then *Before the fix:* … and *After the fix:* …, each followed by its attached image. Then the retest steps with the expected result. Tag the QA person who reopened it, if anyone did.
   - **Retest or close without a fix:** one comment with four parts:
     - *Verdict:* Close or Retest.
     - *Why:* the fixing ticket, MR and release; or the removed or replaced feature, and on which release; or exactly what you checked (env, app, data, steps) and what happened.
     - *How to check:* where, the steps and the expected result. For Close, one line on why no check is needed.
     - *Where:* the env and release.
   - **Reply to a reopen:** what you re-checked on their env and app, with screenshots from there. Then either the new fix or the precise difference between their steps and the bug. Explain why an expectation doesn't hold; don't just assert it, and avoid blunt bullet lists aimed at the reporter. Be polite and clear.
   - **Product question:** tag <PRODUCT_OWNER>, ask one concrete question with the options, and move the ticket to the clarification status (e.g. In clarification).
   - **Needs dev attention:** the cause so far, the repos, the rough size and what makes it risky.

4. **Keep code out of <TRACKER>.** No file paths, line numbers, SHAs, endpoints or DB columns: those go in the MR. Aim for 10–20 lines.

5. **Attach the evidence:** the product's own screens, taken on the env ([`app-login`](../app-login/SKILL.md)). Missing access means asking the developer for it ([`verify-fix`](../verify-fix/SKILL.md)). Upload each image as a <TRACKER> attachment and put a one-line caption directly above it ([`tracker-ops`](../tracker-ops/SKILL.md)). Blur personal data first.

6. **Check before posting.** Every factual sentence passes the observed/inferred gate of verify-fix (step 8). Mark what rests on someone else's statement: "according to the release notes…", "QA's video shows…".

Done when the ticket has exactly one current comment from you, its first line names the scope and env, and every claim in it was observed.

## MR description

Follow [`MR-DESCRIPTION.md`](MR-DESCRIPTION.md): the rules and a template.

## Customer replies

- Draft them for the developer to send; never send them yourself.
- Keep them technical: what happened, why, and the measured times, units and behaviour.
- Don't promise fixes, reviews or dates.
- Anything that needs a product decision, a change to account configuration (limits, scripts) or new functionality: tell the customer to reach out to their account manager or product contact. Don't decide it in the reply.
- Ids and timestamps only; no other customers' data.

## Mentions

- Mention people with <TRACKER>'s mention syntax (Jira: `[~accountid:<id>]`); look the id up, never guess it.
- Tag the QA person on fixed tickets. Assignment rules are in [`tracker-ops`](../tracker-ops/SKILL.md).
