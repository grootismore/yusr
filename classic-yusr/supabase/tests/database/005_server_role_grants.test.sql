-- The server role gets exactly what the invite function needs, and nothing more.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- What the invite function needs.
select ok(has_table_privilege('service_role', 'public.invite_attempts', 'select'), 'server can count throttle attempts');
select ok(has_table_privilege('service_role', 'public.invite_attempts', 'insert'), 'server can record an attempt');
select ok(has_table_privilege('service_role', 'public.trusted_contacts', 'select'), 'server can look up an invite');
select ok(has_column_privilege('service_role', 'public.trusted_contacts', 'status', 'update'), 'server can accept or decline');

-- What it must NOT have: least privilege.
select ok(not has_column_privilege('service_role', 'public.trusted_contacts', 'name', 'update'), 'server cannot rewrite a contact');
select ok(not has_column_privilege('service_role', 'public.trusted_contacts', 'invite_token_hash', 'update'), 'server cannot set a token hash');
select ok(not has_table_privilege('service_role', 'public.trusted_contacts', 'insert'), 'server cannot invent contacts');
select ok(not has_table_privilege('service_role', 'public.trusted_contacts', 'delete'), 'server cannot erase contacts');
select ok(not has_table_privilege('service_role', 'public.invite_attempts', 'update'), 'the throttle log is append-only');
select ok(not has_table_privilege('service_role', 'public.invite_attempts', 'delete'), 'nor can it be wiped');

select is(
  (select count(*) from unnest(array['debts', 'receivables', 'commitments', 'recurring_items', 'transactions', 'accounts', 'categories',
                                     'profiles', 'audit_log', 'release_cases', 'wasiyyah_notes']) as t(name)
    where has_table_privilege('service_role', 'public.' || t.name, 'select')),
  0::bigint,
  'the server role cannot read any user data (debts, transactions, the audit log, release cases, notes, ...)');

-- A table created later gets no automatic grant either (this is what hosted projects do).
create table public.zz_probe (id int);
select ok(not has_table_privilege('service_role', 'public.zz_probe', 'select'), 'new tables are closed to the server role until a migration opens them');

select * from finish();
rollback;
