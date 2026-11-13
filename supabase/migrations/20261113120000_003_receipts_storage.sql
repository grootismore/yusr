-- Migration 003: private "receipts" bucket. Each user can only touch objects under their own
-- user_id/ prefix. Photos are compressed on the device (about 200-400 KB); 1.5 MB is a hard cap.
-- There is no update policy: a photo is uploaded once, read by the scan, then deleted.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 1572864, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy receipts_objects_select on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy receipts_objects_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy receipts_objects_delete on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
