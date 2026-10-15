#!/usr/bin/env node
// usage: node login.mjs --env <env> --app <appId> [--user <userId>] [--path /some-page] [--cdp 9333] [--state <file>]
// config: $APP_LOGIN_CONFIG (JSON, see app-login.example.json), each key overridable by an APP_LOGIN_* env var
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DEFAULTS = {
  envs: {},
  adminLoginPath: null,
  usersPath: null,
  loginAsPath: null,
  adminConsolePath: '/admin',
  adminTokenFields: ['token', 'authToken', 'accessToken'],
  loginAsTokenField: 'token',
  authHeader: 'authorization',
  authScheme: '',
  userAppField: 'appId',
  userRoleField: 'type',
  adminRoleValue: 'admin',
  tokenAppClaim: 'appId',
  storageKey: 'accessToken',
  cookieName: 'authToken',
  credsDir: '~/.config/app-login',
  loginPagePath: '/login',
  defaultPath: '/',
};
const ENV_VARS = {
  envs: 'APP_LOGIN_ENVS',
  adminLoginPath: 'APP_LOGIN_ADMIN_LOGIN_PATH',
  usersPath: 'APP_LOGIN_USERS_PATH',
  loginAsPath: 'APP_LOGIN_LOGIN_AS_PATH',
  adminConsolePath: 'APP_LOGIN_ADMIN_CONSOLE_PATH',
  adminTokenFields: 'APP_LOGIN_ADMIN_TOKEN_FIELDS',
  loginAsTokenField: 'APP_LOGIN_TOKEN_FIELD',
  authHeader: 'APP_LOGIN_AUTH_HEADER',
  authScheme: 'APP_LOGIN_AUTH_SCHEME',
  userAppField: 'APP_LOGIN_USER_APP_FIELD',
  userRoleField: 'APP_LOGIN_USER_ROLE_FIELD',
  adminRoleValue: 'APP_LOGIN_ADMIN_ROLE',
  tokenAppClaim: 'APP_LOGIN_APP_CLAIM',
  storageKey: 'APP_LOGIN_STORAGE_KEY',
  cookieName: 'APP_LOGIN_COOKIE',
  credsDir: 'APP_LOGIN_CREDS_DIR',
  loginPagePath: 'APP_LOGIN_LOGIN_PAGE_PATH',
  defaultPath: 'APP_LOGIN_DEFAULT_PATH',
};

const parseEnvValue = (key, raw) => {
  if (key === 'envs') {
    return raw.trim().startsWith('{')
      ? JSON.parse(raw)
      : Object.fromEntries(raw.split(',').map(pair => pair.split('=').map(s => s.trim())));
  }
  if (key === 'adminTokenFields') return raw.split(',').map(s => s.trim());
  return raw;
};

const loadConfig = () => {
  const file = process.env.APP_LOGIN_CONFIG;
  const fromFile = file ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const fromEnv = Object.fromEntries(
    Object.entries(ENV_VARS)
      .filter(([, name]) => process.env[name] !== undefined)
      .map(([key, name]) => [key, parseEnvValue(key, process.env[name])]),
  );
  return {...DEFAULTS, ...fromFile, ...fromEnv};
};

const config = loadConfig();
const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map(s => s.trim().split(/\s+/)).map(([k, v]) => [k, v ?? true]));
const domain = config.envs[args.env];
const missing = ['adminLoginPath', 'usersPath', 'loginAsPath'].filter(k => !config[k]);
if (missing.length) {
  console.error(`config missing: ${missing.join(', ')} (set APP_LOGIN_CONFIG or the APP_LOGIN_* env vars)`);
  process.exit(2);
}
if (!domain || !args.app) {
  console.error(`need --env ${Object.keys(config.envs).join('|') || '<env>'} and --app <appId> (other envs need approval first)`);
  process.exit(2);
}
const cdpPort = args.cdp ?? process.env.CDP_PORT ?? 9333;
const host = new URL(domain).host;
const credsDir = config.credsDir.replace(/^~(?=$|\/)/, os.homedir());
const credsFile = path.join(credsDir, `${args.env}.json`);

