# Yusr PRD

Nov 1, 2026 · @Mohamed Areesh

## 1. Overview

Yusr is one iOS and Android app that lets a Maldivian Muslim manage income, expenses, debts and giving in an Islamic way, and leaves a secure record for their family if they pass away. Debts and trusts (amanah) are tracked in one place, so nothing is left hidden.

**Problem.** Budget apps ignore zakat, sadaqah and riba, and none handle the family's duty to settle a deceased person's debts first. A friend of the author died owing about MVR 200,000 to banks that nobody knew about. That is the motivating case for the whole product.

**Target users.** Maldivian adults, 22 to 55, salaried or self-employed, using MVR, banking with BML, MCB, SDFC or Maldives Islamic Bank, comfortable in Dhivehi or English.

**Product principles**

- Privacy first: financial data is sensitive and giving is private. Sadaqah amounts can be hidden.
- Guidance, not fatwa: zakat and debt rules show their assumptions and can be adjusted.
- Calm and respectful: no guilt, streak pressure or gamified giving.
- Offline-tolerant: logging an expense must work with poor connectivity.
- Fully Dhivehi (RTL) and English from day one.

**Success metrics (first 6 months)**

- 40% of new users log 5 or more transactions in week 1
- 30% of active users add at least one debt
- 25% of users add a trusted contact
- Less than 1% false-trigger rate on the release flow (target: zero)

## 2. Scope

The MVP ships the core money loop, the debt plan and the Wasiyyah register with a manual share option. The automated release flow comes in v1.1 because it carries the highest risk and needs the most testing.

| Release | Includes |
| --- | --- |
| MVP (v1.0) | Auth + biometric lock, accounts, income and expense logging, categories (Maldivian defaults), budget with reserved debt and giving, debt tracker with snowball and avalanche, riba flag, sadaqah and zakat-type commitments with reminders, Hijri calendar, Wasiyyah register, trusted contacts, manual share, Dhivehi + English |
| v1.1 | Automated check-in ladder and two-contact confirmation, away mode, zakat calculator with nisab, push notifications, home-screen widgets |
| v1.2 | Bank SMS import helper, receipts, CSV export, family or couple shared budget |
| Later | Client-side encrypted register, Hajj and Umrah savings goals, Islamic financing (murabaha) tracking, iPad layout |

**Out of scope for v1.** Bank account linking (no open banking in the Maldives), investment tracking, payments or money transfer, fatwa or legal advice, and any storage of bank passwords.

**Pricing model: Yusr (free) and Yusr+ (optional).** Decision: Yusr is fully free at launch, with no paid tier, ads or in-app purchases. Yusr+ and a voluntary "Support Yusr" tip are possible later additions, to be revisited once there are real users. The app name stays "Yusr"; "Yusr+" is only the name of the paid tier.

| Tier | Includes |
| --- | --- |
| Yusr (free, always) | Income and expenses, budget, debt-free plan, giving commitments, Hijri calendar, the full Wasiyyah register, trusted contacts and the release flow, data export on request, account deletion |
| Yusr+ (optional) | Shared budget with a partner or family, saved zakat history and reports, home-screen widgets, CSV and PDF export, receipt attachments, extra themes |

**Pricing rules**

- The Wasiyyah register and release flow are never paywalled. A lapsed subscription must not cut a family off from the debt list.
- If a subscription ends, Yusr+ features become read-only. No data is ever deleted or locked.
- Price, billing period and renewal terms are shown before purchase, with no hidden fees and no pre-ticked upsells.
- Purchases use Apple and Google in-app billing. Refunds follow their rules, linked from the refund policy.
- A voluntary one-time "Support Yusr" tip is optional and gives no extra features.
- These rules apply only if Yusr+ is introduced later. Until then, every feature above is free.

## 3. Feature requirements

**3.1 Onboarding and security**

- Email or phone sign-up with Supabase Auth, plus Sign in with Apple (required on iOS when other social logins exist).
- Face ID, Touch ID or fingerprint app lock, with an auto-lock timeout.
- Language choice (Dhivehi or English) and currency (MVR default, USD optional) on first launch.

**3.2 Accounts, income and expenses**

