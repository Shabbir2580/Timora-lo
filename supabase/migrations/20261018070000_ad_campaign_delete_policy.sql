-- Permit authorized advertising staff to permanently remove non-live campaigns.
-- Live/approved placements must be paused first; analytics-linked campaigns remain protected
-- by the ad_events foreign key and should be archived instead of deleting their history.
begin;

drop policy if exists "Authorized staff delete non-live campaigns" on public.ad_campaigns;
create policy "Authorized staff delete non-live campaigns"
  on public.ad_campaigns
  for delete
  to authenticated
  using (
    public.timora_has_staff_permission('manage_advertisements')
    and status not in ('live', 'scheduled', 'approved')
  );

commit;
