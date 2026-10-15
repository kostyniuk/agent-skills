---
name: merge-risk
description: Score a bug fix's merge risk 1–5 and record it in the commit, MR/PR and tracker label. Use when committing or opening a bug-fix MR.
---

# Merge risk

Fill the placeholders from your project's profile; keep the steps. `<LABEL_PREFIX>` is your tracker's label prefix; the default suggestion is `Merge-Risk-N-<Name>`.

The score tells the reviewer how much review a merge needs, at a glance. **Fix size and what the change does** drive it. Where the code lives never raises it on its own: a small diff in a shared library still scores small. Inflating tiny shared-library fixes to Critical hides the MRs that really are risky.

## Steps

1. **Measure.** Count real source lines changed. Leave out tests, built `dist/` bundles and lockfiles. List the repos and what each change does.
2. **Score** with the rubric below. A ticket with several MRs takes the **highest** score among them.
3. **Record it in three places:**
   - **Commit body:** `Merge-risk: <N>/5 — <one short reason>`.
   - **MR/PR description:** `**Merge risk:** <N>/5 — <reason>`, placed where the MR description format (`ticket-communication/MR-DESCRIPTION.md`) puts it.
   - **<TRACKER>:** remove any other `<LABEL_PREFIX>*` label first, then add the matching one ([`tracker-ops`](../tracker-ops/SKILL.md)).
4. **Re-score** when a follow-up commit changes the size or the nature of the fix.

Done when the commit, the MR and the label all show the same N.

## Rubric

| N | <TRACKER> label | Meaning | Typical signs | Review needed |
|---|---|---|---|---|
| 1 | `<LABEL_PREFIX>1-Trivial` | Tiny blast radius | ≤ ~15 non-test lines in one or two files: layout, copy, tooltip, CSS, a null guard or a one-line fix (shared code included); no API or data change | A glance; can merge without a proper review |
| 2 | `<LABEL_PREFIX>2-Low` | Small, contained logic fix | One feature or endpoint in one repo; behaviour changes only on the broken path; no contract change; covered by a test or clear before/after | Quick review |
| 3 | `<LABEL_PREFIX>3-Medium` | Larger logic change or business numbers | ~30–150 lines of logic, or a query/filter/response-shape change that consumers read; pricing, tax, lead time, email or push output in one service | Normal review plus a QA retest of neighbouring flows |
| 4 | `<LABEL_PREFIX>4-High` | Cross-service or core flow | Several repos that must deploy together or in order; internal API or contract change; events/queues; auth/permissions; payments; behaviour change in a core flow for every customer (checkout, order submission, job completion) | Careful review plus QA regression of the flow |
| 5 | `<LABEL_PREFIX>5-Critical` | Structural | DB schema, migration or data backfill; a large or structural rewrite (including big shared-library changes); deleting data | Proper review by the code owner; staged rollout |

## Borderline calls

- **Several repos with small, independent changes,** each deployable alone, score per change. Score 4 only when the deploy order matters.
- **A change that deletes data** (orphan cleanup, for example) is at least 4, however small the diff is. Say so explicitly in the MR.
- **A stacked MR** (one targeting another MR's branch): score each, and note the merge order in both descriptions.
