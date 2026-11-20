# IOU email nudges

IOUs have three reminder settings. **Off** and **Remind me** need nothing from the server: Remind me is a reminder scheduled on the phone of the person who made the IOU. **Remind them too** also emails the other person, and that part needs the `iou-nudges` function and a schedule. Without them the setting still works for the phone reminder and the "Send a reminder message" button; no email goes out.

The email goes only to the address the maker typed, only for money they lent, from 2 days before the due date, at most every 3 days, six times in all, and never once it is paid. It names what is left and the due date. Every send is logged in `iou_nudges`.

## Turning it on
1. Secrets (Supabase dashboard, Edge Functions, Secrets, or `supabase secrets set`): `RESEND_API_KEY` and `RESEND_FROM` (a verified sender, for example `Kharadhu <no-reply@your-domain>`). They are the same Resend values the release ladder uses. `IOU_CRON_SECRET` is optional (see step 3).
2. Deploy the function: Actions, **Deploy functions**, Run workflow, with the list `iou-nudges`.
3. Schedule it once a day (needs the `pg_cron` and `pg_net` extensions). Migration 027 keeps a private token in `app_secrets`, and the schedule reads it when it runs, so there is nothing to copy into the SQL:
```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('iou-nudges', '30 4 * * *', $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/iou-nudges',
    headers := jsonb_build_object('x-cron-secret', (select value from public.app_secrets where name = 'iou_cron'), 'content-type', 'application/json'));
$$);
```
`30 4 * * *` is 09:30 in the Maldives. Turn it off with `select cron.unschedule('iou-nudges');`. The function also accepts the `IOU_CRON_SECRET` secret in the same header, for calling it by hand.

## Limits
- Email delivery is not guaranteed, and the other person must read their email.
- There is no push notification to the other person: the app has no push setup yet. A friend without the app gets the email, or the message you share by hand.
