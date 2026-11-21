# Product

## Vision
Kharadhu helps people in the Maldives know where their money goes, in their own language: log what you spend in seconds, see where the month stands, and stay calm about it. Everything else (debts, giving, sharing, IOUs) is optional and switched on only when needed.

## MVP Definition
Type: native iOS and Android app (Expo) on Supabase. Scope: manual and scanned expenses and income, budgets, reports, Dhivehi and English, MVR plus foreign currencies. Deliberately excludes bank integrations and business accounting. See `docs/kharadhu-prd.md`.

## Outcome Roadmap
Phase 9 review, 2026-11-21 (built-in method; steve-jobs-design-review skill not installed). Cold walkthrough as a brand-new user, from the code and the phone preview.

**The One Thing:** log a spend in seconds and see where the month stands.

**Steps to value (first launch to first saved entry):** intro pages (3, skippable) → create account → confirm email (leaves the app) → sign in → consent → setup: who is this for → monthly budget → what else to use → Home → keypad → Next → category → Save. About 12 screens and one email round trip before the first entry is saved. The email round trip is the likeliest place a new person is lost.

**Verdict: not yet insanely great. It is now a good app with a rough first ten minutes.** The daily loop (keypad, category, Save, and the save screen showing what is left) is strong after this journey. What still dilutes it: a long first run, a Home that offers up to four shortcuts when one is the point, and several overlapping features for money with other people.

### Ranked cut list (focusing is saying no)
| # | Cut | Why | Job served | Priority | Status |
|---|---|---|---|---|---|
| 1 | Remove the setup step "Who is this for?" and fold household into the Features step | It asks the same question as the Household switch. One fewer screen before value. | Core job (first use) | P1 | built, PR #147 |
| 2 | Cut the three intro pages to two | Page 2 ("Pay debts down. Give with intention.") sells optional features and contradicts "simple by default". Keep the core promise and the privacy promise. | Core job (first use) | P1 | built, PR #147 |
| 3 | Home shortcuts: keep only Add expense | Scan is already the middle tab; Debts and Giving already have cards on Home when switched on. One action, nothing to choose between. | Core job (daily use) | P1 | built, PR #147 |
| 4 | Ask for the monthly budget after the first entry, not before | A budget before any data is a guess. Home already offers "Set a monthly budget". The save screen then shows "spent so far" and can invite a budget right there. | Core job (first use) | P2 | built, PR #147 |
| 5 | Merge IOUs and Hissa Foshi into one "With friends" feature | Both are money with named people; people confuse them. A larger change: decide before building. | Adjacent job (sharing) | P3 | deferred: revisit with real users |
| 6 | Fold Money pools into Recurring | A pool is a monthly payment with a payout; it is a kind of recurring item. | Adjacent job | P3 | deferred: revisit with real users |

### Fix list (not cuts)
| # | Fix | Priority | Status |
|---|---|---|---|
| F1 | Replace the email-confirmation round trip with sign-in by one-time code or magic link on first sign-up, so the person never leaves the app | P1 | proposed (needs Supabase auth settings; owner decision) |
| F2 | Custom Supabase auth emails in Dhivehi and English with the app name and a clear button (today they are the default templates) | P2 | verify what is sent now |
| F3 | Confirm the About screen has real Terms and contact links in release builds (the placeholder line shows only if they are not set) | P2 | verify |
| F4 | A search that works across all months, not only the month shown | P3 | proposed |
| F5 | Native review of every Dhivehi string added in this journey (all drafts) | P1 | owner |

### Back of the fence (empty states, errors, billing, cancellation)
| Place | Finding | Fix |
|---|---|---|
| Empty states | Home, IOUs, Activity and Features all have designed empty states. | none |
| Error and crash | A calm full-screen message and a 404 screen exist. | none |
| Offline | Banner, queued saves and optimistic rows. Failure wording fixed in PR #145. | none |
| Billing and Plus | Fixed in PR #145: no unbuilt benefit, no dead purchase button. When store purchases go live, the buttons come back automatically. | verify the first real purchase end to end |
| Cancellation and deletion | Delete-account screen exists; Plus cancels in the store. | none |
| Receipt and account emails | The sign-up and sign-in emails are Supabase defaults unless customised (F2). | F2 |
| Web page | A minimal landing page. | none now |

## Opportunity Solution Tree Notes
Outcome: more new people reach their first saved entry and a second week. Opportunities: shorter first run (cuts 1, 2, 4, F1), one obvious action on Home (cut 3), trust in the numbers (no false zeros, no cut-off amounts, done), a calmer tone (done).

## Hook Model
Trigger: month-end surprise and, later, a daily reminder (none today). Action: keypad, category, Save. Variable reward: the save screen's "left this month" (new) and the Home panel. Investment: the budget, categories, and saved people. Weakest phase: the Trigger, since there is no reminder to log. Not built: a gentle daily or end-of-day reminder (see Activation plan).

## Activation & Retention Plan
| Friction / moment | Fix | Owner | Status |
|---|---|---|---|
| First run is about 12 screens | Cuts 1, 2, 4 | Claude | proposed |
| Email confirmation leaves the app | F1 | Owner decides | proposed |
| Nothing brings people back | An optional end-of-day reminder ("Anything to log today?"), off by default | Claude | not built, owner to decide |
| Day-1 empty Home | The empty state asks for one entry; after it, the save screen shows the month | Claude | built (PR #146) |

## Discovery Cadence
No user contact yet. Weekly touchpoint plan: one 15-minute call or message with a tester each week; ask them to add an entry and describe what they expected. Record in `docs/CUSTOMER.md` "Evidence log". Until then, every finding in `docs/DESIGN.md` is from audit, not users.
