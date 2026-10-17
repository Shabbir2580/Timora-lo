begin;

create or replace function public.cancel_unpaid_razorpay_order(
  p_order_id uuid,
  p_razorpay_order_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $razcancel$
declare
  v_order public.orders%rowtype;
  v_item record;
begin
  if p_razorpay_order_id is not null and left(p_razorpay_order_id, 6) <> 'order_' then
    raise exception 'invalid Razorpay order ID';
  end if;
  select * into v_order from public.orders
    where id = p_order_id
      and payment_provider = 'razorpay'
      and ((p_razorpay_order_id is null and payment_reference is null) or payment_reference = p_razorpay_order_id)
      and order_status = 'pending_payment'
      and payment_status = 'pending'
    for update;
  if not found then raise exception 'pending Razorpay order not found'; end if;

  update public.orders set order_status = 'cancelled', updated_at = now() where id = p_order_id;
  for v_item in select product_id, quantity from public.order_items where order_id = p_order_id loop
    update public.products set stock = stock + v_item.quantity, updated_at = now()
      where id::text = v_item.product_id;
  end loop;
  if v_order.coupon_code is not null then
    update public.coupons set usage_count = greatest(0, usage_count - 1), updated_at = now()
      where code = v_order.coupon_code;
  end if;
  return jsonb_build_object('success', true, 'order_id', p_order_id);
end;
$razcancel$;

revoke all on function public.cancel_unpaid_razorpay_order(uuid,text) from public, anon, authenticated;
grant execute on function public.cancel_unpaid_razorpay_order(uuid,text) to service_role;

commit;
