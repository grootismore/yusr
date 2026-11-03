# Public site: yusrmv.netlify.app

One Netlify site holds everything public, built by `web/site/build.cjs`:

| Address | What |
| --- | --- |
| `/` | Yusr home with links to the legal pages |
| `/terms/`, `/privacy/`, `/cookies/`, `/refunds/`, `/delete-account/` | Legal pages (`web/legal`) |
| `/invite/#<token>` | Trusted-contact accept page (`web/accept`) |

The wording editor stays on its own site (`yusr-copy.netlify.app`): it is an internal tool behind a passcode with its own strict policy and CORS origin.

## Build and deploy
```
BUSINESS_NAME="Yusr" ADDRESS="Maldives" CONTACT_EMAIL=... UPDATED=YYYY-MM-DD [REVIEWED=yes] \
FUNCTION_URL=https://<ref>.supabase.co/functions/v1/accept-invite node web/site/build.cjs
```
Deploy the `web/site/dist` folder. Each page keeps its own Content-Security-Policy (the accept page needs its hashed script and the function address; the legal pages need neither), written per path so two policies never apply to one page.

## Settings that must match
- Supabase Edge Function secret `INVITE_ALLOWED_ORIGIN` = `https://yusrmv.netlify.app` (the accept page calls the function from this origin; a wrong value blocks accepting an invite).
- Beta build variables (optional, they default to this site): `EXPO_PUBLIC_INVITE_URL` = `https://yusrmv.netlify.app/invite`, `EXPO_PUBLIC_LEGAL_URL` = `https://yusrmv.netlify.app`.
- Invite links look like `https://yusrmv.netlify.app/invite/#<token>`.

## Old addresses
`yusr-invite.netlify.app` and `yusr-legal.netlify.app` only redirect (301) to this site, so links already sent and builds made earlier keep working. The token after `#` survives the redirect.
