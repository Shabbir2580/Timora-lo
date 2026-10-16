-- Attach review photos to exactly one review, not every pending review for the same product.
-- The newest pending review for the authenticated customer/product is the review
-- created immediately before the photo uploads in the current client workflow.
begin;

create or replace function public.attach_product_review_photos(p_product_id uuid, p_image_urls text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_path text;
  v_review_id uuid;
  v_photo_count integer := cardinality(coalesce(p_image_urls, array[]::text[]));
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_image_urls is null or v_photo_count > 4 then
    raise exception 'A review can include up to four photos.';
  end if;

  foreach v_path in array coalesce(p_image_urls, array[]::text[]) loop
    if length(v_path) > 500
       or v_path !~ ('^' || v_user_id::text || '/[^/]+[.](jpg|jpeg|png|webp)$') then
      raise exception 'Invalid review photo path.';
    end if;
  end loop;

  select r.id
    into v_review_id
    from public.product_reviews r
   where r.product_id = p_product_id
     and r.customer_id = v_user_id
     and r.status = 'pending'
   order by r.created_at desc, r.id desc
   limit 1
   for update;

  if v_review_id is null then
    raise exception 'Submit your review before attaching photos.';
  end if;

  update public.product_reviews
     set image_urls = coalesce(p_image_urls, array[]::text[]),
         updated_at = now()
   where id = v_review_id;

  return jsonb_build_object(
    'success', true,
    'review_id', v_review_id,
    'photo_count', v_photo_count
  );
end
$function$;

revoke all on function public.attach_product_review_photos(uuid,text[]) from public, anon;
grant execute on function public.attach_product_review_photos(uuid,text[]) to authenticated;

commit;
