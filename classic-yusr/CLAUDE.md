# Yusr: rules for agents and contributors

Read `docs/PRD.md` fully before writing code. It is the source of truth. If something touching privacy, security or religious content is ambiguous, ask before building.

## Stack
Expo (React Native) + TypeScript strict, Expo Router, Supabase (Postgres, Auth, RLS, Edge Functions, pg_cron), Resend, TanStack Query with offline mutation queue + expo-sqlite, i18next (en + dv, RTL), EAS.

## Non-negotiable rules
1. Money is integer laari (100 per MVR). No floats. All money logic in `src/lib/money` with unit tests.
2. RLS on every table, with tests proving user A cannot read or write user B's data. The service-role key never goes in the client.
3. Trusted contacts read the Wasiyyah register only when a `release_case` is `released`, enforced in the database (RLS + security-definer function).
4. The release flow is a server-side state machine in Edge Functions with an audit log and a kill switch. No release without human confirmation from trusted contacts. Test every transition and edge case in PRD section 5.
5. Never store bank passwords, PINs, card numbers or ID numbers. Never send amounts, lender names or notes to analytics or crash reporting.
6. All user-facing strings go through i18n. Layouts must work in RTL.
7. Zakat and inheritance screens are guidance only: show assumptions, never claim a ruling.
8. Follow Apple HIG: native navigation, large titles, sheets, Dynamic Type, semantic colors, light and dark mode, 44pt targets, VoiceOver and TalkBack labels.
9. Small commits. Run typecheck, lint and tests before each commit.

## Working style
- Plan each PRD phase briefly and wait for approval before coding it.
- Build in PRD phase order. Add nothing that is not in the PRD without asking.
- After each phase: what was built, what was tested, what is left, what was unclear.
- Before any store submission, every item in `docs/LAUNCH_CHECKLIST.md` must be done with evidence.
