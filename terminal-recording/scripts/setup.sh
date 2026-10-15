#!/usr/bin/env bash
# Installs what the stage needs without sudo: a static ttyd binary and Playwright's Chromium.
set -euo pipefail

TTYD_VERSION="${TTYD_VERSION:-1.7.7}"
BIN="${TTYD_BIN:-$HOME/.local/bin/ttyd}"
cd "$(dirname "$0")"

if [ ! -x "$BIN" ]; then
  mkdir -p "$(dirname "$BIN")"
  curl -sSL -o "$BIN" "https://github.com/tsl0922/ttyd/releases/download/${TTYD_VERSION}/ttyd.$(uname -m)"
  chmod +x "$BIN"
fi
"$BIN" --version

npm install --no-audit --no-fund --silent
npx playwright install chromium
echo "ready: node examples/<flow>.mjs (RECORD=1 to record)"
