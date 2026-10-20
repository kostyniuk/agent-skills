---
name: verify-fix
description: Prove a bug fix or claim with observed evidence on the right environment. Use when reproducing a bug, verifying a fix, re-checking a QA reopen, or before writing "fixed", "obsolete", "deployed" or "can't reproduce".
---

# Verify a fix

Fill the placeholders from your project's profile; keep the steps.

A claim is **observed** when you saw it happen, in this session, on a named environment running known code. Anything else is **inferred**: reading code, a unit test, a sub-agent's report, QA's description, an earlier session's notes. Ship only observed claims; mark the rest as inferred or drop them.

The loop has two states. **Red**: the bug reproduces on the base code. **Green**: the same steps pass on the final code. A fix you never saw red is a guess, not a fix.

Most corrections in past bug campaigns came from skipping one of the steps below. [CASES.md](CASES.md) lists them; read it once before your first campaign.

## Steps

1. **Pin the claim.** Write it as one sentence: "On `<env>` running `<branch@sha>`, doing `<steps>` gives `<observable>`." Done when the env, the code version and the observable are all named.

2. **Map env to code (provenance).**
   - <PROD> runs `<LIVE_BRANCH>`, not `<DEV_BRANCH>`.
   - [deploy-check/ENVIRONMENTS.md](../deploy-check/ENVIRONMENTS.md) has the full map of hosts, branches and DBs.
   - To find which branches hold the fix, run `git branch -r --contains <sha>`. Remember whether `<LIVE_BRANCH>` merges forward into `<DEV_BRANCH>` automatically.
   - To check what an env actually serves, run the [`deploy-check`](../deploy-check/SKILL.md) skill. If the QA or staging env lags behind a merged fix, redeploy it with that skill instead of waiting.
   - Done when you can say which envs have the fix and which don't.

3. **Go red on the base code.** The base is the MR's target branch (chosen in [`bug-fix`](../bug-fix/SKILL.md) step 4). Reproduce on the local stack ([`local-stack`](../local-stack/SKILL.md)).
   - For a QA reopen, first reproduce on **QA's env, app and exact UI state**: the filters, the date range (lists often default to a recent window, e.g. the last 90 days), the selected tab and the saved per-user grid settings. Take these from QA's comment or video frames. Log in there with [`app-login`](../app-login/SKILL.md).
   - QA apps are often shared with the e2e suite and other testers, who change settings mid-run. Before blaming a setting, compare its `updated_at` with the ticket's creation time; today's value may not be the one the reporter saw.
   - If it won't go red, your model of the bug is wrong. Try QA's data, step through their video frame by frame, and read the reporter's config in the DB ([`readonly-data-access`](../readonly-data-access/SKILL.md)). If it still won't reproduce, ask the reporter to re-check with exact steps; never close it as "can't reproduce".

4. **Go green on the final code.** Use the same steps and data. When the fix changes in a follow-up commit, re-run green and replace the old evidence.

5. **Check that the fix discriminates.**
   - Run one neighbour case that must stay unaffected: another variant, another app or tenant, an existing record vs a new one.
   - Make sure a flag is true for the right reason. `!_.find(options, …)` reads the same when `options` is accidentally `undefined`.

6. **Prove along the user's path, then check below the screen.** Click the real controls a user clicks; storage or API shortcuts only set up state, they never prove a UI claim. Drive the flow with [`browser-verification`](../browser-verification/SKILL.md) and watch the network: no 4xx/5xx on the affected endpoints (an error-source header, if your gateway sets one, names the failing downstream service). Reload and confirm the saved state. A correct-looking field once hid a `400 Wrong options` on open.

7. **Record the evidence** in the forms in [EVIDENCE.md](EVIDENCE.md).

8. **Gate the report.** Read every sentence you are about to publish (MR, <TRACKER> comment, chat):
   - Each claim is observed, or it is reworded as inferred or deleted.
   - A sub-agent's numbers and QA's description stay inferred until you re-run them.
   - Done when nothing inferred reads as observed. Then publish following [`ticket-communication`](../ticket-communication/SKILL.md).

## Claim checklist

Use the matching proof before writing each of these words:

| Claim | Proof required |
|---|---|
| fixed | The fix commit is on the branch the env runs, **and** green was observed there. A fix merged only to `<DEV_BRANCH>` is not fixed on <PROD> or on the release env |
| merged | Every MR for the ticket was checked: search the <CODE_HOST> MRs for `<TICKET-KEY>` in each repo touched. Release backports and parallel dev MRs exist |
| deployed | [`deploy-check`](../deploy-check/SKILL.md) shows the env serving the fixed code. A passed pipeline or an image-publish job is not a deploy |
| obsolete / removed | The feature is absent on `origin/<LIVE_BRANCH>` (<PROD>), not only on `<DEV_BRANCH>`. Otherwise write "removed in the next release; still on <PROD> until then" |
| can't reproduce | QA's exact steps, on their env and app, stay green. Otherwise ask the reporter to re-check |
| by design | There is a spec, a ticket or the <PRODUCT_OWNER>'s decision. Your reading of the code doesn't count; ask the <PRODUCT_OWNER> and move the ticket to a clarification status |
| root cause | Red appears when you introduce the cause and disappears when you remove it |
| QA's setup is wrong | Their config was read (DB rows, pricing or worker config, settings) and shown to produce the symptom |
| a setting is on / off / empty | Read along the **read path**: the screen that holds the setting ([`app-login`](../app-login/SKILL.md)), or the column the consuming code reads. A same-named column on another table doesn't count; legacy schemas keep stale copies |

## What doesn't count as verification

- reading code, "should work", or a passing unit test alone;
- a show-me diagram (it can accompany the evidence, never replace it);
- a green screen with a failing request behind it;
- evidence from a different env or branch than the claim is about.

**Blocked check.** When a check needs something you don't have (an admin session, SSO, credentials, a customer login, matching data, an env), raise it with the developer the moment you hit it:
- what is blocked, and what the claim loses without it;
- the options you see, for example creating your own test customer and order in the QA app (see Side effects), getting access, or a weaker check.

The developer picks the route; continue on a weaker check only after they chose it. Evidence is the product's own screen or response; a table you assembled from DB reads stands in for nothing.

`**Not verified:** <reason>` goes in the MR only for a gap the developer accepted.

## Side effects

- **Before acting in a QA app,** ask before creating or editing data there. Stop before CREATE or SAVE when that's enough, and tell QA which step to finish.
- **When a check had to change shared data** (for example re-assigning a form's targets), restore it. Then say in the MR or <TRACKER> comment what changed and what you restored.
- **On the local stack,** clean up the test data you created, or list it in your report.
