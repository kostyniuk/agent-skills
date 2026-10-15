# Cases: claims that had to be walked back

Each case is a check that was skipped, and the step that would have caught it.

| Ticket | What was claimed | What was true | Step skipped |
|---|---|---|---|
| A retest audit (7 tickets) | "Obsolete: the page was removed" | Removed only on the development branch (another ticket removed several pages there). <PROD> still had the pages | 2: provenance against `<LIVE_BRANCH>` |
| A ticket marked fixed | "Fixed", so QA retested on the release env | The fix (from a related ticket) was merged only to `<DEV_BRANCH>`, never to `<LIVE_BRANCH>` | 2: provenance |
| A ticket with two MRs | "Not merged: the MR is still open" | A separate dev MR was merged that morning; the open one was only the release backport | Claim checklist: "merged" means every MR for the ticket |
| A count bug | "Can't happen, the count is never calculated" | A <SUPPORT> reporter proved the count was real; the cause was stale reference data on the platform | 3: reproduce with the reporter's data |
| The same count bug, reopened | "QA changed the wrong date field", proven by setting the filter through browser storage | QA had only refreshed and cleared the cache, so the default 90-day filter stayed. The explanation was a guess, and the proof skipped the UI path | 3: QA's exact actions; 6: prove along the user's path |
| A ticket proposed for closing | "Can't reproduce, close" | The steps didn't reproduce, but a related real bug existed. The right move was asking the reporter to re-check | 3: no close on "can't reproduce" |
| A pricing ticket | "QA's worker returns only a price" | Wrong explanation; the reported values showed otherwise | 8: second-hand facts stay inferred |
| A comparison between two orders | "Same app and country, only the item differs" | Rested on a sub-agent's data that hadn't been re-checked | 8: re-run before claiming |
| An empty-dropdown ticket | "A stale `skip` renders the dropdown empty" | The data grid component (e.g. Kendo) re-requests the page itself; a review sub-agent agreed with the wrong claim too | 3: reproduce before asserting a symptom |
| A form-field ticket | "Verified": the field text looked right | Opening the record fired `400 Wrong options` | 6: below the screen |
| Two payment tickets | "Verified locally: payment completes" | On the QA env the <PAYMENT_PROVIDER> (e.g. Stripe) test-account webhook is disabled, and staging's isn't subscribed to the needed event type | 2: env differences in third-party config |
| A log-noise ticket | "Only log text, about 0.2% of entries, won't fix" | Applying a settings preset sent a stale date: a real, bigger bug | Claim checklist: no won't-fix without a root cause |
| A scoped fix | Fix verified, ticket reopened | The scope ("only NEW sections") sat in the 4th paragraph; QA tested existing sections on an env without the fix | Publishing: scope and env in the first line |
| A legacy-flow ticket | "Flow not active since the last release" | The old integration helper still existed on `<LIVE_BRANCH>`; the claim rests on the replacing tickets, not on a check | 8: say what rests on whose statement |
