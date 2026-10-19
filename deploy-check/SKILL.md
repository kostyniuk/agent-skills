---
name: deploy-check
description: Check which code an environment actually runs and whether a merged fix is deployed there, and redeploy the QA / staging env when it lags. Use before telling QA where to retest, when a reopen may be a deploy gap, or when verification needs a merged fix on the QA or staging env.
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

## Redeploy when the env lags

This fits envs that run each service's moving `<DEV_IMAGE_TAG>` image with `imagePullPolicy: Always`, where nothing restarts the pods when the `<DEV_BRANCH>` pipeline publishes a new image. When step 3 shows the QA or staging env is behind and verification needs the fix there, run:

```bash
scripts/redeploy.sh <deployment> <merge commit sha> qa staging
```

- `<deployment>` is the k8s name. Deployments sharing the image restart together (a service and its jobs worker, for example).
- The sha is the MR's merge (or squash) commit. For a `<LIVE_BRANCH>` fix it reaches `<DEV_BRANCH>` through the forward merge; if the script times out waiting, check that `<LIVE_BRANCH>` was merged into `<DEV_BRANCH>`.
- It waits for the passed `<DEV_BRANCH>` pipeline that contains the sha, checks the registry's `<DEV_IMAGE_TAG>` was pushed after the fix landed, restarts only pods not already on that digest, and confirms the new pods run it. Its last line per env is your provenance evidence.
- It stops on a failed pipeline, any env other than qa or staging, or an image pinned to a version: those need a real deploy, so ask the developer.
- A restart blips the service for <QA_TEAM> for about a minute. The script restarts only when the digest differs, so don't loop it.
- Fill the placeholders at the top of the script first. It uses `glab`, `aws ecr` and an ssh alias per env with `kubectl`; swap those calls for another code host or registry.

## Re-patch a pinned release env

Some release envs run a pinned patch image (`<service>:<RELEASE_PATCH_TAG>`) built from a git tag, not a moving branch image. To get a merged `<LIVE_BRANCH>` fix there, move that patch tag. Do it only when the developer asks: it rewrites a tag QA tests against.

1. **Wait for the branch pipeline** of the merge commit. Tag pipelines usually retag the commit's image rather than rebuild it, so that image must exist first.
2. **Move the tag** in the fix's repo only. First list what the move adds (`git log --oneline <tag>..origin/<LIVE_BRANCH>`). Then `git push origin :refs/tags/<tag> && git tag -f <tag> origin/<LIVE_BRANCH> && git push origin refs/tags/<tag>`, and confirm with `git ls-remote --tags origin <tag>`.
3. **Watch the tag pipeline.** A job stuck waiting for a runner for 2–3 minutes: retry it, and cancel the publish jobs for apps whose code didn't change to free runners. Say which images you didn't rebuild.
4. **Restart only that deployment** on the release env, wait for `rollout status`, and leave every other service alone.
5. **Prove it** with steps 2–3 above: the new pod's `imageID` digest matches the pushed tag, and the env serves the marker.
