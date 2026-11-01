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
