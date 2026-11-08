---
name: screen-tour
description: Open the app at the URL you give (production, staging, a preview deploy or a local run) and walk through every screen that uses an API, hook, or feature, with one annotated screenshot per place showing what it reads and which request it fires.
disable-model-invocation: true
argument-hint: "What to tour, and where? (URL plus route, hook, PR or feature; default: what the current change touches)"
---

Give a screenshot tour of $ARGUMENTS, or of the code the current change touches when no argument is given. The reader is an engineer new to this product or codebase. Show them each place in the running app where this code or feature is used, what it drives on screen, and the real request behind it.

1. **Map the places.** When you have the code, trace from it to the screens: start at the API client or hook, then grep up through its callers (hook → component → page) until you reach routes. Then follow the request down: the endpoint or server function that handles it, the services it calls, and where the data comes from (database, cache, third-party API), so labels can explain behaviour such as caching or limits. Also look for opt-outs (flags that skip the call) and for callers that only read the same cache. Without the code, map from the app itself: navigate, and match what you see to the requests in the network log. Done when you have a list of screens, each with a route, the element that shows the data, and the expected request.

2. **Open the target.** Use the URL the user gave: production, staging, a preview deploy, or a local server. Run the app locally only when the user asks for that, or when the code you're touring isn't deployed anywhere you can reach. In that case, use the project's local-run skill if there is one, check that ports are free, and leave anyone else's processes alone. If the app needs a login, open a headed browser and let the user sign in themselves; never ask for passwords or codes in chat. Follow the user's browser and viewport preferences (CLAUDE.md, earlier instructions); without any, use headless Playwright at 1440×900. Find records that put each screen in an interesting state, not an empty one.

3. **Prove each request fired.** On every screen, read `performance.getEntriesByType("resource")` (or the network log) and record the URL and status you will quote. Never caption a request you didn't see.

   If the data can't reach a place, stage it in the browser only. Use `page.route` to point at a real upstream record, or drop a field so the code takes the other branch. On a shared or production environment, only read: write nothing, and say in the banner exactly what was staged and what stayed real.

4. **Annotate and capture.** Inject `scripts/annotate.js` with `page.addScriptTag({ path })`, then call `window.__annotate(marks, banner, options)`. It softly dims the page around the marks and draws:
   - **A numbered highlight** on each element the data drives, with a white label card carrying the same number. Write the label for a newcomer: first what the user sees or can do, then the chain (component → hook) and the rule, in one or two lines.
   - **A request banner** at the bottom: one line per call, `GET <url> → <status>` (the method becomes a coloured chip). Add a "before: <old url>" line when the change moved it, and a line listing sibling calls that are out of scope.

   The default accent is indigo; pass `{ accent }` to match the product's brand, or `{ dim: false }` when dimming hides context. Take a viewport screenshot, view it, and fix overlaps or clipped labels before moving on. Keep to three marks or fewer per screen. Number the files in tour order (`01-…png`). Check every caption against the code or the network log. A claim such as "also used by X" needs a grep or a visit that proves it.

5. **Clean up.** Close the browser, then move the screenshots into the scratchpad. Delete `.playwright-mcp/` and any other output that landed in the repo. Redact presigned URLs, tokens, account names, and other personal data from captions, paths, and the visible page. If you started the app locally, leave it running and give the user the command to stop it.

6. **Report.** Open with what the tour covers (e.g. the two routes) and what it ran against: the URL and environment, plus the build or version if the app shows one; for a local run, the branch or SHA. Then one `###` section per place, in the order a user would meet them: one or two sentences on what the screen shows and why, then the embedded image with its absolute path. Name staged screens as staged. End with anything you corrected from earlier answers, and the stop command if you started something.
