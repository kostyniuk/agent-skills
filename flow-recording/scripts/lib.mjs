import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

export const env = {
  dir: process.env.MR_RECORDINGS_DIR ?? `${process.env.HOME}/mr-recordings`,
  base: process.env.DEV_URL ?? 'http://localhost:3000',
  user: process.env.DEV_USER,
  pass: process.env.DEV_PASS,
  loginPath: process.env.LOGIN_PATH ?? '/login',
  loginFrame: process.env.LOGIN_FRAME ?? '',
  userSelector: process.env.LOGIN_USER_SELECTOR ?? 'input[type=email]',
  passSelector: process.env.LOGIN_PASS_SELECTOR ?? 'input[type=password]',
  submitSelector: process.env.LOGIN_SUBMIT_SELECTOR ?? 'button[type=submit]',
};

const cursorScript = fileURLToPath(new URL('./cursor-overlay.js', import.meta.url));

export async function openContext(browser, { record }) {
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
    ...(record && { recordVideo: { dir: env.dir, size: { width: 1920, height: 1080 } } }),
  });
  if (record) await ctx.addInitScript({ path: cursorScript });
  return ctx;
}

export async function login(page) {
  if (!env.user || !env.pass) throw new Error('export DEV_USER and DEV_PASS for the test account');
  await page.goto(`${env.base}${env.loginPath}`, { waitUntil: 'domcontentloaded' });
  const form = env.loginFrame ? page.frameLocator(env.loginFrame) : page;
  await form.locator(env.userSelector).waitFor({ timeout: 60000 });
  await page.waitForTimeout(800);
  await form.locator(env.userSelector).fill(env.user);
  await form.locator(env.passSelector).fill(env.pass);
  await form.locator(env.submitSelector).click();
  await page.waitForURL((u) => !u.pathname.startsWith(env.loginPath), { timeout: 90000 });
}

// A dev server that compiles pages on first visit (e.g. Next.js dev mode); a warm pass makes the recorded pass fast.
export async function warmUp(browser, flow) {
  const ctx = await openContext(browser, { record: false });
  const page = await ctx.newPage();
  const started = Date.now();
  await login(page);
  await flow(page, { shot: async () => {}, settle: (ms = 1500) => page.waitForTimeout(Math.min(ms, 1500)) });
  await ctx.close();
  return Math.round((Date.now() - started) / 1000);
}

export const launch = () => chromium.launch({ headless: true });

export const launchAndCheckAuth = async () => {
  const { execSync } = await import('node:child_process');
  try {
    execSync('glab api user', { stdio: 'pipe' });
  } catch {
    throw new Error('glab token is dead — run `glab auth login` before recording, or the upload fails after all the work');
  }
  return launch();
};

// ---- Kendo-style data grid helpers ----

export const waitForGridRows = (page) =>
  page.waitForFunction(() => document.querySelectorAll('.k-grid tbody tr').length > 0, null, { timeout: 60000 });

// Column order is per-user and changes between sessions, so never hardcode an index.
export async function columnFilter(page, title) {
  const idx = await page.$$eval(
    '.k-grid-header th',
    (ths, t) => ths.findIndex((th) => th.innerText.trim() === t),
    title
  );
  if (idx < 0) throw new Error(`column "${title}" is not visible in the grid`);
  const cell = `.k-filter-row > th[aria-colindex="${idx + 1}"]`;
  return { idx, cell, input: page.locator(`${cell} .k-multiselect input`) };
}

export async function clearFilterTags(page, cell) {
  for (let i = 0; i < 6; i++) {
    const close = page.locator(`${cell} .k-multiselect li .k-i-close`).first();
    if (!(await close.isVisible().catch(() => false))) return;
    await close.click();
    await page.waitForTimeout(2500);
  }
}

// The multiselect debounces its search, so an ArrowDown that lands early selects nothing: retry.
// Use page.keyboard, not locator.press — re-resolving the locator re-focuses and clears the search.
export async function selectFilterOption(page, filter, search, exact) {
  const tag = page.locator(`${filter.cell} .k-multiselect li`, { hasText: exact });
  const visible = (loc, timeout) => loc.waitFor({ state: 'visible', timeout }).then(() => true, () => false);

  for (let attempt = 1; attempt <= 4; attempt++) {
    await filter.input.fill('');
    await filter.input.click();
    await page.waitForTimeout(1500);
    await filter.input.pressSequentially(search, { delay: 150 });
    const match = page.locator('.k-animation-container .k-list .k-item', { hasText: search }).first();
    if (!(await visible(match, 10000))) continue;
    await page.waitForTimeout(1200);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    if (await visible(tag, 8000)) return;
  }
  throw new Error(`could not select "${exact}" in the ${filter.cell} filter`);
}

export const visibleOptions = (page) =>
  page.$$eval('.k-animation-container .k-list .k-item', (els) =>
    els.filter((e) => e.offsetParent !== null).map((e) => e.innerText.trim())
  );