- Accounts: cash, BML, MCB, SDFC, Maldives Islamic Bank, other. Balance is derived from transactions.
- Add a transaction in under 5 seconds: amount, category, account, date, optional note. Works offline and syncs later.
- Maldivian default categories: salary, allowance, rent, STELCO, MWSC, Dhiraagu and Ooredoo, groceries, ferry and transport, school, family support, medical, and Islamic giving.
- Recurring items (salary, rent, utilities) with a due-day reminder.
- Monthly view: income, expenses, net, and category breakdown.

**3.3 Debt-free plan**

- Debt fields: lender (bank, person, store, other), original and current balance, minimum payment, due day, interest-bearing flag, reference or account number, notes.
- Strategies: snowball, avalanche, and "riba first" (clear interest-bearing debt first).
- Logging a payment creates an expense and reduces the balance in one action.
- Projected debt-free date and a payoff timeline.
- Debts owed to the user are tracked separately as receivables.

**3.4 Budget**

- The monthly budget reserves, in order: debt minimums, giving commitments, then fixed bills. What is left is shown as "safe to spend".

**3.5 Giving and commitments**

- Types: sadaqah, zakat, zakat al-fitr, fidya, kaffarah, sadaqah jariyah.
- A commitment has an amount, a schedule (one-off, weekly such as Fridays, monthly, Ramadan, or Dhul Hijjah), a recipient note and a reminder.
- Marking a commitment done logs a transaction in the matching category.
- Private mode hides giving amounts and recipients on screen.

**3.6 Zakat (v1.1)**

- Inputs: cash, savings, gold, silver, trade goods, receivables, and debts due. The user sets the nisab value and the hawl date.
- Output: zakat due at 2.5%, with the assumptions shown and a note to consult a scholar for complex cases.

**3.7 Wasiyyah and Amanah**

See section 5.

**3.8 Settings**

- Data export, delete account and all data, notification controls, trusted contacts, and privacy mode.

## 4. Islamic guardrails and Maldivian localization

**Guardrails**

- The app gives guidance and never issues rulings. Zakat and inheritance screens state their assumptions and recommend consulting a scholar for complex cases.
- Interest-bearing debt gets a gentle nudge to clear it first, with no shaming language.
- Debts are treated as an amanah: the app encourages prompt repayment and clear records.
- Wasiyyah copy reflects that debts are settled first, before bequests and inheritance. Inheritance shares are not calculated in v1.
- Optional short duas appear in context (for example debt relief), never as pop-ups.
- Content review by a qualified Maldivian scholar before launch.

**Localization**

- Dhivehi (Thaana, right-to-left) and English, with a full RTL mirrored layout. Numerals follow the user's choice.
- Gregorian and Hijri dates side by side. Hijri via a library such as Umm al-Qura, with a manual day adjustment of plus or minus 1.
- MVR by default, formatted correctly (for example MVR 1,250.00).
- Maldivian banks, utilities and island-council or mosque contribution categories.
- All strings live in translation files from the start. Nothing is hard-coded.

## 5. Wasiyyah and Amanah: register and release flow

The register stays hidden from everyone until a release is confirmed by people, not by a timer alone.

**What the register holds**

- Debts: lender, approximate balance, reference number, and who to contact first.
- Money owed to the user (receivables).
- Pending giving: sadaqah commitments, zakat owed, missed fasts and fidya.
- A free-text instruction note for the family.
- Never stored: bank passwords, PINs, card numbers or ID numbers.

**Trusted contacts.** One to three people, invited by link. Each accepts the role explicitly and cannot see anything until release.

**Release states**

1. **Active.** Any login, transaction, or tapped reminder resets the inactivity timer.
2. **Quiet.** After 30 days of no activity, the user gets a push and an email with a one-tap "I'm okay".
3. **Second check-in.** Seven days later, another push and email.
4. **Contacts asked.** If there is still no response, trusted contacts are asked to confirm: "They're fine" cancels the flow, "They have passed away" counts as a confirmation.
5. **Released.** With 2 or more contacts, the register opens after 2 matching confirmations. With only 1 contact, it opens after a further 14 days without the user responding.
6. **Cancel.** The user can cancel at any point before release by simply opening the app.

