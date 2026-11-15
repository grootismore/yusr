-- Migration 022: promotion codes.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', '{}', '{}', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', '{}', '{}', now(), now()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.test', '{}', '{}', now(), now());

-- The owner makes codes.
select set_config('t.one', public.create_promo('One use, 30 days', 30, 1, null), true) is not null as c1;
select set_config('t.forever', public.create_promo('Friends, forever', null, 5, null), true) is not null as c2;
select set_config('t.old', public.create_promo('Expired', 30, 1, now() - interval '1 day'), true) is not null as c3;
select set_config('t.off', public.create_promo('Switched off', 30, 1, null), true) is not null as c4;
update public.promo_codes set disabled = true where label = 'Switched off';
select ok(current_setting('t.one') ~ '^[0-9A-F]{5}-[0-9A-F]{5}$', 'a code looks like 3F9A1-C72B8');
select is((select count(*) from public.promo_codes where code_hash = encode(sha256(convert_to(replace(current_setting('t.one'), '-', ''), 'UTF8')), 'hex')), 1::bigint, 'only its hash is kept');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select throws_ok($$select public.create_promo('Mine', 30, 1, null)$$, '42501', null, 'a user cannot make codes');
select throws_ok($$select * from public.promo_codes$$, '42501', null, 'or read them');
select throws_ok($$select public.redeem_promo('WRONG-CODE0')$$, 'P0002', null, 'a wrong code is refused');
select throws_ok($$select public.redeem_promo(current_setting('t.old'))$$, 'P0002', null, 'an expired code is refused');
select throws_ok($$select public.redeem_promo(current_setting('t.off'))$$, 'P0002', null, 'a switched-off code is refused');
select is((select (public.redeem_promo(lower(current_setting('t.one'))))->>'status'), 'plus', 'a good code gives Plus, typed in lower case');
select ok((select expires_at > now() + interval '29 days' and expires_at < now() + interval '31 days' from public.entitlements), 'for 30 days');
select throws_ok($$select public.redeem_promo(current_setting('t.one'))$$, 'P0002', null, 'the same code cannot be used twice');

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select throws_ok($$select public.redeem_promo(current_setting('t.one'))$$, 'P0002', null, 'a one-use code is used up');
select is((select (public.redeem_promo(current_setting('t.forever')))->>'status'), 'plus', 'a lasting code works');
select is((select expires_at from public.entitlements), null, 'and never ends');

-- A person paying through the store is left alone and the code is not used up.
reset role;
insert into public.entitlements (user_id, plan, source, expires_at) values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'plus', 'appstore', now() + interval '20 days');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select is((select (public.redeem_promo(current_setting('t.forever')))->>'status'), 'already_plus', 'a store subscriber keeps their subscription');
select * from finish();
rollback;
