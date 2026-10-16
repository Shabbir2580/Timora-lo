-- Anonymous callers do not need access to this staff-only RPC.
-- The function's internal admin-role check remains as defense in depth.
begin;

revoke execute on function public.admin_delete_order(uuid) from anon;

commit;
