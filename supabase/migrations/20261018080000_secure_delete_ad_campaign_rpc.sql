-- Admins and explicitly authorized advertising staff can permanently delete archived/paused campaigns.
-- Analytics events for that campaign are removed in the same transaction because they cannot outlive it.
create or replace function public.delete_ad_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  if not public.timora_has_staff_permission('manage_advertisements') then
    raise exception 'You do not have permission to manage advertising campaigns'
      using errcode = '42501';
  end if;

  select c.status into v_status
  from public.ad_campaigns c
  where c.id = p_campaign_id
  for update;

  if not found then
    raise exception 'Campaign not found' using errcode = 'P0002';
  end if;

  if v_status in ('live', 'scheduled', 'approved') then
    raise exception 'Pause or archive this campaign before deleting it'
      using errcode = '55000';
  end if;

  delete from public.ad_events where campaign_id = p_campaign_id;
  delete from public.ad_campaigns where id = p_campaign_id;

  if not found then
    raise exception 'Campaign was not deleted' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_ad_campaign(uuid) from public, anon;
grant execute on function public.delete_ad_campaign(uuid) to authenticated;

drop policy if exists "Authorized staff delete non-live campaigns" on public.ad_campaigns;
