-- These SECURITY DEFINER functions are trigger handlers, not public RPCs.
-- PostgreSQL invokes trigger functions through their attached triggers; callers
-- should not be able to invoke them directly through the exposed public schema.
begin;

revoke execute on function public.timora_guard_campaign_publishing() from public, anon, authenticated;
revoke execute on function public.timora_guard_marketing_publishing() from public, anon, authenticated;

commit;
