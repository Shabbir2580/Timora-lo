-- Optional Supabase scheduled job for expiring unpaid Timora orders.
-- First enable the pg_cron extension in Supabase (Database -> Extensions).
-- Run this file only after the main repair migration and migration 202610160004_fix_cron_order_expiry.sql have succeeded.

do $schedule$
begin
  if exists (select 1 from pg_catalog.pg_extension where extname = 'pg_cron') then
    -- Remove an older job with the same name so this script is safe to re-run.
    execute $sql$
      select cron.unschedule(jobid)
      from cron.job
      where jobname = 'timora-expire-stale-pending-orders'
    $sql$;

    execute $sql$
      select cron.schedule(
        'timora-expire-stale-pending-orders',
        '*/10 * * * *',
        'select public.expire_stale_pending_orders_cron();'
      )
    $sql$;
    raise notice 'Timora pending-order expiry is scheduled every 10 minutes.';
  else
    raise warning 'pg_cron is not enabled. Enable pg_cron in Supabase, then run this file again. Pending-order stock reservations will not expire automatically until scheduled.';
  end if;
end
$schedule$;
