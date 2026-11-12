> **Not in use now.** This is the original Yusr app, kept for reference. See [NOT_IN_USE.md](NOT_IN_USE.md). The active app is Kharadhu (spec: `../docs/kharadhu-prd.md`).

# Yusr

Free iOS and Android app for Maldivians: income and expenses, a debt-free plan, Islamic giving (sadaqah, zakat), and a Wasiyyah & Amanah register that lets trusted people see debts and obligations after the owner passes away.

Status: pre-build. Spec lives in `docs/PRD.md`. Pre-launch gates live in `docs/LAUNCH_CHECKLIST.md`. Rules for contributors and AI agents live in `CLAUDE.md`.

## Stack

Expo (React Native) + TypeScript, Expo Router, Supabase (Postgres, Auth, RLS, Edge Functions), Resend, i18next (English + Dhivehi RTL), EAS.

## Setup

```bash
cp .env.example .env   # fill in the dev Supabase project values
```

Never commit `.env`, keys or service-role secrets.

```bash
npm ci
npm run typecheck && npm run lint && npm test   # same checks as CI
npx supabase start -x realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
npx supabase test db                            # RLS tests (needs Docker)
eval "$(npx supabase status -o env | sed 's/^/export /')"
LOCAL_SUPABASE_URL=$API_URL LOCAL_SUPABASE_KEY=$ANON_KEY npm run test:integration   # real API + RLS
npx expo start --dev-client                     # after installing a development build
```

EAS builds read `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from EAS environment variables (publishable key only), per profile in `eas.json`:
`eas env:set --name EXPO_PUBLIC_SUPABASE_URL --value <url> --environment development --visibility plaintext`
