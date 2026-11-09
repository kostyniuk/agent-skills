import json, subprocess
segs = json.load(open("script.json"))
t = 0; tl = []
for s in segs:
    dur = float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f"audio/{s['id']}.mp3"]))
    # Silence before and after the narration; set "lead"/"tail" on a segment to override.
    lead = s.get("lead", 0.8); tail = s.get("tail", 1.1)
    win = lead + dur + tail
    tl.append({"id": s["id"], "visual": s["visual"], "title": s["title"], "win_start": round(t,3), "start": round(t+lead,3), "lead": lead, "dur": dur, "win": round(win,3), "text": s["text"]})
    t += win
json.dump({"segments": tl, "total": round(t,3)}, open("build/timeline.json","w"), indent=1)

def cues_for(s):
    al = json.load(open(f"audio/{s['id']}.json"))
    chars = "".join(al["characters"]); st = al["character_start_times_seconds"]; en = al["character_end_times_seconds"]
    out = []; i = 0; n = len(chars)
    while i < n:
        while i < n and chars[i] == " ": i += 1
        if i >= n: break
        j = i; best = None
        while j < n:
            c = chars[j]
            if c in ".!?" and (j+1 == n or chars[j+1] == " "): best = j; break
            if c in ",:;" and j - i > 40: best = j
            if j - i > 84 and best is not None: break
            j += 1
        end = best if best is not None else min(j, n-1)
        if best is None and j < n: end = chars.rfind(" ", i, j) - 1
        out.append([st[i] + s["start"], en[end] + s["start"], chars[i:end+1].strip(), s["id"]])
        i = end + 1
    return out
cues = []
for s in tl: cues += cues_for(s)
for k, c in enumerate(cues):
    nxt = cues[k+1][0] if k+1 < len(cues) else c[1] + 1
    c[1] = min(max(c[1] + 0.25, c[0] + 1.0), nxt - 0.05)
json.dump([{"start": round(a,3), "end": round(b,3), "en": t, "seg": sid} for a,b,t,sid in cues], open("subs/cues.json","w"), indent=1)
print("total", round(t,1), "s; cues", len(cues), "max len", max(len(c[2]) for c in cues))