**Away mode.** The user can pause the flow for up to 90 days (Hajj, Umrah, travel, hospital stays), with a reminder before it ends.

**Edge cases to handle**

- A contact who confirms "passed away" while the user is alive: the user is notified immediately and can cancel.
- Contacts changing their mind: confirmations can be withdrawn until release.
- User deleted the account: the register and contacts are deleted too.
- Every state change is written to an audit log visible to the user.

The flow is verified with automated tests and a staging dry run before it is enabled for real users.

## 6. UX and Apple HIG design direction

The design follows Apple's Human Interface Guidelines on both platforms, so the app feels native on iOS and consistent on Android.

- **Navigation.** Bottom tab bar with 5 tabs: Home, Transactions, Debts, Giving, More. Large titles that collapse on scroll. Sheets for adding items, with swipe-to-dismiss.
- **Typography.** System font (SF Pro on iOS) with Dynamic Type support. Thaana uses a dedicated Dhivehi font, tested at every text size.
- **Color and theme.** Semantic colors, full light and dark mode, calm palette (muted green and warm neutral), red only for overdue or destructive actions.
- **Components.** Grouped inset lists, swipe actions, native-feeling pickers, haptic feedback on completing a payment or commitment, SF Symbols style icons.
- **Home screen.** Safe-to-spend card, upcoming due debts and commitments, a month income vs. expense bar, and the debt-free date.
- **Wasiyyah screen.** Plain and reassuring. A readiness checklist: debts added, contact invited, instruction note written.
- **Accessibility.** VoiceOver and TalkBack labels, 44 pt minimum touch targets, WCAG AA contrast, Reduce Motion respected, RTL mirrored correctly.
- **Tone.** Short, kind microcopy. No guilt or streak mechanics.

Design deliverables before coding: a design system (tokens and components), then high-fidelity screens for Home, Add Transaction, Debt Detail, Giving, and Wasiyyah, in English and Dhivehi.

## 7. Technical architecture

One Expo codebase ships to both stores, backed by Supabase.

| Layer | Choice |
| --- | --- |
| App | Expo (React Native) + TypeScript, Expo Router |
| State and data | TanStack Query with an offline mutation queue; local cache in expo-sqlite |
| Backend | Supabase: Postgres, Auth, Row Level Security, Edge Functions |
| Scheduling | pg\_cron triggers a daily Edge Function that runs the release ladder |
| Email | Resend (check-in and trusted contact emails) |
| Push | expo-notifications (APNs and FCM) |
| Local security | expo-local-authentication, expo-secure-store |
| i18n | i18next with Dhivehi and English; I18nManager for RTL |
| Hijri dates | Intl islamic-umalqura calendar or a small library, with manual adjustment |
| Builds and releases | EAS Build, EAS Submit, EAS Update for JS-only fixes |
| Monitoring | Sentry (crashes), PostHog or similar (privacy-respecting, no financial values) |

**Important hosting note.** Supabase free projects pause after a week of inactivity. The release flow depends on a daily job, so production must run on a paid plan with backups (PITR) enabled.

**Repo structure.** One repo with `app/` (screens), `src/features/` (transactions, debts, giving, zakat, wasiyyah), `src/lib/` (supabase, i18n, hijri, money), `supabase/migrations/`, and `supabase/functions/`.

**Money handling.** Amounts are stored as integers in the smallest unit (laari, 100 per MVR), never as floats.

## 8. Data model and RLS

Every table has `id uuid`, `user_id uuid` (owner), `created_at`, `updated_at`, and a soft-delete `deleted_at` where history matters. Row Level Security is enabled on every table, with the default policy `user_id = auth.uid()`.

