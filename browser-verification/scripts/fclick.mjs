// Like click.mjs, but the expression runs inside the first same-origin iframe (`d` = its document).
import {connect, realClick} from './_tab.mjs';
const [,, sel, expr] = process.argv;
const {ws, send} = await connect(sel);
await send('Page.bringToFront');
const r = await send('Runtime.evaluate', {expression: `(()=>{const f=[...document.querySelectorAll('iframe')].find(f=>{try{return f.contentDocument&&f.src}catch{return false}});const d=f.contentDocument;const el=(${expr});if(!el)return null;el.scrollIntoView({block:'center'});const b=el.getBoundingClientRect(),o=f.getBoundingClientRect();return [o.x+b.x+b.width/2,o.y+b.y+b.height/2]})()`, returnByValue: true});
const v = r.result?.value;
if (!v) { console.log('NOT FOUND'); process.exit(2); }
const [x, y] = v;
await realClick(send, x, y);
console.log('clicked', x, y); ws.close(); process.exit(0);
