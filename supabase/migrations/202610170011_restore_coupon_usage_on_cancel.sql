-- Keep coupon usage accounting accurate when unpaid orders are cancelled or expire.
-- Checkout increments usage_count when a coupon is reserved on a pending order.
-- These functions release that usage in the same transaction as stock restoration.

begin;

create or replace function public.cancel_my_pending_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.orders%rowtype;
  v_item record;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id and customer_id = auth.uid()
  for update;

  if not found then raise exception 'order not found'; end if;
  if v_order.order_status <> 'pending_payment' or v_order.payment_status <> 'pending' then
    raise exception 'only unpaid pending orders can be cancelled';
  end if;

  update public.orders
  set order_status = 'cancelled', updated_at = now()
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
    set usage_count = greatest(0, usage_count - 1), updated_at = now()
    where code = v_order.coupon_code;
  end if;

  return jsonb_build_object('success', true, 'order_id', p_order_id);
end
$function$;

create or replace function public.expire_stale_pending_orders()
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
  if auth.uid() is not null and not exists (
    select 1 from public.staff_roles
    where user_id = auth.uid() and role in ('admin', 'employee')
  ) then
    raise exception 'permission denied';
  end if;

  for v_order in
    select *
    from public.orders
    where order_status = 'pending_payment'
      and payment_status = 'pending'
      and created_at < now() - interval '30 minutes'
    for update skip locked
  loop
    update public.orders
    set order_status = 'cancelled', updated_at = now()
    where id = v_order.id;

    for v_item in
      select product_id, quantity from public.order_items where order_id = v_order.id
    loop
      update public.products
      set stock = stock + v_item.quantity, updated_at = now()
      where id::text = v_item.product_id;
    end loop;

    if v_order.coupon_code is not null then
      update public.coupons
      set usage_count = greatest(0, usage_count - 1), updated_at = now()
      where code = v_order.coupon_code;
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end
$function$;

revoke all on function public.cancel_my_pending_order(uuid) from public, anon;
revoke all on function public.expire_stale_pending_orders() from public, anon;
grant execute on function public.cancel_my_pending_order(uuid) to authenticated;
grant execute on function public.expire_stale_pending_orders() to authenticated, service_role;

commit;
