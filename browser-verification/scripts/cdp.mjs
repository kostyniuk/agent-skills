// usage: node cdp.mjs <tabId|urlSubstr> <eval|nav|text|shot|vp|net> [arg] [arg2]
import {connect} from './_tab.mjs';
const [,, sel, action, arg, arg2] = process.argv;
const {ws, send, onEvent} = await connect(sel);
const failed = [];
onEvent(m => { if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) failed.push(`${m.params.response.status} ${m.params.response.url}`); if (m.method === 'Runtime.exceptionThrown') failed.push(`EXC ${m.params.exceptionDetails.exception?.description?.split('\n')[0]}`); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', {expression: expr, awaitPromise: true, returnByValue: true}); return r.exceptionDetails ? 'EXC ' + JSON.stringify(r.exceptionDetails).slice(0,500) : r.result?.value; };
if (action === 'eval') console.log(JSON.stringify(await ev(arg), null, 1));
if (action === 'nav') { await send('Page.navigate', {url: arg}); await new Promise(r => setTimeout(r, +(arg2||6000))); console.log(await ev('location.href + " | " + document.title')); }
if (action === 'shot') { const s = await send('Page.captureScreenshot', arg2 ? {captureBeyondViewport: true} : {}); (await import('fs')).writeFileSync(arg, Buffer.from(s.data, 'base64')); console.log('saved', arg); }
if (action === 'text') console.log((await ev('document.body.innerText')).slice(0, +(arg||3000)));
if (action === 'vp') { await send('Emulation.setDeviceMetricsOverride', {width: +arg, height: +arg2, deviceScaleFactor: 1, mobile: false}); console.log('vp'); }
if (action === 'net') { await send('Network.enable'); await send('Runtime.enable'); if (arg2) await send('Page.reload'); await new Promise(r => setTimeout(r, +(arg||10000))); console.log(failed.length ? failed.join('\n') : 'NO_FAILURES'); }
ws.close(); process.exit(0);
