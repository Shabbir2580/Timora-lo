-- Add indexes for foreign-key columns identified by Supabase's performance advisor.
-- These support joins and reduce table scans when referenced rows are updated/deleted.
begin;

create index if not exists idx_ad_campaigns_approved_by on public.ad_campaigns (approved_by);
create index if not exists idx_ad_campaigns_created_by on public.ad_campaigns (created_by);
create index if not exists idx_ad_campaigns_published_by on public.ad_campaigns (published_by);
create index if not exists idx_ad_events_order_id on public.ad_events (order_id);
create index if not exists idx_ad_events_product_id on public.ad_events (product_id);
create index if not exists idx_advertisers_created_by on public.advertisers (created_by);
create index if not exists idx_business_expenses_recorded_by on public.business_expenses (recorded_by);
create index if not exists idx_employee_tasks_assigned_by on public.employee_tasks (assigned_by);
create index if not exists idx_employee_tasks_reviewed_by on public.employee_tasks (reviewed_by);
create index if not exists idx_loyalty_points_ledger_order_id on public.loyalty_points_ledger (order_id);
create index if not exists idx_marketing_content_approved_by on public.marketing_content (approved_by);
create index if not exists idx_marketing_content_created_by on public.marketing_content (created_by);
create index if not exists idx_orders_cod_approved_by on public.orders (cod_approved_by);
create index if not exists idx_product_reviews_customer_id on public.product_reviews (customer_id);
create index if not exists idx_staff_audit_log_actor_id on public.staff_audit_log (actor_id);
create index if not exists idx_staff_permissions_granted_by on public.staff_permissions (granted_by);

commit;
