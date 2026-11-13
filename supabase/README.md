# Kharadhu backend (Supabase `yusr-prod`, ap-south-1)

- `migrations/` — 001 core tables + RLS, 002 scan quota functions, 003 private `receipts` bucket, 004 debts, 005 sadaqah and zakat, 006 Wasiyyah & Amanah register, trusted contacts and the release ladder (kill switch OFF).
- `functions/scan-receipt/` — Raseedhu. Model name: `config.ts` (override with the `GEMINI_MODEL` secret). Prompt: `prompt.ts`. Output schema: `schema.ts`.
- `tests/database/` — pgTAP: `001` cross-user isolation (rows and files) and scan_usage write protection; `002` every access path for debts, giving, the register, trusted contacts and the release ladder. Run with `supabase test db`.

Secrets (never in git or the app): `supabase secrets set GEMINI_API_KEY=...`. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform.

Function tests: `node --experimental-strip-types --test supabase/functions/scan-receipt/scan.test.ts`

Accuracy and cost on real receipts: `GEMINI_API_KEY=... node --experimental-strip-types scripts/eval-receipts.ts <folder> --model gemini-2.5-flash-lite --model gemini-3.1-flash-lite`
