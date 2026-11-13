# Setup, step by step (manual)

Everything needed to take Kharadhu from this repo to a working app. Do the parts in order. "Blocks use" means the app can't work without it; "Blocks launch" means it is needed before real users or the stores.

## 0. Where each value lives

| Value | Secret? | Where it goes |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY` (the **publishable** key), `EXPO_PUBLIC_APP_URL`, `EXPO_PUBLIC_LEGAL_URL`, `EXPO_PUBLIC_SUPPORT_EMAIL` | **No.** They are baked into every build and anyone can read them. Security is row-level security, not hiding these. | **EAS environment variables** (step 3, used by builds and web hosting). Local dev: a git-ignored `.env`, or `eas env:pull`. |
| `SUPABASE_PROJECT_REF`, `GEMINI_MODEL` | No | GitHub **Variables** (used only by the functions workflow) |
| `SUPABASE_ACCESS_TOKEN`, `GEMINI_API_KEY` | **Yes** | GitHub **Secrets** tab |
| `RESEND_API_KEY`, `RESEND_FROM`, `RELEASE_CRON_SECRET`, `APP_URL` | **Yes** | Supabase function secrets only (`supabase secrets set`), and only when the release ladder is enabled |
| Supabase **service-role / secret key** | **Yes, never** | Nowhere in this repo, the app or GitHub. The platform injects it into functions. The app refuses to start if it finds one. |

## 1. Accounts you need
Supabase (you have yusr-prod), GitHub (you have it), Google AI Studio (Gemini key), Expo (EAS builds and web hosting), and later Apple Developer ($99/yr) and Google Play ($25).

## 2. Supabase: auth settings (blocks use)
1. Supabase dashboard, project yusr-prod, Authentication, **URL Configuration**: set Site URL to your web address (step 5). Add `https://<your-web-address>/**` and `kharadhu://**` to Redirect URLs.
2. Authentication, Sign In / Providers, **Email**: choose whether "Confirm email" is on. For real users keep it on.
3. Authentication, **SMTP Settings**: set a custom sender (Resend works). The built-in sender only allows a few emails an hour.
4. Optional, Sign in with Apple: enable the Apple provider and follow Supabase's steps (needs an Apple Developer account and the bundle id `mv.kharadhu.app`).

## 3. Expo: create the project and add the values (blocks builds and web)
1. Create the project: go to expo.dev, sign in, **Create a project**, name it `kharadhu` (slug `kharadhu`). Or from the repo run `npm i -g eas-cli`, `eas login`, `eas init` (it writes `extra.eas.projectId` into `app.json`). Commit that change.
2. Connect GitHub: expo.dev, the project, **GitHub**, install the Expo GitHub app and pick the repo `grootismore/yusr` (needed for builds started from Expo or Claude).
3. Add the public values as environment variables: expo.dev, the project, **Environment variables**, Create. For each name below use visibility **Plain text** (they are public) and tick the environments development, preview and production: `EXPO_PUBLIC_SUPABASE_URL` = `https://mettmzaljwrdyhxraunu.supabase.co`; `EXPO_PUBLIC_SUPABASE_KEY` = the publishable key (Supabase, Project Settings, API Keys, `sb_publishable_...`); `EXPO_PUBLIC_APP_URL` = your web address from step 5; `EXPO_PUBLIC_LEGAL_URL`; `EXPO_PUBLIC_SUPPORT_EMAIL`. (CLI alternative: `eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value ... --visibility plaintext`.)
4. GitHub, for the functions workflow only (repo Settings, Secrets and variables, Actions): **Variables** `SUPABASE_PROJECT_REF` = `mettmzaljwrdyhxraunu`, optional `GEMINI_MODEL`; **Secrets** `SUPABASE_ACCESS_TOKEN` (Supabase, Account, Access Tokens, Generate) and `GEMINI_API_KEY` (Google AI Studio, Get API key).

## 4. Deploy the functions (blocks scanning, invites, account deletion)
Using GitHub: Actions tab, **Deploy functions**, Run workflow, keep the default list (`scan-receipt accept-invite delete-account`). It links the project, sets the Gemini key from the secret, and deploys. It refuses `release-ladder`.
By hand instead: install the Supabase CLI, then `supabase login`, `supabase link --project-ref mettmzaljwrdyhxraunu`, `supabase secrets set GEMINI_API_KEY=...`, `supabase functions deploy scan-receipt`, then the same for `accept-invite` and `delete-account`.
Check: scan a real receipt in the app, and confirm the photo is gone from Storage afterwards.

## 5. Host the web build on Expo Hosting (blocks trusted-person pages and the delete page)
1. From the repo: `npx expo export --platform web`, then `eas deploy` once. Choose a preview subdomain (for example `kharadhu`); production will be `https://kharadhu.expo.app`.
2. Put that production address into the `EXPO_PUBLIC_APP_URL` environment variable (step 3.3).
3. From then on, publish with the Expo workflow **Deploy web** (`eas workflow:run deploy-web.yml`, or the dashboard, Workflows).
4. Go back to step 2.1 and make sure the Site URL and Redirect URLs match this address.
5. Check: open `<address>/delete-info`, then invite a second email from the app and open the link on a phone.

## 6. Run the app (blocks use)
Quickest, locally: `eas env:pull --environment development` (or copy `.env.example` to `.env` and fill the public values), then `npm install`, `npx expo start`, open on your phone. First launch is Dhivehi and right-to-left, so close and reopen the app once when asked.
Device builds (needed for Apple sign-in, biometrics and a proper test): run the Expo workflow **Preview builds** (`eas workflow:run preview-builds.yml`), or `eas build --profile development --platform ios` (or `android`). The first iOS build asks for your Apple Developer login to create signing credentials. Store builds: **Production builds**, then `eas submit`.

## 7. Tests on the real project (blocks launch)
`supabase start` (needs Docker) then `supabase test db` runs every SQL test. Run it against a local copy first.
Receipt model choice: collect about 50 receipts with a JSON answer file next to each (see the header of `scripts/eval-receipts.ts`), then `GEMINI_API_KEY=... node --experimental-strip-types scripts/eval-receipts.ts <folder> --model gemini-2.5-flash-lite`. Set the chosen model in `supabase/functions/scan-receipt/config.ts`.

## 8. Before real users or the stores (blocks launch)
Follow `docs/LAUNCH_CHECKLIST.md`. In short: fill your details into `docs/legal/` and publish those pages (after a lawyer's review) at `EXPO_PUBLIC_LEGAL_URL/terms`, `/privacy`, `/refunds`; Dhivehi review of all strings; scholar review of the Islamic wording; fix the Thaana Noor punctuation; a real-device pass (right-to-left, Thaana keyboard, camera, notifications, screen reader); store accounts, icon, splash, listings, age rating, privacy labels.

## 9. The release ladder stays off
Do not deploy or schedule it. When you decide to, follow `docs/RELEASE_RUNBOOK.md` exactly.
