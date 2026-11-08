// Injected with page.addScriptTag({ path }). Then, in page.evaluate:
//   window.__annotate([{ el, label, pos: "below" | "above" }], banner, { accent, dim })
// `el` is any element, or { getBoundingClientRect } to box a region (e.g. a whole table column).
// Each mark gets a numbered badge; its label card carries the same number.
// A mark without `label` only draws the box and badge.
// `banner` is a string; lines starting with GET/POST/PUT/PATCH/DELETE get a method chip.
// Options: accent (default indigo "#4f46e5"), dim (default true: softly darkens everything outside the marks).
// Call again to replace everything; window.__annotate([]) clears it.
window.__annotate = (marks, banner, { accent = "#4f46e5", dim = true } = {}) => {
  document.querySelectorAll(".__ann").forEach((n) => n.remove());
  const font = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif";
  const add = (style, text, tag = "div") => {
    const d = document.createElement(tag);
    d.className = "__ann";
    Object.assign(d.style, { position: "fixed", zIndex: 2147483647, pointerEvents: "none", boxSizing: "border-box" }, style);
    if (text != null) d.textContent = text;
    document.body.appendChild(d);
    return d;
  };
  const badge = (n, style) =>
    add({ width: "24px", height: "24px", borderRadius: "999px", background: accent, color: "#fff", font: `700 12px/24px ${font}`, textAlign: "center", boxShadow: "0 0 0 3px #fff, 0 4px 10px rgba(15,23,42,.25)", ...style }, String(n));

  const boxes = marks.filter((m) => m.el).map((m) => ({ ...m, r: m.el.getBoundingClientRect() }));

  if (dim && boxes.length) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "__ann");
    svg.setAttribute("width", innerWidth);
    svg.setAttribute("height", innerHeight);
    Object.assign(svg.style, { position: "fixed", inset: "0", zIndex: 2147483646, pointerEvents: "none" });
    const holes = boxes.map(({ r }) => `<rect x="${r.left - 6}" y="${r.top - 6}" width="${r.width + 12}" height="${r.height + 12}" rx="12" fill="black"/>`).join("");
    svg.innerHTML = `<defs><mask id="__ann-mask"><rect width="100%" height="100%" fill="white"/>${holes}</mask></defs><rect width="100%" height="100%" fill="rgba(15,23,42,.28)" mask="url(#__ann-mask)"/>`;
    document.body.appendChild(svg);
  }

  boxes.forEach(({ r, label, pos = "below" }, i) => {
    const n = i + 1;
    add({ left: r.left - 6 + "px", top: r.top - 6 + "px", width: r.width + 12 + "px", height: r.height + 12 + "px", border: `2px solid ${accent}`, borderRadius: "12px", boxShadow: `0 0 0 4px ${accent}26` });
    badge(n, { left: Math.max(4, r.left - 16) + "px", top: Math.max(4, r.top - 16) + "px" });
    if (!label) return;
    const card = add({ left: Math.max(12, r.left) + "px", top: "0px", display: "flex", gap: "10px", alignItems: "flex-start", background: "#fff", color: "#0f172a", font: `500 13px/1.45 ${font}`, padding: "10px 14px 10px 10px", borderRadius: "12px", maxWidth: "440px", border: "1px solid rgba(15,23,42,.08)", boxShadow: "0 12px 28px rgba(15,23,42,.18), 0 2px 6px rgba(15,23,42,.08)" });
    const num = document.createElement("div");
    Object.assign(num.style, { flex: "0 0 20px", height: "20px", borderRadius: "999px", background: accent, color: "#fff", font: `700 11px/20px ${font}`, textAlign: "center", marginTop: "0px" });
    num.textContent = n;
    const text = document.createElement("div");
    Object.assign(text.style, { whiteSpace: "pre-wrap" });
    text.textContent = label;
    card.append(num, text);
    const c = card.getBoundingClientRect();
    let top = pos === "above" ? r.top - c.height - 16 : r.bottom + 16;
    if (top + c.height > innerHeight - 8 || top < 8) top = pos === "above" ? r.bottom + 16 : r.top - c.height - 16;
    card.style.top = Math.max(8, Math.min(top, innerHeight - c.height - 8)) + "px";
    if (c.right > innerWidth - 12) card.style.left = innerWidth - 12 - c.width + "px";
  });

  if (banner) {
    const b = add({ left: "50%", bottom: "16px", transform: "translateX(-50%)", background: "rgba(15,23,42,.92)", backdropFilter: "blur(8px)", color: "#e2e8f0", font: `500 12.5px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace`, padding: "10px 16px", borderRadius: "14px", maxWidth: "1100px", border: "1px solid rgba(255,255,255,.08)", boxShadow: "0 16px 40px rgba(15,23,42,.35)", display: "grid", gap: "4px" });
    const colors = { GET: "#10b981", POST: "#f59e0b", PUT: "#3b82f6", PATCH: "#8b5cf6", DELETE: "#ef4444" };
    for (const line of String(banner).split("\n")) {
      const row = document.createElement("div");
      Object.assign(row.style, { whiteSpace: "pre-wrap", display: "flex", gap: "8px", alignItems: "baseline" });
      const m = line.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(.*)$/);
      if (m) {
        const chip = document.createElement("span");
        Object.assign(chip.style, { background: colors[m[1]] + "26", color: colors[m[1]], font: `700 11px/1.6 ui-monospace,Menlo,monospace`, padding: "0 6px", borderRadius: "6px", flex: "none" });
        chip.textContent = m[1];
        const rest = document.createElement("span");
        rest.textContent = m[2];
        row.append(chip, rest);
      } else {
        row.textContent = line;
        row.style.color = "#94a3b8";
      }
      b.appendChild(row);
    }
  }
  return boxes.length;
};
