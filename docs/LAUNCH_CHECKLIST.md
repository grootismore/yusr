# Launch checklist (Kharadhu)

Ported from the Yusr checklist and re-assessed against this app. Nothing ships to a store until every item is done with evidence. **Honest status as of Stage 3**; "gap" means not done.

| # | Item | Status |
| --- | --- | --- |
| 1 | Privacy policy | **Draft written** (`docs/legal/privacy.md`, matches the real data flows including Gemini and Resend, the owner-access limit and in-app deletion). **Gap:** your business details, lawyer review, a native Dhivehi version, and publishing it at `EXPO_PUBLIC_LEGAL_URL/privacy`. It also promises data export on request, which is by email only for now. |
| 2 | Terms of service | **Draft written** (`docs/legal/terms.md`: guidance only, the register and its limits). **Gap:** same review and publishing at `/terms`. |
| 3 | Refund policy | **Draft written** (`docs/legal/refunds.md`: the app is free). **Gap:** same review and publishing. |
| 4 | Cookie policy | **Gap to verify.** The web build stores the sign-in session in localStorage (essential). List it, and confirm nothing else is stored. |
| 5 | Cookie consent banner | Likely not needed if only essential storage is used (see 4). |
| 6 | Form consents | **Built (needs migration 008 approved and applied).** Everyone is asked, before using the app and again whenever `LEGAL_VERSION` changes, to switch on three separate, unticked consents (Terms, Privacy, 18+); the database records them with its own timestamp, add-only. Inviting a trusted person has its own unticked consent. |
| 7 | Collect only needed data | Reviewed below. No bank passwords, card numbers or ID numbers are collected, and the UI says not to write them. Phone for a trusted person and notes are optional. |
| 8 | Third-party SDKs | Supabase (auth, database, storage, functions), Expo modules (secure-store, local-authentication, image-picker, image-manipulator, notifications, haptics, crypto, apple-authentication), Google Gemini (server side, receipt images), Resend (ladder emails). No ad, analytics or crash SDK. Store privacy labels must match this list. |
| 9 | Dark patterns | Copy reviewed: no streaks, guilt, fake urgency or pre-ticked boxes; cancel is always visible. Re-check when strings change. |
| 10 | No hidden fees | Free. |
| 11 | No fake reviews | Process item for the beta. |
| 12 | No unsupported claims | No "fully secure" or "100% private" claims. The owner-access limit is stated on the register screens. **Gap:** a scholar's review of the Islamic wording (amanah, qard hasan, zakat, release) is not recorded. |
| 13 | Alt text | Controls have roles and labels; decorative icons are hidden from screen readers. **Gap:** a VoiceOver and TalkBack pass on real devices, and store screenshot alt text. |
| 14 | Colour contrast | Token contrast is tested (text 4.5:1, controls 3:1). **Gap:** Dhivehi text on a device, and dark mode does not exist yet. |
| 15 | Keyboard navigation | **Gap.** Needs an external-keyboard and switch-control test. |
| 16 | Business details | **Gap.** Name, address, contact and registration number are needed for the listings and legal pages. |
| 17 | Age consent | **Built (with item 6): the 18+ confirmation.** **Gap:** set the store age rating to adults and the Play audience to 18+ (not Kids) in the consoles. |
| 18 | Unsubscribe | The only emails are ladder service emails (check-in, ask, release) and Supabase auth links; they only exist once the flow is enabled. No marketing email. |
| 19 | Licences | `docs/LICENSES.md` created. App icon and splash are still to be designed. |
| 20 | Data deletion | **Built.** Migration 007 (applied) fixes deleting accounts with register items; the `delete-account` function and the Settings button exist and are tested, and a public page `/delete-info` explains how to delete (for Google Play). **Gap:** deploy the function, host the web build, and set `EXPO_PUBLIC_SUPPORT_EMAIL`. |

## Other launch gaps
- Real-device testing (RTL on iOS and Android, Thaana keyboard in every field, notifications, camera, Apple sign-in, biometrics).
- A native Dhivehi review of every string (all are marked `_draft`), plus the Thaana Noor punctuation fix.
- Real pgTAP run (`supabase test db`) on the real stack; the SQL tests have only run on a local stand-in.
- The Gemini model decision from the 50-receipt eval.
- Release ladder staging dry run (see `RELEASE_RUNBOOK.md`).
- App name and icon decisions.

## Field-by-field data review (item 7)
Profile: language, base currency, keep-photos choice. Spending: amount, currency, rate, category, merchant, date, note, source. Receipts: photo (deleted after reading by default), the draft JSON, items, GST. Budgets, giving (recipient note, private), zakat settings. Debts: lender, type, amounts, due day, interest flag and rate, optional note (told not to put account numbers). Register: title, counterparty, amount, encrypted details. Trusted contacts: name, email, optional phone, consent time. Check-in ladder: state and timestamps. Audit log: event names and ids only, never amounts or names.
