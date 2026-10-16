begin;

alter table public.product_reviews
  add column if not exists image_urls text[] not null default '{}';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-review-photos', 'product-review-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view product review photos" on storage.objects;
create policy "Public can view product review photos"
on storage.objects for select to anon, authenticated
using (bucket_id = 'product-review-photos');

drop policy if exists "Customers upload own product review photos" on storage.objects;
create policy "Customers upload own product review photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-review-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp')
);

create or replace function public.attach_product_review_photos(p_product_id uuid, p_image_urls text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_path text;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_image_urls is null or cardinality(p_image_urls) > 4 then raise exception 'A review can include up to four photos.'; end if;
  foreach v_path in array coalesce(p_image_urls, array[]::text[]) loop
    if length(v_path) > 500 or v_path !~ ('^' || v_user_id::text || '/[^/]+[.](jpg|jpeg|png|webp)$') then
      raise exception 'Invalid review photo path.';
    end if;
  end loop;
  update public.product_reviews
     set image_urls = coalesce(p_image_urls, array[]::text[]), updated_at = now()
   where product_id = p_product_id
     and customer_id = v_user_id
     and status = 'pending';
  if not found then raise exception 'Submit your review before attaching photos.'; end if;
  return jsonb_build_object('success', true, 'photo_count', cardinality(coalesce(p_image_urls, array[]::text[])));
end
$function$;

revoke all on function public.attach_product_review_photos(uuid,text[]) from public, anon;
grant execute on function public.attach_product_review_photos(uuid,text[]) to authenticated;

commit;
