# Release ladder runbook

The Wasiyyah & Amanah register opens to trusted contacts only after people confirm. This is how it works, what protects it, and how to turn it on. **It is off, and nothing in the repository turns it on.**

## The rungs
1. **Active.** Any app open or "I'm okay" resets everything.
2. **Quiet.** 30 days without activity: the owner is emailed (Resend).
3. **Second check-in.** 7 days later: a second email.
4. **Contacts asked.** 7 days later: each accepted contact is emailed a link to the app's contact page.
5. **Released.** Only when the database agrees: two or more contacts, two different "passed" answers; one contact, their "passed" answer plus 14 days without the owner responding. Any "fine" answer blocks it. Away mode (up to 90 days) pauses it. The owner is emailed straight away when a contact says "passed", and opening the app cancels.

The waiting times and the release conditions are enforced by a database trigger (`release_checkins_guard`, migration 006), not only by the function. The function can propose a move; the database refuses anything not allowed. Every step is in `audit_log`.

## Where the pieces are
- `supabase/functions/release-ladder`: the scheduled job (decision logic in `logic.ts`, emails in `emails.ts`, 12 tests).
- `supabase/functions/accept-invite`: public yes/no for an invited person (the token is the only credential).
- Kill switch: `release_config.enabled`. The function reads it first and does nothing when it is false.

## Secrets (never in git or the app)
`supabase secrets set RESEND_API_KEY=... RESEND_FROM="Kharadhu <no-reply@your-verified-domain>" RELEASE_CRON_SECRET=<long random> APP_URL=https://<where the app/web is hosted>`

## Before enabling (all of these, in order)
1. Migrations 001 to 007 applied and `supabase test db` green on the real stack (007 fixes account deletion).
2. Resend domain verified; send a test email to yourself.
3. A **staging dry run** on a throwaway test account with short intervals (edit the intervals only in a local copy of the guard and `logic.ts`, never in production): walk the whole ladder with two test contacts, including "fine", cancelling by opening the app, away mode, and a release. Check each email, the audit log and the contact page.
4. A scholar and a native Dhivehi reader have reviewed the email and screen wording.
5. The privacy policy and terms describe the flow and its limits (including that the database owner could technically read the register).
6. You decide, in writing, to switch it on.

## Turning it on (manual, deliberate)
```sql
update public.release_config set enabled = true;
```
Then schedule the job, for example (needs the `pg_cron` and `pg_net` extensions; replace the placeholders; **do not run until the checklist above is done**):
```sql
select cron.schedule('release-ladder', '17 3 * * *', $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/release-ladder',
    headers := jsonb_build_object('x-cron-secret', '<RELEASE_CRON_SECRET>', 'content-type', 'application/json'));
$$);
```
Turn it off any time with `update public.release_config set enabled = false;` (and `select cron.unschedule('release-ladder');`).

## Known limits
- The Supabase free tier pauses projects after a week of inactivity; the ladder needs the daily job, so production should be on a paid plan with backups.
- Email delivery is not guaranteed. If sending fails, nothing moves and the next run retries; a contact could still miss an email, which is why the ladder waits and asks twice.
- A contact must be able to sign in with the email they were invited on (a magic link works). If they cannot, they cannot answer.