| Table | Key fields |
| --- | --- |
| profiles | language, currency, hijri\_adjustment, privacy\_mode, last\_active\_at, away\_until |
| accounts | name, type, opening\_balance\_laari |
| categories | name\_en, name\_dv, kind (income, expense, giving), is\_default |
| transactions | account\_id, category\_id, amount\_laari, kind, occurred\_on, note, debt\_id, commitment\_id |
| recurring\_items | template fields, schedule, next\_due\_on |
| debts | lender, kind (bank, person, store, other), original\_laari, balance\_laari, min\_payment\_laari, due\_day, is\_interest\_bearing, reference\_no, notes |
| receivables | debtor, amount\_laari, due\_on, notes |
| commitments | type (sadaqah, zakat, fitr, fidya, kaffarah, jariyah), amount\_laari, schedule, recipient\_note, active |
| zakat\_profiles | nisab\_laari, hawl\_start\_hijri, inputs (json) |
| trusted\_contacts | name, email, phone, status (invited, accepted, revoked) |
| release\_cases | state, started\_at, away\_until, released\_at |
| release\_confirmations | case\_id, contact\_id, answer (fine, passed), answered\_at |
| wasiyyah\_notes | instruction text |
| audit\_log | actor, event, case\_id, timestamp |

**Access rules**

- Owners read and write their own rows only.
- Trusted contacts read the register (debts, receivables, commitments, note) only when a `release_case` for that owner is in the released state. This is enforced by an RLS policy plus a security-definer function, never by app code alone.
- Contacts do not need full accounts: they sign in with a magic link and see a read-only register view.
- The release state machine runs in Edge Functions with the service role. Clients cannot change case state directly.
- Balances in debts are derived or validated server-side to avoid drift against payments.

## 9. Security and privacy

- **Transport and storage.** TLS everywhere, encrypted database at rest, secrets only in Edge Function environment variables and EAS secrets. The service-role key never ships in the app.
- **App protection.** Biometric lock, session tokens in secure storage, screen content hidden in the app switcher, optional screenshot blocking on the Wasiyyah screen on Android.
- **Authorization.** RLS on all tables, tested with automated policy tests (user A can never read user B). Contact access only through the release-state check.
- **Sensitive fields.** Reference numbers and the instruction note are encrypted at the column level (pgsodium or application-level encryption) as a first step.
- **Honest limitation.** In v1 the app owner could technically read data with database access. The privacy policy says so plainly. Client-side end-to-end encryption of the register is planned for a later release.
- **Data minimization.** No bank passwords, no card numbers, no national ID numbers. Analytics never contain amounts, lender names, or note text.
- **Abuse protection.** Rate limits on auth and invite endpoints, invite links that expire, and contact emails verified before they receive anything.
- **User rights.** In-app export and account deletion that removes all data, including contacts and cases.
- **Release safety.** No automatic release without human confirmation. Two-contact rule by default. Full audit log. Kill switch to disable the flow server-side.
- **Compliance.** Privacy policy and terms, App Store privacy labels and Play Data Safety form filled accurately, and a review of Maldivian data-protection requirements before launch.
- **Quality gates.** Dependency audit in CI, secret scanning, and a pre-launch security review (RLS, auth, Edge Functions).

## 10. Publishing, roadmap, risks and open questions

**Store publishing**

- Apple Developer Program (USD 99 per year) and Google Play Console (USD 25 one-time) accounts. Publishing as an individual or a registered business changes the listing name, so decide early.
- Apple review: Sign in with Apple, account deletion inside the app, accurate privacy labels, and a clear explanation that the app gives no financial or religious rulings.
- TestFlight and Play internal testing with 10 to 20 trusted Maldivian testers before public launch.
- Store listings in English and Dhivehi.

**Roadmap**

| Phase | Outcome | Rough time |
| --- | --- | --- |
| 0. Design | Design system, key screens in EN and DV, scholar review of copy | 2 to 3 weeks |
| 1. Foundation | Expo app, auth, RLS, i18n and RTL, money library, CI | 2 weeks |
| 2. Core loop | Accounts, transactions, categories, budget, offline queue | 3 weeks |
| 3. Debts and giving | Debt plans, commitments, Hijri dates, reminders | 3 weeks |
| 4. Wasiyyah MVP | Register, trusted contacts, manual share, audit log | 2 weeks |
| 5. Beta and launch | Security review, testers, store submission | 3 weeks |
| 6. v1.1 | Automated release ladder, zakat, widgets | 4 weeks |

Estimates assume one developer working part-time alongside a full-time job; adjust to your pace.

**Risks**

