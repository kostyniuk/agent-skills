(() => {
  if (window.__mrCursor) return;
  window.__mrCursor = true;
  const SIZE = 22;
  const cursor = document.createElement('div');
  cursor.innerHTML = `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 24 24"><path d="M5 3l14 8-6 2-3 7z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  Object.assign(cursor.style, {
    position: 'fixed', left: '0', top: '0', width: `${SIZE}px`, height: `${SIZE}px`,
    pointerEvents: 'none', zIndex: '2147483647', transition: 'transform 120ms ease-out',
    transform: 'translate(-100px,-100px)', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.5))',
  });
  const ring = document.createElement('div');
  Object.assign(ring.style, {
    position: 'fixed', left: '0', top: '0', width: '36px', height: '36px', borderRadius: '50%',
    border: '3px solid #D97757', pointerEvents: 'none', zIndex: '2147483646', opacity: '0',
    transform: 'translate(-100px,-100px) scale(.3)', transition: 'transform 300ms ease-out, opacity 300ms ease-out',
  });
  const mount = () => document.documentElement.append(ring, cursor);
  document.documentElement ? mount() : document.addEventListener('DOMContentLoaded', mount);

  document.addEventListener('mousemove', (e) => {
    cursor.style.opacity = '1';
    cursor.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
  }, true);
  document.addEventListener('mousedown', (e) => {
    ring.style.transition = 'none';
    ring.style.opacity = '0.9';
    ring.style.transform = `translate(${e.clientX - 18}px,${e.clientY - 18}px) scale(.3)`;
    requestAnimationFrame(() => {
      ring.style.transition = 'transform 350ms ease-out, opacity 350ms ease-out';
      ring.style.opacity = '0';
      ring.style.transform = `translate(${e.clientX - 18}px,${e.clientY - 18}px) scale(1.4)`;
    });
  }, true);
  // Pointer entering a child iframe stops events in this document; the iframe draws its own cursor.
  document.addEventListener('mouseover', (e) => {
    if (e.target?.tagName === 'IFRAME') cursor.style.opacity = '0';
  }, true);
})();
