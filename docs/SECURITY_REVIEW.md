# Pre-launch security review (Phase 5)

Reviewed 2026-11-01 against migrations 001–006 and the `accept-invite` function. Evidence is a command or a test you can re-run. This is an engineering review, not a penetration test: get an independent review before store submission (see "Still needed").

## 1. Row-level security

Query run on the local database after `supabase db reset`:

| Check | Result |
| --- | --- |
| Tables in `public` | 15, all with RLS **enabled and forced** |
| `anon` privileges on any table | none |
| Tables without a policy | `invite_attempts` only, on purpose: nobody but the server role can touch it (Supabase advisor reports this as INFO) |
| Security-definer functions without a fixed `search_path` | none (all use `search_path = ''`) |
| Functions `anon` can execute | only the trigger helpers `check_recurring_category`, `check_transaction_category`, `set_updated_at`; they return triggers and cannot be called as RPCs |
| Functions clients can execute | `get/set_debt_secrets`, `get/set_wasiyyah_note`, `log_register_shared`, `get_register_for_contact`, `export_my_data`, `request/cancel_account_deletion`; each starts with `auth.uid()` and refuses a missing user |
| Never callable by clients | `purge_due_account_deletions`, `handle_new_user`, trigger functions |

Tests: pgTAP, 279 assertions (`supabase test db`). Every table is exercised by at least one file, and the files that matter for privacy prove user A cannot read or write user B's rows, anonymous callers get nothing, and a contact cannot reach the register before a case is `released`.

## 2. Release safety (PRD §5, §9)

- `release_cases` has no client write path (test 004). Nothing can mark a case `released` from the app.
- Contacts read the register only through `get_register_for_contact()`, and only if the case is released, the contact accepted and their email is verified (tests 004 and integration).
- The automated release ladder is **not built** (v1.1). In this release the owner shares manually and every share is written to the audit log.

## 3. Edge Function `accept-invite` (public, `verify_jwt = false`)

- Token: 256 bits, only its SHA-256 is stored, spent on first use, expires after 7 days. The function answers 404 for unknown tokens and 410 for used, revoked or expired ones; the accept page shows the same "no longer valid" message for all of them.
- Throttle: 20 attempts per hour per hashed IP address (real-HTTP test). IPs are stored only as hashes.
- Database access: plain REST with the injected service key, which has been reduced to the grants it needs (migration 005 and its test).
- Errors: internal failures return a generic 500 and log only a status line, never a token.
- CORS is currently `*`. **To do before launch:** set the `INVITE_ALLOWED_ORIGIN` secret to the accept page's origin in the Supabase dashboard.
- Accept page: strict CSP with script and style pinned by hash, `connect-src` limited to the function host, no referrer, not framable.

## 4. Client

- Only the publishable key ships in the app; `assertClientSafeKey` throws on a secret key (unit test). No service-role key anywhere in the repo (secret scan of tracked files found only that test string).
- Session in secure storage; biometric lock; screen-capture blocking on the Wasiyyah screens (Android).
- No bank passwords, PINs, card or ID numbers are collected. The only free-text sensitive fields (debt reference, debt notes, Wasiyyah note) are encrypted with Vault and decrypted only for their owner.
- No analytics or crash-reporting SDK is installed (see `docs/SDK_INVENTORY.md`), and the app code contains no `console` logging, so amounts, lenders and notes cannot leak that way.

## 5. Account deletion and export

- 7-day grace period, nightly purge via `pg_cron`. Deleting the auth user cascades through every table; triggers remove the Vault secrets. Test 006 proves nothing of the user remains (rows and secrets) and that other users are untouched.
- Export returns the caller's data only, with their encrypted fields decrypted, and omits secret ids and the invite token hash.

## 6. Dependencies

`npm audit --omit=dev --audit-level=high` passes in CI (0 high, 0 critical). 29 moderate/low advisories remain, all in build and test tooling pulled in by Expo CLI and Jest through `deepmerge`; none ship in the app bundle. Revisit when Expo or Jest publish a fix.

## 7. Wording editor (`docs/COPY_EDITOR.md`)
- New Edge Function `copy-editor` (`verify_jwt = false`) behind one shared passcode held only in the function's secrets; empty secret refuses everyone; constant-time comparison; 10 failed guesses per hour per hashed address, then everything is refused.
- Tables `copy_strings`, `copy_history`, `copy_attempts` have RLS enabled and forced with no policies; only the server role has grants, spelled out in migration 008 (no delete on strings, history and attempts are append-only). pgTAP `008_copy_strings.test.sql` proves clients get nothing.
- Edits must keep placeholders and are length- and character-checked; they reach the app only through a reviewed pull request. They hold no user data.
- Limit: a shared passcode cannot tell editors apart; the saved name is self-reported.

## Known limits (state them in the privacy policy)

- The project owner, with database access, can technically decrypt Vault secrets (PRD §9). Client-side end-to-end encryption is a later release.
- A grace-period deletion is not instant: for 7 days the data still exists.
- Data the owner has already shared outside Yusr cannot be recalled.

## Still needed (cannot be done from this repo)

1. Turn on GitHub secret scanning and push protection for the repository (Settings → Code security).
2. Set `INVITE_ALLOWED_ORIGIN` (above).
3. Move Supabase to a paid plan before launch (free projects pause).
4. Independent review by someone other than the author, and a review of Maldivian data-protection requirements.
5. Test on real iOS and Android devices: biometric lock, notifications, RTL layout, Thaana rendering.
