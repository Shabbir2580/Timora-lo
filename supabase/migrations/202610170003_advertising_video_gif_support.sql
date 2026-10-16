-- Add media-type support to Timora campaign creatives (images, GIFs and video).
begin;

alter table public.ad_campaigns
  add column if not exists media_type text not null default 'image'
  check (media_type in ('image', 'video'));

-- Append media_type to the existing public-safe view to preserve existing column order.
create or replace view public.ad_public_campaigns
with (security_barrier = true)
as
select c.id, c.campaign_type, c.placement, c.headline, c.description,
       c.image_url, c.destination_url, c.product_id, c.starts_at, c.ends_at,
       a.advertiser_type, c.media_type
from public.ad_campaigns c
join public.advertisers a on a.id = c.advertiser_id
where public.timora_campaign_is_public(c.id);

revoke all privileges on table public.ad_public_campaigns from public, anon, authenticated;
grant select on table public.ad_public_campaigns to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ad-creatives',
  'ad-creatives',
  true,
  104857600,
  array[
    'image/jpeg','image/png','image/webp','image/avif','image/gif',
    'video/mp4','video/webm','video/quicktime','video/ogg'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authorized staff upload ad creatives" on storage.objects;
create policy "Authorized staff upload ad creatives" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'ad-creatives'
  and (public.timora_has_staff_permission('manage_advertisements') or public.timora_has_staff_permission('manage_marketing_content'))
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','avif','gif','mp4','webm','mov','ogv')
);

drop policy if exists "Authorized staff update ad creatives" on storage.objects;
create policy "Authorized staff update ad creatives" on storage.objects
for update to authenticated
using (bucket_id = 'ad-creatives' and (public.timora_has_staff_permission('manage_advertisements') or public.timora_has_staff_permission('manage_marketing_content')))
with check (
  bucket_id = 'ad-creatives'
  and (public.timora_has_staff_permission('manage_advertisements') or public.timora_has_staff_permission('manage_marketing_content'))
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','avif','gif','mp4','webm','mov','ogv')
);

drop policy if exists "Authorized staff delete ad creatives" on storage.objects;
create policy "Authorized staff delete ad creatives" on storage.objects
for delete to authenticated
using (bucket_id = 'ad-creatives' and (public.timora_has_staff_permission('manage_advertisements') or public.timora_has_staff_permission('manage_marketing_content')));

commit;
