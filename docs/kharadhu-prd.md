# Kharadhu PRD (with Raseedhu receipt scanning)

Nov 13, 2026 · Mohamed Areesh

## Overview

Kharadhu is a Dhivehi-first budgeting app for people in the Maldives to log spending in MVR and see where their money goes. Raseedhu (ރަސީދު, "receipt") is its AI receipt-scanning feature, built inside Kharadhu rather than shipped as a separate app.

- **Platforms:** iOS and Android, built with Expo (React Native) on a Supabase backend.
- **Inspiration:** Receiptix (AI receipt scan, voice logging, auto-categories, charts, multi-currency). Kharadhu takes the idea and feature shape, not Receiptix's name, branding, screenshots or copy.
- **Boundaries:** Kharadhu now carries the Yusr functions (debt-free plan, sadaqah and zakat, Wasiyyah & Amanah register) as modules, so Yusr is no longer a separate app. It stays separate from the household debt tracker.

## Problem and goals

Mainstream expense trackers are built English-first and know nothing about Maldivian merchants, local bills, GST receipts or Thaana. Kharadhu closes that gap with a Dhivehi interface, MVR by default and receipts that scan in one step.

**Goals** (proposed targets, to be tuned after launch):

1. Log a manual expense in under 10 seconds and a scanned one in under 15 seconds including confirmation.
2. Ship a complete Dhivehi UI with correct RTL layout and Thaana input.
3. Have most scanned receipts need at most one field edit before saving.

**Non-goals:** business accounting or invoicing, bank API integrations, shared households and the Yusr modules (debt-free plan, sadaqah, register) in the MVP.

## Users and key scenarios

**Primary user:** a Dhivehi-speaking individual or household in Malé or the atolls who tracks monthly spending in MVR. **Secondary:** English-speaking residents who switch the app language.

- After a supermarket trip, the user scans the receipt, checks the draft and saves it.
- After paying an electricity, water or mobile bill, the user logs it under Bills in Dhivehi.
- At month end, the user compares spending by category against the budget.
- When travelling, the user logs an expense in a foreign currency and still sees the MVR total.

## Scope by phase

The MVP ships manual tracking plus Raseedhu scanning; voice and bank SMS wait until the core loop is proven.

| Phase | Includes |
| --- | --- |
| MVP | Sign-in, manual expenses and income, Dhivehi and English categories, monthly budgets, charts, MVR plus foreign currencies, Raseedhu scan with confirm screen, share-into-app, free monthly scan limit |
| v1.1 | Yusr modules, part 1: debt-free plan (snowball and avalanche, payment history) and sadaqah and zakat tracking; premium tier, PDF monthly summary, recurring expenses, receipt re-scan and edit, more currencies |
| Later | Yusr modules, part 2: Wasiyyah & Amanah register with the trusted-contact release flow; Dhivehi voice logging, bank SMS parsing, shared household budgets |
| Out of scope | Bank APIs and invoicing |

## Core features

Every feature works fully in Dhivehi and English.

- **Expenses and income:** amount, currency (default MVR), category, merchant, date, note, and a source tag (manual or scan).
- **Categories:** Dhivehi and English defaults such as Food and groceries, Transport (ferry, bus, taxi), Bills (electricity, water, mobile and internet), Rent, Health, Education, Shopping, Giving and Other. Users can add their own.
- **Budgets:** a monthly total plus optional per-category limits, with a progress bar and an alert near the limit.
- **Reports:** a month view with a category breakdown and a multi-month trend; PDF summary in v1.1.
- **Currency:** MVR as base. Each foreign-currency expense stores the exchange rate used at entry, which the user can override. Rates are entered manually in the MVP, prefilled with the last rate used for that currency; there is no live rate feed.
- **Account and sync:** Supabase Auth, with data synced across the user's devices.

## Raseedhu: receipt scanning

Raseedhu turns a photo of a receipt into a draft expense that the user confirms; it never saves without confirmation.

1. **Entry:** a Raseedhu button opens the camera or gallery; images can also be shared into the app from other apps.
2. **Upload:** the app sends the image to a private Supabase Storage bucket under the user's own path.
3. **Scan:** an edge function checks the user's monthly quota, then calls a vision model with a fixed JSON schema.
4. **Draft:** the model returns merchant, date, currency, total, GST, line items, a suggested category and a confidence per field.
5. **Confirm:** every field is editable, and low-confidence fields are highlighted.
6. **Save:** saving creates the expense, the receipt and its items. A failed scan does not use up quota.

