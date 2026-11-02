# Beta builds for device testing

`.github/workflows/beta-build.yml` makes test builds on GitHub, with no Apple Developer account, Expo account or store. Run it from **Actions → Beta build → Run workflow** and pick `android`, `ios` or `both`. Artifacts are kept for 14 days.

## One-time setup
Repository → Settings → Secrets and variables → Actions → **Variables** tab:
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` = the publishable key (`sb_publishable_...`). The build refuses anything else. These values ship inside the app, so they are variables, not secrets.
- Optional: `EXPO_PUBLIC_SUPABASE_URL` (defaults to yusr-dev), `EXPO_PUBLIC_INVITE_URL` (defaults to https://yusr-invite.netlify.app), `EXPO_PUBLIC_LEGAL_URL` (once the legal site is hosted).

## Android
Download the `yusr-beta-apk` artifact, open `yusr-beta.apk` on the phone and allow installs from that source. It is signed with the standard debug key, so it installs directly. Not for the Play Store.

## iPhone
Download `yusr-beta-unsigned-ipa`, unzip it, and install the `.ipa` with SideStore or AltStore using your own free Apple ID (they re-sign it). A free Apple ID's apps expire after 7 days unless the store refreshes them; the bundle id may be changed by the store to fit your account. Face ID, notifications and layout behave as in a normal install.

## What to test
Sign up (the three consent switches), sign in, Face ID lock, add an account and a transaction offline then reconnect, a debt and its payoff plan, a giving commitment and reminders, Wasiyyah note and an invite link, pull down to refresh on Home, Transactions, Debts and Giving, search in Transactions, the add-transaction sheet (drag it up and down), confirmations as action sheets, haptics and the Settings switch for them, the native tab bar in Dhivehi right-to-left (tab order and icons), export and delete account (use a throwaway account), language switch to Dhivehi and the right-to-left layout, light and dark mode, large text.

## Not covered
TestFlight, App Store and Play Store builds need the developer accounts and signing. Use the `production` profile in `eas.json` for those later.
