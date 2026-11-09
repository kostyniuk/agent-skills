// Records one app segment in a 1080p Playwright video, firing each step on its narration phrase.
// usage: node scripts/record-app.mjs <segmentId> <steps.mjs> [dry]
// The steps module exports `url` (or a function returning it) and a default async function receiving
// { page, at, T, hl, call, click, dry }; see app-steps.example.mjs. BLOCK_HOSTS=":1338,analytics.example.com"
// aborts requests to services you don't run, so the page doesn't show their errors.
import { chromium, authedContext } from './auth.mjs';
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const [segId, stepsPath, mode] = process.argv.slice(2);
const DRY = mode === 'dry';
const seg = JSON.parse(readFileSync('build/timeline.json', 'utf8')).segments.find(s => s.id === segId);
if (!seg) throw new Error(`no segment ${segId} in build/timeline.json`);
const al = JSON.parse(readFileSync(`audio/${seg.id}.json`, 'utf8'));
const at = (phrase) => { const i = al.characters.join('').indexOf(phrase); if (i < 0) throw new Error(`${segId}: phrase not found "${phrase}"`); return seg.lead + al.character_start_times_seconds[i]; };
const steps = await import(pathToFileURL(stepsPath).href);
rmSync('build/rec', { recursive: true, force: true }); mkdirSync('build/rec', { recursive: true });
const b = await chromium.launch();
const ctx = await authedContext(b, { recordVideo: { dir: 'build/rec', size: { width: 1920, height: 1080 } } });
const t0 = Date.now();
for (const h of (process.env.BLOCK_HOSTS || '').split(',').filter(Boolean)) await ctx.route(u => u.href.includes(h), r => r.abort('failed'));
await ctx.addInitScript({ path: 'build/overlay.built.js' });
const page = await ctx.newPage();
const bad = []; page.on('response', r => r.status() >= 400 && bad.push(`${r.status()} ${r.request().method()} ${r.url().slice(0, 140)}`));
const url = typeof steps.url === 'function' ? await steps.url() : steps.url;
await page.goto(url, { waitUntil: 'domcontentloaded' });
if (steps.ready) await steps.ready(page);
await page.mouse.move(960, 600);
await page.waitForTimeout(1500);
const start = (Date.now() - t0) / 1000;
const T = (s) => page.waitForTimeout(Math.max(0, start * 1000 + s * 1000 - (Date.now() - t0)));
const hl = async (loc) => { const r = loc ? await loc.boundingBox() : null; await page.evaluate(r => window.__box(r), r); if (r) await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2, { steps: 24 }); };
const call = (k, v) => page.evaluate(([k, v]) => window.__callout(k, v), [k, v]);
const click = async (loc) => { await hl(loc); if (!DRY) { await page.mouse.down(); await page.mouse.up(); } };
const log = await steps.default({ page, at, T, hl, call, click, dry: DRY });
await T(seg.win);
const video = page.video();
await ctx.close(); await b.close();
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-ss', start.toFixed(3), '-i', await video.path(), '-vf', `fps=30,scale=1920:1080,tpad=stop_mode=clone:stop_duration=0.5,format=yuv420p`, '-t', seg.win.toFixed(3), '-c:v', 'libx264', '-crf', '17', `build/seg_${seg.id}${DRY ? '_dry' : ''}.mp4`]);
console.log(JSON.stringify({ segment: seg.id, start, win: seg.win, log, bad: bad.slice(0, 15) }, null, 1));
