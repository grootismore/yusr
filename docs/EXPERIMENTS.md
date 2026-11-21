# Experiments

## Experiment Cards
### EXP-002 — Save screen shows what is left
- Hypothesis: We believe people log more entries in their first two weeks if saving shows "MVR X left this month", because it turns data entry into progress.
- Type: A/B (needs analytics; until then compare early testers before and after)
- Primary metric & threshold (pre-committed): entries logged per active person in days 1-14 rises by at least 15%.
- Guardrail metric: time from keypad to saved stays under 10 seconds.
- Decision rule (pivot / persevere / iterate): keep if the metric rises and the guardrail holds; otherwise show it only when a budget is set.
- Result & verdict: not run

### EXP-001 — Labelled tab bar
- Hypothesis: We believe more new people open Budget and Reports in their first week if each tab has a text label, because icon-only tabs hide what the sections are.
- Type: A/B (needs analytics; until then a before/after comparison on early testers)
- Primary metric & threshold (pre-committed): share of new accounts that open Budget or Reports within 7 days rises by at least 10 points.
- Guardrail metric: tab bar height does not push content off small phones (check at 360px width).
- Decision rule (pivot / persevere / iterate): keep if the primary metric rises; if flat, keep anyway as a clarity fix and look at the first-week path instead.
- Result & verdict: not run

## Experiment Backlog
| Idea | ICE (impact/confidence/ease) | Status |
|---|---|---|
| U1 Text labels under the tab icons | 8 / 8 / 9 | proposed (EXP-001) |
| U2 Never truncate money amounts (Reports tiles first) | 7 / 9 / 8 | proposed |
| U3 Calm over-budget state with a next step | 8 / 6 / 7 | proposed |
| U4 Remove "Coming soon" and the dead "Get Plus" button until purchases exist | 6 / 9 / 9 | proposed |
| U5 Bottom padding so the tab bar never covers content | 5 / 9 / 9 | proposed |
| U6 Rename or move "Salary" on the add screen | 4 / 7 / 9 | proposed |
| U7 One style for change/set limit buttons | 3 / 8 / 8 | proposed |
| U8 Search in Activity | 6 / 7 / 5 | proposed |
| U9 Reorder the Home hero | 4 / 6 / 8 | proposed |
| U10 Rename the shared card "Together" | 3 / 6 / 9 | proposed |
| U11 Introduce Raseedhu once, then say "scan" | 4 / 7 / 9 | proposed (copy, Phase 6) |
| D1 Undo after deleting an entry instead of a confirm dialog | 8 / 7 / 5 | proposed |
| D2 Say where a feature went when switched off | 4 / 8 / 9 | proposed |
| D3 Toast with an action button | 5 / 9 / 7 | proposed (needed by D1) |
| D4 Saying why a save failed | 4 / 6 / 6 | proposed |
| D5 Hint under the empty amount | 2 / 7 / 9 | proposed |
| D6 Category chosen before Save is enabled | 3 / 6 / 8 | proposed |
| D7 One word each for remove, delete and leave | 3 / 7 / 8 | proposed (copy, Phase 6) |
| V1 Lift cards one step off the page colour | 5 / 6 / 8 | proposed (owner to confirm) |
| V2 Tone down the panel watermark | 3 / 7 / 9 | proposed (owner to confirm) |
| V3 Make Add expense the dominant action on Home | 6 / 6 / 8 | proposed |
| V4 Progress bar colour follows the state | 5 / 8 / 9 | proposed (with U3) |
| M1 Stronger press feedback | 4 / 7 / 8 | proposed |
| M3 Placeholder instead of MVR 0 while loading | 6 / 6 / 7 | proposed (verify first) |
| M4 Haptic on switches | 2 / 8 / 9 | proposed |
| M5 Pull to refresh | 6 / 8 / 7 | proposed |
| M6 "MVR X left this month" on the save screen (signature moment) | 8 / 6 / 7 | proposed (owner to confirm) |
