-- Migration 022: promotion codes for Kharadhu Plus.
--
-- The owner makes a code with create_promo() from the SQL editor (or the service role); it is shown once and only its
-- hash is kept. A person types it in the app: redeem_promo() checks it and gives Plus for the code's days (or for good),
-- by writing the person's entitlement. Each code has a use limit, can expire, and can be switched off. A person can use
-- a code once. Ten wrong tries an hour are the limit. A person who already pays through the store is not touched and
-- the code is not used up. Discounts on the store price are done with the stores' own offer codes (see docs/PROMO_CODES.md).

create table public.promo_codes (
  id          uuid primary key default gen_random_uuid(),
  code_hash   text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  label       text not null check (char_length(label) between 1 and 100),
  -- Days of Plus it gives; null = for good.
  grants_days integer check (grants_days is null or grants_days between 1 and 3650),
  max_uses    integer not null default 1 check (max_uses between 1 and 100000),
  uses        integer not null default 0 check (uses >= 0),
  -- The code can be typed until this moment; null = no end.
  valid_until timestamptz,
  disabled    boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.promo_redemptions (
  code_id     uuid not null references public.promo_codes (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (code_id, user_id)
);

create table public.promo_attempts (
  id      bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  at      timestamptz not null default now()
);
create index promo_attempts_user_idx on public.promo_attempts (user_id, at desc);

-- Only the functions below touch these tables.
alter table public.promo_codes       enable row level security;
alter table public.promo_redemptions enable row level security;
alter table public.promo_attempts    enable row level security;
revoke all on public.promo_codes, public.promo_redemptions, public.promo_attempts from anon, authenticated, service_role;

-- Make a code. Returns it once, like "3F9A1-C72B8"; only the hash is kept. Run it as the owner (SQL editor).
create function public.create_promo(p_label text, p_days integer default null, p_max_uses integer default 1, p_valid_until timestamptz default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw  text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
begin
  insert into public.promo_codes (code_hash, label, grants_days, max_uses, valid_until)
  values (encode(sha256(convert_to(raw, 'UTF8')), 'hex'), p_label, p_days, p_max_uses, p_valid_until);
  return substr(raw, 1, 5) || '-' || substr(raw, 6);
end;
$$;

-- Use a code. Returns {status: 'plus', expires_at} or {status: 'already_plus'} (the code is then not used up).
create function public.redeem_promo(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid     uuid := (select auth.uid());
  promo   public.promo_codes;
  cur     public.entitlements;
  new_exp timestamptz;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if (select count(*) from public.promo_attempts a where a.user_id = uid and a.at > now() - interval '1 hour') >= 10 then
    raise exception 'too many attempts' using errcode = '54000';
  end if;
  insert into public.promo_attempts (user_id) values (uid);

  select * into promo from public.promo_codes c
   where c.code_hash = encode(sha256(convert_to(upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g')), 'UTF8')), 'hex')
     and not c.disabled and c.uses < c.max_uses and (c.valid_until is null or c.valid_until > now())
   for update;
  -- The same answer for a wrong, used-up, switched-off or expired code, so codes cannot be probed.
  if not found or exists (select 1 from public.promo_redemptions r where r.code_id = promo.id and r.user_id = uid) then
    raise exception 'invalid code' using errcode = 'P0002';
  end if;

  select * into cur from public.entitlements e where e.user_id = uid;
  if found and cur.plan = 'plus' and cur.source in ('appstore', 'playstore') and (cur.expires_at is null or cur.expires_at > now()) then
    return jsonb_build_object('status', 'already_plus');
  end if;

  if (found and cur.plan = 'plus' and cur.expires_at is null) or promo.grants_days is null then
    new_exp := null;
  else
    new_exp := greatest(now(), coalesce(case when found and cur.plan = 'plus' then cur.expires_at end, now())) + make_interval(days => promo.grants_days);
  end if;
  insert into public.entitlements as e (user_id, plan, source, expires_at, updated_at)
  values (uid, 'plus', 'promo', new_exp, now())
  on conflict (user_id) do update set plan = 'plus', source = 'promo', expires_at = new_exp, updated_at = now();
  insert into public.promo_redemptions (code_id, user_id) values (promo.id, uid);
  update public.promo_codes set uses = uses + 1 where id = promo.id;
  return jsonb_build_object('status', 'plus', 'expires_at', new_exp);
end;
$$;

revoke all on function public.create_promo(text, integer, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.redeem_promo(text) from public, anon, authenticated;
grant execute on function public.redeem_promo(text) to authenticated;
