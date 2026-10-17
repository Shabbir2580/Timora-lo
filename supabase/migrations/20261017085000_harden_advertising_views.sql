-- Replace SECURITY DEFINER advertising views with invoker-security views.
-- Public campaigns remain visible only when the campaign is public and its advertiser is active.
-- Staff advertiser options remain available only to staff with the relevant permission.
begin;

-- Public view: grant only the columns needed to render public campaign cards.
grant select (id, advertiser_id, campaign_type, placement, headline, description,
              image_url, destination_url, product_id, starts_at, ends_at, media_type)
  on table public.ad_campaigns to anon;
grant select (id, advertiser_type)
  on table public.advertisers to anon;

drop policy if exists "Public may read live campaign rows" on public.ad_campaigns;
create policy "Public may read live campaign rows"
  on public.ad_campaigns
  for select
  to anon, authenticated
  using (public.timora_campaign_is_public(id));

drop policy if exists "Public may read advertisers for live campaigns" on public.advertisers;
create policy "Public may read advertisers for live campaigns"
  on public.advertisers
  for select
  to anon, authenticated
  using (
    status = 'active'
    and exists (
      select 1
      from public.ad_campaigns c
      where c.advertiser_id = advertisers.id
        and public.timora_campaign_is_public(c.id)
    )
  );

-- Keep the staff-only options view aligned with both supported staff permissions.
drop policy if exists "Authorized staff read advertiser options" on public.advertisers;
create policy "Authorized staff read advertiser options"
  on public.advertisers
  for select
  to authenticated
  using (
    public.timora_has_staff_permission('manage_advertisements')
    or public.timora_has_staff_permission('manage_advertisers')
  );

alter view public.ad_public_campaigns set (security_invoker = true);
alter view public.ad_advertiser_options set (security_invoker = true);

grant select on public.ad_public_campaigns to anon, authenticated;
grant select on public.ad_advertiser_options to authenticated;

commit;
