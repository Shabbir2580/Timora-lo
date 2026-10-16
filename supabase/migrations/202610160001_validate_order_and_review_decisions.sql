begin;

-- SQL NULL values do not satisfy "NOT IN" checks. Explicitly reject NULL
-- decisions in security-definer RPCs so malformed calls fail closed.
create or replace function public.review_cod_order(
  p_order_id uuid,
  p_decision text,
  p_rejection_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.orders%rowtype;
  v_item record;
begin
  if auth.uid() is null or not exists (
    select 1 from public.staff_roles
    where user_id = auth.uid() and role in ('admin','employee')
  ) then
    raise exception 'permission denied';
  end if;

  if p_decision is null or p_decision not in ('approve','reject') then
    raise exception 'invalid decision';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found or v_order.payment_provider <> 'cod'
     or v_order.order_status <> 'pending_payment'
     or v_order.payment_status <> 'pending' then
    raise exception 'order is not awaiting COD approval';
  end if;

  if p_decision = 'approve' then
    update public.orders
    set order_status = 'confirmed',
        cod_approved_by = auth.uid(),
        cod_approved_at = now(),
        updated_at = now()
    where id = p_order_id;
  else
    update public.orders
    set order_status = 'cancelled',
        cod_rejection_reason = left(coalesce(p_rejection_reason,''),500),
        updated_at = now()
    where id = p_order_id;

    for v_item in
      select product_id, quantity from public.order_items where order_id = p_order_id
    loop
      update public.products
      set stock = stock + v_item.quantity, updated_at = now()
      where id::text = v_item.product_id;
    end loop;

    if v_order.coupon_code is not null then
      update public.coupons
      set usage_count = greatest(0,usage_count-1), updated_at = now()
      where code = v_order.coupon_code;
    end if;
  end if;

  return jsonb_build_object('success',true,'order_id',p_order_id,'decision',p_decision);
end
$function$;

create or replace function public.moderate_product_review(
  p_review_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or not exists (
    select 1 from public.staff_roles
    where user_id = auth.uid() and role in ('admin','employee')
  ) then
    raise exception 'permission denied';
  end if;

  if p_decision is null or p_decision not in ('approved','rejected') then
    raise exception 'invalid moderation decision';
  end if;

  update public.product_reviews
  set status = p_decision, updated_at = now()
  where id = p_review_id;

  if not found then
    raise exception 'review not found';
  end if;

  return jsonb_build_object('success',true,'review_id',p_review_id,'status',p_decision);
end
$function$;

revoke all on function public.review_cod_order(uuid, text, text) from public, anon, authenticated;
revoke all on function public.moderate_product_review(uuid, text) from public, anon, authenticated;
grant execute on function public.review_cod_order(uuid, text, text) to authenticated;
grant execute on function public.moderate_product_review(uuid, text) to authenticated;

commit;
