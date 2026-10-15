---
name: tracker-ops
description: Issue-tracker REST operations (Jira as the example): field ids, transitions, labels, attachments, comment edits, and the fixed/merged/retest/close checklists. Use when changing a tracker ticket.
---

# Tracker operations

Fill the placeholders from your project's profile; keep the steps. Jira is the worked example; on another <TRACKER> keep the checklists and map each call to its API.

Every write is **checked**: after a change, re-read the ticket and confirm the field, status or label actually changed. A `204` doesn't mean the screen accepted the field. Fields that are missing from a transition screen fail with 400, so set them with a separate edit.

## Setup

- **Token:** create an Atlassian API token, save it to `~/.config/jira-token` (chmod 600), `export JIRA_EMAIL=<your login>` and `export JIRA_BASE=<your Jira Cloud site URL>` (no default). Never print the token, and never put it on a command line others can see; the helpers read it from the file (`JIRA_TOKEN_FILE` overrides the path).
- **Helpers:** `source scripts/jira.sh` gives you `jira_get`, `jira_search`, `jira_fields`, `jira_labels`, `jira_assign`, `jira_transition`, `jira_attach`, `jira_comment`, `jira_comment_edit`, `jira_comment_delete`, `jira_attachment_delete` and `code_host_upload`.
  - Set `JIRA_QUIET=1` to send edits with `notifyUsers=false`.
  - A `401` means the token file is wrong or expired. An `export` in someone else's terminal doesn't reach your shell.
  - `code_host_upload <file> <projectId>` uploads to GitLab and prints the markdown to embed in an MR/PR. It reads the token from `glab` for `GITLAB_HOST` (default `gitlab.com`). GitHub has no upload API for PR comments: attach the file to the <TRACKER> ticket, or commit it to an evidence branch and link the raw URL.
- **API versions:**
  - v2 for issues and comments: wiki markup, mentions as `[~accountid:<id>]`.
  - `/rest/api/3/search/jql` for search, paginated with `nextPageToken`.
  - v3 for attachments.
  - v3 rejects a plain string in a paragraph (rich-text) custom field such as Root Cause; use v2.
- The Atlassian MCP can read and comment, but it can't upload files. Use the helpers for attachments.

## Field ids

Ids are per site. Discover them once and record them in your project's profile:
- All fields with names and ids: `GET /rest/api/2/field`.
- Fields editable on a ticket, with allowed option ids: `GET /rest/api/2/issue/<TICKET-KEY>/editmeta`.
- Board id: `GET /rest/agile/1.0/board?projectKeyOrId=<PROJECT>`.

| Field | Id | Value shape |
|---|---|---|
| Sprint | `<SPRINT_FIELD>` | bare sprint id. Find the active one with JQL `project = <PROJECT> AND sprint in openSprints()` and read the field off any result |
| Team | `<TEAM_FIELD>` | `{"id":"<TEAM_OPTION_ID>"}` = your team (option id from `editmeta`). Leave another team if one is set. Check the name in `/field`: a site can have several "Team" fields and only one is used |
| Bug Type | `<BUG_TYPE_FIELD>` | `{"id":…}`: Issue `<ID>` (default), Regression `<ID>`, Feature Gap `<ID>`, UI/UX `<ID>`, Legacy `<ID>`; option ids from `editmeta` |
| Developer / Reviewed by / Tested by | `<DEVELOPER_FIELD>` / `<REVIEWER_FIELD>` / `<TESTER_FIELD>` | `{"accountId":"…"}` |
| Story Points | `<STORY_POINTS_FIELD>` | number. Keep an existing value |
| QA Story Points | `<QA_STORY_POINTS_FIELD>` | number, used for sorting QA effort |
| Root Cause Dev | `<ROOT_CAUSE_FIELD>` | one business sentence (v2 plain string) |
| Reproduced on | `<REPRODUCED_ON_FIELD>` | multi-select of environments (e.g. <PROD> regions, <STAGING_URL>, …) |
| Fix versions | `fixVersions` | `[{"id":…}]`. Look ids up with `GET /rest/api/2/project/<PROJECT>/versions`. Use the version of the release <LIVE_BRANCH> ships for work on that branch, and the next release for <DEV_BRANCH> work |

Find your own accountId with `GET /rest/api/2/myself`, and anyone else's with `GET /rest/api/2/user/search?query=<name>`.

