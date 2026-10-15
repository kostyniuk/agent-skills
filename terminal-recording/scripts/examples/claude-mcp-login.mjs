// Real Claude Code CLI: add an HTTP MCP server, sign in through the <PROJECT> login + consent screen in
// the right pane, then ask one question that uses the server's tools.
//
//   MCP_NAME=<PROJECT> MCP_URL=http://localhost:<port>/mcp APP_USER=<TEST_USER> APP_PASS=... \
//   PROMPT="Using the <PROJECT> MCP server, look up ticket X-1 ..." RECORD=1 node examples/claude-mcp-login.mjs
import fs from 'node:fs';

import {startStage} from '../stage.mjs';

const required = (name) => {
  const value = process.env[name];
  if (!value) {
    console.error(`set ${name}`);
    process.exit(1);
  }
  return value;
};

const MCP_NAME = process.env.MCP_NAME ?? 'project';
const MCP_URL = required('MCP_URL');
const PROMPT = process.env.PROMPT ?? `Using the ${MCP_NAME} MCP server, list the tools you can use.`;
const ALLOWED_TOOLS = process.env.ALLOWED_TOOLS ?? `mcp__${MCP_NAME}`;
const USER = required('APP_USER');
const PASS = required('APP_PASS');
const EMAIL_SELECTOR = process.env.EMAIL_SELECTOR ?? '#email';
const PASS_SELECTOR = process.env.PASS_SELECTOR ?? '#pass';
const CWD = process.env.DEMO_DIR ?? '/tmp/terminal-recording-demo';

fs.mkdirSync(CWD, {recursive: true});
const stage = await startStage({title: 'Terminal — Claude Code', cwd: CWD, prompt: 'demo $ '});
const {term, web, pause} = stage;

try {
  await term.run(`claude mcp remove ${MCP_NAME} -s local >/dev/null 2>&1; clear`);
  await pause(800);
  await term.run(`claude mcp add --transport http ${MCP_NAME} ${MCP_URL}`);
  await term.waitFor(/Added HTTP MCP server/);
  await pause(1500);

  await term.run(`claude mcp login ${MCP_NAME}`);
  const authUrl = await stage.nextBrowserRequest();
  await pause(1200);
  await web.open(authUrl);

  const email = web.frame.locator(EMAIL_SELECTOR);
  const allow = web.frame.getByRole('button', {name: 'Allow'});
  await Promise.race([email.waitFor({timeout: 120000}), allow.waitFor({timeout: 120000})]);
  await web.syncAddress();
  if (await email.isVisible()) {
    await email.click();
    await stage.type(USER);
    await web.frame.locator(PASS_SELECTOR).fill(PASS);
    await pause(500);
    await web.frame.getByRole('button', {name: /log ?in/i}).first().click();
  }
  await allow.waitFor({timeout: 120000});
  await web.syncAddress();
  await pause(4000);
  await allow.click();
  await term.waitFor(/Authenticated|success/i, {after: `claude mcp login ${MCP_NAME}`, timeout: 60000});
  await web.syncAddress();
  await pause(3000);

  await term.focus();
  await term.run(`clear && claude --allowedTools "${ALLOWED_TOOLS}"`);
  const screen = await term.waitFor(/trust this folder|for shortcuts|Try "/i, {timeout: 90000});
  if (/trust this folder/i.test(screen)) {
    // The trust dialog's default answer is "No, exit".
    await term.press('ArrowDown');
    await pause(400);
    await term.press('Enter');
  }
  await pause(2000);

  await term.type(PROMPT);
  await pause(600);
  await term.press('Enter');
  await term.waitFor(/for \d+s · done|· done \d/, {after: PROMPT.slice(0, 40), timeout: 300000});
  await pause(7000);
  console.log((await term.text()).slice(-2500));
} finally {
  const video = await stage.stop();
  if (video) console.log(`VIDEO=${video}`);
}
