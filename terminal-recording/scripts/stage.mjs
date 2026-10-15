// A recordable "stage": a real shell (ttyd + xterm.js) on the left, a browser pane on the right,
// both inside one Playwright page, so one context produces one continuous webm.
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {chromium} from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const CURSOR_OVERLAY = process.env.CURSOR_OVERLAY ?? path.join(here, '..', '..', 'flow-recording', 'scripts', 'cursor-overlay.js');

export const env = {
  ttyd: process.env.TTYD_BIN ?? `${os.homedir()}/.local/bin/ttyd`,
  videoDir: process.env.MR_RECORDINGS_DIR ?? `${os.homedir()}/mr-recordings`,
  ttydPort: Number(process.env.TTYD_PORT ?? 7681),
  hostPort: Number(process.env.STAGE_PORT ?? 9034)
};

const hostPage = ({title, ttydPort, termRatio}) => `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
*{box-sizing:border-box}body{margin:0;height:100vh;display:flex;gap:12px;padding:12px;background:#E3DACC;font:13px system-ui}
.pane{display:flex;flex-direction:column;border-radius:10px;overflow:hidden;background:#fff;border:1.5px solid #D1CFC5}
.bar{padding:8px 12px;font:12px ui-monospace,monospace;background:#F0EEE6;color:#3D3D3A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#left{flex:0 0 ${termRatio}%}#right{flex:1}iframe{border:0;flex:1;width:100%}
#left .bar{background:#141413;color:#E3DACC}#placeholder{flex:1;display:flex;align-items:center;justify-content:center;color:#87867F;padding:24px;text-align:center}
</style></head><body>
<div class="pane" id="left"><div class="bar">${title}</div><iframe id="term" src="http://localhost:${ttydPort}/"></iframe></div>
<div class="pane" id="right"><div class="bar" id="addr">Browser</div><div id="placeholder">The browser opens here when the command asks for it</div></div>
<script>
window.openBrowser=(url)=>{const p=document.getElementById('placeholder');if(p){const f=document.createElement('iframe');f.id='web';p.replaceWith(f)}document.getElementById('web').src=url;window.setAddr(url)};
window.setAddr=(u)=>{document.getElementById('addr').textContent=u||'Browser'};
</script></body></html>`;

/**
 * Starts ttyd, the host page and a Chromium page showing both.
 * The shell gets a fake `xdg-open` first on PATH: anything the CLI "opens in a browser" lands in
 * `browserRequests()` instead, so the flow can show it in the right pane.
 */
export async function startStage({
  title = 'Terminal',
  cwd = process.cwd(),
  record = process.env.RECORD === '1',
  prompt = 'demo $ ',
  unsetEnv = /^(CLAUDECODE|CLAUDE_[A-Z_]*)$/,
  ttydPort = env.ttydPort,
  hostPort = env.hostPort,
  termRatio = 56,
  fontSize = 15
} = {}) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-stage-'));
  const urlFile = path.join(work, 'browser-requests');
  fs.mkdirSync(path.join(work, 'bin'));
  fs.writeFileSync(path.join(work, 'bin', 'xdg-open'), `#!/bin/sh\necho "$1" >> ${urlFile}\n`, {mode: 0o755});
  fs.writeFileSync(path.join(work, 'rc'), `PS1='\\[\\e[38;5;173m\\]${prompt}\\[\\e[0m\\]'\n`);
  // ttyd's getopt permutes argv, so `bash -i` would be read as ttyd's own -i and crash it: wrap the shell.
  fs.writeFileSync(path.join(work, 'shell.sh'), `#!/bin/bash\ncd ${JSON.stringify(cwd)}\nexec bash --rcfile ${work}/rc -i\n`, {mode: 0o755});

  const shellEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => !unsetEnv.test(k)));
  shellEnv.PATH = `${work}/bin:${shellEnv.PATH}`;
  shellEnv.BROWSER = `${work}/bin/xdg-open`;

  const ttyd = spawn(env.ttyd, [
    '-p', String(ttydPort), '-W', '-o',
    '-t', 'rendererType=dom', '-t', `fontSize=${fontSize}`, '-t', 'disableLeaveAlert=true',
    '-t', 'theme={"background":"#141413","foreground":"#F0EEE6"}',
    `${work}/shell.sh`
  ], {stdio: 'ignore', env: shellEnv});
  const host = http.createServer((req, res) => res.writeHead(200, {'Content-Type': 'text/html'}).end(hostPage({title, ttydPort, termRatio})));
  await new Promise((r) => host.listen(hostPort, r));
  await new Promise((r) => setTimeout(r, 800));

  const browser = await chromium.launch({headless: true});
  const context = await browser.newContext({
    viewport: {width: 1920, height: 1080},
    ...(record && {recordVideo: {dir: env.videoDir, size: {width: 1920, height: 1080}}})
  });
  if (record && fs.existsSync(CURSOR_OVERLAY)) await context.addInitScript({path: CURSOR_OVERLAY});
  const page = await context.newPage();
  await page.goto(`http://localhost:${hostPort}/`);

  const termFrame = page.frameLocator('#term');
  const webFrame = page.frameLocator('#web');
  const pause = (ms) => new Promise((r) => setTimeout(r, record ? ms : Math.min(ms, 200)));

  const term = {
    text: () => termFrame.locator('.xterm-rows').innerText().catch(() => ''),
    focus: () => termFrame.locator('.xterm-screen').click(),
    type: (text) => page.keyboard.type(text, {delay: record ? 35 : 5}),
    press: (key) => page.keyboard.press(key),
    run: async (command) => {
      await term.type(command);
      await page.keyboard.press('Enter');
    },
    // `test` gets the visible screen text; pass `after` to only look below a marker such as the command you typed.
    waitFor: async (test, {timeout = 120000, after} = {}) => {
      const match = typeof test === 'function' ? test : (t) => test.test(t);
      const started = Date.now();
      for (;;) {
        const text = await term.text();
        const scoped = after ? text.split(after).pop() : text;
        if (match(scoped)) return text;
        if (Date.now() - started > timeout) throw new Error(`terminal wait timed out; screen:\n${text.slice(-2000)}`);
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  };

  const web = {
    frame: webFrame,
    open: (url) => page.evaluate((u) => window.openBrowser(u), url),
    url: () => page.frames().find((f) => f.parentFrame() && !f.url().includes(`:${ttydPort}`))?.url() ?? '',
    syncAddress: async () => page.evaluate((u) => window.setAddr(u), web.url())
  };

  const browserRequests = () => (fs.existsSync(urlFile) ? fs.readFileSync(urlFile, 'utf8').split('\n').filter(Boolean) : []);
  let consumed = 0;
  const nextBrowserRequest = async ({timeout = 60000} = {}) => {
    const started = Date.now();
    for (;;) {
      const all = browserRequests();
      if (all.length > consumed) return all[consumed++];
      if (Date.now() - started > timeout) throw new Error('no browser request from the shell');
      await new Promise((r) => setTimeout(r, 300));
    }
  };

  await termFrame.locator('.xterm-rows').waitFor({timeout: 30000});
  await term.waitFor((t) => t.includes(prompt.trim()));
  await term.focus();

  const stop = async () => {
    const video = record ? await page.video()?.path() : null;
    await context.close();
    await browser.close();
    ttyd.kill();
    host.close();
    fs.rmSync(work, {recursive: true, force: true});
    return video;
  };

  return {page, term, web, pause, type: term.type, nextBrowserRequest, browserRequests, stop};
}
