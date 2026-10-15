---
name: deploy-check
description: Check which code an environment actually runs and whether a merged fix is deployed there. Use before telling QA where to retest, or when a reopen may be a deploy gap.
---

# Is the fix deployed?

Fill the placeholders from your project's profile; keep the steps.

**Provenance** is the chain from merge to running code: the MR/PR merged into a branch, the branch's pipeline built an image or bundle, the env was redeployed with it, and the page you are looking at loaded it. Check the link you're unsure of from the env's side. "I deployed it" and a green pipeline only say the chain started.

The env-to-branch map is in [ENVIRONMENTS.md](ENVIRONMENTS.md).

## Steps

1. **Merge facts.** Ask <CODE_HOST>'s API for the MR (e.g. `glab api "projects/<url-encoded path>/merge_requests/<iid>"` or `gh pr view <n> --json state,baseRefName,mergedAt`) and read the state, target branch and merge time. Check that the target branch is the one this env runs; a `<DEV_BRANCH>` merge never reaches the release env.

2. **Pick a marker.** Choose a string that only the fixed code contains: a new message, a new object key, a changed condition's literal. Minifiers keep strings and object keys, not local variable names. Also note an old string the fix removed.

3. **Read what the env serves.** Use the technique for the code's type:

   | Code | Technique |
   |---|---|
   | Legacy server-rendered pages with a single AngularJS bundle | Find the bundle URL (e.g. `https://<env>/<path>/app.min.js?<static-query>`). If its query string never changes, it is no cache-buster, so check freshness yourself: run `curl -sI` and check that `Last-Modified` is after the merge time. Then `curl -s … \| grep -c '<marker>'`, and confirm the old string is gone |
   | Main frontend (Next.js or another code-split app) | Chunks load lazily, so the HTML only lists the first ones. Open the page that uses the code (see [`browser-verification`](../browser-verification/SKILL.md)), then fetch every `performance.getEntriesByType('resource')` `.js` URL in the tab and search them for the marker |
   | Customer-facing SPA (portal) | Same as the main frontend: open the page, then search the loaded chunks |
   | Backend service | Code isn't visible from outside. Use a behaviour that differs before and after (an API call or UI step), or the new pods' logs in <LOG_SERVICE> ([`readonly-data-access`](../readonly-data-access/SKILL.md)). A CI job that publishes an image only builds it; it doesn't deploy it |
   | Shared internal libraries | Check the version the consumer's image installed. Locally: `cat <app-dir>/node_modules/<scope>/<lib>/package.json` in the container |

4. **Check the open tab.** A tab can hold an old cached bundle. Reload it with `fetch(url, {cache: 'reload'})` and then `location.reload()`, and check the live code: for AngularJS, `injector.get('<name>Directive')[0].controller.toString().includes('<marker>')`.

5. **Report it as provenance:** "merged to `<branch>` at T; `<env>` serves it since T2 (`<evidence>`)", or "not on `<env>` yet: `<evidence>`". Done when every env you name in a QA comment has this line behind it.
