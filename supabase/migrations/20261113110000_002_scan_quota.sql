-- Migration 002: scan quota. Clients can only READ scan_usage; the scan-receipt function
-- (service role) reserves and refunds scans through these two functions, so a failed scan
-- never costs quota and two parallel scans cannot slip past the limit.
-- The service role gets EXECUTE on these functions and nothing else: no table privileges.

-- Reserve one scan for p_month (first day of the month). Returns the new count, or null when
-- the limit is already reached.
create function public.reserve_scan(p_user uuid, p_month date, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  used integer;
begin
  if extract(day from p_month) <> 1 or p_limit < 1 then
    raise exception 'invalid arguments';
  end if;
  insert into public.scan_usage as u (user_id, month, scans_used)
  values (p_user, p_month, 1)
  on conflict (user_id, month) do update set scans_used = u.scans_used + 1
    where u.scans_used < p_limit
  returning u.scans_used into used;
  return used;
end;
$$;

-- Give a reserved scan back (the scan failed). Never goes below zero.
create function public.refund_scan(p_user uuid, p_month date)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.scan_usage
  set scans_used = greatest(scans_used - 1, 0)
  where user_id = p_user and month = p_month;
$$;

revoke all on function public.reserve_scan(uuid, date, integer) from public, anon, authenticated;
revoke all on function public.refund_scan(uuid, date) from public, anon, authenticated;
grant execute on function public.reserve_scan(uuid, date, integer) to service_role;
grant execute on function public.refund_scan(uuid, date) to service_role;
