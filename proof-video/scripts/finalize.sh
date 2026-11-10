#!/usr/bin/env bash
# Joins the segments with the narration, then writes the deliverables to out/:
# <NAME>.mp4 (switchable English subtitles), <NAME>_captions-en.mp4 (burned in), .srt and .vtt.
# Env: NAME (file name), TITLE (video title metadata).
set -euo pipefail
cd "$(dirname "$0")/.."
NAME=${NAME:-proof-video}; TITLE=${TITLE:-$NAME}
python3 scripts/compose.py
node scripts/captions.mjs en
mkdir -p out
V=(-c:v libx264 -preset slow -crf 20 -tune animation -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -metadata:s:a:0 language=eng)
ffmpeg -v error -y -i build/video_only.mp4 -i build/narration.m4a -i subs/en.srt -map 0:v -map 1:a -map 2 "${V[@]}" -c:s mov_text \
  -metadata title="$TITLE" -metadata:s:s:0 language=eng -metadata:s:s:0 title=English -disposition:s:0 default \
  "out/$NAME.mp4" &
ffmpeg -v error -y -i build/video_only.mp4 -i build/captions_en.mov -i build/narration.m4a \
  -filter_complex "[0:v][1:v]overlay=0:0:shortest=1[v]" -map "[v]" -map 2:a "${V[@]}" "out/${NAME}_captions-en.mp4" &
wait
cp subs/en.srt "out/$NAME.en.srt"; cp subs/en.vtt "out/$NAME.en.vtt"
for f in out/*.mp4; do echo "$f $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")s $(du -h "$f" | cut -f1)"; done
