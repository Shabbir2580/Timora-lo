-- Define the order-delivery RPC used by app/admin/orders/page.tsx.
-- This migration is intentionally additive; review the target project's schema
-- and migration history before applying it in Supabase.

begin;

create or replace function public.update_order_delivery(
  p_order_id uuid,
  p_new_status text,
  p_tracking_number text default null,
  p_courier_name text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.orders%rowtype;
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select sr.role into v_role
  from public.staff_roles sr
  where sr.user_id = auth.uid()
  limit 1;

  if v_role is null or v_role not in ('admin', 'employee') then
    raise exception 'staff permission required';
  end if;

  if p_new_status is null or p_new_status not in ('processing', 'shipped', 'delivered') then
    raise exception 'invalid delivery status';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  if v_order.order_status = 'confirmed' and p_new_status = 'processing' then
    -- Continue below after validating payment/approval.
    null;
  elsif v_order.order_status = 'processing' and p_new_status = 'shipped' then
    if length(trim(coalesce(p_tracking_number, ''))) not between 1 and 200
      or length(trim(coalesce(p_courier_name, ''))) not between 1 and 120 then
      raise exception 'courier name and tracking number are required to ship';
    end if;
  elsif v_order.order_status = 'shipped' and p_new_status = 'delivered' then
    null;
  else
    raise exception 'invalid order status transition';
  end if;

  if v_order.payment_provider = 'cod' then
    if v_order.cod_approved_at is null then
      raise exception 'COD order must be approved before delivery processing';
    end if;
  elsif v_order.payment_status <> 'paid' then
    raise exception 'payment must be verified before delivery processing';
  end if;

  if p_new_status = 'processing' then
    update public.orders
    set order_status = 'processing', updated_at = now()
    where id = p_order_id;
  elsif p_new_status = 'shipped' then
    update public.orders
    set order_status = 'shipped',
        tracking_number = trim(p_tracking_number),
        courier_name = trim(p_courier_name),
        shipped_at = now(),
        updated_at = now()
    where id = p_order_id;
  else
    update public.orders
    set order_status = 'delivered',
        delivered_at = now(),
        updated_at = now()
    where id = p_order_id;
  end if;

  return jsonb_build_object('order_id', p_order_id, 'order_status', p_new_status);
end;
$function$;

revoke all on function public.update_order_delivery(uuid, text, text, text) from public, anon;
grant execute on function public.update_order_delivery(uuid, text, text, text) to authenticated;

commit;
