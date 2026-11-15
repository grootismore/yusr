-- Migration 011: debts in a foreign currency, and a minimum that is a share of the balance.
-- A credit card can be owed in USD while the person pays in MVR. The debt keeps its own currency: the balance, the
-- minimum and each payment's effect are in that currency (minor units), and a payment also records the MVR the
-- person really paid, so history shows both. A minimum can be a percentage of the balance with a fixed floor
-- (for example 5% of the balance, never less than MVR 100), which is how many cards work.

alter table public.debts
  add column currency    text not null default 'MVR' check (currency ~ '^[A-Z]{3}$'),
  -- Share of the current balance due each month, in basis points (500 = 5%). min_payment_laari is then the floor.
  add column min_pct_bps smallint check (min_pct_bps between 1 and 10000);

-- What the person actually paid in MVR, when the debt is in another currency. amount_laari stays in the debt's currency.
alter table public.debt_payments
  add column paid_mvr_laari bigint check (paid_mvr_laari > 0 and paid_mvr_laari <= 9007199254740991);

-- The register trusted contacts read after a confirmed release now says which currency each balance is in.
create or replace function public.get_register_for_contact(p_owner uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not exists (
       select 1 from public.trusted_contacts c
       where c.user_id = p_owner and lower(c.email) = public.verified_email() and c.status = 'accepted')
     or not exists (select 1 from public.release_checkins r where r.user_id = p_owner and r.state = 'released')
  then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  insert into public.audit_log (user_id, actor, event) values (p_owner, 'contact', 'register_viewed');

  select jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', i.kind, 'title', i.title, 'counterparty', i.counterparty, 'amount_laari', i.amount_laari,
        'details', (select s.decrypted_secret from vault.decrypted_secrets s
                     where s.id = i.details_secret_id and s.name = 'register:' || i.id || ':details')
      ) order by i.kind, i.title)
      from public.register_items i where i.user_id = p_owner), '[]'::jsonb),
    -- Debts the owner chose to include, with what is still owed. Settled debts are left out.
    'debts', coalesce((
      select jsonb_agg(jsonb_build_object('lender', b.lender, 'kind', b.kind, 'balance_laari', b.balance_laari, 'currency', b.currency) order by b.lender)
      from (select d.lender, d.kind, d.currency,
                   greatest(d.opening_balance_laari - coalesce((select sum(p.amount_laari) from public.debt_payments p where p.debt_id = d.id), 0), 0) as balance_laari
            from public.debts d where d.user_id = p_owner and d.in_register) b
      where b.balance_laari > 0), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

