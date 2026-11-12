# UX audit, 3 November 2026

Two lenses: **ux-heuristics** (Nielsen's 10 + Krug, severity 0 to 4) and **hooked-ux** (Hook Model, with its ethics gate).
Evidence: the app's code and its English copy on `main` after PRs #46 to #50. **Not tested on a device**, and the Dhivehi side is not covered.

Yusr's own rules apply to everything below: calm tone, no guilt, streaks or fake urgency (PRD section 3 and launch item 9). Anything that would be new to the PRD is marked **needs approval** and is not built.

## 1. Usability (ux-heuristics): 7 / 10

Three failed Quick Diagnostic rows: first-run path (major), undo (minor), buried reminders (minor).

| # | Sev | Heuristic | Finding | Fix |
|---|-----|-----------|---------|-----|
| 1 | 3 | Krug 1, 7 | **Value comes late.** First record = sign up (3 switches) → intro → Home empty state → More → Account form → back → New transaction. The "Add an account first" screen in the transaction sheet sends people to More. | Create a default **Cash** account at first sign-in (renameable), or let the transaction sheet add one inline. The first transaction is then one sheet. |
| 2 | 3 | 5, 9 | **Sign out can lose data.** "Some changes haven't synced and will be lost. Sign out anyway?" is honest but leaves the person with only bad options. | Offer **Try to sync now** first; only warn if that fails. |
| 3 | 2 | 3 | **Confirm instead of undo.** Delete transaction asks "Are you sure?" (also after a swipe). People click through these. | A short **Undo** bar after delete; keep the confirm only for debts, accounts and account deletion. |
| 4 | 2 | 6, 10 | **Reminders live only in Settings → Reminders.** A person who adds a bill, debt due day or Sadaqat plan is never asked, so the reminder never fires. | See hooked-ux #1. |
| 5 | 2 | 2 | **Vocabulary the first-time user has to decode.** "Riba" as a payoff order, "Amanah", "Safe to spend" vs "You can safely spend" (two phrasings of one idea). | Keep Dhivehi/Islamic terms where the audience expects them, but use one phrase for the home number, and give "Riba" its one-line meaning at the control (the "What is the difference?" row covers most of it). |
| 6 | 1 | 4 | "Sadaqat" (tab, plural) and "Sadaqah" (type, singular) side by side. | Fine linguistically; check the Dhivehi side uses one spelling per place. |
| 7 | 1 | 4 | Three separate consent switches at sign-up. | Required by the PRD (no pre-ticked boxes); keep, but make "Create account" read what is missing, not only "Please confirm all three". |

What passes: plain action labels (Add debt, Add Sadaqat, Mark done), explanations in place (How is this worked out?, What is the difference?), discard guards on forms, inline validation text that says what to enter ("like 1,250.00"), empty states with one action, 44pt targets and screen-reader labels, offline sync status ("Waiting to sync"), app lock with a consent screen.

**To reach 10/10:** fix #1 and #2 (major), then #3 and #4.

## 2. Habit loop (hooked-ux): 6 / 10, ethics gate clear

**Ethics gate.** Manipulation Matrix: *Facilitator* (it materially helps people manage debt, giving and what they leave behind). No cap on the score. The loop below must stay **calm**: no streaks, no badges, no "you missed a day". Variable reward here means *real information that changes*, never a slot-machine effect.

| Row | Score | Today | Gap |
|-----|-------|-------|-----|
| Internal trigger | 1 | The need is real: "where did my money go / what is due / am I on top of my obligations". Triggers today are external only (due-date reminders, if switched on). | Tie the product to the moments the need already occurs: payday, month end, Friday, a bill due. |
| Action is dead simple | 2 | Amount only for a repeat category and account; reminders open a pre-filled sheet from Home. | First-run path (usability #1). |
| Variable reward | 1 | The Home number ("You can safely spend") and "Debt-free by" change with real data, which is a good, honest reward. But saving a transaction just closes the sheet; the person does not see what it did. | Show the effect on the number (below). |
| Investment loads next trigger | 1 | Accounts, categories, bills, debts and Sadaqat plans all schedule future due dates. | They only become reminders if notifications are on, and the permission is asked in Settings, not when the bill is added. |

Score = round(5 / 8 × 10) = **6**.

### Recommendations, in order

1. **Ask for reminders at the moment of investment.** After the person saves their first bill, debt with a due day, or Sadaqat plan: one sheet, "Remind me when this is due? No amounts or names are shown." Allow / Not now. Never at launch (the code already follows this) and never again after Not now, except from Settings. *Within the PRD (reminders are in the MVP); copy is new.*
2. **Show what the entry did.** After saving, return to Home with the number updated and a single quiet line such as "Safe to spend is now MVR 1,240" (or "Short by MVR 80 this month"). It is the reward, it is true, and it is private-mode aware. *New to the PRD: needs approval.*
3. **Make the first transaction a one-sheet job** (usability #1). This is the biggest drop-off risk in the whole product.
4. **Month-end "how did it go?" card on Home**, factual only: what came in, what went out, what was given, what is left; one tap to start next month. No scores, no comparisons with other people. *Needs approval; Home already has the data.*
5. **Do not add**: streaks, daily-use nudges, gamified giving, "you haven't opened Yusr" notifications. The PRD rules them out and the Manipulation Matrix would move Yusr toward *Entertainer* or worse.

### What to measure once there are testers (no amounts, names or notes, per rule 5)

Per person: first transaction within 24 h, reminders switched on, bills/plans added, second-week return. A habit exists when about 5% of people come back unprompted, with no reminder (hooked-ux "5% rule").

## Status: fixed on branch `ux-audit-fixes`

| Finding | What changed |
|---------|--------------|
| Usability #1 | New **Use a Cash account** button, on Home and in the transaction sheet: one tap, then the sheet is ready. "Add account" stays as the second choice. |
| Usability #2 | Sign out with waiting changes now says it will **sync first** (Sync, then sign out). Only if that fails does the old "will be lost" warning appear. |
| Usability #3 | Deleting a transaction (sheet, swipe, screen-reader action) no longer asks; a bar offers **Undo** for 7 seconds (also offline: the restore is queued after the delete). Debts, accounts and account deletion still ask. |
| Usability #4, hooked-ux #1 | After adding a new bill, a debt with a due day, or a Sadaqat plan with a reminder, **one** question: "Remind you when this is due?" Allow shows the system prompt; Not now is remembered. Never at launch. |
| Usability #5 | One phrase for the Home number: "Safe to spend". "Riba" already has its one-line meaning under the selector. |
| Usability #6 | Checked in the code: tab and plans use "Sadaqat", the type list uses "Sadaqah". Left as is; needs the Dhivehi reviewer's view. |
| Usability #7 | The sign-up message now names what is still unticked. |
| hooked-ux #2 | After saving a new entry: "Saved. Safe to spend this month: MVR x" (or "Short by MVR x"). Plain "Saved" when it would reveal private-mode giving. |
| hooked-ux #4 | Home shows **How October went** during the first week of a month (income, expenses, Sadaqat, net; net and Sadaqat hidden in private mode), with Hide this. No scores or comparisons. |
| hooked-ux #3 | Same as usability #1. |
| hooked-ux #5 | Nothing added: no streaks, nudges or gamified giving. |

## Next step

Try it on a phone (new beta build), then re-run both skills. Dhivehi for the new strings is mine and needs a native review.


If you agree, the order is: usability #1 and #2, then hooked-ux #1, then #2 and #3 of usability. I will plan each briefly and wait for approval, as CLAUDE.md asks.

## Round 2: UI/UX Pro Max checklist and a shorter Home

The skill's generated style (blue glassmorphism, handwriting font) did not fit Yusr's brand, the Faseyha Dhivehi font or contrast needs, so it was not applied; its minimal + accessible direction was kept. Its native checklist found:

| Check | Result | Change |
|-------|--------|--------|
| Contrast AA, light and dark | Passed, but only by hand | `theme.test.ts` now checks every text colour on every surface in both themes (and text on the brand green). |
| Pressed feedback | Missing on chips, segmented control, header buttons | Opacity feedback added (no layout shift). |
| Reduced motion | Not handled | `useReducedMotion`; swipe-to-delete moves instantly when it is on. |
| Large screens | Content ran edge to edge on iPad | Screens keep a 640pt centred column. |
| Tokens | Brand gradient copied in 4 places | One `BRAND` token. |
| Disclosure state | Open/closed not announced | Rows that open more rows are announced as expanded or collapsed. |
| Home length | Seven sections before the end | Order is now: number, how it is worked out, coming up, accounts, this month; "Where it went" is closed until tapped. |
