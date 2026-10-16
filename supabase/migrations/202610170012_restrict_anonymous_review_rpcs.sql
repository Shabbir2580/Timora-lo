-- Restrict review RPCs to signed-in users; moderation remains staff-only.
-- Both functions retain their internal authorization checks as defense in depth.

begin;

revoke execute on function public.moderate_product_review(uuid, text) from anon;
revoke execute on function public.submit_product_review(uuid, integer, text, text) from anon;

commit;
