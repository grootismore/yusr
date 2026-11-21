# Improve App Plan

## Context
- **App:** Kharadhu, a Dhivehi-first budgeting app for people in the Maldives (MVR), with Raseedhu receipt scanning and optional extras (debt-free plan, giving, household, Hissa Foshi, IOUs, pools, recurring, register). Expo (React Native) on iOS and Android, Supabase backend. Source of intent: `docs/kharadhu-prd.md`.
- **Date started:** 2026-11-21. Owner: Mohamed Areesh.
- **Job people hire it for (intake answer):** all three: see where the money goes; handle money together (partner, family, friends); get out of debt and settle up. Phase 1 turns this into one core job plus adjacent jobs.
- **Roughest areas (intake):** confusing screens, looks amateur, dead interactions, weak or odd wording (especially Dhivehi).
- **Evidence (intake):** none yet beyond the owner's own screenshots and notes. The journey leans on audits of the screens themselves. Optional later: continuous-discovery.
- **Platforms:** native iOS and Android. Web is a limited landing page only.
- **Upsell surfaces:** Kharadhu Plus screen (benefits list, promo code box, "Get Plus"). Store purchases are not on sale yet (`src/lib/purchases.ts` is a stub), so the honesty check in Phase 7 matters.
- **Docs that already existed:** none of CUSTOMER, DESIGN, POSITIONING, PRODUCT, EXPERIMENTS. Created by this journey.

## Phase Status
| Phase | Skill | Status | Artifact | Date |
|---|---|---|---|---|
| 1 | jobs-to-be-done | done | CUSTOMER.md | 2026-11-21 |
| 2 | ux-heuristics | done | DESIGN.md, EXPERIMENTS.md | 2026-11-21 |
| 3 | design-everyday-things | done | DESIGN.md, EXPERIMENTS.md | 2026-11-21 |
| 4 | refactoring-ui | done | DESIGN.md, EXPERIMENTS.md | 2026-11-21 |
| 5 | microinteractions | done | DESIGN.md, EXPERIMENTS.md | 2026-11-21 |
| 6 | made-to-stick | done | POSITIONING.md, EXPERIMENTS.md | 2026-11-21 |
| 7 | influence-psychology | done | POSITIONING.md, EXPERIMENTS.md | 2026-11-21 |
| 8 | high-perf-browser | skipped: native app, no browser surface; a short "feels fast" check is folded into Phase 5 | DESIGN.md | 2026-11-21 |
| 9 | steve-jobs-design-review | done | PRODUCT.md, DESIGN.md, EXPERIMENTS.md | 2026-11-21 |
Statuses: pending · in-progress · awaiting-evidence · done · deferred: <reason> · skipped: <reason>

## Key Decisions
| Date | Phase | Decision | Rationale |
|---|---|---|---|
| 2026-11-21 | Intake | Run all phases except Phase 8 | Kharadhu is native; browser metrics (INP, LCP, CLS) do not apply. Perceived speed is checked in Phase 5. |
| 2026-11-21 | Intake | Roughest areas: confusing screens, amateur look, dead interactions, weak wording | Sets Phases 2, 4, 5 and 6 as the heavy ones. |
| 2026-11-21 | 1 | Core job: see where the money goes; household, debts and giving are adjacent jobs | Keeps one job to aim at; matches the Features switches. Owner confirmed. |
| 2026-11-21 | 1 | Worst gap: emotional (calm and in control) | Busiest screen and the red over-budget alarm work against calm. Owner confirmed. |
| 2026-11-21 | 1 | Both first use and daily use get audited | Owner chose both equally. |
| 2026-11-21 | 2 | Fix all four severity-3 findings (U1 tab labels, U2 no cut-off amounts, U3 calm over-budget, U4 Plus honesty) | Owner chose all four; ordered by severity times screen frequency. |
| 2026-11-21 | 2 | Fix severity 1-2 findings (U5-U11) in the same pass, including Activity search | Owner chose the full pass. |
| 2026-11-21 | 2,3 | Phases 2 and 3 run from the built-in method (ux-heuristics and design-everyday-things skills not installed) | Owner declined nothing; fallback is allowed by the journey. |
| 2026-11-21 | 3 | Undo replaces the confirm dialog for entries, payments and people; whole groups and the account keep the dialog | Owner chose the recommended option. |
| 2026-11-21 | 3 | Constraint over error: hint under an empty amount; Save waits for a category | Owner chose the recommended option. |
| 2026-11-21 | 4 | Ship: lift cards off the page colour, tone down the panel watermark, Add expense as the dominant Home action | Owner chose all three. No new palette: the token system is already sound. |
| 2026-11-21 | 5 | Signature moment: the save screen shows what is left this month | Owner chose it. Passes the removal test. |
| 2026-11-21 | 5 | Ship M1 press feedback, M3 loading placeholder, M4 switch haptic, M5 pull to refresh | Owner chose all four. |
| 2026-11-21 | 6 | Ship all the English copy rewrites; introduce Raseedhu once | Owner chose the recommended option. |
| 2026-11-21 | 7 | Plus: remove unbuilt benefit, show "Not on sale yet", keep the promo code, lead with what is free | Owner chose the recommended option. |
| 2026-11-21 | 2-7 | Fixes built as PRs #142 to #146 | Evidence before redesign: each PR cites its finding. |
| 2026-11-21 | 9 | Accept cuts 1-4 (drop the who-is-this-for step, intro pages 3 to 2, Home keeps only Add expense, budget asked after the first entry) | Owner accepted all four; built as PR #147. |
| 2026-11-21 | 9 | Leave the "With friends" merge and folding pools into recurring for later | Large changes to working features; revisit with real users. |
| 2026-11-21 | 9 | Leave the sign-up and sign-in emails as they are | Owner chose to backlog it. |
| 2026-11-21 | Intake | No usage evidence yet | Findings come from audits of the shipped screens, tagged by who found them (audit vs the owner's report). |

## Next Actions
The journey is complete. Carried into the owning artifacts:
- [ ] Merge PRs #142 to #147 in order (#142, #143, #144, #145, #146, then #147 which sits on #146) (Areesh)
- [ ] Verify on a phone: tab labels, Undo, pull to refresh, the save screen, the Plus screen, the shorter first run (Areesh)
- [ ] Native review of every Dhivehi string added (Areesh or a reviewer) (`docs/PRODUCT.md` F5)
- [ ] Start talking to testers weekly and fill `docs/CUSTOMER.md` "Evidence log" (`docs/PRODUCT.md` Discovery Cadence)
- [ ] Revisit the "With friends" merge and folding pools into recurring once real use shows the confusion (`docs/PRODUCT.md` cuts 5 and 6)
- [ ] Decide on sign-in without leaving the app and custom auth emails (`docs/PRODUCT.md` F1, F2)
- [ ] Optional end-of-day reminder, off by default (`docs/PRODUCT.md` Activation plan)
- Forward routing: when the experience holds up and the goal shifts to habit and growth loops, continue with the grow-app skill.
