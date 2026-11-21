# Design System

## Design Direction
Signature moment, personality, references. (Phase 4 and 5 fill this.)

## Typography
Typefaces, scale, measure, line height, loading strategy. (Phase 4.)

## Tokens
Spacing scale · color palette (shades, tinted grays) · shadows. (Phase 4.)

## Components
| Component | Decision | Status |
|---|---|---|

## UX Audit Findings
Phase 2 heuristic evaluation, 2026-11-21. Source: audit of the screens in a 390px phone preview (Home, Budget, Reports, Add expense, Scan, Plus), run against Nielsen's 10 heuristics. Severity 0 none, 1 cosmetic, 2 minor, 3 major, 4 catastrophe. Evidence is audit only; there are no user recordings yet, so "frequency" is estimated from how often the screen is opened.

| # | Issue | Heuristic | Severity (0-4) | Fix | Status |
|---|---|---|---|---|---|
| U1 | The bottom tab bar is five icons with no visible text (home, wallet, camera, pie, dots). A new user cannot tell Budget from Reports from More; the Trunk Test question "where am I" fails. | 6 Recognition, 4 Consistency | 3 | Show a short label under each tab icon (Home, Budget, Scan, Reports, More). | open |
| U2 | Money amounts are cut off with an ellipsis on Reports: the Income tile reads "MVR 36,910..." at 390px. A truncated amount is a wrong amount. | 1 Status, 9 Errors | 3 | Never truncate money: shrink the font to fit or stack the two tiles; same check on Home and Budget tiles. | open |
| U3 | The over-budget state is a red alarm pill on the first screen and again on Reports ("MVR 18,378.26 over budget"), with the bar still full blue. It reads as a scolding, which is the worst gap found in Phase 1 (emotional: calm and in control). | 8 Minimalist, 9 Recover | 3 | Calm over-budget state: neutral amber, say what to do next ("Raise the limit or review Food and groceries"), keep the bar's colour in step with the state. | open |
| U4 | Kharadhu Plus lists "Monthly summary as PDF or CSV · Coming soon" among the benefits, and the "Get Plus" button leads to "Subscriptions open soon". A paywall that sells something unbuilt and cannot be completed. | 9 Errors, honesty (Phase 7) | 3 | Remove unbuilt items from the benefits list; while purchases are not on sale, replace "Get Plus" with "Tell me when it is ready" or a promo code entry only. | open |
| U5 | The floating tab bar sits over the bottom of scrolled content (it covers the "Add a shared entry" button on Home at rest). | 8 Minimalist, 1 Status | 2 | Add bottom padding equal to the bar's height plus gap to every scrolling tab screen. | open |
| U6 | "Salary" next to "Expense" and "Income" on the add screen: it is not clear how Salary differs from Income (it is the split-pay entry for several currencies). | 2 Real world | 2 | Rename to "Split pay" or move it under Income as "Paid in more than one currency". | open |
| U7 | Edit buttons differ across the Budget screen: a light-blue pill in the hero, plain text "Edit" on rows with a limit, an outlined "Set limit" on rows without. Same action, three looks. | 4 Consistency | 2 | One style for "change this limit", one for "set a limit". | open |
| U8 | Activity has month and All/Income/Expenses filters but no search, so finding "that Ooredoo bill" means scrolling. | 7 Flexibility | 2 | Add a search field to Activity (merchant, note, category, amount). | open |
| U9 | Home hero reads in an odd order: "Spent", then "Includes ... spent together", "Income ...", the bar, a pill, then "of MVR 12,000 budget" last. The budget figure the bar measures arrives after the verdict. | 8 Minimalist | 2 | Order: spent, "of budget" with the bar, then the verdict line; fold "includes shared" into one line. | open |
| U10 | The shared card is titled with the household's name ("Home" in the preview). If a household is named something generic, the card reads like the Home tab. | 2 Real world | 1 | Title the card "Together" with the household name as the subtitle. | open |
| U11 | Raseedhu is used as a plain word in English in Plus ("100 Raseedhu scans a month") and on the scan screen title. New users do not know it. | 2 Real world | 2 | Pair it once: "Scan receipts (Raseedhu)", then use "scan". Copy detail belongs to Phase 6. | open |

### Phase 3 findings: where the design misleads (Norman: gulfs of execution and evaluation)
Source: audit of the core flows in code and the phone preview: add an entry, scan, edit and delete an entry, switch a feature off, share, save feedback.

| # | Issue | Heuristic (Norman gulf) | Severity (0-4) | Fix | Status |
|---|---|---|---|---|---|
| D1 | Deleting an entry asks "Delete?" in a dialog. People tap through confirmations; a wrong delete cannot be taken back. | Execution: slip prevented by a dialog, not by undo | 3 | Delete at once, then show "Deleted. Undo" for 6 seconds that puts it back. Keep the dialog only for deleting a whole group or account. | open |
| D2 | Switching a feature off in Features hides it without saying where it went or how to bring it back. | Evaluation: no feedback on state change | 2 | After a switch off: "Hidden. Switch it back on under More, Add features." | open |
| D3 | The toast has no action, so no message can offer a way back ("Deleted", "Removed"). | Evaluation: feedback with no recovery | 2 | Let a toast carry one action button (used by D1). | open |
| D4 | A save that cannot be sent says "That didn't save. Please try again." without saying why (no signal, a rule refused it, a server error). | Evaluation: error says what, not why or how | 2 | Say the reason when known: no connection (saved on this phone, will send later), a limit (Plus), otherwise try again. Offline is already handled; the generic text covers the rest. | open |
| D5 | The Next button on the amount screen is grey and disabled with no hint why. | Execution: missing signifier | 1 | Keep the constraint; let the amount line say "Enter an amount" while it reads 0. | open |
| D6 | Category is required for an expense and enforced only when Save is tapped. | Execution: constraint after the fact | 1 | Highlight the category group and disable Save until one is chosen, or default to the most used category (now first in the list). | open |
| D7 | Removing a payment or a person asks first (good), but the dialogs use different words for the same act (Remove, Delete, Leave). | Evaluation: inconsistent language | 1 | Use Remove for taking a thing out of a list, Delete for erasing a record, Leave for stopping to see it. Audit in Phase 6. | open |

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
| Interaction | Trigger/Rules/Feedback/Loops | Fix | Status |
|---|---|---|---|
