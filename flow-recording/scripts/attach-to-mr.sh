#!/usr/bin/env bash
set -euo pipefail
# GitLab only. GitHub has no uploads API for PR comments: attach through the web UI or link a hosted file.
PROJECT=${1:?project path or id}; IID=${2:?mr iid}; FILE=${3:?webm file}; INTRO=${4:-"Recording of the change:"}
HOST=${GITLAB_HOST:-gitlab.com}

if [[ -n "${GITLAB_TOKEN:-}" ]]; then
  AUTH="PRIVATE-TOKEN: $GITLAB_TOKEN"
else
  TOKEN=$(glab config get token --host "$HOST")
  if grep -qE 'is_oauth2: *"?true' ~/.config/glab-cli/config.yml 2>/dev/null; then
    AUTH="Authorization: Bearer $TOKEN"
  else
    AUTH="PRIVATE-TOKEN: $TOKEN"
  fi
fi

ENC=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1],safe=''))" "$PROJECT")
MD=$(curl -sf -H "$AUTH" -F "file=@$FILE" "https://$HOST/api/v4/projects/$ENC/uploads" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['markdown'])")
NOTE_ID=$(curl -sf -H "$AUTH" -X POST "https://$HOST/api/v4/projects/$ENC/merge_requests/$IID/notes" \
  --data-urlencode "body=$INTRO"$'\n\n'"$MD" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
MR_URL=$(curl -sf -H "$AUTH" "https://$HOST/api/v4/projects/$ENC/merge_requests/$IID" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['web_url'])")

echo "note $NOTE_ID"
echo "$MD"
# Deep link to the note. This is what goes in the tracker comment - it renders the video inline for
# anyone with project read access, unlike the raw upload URL which is browser-session authenticated.
echo "NOTE_URL=${MR_URL}#note_${NOTE_ID}"
