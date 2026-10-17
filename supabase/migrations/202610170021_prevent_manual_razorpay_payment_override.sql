begin;

create or replace function public.verify_order_payment(p_order_id uuid, p_payment_reference text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.orders%rowtype;
begin
  if auth.uid() is null or not exists (
    select 1 from public.staff_roles
    where user_id = auth.uid() and role in ('admin', 'employee')
  ) then
    raise exception 'permission denied';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order not found'; end if;
  if v_order.payment_provider in ('cod', 'razorpay')
    or v_order.payment_status <> 'pending'
    or v_order.order_status <> 'pending_payment'
  then
    raise exception 'order is not awaiting manual payment verification';
  end if;

  update public.orders
    set payment_status = 'paid',
        order_status = 'confirmed',
        payment_reference = nullif(left(trim(coalesce(p_payment_reference, '')), 200), ''),
        payment_verified_at = now(),
        updated_at = now()
    where id = p_order_id;
  return jsonb_build_object('success', true, 'order_id', p_order_id, 'payment_status', 'paid');
end;
$function$;

revoke all on function public.verify_order_payment(uuid,text) from public, anon;
grant execute on function public.verify_order_payment(uuid,text) to authenticated;

commit;
