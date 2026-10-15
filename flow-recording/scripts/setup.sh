#!/usr/bin/env bash
set -euo pipefail
SKILL_DIR=$(cd "$(dirname "$0")/.." && pwd)
OUT=${MR_RECORDINGS_DIR:-$HOME/mr-recordings}
mkdir -p "$OUT" "$SKILL_DIR/config"
sed -e "s#__OUT__#$OUT#g" -e "s#__SKILL__#$SKILL_DIR#g" "$SKILL_DIR/config/playwright-mcp.config.template.json" > "$SKILL_DIR/config/playwright-mcp.config.json"

claude mcp remove playwright -s user >/dev/null 2>&1 || true
claude mcp add playwright -s user -- npx -y @playwright/mcp@latest --config "$SKILL_DIR/config/playwright-mcp.config.json"
npx -y playwright@latest install chromium

cd "$SKILL_DIR/scripts" && npm install --silent --no-audit --no-fund playwright >/dev/null
echo "recordings dir: $OUT"
# `glab auth status` reports "Invalid token" for OAuth logins that work fine; probe the API instead.
if glab api user >/dev/null 2>&1; then echo "gitlab auth: ok"; else echo "gitlab auth: FAILED, run: glab auth login"; fi
echo "Restart Claude Code so the playwright MCP tools load."
