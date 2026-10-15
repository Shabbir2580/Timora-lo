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
begin
  if auth.uid() is null or not exists (
    select 1
    from public.staff_roles sr
    where sr.user_id = auth.uid()
      and sr.role = 'admin'
  ) then
    raise exception 'Only an administrator can delete orders.';
  end if;

  select *
    into v_order
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'Order not found.';
  end if;

  -- A still-pending unpaid order has reserved stock. Return that stock before
  -- removing the order; cancelled/rejected orders have already been restored.
  if v_order.order_status = 'pending_payment'
     and v_order.payment_status = 'pending' then
    for v_item in
      select product_id, quantity
        from public.order_items
       where order_id = p_order_id
    loop
      update public.products
         set stock = stock + v_item.quantity,
             updated_at = now()
       where id::text = v_item.product_id;
    end loop;

    if v_order.coupon_code is not null then
      update public.coupons
         set usage_count = greatest(0, usage_count - 1),
             updated_at = now()
       where code = v_order.coupon_code;
    end if;
  end if;

  delete from public.order_items where order_id = p_order_id;
  delete from public.orders where id = p_order_id;

  return jsonb_build_object('success', true, 'order_id', p_order_id);
end;
$function$;

revoke all on function public.admin_delete_order(uuid) from public;
grant execute on function public.admin_delete_order(uuid) to authenticated;

commit;
