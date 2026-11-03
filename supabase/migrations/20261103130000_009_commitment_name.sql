-- Migration 009: an optional name for a Sadaqat plan ("Friday at the masjid", "Mum, monthly").
-- Nothing else changes: the table's row-level security and grants already cover every column, so
-- the owner can read and write the name and nobody else can.

alter table public.commitments
  add column name text check (name is null or char_length(name) between 1 and 100);
