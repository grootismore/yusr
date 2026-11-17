-- Migration 024: Wording edits made in the string editor (kharadhu-strings site).
--
-- One row per app string and language. The table has RLS on and no policies, so the app and the public API can't touch
-- it; only the string-edits edge function (service role, behind an editor key) reads and writes it.

create table public.string_edits (
  key text not null,
  lang text not null check (lang in ('dv', 'en')),
  value text not null check (length(value) between 1 and 2000),
  updated_at timestamptz not null default now(),
  primary key (key, lang)
);
alter table public.string_edits enable row level security;
