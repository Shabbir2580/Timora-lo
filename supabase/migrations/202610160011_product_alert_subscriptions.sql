-- Server-side price-drop and restock subscriptions that create in-app notifications.
begin;

alter table public.customer_notifications
  drop constraint if exists customer_notifications_notification_type_check;

alter table public.customer_notifications
  add constraint customer_notifications_notification_type_check
  check (notification_type in (
    'order_placed', 'payment_confirmed', 'order_confirmed', 'order_processing',
    'order_shipped', 'order_delivered', 'order_cancelled', 'tracking_updated',
    'price_drop', 'back_in_stock'
  ));

create table if not exists public.customer_product_alerts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  alert_type text not null check (alert_type in ('price_drop', 'back_in_stock')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_product_alert_unique unique (customer_id, product_id, alert_type)
);

create index if not exists customer_product_alerts_active_product_idx
on public.customer_product_alerts(product_id, alert_type) where active;

alter table public.customer_product_alerts enable row level security;
revoke all on public.customer_product_alerts from anon, authenticated;
grant select, insert, delete on public.customer_product_alerts to authenticated;
grant update (customer_id, product_id, alert_type, active, updated_at) on public.customer_product_alerts to authenticated;

drop policy if exists "Customers view own product alerts" on public.customer_product_alerts;
create policy "Customers view own product alerts"
on public.customer_product_alerts for select to authenticated
using (customer_id = auth.uid());

drop policy if exists "Customers create own product alerts" on public.customer_product_alerts;
create policy "Customers create own product alerts"
on public.customer_product_alerts for insert to authenticated
with check (customer_id = auth.uid());

drop policy if exists "Customers update own product alerts" on public.customer_product_alerts;
create policy "Customers update own product alerts"
on public.customer_product_alerts for update to authenticated
using (customer_id = auth.uid())
with check (customer_id = auth.uid());

drop policy if exists "Customers delete own product alerts" on public.customer_product_alerts;
create policy "Customers delete own product alerts"
on public.customer_product_alerts for delete to authenticated
using (customer_id = auth.uid());

create or replace function public.notify_product_alert_subscribers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_alert record;
begin
  if new.price < old.price then
    for v_alert in
      select a.customer_id
        from public.customer_product_alerts a
       where a.product_id = new.id
         and a.alert_type = 'price_drop'
         and a.active
    loop
      insert into public.customer_notifications(
        customer_id, notification_type, title, message, href, dedupe_key
      ) values (
        v_alert.customer_id,
        'price_drop',
        'Price drop: ' || new.name,
        'A product on your Timora watchlist is now cheaper. Check the latest price.',
        '/product/' || new.slug,
        gen_random_uuid()::text
      );
      update public.customer_product_alerts
         set active = false, updated_at = now()
       where customer_id = v_alert.customer_id
         and product_id = new.id
         and alert_type = 'price_drop';
    end loop;
  end if;

  if old.stock <= 0 and new.stock > 0 then
    for v_alert in
      select a.customer_id
        from public.customer_product_alerts a
       where a.product_id = new.id
         and a.alert_type = 'back_in_stock'
         and a.active
    loop
      insert into public.customer_notifications(
        customer_id, notification_type, title, message, href, dedupe_key
      ) values (
        v_alert.customer_id,
        'back_in_stock',
        'Back in stock: ' || new.name,
        'A product on your Timora watchlist is available again.',
        '/product/' || new.slug,
        gen_random_uuid()::text
      );
      update public.customer_product_alerts
         set active = false, updated_at = now()
       where customer_id = v_alert.customer_id
         and product_id = new.id
         and alert_type = 'back_in_stock';
    end loop;
  end if;

  return new;
end
$function$;

revoke all on function public.notify_product_alert_subscribers() from public, anon, authenticated;

drop trigger if exists on_product_update_notify_alert_subscribers on public.products;
create trigger on_product_update_notify_alert_subscribers
after update of price, stock on public.products
for each row execute function public.notify_product_alert_subscribers();

commit;
