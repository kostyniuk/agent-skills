# Source me: `source jira.sh`. Needs JIRA_BASE (your Jira Cloud site URL), JIRA_EMAIL (your Atlassian login)
# and a token in ~/.config/jira-token (chmod 600; JIRA_TOKEN_FILE overrides the path).
# Every function prints an HTTP code (and an id where useful); none prints the token.
JIRA_TOKEN_FILE=${JIRA_TOKEN_FILE:-$HOME/.config/jira-token}
_jira_base() { printf '%s' "${JIRA_BASE:?set JIRA_BASE to your Jira site URL}"; }
_jira_auth() { printf '%s:%s' "${JIRA_EMAIL:?set JIRA_EMAIL}" "$(tr -d '\n' < "$JIRA_TOKEN_FILE")"; }
_jira_q() { [ -n "$JIRA_QUIET" ] && printf '?notifyUsers=false'; }

# jira_get <KEY> [fields] -> issue JSON (v2)
jira_get() { curl -s -u "$(_jira_auth)" "$(_jira_base)/rest/api/2/issue/$1?fields=${2:-summary,status,assignee,reporter,labels,fixVersions,comment}"; }

# jira_search '<jql>' [fields] -> JSON (paginate with nextPageToken)
jira_search() { curl -s -u "$(_jira_auth)" -G "$(_jira_base)/rest/api/3/search/jql" --data-urlencode "jql=$1" --data-urlencode "fields=${2:-summary,status,assignee,labels}" --data-urlencode maxResults=100; }

# jira_fields <KEY> '<json fields object>' -> http code. v2: a paragraph custom field accepts a plain string here, v3 rejects it.
jira_fields() { curl -s -o /dev/null -w "%{http_code}\n" -u "$(_jira_auth)" -H 'Content-Type: application/json' -X PUT --data "{\"fields\":$2}" "$(_jira_base)/rest/api/2/issue/$1$(_jira_q)"; }

# jira_labels <KEY> add|remove <label>...
jira_labels() {
  local key=$1 op=$2; shift 2
  local ops; ops=$(python3 -c 'import json,sys;print(json.dumps([{sys.argv[1]:l} for l in sys.argv[2:]]))' "$op" "$@")
  curl -s -o /dev/null -w "%{http_code}\n" -u "$(_jira_auth)" -H 'Content-Type: application/json' -X PUT --data "{\"update\":{\"labels\":$ops}}" "$(_jira_base)/rest/api/2/issue/$key$(_jira_q)"
}

# jira_assign <KEY> <accountId>
jira_assign() { curl -s -o /dev/null -w "%{http_code}\n" -u "$(_jira_auth)" -H 'Content-Type: application/json' -X PUT --data "{\"accountId\":\"$2\"}" "$(_jira_base)/rest/api/2/issue/$1/assignee"; }

# jira_transition <KEY> <transitionId> ['<json fields>']  e.g. Won't do: jira_transition K <id> '{"resolution":{"name":"Won'"'"'t Fix"}}'
jira_transition() { curl -s -o /dev/null -w "%{http_code}\n" -u "$(_jira_auth)" -H 'Content-Type: application/json' -X POST --data "{\"transition\":{\"id\":\"$2\"}${3:+,\"fields\":$3}}" "$(_jira_base)/rest/api/2/issue/$1/transitions"; }

# jira_attach <KEY> <file> -> http code (multipart, v3)
jira_attach() { curl -s -o /dev/null -w "%{http_code}\n" -u "$(_jira_auth)" -H 'X-Atlassian-Token: no-check' -F "file=@$2" "$(_jira_base)/rest/api/3/issue/$1/attachments"; }

# jira_comment <KEY> '<wiki markup>' -> "<http> <commentId>"
jira_comment() {
  python3 -c 'import json,sys;print(json.dumps({"body":sys.argv[1]}))' "$2" > /tmp/jc.$$.json
  curl -s -o /tmp/jco.$$.json -w "%{http_code} " -u "$(_jira_auth)" -H 'Content-Type: application/json' -X POST --data @/tmp/jc.$$.json "$(_jira_base)/rest/api/2/issue/$1/comment"
  python3 -c 'import json,sys;print(json.load(open(sys.argv[1])).get("id"))' /tmp/jco.$$.json; rm -f /tmp/jc.$$.json /tmp/jco.$$.json
}

# jira_comment_edit <KEY> <commentId> '<wiki markup>' -> http code
jira_comment_edit() {
  python3 -c 'import json,sys;print(json.dumps({"body":sys.argv[1]}))' "$3" > /tmp/jc.$$.json
  curl -s -o /dev/null -w "%{http_code}\n" -u "$(_jira_auth)" -H 'Content-Type: application/json' -X PUT --data @/tmp/jc.$$.json "$(_jira_base)/rest/api/2/issue/$1/comment/$2$(_jira_q)"
  rm -f /tmp/jc.$$.json
}

# jira_comment_delete <KEY> <commentId> -> http code (only your own comments)
jira_comment_delete() { curl -s -o /dev/null -w "%{http_code}\n" -u "$(_jira_auth)" -X DELETE "$(_jira_base)/rest/api/2/issue/$1/comment/$2"; }

# jira_attachment_delete <attachmentId>
jira_attachment_delete() { curl -s -o /dev/null -w "%{http_code}\n" -u "$(_jira_auth)" -X DELETE "$(_jira_base)/rest/api/2/attachment/$1"; }

# code_host_upload <file> <gitlabProjectId> -> GitLab markdown for embedding in an MR. GITLAB_HOST defaults to gitlab.com.
# GitHub has no upload API for PR comments: attach the file to the tracker ticket, or commit it to an evidence branch and link the raw URL.
code_host_upload() {
  local HOST=${GITLAB_HOST:-gitlab.com} TOKEN AUTH; TOKEN=$(glab config get token --host "$HOST" 2>/dev/null)
  if grep -qE 'is_oauth2: *"?true' ~/.config/glab-cli/config.yml 2>/dev/null; then AUTH="Authorization: Bearer $TOKEN"; else AUTH="PRIVATE-TOKEN: $TOKEN"; fi
  curl -sf -H "$AUTH" -F "file=@$1" "https://$HOST/api/v4/projects/$2/uploads" | python3 -c 'import sys,json;print(json.load(sys.stdin)["markdown"])'
}
