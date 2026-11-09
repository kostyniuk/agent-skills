# Records the database segment: drives a desktop DB client (built for DataGrip on macOS) while
# `screencapture -v` films its window, firing each action on its narration phrase.
# usage: python3 scripts/record-db.py db-segment.json   (see db-segment.example.json; points are screen points)
import json, subprocess, sys, time, os
cfg = json.load(open(sys.argv[1]))
BIN = os.path.join(os.getcwd(), "bin")
tl = json.load(open("build/timeline.json")); seg = next(s for s in tl["segments"] if s["id"] == cfg["segment"])
al = json.load(open(f"audio/{seg['id']}.json")); chars = "".join(al["characters"])
def at(phrase):
    i = chars.find(phrase)
    if i < 0: raise SystemExit(f"{seg['id']}: phrase not found: {phrase}")
    return seg["lead"] + al["character_start_times_seconds"][i]
sh = lambda *a: subprocess.run([str(x) for x in a], check=True)
osa = lambda s: sh("osascript", "-e", s)
key = lambda k, mods="": osa(f'tell application "System Events" to {k}' + (f" using {{{mods}}}" if mods else ""))
click = lambda p: sh(f"{BIN}/click", p[0], p[1])
app, w = cfg.get("app", "DataGrip"), cfg["window"]
# Off camera: size the window to 16:9, paste the query, close the previous result tab.
osa(f'tell application "{app}" to activate'); time.sleep(0.5)
osa(f'tell application "System Events" to tell process "{app}" to set position of window 1 to {{{w["x"]}, {w["y"]}}}')
osa(f'tell application "System Events" to tell process "{app}" to set size of window 1 to {{{w["w"]}, {w["h"]}}}'); time.sleep(0.8)
clip = subprocess.run(["pbpaste"], capture_output=True).stdout
subprocess.run(["pbcopy"], input=cfg["query"].encode())
if cfg.get("close_result_tab"): click(cfg["close_result_tab"]); time.sleep(0.4)
click(cfg["editor"]); time.sleep(0.3)
key('keystroke "a"', "command down"); key('keystroke "v"', "command down"); time.sleep(0.6)
key("key code 126", "command down"); key("key code 123", "command down"); time.sleep(0.4)
win = seg["win"]
rec = subprocess.Popen(["screencapture", "-v", "-C", "-x", "-V", str(int(win) + 2), f"-R{w['x']},{w['y']},{w['w']},{w['h']}", "build/rec_db.mov"])
t0 = time.time() + 0.25
def T(s): time.sleep(max(0, t0 + s - time.time()))
T(at(cfg["run_at"])); key("key code 36", "command down")
for beat in cfg["scroll_beats"]:
    T(at(beat["at"])); sh(f"{BIN}/hscroll", cfg["grid"][0], cfg["grid"][1], beat["px"], 28)
rec.wait()
subprocess.run(["pbcopy"], input=clip)
sh("ffmpeg", "-loglevel", "error", "-y", "-ss", "0.25", "-i", "build/rec_db.mov", "-t", f"{win:.3f}", "-vf", "fps=30,scale=1920:1080,format=yuv420p", "-c:v", "libx264", "-crf", "17", f"build/seg_{seg['id']}.mp4")
print("db segment", seg["id"], win)
