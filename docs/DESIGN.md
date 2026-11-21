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
