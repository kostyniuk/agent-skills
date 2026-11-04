---
name: explain
description: Explain a PR, file, feature, or concept: key points, visuals where they help, then a reading path.
disable-model-invocation: true
argument-hint: "What should I explain? (PR link, path, feature, concept)"
---

Explain $ARGUMENTS, or the current topic when no argument is given, to an engineer new to this codebase.

1. **Gather.** Read the actual source: the PR diff and body (`gh pr view` / `gh pr diff`), the files, the sibling code it copies. Done when you can state what it does and why in one sentence, and every claim you will make traces to something you read this run.

2. **Explain.** Open with that one sentence. Then the main useful points, most important first. Each point is something that changes how the reader understands or edits the code; drop anything they would skim past. Define each internal name (service, database, model, team jargon) the first time it appears, in a few words.

   Where a point is about shape, flow, or change, read the [`show-me`](https://github.com/humanlayer/skills) skill and use the smallest view it lists, placed beside the text it supports. One or two visuals usually carry it; prose carries the rest. When the reader needs to see the code working in the app, offer [`/screen-tour`](../screen-tour/SKILL.md) instead of describing the screens.

3. **Where to look.** End with a short reading path: 3–6 files or resources in the order to read them. Give each a `path:line` link (or URL) and one line on what it reveals. Lead with the file that holds the core idea.
