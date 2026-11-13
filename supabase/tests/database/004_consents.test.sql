-- Consent records: add-only, own rows only, server-stamped time.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', '{}', '{}', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', '{}', '{}', now(), now());
insert into public.consents (user_id, kind, version) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'terms', '2026-11-15');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

select is((select count(*) from public.consents), 0::bigint, 'A cannot see B''s consents');
select lives_ok($$insert into public.consents (user_id, kind, version) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'terms', '2026-11-15'), ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'privacy', '2026-11-15'), ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'age_18', '2026-11-15')$$, 'A can record their own three consents');
select is((select count(*) from public.consents), 3::bigint, 'A sees their three');
select ok((select min(accepted_at) from public.consents) > now() - interval '1 minute', 'the time is stamped by the database');
select throws_ok($$insert into public.consents (user_id, kind, version) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'privacy', '2026-11-15')$$, '42501', null, 'A cannot record a consent for B');
select throws_ok($$insert into public.consents (user_id, kind, version, accepted_at) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'terms', '2026-12-01', '2020-01-01')$$, '42501', null, 'A cannot choose their own timestamp');
select throws_ok($$insert into public.consents (user_id, kind, version) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'marketing', '2026-11-15')$$, '23514', null, 'only known kinds are accepted');
select throws_ok($$insert into public.consents (user_id, kind, version) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'terms', 'latest')$$, '23514', null, 'the version must be a date');
select throws_ok($$update public.consents set version = '2030-01-01'$$, '42501', null, 'a consent record cannot be edited');
select throws_ok($$delete from public.consents$$, '42501', null, 'a consent record cannot be deleted by the person');
reset role; set local role anon;
select throws_ok($$select * from public.consents$$, '42501', null, 'signed-out users cannot read consents');

select * from finish();
rollback;
