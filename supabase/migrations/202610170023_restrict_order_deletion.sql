begin;

-- Keep order history intact: admins may remove only cancelled, unpaid, non-Razorpay
-- orders. Paid, active, pending, and gateway-backed orders must be retained.
create or replace function public.admin_delete_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.orders%rowtype;
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

  if v_order.order_status <> 'cancelled'
     or v_order.payment_status = 'paid'
     or v_order.payment_provider = 'razorpay' then
    raise exception 'Only cancelled, unpaid orders that were not paid through Razorpay can be deleted. Keep active and payment-gateway order history for reconciliation.';
  end if;

  delete from public.order_items where order_id = p_order_id;
  delete from public.orders where id = p_order_id;

  return jsonb_build_object('success', true, 'order_id', p_order_id);
end;
$function$;

revoke all on function public.admin_delete_order(uuid) from public;
grant execute on function public.admin_delete_order(uuid) to authenticated;

commit;