- A false-positive release would expose private data. Mitigation: human confirmation, two contacts, audit log, kill switch.
- Religious content errors. Mitigation: scholar review and visible assumptions.
- Dhivehi RTL and Thaana font bugs. Mitigation: RTL from day one, device testing.
- Supabase pausing on a free plan. Mitigation: paid plan before launch.
- Store rejection over finance or religion claims. Mitigation: careful wording and disclaimers.

**Open questions**

1. Final app name and whether it publishes under your name or a business.
2. Decided: free for now. Revisit Yusr+ and the "Support Yusr" tip after launch. A sadaqah-friendly app may fit a free model.
3. Shared budget with a partner in v1.2, or never?
4. Which scholar or institution reviews the content?
5. Should trusted contacts be required to install the app, or is a web link enough? The PRD assumes a web link.

## 11. Starter prompt for Claude Code

Paste this into a new Claude Code session at the root of an empty repo, and keep this PRD in the repo as `docs/PRD.md`.

```text
You are the lead engineer for "Yusr", an iOS and Android app for Maldivian Muslims that combines income and expense tracking, a debt-free plan, Islamic giving (sadaqah, zakat and related commitments), and a "Wasiyyah & Amanah" register that securely lets trusted people see the user's debts and obligations after the user passes away.

Read docs/PRD.md fully before writing code. It is the source of truth. If something is ambiguous, ask me before building; do not guess on anything touching privacy, security or religious content.

STACK
- Expo (React Native) + TypeScript (strict), Expo Router
- Supabase (Postgres, Auth, RLS, Edge Functions, pg_cron), Resend for email
- TanStack Query with an offline mutation queue, expo-sqlite cache
- i18next with English and Dhivehi (Thaana, RTL) from day one
- expo-local-authentication, expo-secure-store, expo-notifications
- EAS Build and EAS Submit

NON-NEGOTIABLE RULES
1. Money is stored as integer laari (100 per MVR). Never use floats for money. Put all money logic in src/lib/money with unit tests.
2. Every table has Row Level Security enabled. Write RLS policy tests proving user A cannot read or write user B's data. Do not use the service-role key in the client, ever.
3. Trusted contacts can read the Wasiyyah register only when a release_case is in the "released" state, enforced in the database (RLS + security-definer function), not just in app code.
4. The release flow (check-ins, contact confirmations, release) is a server-side state machine in Edge Functions with an audit log and a server-side kill switch. No automatic release without human confirmation from trusted contacts. Test every state transition and edge case listed in PRD section 5.
5. Never store bank passwords, PINs, card numbers or ID numbers. Never send amounts, lender names or notes to analytics or crash reporting.
6. All user-facing strings go through i18n. No hard-coded text. Layouts must work in RTL.
7. Zakat and inheritance screens are guidance only: show assumptions, never claim a ruling.
8. Follow Apple's Human Interface Guidelines: native-feeling navigation, large titles, sheets, Dynamic Type, semantic colors, light and dark mode, 44pt touch targets, VoiceOver and TalkBack labels, haptics where appropriate.
9. Keep commits small. Run typecheck, lint and tests before every commit.

WORKING STYLE
- Before coding each phase, give me a short plan and wait for my approval.
- Build in the PRD phase order. Do not start a later phase early.
- After each phase, summarize what was built, what was tested, and what is left. List anything you were unsure about.
- Prefer the simplest solution that meets the PRD. Do not add features that are not in the PRD without asking.

START NOW with Phase 1 (Foundation):
1. Initialize the Expo + TypeScript project with Expo Router and the folder structure from PRD section 7.
2. Set up Supabase locally (migrations folder, config) and write migration 001 with profiles, accounts, categories, transactions and RLS policies, plus RLS tests.
3. Set up i18next with en and dv, RTL handling, and a language switcher on a placeholder settings screen.
4. Build the money library (laari integers, formatting for MVR) with unit tests.
5. Add auth (email sign-in and Sign in with Apple), biometric app lock, and secure session storage.
6. Set up CI (typecheck, lint, tests) and an EAS development build profile.

Stop after step 6, show me the result, and wait for my review before Phase 2.
```

**Suggested workflow.** Do Phase 0 design first, using Claude Design or Figma, then give the screens to Claude Code during Phases 2 to 4. Review every migration and RLS policy yourself before it is applied to the production project.