**Extraction rules**

- Receipts may be in English, Dhivehi or both; currency defaults to MVR; dates are read day-first.
- GST is captured as its own field, not folded into the total.
- If line items plus GST do not match the total, the draft is flagged for review.

**Errors and limits**

- Blurry image or no total found: ask for a retake, or open the form pre-filled with whatever was read.
- No connection: keep the image on the device and scan when back online.
- Free users get a monthly scan limit enforced on the server.
- Users can delete a receipt image and keep the expense.

## Dhivehi and RTL requirements

Dhivehi is the default language, with a runtime switch to English.

- **Layout:** full right-to-left layout in Dhivehi and left-to-right in English. React Native needs an app reload when the direction changes, so the language switch prompts for it.
- **Font:** Thaana Noor (the open-source Dhivehi font) bundled as the default Dhivehi font, with a system fallback.
- **Numerals and dates:** Latin digits (0–9) and day-first Gregorian dates by default, matching local receipts and bills.
- **Mixed text:** merchant names and amounts mix Thaana and Latin, so amounts and currency codes are wrapped as left-to-right runs to avoid reordering.
- **Input:** test Thaana keyboard entry in every text field, including search.
- **Strings:** all copy lives in i18n files, with Dhivehi wording reviewed by a native speaker before release.
- **Store listings:** written in both Dhivehi and English.

## Data model

Eight core tables in Supabase Postgres (the Yusr modules add more, listed under Yusr modules); every user-owned table is protected by row-level security on `user_id = auth.uid()`.

| Table | Key columns |
| --- | --- |
| profiles | id, language, base_currency |
| categories | id, user_id (null for defaults), name_dv, name_en, icon |
| expenses | id, user_id, amount, currency, fx_rate_to_mvr, category_id, merchant, spent_at, note, source, receipt_id |
| income | id, user_id, amount, currency, received_at, note |
| budgets | id, user_id, month, category_id (null = overall), limit_amount |
| receipts | id, user_id, image_path, status, raw_json, gst_amount, created_at |
| receipt_items | id, receipt_id, name, qty, unit_price, total |
| scan_usage | user_id, month, scans_used (primary key: user_id + month) |

Default categories are readable by everyone. Only the edge function, using the service role, writes `scan_usage`, so users cannot reset their own quota. Receipt images are covered by a Storage policy on the user's own path prefix.

## Architecture and tech stack

[Architecture diagram: app, Supabase, vision model. See the Claude Doc for the drawing.]

The app uses Supabase for accounts, data and image storage, and sends each scan to a server-side function that holds the model API key and enforces the quota. Stack: Expo (React Native), Supabase (Postgres, Auth, Storage, Edge Functions) and Google Gemini behind the function (the cheapest Flash-Lite-class vision model that passes receipt testing).

**Receipt image storage**

- Images go to a private Supabase Storage bucket under the user's own path, compressed on the device before upload (about 200 to 400 KB each). Supabase's free 1 GB holds the MVP.
- Default: the image is deleted after extraction and only the extracted data is kept. Keeping the photo is an opt-in, and is a natural premium feature.
- Later: move kept images to Cloudflare R2 (free 10 GB, no download fees) through a signed-URL function, if Supabase storage grows.
- Firebase is not used: its Storage and Functions need a paid plan.

## Yusr modules inside Kharadhu

The Yusr functions join Kharadhu as three modules on the same account, database, money handling and Dhivehi UI. Spending and Raseedhu stay the core; the modules are phased so the MVP does not grow. The full Yusr spec (release flow, security and compliance checklist) carries over from the Yusr PRD, kept in `classic-yusr/docs/`.

| Module | What it does | Phase |
| --- | --- | --- |
| Debt-free plan | Track debts (banks, loans, credit cards, personal), record payments, see snowball and avalanche payoff order and a projected debt-free date; interest-free (qard hasan) option | v1.1 |
| Sadaqah and zakat | Log giving, set monthly sadaqah goals, zakat reminder with a Hijri date; Giving is already a spending category, so entries link to expenses | v1.1 |
| Wasiyyah & Amanah register | Private register of debts owed, trusts and wishes; trusted contacts see it only after a confirmed passing | v1.2 |

