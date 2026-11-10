// Logs in once through the app's login form and caches the session for 15 minutes.
// Env: APP_URL (default http://localhost:3000), APP_USER, APP_PASS, and the LOGIN_* selectors if your form differs.
import { chromium } from 'playwright';
import { existsSync, statSync } from 'node:fs';
export const BASE = process.env.APP_URL || 'http://localhost:3000';
const STATE = 'build/state.json';
const sel = (name, fallback) => process.env[name] || fallback;
export async function login() {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/');
  // SSO apps redirect to the identity provider; others show a sign-in button or the form itself.
  await page.waitForURL(u => u.origin !== BASE, { timeout: 15000 }).catch(() => {});
  if (new URL(page.url()).origin === BASE) {
    const btn = page.getByRole('button', { name: /sign in|log in/i }).first();
    if (await btn.count()) { await btn.click(); await page.waitForLoadState('domcontentloaded'); }
  }
  await page.locator(sel('LOGIN_USER_SELECTOR', '#username, input[name="username"], input[type="email"]')).first().fill(process.env.APP_USER);
  await page.locator(sel('LOGIN_PASS_SELECTOR', '#password, input[type="password"]')).first().fill(process.env.APP_PASS);
  await page.locator(sel('LOGIN_SUBMIT_SELECTOR', '#kc-login, button[type="submit"]')).first().click();
  await page.waitForURL(u => u.origin === BASE, { timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await ctx.storageState({ path: STATE });
  await b.close();
}
export async function authedContext(browser, opts = {}) {
  if (!existsSync(STATE) || Date.now() - statSync(STATE).mtimeMs > 15 * 60 * 1000) await login();
  return browser.newContext({ viewport: { width: 1920, height: 1080 }, storageState: STATE, ...opts });
}
export { chromium };
