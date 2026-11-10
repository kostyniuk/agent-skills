#!/usr/bin/env bash
# Creates a proof-video project: scripts/, slides/, assets/fonts, bin/ (macOS input helpers), node deps.
# usage: scripts/setup.sh <project-dir>     (re-run safely; keeps your script.json and slides/scenes.mjs)
set -euo pipefail
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
P="${1:?usage: setup.sh <project-dir>}"
mkdir -p "$P"/{scripts,slides,assets/fonts,audio,build,subs,shots,out,bin}
cd "$P"
cp "$SKILL"/scripts/*.{py,mjs,js,sh,ts} scripts/ 2>/dev/null || true
cp "$SKILL"/scripts/*.example.json . 2>/dev/null || true
cp "$SKILL/slides/template.html" slides/
[ -f slides/scenes.mjs ] || cp "$SKILL/slides/scenes.example.mjs" slides/scenes.mjs
[ -f script.json ] || cp "$SKILL/script.example.json" script.json
[ -f package.json ] || echo '{ "name": "proof-video", "private": true, "type": "module" }' > package.json
npm install --silent --no-audit --no-fund playwright @fontsource/ibm-plex-mono @fontsource-variable/inter
npx --yes playwright install chromium >/dev/null
F=node_modules/@fontsource/ibm-plex-mono/files
for w in 400 500 600; do cp "$F/ibm-plex-mono-latin-$w-normal.woff2" assets/fonts/; done
cp node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2 assets/fonts/InterVariable.woff2
# The overlay is injected into every page, so it carries its font inline.
PLEX=$(base64 < assets/fonts/ibm-plex-mono-latin-500-normal.woff2 | tr -d '\n')
sed "s|__PLEX__|$PLEX|" scripts/overlay.js > build/overlay.built.js
if [ "$(uname)" = Darwin ]; then
  for t in click drag hscroll; do swiftc -O "$SKILL/scripts/macos/$t.swift" -o "bin/$t"; done
fi
command -v ffmpeg >/dev/null || echo "WARN: ffmpeg is required (brew install ffmpeg)"
echo "ready: $P"
