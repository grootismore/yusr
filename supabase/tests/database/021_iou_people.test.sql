-- Migration 029: the people a person keeps IOUs with.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', '{}', '{}', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', '{}', '{}', now(), now());
set local role authenticated;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select lives_ok($$insert into public.iou_people (user_id, name, email) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ahmed', null), ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Aisha', 'aisha@example.test')$$, 'A saves two people');
select throws_ok($$insert into public.iou_people (user_id, name) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'AHMED')$$, '23505', null, 'the same name in another case is the same person');
select throws_ok($$insert into public.iou_people (user_id, name, email) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Z', 'Z@Example.test')$$, '23514', null, 'an email is kept in lower case');
select throws_ok($$insert into public.iou_people (user_id, name) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'X')$$, '42501', null, 'nobody saves a person for someone else');

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select is((select count(*) from public.iou_people), 0::bigint, 'B sees none of As people');
update public.iou_people set email = 'x@example.test';
delete from public.iou_people;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select is((select count(*) from public.iou_people), 2::bigint, 'and cannot change or delete them');
select lives_ok($$delete from public.iou_people where name = 'Ahmed'$$, 'A removes Ahmed');
select is((select count(*) from public.iou_people), 1::bigint, 'and only Ahmed goes');

select * from finish();
rollback;
