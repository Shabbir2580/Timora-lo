-- In-app customer notifications for order lifecycle changes.
begin;

create table if not exists public.customer_notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null check (notification_type in ('order_placed', 'payment_confirmed', 'order_confirmed', 'order_processing', 'order_shipped', 'order_delivered', 'order_cancelled', 'tracking_updated')),
  title text not null,
  message text not null,
  href text not null default '/orders' check (href like '/%'),
  dedupe_key text not null unique,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists customer_notifications_customer_created_idx
on public.customer_notifications(customer_id, created_at desc);

alter table public.customer_notifications enable row level security;
revoke all on public.customer_notifications from anon, authenticated;
grant select on public.customer_notifications to authenticated;
grant update (read_at) on public.customer_notifications to authenticated;

drop policy if exists "Customers read own notifications" on public.customer_notifications;
create policy "Customers read own notifications"
on public.customer_notifications for select to authenticated
using (customer_id = auth.uid());

drop policy if exists "Customers mark own notifications read" on public.customer_notifications;
create policy "Customers mark own notifications read"
on public.customer_notifications for update to authenticated
using (customer_id = auth.uid())
with check (customer_id = auth.uid());

create or replace function public.notify_customer_order_placed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.customer_id is not null then
    insert into public.customer_notifications(
      customer_id, notification_type, title, message, href, dedupe_key
    ) values (
      new.customer_id,
      'order_placed',
      'Order received',
      'Your Timora order has been received. Follow its progress in your account.',
      '/orders',
      new.id::text || ':order_placed'
    )
    on conflict (dedupe_key) do nothing;
  end if;
  return new;
end
$function$;

create or replace function public.notify_customer_order_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.customer_id is null then
    return new;
  end if;

  if new.payment_status is distinct from old.payment_status
     and new.payment_status = 'paid' then
    insert into public.customer_notifications(customer_id, notification_type, title, message, href, dedupe_key)
    values (
      new.customer_id, 'payment_confirmed', 'Payment confirmed',
      'Your payment has been confirmed by Timora.', '/orders',
      new.id::text || ':payment_confirmed'
    )
    on conflict (dedupe_key) do nothing;
  end if;

  if new.order_status is distinct from old.order_status then
    if new.order_status = 'confirmed' then
      insert into public.customer_notifications(customer_id, notification_type, title, message, href, dedupe_key)
      values (new.customer_id, 'order_confirmed', 'Order confirmed', 'Your order is confirmed and will move to processing shortly.', '/orders', new.id::text || ':order_confirmed')
      on conflict (dedupe_key) do nothing;
    elsif new.order_status = 'processing' then
      insert into public.customer_notifications(customer_id, notification_type, title, message, href, dedupe_key)
      values (new.customer_id, 'order_processing', 'Order being prepared', 'Your order is being prepared for dispatch.', '/orders', new.id::text || ':order_processing')
      on conflict (dedupe_key) do nothing;
    elsif new.order_status = 'shipped' then
      insert into public.customer_notifications(customer_id, notification_type, title, message, href, dedupe_key)
      values (new.customer_id, 'order_shipped', 'Your order is on its way', 'Your order has been marked as shipped. Check tracking details in Your Orders.', '/orders', new.id::text || ':order_shipped')
      on conflict (dedupe_key) do nothing;
    elsif new.order_status = 'delivered' then
      insert into public.customer_notifications(customer_id, notification_type, title, message, href, dedupe_key)
      values (new.customer_id, 'order_delivered', 'Order delivered', 'Your order is marked as delivered. We hope you love your purchase.', '/orders', new.id::text || ':order_delivered')
      on conflict (dedupe_key) do nothing;
    elsif new.order_status = 'cancelled' then
      insert into public.customer_notifications(customer_id, notification_type, title, message, href, dedupe_key)
      values (new.customer_id, 'order_cancelled', 'Order cancelled', 'Your order has been cancelled. Open Your Orders for the latest details.', '/orders', new.id::text || ':order_cancelled')
      on conflict (dedupe_key) do nothing;
    end if;
  end if;

  if new.tracking_number is distinct from old.tracking_number
     and nullif(trim(coalesce(new.tracking_number, '')), '') is not null then
    insert into public.customer_notifications(customer_id, notification_type, title, message, href, dedupe_key)
    values (
      new.customer_id, 'tracking_updated', 'Tracking details updated',
      'Tracking details are available for your order. Open Your Orders to view them.',
      '/orders', new.id::text || ':tracking:' || new.tracking_number
    )
    on conflict (dedupe_key) do nothing;
  end if;

  return new;
end
$function$;

revoke all on function public.notify_customer_order_placed() from public, anon, authenticated;
revoke all on function public.notify_customer_order_update() from public, anon, authenticated;

drop trigger if exists on_order_insert_notify_customer on public.orders;
create trigger on_order_insert_notify_customer
after insert on public.orders
for each row execute function public.notify_customer_order_placed();

drop trigger if exists on_order_update_notify_customer on public.orders;
create trigger on_order_update_notify_customer
after update of order_status, payment_status, tracking_number on public.orders
for each row execute function public.notify_customer_order_update();

commit;
