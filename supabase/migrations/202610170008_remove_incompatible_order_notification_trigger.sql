-- Defensive cleanup for environments where the previous version of
-- 202610170007_order_status_notifications.sql was already applied.
-- Existing order notification triggers remain authoritative.
begin;

drop trigger if exists timora_order_customer_notification on public.orders;
drop function if exists public.timora_notify_customer_order_change();

commit;
