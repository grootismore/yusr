# Setup, step by step (manual)

Everything needed to take Kharadhu from this repo to a working app. Do the parts in order. "Blocks use" means the app can't work without it; "Blocks launch" means it is needed before real users or the stores.

## 0. Where each value lives

| Value | Secret? | Where it goes |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY` (the **publishable** key), `EXPO_PUBLIC_APP_URL`, `EXPO_PUBLIC_LEGAL_URL`, `EXPO_PUBLIC_SUPPORT_EMAIL` | **No.** They are baked into every build and anyone can read them. Security is row-level security, not hiding these. | GitHub: Settings, Secrets and variables, Actions, **Variables** tab. EAS: environment variables (step 6). Local dev: a git-ignored `.env`, or the shell. |
| `NETLIFY_SITE_ID`, `SUPABASE_PROJECT_REF`, `GEMINI_MODEL` | No | GitHub **Variables** |
| `SUPABASE_ACCESS_TOKEN`, `GEMINI_API_KEY`, `NETLIFY_AUTH_TOKEN`, `EXPO_TOKEN` | **Yes** | GitHub **Secrets** tab |
| `RESEND_API_KEY`, `RESEND_FROM`, `RELEASE_CRON_SECRET`, `APP_URL` | **Yes** | Supabase function secrets only (`supabase secrets set`), and only when the release ladder is enabled |
| Supabase **service-role / secret key** | **Yes, never** | Nowhere in this repo, the app or GitHub. The platform injects it into functions. The app refuses to start if it finds one. |

## 1. Accounts you need
Supabase (you have yusr-prod), GitHub (you have it), Google AI Studio (Gemini key), Netlify (or another static host), Expo (EAS builds), and later Apple Developer ($99/yr) and Google Play ($25).

## 2. Supabase: auth settings (blocks use)
1. Supabase dashboard, project yusr-prod, Authentication, **URL Configuration**: set Site URL to your web address (step 5). Add `https://<your-web-address>/**` and `kharadhu://**` to Redirect URLs.
2. Authentication, Sign In / Providers, **Email**: choose whether "Confirm email" is on. For real users keep it on.
3. Authentication, **SMTP Settings**: set a custom sender (Resend works). The built-in sender only allows a few emails an hour.
4. Optional, Sign in with Apple: enable the Apple provider and follow Supabase's steps (needs an Apple Developer account and the bundle id `mv.kharadhu.app`).

## 3. GitHub: add variables and secrets (blocks the workflows)
Repo, Settings, Secrets and variables, Actions.
- **Variables tab, New repository variable**: `SUPABASE_PROJECT_REF` = `mettmzaljwrdyhxraunu`; `EXPO_PUBLIC_SUPABASE_URL` = `https://mettmzaljwrdyhxraunu.supabase.co`; `EXPO_PUBLIC_SUPABASE_KEY` = your publishable key (`sb_publishable_...`, from Supabase, Project Settings, API Keys); `EXPO_PUBLIC_APP_URL` = your web address; `EXPO_PUBLIC_LEGAL_URL` = where the legal pages live; `EXPO_PUBLIC_SUPPORT_EMAIL`; `NETLIFY_SITE_ID`; optionally `GEMINI_MODEL`.
- **Secrets tab, New repository secret**: `SUPABASE_ACCESS_TOKEN` (Supabase dashboard, Account, Access Tokens, Generate); `GEMINI_API_KEY` (Google AI Studio, Get API key); `NETLIFY_AUTH_TOKEN` (Netlify, User settings, Applications, Personal access tokens).

## 4. Deploy the functions (blocks scanning, invites, account deletion)
Using GitHub: Actions tab, **Deploy functions**, Run workflow, keep the default list (`scan-receipt accept-invite delete-account`). It links the project, sets the Gemini key from the secret, and deploys. It refuses `release-ladder`.
By hand instead: install the Supabase CLI, then `supabase login`, `supabase link --project-ref mettmzaljwrdyhxraunu`, `supabase secrets set GEMINI_API_KEY=...`, `supabase functions deploy scan-receipt`, then the same for `accept-invite` and `delete-account`.
Check: scan a real receipt in the app, and confirm the photo is gone from Storage afterwards.

## 5. Host the web build (blocks trusted-person pages and the delete page)
1. In Netlify, create a site (any name), copy its **Site ID** into the `NETLIFY_SITE_ID` variable, and set `EXPO_PUBLIC_APP_URL` to the site's address.
2. Actions tab, **Deploy web**, Run workflow. It builds with your variables and publishes `dist/` with a rule sending every path to `index.html`.
3. Go back to step 2.1 and make sure the Site URL and Redirect URLs match this address.
4. Check: open `<address>/delete-info`, and invite a second email from the app and open the link on a phone.

## 6. Run the app (blocks use)
Local, quickest: copy `.env.example` to `.env`, fill the same public values, `npm install`, `npx expo start`, open on your phone. (`.env` is git-ignored and holds only public values. Alternatively, pull them from EAS with `eas env:pull --environment development`.)
First launch is Dhivehi and right-to-left, so close and reopen the app once when asked.
Device builds (needed for Apple sign-in, biometrics and a proper test): `npm i -g eas-cli`, `eas login`, `eas init`, then add the public values as EAS environment variables (`eas env:create --environment development --name EXPO_PUBLIC_SUPABASE_URL --value ... --visibility plaintext`, and the same for the others and for `preview` and `production`), then `eas build --profile development --platform ios` (or `android`). Store builds use `--profile production`, and `eas submit`.

## 7. Tests on the real project (blocks launch)
`supabase start` (needs Docker) then `supabase test db` runs every SQL test. Run it against a local copy first.
Receipt model choice: collect about 50 receipts with a JSON answer file next to each (see the header of `scripts/eval-receipts.ts`), then `GEMINI_API_KEY=... node --experimental-strip-types scripts/eval-receipts.ts <folder> --model gemini-2.5-flash-lite`. Set the chosen model in `supabase/functions/scan-receipt/config.ts`.

## 8. Before real users or the stores (blocks launch)
Follow `docs/LAUNCH_CHECKLIST.md`. In short: fill your details into `docs/legal/` and publish those pages (after a lawyer's review) at `EXPO_PUBLIC_LEGAL_URL/terms`, `/privacy`, `/refunds`; Dhivehi review of all strings; scholar review of the Islamic wording; fix the Thaana Noor punctuation; a real-device pass (right-to-left, Thaana keyboard, camera, notifications, screen reader); store accounts, icon, splash, listings, age rating, privacy labels.

## 9. The release ladder stays off
Do not deploy or schedule it. When you decide to, follow `docs/RELEASE_RUNBOOK.md` exactly.