## 12. Pre-launch compliance checklist

Nothing ships to the App Store or Play Store until every item below is done and checked. Legal documents (items 1 to 4) should be reviewed by a Maldivian lawyer, and the current Maldivian data and consumer rules confirmed, since this PRD is not legal advice.

| # | Item | What it means for Amanah |
| --- | --- | --- |
| 1 | Privacy policy | Public URL, linked in both stores and inside the app. Plain language in English and Dhivehi. Covers the register, trusted contacts, the release flow, the owner-access limitation in section 9, retention, and every processor (Supabase, Resend, Expo push, Sentry). |
| 2 | Terms of service | Covers the guidance-only disclaimer (no fatwa, financial or legal advice), the release flow and its limits, acceptable use, and liability. |
| 3 | Refund policy | If the app is free, state that. For any paid unlock, state that App Store and Google Play handle refunds under their own rules, and link them. |
| 4 | Cookie policy | The app itself uses no cookies. It applies to the marketing site and the trusted-contact web view (magic link). List each cookie or storage item used there. |
| 5 | Cookie consent banner | Only on the website and the contact web view. Use essential-only storage where possible, so no banner is needed there. Any non-essential item requires opt-in with equal-weight Accept and Reject buttons. |
| 6 | Check form consents | Unticked checkboxes, separate consent for terms and privacy, and a specific consent when a user invites a trusted contact (their email is shared with Resend). Contacts see a clear notice of why they were invited. Store consent records with a timestamp. |
| 7 | Collect only needed data | Run a field-by-field review of the data model in section 8. Make optional fields optional (phone, notes). Never collect bank passwords, card numbers or ID numbers. |
| 8 | Audit third-party SDKs | List every SDK and its data use. Keep to the minimum: Supabase, Expo modules, Sentry, optional analytics. No ad or tracking SDKs. Strip amounts, lenders and notes from all analytics and crash events. Match the store privacy labels to the list. |
| 9 | Remove dark patterns | No guilt wording, streaks, fake urgency, pre-ticked boxes, hidden decline buttons, or hard-to-find cancel. Trusted-contact and check-in messages are neutral and calm. |
| 10 | No hidden fees | Free or priced clearly in the listing. If anything is paid, show the price before the user commits. No surprise charges. |
| 11 | No fake reviews | No purchased or self-written reviews. Ask testers for honest reviews only, with no incentives that condition a rating. |
| 12 | No unsupported claims | No "fully secure" or "100% private" claims. Describe security accurately, including the owner-access limit. Zakat and Islamic labels must read as guidance, with scholar review recorded. |
| 13 | Add alt text | Accessibility labels for every icon, chart and image in the app (VoiceOver and TalkBack), plus alt text on website and store screenshots. |
| 14 | Fix color contrast | WCAG AA (4.5:1 for text) in light and dark mode, including Dhivehi text and the green brand color. Check with a contrast tool before the design is frozen. |
| 15 | Keyboard navigation | Mobile equivalent: external keyboard and switch control support, a logical focus order, and visible focus. Full keyboard navigation on the website and contact web view. |
| 16 | Business details | Name, address, contact email and registration number (if registered) in the store listing, the website footer, and the legal documents. Apple and Google require accurate seller or developer details. |
| 17 | Age consent for kids | Set the age rating and Play target audience to adults, and state the minimum age (18) in the terms. Add an age confirmation at sign-up and do not market to children. Do not use the Kids category. |
| 18 | Unsubscribe link | Every non-essential email has a working one-click unsubscribe. Security and check-in emails are service messages, explained clearly, and users can change their frequency in settings. |
| 19 | License stock images | Use only owned, open-licensed or properly licensed images, fonts and icons. Keep a license log in the repo (`docs/LICENSES.md`), including the Thaana font. |
| 20 | Data deletion option | In-app delete account that removes all data, contacts and cases. Required by Apple. Google Play also needs a web page where users can request deletion. Show what will be deleted and when. |

**How to enforce this.** Keep this list as a `docs/LAUNCH_CHECKLIST.md` in the repo, turn each row into a task, and record evidence for each (link, screenshot or test). Review it again before every store submission.
