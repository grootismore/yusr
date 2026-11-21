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
| 2 | ux-heuristics | pending | DESIGN.md, EXPERIMENTS.md | |
| 3 | design-everyday-things | pending | DESIGN.md, EXPERIMENTS.md | |
| 4 | refactoring-ui | pending | DESIGN.md, EXPERIMENTS.md | |
| 5 | microinteractions | pending | DESIGN.md, EXPERIMENTS.md | |
| 6 | made-to-stick | pending | POSITIONING.md, EXPERIMENTS.md | |
| 7 | influence-psychology | pending | POSITIONING.md, EXPERIMENTS.md | |
| 8 | high-perf-browser | skipped: native app, no browser surface; a short "feels fast" check is folded into Phase 5 | DESIGN.md | 2026-11-21 |
| 9 | steve-jobs-design-review | pending | PRODUCT.md, DESIGN.md, EXPERIMENTS.md | |
Statuses: pending · in-progress · awaiting-evidence · done · deferred: <reason> · skipped: <reason>

## Key Decisions
| Date | Phase | Decision | Rationale |
|---|---|---|---|
| 2026-11-21 | Intake | Run all phases except Phase 8 | Kharadhu is native; browser metrics (INP, LCP, CLS) do not apply. Perceived speed is checked in Phase 5. |
| 2026-11-21 | Intake | Roughest areas: confusing screens, amateur look, dead interactions, weak wording | Sets Phases 2, 4, 5 and 6 as the heavy ones. |
| 2026-11-21 | 1 | Core job: see where the money goes; household, debts and giving are adjacent jobs | Keeps one job to aim at; matches the Features switches. Owner confirmed. |
| 2026-11-21 | 1 | Worst gap: emotional (calm and in control) | Busiest screen and the red over-budget alarm work against calm. Owner confirmed. |
| 2026-11-21 | 1 | Both first use and daily use get audited | Owner chose both equally. |
| 2026-11-21 | Intake | No usage evidence yet | Findings come from audits of the shipped screens, tagged by who found them (audit vs the owner's report). |

## Next Actions
- [ ] Phase 2: heuristic evaluation of Home, add entry, scan, budget, reports and the first-time path, rated 0-4 (Claude, next)
