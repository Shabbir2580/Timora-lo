-- Allow the scheduled expiry job to release stock without a user JWT.
-- Keep the interactive RPC protected; this separate function is executable by
-- the database job owner, but not by anon/authenticated clients.
begin;

create or replace function public.expire_stale_pending_orders_cron()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_count integer := 0;
begin
  for v_order in
    select *
    from public.orders
    where order_status = 'pending_payment'
      and payment_status = 'pending'
      and created_at < now() - interval '30 minutes'
    order by created_at
    for update skip locked
  loop
    for v_item in
      select product_id, quantity
      from public.order_items
      where order_id = v_order.id
    loop
      if v_item.product_id is not null then
        update public.products
        set stock = stock + v_item.quantity, updated_at = now()
        where id = v_item.product_id;
      end if;
    end loop;

    update public.orders
    set order_status = 'cancelled', updated_at = now()
    where id = v_order.id
      and order_status = 'pending_payment'
      and payment_status = 'pending';

    if found then
      -- Match the interactive expiry/cancellation path: release the coupon
      -- usage reservation as well as stock when an unpaid order expires.
      if v_order.coupon_code is not null then
        update public.coupons
        set usage_count = greatest(0, usage_count - 1), updated_at = now()
        where code = v_order.coupon_code;
      end if;
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end
$function$;

revoke all on function public.expire_stale_pending_orders_cron() from public, anon, authenticated;

commit;
