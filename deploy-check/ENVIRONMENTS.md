# Environments

Fill the placeholders from your project's profile; keep the rules.

Release numbers move. Find the current Live branch with `git branch -r | grep -E 'origin/release-[0-9]+$' | sort -V | tail -1` (adapt the pattern to your release-branch naming). Below, `<LIVE_BRANCH>` means that branch and "next release" means `<DEV_BRANCH>`.

| Env | URL | Runs | Use it for | DB access |
|---|---|---|---|---|
| Local stack | `<LOCAL_URL>` | your checkouts | red/green, before/after, anything that writes data | full ([`local-stack`](../local-stack/SKILL.md)) |
| QA env | `<QA_ENV_URL>` | `<DEV_BRANCH>` | <QA_TEAM>'s dev apps, reopens reported on the dev env | `<read-only :<DB_PORT_QA>>` |
| Staging | `<STAGING_URL>` | `<DEV_BRANCH>` (next release) | <QA_TEAM>'s staging apps, release candidates | `<read-only :<DB_PORT_STAGING>>`; if it is an anonymised prod copy already migrated to the next release, it doesn't show Live state |
| Release env | `<RELEASE_ENV_URL>` | `<LIVE_BRANCH>` | QA of the Live release, reopens reported on the release env | `<read-only :<DB_PORT_RELEASE>>` |
| <PROD> (main region) | customer apps | `<LIVE_BRANCH>` | never drive the UI | `<read-only :<DB_PORT_PROD>>`, ids and counts only |
| <PROD> (restricted region / regulated tenants) | customer apps | `<LIVE_BRANCH>` | never | **none**; <SUPPORT> asks the customer |

## Branch rules

- `<LIVE_BRANCH>` merges forward into `<DEV_BRANCH>` automatically (if your project does this). A release fix then needs one MR to `<LIVE_BRANCH>` only.
- Which branch a fix targets is decided in bug-fix (step 4).
- As of the current releases (re-check after each release): ownership of a feature can move between services or pages between releases (a page migrated from a legacy app to the new frontend, an endpoint moved to a new service). Before fixing a legacy page, check on `<LIVE_BRANCH>`, not only on `<DEV_BRANCH>`, which service or page owns it there.

## Third-party config differs per env

- <PAYMENT_PROVIDER> (e.g. Stripe) test-mode webhook endpoints differ per env: one may be disabled, another may not subscribe to an event a flow needs (e.g. `payment_intent.amount_capturable_updated` for manual capture), so that flow never completes there. Read the webhook endpoints via the provider's API (read-only, never print keys) before trusting a payment retest.
- Local payments need webhook forwarding: see the `local-stripe-webhooks` skill.
- Bot protection (e.g. reCAPTCHA v3) may guard login on some envs and not others; how to log in headless is in [`browser-verification`](../browser-verification/SKILL.md).
