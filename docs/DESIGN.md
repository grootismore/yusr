# Design System

## Design Direction
Signature moment, personality, references. (Phase 4 and 5 fill this.)

## Typography
Typefaces, scale, measure, line height, loading strategy. (Phase 4.)

## Tokens
Source of truth: `src/theme/tokens.ts` ("Ink and sky"). Audited in Phase 4 against the refactoring-ui method (built-in brief, skill not installed).
- **Spacing:** 4-pt grid `xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32`. Consistent; no change needed.
- **Radius:** `8 · 14 · 22 · pill`. Consistent.
- **Palette:** tinted dusty blue-greys (page #CBD2D9, card #D9DFE5), matte black ink, one soft sky accent (#8EC5F0), coral for over-budget and errors, amber for warnings. Text pairs are documented as AA; borders 3:1. Strong and already systematic.
- **Shadows:** cards rely on a hairline rim; the toast has a heavy shadow. Few levels. Fine.
- **Verdict:** the system is sound, so Phase 4 fixes are small (V1-V4 below), not a new palette. Skip-heuristic applies in part: the UI reads in grayscale and uses one scale.

## Components
| Component | Decision | Status |
|---|---|---|
| V1 Card on page | Card (#D9DFE5) on page (#CBD2D9) is about 1.15:1: cards separate only by a hairline, so screens read flat. Lift cards one step lighter than the page (about #E4E9EE) and keep "never pure white". | built, PR #143 |
| V2 Figure panel watermark | The ghost "MVR" letters and dot pattern sit behind the budget line and compete with text ("of MVR 12,000 budget" overlaps the letters). Lower the watermark to a faint corner mark or remove it. | built, PR #143 |
| V3 Primary action on Home | Four equal round quick actions (Add expense, Scan receipt, Debt-free plan, Giving) plus the centre scan tab: no single dominant action. Make Add expense a filled pill; the others stay quiet circles. | built, PR #143 |
| V4 State colour | The panel progress bar stays sky blue even when over budget; the colour does not follow the state (see U3). Over: amber bar, calm text. | built, PR #142 |

## UX Audit Findings
Phase 2 heuristic evaluation, 2026-11-21. Source: audit of the screens in a 390px phone preview (Home, Budget, Reports, Add expense, Scan, Plus), run against Nielsen's 10 heuristics. Severity 0 none, 1 cosmetic, 2 minor, 3 major, 4 catastrophe. Evidence is audit only; there are no user recordings yet, so "frequency" is estimated from how often the screen is opened.

| # | Issue | Heuristic | Severity (0-4) | Fix | Status |
|---|---|---|---|---|---|
| U1 | The bottom tab bar is five icons with no visible text (home, wallet, camera, pie, dots). A new user cannot tell Budget from Reports from More; the Trunk Test question "where am I" fails. | 6 Recognition, 4 Consistency | 3 | Show a short label under each tab icon (Home, Budget, Scan, Reports, More). | built, PR #142 |
| U2 | Money amounts are cut off with an ellipsis on Reports: the Income tile reads "MVR 36,910..." at 390px. A truncated amount is a wrong amount. | 1 Status, 9 Errors | 3 | Never truncate money: shrink the font to fit or stack the two tiles; same check on Home and Budget tiles. | built, PR #142 (checked: the cut-off on Reports was a web-preview artifact; phones shrink text to fit. Smaller minimum font and wrapping dates added anyway) |
| U3 | The over-budget state is a red alarm pill on the first screen and again on Reports ("MVR 18,378.26 over budget"), with the bar still full blue. It reads as a scolding, which is the worst gap found in Phase 1 (emotional: calm and in control). | 8 Minimalist, 9 Recover | 3 | Calm over-budget state: neutral amber, say what to do next ("Raise the limit or review Food and groceries"), keep the bar's colour in step with the state. | built, PR #142 |
| U4 | Kharadhu Plus lists "Monthly summary as PDF or CSV · Coming soon" among the benefits, and the "Get Plus" button leads to "Subscriptions open soon". A paywall that sells something unbuilt and cannot be completed. | 9 Errors, honesty (Phase 7) | 3 | Remove unbuilt items from the benefits list; while purchases are not on sale, replace "Get Plus" with "Tell me when it is ready" or a promo code entry only. | built, PR #145 |
| U5 | The floating tab bar sits over the bottom of scrolled content (it covers the "Add a shared entry" button on Home at rest). | 8 Minimalist, 1 Status | 2 | Add bottom padding equal to the bar's height plus gap to every scrolling tab screen. | closed: not a bug, screens already scroll clear of the bar |
| U6 | "Salary" next to "Expense" and "Income" on the add screen: it is not clear how Salary differs from Income (it is the split-pay entry for several currencies). | 2 Real world | 2 | Rename to "Split pay" or move it under Income as "Paid in more than one currency". | built, PR #145 (renamed "Split pay") |
| U7 | Edit buttons differ across the Budget screen: a light-blue pill in the hero, plain text "Edit" on rows with a limit, an outlined "Set limit" on rows without. Same action, three looks. | 4 Consistency | 2 | One style for "change this limit", one for "set a limit". | open (not built): one style for change/set limit buttons; low value, backlog |
| U8 | Activity has month and All/Income/Expenses filters but no search, so finding "that Ooredoo bill" means scrolling. | 7 Flexibility | 2 | Add a search field to Activity (merchant, note, category, amount). | built, PR #146 |
| U9 | Home hero reads in an odd order: "Spent", then "Includes ... spent together", "Income ...", the bar, a pill, then "of MVR 12,000 budget" last. The budget figure the bar measures arrives after the verdict. | 8 Minimalist | 2 | Order: spent, "of budget" with the bar, then the verdict line; fold "includes shared" into one line. | built, PR #142 |
| U10 | The shared card is titled with the household's name ("Home" in the preview). If a household is named something generic, the card reads like the Home tab. | 2 Real world | 1 | Title the card "Together" with the household name as the subtitle. | closed: the title is the household's own name, which is right |
| U11 | Raseedhu is used as a plain word in English in Plus ("100 Raseedhu scans a month") and on the scan screen title. New users do not know it. | 2 Real world | 2 | Pair it once: "Scan receipts (Raseedhu)", then use "scan". Copy detail belongs to Phase 6. | built, PR #145 |

### Phase 3 findings: where the design misleads (Norman: gulfs of execution and evaluation)
Source: audit of the core flows in code and the phone preview: add an entry, scan, edit and delete an entry, switch a feature off, share, save feedback.

| # | Issue | Heuristic (Norman gulf) | Severity (0-4) | Fix | Status |
|---|---|---|---|---|---|
| D1 | Deleting an entry asks "Delete?" in a dialog. People tap through confirmations; a wrong delete cannot be taken back. | Execution: slip prevented by a dialog, not by undo | 3 | Delete at once, then show "Deleted. Undo" for 6 seconds that puts it back. Keep the dialog only for deleting a whole group or account. | built, PR #144 |
| D2 | Switching a feature off in Features hides it without saying where it went or how to bring it back. | Evaluation: no feedback on state change | 2 | After a switch off: "Hidden. Switch it back on under More, Add features." | built, PR #144 |
| D3 | The toast has no action, so no message can offer a way back ("Deleted", "Removed"). | Evaluation: feedback with no recovery | 2 | Let a toast carry one action button (used by D1). | built, PR #144 |
| D4 | A save that cannot be sent says "That didn't save. Please try again." without saying why (no signal, a rule refused it, a server error). | Evaluation: error says what, not why or how | 2 | Say the reason when known: no connection (saved on this phone, will send later), a limit (Plus), otherwise try again. Offline is already handled; the generic text covers the rest. | open: generic save-failed text kept; offline is already explained; backlog |
| D5 | The Next button on the amount screen is grey and disabled with no hint why. | Execution: missing signifier | 1 | Keep the constraint; let the amount line say "Enter an amount" while it reads 0. | built, PR #144 |
| D6 | Category is required for an expense and enforced only when Save is tapped. | Execution: constraint after the fact | 1 | Highlight the category group and disable Save until one is chosen, or default to the most used category (now first in the list). | built, PR #144 |
| D7 | Removing a payment or a person asks first (good), but the dialogs use different words for the same act (Remove, Delete, Leave). | Evaluation: inconsistent language | 1 | Use Remove for taking a thing out of a list, Delete for erasing a record, Leave for stopping to see it. Audit in Phase 6. | closed: checked, wording is consistent |

### Trunk Test (Home, daily use)
| Question | Result |
|---|---|
| What app is this? | Pass (Kharadhu in the header) |
| What page am I on? | Weak: the header shows the app name, not "Home"; tab icons have no text (U1) |
| What are the major sections? | Fail without labels (U1) |
| What are my options here? | Pass (Add expense, Scan receipt as the main actions) |
| Where am I in the scheme of things? | Weak (U1) |
| How can I search? | Fail: no search anywhere in the app (U8) |

## Microinteraction Inventory
Phase 5 audit, from code and the phone preview. "Feels fast" is folded in here (Phase 8 skipped, native app): no device traces were taken, so speed rows are to be verified on a phone.

| Interaction | Trigger/Rules/Feedback/Loops | Fix | Status |
|---|---|---|---|
| M1 Press any button or row | Trigger: tap. Rules: none. Feedback: opacity drops to 0.85 only (barely visible). Loop: none. | Press scale to 0.97 with a quick return, plus the existing haptic on chips; one shared press style. | built, PR #143 (press scale) |
| M2 Save an entry | Trigger: Save. Feedback: success screen with check and haptic. Loop: "Add another". Good. | Keep. Add the signature moment (M6). | keep |
| M3 Open Home before data arrives | Trigger: launch or tab. Feedback: the figure may read MVR 0 until the data arrives, a wrong-looking number (to verify on a phone). | Show a quiet placeholder (dashes) until the month has loaded, never a zero. | built, PR #144 |
| M4 Switch a feature on or off | Trigger: switch. Feedback: switch moves, no haptic, no words. | Light haptic, and for off, say where to get it back (D2). | built, PR #144 |
| M5 Shared money from a partner | Trigger: partner adds an entry. Rules: appears on next fetch. Feedback: none. No pull-to-refresh anywhere, so people cannot ask "is this up to date?" | Pull to refresh on Home, Activity and the household screen; "Updated just now" is not needed. | built, PR #144 |
| M6 Signature moment | Trigger: saving an entry. Today the success screen shows what was saved. The job is to see where the month is going. | After saving, show what it means: "MVR X left this month" with the budget bar sliding to its new place (or "On track" with no budget set). Calm, useful, tied to the job. Removal test: the app would feel worse without it, because saving would again feel like filing, not seeing progress. | built, PR #146 |
| M7 Delete | Trigger: delete. Feedback: dialog then gone. | Undo toast (D1, D3). | built, PR #144 |
| M8 Progress bars | Trigger: data change. Feedback: 450ms ease-out fill. Good. | Keep. | keep |
| M9 Offline | Trigger: no signal. Feedback: offline banner, queued saves, optimistic rows. Good. | Keep. | keep |
