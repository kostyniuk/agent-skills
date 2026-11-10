import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const lang = process.argv[2];
const srt = readFileSync(`subs/${lang}.srt`, 'utf8').trim().split(/\n\n+/).map(b => {
  const [, tm, ...txt] = b.split('\n');
  const [a, z] = tm.split(' --> ').map(x => { const [h, m, s] = x.replace(',', '.').split(':'); return +h * 3600 + +m * 60 + +s; });
  return { a, z, txt: txt.join('\n') };
});
const total = JSON.parse(readFileSync('build/timeline.json', 'utf8')).total;
const dir = `build/cap_${lang}`; mkdirSync(dir, { recursive: true });
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
// about:blank can't load file:// fonts, so embed Inter as a data URL.
const font = 'data:font/woff2;base64,' + readFileSync('assets/fonts/InterVariable.woff2').toString('base64');
await p.setContent(`<html><head><style>@font-face{font-family:I;src:url(${font})}html,body{margin:0;background:transparent;width:1920px;height:1080px}
#c{position:absolute;left:0;right:0;bottom:56px;text-align:center}
#c span{display:inline-block;max-width:1500px;font:500 44px/1.32 I;color:#F2F2F0;background:rgba(11,11,12,.80);padding:12px 30px 14px;letter-spacing:-0.01em;white-space:pre-line;box-shadow:0 10px 40px rgba(0,0,0,.35)}</style></head><body><div id="c"><span></span></div></body></html>`);
await p.evaluate(() => document.fonts.ready);
const list = [];
let t = 0;
await p.evaluate(() => document.querySelector('#c').style.display = 'none');
await p.screenshot({ path: `${dir}/blank.png`, omitBackground: true });
await p.evaluate(() => document.querySelector('#c').style.display = 'block');
for (let i = 0; i < srt.length; i++) {
  const c = srt[i];
  await p.evaluate(s => document.querySelector('#c span').textContent = s, c.txt);
  await p.screenshot({ path: `${dir}/${i}.png`, omitBackground: true });
  if (c.a > t) list.push(`file 'blank.png'\nduration ${(c.a - t).toFixed(3)}`);
  list.push(`file '${i}.png'\nduration ${(c.z - c.a).toFixed(3)}`);
  t = c.z;
}
list.push(`file 'blank.png'\nduration ${(total - t).toFixed(3)}`, `file 'blank.png'`);
writeFileSync(`${dir}/list.txt`, list.join('\n') + '\n');
await b.close();
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', `${dir}/list.txt`, '-vf', 'fps=30,format=rgba', '-c:v', 'qtrle', `build/captions_${lang}.mov`]);
console.log(lang, srt.length, 'cues');
