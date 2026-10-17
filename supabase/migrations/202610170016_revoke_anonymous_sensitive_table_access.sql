-- Remove direct anonymous table privileges from customer, staff, financial,
-- order, advertising-event, and marketing data. Public storefront access is
-- provided through the intended product/review reads, public ad view, and RPCs.
-- RLS remains enabled as defense in depth for authenticated access.

begin;

revoke all privileges on table
  public.addresses,
  public.ad_events,
  public.advertisers,
  public.business_expenses,
  public.coupons,
  public.employee_tasks,
  public.marketing_content,
  public.order_items,
  public.orders,
  public.return_request_staff_notes,
  public.return_requests,
  public.staff_audit_log,
  public.staff_permissions,
  public.staff_roles
from anon;

commit;
