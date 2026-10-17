begin;

-- Payment finalization is a privileged server action. A signed-in customer must not be able
-- to call this RPC directly to mark an unpaid order as paid.
create or replace function public.verify_razorpay_order_payment(
  p_order_id uuid,
  p_razorpay_order_id text,
  p_payment_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $verify$
begin
  if p_razorpay_order_id is null or left(p_razorpay_order_id, 6) <> 'order_' or length(p_razorpay_order_id) < 10 then
    raise exception 'invalid Razorpay order ID';
  end if;
  if p_payment_id is null or left(p_payment_id, 4) <> 'pay_' or length(p_payment_id) < 8 then
    raise exception 'invalid Razorpay payment ID';
  end if;

  update public.orders
    set payment_status = 'paid',
        order_status = 'confirmed',
        payment_reference = left(p_payment_id, 200),
        payment_verified_at = now(),
        updated_at = now()
    where id = p_order_id
      and payment_provider = 'razorpay'
      and payment_status = 'pending'
      and order_status = 'pending_payment'
      and payment_reference = p_razorpay_order_id;

  if not found then raise exception 'Razorpay payment does not match a pending order'; end if;
  return jsonb_build_object('success', true, 'order_id', p_order_id, 'payment_status', 'paid');
end;
$verify$;

revoke all on function public.verify_razorpay_order_payment(uuid,text,text) from public, anon, authenticated;
grant execute on function public.verify_razorpay_order_payment(uuid,text,text) to service_role;

commit;
