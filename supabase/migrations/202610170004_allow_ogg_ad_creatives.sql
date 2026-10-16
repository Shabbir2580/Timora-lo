-- Allow the .ogg extension as well as .ogv for video/ogg uploads.
-- Safe to re-run: policies are replaced with the same permission-gated rules.
begin;

drop policy if exists "Authorized staff upload ad creatives" on storage.objects;
create policy "Authorized staff upload ad creatives"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'ad-creatives'
  and (
    public.timora_has_staff_permission('manage_advertisements')
    or public.timora_has_staff_permission('manage_marketing_content')
  )
  and lower(storage.extension(name)) in (
    'jpg','jpeg','png','webp','avif','gif',
    'mp4','webm','mov','ogv','ogg'
  )
);

drop policy if exists "Authorized staff update ad creatives" on storage.objects;
create policy "Authorized staff update ad creatives"
on storage.objects
for update to authenticated
using (
  bucket_id = 'ad-creatives'
  and (
    public.timora_has_staff_permission('manage_advertisements')
    or public.timora_has_staff_permission('manage_marketing_content')
  )
)
with check (
  bucket_id = 'ad-creatives'
  and (
    public.timora_has_staff_permission('manage_advertisements')
    or public.timora_has_staff_permission('manage_marketing_content')
  )
  and lower(storage.extension(name)) in (
    'jpg','jpeg','png','webp','avif','gif',
    'mp4','webm','mov','ogv','ogg'
  )
);

commit;
