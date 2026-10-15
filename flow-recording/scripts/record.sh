#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
[[ -d node_modules/playwright ]] || npm install --silent --no-audit --no-fund playwright >/dev/null
MR_RECORDINGS_DIR=${MR_RECORDINGS_DIR:-$HOME/mr-recordings} node record-template.mjs "${1:-recording}"
