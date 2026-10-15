import { env, launch, login, openContext } from './lib.mjs';

const paths = process.argv.slice(2);
if (!paths.length) {
  console.error('usage: node warmup.mjs /path-one /path-two ...');
  process.exit(1);
}
const browser = await launch();
const ctx = await openContext(browser, { record: false });
const page = await ctx.newPage();
let t = Date.now();
await login(page);
console.log(`login      ${Math.round((Date.now() - t) / 1000)}s`);
for (const p of paths) {
  t = Date.now();
  await page.goto(`${env.base}${p}`, { waitUntil: 'load', timeout: 180000 }).catch((e) => console.error(p, e.message));
  await page.waitForTimeout(1000);
  console.log(`${p.padEnd(40)} ${Math.round((Date.now() - t) / 1000)}s`);
}
await browser.close();
