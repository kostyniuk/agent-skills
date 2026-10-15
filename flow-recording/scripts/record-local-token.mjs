import { mkdir, rename } from 'node:fs/promises';
import { env, launch, openContext } from './lib.mjs';

const [name, flowPath] = process.argv.slice(2);
const base = process.env.DEV_URL ?? 'http://localhost:3000';
const token = process.env.DEV_TOKEN;
const storageKey = process.env.TOKEN_STORAGE_KEY ?? 'accessToken';
if (!name || !flowPath || !token) {
  console.error('usage: DEV_TOKEN=... node record-local-token.mjs <name> <flow-module.mjs>');
  process.exit(1);
}
const { flow } = await import(new URL(flowPath, `file://${process.cwd()}/`).href);

async function prepare(ctx) {
  const page = await ctx.newPage();
  await page.goto(`${base}/robots.txt`);
  await page.evaluate(([k, t]) => localStorage.setItem(k, t), [storageKey, token]);
  return page;
}

await mkdir(env.dir, { recursive: true });
const browser = await launch();

if (!process.env.SKIP_WARMUP) {
  const warmCtx = await openContext(browser, { record: false });
  const warmPage = await prepare(warmCtx);
  await flow(warmPage, { base, shot: async () => {}, settle: (ms = 1500) => warmPage.waitForTimeout(Math.min(ms, 1500)) });
  await warmCtx.close();
}

const ctx = await openContext(browser, { record: true });
const page = await prepare(ctx);
const shot = (n) => page.screenshot({ path: `${env.dir}/${name}-${n}.png` });
const settle = (ms = 2500) => page.waitForTimeout(ms);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await flow(page, { base, shot, settle });
} catch (e) {
  console.error('STEP FAILED:', e.message);
  await shot('err');
} finally {
  const video = page.video();
  await ctx.close();
  const target = `${env.dir}/${name}.webm`;
  await rename(await video.path(), target);
  console.log('VIDEO', target, 'PAGE_ERRORS', errors.length);
  await browser.close();
}
