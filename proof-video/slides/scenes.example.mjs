// One scene per slide segment in script.json. An element appears when the narration reaches its data-at
// phrase (verbatim substring of the segment's text), or data-t seconds into the scene.
const glyphs = ['○', '●', '↵', '↖', '↗', '⌘', '■', '·', '◦'];
export const scenes = {
  a01_intro: {
    noFrame: true,
    fx: { tokens: ['REQUEST', 'RESPONSE', 'SUCCEEDED', 'FAILED', 'actor', 'target', 'audit'], glyphs, count: 60, seed: 17 },
    html: `
  <div class="center headline" style="top:240px" data-t="0.6">Who changed that?</div>
  <div class="center" style="top:400px; font-size:32px; display:flex; justify-content:center; gap:22px">
    <span data-at="Our backend" class="lb acc">backend</span><span style="color:#9A9A97" data-at="calls three">→</span>
    <span data-at="three upstream" class="lb">service A</span><span data-at="three upstream" class="lb">service B</span><span data-at="three upstream" class="lb">service C</span>
  </div>
  <div class="center" style="top:500px; font-size:30px; color:#9A9A97" data-at="one shared login">one shared login · no idea who clicked</div>
  <div class="center" style="top:640px; font-size:36px; display:flex; justify-content:center; gap:22px">
    <span data-at="who did it" class="lb acc">who</span><span data-at="what they did" class="lb acc">what</span><span data-at="to what," class="lb acc">to what</span><span data-at="how it ended" class="lb acc">how it ended</span>
  </div>`,
  },
  a04_outro: {
    noFrame: true,
    fx: { strands: true, tokens: ['REQUEST', 'RESPONSE', 'who', 'what', 'target', 'outcome'], glyphs, count: 40, seed: 5 },
    html: `
  <div class="center headline" style="top:260px; font-size:84px" data-at="Every write">Every write recorded</div>
  <div class="center" style="top:420px; font-size:34px" data-at="never blocks"><span class="lb acc">never blocks the call</span></div>
  <div class="center headline" style="top:580px; font-size:64px" data-at="who changed that">“Who changed that?”</div>
  <div class="center" style="top:720px; font-size:34px" data-at="one query away"><span class="lb acc">one query away</span></div>`,
  },
};
