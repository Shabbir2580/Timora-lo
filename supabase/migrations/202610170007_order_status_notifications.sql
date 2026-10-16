-- Create in-app customer notifications from authoritative order changes.
-- This does not claim to send email/SMS/WhatsApp; it powers the existing notification inbox.

begin;

create or replace function public.timora_notify_customer_order_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text;
  v_title text;
  v_message text;
begin
  if new.customer_id is null then
    return new;
  end if;

  -- Notify only when a meaningful field changes. Repeated updates with identical
  -- values do not create duplicate notifications.
  if tg_op = 'INSERT' then
    v_type := 'order_update';
    v_title := 'Order received';
    v_message := 'Your order has been created and is awaiting the next step.';
  elsif new.payment_status is distinct from old.payment_status
    and new.payment_status = 'paid' then
    v_type := 'payment_confirmed';
    v_title := 'Payment confirmed';
    v_message := 'Payment for your Timora order has been confirmed.';
  elsif new.order_status is distinct from old.order_status then
    case new.order_status
      when 'confirmed' then
        v_type := 'order_update';
        v_title := 'Order confirmed';
        v_message := 'Your Timora order has been confirmed.';
      when 'processing' then
        v_type := 'order_update';
        v_title := 'Order processing';
        v_message := 'Your Timora order is being prepared.';
      when 'shipped' then
        v_type := 'order_shipped';
        v_title := 'Order shipped';
        v_message := 'Your Timora order has been shipped.';
      when 'delivered' then
        v_type := 'order_delivered';
        v_title := 'Order delivered';
        v_message := 'Your Timora order is marked as delivered.';
      when 'cancelled' then
        v_type := 'order_update';
        v_title := 'Order cancelled';
        v_message := 'Your Timora order has been cancelled.';
      else
        v_type := 'order_update';
        v_title := 'Order status updated';
        v_message := 'Your Timora order status has changed to ' || replace(new.order_status, '_', ' ') || '.';
    end case;
  elsif new.tracking_number is distinct from old.tracking_number
    or new.courier_name is distinct from old.courier_name then
    v_type := 'tracking_updated';
    v_title := 'Tracking details updated';
    v_message := 'Tracking details for your Timora order have been updated.';
  else
    return new;
  end if;

  insert into public.customer_notifications (
    customer_id, notification_type, title, message, href
  ) values (
    new.customer_id,
    v_type,
    v_title,
    v_message,
    '/orders'
  );

  return new;
end;
$$;

drop trigger if exists timora_order_customer_notification on public.orders;
create trigger timora_order_customer_notification
after insert or update of order_status, payment_status, tracking_number, courier_name
on public.orders
for each row
execute function public.timora_notify_customer_order_change();

revoke all on function public.timora_notify_customer_order_change() from public, anon, authenticated;

commit;
