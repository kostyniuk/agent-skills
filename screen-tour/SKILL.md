---
name: screen-tour
description: Run the app locally and walk through every screen that uses an API, hook, or feature, with one annotated screenshot per place showing what it reads and which request it fires.
disable-model-invocation: true
argument-hint: "What to tour? (route, hook, PR, feature; default: what the current change touches)"
---

Give a screenshot tour of $ARGUMENTS, or of the code the current change touches when no argument is given. The reader is an engineer new to this codebase. Show them each place in the running app where this code is used, what it drives on screen, and the real request behind it.

1. **Map the places.** Trace from the code to the screens: start at the API client or hook, then grep up through its callers (hook → component → page) until you reach routes. Also look for opt-outs (flags such as `lean` that skip the call) and for callers that only read the same cache. Done when you have a list of screens, each with a route, the element that shows the data, and the expected request.

2. **Run it.** Use the `local-stack` skill to start the services the branch needs on free ports. Check the ports first; leave anyone else's processes alone. Use headless Playwright at 1440×900. Find the local seed records that exercise each place: a record whose data puts the screen in the interesting state, not an empty one.

3. **Prove each request fired.** On every screen, read `performance.getEntriesByType("resource")` (or the network log) and record the URL and status you will quote. Never caption a request you didn't see.

   If local data can't reach a place, stage it in the browser only. Use `page.route` to point at a real upstream record, or drop a field so the code takes the other branch. Write nothing to shared data, and say in the banner exactly what was staged and what stayed real.

4. **Annotate and capture.** Inject `scripts/annotate.js` with `page.addScriptTag({ path })`, then call `window.__annotate(marks, banner)`:
   - **Red box with label**, on the element the data drives. The label names the chain (component → hook) and the rule in one or two lines, e.g. "validated cuttingTask → Cuttable".
   - **Dark banner** at the bottom with the request: `GET <url> → <status>`. Add "before: <old url>" when the change moved it, and list sibling calls that are out of scope.

   Take a viewport screenshot, view it, and fix overlaps or clipped labels before moving on. Number the files in tour order (`01-…png`). Check every caption against the code. A claim such as "also used by X" needs a grep that proves it.

5. **Clean up.** Close the browser, then move the screenshots into the scratchpad. Delete `.playwright-mcp/` and any other output that landed in the repo. Redact presigned URLs, tokens, and credentials from captions and paths. Leave the apps you started running, and give the user the command to stop them.

6. **Report.** Open with what the tour covers (e.g. the two routes) and the branch or SHA it ran on. Then one `###` section per place, in the order a user would meet them: one or two sentences on what the screen shows and why, then the embedded image with its absolute path. Name staged screens as staged. End with anything you corrected from earlier answers, then the stop command.
