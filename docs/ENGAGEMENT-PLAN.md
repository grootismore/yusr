# Engagement plan (saved, not started)

Status: **saved for later.** Nothing here is built. Start only when the owner says "Go" (items 1 to 4) or "Goals first" (item 5).

Goal: make Kharadhu more interesting and habit-forming, honestly. People should come back because it helps them and feels good, never because they fear losing something.

## Rules (honest persuasion)
- Every nudge is opt-in, off by default, and one tap to turn off.
- No guilt or loss framing ("you'll lose your streak"), no fake urgency, no dark patterns.
- Insights and recaps come from the person's own data, in plain words (and Dhivehi drafts for native review).
- Celebrate effort, not perfection: missing a day never costs anything.
- Money stays integer laari; all copy in i18n; Dhivehi first with full right-to-left.

## Items, in order

1. **Evening reminder (opt-in).** One local notification at a time the person picks ("Anything to log from today?"). Skipped when something was already logged that day. Settings: on/off and time. No database change.
2. **Weekly recap on Home (Sunday and Monday).** "You spent MVR X this week, Y% less than last week. Most went to Food. You are on track for the month." Derived from existing expenses and budgets; dismissible. No database change.
3. **Gentle logging rhythm.** "You logged 5 days this week", no streak to lose, no guilt after a missed day. A small celebration (haptic and short animation) when a week is full. No database change.
4. **One insight a day on Home.** One plain sentence from their data ("Food is higher than usual this month"). At most one a day, dismissible, with a way to hide insights. No database change.
5. **Savings goals.** "Hajj fund", "Eid", "Wedding": a progress ring, milestone moments at 25, 50 and 100 per cent. The biggest motivator, but it needs a new table and RLS, so it waits for "Db push" (apply in small pieces).

## Build order and checks
- One PR per item, each with before and after screenshots in English and Dhivehi, tests for the pure logic (week windows, "no entry today" skip, insight selection, rhythm counts), and tsc, eslint and jest passing.
- Measure before and after where possible (see `docs/EXPERIMENTS.md`): days with an entry per active week, week-4 return.

## Later ideas (not planned)
Home-screen or lock-screen quick-add widget (needs a dev build and native targets); seasonal helpers for Ramadan and Eid budgets; a shareable monthly summary card.
