// Injected with page.addScriptTag({ path }). Then, in page.evaluate:
//   window.__annotate([{ el, label, pos: "below" | "above" }], "banner text")
// `el` is any element, or { getBoundingClientRect } to box a region (e.g. a whole table column).
// A mark without `label` only draws the box. Call again to replace all marks; window.__annotate([]) clears them.
window.__annotate = (marks, banner) => {
  document.querySelectorAll(".__ann").forEach((n) => n.remove());
  const add = (style, text) => {
    const d = document.createElement("div");
    d.className = "__ann";
    Object.assign(d.style, { position: "fixed", zIndex: 2147483647, pointerEvents: "none" }, style);
    if (text) d.textContent = text;
    document.body.appendChild(d);
    return d;
  };
  for (const { el, label, pos = "below" } of marks) {
    if (!el) continue;
    const r = el.getBoundingClientRect();
    add({ left: r.left - 4 + "px", top: r.top - 4 + "px", width: r.width + 8 + "px", height: r.height + 8 + "px", border: "3px solid #e11d48", borderRadius: "6px", boxShadow: "0 0 0 4px rgba(225,29,72,.18)" });
    if (label) {
      const l = add({ left: Math.max(8, r.left) + "px", background: "#e11d48", color: "#fff", font: "600 13px/1.35 ui-sans-serif,system-ui", padding: "6px 9px", borderRadius: "6px", maxWidth: "420px", whiteSpace: "pre-wrap", boxShadow: "0 4px 12px rgba(0,0,0,.25)" }, label);
      const h = l.getBoundingClientRect().height;
      l.style.top = (pos === "above" ? r.top - h - 12 : r.bottom + 10) + "px";
      if (l.getBoundingClientRect().right > innerWidth - 8) l.style.left = innerWidth - 8 - l.getBoundingClientRect().width + "px";
    }
  }
  if (banner) add({ left: "50%", bottom: "14px", transform: "translateX(-50%)", background: "#111827", color: "#f9fafb", font: "500 13px/1.45 ui-monospace,Menlo,monospace", padding: "8px 14px", borderRadius: "8px", maxWidth: "1100px", whiteSpace: "pre-wrap", boxShadow: "0 6px 18px rgba(0,0,0,.35)" }, banner);
  return marks.filter((m) => m.el).length;
};
