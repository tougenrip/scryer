-- Public bucket for global VTT sample assets (battlemaps, tokens, props, optional audio).
-- Uploads are intended to be done with the service role (e.g. scripts/upload-vtt-samples.cjs).
-- Anonymous and authenticated users can read objects for use in the VTT.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vtt-samples',
  'vtt-samples',
  true,
  52428800,
  null
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = coalesce(excluded.file_size_limit, storage.buckets.file_size_limit);

drop policy if exists "vtt_samples_public_read" on storage.objects;

create policy "vtt_samples_public_read"
on storage.objects
for select
to public
using (bucket_id = 'vtt-samples');
