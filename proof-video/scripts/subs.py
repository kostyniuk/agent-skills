import json, textwrap
cues = json.load(open("subs/cues.json"))
import os
# Optional subs-replace.json: [["spoken form", "shown form"], ...], e.g. ["status two hundred", "status 200"].
REPL = json.load(open("subs-replace.json")) if os.path.exists("subs-replace.json") else []
def disp(t):
    for a, b in REPL: t = t.replace(a, b)
    return t
def ts(x):
    ms = int(round(x * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"
def wrap(t, w=46):
    lines = textwrap.wrap(t, w)
    if len(lines) > 2: lines = textwrap.wrap(t, (len(t) + 1) // 2 + 6)
    return "\n".join(lines)
with open("subs/en.srt", "w") as f:
    for i, c in enumerate(cues, 1): f.write(f"{i}\n{ts(c['start'])} --> {ts(c['end'])}\n{wrap(disp(c['en']))}\n\n")
with open("subs/en.vtt", "w") as f:
    f.write("WEBVTT\n\n")
    for c in cues: f.write(f"{ts(c['start']).replace(',', '.')} --> {ts(c['end']).replace(',', '.')}\n{wrap(disp(c['en']))}\n\n")
print("cues", len(cues))
