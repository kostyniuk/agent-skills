(() => {
  if (window.__ov) return; window.__ov = true;
  const mount = () => {
    const st = document.createElement('style');
    st.textContent = `
    @font-face { font-family: PlexOv; src: url(data:font/woff2;base64,__PLEX__) format("woff2"); }
    #__cur { position: fixed; left: 0; top: 0; width: 26px; height: 26px; pointer-events: none; z-index: 2147483647; transform: translate(-100px,-100px); filter: drop-shadow(0 2px 3px rgba(0,0,0,.45)); }
    #__ring { position: fixed; left: 0; top: 0; width: 44px; height: 44px; border-radius: 50%; border: 3px solid #4B3BFF; pointer-events: none; z-index: 2147483646; opacity: 0; }
    #__co { position: fixed; right: 44px; bottom: 210px; z-index: 2147483645; display: flex; flex-direction: column; align-items: flex-end; gap: 10px; pointer-events: none; }
    .__c { font-family: PlexOv, monospace; font-size: 22px; display: flex; gap: 0; box-shadow: 0 18px 50px rgba(0,0,0,.35); transition: opacity .35s ease, transform .35s cubic-bezier(.2,.8,.2,1); }
    .__c .k { background: #4B3BFF; color: #fff; padding: 8px 18px; }
    .__c .v { background: #0B0B0C; color: #ECECEA; padding: 8px 20px; }
    .__hl { position: fixed; z-index: 2147483644; pointer-events: none; border: 3px solid #4B3BFF; box-shadow: 0 0 0 6px rgba(75,59,255,.18); transition: all .35s cubic-bezier(.2,.8,.2,1); opacity: 0; }`;
    document.documentElement.append(st);
    const cur = document.createElement('div'); cur.id = '__cur';
    cur.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2.5l15.5 9-6.6 1.9-3.4 7.1z" fill="#0B0B0C" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    const ring = document.createElement('div'); ring.id = '__ring';
    const co = document.createElement('div'); co.id = '__co';
    const hl = document.createElement('div'); hl.className = '__hl';
    document.documentElement.append(hl, co, ring, cur);
    const last = window.__lastXY || [-100, -100];
    cur.style.transform = `translate(${last[0]}px,${last[1]}px)`;
    document.addEventListener('mousemove', e => { window.__lastXY = [e.clientX, e.clientY]; cur.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; }, true);
    document.addEventListener('mousedown', e => {
      ring.style.transition = 'none'; ring.style.opacity = '1';
      ring.style.transform = `translate(${e.clientX - 22}px,${e.clientY - 22}px) scale(.3)`;
      requestAnimationFrame(() => requestAnimationFrame(() => { ring.style.transition = 'transform .45s ease-out, opacity .45s ease-out'; ring.style.opacity = '0'; ring.style.transform = `translate(${e.clientX - 22}px,${e.clientY - 22}px) scale(1.5)`; }));
    }, true);
    window.__callout = (k, v) => {
      const el = document.createElement('div'); el.className = '__c';
      el.innerHTML = `<span class="k">${k}</span>${v ? `<span class="v">${v}</span>` : ''}`;
      el.style.opacity = 0; el.style.transform = 'translateY(16px)';
      co.append(el);
      while (co.children.length > 3) co.firstChild.remove();
      requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = 1; el.style.transform = 'none'; }));
    };
    window.__clearCallouts = () => { for (const c of [...co.children]) { c.style.opacity = 0; setTimeout(() => c.remove(), 400); } };
    window.__box = (r) => { if (!r) { hl.style.opacity = 0; return; } Object.assign(hl.style, { left: r.x - 6 + 'px', top: r.y - 6 + 'px', width: r.width + 12 + 'px', height: r.height + 12 + 'px', opacity: 1 }); };
  };
  document.documentElement ? mount() : document.addEventListener('DOMContentLoaded', mount);
})();
