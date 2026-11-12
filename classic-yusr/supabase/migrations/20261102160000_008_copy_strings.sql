-- Migration 008: the wording editor (docs/COPY_EDITOR.md).
-- App and invite-page wording (English and Dhivehi) is edited on a small web page that talks to the
-- `copy-editor` Edge Function. Nothing here is user data; it is the app's own text. The tables are
-- closed to every client role (RLS on, no policies): only the function, running as the server role,
-- can read or change them, and only after the shared passcode checks out.
--   copy_strings   one row per string and surface; the live wording being edited
--   copy_history   every earlier value of a string that was changed (append-only)
--   copy_attempts  failed passcode attempts by hashed address, for the throttle

create table public.copy_strings (
  surface      text not null check (surface in ('app', 'invite')),
  key          text not null check (char_length(key) between 1 and 200),
  en           text not null check (char_length(en) between 1 and 2000),
  dv           text not null check (char_length(dv) between 1 and 2000),
  -- Placeholders such as {{name}} that must appear unchanged in both languages.
  tokens       text[] not null default '{}',
  needs_review boolean not null default false,
  updated_at   timestamptz not null default now(),
  updated_by   text check (char_length(updated_by) <= 60),
  primary key (surface, key)
);

create trigger copy_strings_updated_at before update on public.copy_strings
  for each row execute function public.set_updated_at();

create table public.copy_history (
  id         bigint generated always as identity primary key,
  surface    text not null,
  key        text not null,
  en         text not null,
  dv         text not null,
  changed_at timestamptz not null default now(),
  changed_by text
);
create index copy_history_idx on public.copy_history (surface, key, changed_at desc);

create table public.copy_attempts (
  id           bigint generated always as identity primary key,
  ip_hash      text not null,
  attempted_at timestamptz not null default now()
);
create index copy_attempts_idx on public.copy_attempts (ip_hash, attempted_at desc);

-- Keep the value being replaced, so a wrong edit can always be put back.
create function public.copy_strings_history()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.en is distinct from old.en or new.dv is distinct from old.dv then
    insert into public.copy_history (surface, key, en, dv, changed_by)
    values (old.surface, old.key, old.en, old.dv, new.updated_by);
  end if;
  return new;
end;
$$;
revoke all on function public.copy_strings_history() from public, anon, authenticated;

create trigger copy_strings_history_trg before update on public.copy_strings
  for each row execute function public.copy_strings_history();

alter table public.copy_strings enable row level security;
alter table public.copy_strings force row level security;
alter table public.copy_history enable row level security;
alter table public.copy_history force row level security;
alter table public.copy_attempts enable row level security;
alter table public.copy_attempts force row level security;

-- Least privilege for the server role (as in migration 005): spell out exactly what it may do.
revoke all on public.copy_strings, public.copy_history, public.copy_attempts from anon, authenticated;
grant select, insert, update on public.copy_strings to service_role;
grant select, insert on public.copy_history to service_role;
grant select, insert on public.copy_attempts to service_role;
