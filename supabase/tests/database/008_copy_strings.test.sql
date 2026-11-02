-- Tests for migration 008: the wording editor's tables are closed to clients and append-only where it matters.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select is((select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relname in ('copy_strings', 'copy_history', 'copy_attempts') and c.relrowsecurity and c.relforcerowsecurity),
          3::bigint, 'all three tables have RLS enabled and forced');
select is((select count(*) from pg_policies where tablename in ('copy_strings', 'copy_history', 'copy_attempts')), 0::bigint, 'no policy opens them to a client');

-- Client roles get nothing.
select ok(not has_table_privilege('anon', 'public.copy_strings', 'select'), 'anon cannot read the wording');
select ok(not has_table_privilege('authenticated', 'public.copy_strings', 'select'), 'a signed-in user cannot read it either');
select ok(not has_table_privilege('authenticated', 'public.copy_strings', 'update'), 'nor edit it');
select ok(not has_table_privilege('authenticated', 'public.copy_history', 'select'), 'nor read the history');
select ok(not has_table_privilege('authenticated', 'public.copy_attempts', 'insert'), 'nor the throttle log');

-- The server role: exactly what the function needs.
select ok(has_table_privilege('service_role', 'public.copy_strings', 'select'), 'server can read the wording');
select ok(has_table_privilege('service_role', 'public.copy_strings', 'update'), 'server can edit it');
select ok(has_table_privilege('service_role', 'public.copy_strings', 'insert'), 'server can add strings (seeding)');
select ok(not has_table_privilege('service_role', 'public.copy_strings', 'delete'), 'server cannot delete strings');
select ok(has_table_privilege('service_role', 'public.copy_history', 'insert'), 'server can write history');
select ok(not has_table_privilege('service_role', 'public.copy_history', 'update'), 'history cannot be rewritten');
select ok(not has_table_privilege('service_role', 'public.copy_history', 'delete'), 'history cannot be erased');
select ok(not has_table_privilege('service_role', 'public.copy_attempts', 'delete'), 'the throttle log cannot be wiped');

-- Constraints.
select throws_ok($$insert into public.copy_strings (surface, key, en, dv) values ('legal', 'k', 'a', 'b')$$, '23514', null, 'only the known surfaces');
select throws_ok($$insert into public.copy_strings (surface, key, en, dv) values ('app', 'k', '', 'b')$$, '23514', null, 'English cannot be empty');
select throws_ok($$insert into public.copy_strings (surface, key, en, dv) values ('app', 'k', 'a', repeat('x', 2001))$$, '23514', null, 'wording has a length cap');

-- History keeps what was replaced, only when the text changed.
insert into public.copy_strings (surface, key, en, dv, updated_by) values ('app', 'home.income', 'Income', 'ދަށް', 'Aisha');
update public.copy_strings set dv = 'އާމްދަނީ', updated_by = 'Hassan' where surface = 'app' and key = 'home.income';
select is((select count(*) from public.copy_history where key = 'home.income'), 1::bigint, 'a change writes one history row');
select is((select dv from public.copy_history where key = 'home.income'), 'ދަށް', 'history holds the old Dhivehi');
select is((select changed_by from public.copy_history where key = 'home.income'), 'Hassan', 'and who replaced it');
update public.copy_strings set needs_review = true where surface = 'app' and key = 'home.income';
select is((select count(*) from public.copy_history where key = 'home.income'), 1::bigint, 'changing only the review flag writes no history');

select * from finish();
rollback;