const cdp = async (wsUrl) => {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = {};
  ws.onmessage = ({data}) => { const m = JSON.parse(data); if (m.id && pending[m.id]) { pending[m.id](m.result ?? m.error); delete pending[m.id]; } };
  await new Promise(r => ws.onopen = r);
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({id: i, method, params})); });
  return {send, close: () => ws.close()};
};

const adminTokenFromCreds = async () => {
  if (!fs.existsSync(credsFile)) return null;
  const {login, password} = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
  const res = await fetch(`${domain}${config.adminLoginPath}`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({login, password})});
  if (!res.ok) throw new Error(`admin login failed: HTTP ${res.status}`);
  const body = await res.json();
  return config.adminTokenFields.map(field => body[field]).find(Boolean);
};

const adminTokenFromBrowser = async () => {
  const version = await fetch(`http://127.0.0.1:${cdpPort}/json/version`).then(r => r.json()).catch(() => null);
  if (!version) return null;
  const browser = await cdp(version.webSocketDebuggerUrl);
  const {cookies = []} = await browser.send('Storage.getCookies');
  browser.close();
  const cookie = cookies.find(c => c.name === config.cookieName && c.domain.endsWith(host));
  return cookie && decodeURIComponent(cookie.value);
};

const adminToken = (await adminTokenFromCreds()) ?? (await adminTokenFromBrowser());
if (!adminToken) {
  console.error(`NO_ADMIN_SESSION: add ${credsFile} or ask a human to log in to ${domain}${config.adminConsolePath} in the CDP Chrome (port ${cdpPort})`);
  process.exit(3);
}

const authValue = config.authScheme ? `${config.authScheme} ${adminToken}` : adminToken;
const api = async (method, url) => {
  const res = await fetch(`${domain}${url}`, {method, headers: {[config.authHeader]: authValue}});
  if (res.status === 401) { console.error('NO_ADMIN_SESSION: admin token expired'); process.exit(3); }
  if (!res.ok) throw new Error(`${method} ${url}: HTTP ${res.status}`);
  return res.json();
};

let userId = args.user;
if (!userId) {
  const users = (await api('GET', config.usersPath)).filter(u => String(u[config.userAppField]) === String(args.app));
  const user = users.find(u => u[config.userRoleField] === config.adminRoleValue) ?? users[0];
  if (!user) { console.error(`no users for app ${args.app} on ${args.env}`); process.exit(4); }
  userId = user.id;
}
const token = (await api('POST', config.loginAsPath.replace('{userId}', encodeURIComponent(userId))))[config.loginAsTokenField];
const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
const appClaim = claims[config.tokenAppClaim];
if (String(appClaim) !== String(args.app)) { console.error(`token is for app ${appClaim}, not ${args.app}`); process.exit(5); }

if (args.state) {
  fs.writeFileSync(args.state, JSON.stringify({cookies: [], origins: [{origin: domain, localStorage: [{name: config.storageKey, value: token}]}]}), {mode: 0o600});
  console.log(`STATE ${args.state}`);
}

const target = `${domain}${args.path ?? config.defaultPath}`;
const version = await fetch(`http://127.0.0.1:${cdpPort}/json/version`).then(r => r.json()).catch(() => null);
if (version) {
  const created = await fetch(`http://127.0.0.1:${cdpPort}/json/new?${domain}${config.loginPagePath}`, {method: 'PUT'}).then(r => r.json());
  const tab = await cdp(created.webSocketDebuggerUrl);
  await new Promise(r => setTimeout(r, 2500));
  await tab.send('Runtime.evaluate', {expression: `localStorage.setItem(${JSON.stringify(config.storageKey)}, ${JSON.stringify(token)})`});
  await tab.send('Page.navigate', {url: target});
  tab.close();
  console.log(`TAB ${created.id} ${target}`);
}
console.log(`OK env=${args.env} app=${appClaim} user=${userId} exp=${claims.exp ? new Date(claims.exp * 1000).toISOString() : 'none'}`);
process.exit(0);