## Transitions

`<ID>` In clarification · `<ID>` Backlog · `<ID>` Ready for development · `<ID>` In Progress · `<ID>` In Review · `<ID>` Ready for deploy (only from In Review) · `<ID>` Ready for testing · `<ID>` QA Validation · `<ID>` Done · `<ID>` Won't do (send `{"resolution":{"name":"Won't Fix"}}`) · `<ID>` Re-open.

Ids are per workflow. Discover them with `GET /rest/api/2/issue/<TICKET-KEY>/transitions` (on tickets in different statuses, since only the transitions out of the current status are listed) and record them in your profile. When one fails, list what's available the same way.

## Checklists

Label names (`<MERGE_RISK_LABEL_PREFIX>`, `<CLOSE_OR_RETEST_LABEL>`, …) are your team's convention; list the ones already in use with `GET /rest/api/2/label`.

**Fix in review** (MR open):
1. Assign to yourself, and set sprint and team.
2. Move to In Progress or In Review.
3. Set the fix version before the transition.

**Merged ticket.** When the MRs are merged, set every one of these before Ready for testing:
1. Sprint (the active one) and your team.
2. Bug Type (Issue if empty).
3. Developer and Reviewed by.
4. Story Points: about 0.2 for a couple of lines with an easy repro, 0.5 for a bit harder, 1 for harder, up to 3 for risk 4–5. Keep an existing value.
5. Fix version.
6. The `<MERGE_RISK_LABEL_PREFIX>-N` label, scored with the merge-risk rubric.
7. Root Cause Dev.
8. The QA comment with evidence, worded per ticket-communication.

Then re-read all of the above and confirm none is empty. The developer who fixed it stays the assignee, even through a QA reopen; tag <QA_TEAM> in the comment instead.

**Retest without a code fix** (the bug was already fixed elsewhere, can't be reproduced with a concrete check, or is obsolete for the reporter's env):
1. Add the label `<CLOSE_OR_RETEST_LABEL>`.
2. Post one verdict comment.
3. If the reporter is in <QA_TEAM> (the list is in your team's brief; `GET /rest/api/2/user/groups?accountId=<id>` shows group membership), assign it to them and transition to QA Validation. Otherwise assign it to yourself, with sprint and team.

**Close as Won't do** (the feature is gone on the reporter's branch, a duplicate, a decision already made, or a doc bug whose doc is now fixed):
1. Post the comment first.
2. Set: Bug Type Issue, Developer and Reviewed by, SP 0 (or the real effort if you shipped a related fix), the fix version of the release where it stopped applying, and Root Cause Dev ("Obsolete: …").
3. Assign to yourself.
4. Transition Won't do with resolution Won't Fix.
5. Remove triage labels that no longer apply.

**Needs a product decision:**
1. Post a comment tagging <PRODUCT_OWNER> with the concrete question.
2. Transition In clarification.
3. Don't reassign.

**Hard bug, not fixing now:**
1. Add the label `<NEEDS_DEV_ATTENTION_LABEL>`.
2. Post one short comment: the cause so far, the repos, the rough size and the risk.
3. Don't change the status or the assignee.

**Needs Live data you can't read:** add the label `<NEEDS_LIVE_DATA_LABEL>`, and post a comment naming exactly which data or logs are needed.

## Comments and attachments

- **Attach before you comment:** `jira_attach <TICKET-KEY> file.png`. Then reference each file in the comment as `!file.png|thumbnail!`, or as `[^file.webm]` for a video. Check the rendering with `GET …/comment/<id>?expand=renderedBody`: it should contain `<img` and no leftover `|thumbnail!`.
- **Editing a comment** (`jira_comment_edit`) doesn't notify mentioned people. When someone must be pinged, post a short new comment that mentions them.
- **Delete your own outdated comments** (`jira_comment_delete`), plus attachments that only they embedded. Never delete other people's.

## QA effort ordering

To let <QA_TEAM> work the cheapest checks first:
1. Set QA Story Points (XS 0.1, S 0.15, M 0.25, L 0.5) together with a matching `<QA_EFFORT_LABEL_PREFIX>-<S|M|L>` label.
2. Create a filter sorted by them: `POST /rest/api/2/filter` with JQL `… ORDER BY "QA Story Points[Number]" ASC`, shared with the project.
3. Keep the label and the number consistent. When one changes, change the other.
