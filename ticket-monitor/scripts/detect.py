# Detect new reopens and comments on campaign tickets since the last run (Jira Cloud REST). Prints JSON; never prints the token.
# Env (required): JIRA_BASE (your Jira Cloud site URL), JIRA_PROJECT, JIRA_EMAIL, JIRA_ME (your accountId),
#                 MONITOR_FORWARD_STATES (comma list of statuses past development, e.g. "Ready for testing,Done").
# Env (optional): MONITOR_LABELS (comma list; campaign = labelled OR assigned to you), MONITOR_ISSUE_TYPE (default Bug),
#                 MONITOR_BOT_NAMES (comma list of display names to ignore), JIRA_TOKEN_FILE (default ~/.config/jira-token),
#                 MONITOR_DIR (default ~/.claude/bug-monitor).
import json, os, sys, base64, urllib.request, urllib.parse
from datetime import datetime, timezone, timedelta
def csv(name): return [s.strip() for s in os.environ.get(name, "").split(",") if s.strip()]
ME = os.environ["JIRA_ME"]
FWD = {s.lower() for s in csv("MONITOR_FORWARD_STATES")}
if not FWD: sys.exit("MONITOR_FORWARD_STATES is empty")
LABELS = csv("MONITOR_LABELS")
BOTS = set(csv("MONITOR_BOT_NAMES"))
PROJECT = os.environ["JIRA_PROJECT"]
ISSUE_TYPE = os.environ.get("MONITOR_ISSUE_TYPE", "Bug")
DIR = os.path.expanduser(os.environ.get("MONITOR_DIR", "~/.claude/bug-monitor"))
st = json.load(open(os.path.join(DIR, "state.json")))
last = datetime.fromisoformat(st["lastCheck"].replace("Z", "+00:00"))
tok = open(os.path.expanduser(os.environ.get("JIRA_TOKEN_FILE", "~/.config/jira-token"))).read().strip()
auth = "Basic " + base64.b64encode(f"{os.environ['JIRA_EMAIL']}:{tok}".encode()).decode()
B = os.environ["JIRA_BASE"].rstrip("/")
def get(path, params=None):
    url = B + path + ("?" + urllib.parse.urlencode(params) if params else "")
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"Authorization": auth, "Accept": "application/json"})))
def ts(s): return datetime.strptime(s, "%Y-%m-%dT%H:%M:%S.%f%z")
since = (last - timedelta(days=1)).strftime("%Y-%m-%d")
def search(jql):
    out, tokn = [], None
    while True:
        p = {"jql": jql, "fields": "status,summary,labels,assignee", "maxResults": 100}
        if tokn: p["nextPageToken"] = tokn
        d = get("/rest/api/3/search/jql", p); out += d["issues"]
        tokn = d.get("nextPageToken")
        if not tokn: return out
label_clause = "labels in ({}) OR ".format(",".join(f'"{l}"' for l in LABELS)) if LABELS else ""
camp = search(f'project = "{PROJECT}" AND type = "{ISSUE_TYPE}" AND ({label_clause}assignee = {ME}) AND updated >= "{since}"')
allu = search(f'project = "{PROJECT}" AND updated >= "{since}"')
campkeys = {i["key"] for i in camp}
def is_noise(author): return author.get("accountId") == ME or author.get("accountType") == "app" or author.get("displayName") in BOTS
items = []
for i in allu:
    k = i["key"]
    cs = get(f"/rest/api/2/issue/{k}/comment", {"maxResults": 100, "orderBy": "-created"})["comments"]
    for c in cs:
        if ts(c["created"]) <= last or is_noise(c["author"]) or c["id"] in st["handledComments"]: continue
        if k in campkeys or ME in c["body"]:
            items.append({"type": "comment", "key": k, "id": c["id"], "author": c["author"]["displayName"], "created": c["created"], "body": c["body"][:400]})
    if k in campkeys:
        for h in get(f"/rest/api/2/issue/{k}/changelog", {"maxResults": 100})["values"]:
            if ts(h["created"]) <= last or h["author"].get("accountId") == ME: continue
            for it in h["items"]:
                rid = f"{k}:{h['id']}"
                if it["field"] == "status" and (it["fromString"] or "").lower() in FWD and (it["toString"] or "").lower() not in FWD and rid not in st["handledReopens"]:
                    items.append({"type": "reopen", "key": k, "id": rid, "author": h["author"]["displayName"], "created": h["created"], "from": it["fromString"], "to": it["toString"]})
print(json.dumps({"scanned": len(allu), "campaign": len(camp), "items": items}, indent=1))
