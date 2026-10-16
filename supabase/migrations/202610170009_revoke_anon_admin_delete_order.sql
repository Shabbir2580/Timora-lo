-- Anonymous callers do not need access to this staff-only RPC.
-- Remove inherited PUBLIC execution too; the function's internal admin-role
-- check remains defense in depth for authenticated callers.
begin;

revoke execute on function public.admin_delete_order(uuid) from public, anon;
grant execute on function public.admin_delete_order(uuid) to authenticated;

commit;
