---
name: review-rules
description: Code-review rules learned from rejected MRs/PRs: where validation, logic, side effects and tests belong. Use when reviewing a diff or before pushing a fix.
---

# Review rules

Fill the placeholders from your project's profile; keep the steps. Rules marked "adapt to your codebase's convention" are team conventions: keep them as the default and swap in your codebase's own module, helper or wrapper names.

Each rule below came from a reviewer rejecting an MR/PR (MR from here on). Apply **every** rule to the diff (`git diff origin/<base>...HEAD`). Report each violation with file:line and the rule it breaks. Fix it before pushing, or list it for the author. When a new reviewer comment rejects something this list doesn't cover, add it here as a new rule in the same one-line, bold-lead style.

Run `scripts/review-lint.sh origin/<base>` first: it catches the mechanical rules (ORM scope bypasses, DAO-result re-unwrapping, DAO/transport-client/shared-models tests, ORM model calls in tests, internal-package version bumps, added comments). Its patterns sit at the top of the script, each overridable by an env var of the same name: `DAO_TEST_GLOB`, `TRANSPORT_TEST_GLOB`, `SHARED_MODELS_REPO`, `SHARED_LIB_REPOS`, `BANNED_CALLS_RE`, `TEST_MODEL_CALL_RE`, `INTERNAL_SCOPE`, `COMMENT_RE`, `ALLOWED_DISABLE_RE`; the base defaults to `REVIEW_LINT_BASE` or `origin/main`. The text below explains those rules and the ones that need judgement.

The general code style (utility library vs native, lookup objects, truthiness checks, import order, CSS approach) is in the repo's `CLAUDE.md`/`AGENTS.md` and enforced by the linter/formatter. This list covers what lint can't see.

## Scope

- **Minimal diff.** Change only what the fix needs. If you find something along the way worth fixing or refactoring, ask the developer first.
- **Shared pattern, shared fix.** When the same logic exists in several services, or a reviewer asks for "a common solution", put it in the shared backend library and apply it at every call site. Look for a library-based solution (an existing validator, for example) before writing manual code.
- **No version bumps in consumers.** After the shared backend library or shared models package publishes, push the consumer with `package.json` unchanged; its pipeline installs the latest version (adapt to your codebase's convention if consumers pin versions).
- **One repo per MR.** A change in one service gets its own MR in that service's repo, even when it's part of a fix in another service.

## Backend structure

- **Validation before the main logic goes in the route's validators module** (e.g. `validate.js`), as a named validator used by the route. Not inline in the handler, and not a `.test`-style helper.
- **Business and transformation logic lives in a service helper** (e.g. `app/services/*-helper.js`; adapt to your codebase's convention), not in the route and not in the transport layer. External API clients (e.g. `impl.js`) only transport requests; trimming, mapping and defaults go in a helper.
- **Reuse the existing helper** when one already does the job (for example postfix handling for duplicated names such as `-1`, `-2`) instead of a new function next to it.
- **Post-response side effects** (activity logs, notifications) are events published from the post-response hook (e.g. `afterSend`) through the project's event/flow mechanism, as the existing side-effect flows do. Never a direct API call wrapped in try/catch.
- **Let errors surface.** When the frontend's request wrapper already handles errors (adapt to your codebase's convention), callers need no try/catch: show the error, and leave retries to the user.
- **Model/view fixes belong in the shared models package** when the bug is in a view or model, not in a consumer workaround. Cover it with tests in the consumer service, not in the models package (adapt to your codebase's convention).
- **API keys are always present:** return `isArchived: false` on active items, never a key only when it's true. Tests assert the false case explicitly (e.g. `isFalse`).
- No ORM scope bypasses (e.g. `.unscoped()`), and no re-unwrapping of DAO results (e.g. `.get({plain: true})`) when the service layer already returns plain objects.
- **Check every consumer** before changing a response or a shared endpoint (`git grep` across all repos). When the contract is unchanged, say so in the MR with the reason.
- **Keep external formats stable.** For customer-facing imports, exports and documents, adapt the consumer (e.g. the import service) to platform changes. Never make customers change their files.

## Tests

- **Test through the API route or the service helper.** No DAO-level test files, no tests in the shared models package, no tests for external transport clients (adapt to your codebase's convention).
- A validator's behaviour is tested by calling the actual API, not the validator function.
- DAO calls in tests go inside a transaction (e.g. `beginTx`, with the write flag for writes). Never call ORM models directly (`models.X.update/create`).
- No hard-coded expected values: read expectations from the shared test fixtures (e.g. `this.data.*`) or the request data.
- Argument-free cache calls use an empty-string key (e.g. `cache('', …)`), like the existing argument-free cached lookups (adapt to your codebase's convention).
- When asked to "keep only the fix", drop the test commit entirely.

## Frontend

- **No ref + useEffect pairs** when an event handler can do the work. For example, clear the dependent field in `onSelect`.
- **No useEffect data fetching.** Use the state holders and loaders, and reuse an existing holder before creating one.
- **One map, many inputs:** two lookup maps with the same keys and different labels become one map read with a different key.
- `??` vs `||`: use `??` when 0 or `''` is a valid value.
- New UI uses the project's current styling approach (e.g. Tailwind) with theme tokens, never hard-coded colours. Enable shared-UI behaviour per call site, not globally in the shared UI library.
- **A legacy UI library is technical debt.** While migrating from <LEGACY_UI_LIB> to <NEW_UI_LIB>: when a <NEW_UI_LIB> component is a 1:1 replacement for the legacy one you touch, use it.

## Comments and evidence

- **No comments by default.** Never describe the old or buggy behaviour in a comment; that goes in the MR. Before pushing, grep the whole MR diff for added comment lines (`+` lines starting with `//`, `/*`, `#`, `{/*`). Only a lint-disable reason may stay.
- **Question the expected behaviour** when QA's expectation would add cost for no user value. For example, loading item-level variables at the parent level adds DB requests per item. Explain why, politely, before building it.
