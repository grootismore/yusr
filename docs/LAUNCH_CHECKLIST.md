# Launch checklist (Kharadhu)

Ported from the Yusr checklist and re-assessed against this app. Nothing ships to a store until every item is done with evidence. **Honest status as of Stage 3**; "gap" means not done.

| # | Item | Status |
| --- | --- | --- |
| 1 | Privacy policy | **Gap.** Not written for Kharadhu. The Yusr draft (`classic-yusr/web/legal`) must be updated: Google Gemini (receipt photos are sent to it for extraction), Supabase, Resend, Expo push, the register and the owner-access limit, retention, deletion. Needs your business details and a Maldivian lawyer. In-app link reads `EXPO_PUBLIC_LEGAL_URL`. |
| 2 | Terms of service | **Gap.** Same as 1 (guidance only, no fatwa; the release flow and its limits). |
| 3 | Refund policy | **Gap** (small): state the app is free. |
| 4 | Cookie policy | **Gap to verify.** The web build stores the sign-in session in localStorage (essential). List it, and confirm nothing else is stored. |
| 5 | Cookie consent banner | Likely not needed if only essential storage is used (see 4). |
| 6 | Form consents | **Partly done.** Inviting a trusted person needs its own unticked consent, and the database stamps the time. **Gap:** sign-up has no separate unticked consents for terms, privacy and 18+ yet, and none is recorded. Needs a small migration. |
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
| 17 | Age consent | **Gap.** 18+ confirmation at sign-up is not built; store age rating and audience are set in the consoles. |
| 18 | Unsubscribe | The only emails are ladder service emails (check-in, ask, release) and Supabase auth links; they only exist once the flow is enabled. No marketing email. |
| 19 | Licences | `docs/LICENSES.md` created. App icon and splash are still to be designed. |
| 20 | Data deletion | **Built, not live.** `delete-account` function plus Settings "Delete my account" (type DELETE). It needs migration 007 (the fix for deleting accounts that have register items) approved and applied, and the function deployed. **Gap:** a public web page to request deletion for Google Play. |

## Other launch gaps
- Real-device testing (RTL on iOS and Android, Thaana keyboard in every field, notifications, camera, Apple sign-in, biometrics).
- A native Dhivehi review of every string (all are marked `_draft`), plus the Thaana Noor punctuation fix.
- Real pgTAP run (`supabase test db`) on the real stack; the SQL tests have only run on a local stand-in.
- The Gemini model decision from the 50-receipt eval.
- Release ladder staging dry run (see `RELEASE_RUNBOOK.md`).
- App name and icon decisions.

## Field-by-field data review (item 7)
Profile: language, base currency, keep-photos choice. Spending: amount, currency, rate, category, merchant, date, note, source. Receipts: photo (deleted after reading by default), the draft JSON, items, GST. Budgets, giving (recipient note, private), zakat settings. Debts: lender, type, amounts, due day, interest flag and rate, optional note (told not to put account numbers). Register: title, counterparty, amount, encrypted details. Trusted contacts: name, email, optional phone, consent time. Check-in ladder: state and timestamps. Audit log: event names and ids only, never amounts or names.
