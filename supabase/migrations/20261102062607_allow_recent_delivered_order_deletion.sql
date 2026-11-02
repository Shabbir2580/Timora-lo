-- Permit admins to permanently remove recently delivered orders only within a short cleanup window.
-- Delivered orders do not restore inventory or decrement coupon usage.
begin;

create or replace function public.admin_delete_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_recently_delivered boolean := false;
begin
  if auth.uid() is null or not exists (
    select 1 from public.staff_roles sr
    where sr.user_id = auth.uid() and sr.role = 'admin'
  ) then
    raise exception 'Only an administrator can delete orders.';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found.';
  end if;

  v_recently_delivered :=
    v_order.order_status = 'delivered'
    and v_order.delivered_at is not null
    and v_order.delivered_at >= now() - interval '7 days'
    and v_order.delivered_at <= now();

  if v_order.order_status = 'delivered' and not v_recently_delivered then
    raise exception 'Only orders delivered within the last 7 days can be deleted.';
  end if;

  if v_order.order_status not in ('pending_payment', 'cancelled', 'delivered') then
    raise exception 'Only unpaid pending, unpaid cancelled, or recently delivered orders can be deleted.';
  end if;

  if v_order.order_status = 'pending_payment' and v_order.payment_status <> 'pending' then
    raise exception 'This order has an inconsistent payment state and cannot be deleted safely.';
  end if;

  if v_order.order_status = 'cancelled' and (v_order.payment_status = 'paid' or v_order.payment_provider = 'razorpay') then
    raise exception 'Paid or Razorpay orders cannot be deleted through this cleanup action.';
  end if;

  if v_order.order_status = 'pending_payment' then
    if v_order.payment_provider = 'razorpay' then
      raise exception 'Razorpay orders cannot be deleted through this cleanup action.';
    end if;
    for v_item in
      select product_id, quantity from public.order_items where order_id = p_order_id
    loop
      if v_item.product_id is not null then
        update public.products
        set stock = stock + v_item.quantity, updated_at = now()
        where id::text = v_item.product_id::text;
      end if;
    end loop;

    if v_order.coupon_code is not null then
      update public.coupons
      set usage_count = greatest(0, usage_count - 1), updated_at = now()
      where code = v_order.coupon_code;
    end if;
  end if;

  -- Delivered orders are already fulfilled: never change stock or coupon usage.
  delete from public.order_items where order_id = p_order_id;
  delete from public.orders where id = p_order_id;

  return jsonb_build_object('success', true, 'order_id', p_order_id);
end;
$function$;

revoke all on function public.admin_delete_order(uuid) from public, anon;
grant execute on function public.admin_delete_order(uuid) to authenticated;

commit;
