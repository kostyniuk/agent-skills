import json, sys, base64, urllib.request, os
KEY = open(os.environ["XI_KEY_FILE"]).read().strip()
VOICE = os.environ.get("VOICE", "Xb7hH8MSUJpSbSDYk0k2")  # Alice
MODEL = os.environ.get("MODEL", "eleven_v4_turbo")
segs = json.load(open("script.json"))
only = set(sys.argv[1:])
prev = None
for i, s in enumerate(segs):
    out = f"audio/{s['id']}.mp3"
    if (only and s["id"] not in only) or (not only and os.path.exists(out)):
        prev = s["text"]; continue
    body = {"text": s["text"], "model_id": MODEL,
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "style": 0.15, "use_speaker_boost": True}}
    if prev: body["previous_text"] = prev
    if i + 1 < len(segs): body["next_text"] = segs[i+1]["text"]
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128",
        data=json.dumps(body).encode(), headers={"xi-api-key": KEY, "Content-Type": "application/json"})
    try:
        r = json.load(urllib.request.urlopen(req, timeout=180))
    except urllib.error.HTTPError as e:
        print(s["id"], "HTTP", e.code, e.read()[:400]); sys.exit(1)
    open(out, "wb").write(base64.b64decode(r["audio_base64"]))
    json.dump(r.get("normalized_alignment") or r["alignment"], open(f"audio/{s['id']}.json", "w"))
    print("ok", s["id"], len(s["text"]))
    prev = s["text"]
