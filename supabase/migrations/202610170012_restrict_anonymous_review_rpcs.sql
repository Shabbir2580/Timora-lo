-- Restrict review RPCs to signed-in users; moderation remains staff-only.
-- Remove both explicit anon and inherited PUBLIC execution, then grant the intended
-- signed-in role. The functions retain internal authorization checks as defense in depth.

begin;

revoke execute on function public.moderate_product_review(uuid, text) from public, anon;
revoke execute on function public.submit_product_review(uuid, integer, text, text) from public, anon;
grant execute on function public.moderate_product_review(uuid, text) to authenticated, service_role;
grant execute on function public.submit_product_review(uuid, integer, text, text) to authenticated, service_role;

commit;
