import { mkdir, rename } from 'node:fs/promises';
import { env, launch, login, openContext, warmUp } from './lib.mjs';

const name = process.argv[2] ?? 'recording';
const base = env.base;

// ---- steps: replace with the flow that proves the MR change ----
async function flow(page, { shot, settle }) {
  await page.goto(`${base}/list-page`, { waitUntil: 'domcontentloaded' });
  await settle(5000);
  await page.getByPlaceholder('Search').click();
  await settle(1500);
  await shot('02-list');
  await page.mouse.wheel(0, 400);
  await settle(1500);
}
// ---- end steps ----

await mkdir(env.dir, { recursive: true });
const browser = await launch();

const warmSeconds = await warmUp(browser, flow);
console.log(`WARMUP ${warmSeconds}s`);

const ctx = await openContext(browser, { record: true });
const page = await ctx.newPage();
const shot = (n) => page.screenshot({ path: `${env.dir}/${name}-${n}.png` });
const settle = (ms = 4000) => page.waitForTimeout(ms);
const started = Date.now();
try {
  await login(page);
  await settle();
  await shot('01-landing');
  await flow(page, { shot, settle });
} catch (e) {
  console.error('STEP FAILED:', e.message);
  await shot('err');
} finally {
  const video = page.video();
  console.log('FINAL_URL', page.url(), `RECORDED ${Math.round((Date.now() - started) / 1000)}s`);
  await ctx.close();
  const target = `${env.dir}/${name}.webm`;
  await rename(await video.path(), target);
  console.log('VIDEO', target);
  await browser.close();
}
