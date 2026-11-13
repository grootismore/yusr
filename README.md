# Kharadhu

Dhivehi-first budgeting app for the Maldives (MVR), with Raseedhu receipt scanning. Spec: [docs/kharadhu-prd.md](docs/kharadhu-prd.md).

- `app/`, `src/` — Expo (React Native, Expo Router, TypeScript). Dhivehi default with full RTL, runtime switch to English.
- `supabase/` — migrations, the `scan-receipt` edge function, SQL tests. See [supabase/README.md](supabase/README.md).
- `classic-yusr/` — the old Yusr app, kept for reference only. Not built or edited.

## Setup

Step by step, including GitHub variables and secrets: [docs/SETUP.md](docs/SETUP.md).

## Run

```
cp .env.example .env     # public Supabase URL and publishable key only
npm install
npm start
npm run typecheck && npm run lint && npm test && npm run test:functions
```

Web preview with fixture data (layout and RTL checks, no backend): `EXPO_PUBLIC_PREVIEW=1 npx expo start --web`.

## Fonts

Dhivehi text: [Thaana Noor](https://github.com/grootismore/thaananoor-font) (OFL). English and all amounts: Nunito Sans (OFL). Thaana Noor's own Latin `.` `,` `:` glyphs are malformed, so numbers never use it (see `src/theme/fonts.ts`).
