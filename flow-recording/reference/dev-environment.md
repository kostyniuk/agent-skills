# Dev environment facts

Fill the placeholders from your project's profile; keep the steps.

Everything here describes a local <PROJECT> stack. The *shapes* (login form, routes, waiting
rules) hold everywhere; the concrete values below are placeholders and examples for one stack and
are almost certainly different on yours. Treat them as hints to check, not facts to rely on.

Base URL `<LOCAL_URL>` (set `DEV_URL`). Test user on `<TEST_APP>`: `<TEST_USER>` and its password
(`DEV_USER` / `DEV_PASS`). If login fails, that account does not exist on your stack - make one, or
point `DEV_USER` / `DEV_PASS` at an account that does.

## Login

If the login page embeds a legacy form in an iframe, fill it through the frame (set `LOGIN_FRAME`
and the `LOGIN_*_SELECTOR` vars so `scripts/lib.mjs` does the same):

```js
const login = page.frameLocator('iframe[src*="<login-frame-path>"]');
await login.locator('<user-selector>').fill(user);
await login.locator('<pass-selector>').fill(pass);
await login.locator('<submit-selector>').click();
await page.waitForURL((u) => !u.pathname.startsWith('/login'));
```

With the MCP: `browser_snapshot` shows the iframe fields; type into the email and password fields,
click the plain login button (not an SSO one).

Never wait for `networkidle` when the app long-polls or holds sockets open: it never settles. Use
`domcontentloaded` and explicit waits of 3 to 5 seconds after navigation.

## Routes

| Page | Path |
|---|---|
| Dashboard | `/<dashboard-path>` |
| Main list page | `/<list-path>` |
| Detail page | open from the list, not by URL |
| Settings / configuration | `/<settings-path>` |

Fill this table with your app's real routes once, so a flow can navigate directly.

Clicking a sidebar group label can open a popover (e.g. a "Recent" list) rather than a page. Click
the child item, or navigate to the path directly.

Never hardcode a record id into a flow. Ids are per-stack, so a flow built around one breaks for
everyone else - open the list page and pick the first row instead.

(Example: a seeded test app has a known order, part, quote and customer, with UI ids shaped like
`X-NN-ORDER-NNNNN`.) If you do need a specific record, search for it on the list page rather than
guessing a detail URL.
