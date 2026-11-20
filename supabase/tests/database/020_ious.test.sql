-- Migration 026: IOUs between two people.
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', '{}', '{}', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', '{}', '{}', now(), now()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.test', '{}', '{}', now(), now());
set local role authenticated;

-- A lent Ahmed (B) 500.00 and wants him reminded by email.
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claims', '{"email":"a@example.test"}', true);
select lives_ok($$insert into public.ious (id, user_id, direction, person_name, person_email, amount_laari, due_on, nudge) values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'lent', 'Ahmed', 'b@example.test', 50000, '2026-12-01', 'both')$$, 'A makes an IOU');
select throws_ok($$insert into public.ious (user_id, direction, person_name, amount_laari, nudge) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'lent', 'X', 100, 'both')$$, '23514', null, 'an email nudge needs an email');
select throws_ok($$insert into public.ious (user_id, direction, person_name, person_email, amount_laari, nudge) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'borrowed', 'X', 'x@example.test', 100, 'both')$$, '23514', null, 'and only when you lent');
select throws_ok($$insert into public.ious (user_id, direction, person_name, person_email, amount_laari) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'lent', 'X', 'X@Example.test', 100)$$, '23514', null, 'an email is kept in lower case');
select throws_ok($$insert into public.ious (user_id, direction, person_name, amount_laari) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'lent', 'X', 100)$$, '42501', null, 'nobody makes an IOU as someone else');
select throws_ok($$insert into public.ious (user_id, direction, person_name, person_account, amount_laari) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'lent', 'X', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 100)$$, '42501', null, 'nobody is put into an IOU by someone else');

-- An outsider sees nothing and cannot join in.
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select set_config('request.jwt.claims', '{"email":"c@example.test"}', true);
select is((select count(*) from public.ious) + (select count(*) from public.my_iou_invites()), 0::bigint, 'an outsider sees no IOU and has no invitation');
select throws_ok($$insert into public.iou_payments (iou_id, amount_laari, created_by) values ('11111111-1111-1111-1111-111111111111', 100, 'cccccccc-cccc-cccc-cccc-cccccccccccc')$$, '42501', null, 'an outsider cannot record a payment');
select throws_ok($$select public.accept_iou('11111111-1111-1111-1111-111111111111')$$, 'P0002', null, 'nor accept an invitation that is not for their email');

-- B sees it turned round, and accepts.
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select set_config('request.jwt.claims', '{"email":"b@example.test"}', true);
select is((select direction from public.my_iou_invites()), 'borrowed', 'what A lent is what B borrowed');
select lives_ok($$select public.accept_iou('11111111-1111-1111-1111-111111111111')$$, 'B accepts');
select is((select count(*) from public.ious), 1::bigint, 'and now sees the IOU');

-- B records a payment but cannot change or delete the IOU, or pay in the name of A.
select lives_ok($$insert into public.iou_payments (iou_id, amount_laari, created_by) values ('11111111-1111-1111-1111-111111111111', 20000, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')$$, 'B records a payment');
update public.ious set amount_laari = 1 where id = '11111111-1111-1111-1111-111111111111';
delete from public.ious where id = '11111111-1111-1111-1111-111111111111';
select is((select amount_laari from public.ious), 50000::bigint, 'B cannot change or delete the IOU');
select throws_ok($$insert into public.iou_payments (iou_id, amount_laari, created_by) values ('11111111-1111-1111-1111-111111111111', 5, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, '42501', null, 'nor record a payment in A''s name');

-- B leaves; A keeps the IOU and the payment, with the email nudge turned down to a phone reminder.
select lives_ok($$select public.leave_iou('11111111-1111-1111-1111-111111111111')$$, 'B leaves');
select is((select count(*) from public.ious), 0::bigint, 'B no longer sees it');
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claims', '{"email":"a@example.test"}', true);
select is((select nudge || ':' || coalesce(person_email, 'none') from public.ious) || ':' || (select count(*) from public.iou_payments), 'me:none:1', 'A keeps it, with the payment, and the email nudge is off');

select * from finish();
rollback;
