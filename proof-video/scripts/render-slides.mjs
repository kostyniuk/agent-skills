import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { scenes } from '../slides/scenes.mjs';
const FPS = 30;
const tl = JSON.parse(readFileSync('build/timeline.json', 'utf8'));
const segs = tl.segments;
const mode = process.argv[2]; // "stills" | "video"
const only = process.argv.slice(3);

function sceneWindow(i) {
  const start = segs[i].win_start;
  return { start, end: start + segs[i].win };
}
function phraseTimes(html, seg, sceneStart) {
  const al = JSON.parse(readFileSync(`audio/${seg.id}.json`, 'utf8'));
  const chars = al.characters.join('');
  const keys = new Set();
  for (const m of html.matchAll(/data-(?:at|done|on|out|path|from)="([^"]+)"/g)) m[1].split('|').forEach(k => keys.add(k.replace(/&amp;/g, '&')));
  const times = {};
  for (const k of keys) {
    let idx = chars.indexOf(k);
    if (idx < 0) idx = chars.toLowerCase().indexOf(k.toLowerCase());
    if (idx < 0) throw new Error(`${seg.id}: phrase not found: "${k}"`);
    times[k] = seg.start + al.character_start_times_seconds[idx] - sceneStart;
  }
  return times;
}
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('file://' + process.cwd() + '/slides/template.html');
await page.evaluate(() => document.fonts.ready);
for (let i = 0; i < segs.length; i++) {
  const seg = segs[i];
  if (seg.visual !== 'slide' || (only.length && !only.includes(seg.id))) continue;
  const sc = scenes[seg.id];
  if (!sc) throw new Error('no scene ' + seg.id);
  const { start, end } = sceneWindow(i);
  const dur = end - start;
  const times = phraseTimes(sc.html, seg, start);
  await page.evaluate(([s, m]) => window.setup(s, m), [sc, { times, dur, globalStart: start, total: tl.total }]);
  await page.evaluate(() => document.fonts.ready);
  if (mode === 'stills') {
    for (const f of [0.35, 0.97]) {
      const t = dur * f;
      await page.evaluate(([t, fr]) => window.render(t, fr), [t, Math.round(t * FPS)]);
      await page.screenshot({ path: `slides/still_${seg.id}_${Math.round(f * 100)}.jpg`, type: 'jpeg', quality: 80 });
    }
    console.log('stills', seg.id);
    continue;
  }
  const n = Math.round(dur * FPS);
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), `build/scene_${seg.id}.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < n; f++) {
    await page.evaluate(([t, fr]) => window.render(t, fr), [f / FPS, f]);
    const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('video', seg.id, n, 'frames', ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
await browser.close();
