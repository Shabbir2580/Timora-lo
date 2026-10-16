-- The existing production triggers on_order_insert_notify_customer_order_placed
-- and on_order_update_notify_customer already create supported, deduplicated notifications.
-- The former implementation in this migration used unsupported notification types
-- and omitted the required dedupe_key. Keep this migration safe on fresh installs.
begin;

drop trigger if exists timora_order_customer_notification on public.orders;
drop function if exists public.timora_notify_customer_order_change();

commit;
