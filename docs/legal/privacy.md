# Privacy Policy (DRAFT)

> **Draft for review by a Maldivian lawyer and a native Dhivehi reader. Not legal advice.** Replace the bracketed details. Version date: 2026-11-15 (must match `LEGAL_VERSION` in `src/features/legal/consent.ts`).

**Who we are.** [Operator name], [address], Maldives. Contact: [email]. Kharadhu is a budgeting app. It is free.

## What we collect, and why
- **Account:** your email (or Apple's private relay address) to sign you in.
- **Your records:** spending, income, budgets, debts and payments, giving (including a private recipient note), zakat settings, and the Wasiyyah & Amanah register (titles, who it is with, amounts, and details you choose to write). We use them only to run the app for you.
- **Receipts:** when you scan a receipt, the photo is sent to our server and then to **Google (Gemini)** to read it. By default the photo is **deleted straight after it is read**; only the details you confirm are kept. You can choose to keep photos in Settings.
- **Trusted people:** their name and email (and phone, if you add it) so we can invite them and, only if the check-in process reaches them, send them messages. We tell them why they were chosen.
- **Check-ins:** when you last opened the app, and the state of the check-in process. The audit log records events (never amounts or names).
- **Agreement records:** that you agreed to these terms and are 18 or older, and when.
We do not collect bank passwords, card numbers or ID numbers, and the app asks you not to write them. We use no advertising or analytics SDKs, and we do not sell data.

## Who handles it (processors)
**Supabase** (database, sign-in, file storage, functions; hosted in India, Mumbai region), **Google** (Gemini, to read receipt photos), **Resend** (check-in and invite emails), **Apple** (Sign in with Apple, if you use it). Reminders (zakat date) are scheduled on your phone; no push server is used.

## Your trusted people and your register
Your register is private. It is shared with your trusted people **only** if the check-in process runs its course and they confirm it (two people, or one person plus a waiting period; any one of them saying you are fine stops it). Opening the app at any time cancels the process. This happens only if the feature has been switched on.

## An honest limit
Your register's details are encrypted in the database. **We (the service operator) could technically read the database, including decrypted details.** We do not read it except to keep the service running, for security, or if the law requires. We plan end-to-end encryption in a later version.

## How long we keep it, and deleting it
We keep your data until you delete it. **You can delete your account and all of your data in the app (More, Settings, Delete my account).** That removes your records, register, trusted people, receipt photos and agreement records straight away. Backups roll off within [number] days. You can also email us to delete it, or to ask for a copy of your data.

## Children
Kharadhu is for adults (18 or older) and is not directed at children.

## Changes
If this policy changes, we will change the version date and ask you to agree again before you carry on.

## Contact
[email]
