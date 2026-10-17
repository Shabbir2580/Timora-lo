-- Read-only post-migration verification for Timora's production Supabase project.
-- Run this in the Supabase SQL Editor AFTER applying the repository migrations.
-- Each result should show the expected values in the "expected" column.

-- 1) Anonymous clients should not have direct access to private tables or write
-- privileges on products/reviews. The public campaign view and public reads remain.
select check_name, actual, expected, actual = expected as passed
from (
  values
    ('anon cannot read orders', has_table_privilege('anon', 'public.orders', 'SELECT'), false),
    ('anon cannot write orders', has_table_privilege('anon', 'public.orders', 'INSERT'), false),
    ('anon cannot read order items', has_table_privilege('anon', 'public.order_items', 'SELECT'), false),
    ('anon cannot read addresses', has_table_privilege('anon', 'public.addresses', 'SELECT'), false),
    ('anon cannot read advertisers directly', has_table_privilege('anon', 'public.advertisers', 'SELECT'), false),
    ('anon cannot mutate advertisers', has_table_privilege('anon', 'public.advertisers', 'UPDATE'), false),
    ('anon cannot read staff tasks', has_table_privilege('anon', 'public.employee_tasks', 'SELECT'), false),
    ('anon cannot read business expenses', has_table_privilege('anon', 'public.business_expenses', 'SELECT'), false),
    ('anon cannot mutate products', has_table_privilege('anon', 'public.products', 'UPDATE'), false),
    ('anon cannot insert product reviews directly', has_table_privilege('anon', 'public.product_reviews', 'INSERT'), false),
    ('anon can read products', has_table_privilege('anon', 'public.products', 'SELECT'), true),
    ('anon can read public review rows through RLS', has_table_privilege('anon', 'public.product_reviews', 'SELECT'), true),
    ('anon can read public ad campaign view', has_table_privilege('anon', 'public.ad_public_campaigns', 'SELECT'), true)
) as checks(check_name, actual, expected);

-- 2) These RPCs must not be directly executable by anonymous clients.
select function_name, actual, false as expected, not actual as passed
from (
  values
    ('admin_delete_order(uuid)', has_function_privilege('anon', 'public.admin_delete_order(uuid)', 'EXECUTE')),
    ('moderate_product_review(uuid,text)', has_function_privilege('anon', 'public.moderate_product_review(uuid,text)', 'EXECUTE')),
    ('submit_product_review(uuid,integer,text,text)', has_function_privilege('anon', 'public.submit_product_review(uuid,integer,text,text)', 'EXECUTE')),
    ('create_order_atomic(...)', has_function_privilege('anon', 'public.create_order_atomic(text,text,text,text,text,text,text,text,text,text,jsonb,text)', 'EXECUTE')),
    ('campaign trigger handler', has_function_privilege('anon', 'public.timora_guard_campaign_publishing()', 'EXECUTE')),
    ('marketing trigger handler', has_function_privilege('anon', 'public.timora_guard_marketing_publishing()', 'EXECUTE')
  ) as checks(function_name, actual);

-- 3) All 16 foreign-key indexes should exist after the performance migration.
select expected_index as index_name,
       to_regclass('public.' || expected_index) is not null as exists
from (values
  ('idx_ad_campaigns_approved_by'),
  ('idx_ad_campaigns_created_by'),
  ('idx_ad_campaigns_published_by'),
  ('idx_ad_events_order_id'),
  ('idx_ad_events_product_id'),
  ('idx_advertisers_created_by'),
  ('idx_business_expenses_recorded_by'),
  ('idx_employee_tasks_assigned_by'),
  ('idx_employee_tasks_reviewed_by'),
  ('idx_loyalty_points_ledger_order_id'),
  ('idx_marketing_content_approved_by'),
  ('idx_marketing_content_created_by'),
  ('idx_orders_cod_approved_by'),
  ('idx_product_reviews_customer_id'),
  ('idx_staff_audit_log_actor_id'),
  ('idx_staff_permissions_granted_by')
) as expected(expected_index)
order by expected_index;

-- 4) Remaining policies from the performance-advisor list should not evaluate
-- auth.uid() per row. This query reports any policies still needing attention.
select schemaname, tablename, policyname, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'return_request_staff_notes',
    'employee_tasks',
    'staff_permissions',
    'ad_campaigns',
    'business_expenses',
    'staff_audit_log'
  )
  and (
    coalesce(qual, '') ~ 'auth\.uid\(\)'
    or coalesce(with_check, '') ~ 'auth\.uid\(\)'
  )
order by tablename, policyname;

-- 5) Confirm the deployed checkout RPC matches the repository's current pricing
-- contract. False values here mean the checkout migration has not been applied.
with checkout_function as (
  select p.proconfig, pg_get_functiondef(p.oid) as definition
  from pg_proc p
  where p.oid = to_regprocedure(
    'public.create_order_atomic(text,text,text,text,text,text,text,text,text,text,jsonb,text)'
  )
)
select
  coalesce(proconfig @> array['search_path=""'], false) as empty_search_path,
  definition ~* 'v_shipping\\s*:=\\s*case\\s+when\\s+v_subtotal\\s*>=\\s*99900\\s+then\\s+0\\s+else\\s+8000' as correct_shipping_threshold,
  definition ~* 'from\\s+public\\.coupons\\s+c\\s+where\\s+c\\.code\\s*=\\s*v_coupon_code\\s+for\\s+update' as coupon_row_locked,
  definition ~* 'usage_count\\s*=\\s*usage_count\\s*\\+\\s*1' as coupon_usage_counted,
  definition ~* 'v_coupon\\.usage_count\\s*>=\\s*v_coupon\\.usage_limit' as coupon_limit_enforced,
  definition ~* 'v_product_active' as inactive_product_checked
from checkout_function;
