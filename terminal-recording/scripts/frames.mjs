// Samples N frames from a webm by playing it in Chromium, for a check before uploading.
// No ffmpeg needed. Usage: node frames.mjs <file.webm> [count=8] [outDir=/tmp/frames]
import fs from 'node:fs';
import path from 'node:path';

import {chromium} from 'playwright';

const [file, count = '8', outDir = '/tmp/frames'] = process.argv.slice(2);
if (!file) {
  console.error('usage: node frames.mjs <file.webm> [count] [outDir]');
  process.exit(1);
}
fs.mkdirSync(outDir, {recursive: true});

const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1280, height: 720}});
await page.goto(`file://${path.resolve(file)}`);
const video = page.locator('video');
await video.waitFor();

// Playwright's webm has no duration in its header (Infinity) until the player seeks to the end.
const duration = await video.evaluate(async (el) => {
  await new Promise((r) => (el.readyState >= 1 ? r() : (el.onloadedmetadata = r)));
  if (el.duration === Infinity) {
    el.currentTime = 1e9;
    await new Promise((r) => (el.onseeked = r));
  }
  return el.duration;
});
console.log(`duration ${duration.toFixed(1)}s`);

const n = Number(count);
for (let i = 0; i < n; i++) {
  const t = (duration * (i + 0.5)) / n;
  await video.evaluate((el, at) => new Promise((r) => {
    el.onseeked = r;
    el.currentTime = at;
  }), t);
  const out = path.join(outDir, `frame-${String(i).padStart(2, '0')}.png`);
  await video.screenshot({path: out});
  console.log(`${t.toFixed(1)}s -> ${out}`);
}
await browser.close();