**Navigation:** the bottom bar stays at five items: Home, Budget, Raseedhu (centre), Reports, More. Debts, Sadaqah and Register open from Home cards and from More, so the scan button keeps its place.

**Release flow (register):** a check-in ladder with human confirmation from trusted contacts, an away mode, and an audit log. Nothing is released on inactivity alone.

**Islamic guardrails:** guidance only, no fatwas; interest-bearing debts are flagged without judgement; debt is treated as an amanah (trust) and the copy stays encouraging.

**Data additions:** debts, debt_payments, sadaqah_entries, register_items, trusted_contacts, release_checkins and audit_log. All use row-level security on `user_id = auth.uid()`; amounts are stored as integer laari. Trusted-contact access is granted only by the release function, never by the client.

**Pricing:** the Yusr modules stay free, as decided for Yusr; the free and premium split in Monetization applies to Raseedhu scans and extras only.

## UI/UX and Expo build approach

The app is designed and built with dedicated design and Expo tooling rather than by hand, so quality is checked at each step.

**UI/UX skills**

- Impeccable: design and critique the screens (home, Raseedhu scan, confirm, reports, settings), then polish before release.
- Accessibility review: WCAG 2.1 AA checks for contrast, touch targets (44 pt minimum) and screen reader labels, in both Dhivehi and English.
- Design system: one set of tokens (colors, Thaana Noor type scale, spacing, components) shared by every screen.
- UX copy: Dhivehi and English microcopy, errors and empty states, reviewed by a native speaker.
- Design handoff: a spec for each screen (layout, states, RTL behavior) before it is built.
- Every screen is checked in RTL Dhivehi and LTR English, with Thaana and Latin text mixed.

**Expo tooling**

- Expo documentation search for SDK, Router and EAS guidance while building.
- iOS simulator and Android emulator runs, with automated taps, typing and screenshots to test flows such as scan, confirm and save.
- EAS Build and EAS Workflows for development, preview and store builds (free plan: 30 builds per month).
- EAS Submit to TestFlight and Google Play internal testing; crash and review feedback is read from TestFlight and Play.
- Expo Observe for error and performance monitoring after launch.

## Monetization

Kharadhu is free to use, and the paid tier exists mainly to cover AI scanning costs.

| Tier | Includes |
| --- | --- |
| Free | Unlimited manual entry, budgets, charts, multi-currency, and a monthly Raseedhu scan allowance (10 scans per month) |
| Premium | Higher or unlimited scans, PDF monthly summaries, recurring expenses |

- Purchases go through the App Store and Google Play; local MVR payment options are left out of the MVP.
- Cost control: downscale images before upload, make one model call per scan, and enforce the quota on the server.
- Premium prices are shown in MVR in the app's own copy; the stores bill in USD.

## Success metrics, risks and open questions

**Metrics** (targets set after the first 100 users): share of scans saved after at most one edit, scan-to-save rate, week-4 retention, free-to-premium conversion.

| Risk | Mitigation |
| --- | --- |
| OCR errors on local receipts | Mandatory confirm screen, confidence highlighting, total-versus-items check |
| AI cost grows faster than revenue | Server-side quota, image downscaling, paid tier |
| Dhivehi voice recognition is weak | Kept out of the MVP; prototype with real recordings first |
| Thaana rendering or bidi bugs | Bundle Thaana Noor, test on real devices from week one |
| Looking too close to Receiptix | Own name, branding, copy and Maldives-specific categories |

**Decisions and open questions**

- Free scans: 10 per month.
- Vision model: Gemini, the cheapest Flash-Lite-class model; confirm the exact model and cost per scan by testing about 50 real Maldivian receipts.
- Exchange rates: manual in the MVP, with a live feed later if users ask.
- Premium price: MVR in the app, USD in the stores.
- Numerals: Latin (0 to 9) by default.
- Backend: Supabase, with no Firebase.
- Repo and database: Kharadhu is built in the existing grootismore/yusr repo, renamed to grootismore/kharadhu, and uses the existing yusr-prod Supabase project (Mumbai, ap-south-1); yusr-dev is not used. Yusr's migrations and security rules carry over, and the Kharadhu tables, the scan-receipt function and the receipt storage bucket are added to that project.

**Still open**

- [ ] Final app name and icon: Kharadhu with Yusr as a module name, or a new combined brand?
- [ ] Confirm the phasing: debts and sadaqah in v1.1, register in v1.2.
