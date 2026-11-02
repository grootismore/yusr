# Wording editor

A small website for editing the app's wording (English and Dhivehi) without touching code. Edits live in the database and reach the app only through a pull request, so nothing changes for users until someone reviews it and ships a build.

## For editors
1. Open the editor site and enter the passcode and your name. Your name is saved with each change.
2. Search for a word, or filter by **Where** (app or invite page) and **Needs review**.
3. Change the English or Dhivehi, tick **Mark as reviewed** if you have checked it, and press **Save**.
4. Keep placeholders such as `{{name}}` or `{name}` exactly as they are, in both languages. The code fills them in; the editor refuses a change that drops or renames one.
5. Every earlier value is kept, so a wrong edit can be put back.

Dhivehi in the editor uses the same font as the app (MV Faseyha). Strings flagged **Needs review** are the ones whose English was shortened after the Dhivehi was written.

## For the developer: getting edits into the app
```
export COPY_FUNCTION_URL=https://<project>.supabase.co/functions/v1/copy-editor
export COPY_EDITOR_PASSCODE=...        # never commit or paste it anywhere
npm run copy:export -- --dry           # shows which strings differ from the repo
npm run copy:export                    # writes src/lib/i18n/locales/en.json, dv.json and web/accept/strings.json
```
Then review the diff, run the tests, and open a pull request. The invite page also needs redeploying (`web/accept/build.cjs`). Strings the repo no longer has are left alone and listed.

When the code gains new strings, run `npm run copy:seed` (or `npm run copy:seed -- --sql`, which prints SQL that needs no passcode). Seeding only adds missing strings; it never overwrites an edit.

## One-time setup
1. Apply migration `supabase/migrations/20261102160000_008_copy_strings.sql` to the project (three tables, closed to every client role).
2. Deploy the `copy-editor` Edge Function (`supabase/functions/copy-editor`).
3. In the Supabase dashboard, Edge Functions > Secrets, set `COPY_EDITOR_PASSCODE` (the shared passcode; choose a long one) and `COPY_ALLOWED_ORIGIN` (the editor site's address, so only that page can call the function from a browser).
4. Build and deploy the site: `npm run copy:starter`, then `FUNCTION_URL=https://<project>.supabase.co/functions/v1/copy-editor node web/copy/build.cjs`, then publish `web/copy/dist`.
5. Load the strings: sign in to the site and press **Add missing strings** (it only adds what is missing). Developers can instead run `npm run copy:seed`, or `npm run copy:seed -- --sql` for SQL that needs no passcode.

## How it is protected
- One shared passcode is the only credential. It is stored only as a function secret, compared in constant time, and sent in a request header over HTTPS. If the secret is missing the function refuses everyone.
- Wrong guesses are throttled: 10 per hour per hashed address, after which even the right passcode is refused until the hour passes.
- The tables have row-level security with no policies, so no app user, signed-in or not, can read or change them. Only the function (the server role, with exactly the privileges migration 008 grants) can.
- A change must keep the string's placeholders, stay under 2000 characters and contain no control characters.
- The site's content-security policy allows only its own script and style, its fonts, and connections to that one function.
- Edits cannot reach users without a pull request, so every wording change, including the safety notes, is reviewed first.

## Limits
- It is a **shared** passcode: anyone who has it can edit, and the name saved with a change is typed by the editor, not verified. Change the secret to lock everyone out and give the new one to whoever should have it.
- Only the app and the invite page are covered. The legal pages' Dhivehi summaries are not in the editor yet.
- No passcode is stored in the repo or in `.env.example`.
