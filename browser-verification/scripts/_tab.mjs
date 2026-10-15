export const CDP = `http://${process.env.CDP_HOST ?? '127.0.0.1'}:${process.env.CDP_PORT ?? 9222}`;

export async function connect(sel) {
  const list = await (await fetch(`${CDP}/json/list`)).json();
  const t = list.find(t => t.type === 'page' && (t.id === sel || t.url.includes(sel)));
  if (!t) { console.log('no tab'); process.exit(1); }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pending = {}; const listeners = [];
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({id: i, method, params})); });
  ws.onmessage = ({data}) => { const m = JSON.parse(data); if (m.id && pending[m.id]) { pending[m.id](m.result ?? m.error); delete pending[m.id]; } listeners.forEach(l => l(m)); };
  await new Promise(r => ws.onopen = r);
  return {ws, send, onEvent: l => listeners.push(l)};
}

export async function realClick(send, x, y) {
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', {type, x, y, button: 'left', clickCount: 1});
}
