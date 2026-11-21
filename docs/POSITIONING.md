# Positioning & Messaging

## Competitive Alternatives
See `docs/CUSTOMER.md`, "Competing Alternatives".

## Unique Attributes → Value Themes
| Attribute | Value ("so what") | Proof |
|---|---|---|
| Dhivehi first, with Thaana input | Use it in your own language | Dhivehi UI and in-app Thaana keyboard |
| MVR and local receipts (GST, Dhivehi and English) | Scans and totals that match Maldivian life | Raseedhu receipt scanning with a check-before-save screen |
| Private by design | Your records are yours | No ads, no tracking, data never sold (About screen); account and data deletable in Settings |
| Local duties in one place | Zakat, sadaqah, the register, debts | Optional features, switched on only when needed |

## Best-Fit Customer
A Dhivehi-speaking person or household in the Maldives who wants to see where the month's money goes. See `docs/CUSTOMER.md`.

## Market Category
Personal budgeting app for the Maldives (a local subcategory of expense trackers).

## One-Liner
Know where your money goes, in your own language. (Already the app's tagline.)

## Brand Script (StoryBrand)
To be written if the owner wants a marketing site; not needed for the in-app journey.

## Key Messages
Phases 6 and 7, 2026-11-21. Method: built-in SUCCESs brief (made-to-stick and influence-psychology skills not installed). Scores are Simple, Unexpected, Concrete, Credible, Emotional, Stories out of 6, from the copy as shipped. English only: Dhivehi wording needs a native review and is outside this audit.

### Phase 6: in-app words
| Surface | Message now | SUCCESs (of 6) | Rewrite | Status |
|---|---|---|---|---|
| Onboarding page 1 | "Log spending in MVR in seconds, or photograph a receipt and let Raseedhu read it." | 3: a brand word the reader has not met | "Log what you spend in MVR in seconds. Or photograph a receipt and we read it for you." | proposed |
| Home, no spending yet | "Add your first expense, or scan a receipt with Raseedhu." | 3 | "Add your first expense, or photograph a receipt." | proposed |
| Home and Reports, over budget | "MVR 18,378.26 over budget" in a red pill | 2: a verdict with no way forward | "You are MVR 18,378.26 over your budget. Raise it, or look at where it went." (calm colour, with a link to the categories) | proposed (with U3) |
| Offline, items that failed | "1 saved item could not be uploaded and was dropped." | 2: "dropped" is jargon and says nothing to do | "1 saved item could not be sent, so it was not saved. Please add it again." | proposed |
| Scan screen title and subtitle | Title "Raseedhu"; "Photograph a receipt. We fill in the details for you to check." | 4 | Title "Scan a receipt"; subtitle "Raseedhu, our receipt reader, fills in the details for you to check." (the name is introduced once, here) | proposed |
| Tab bar | Icon only, camera in the middle | 1 | Label "Scan" (see U1) | proposed |
| Add expense form | Field "Merchant" | 3: shop-talk | "Shop or place" | proposed |
| Add screen chips | "Expense", "Income", "Salary" | 3: Salary vs Income unclear | "Expense", "Income", "Split pay" (see U6) | proposed |
| Plus benefits | "100 Raseedhu scans a month" | 3 | "100 receipt scans a month" | proposed |
| About | "Terms and contact details will appear here." (shows only when no legal and support links are configured) | 1: placeholder text | Verify production builds have the links set; otherwise hide the line. | verify |
| Remove / Delete / Leave | Checked: Remove takes something out of a list, Delete erases a record, Leave stops seeing a group. Used consistently. | 5 | No change (D7 closed). | closed |
| Setup, auth, scan errors, offline waiting and sign-out warnings | Concrete, plain, say what to do next | 5 | Keep. | keep |

Commander's Intent per screen (the one thing each must land):
| Screen | One thing |
|---|---|
| Home | Where this month stands |
| Add entry | It is logged in seconds |
| Scan | Photo in, draft out, you check it |
| Budget | Set a limit and see it |
| Reports | See where it went |
| Plus | What more you get, honestly |

### Phase 7: the upgrade surfaces (Kharadhu Plus)
Surfaces: the Plus screen (benefit list, Get Plus, Restore, promo code), the "needs Plus" prompts at each limit (scans, photos, 3+ person households, history over 6 months, more than 2 Hissa Foshi groups, more than 6 recurring items), and the scan-limit message.

Truth check, claim by claim:
| Claim | True today? | Action |
|---|---|---|
| "100 scans a month" and "Free: 10 a month" | Yes, enforced on the server | keep |
| "Keep your receipt photos" (free scans keep only what was read) | Yes | keep |
| "Households of three or more", "more than 2 groups", "more than 6 recurring" | Yes, enforced by database rules | keep |
| "Reports older than 6 months" | Yes in the app (gated in the app, not the server) | keep; note it is client-side |
| "Monthly summary as PDF or CSV" | No, not built ("Coming soon") | remove from the benefits list until it exists |
| "Get Plus" | The purchase cannot complete: store subscriptions are not set up, so it ends in "Subscriptions open soon" | replace with a clear "Not on sale yet" line; keep the promo code entry, which works |
| Scarcity (the monthly scan limit) | Real: 10 free scans, resets on the 1st, and the message says so | keep; this is the one honest scarcity cue |
| Social proof, testimonials, counters | None exist | do not add any until real numbers exist |
| "Cancel any time in your store account" | True for store subscriptions | keep |

| Surface | Lead principle | Message | Status |
|---|---|---|---|
| Plus screen, top | Reciprocity: say what is free first | Move "Always free" above the benefit list: "Everything you use today stays free." Then "Plus adds:" | proposed |
| Scan limit reached | Honest scarcity | "You've used this month's 10 free scans. They come back on the 1st. Plus gives 100 a month." with the Plus link as a second button, never a blocker (manual entry stays one tap away) | proposed (check the current text keeps this) |
| Plus benefit list | Concrete value, no tricks | Only what exists today. No fake counters. | proposed (with U4) |
| Home and Add screens | None: no Plus prompts | Keep Plus off the daily screens | keep |
| Promo code | Reciprocity and unity | Keep as is; codes are real and owner-issued | keep |
Ethics gate: no disqualifying tactic found. The one issue (vapor feature plus a dead purchase button) is honesty, fixed by U4.
