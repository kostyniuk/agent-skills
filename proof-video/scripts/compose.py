import json, subprocess
tl = json.load(open("build/timeline.json")); segs = tl["segments"]; total = tl["total"]
run = lambda a: subprocess.run(a, check=True)
dur = lambda f: float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f]))
parts = [f"build/scene_{s['id']}.mp4" if s["visual"] == "slide" else f"build/seg_{s['id']}.mp4" for s in segs]
for s, p in zip(segs, parts):
    d = dur(p)
    if abs(d - s["win"]) > 0.08: print("WARN duration", p, round(d, 3), "expected", s["win"])
# Re-encode through the concat filter so mixed sources join cleanly, with 0.25s fades between segments.
inp = []; flt = []
for k, (s, p) in enumerate(zip(segs, parts)):
    inp += ["-i", p]; w = s["win"]
    flt.append(f"[{k}:v]trim=0:{w:.3f},setpts=PTS-STARTPTS,fps=30,scale=1920:1080,format=yuv420p,fade=t=in:st=0:d=0.25,fade=t=out:st={w-0.25:.3f}:d=0.25[v{k}]")
flt.append("".join(f"[v{k}]" for k in range(len(parts))) + f"concat=n={len(parts)}:v=1:a=0[out]")
run(["ffmpeg","-loglevel","error","-y",*inp,"-filter_complex",";".join(flt),"-map","[out]","-c:v","libx264","-crf","17","-preset","medium","build/video_only.mp4"])
print("video", round(dur("build/video_only.mp4"), 2), "expected", total)
inputs = []; flt = []
for k, s in enumerate(segs):
    inputs += ["-i", f"audio/{s['id']}.mp3"]; ms = int(round(s["start"] * 1000))
    flt.append(f"[{k}:a]aresample=48000,adelay={ms}|{ms}[a{k}]")
flt.append("".join(f"[a{k}]" for k in range(len(segs))) + f"amix=inputs={len(segs)}:normalize=0,apad,atrim=0:{total:.3f},loudnorm=I=-16:TP=-1.5:LRA=11[out]")
run(["ffmpeg","-loglevel","error","-y",*inputs,"-filter_complex",";".join(flt),"-map","[out]","-ar","48000","-c:a","aac","-b:a","192k","build/narration.m4a"])
print("audio", round(dur("build/narration.m4a"), 2))
