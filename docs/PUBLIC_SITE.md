# Public site: yusrmv.netlify.app

One Netlify site holds everything public, built by `web/site/build.cjs`:

| Address | What |
| --- | --- |
| `/` | Yusr home with links to the legal pages |
| `/terms/`, `/privacy/`, `/cookies/`, `/refunds/`, `/delete-account/` | Legal pages (`web/legal`) |
| `/invite/#<token>` | Trusted-contact accept page (`web/accept`) |
| `/editor/` | Wording editor (`web/copy`): internal tool behind a shared passcode, not indexed |

The editor shares the site's address with the public pages, so keep every page free of third-party scripts: the passcode lives in the browser tab's session storage for this origin.

## Build and deploy
```
BUSINESS_NAME="Yusr" ADDRESS="Maldives" CONTACT_EMAIL=... UPDATED=YYYY-MM-DD [REVIEWED=yes] \
INVITE_FUNCTION_URL=https://<ref>.supabase.co/functions/v1/accept-invite \
COPY_FUNCTION_URL=https://<ref>.supabase.co/functions/v1/copy-editor node web/site/build.cjs
```
Deploy the `web/site/dist` folder (it also regenerates the editor's `starter.json`). Each page keeps its own Content-Security-Policy (the accept page and the editor need their hashed script and function address; the legal pages need neither), written per path so two policies never apply to one page.

## Settings that must match
- Supabase Edge Function secrets `INVITE_ALLOWED_ORIGIN` and `COPY_ALLOWED_ORIGIN` = `https://yusrmv.netlify.app` (the accept page and the editor call their functions from this origin; a wrong value blocks them).
- Beta build variables (optional, they default to this site): `EXPO_PUBLIC_INVITE_URL` = `https://yusrmv.netlify.app/invite`, `EXPO_PUBLIC_LEGAL_URL` = `https://yusrmv.netlify.app`.
- Invite links look like `https://yusrmv.netlify.app/invite/#<token>`.

## Old addresses
`yusr-invite.netlify.app`, `yusr-legal.netlify.app` and `yusr-copy.netlify.app` only redirect (301) to this site, so links already sent and builds made earlier keep working. The token after `#` survives the redirect.
