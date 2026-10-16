-- Automatically release stock and coupon reservations for unpaid orders.
-- Supabase supports pg_cron; this job runs independently of staff visiting the dashboard.
begin;

create extension if not exists pg_cron with schema pg_catalog;

do $schedule$
declare
  v_job_id bigint;
begin
  -- Keep this migration safe to re-apply: replace the named job instead of
  -- creating duplicate schedules.
  for v_job_id in
    select jobid from cron.job where jobname = 'timora-expire-stale-pending-orders'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'timora-expire-stale-pending-orders',
    '*/5 * * * *',
    $command$select public.expire_stale_pending_orders_cron();$command$
  );
end
$schedule$;

commit;
