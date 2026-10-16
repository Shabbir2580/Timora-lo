-- Timora Business Growth Platform: foundation
-- Source migration only. Review migration history and test on a non-production project
-- before applying. This file is NOT applied to any Supabase project by this commit.

begin;

create table if not exists public.staff_permissions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  manage_advertisements boolean not null default false,
  publish_advertisements boolean not null default false,
  manage_advertisers boolean not null default false,
  view_advertisement_analytics boolean not null default false,
  manage_marketing_content boolean not null default false,
  publish_marketing_content boolean not null default false,
  view_sales_analytics boolean not null default false,
  view_profit_analytics boolean not null default false,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint publish_ads_requires_manage check (not publish_advertisements or manage_advertisements),
  constraint manage_advertisers_requires_ads check (not manage_advertisers or manage_advertisements),
  constraint publish_marketing_requires_manage check (not publish_marketing_content or manage_marketing_content),
  constraint profit_reports_require_sales check (not view_profit_analytics or view_sales_analytics)
);

alter table public.staff_permissions enable row level security;
drop policy if exists "Staff can read own permissions or admins can read all" on public.staff_permissions;
create policy "Staff can read own permissions or admins can read all"
  on public.staff_permissions for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role = 'admin')
  );
drop policy if exists "Admins manage staff permissions" on public.staff_permissions;
create policy "Admins manage staff permissions"
  on public.staff_permissions for all to authenticated
  using (exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role = 'admin'))
  with check (
    exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role = 'admin')
    and exists (select 1 from public.staff_roles target where target.user_id = staff_permissions.user_id and target.role = 'employee')
  );
grant select, insert, update, delete on public.staff_permissions to authenticated;

create table if not exists public.advertisers (
  id uuid primary key default gen_random_uuid(),
  advertiser_type text not null default 'external' check (advertiser_type in ('timora','external')),
  business_name text not null check (char_length(trim(business_name)) between 1 and 160),
  contact_name text,
  contact_email text,
  website_url text,
  status text not null default 'active' check (status in ('pending','active','paused','archived')),
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint advertisers_website_https check (website_url is null or website_url ~ '^https://')
);

create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references public.advertisers(id) on delete restrict,
  campaign_name text not null check (char_length(trim(campaign_name)) between 1 and 160),
  campaign_type text not null check (campaign_type in ('timora_promotion','featured_product','external_ad')),
  placement text not null check (placement in ('homepage_hero','featured_product','category_banner','deals_banner','homepage_secondary')),
  headline text,
  description text,
  image_url text not null,
  destination_url text not null,
  product_id uuid references public.products(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','pending_approval','approved','scheduled','live','paused','rejected','expired','archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  budget_paise bigint check (budget_paise is null or budget_paise >= 0),
  cost_paise bigint check (cost_paise is null or cost_paise >= 0),
  rejection_reason text,
  created_by uuid not null references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete set null,
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_campaign_dates_valid check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint ad_campaign_destination_valid check (destination_url ~ '^https://' or destination_url ~ '^/[A-Za-z0-9/_?&=.%#-]*$'),
  constraint ad_campaign_image_https check (image_url ~ '^https://')
);

create index if not exists ad_campaigns_status_dates_idx on public.ad_campaigns(status, starts_at, ends_at);
create index if not exists ad_campaigns_advertiser_idx on public.ad_campaigns(advertiser_id, created_at desc);
create index if not exists ad_campaigns_product_idx on public.ad_campaigns(product_id) where product_id is not null;

create table if not exists public.ad_events (
  id bigint generated always as identity primary key,
  event_key uuid not null unique,
  campaign_id uuid not null references public.ad_campaigns(id) on delete restrict,
  event_type text not null check (event_type in ('impression','click','add_to_cart','purchase')),
  placement text not null check (placement in ('homepage_hero','featured_product','category_banner','deals_banner','homepage_secondary')),
  product_id uuid references public.products(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  click_id uuid,
  session_key text,
  value_paise bigint check (value_paise is null or value_paise >= 0),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now(),
  constraint ad_event_purchase_order check (event_type <> 'purchase' or order_id is not null)
);
create index if not exists ad_events_campaign_time_idx on public.ad_events(campaign_id, occurred_at desc);
create index if not exists ad_events_type_time_idx on public.ad_events(event_type, occurred_at desc);
create unique index if not exists ad_events_one_purchase_per_campaign_order_idx
  on public.ad_events(campaign_id, order_id) where event_type = 'purchase' and order_id is not null;

create table if not exists public.marketing_content (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'instagram' check (platform in ('instagram')),
  content_type text not null check (content_type in ('post','story','reel')),
  title text not null check (char_length(trim(title)) between 1 and 160),
  caption text,
  hashtags text[] not null default '{}',
  media_url text,
  destination_url text,
  status text not null default 'draft' check (status in ('draft','pending_approval','approved','scheduled','published','rejected','archived')),
  scheduled_at timestamptz,
  published_at timestamptz,
  external_post_id text,
  created_by uuid not null references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_media_https check (media_url is null or media_url ~ '^https://'),
  constraint marketing_destination_valid check (destination_url is null or destination_url ~ '^https://' or destination_url ~ '^/[A-Za-z0-9/_?&=.%#-]*$')
);
create index if not exists marketing_content_status_schedule_idx on public.marketing_content(status, scheduled_at);

create table if not exists public.business_expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null check (char_length(trim(category)) between 1 and 100),
  amount_paise bigint not null check (amount_paise > 0),
  incurred_on date not null,
  description text,
  reference_code text,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists business_expenses_incurred_on_idx on public.business_expenses(incurred_on desc);

create table if not exists public.staff_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(trim(action)) between 1 and 120),
  entity_type text not null check (char_length(trim(entity_type)) between 1 and 80),
  entity_id text,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);
create index if not exists staff_audit_log_created_at_idx on public.staff_audit_log(created_at desc);
create index if not exists staff_audit_log_entity_idx on public.staff_audit_log(entity_type, entity_id);

alter table public.advertisers enable row level security;
alter table public.ad_campaigns enable row level security;
alter table public.ad_events enable row level security;
alter table public.marketing_content enable row level security;
alter table public.business_expenses enable row level security;
alter table public.staff_audit_log enable row level security;

create or replace function public.timora_has_staff_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1 from public.staff_roles sr
    where sr.user_id = auth.uid() and sr.role = 'admin'
  ) or exists (
    select 1 from public.staff_permissions sp
    where sp.user_id = auth.uid()
      and case p_permission
        when 'manage_advertisements' then sp.manage_advertisements
        when 'publish_advertisements' then sp.publish_advertisements
        when 'manage_advertisers' then sp.manage_advertisers
        when 'view_advertisement_analytics' then sp.view_advertisement_analytics
        when 'manage_marketing_content' then sp.manage_marketing_content
        when 'publish_marketing_content' then sp.publish_marketing_content
        when 'view_sales_analytics' then sp.view_sales_analytics
        when 'view_profit_analytics' then sp.view_profit_analytics
        else false
      end
  );
$function$;
revoke all on function public.timora_has_staff_permission(text) from public;
grant execute on function public.timora_has_staff_permission(text) to authenticated;

-- Direct table updates must not bypass the separate trusted-publisher permission.
create or replace function public.timora_guard_campaign_publishing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if tg_op = 'INSERT' then
    if new.created_by <> auth.uid() then raise exception 'created_by must match the signed-in user'; end if;
    if new.status not in ('draft','pending_approval') and not public.timora_has_staff_permission('publish_advertisements') then
      raise exception 'publishing permission required';
    end if;
  elsif new.status is distinct from old.status and new.status in ('approved','scheduled','live') then
    if not public.timora_has_staff_permission('publish_advertisements') then
      raise exception 'publishing permission required';
    end if;
  end if;
  new.updated_at := now();
  return new;
end
$function$;
drop trigger if exists timora_guard_campaign_publishing on public.ad_campaigns;
create trigger timora_guard_campaign_publishing
before insert or update on public.ad_campaigns
for each row execute function public.timora_guard_campaign_publishing();

create or replace function public.timora_guard_marketing_publishing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if tg_op = 'INSERT' then
    if new.created_by <> auth.uid() then raise exception 'created_by must match the signed-in user'; end if;
    if new.status not in ('draft','pending_approval','rejected') and not public.timora_has_staff_permission('publish_marketing_content') then
      raise exception 'marketing publishing permission required';
    end if;
  elsif new.status is distinct from old.status and new.status in ('approved','scheduled','published') then
    if not public.timora_has_staff_permission('publish_marketing_content') then
      raise exception 'marketing publishing permission required';
    end if;
  end if;
  new.updated_at := now();
  return new;
end
$function$;
drop trigger if exists timora_guard_marketing_publishing on public.marketing_content;
create trigger timora_guard_marketing_publishing
before insert or update on public.marketing_content
for each row execute function public.timora_guard_marketing_publishing();

create or replace function public.timora_campaign_is_public(p_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.ad_campaigns c
    join public.advertisers a on a.id = c.advertiser_id
    where c.id = p_campaign_id
      and a.status = 'active'
      and c.status in ('approved','scheduled','live')
      and (c.starts_at is null or c.starts_at <= now())
      and (c.ends_at is null or c.ends_at > now())
  );
$function$;
revoke all on function public.timora_campaign_is_public(uuid) from public;
grant execute on function public.timora_campaign_is_public(uuid) to anon, authenticated;

drop policy if exists "Authorized staff manage advertisers" on public.advertisers;
create policy "Authorized staff manage advertisers" on public.advertisers for all to authenticated
using (public.timora_has_staff_permission('manage_advertisers'))
with check (public.timora_has_staff_permission('manage_advertisers'));

drop policy if exists "Public can read active ad campaigns" on public.ad_campaigns;
-- Public users must not read the underlying table because it contains internal budget,
-- cost, approval and staff fields. Expose only safe creative fields through a view.
create or replace view public.ad_public_campaigns
with (security_barrier = true)
as
select c.id, c.campaign_type, c.placement, c.headline, c.description, c.image_url, c.destination_url,
       c.product_id, c.starts_at, c.ends_at, a.advertiser_type
from public.ad_campaigns c
join public.advertisers a on a.id = c.advertiser_id
where public.timora_campaign_is_public(c.id);
revoke all on public.ad_public_campaigns from public;
grant select on public.ad_public_campaigns to anon, authenticated;
drop policy if exists "Authorized staff read campaigns" on public.ad_campaigns;
create policy "Authorized staff read campaigns" on public.ad_campaigns for select to authenticated
using (public.timora_has_staff_permission('manage_advertisements') or public.timora_has_staff_permission('view_advertisement_analytics'));
drop policy if exists "Authorized staff create campaigns" on public.ad_campaigns;
create policy "Authorized staff create campaigns" on public.ad_campaigns for insert to authenticated
with check (
  created_by = auth.uid()
  and public.timora_has_staff_permission('manage_advertisements')
);
drop policy if exists "Authorized staff update campaigns" on public.ad_campaigns;
create policy "Authorized staff update campaigns" on public.ad_campaigns for update to authenticated
using (public.timora_has_staff_permission('manage_advertisements'))
with check (public.timora_has_staff_permission('manage_advertisements'));

drop policy if exists "Authorized staff read ad events" on public.ad_events;
create policy "Authorized staff read ad events" on public.ad_events for select to authenticated
using (public.timora_has_staff_permission('view_advertisement_analytics'));
drop policy if exists "Authorized staff manage marketing content" on public.marketing_content;
create policy "Authorized staff manage marketing content" on public.marketing_content for all to authenticated
using (public.timora_has_staff_permission('manage_marketing_content'))
with check (public.timora_has_staff_permission('manage_marketing_content'));
drop policy if exists "Admin and authorized staff read business expenses" on public.business_expenses;
create policy "Admin and authorized staff read business expenses" on public.business_expenses for select to authenticated
using (public.timora_has_staff_permission('view_profit_analytics'));
drop policy if exists "Admin manage business expenses" on public.business_expenses;
create policy "Admin manage business expenses" on public.business_expenses for all to authenticated
using (exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role = 'admin'))
with check (exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role = 'admin'));
drop policy if exists "Admin read staff audit log" on public.staff_audit_log;
create policy "Admin read staff audit log" on public.staff_audit_log for select to authenticated
using (exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role = 'admin'));

grant select on public.advertisers, public.ad_campaigns, public.ad_events, public.marketing_content, public.business_expenses, public.staff_audit_log to authenticated;
revoke all on public.ad_campaigns from anon;
grant insert, update, delete on public.advertisers, public.ad_campaigns, public.marketing_content, public.business_expenses to authenticated;
grant usage, select on sequence public.ad_events_id_seq, public.staff_audit_log_id_seq to authenticated;


-- Admin-only permission management writes an audit record atomically.
create or replace function public.manage_staff_permissions(p_user_id uuid, p_permissions jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_before public.staff_permissions%rowtype;
  v_after public.staff_permissions%rowtype;
  v_granted boolean;
begin
  if auth.uid() is null or not exists (
    select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role = 'admin'
  ) then
    raise exception 'admin permission required';
  end if;

  if not exists (
    select 1 from public.staff_roles sr where sr.user_id = p_user_id and sr.role = 'employee'
  ) then
    raise exception 'target must be an existing employee';
  end if;

  select * into v_before from public.staff_permissions where user_id = p_user_id;

  if p_permissions is null then
    delete from public.staff_permissions where user_id = p_user_id;
    insert into public.staff_audit_log(actor_id, action, entity_type, entity_id, details)
    values (auth.uid(), 'staff_permissions_revoked', 'staff_permissions', p_user_id::text,
      jsonb_build_object('previous_permissions', to_jsonb(v_before)));
    return jsonb_build_object('success', true, 'revoked', true);
  end if;

  if jsonb_typeof(p_permissions) <> 'object' then
    raise exception 'permissions must be a JSON object';
  end if;

  if exists (
    select 1 from jsonb_each(p_permissions) e
    where e.key not in (
      'manage_advertisements','publish_advertisements','manage_advertisers',
      'view_advertisement_analytics','manage_marketing_content',
      'publish_marketing_content','view_sales_analytics','view_profit_analytics'
    ) or jsonb_typeof(e.value) <> 'boolean'
  ) then
    raise exception 'unknown permission or non-boolean value';
  end if;

  insert into public.staff_permissions (
    user_id, manage_advertisements, publish_advertisements, manage_advertisers,
    view_advertisement_analytics, manage_marketing_content, publish_marketing_content,
    view_sales_analytics, view_profit_analytics, granted_by, updated_at
  ) values (
    p_user_id,
    coalesce((p_permissions->>'manage_advertisements')::boolean, false),
    coalesce((p_permissions->>'publish_advertisements')::boolean, false),
    coalesce((p_permissions->>'manage_advertisers')::boolean, false),
    coalesce((p_permissions->>'view_advertisement_analytics')::boolean, false),
    coalesce((p_permissions->>'manage_marketing_content')::boolean, false),
    coalesce((p_permissions->>'publish_marketing_content')::boolean, false),
    coalesce((p_permissions->>'view_sales_analytics')::boolean, false),
    coalesce((p_permissions->>'view_profit_analytics')::boolean, false),
    auth.uid(), now()
  )
  on conflict (user_id) do update set
    manage_advertisements = excluded.manage_advertisements,
    publish_advertisements = excluded.publish_advertisements,
    manage_advertisers = excluded.manage_advertisers,
    view_advertisement_analytics = excluded.view_advertisement_analytics,
    manage_marketing_content = excluded.manage_marketing_content,
    publish_marketing_content = excluded.publish_marketing_content,
    view_sales_analytics = excluded.view_sales_analytics,
    view_profit_analytics = excluded.view_profit_analytics,
    granted_by = auth.uid(),
    updated_at = now()
  returning * into v_after;

  insert into public.staff_audit_log(actor_id, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    case when v_before.user_id is null then 'staff_promoted_to_important' else 'staff_permissions_updated' end,
    'staff_permissions',
    p_user_id::text,
    jsonb_build_object('permissions', jsonb_build_object(
      'manage_advertisements', v_after.manage_advertisements,
      'publish_advertisements', v_after.publish_advertisements,
      'manage_advertisers', v_after.manage_advertisers,
      'view_advertisement_analytics', v_after.view_advertisement_analytics,
      'manage_marketing_content', v_after.manage_marketing_content,
      'publish_marketing_content', v_after.publish_marketing_content,
      'view_sales_analytics', v_after.view_sales_analytics,
      'view_profit_analytics', v_after.view_profit_analytics
    ))
  );
  return jsonb_build_object('success', true, 'revoked', false);
end
$function$;
revoke all on function public.manage_staff_permissions(uuid, jsonb) from public;
grant execute on function public.manage_staff_permissions(uuid, jsonb) to authenticated;


-- Publicly readable creative files; writes remain permission-gated by RLS.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ad-creatives', 'ad-creatives', true, 8388608, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authorized staff upload ad creatives" on storage.objects;
create policy "Authorized staff upload ad creatives" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'ad-creatives'
  and public.timora_has_staff_permission('manage_advertisements')
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','avif')
);
drop policy if exists "Authorized staff update ad creatives" on storage.objects;
create policy "Authorized staff update ad creatives" on storage.objects
for update to authenticated
using (bucket_id = 'ad-creatives' and public.timora_has_staff_permission('manage_advertisements'))
with check (
  bucket_id = 'ad-creatives'
  and public.timora_has_staff_permission('manage_advertisements')
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','avif')
);
drop policy if exists "Authorized staff delete ad creatives" on storage.objects;
create policy "Authorized staff delete ad creatives" on storage.objects
for delete to authenticated
using (bucket_id = 'ad-creatives' and public.timora_has_staff_permission('manage_advertisements'));

-- No client insert grant on raw analytics events and no client write grants on audit records.
-- Validated event ingestion, conversion attribution, and audit-write RPCs are follow-up work.


create or replace function public.record_ad_event(
  p_event_key uuid,
  p_campaign_id uuid,
  p_event_type text,
  p_placement text,
  p_product_id uuid default null,
  p_order_id uuid default null,
  p_click_id uuid default null,
  p_session_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_campaign public.ad_campaigns%rowtype;
  v_order public.orders%rowtype;
  v_click_id uuid;
  v_value_paise bigint := null;
  v_rows integer := 0;
begin
  if p_event_key is null or p_campaign_id is null then raise exception 'event and campaign IDs are required'; end if;
  if p_event_type not in ('impression','click','add_to_cart','purchase') then raise exception 'invalid ad event type'; end if;
  if p_placement not in ('homepage_hero','featured_product','category_banner','deals_banner','homepage_secondary') then raise exception 'invalid ad placement'; end if;
  if p_session_key is not null and p_session_key !~ '^[A-Za-z0-9_-]{8,100} then raise exception 'invalid session key'; end if;

  select * into v_campaign from public.ad_campaigns where id = p_campaign_id;
  if not found or v_campaign.placement <> p_placement
    or (p_event_type <> 'purchase' and not public.timora_campaign_is_public(p_campaign_id)) then
    raise exception 'campaign is not available for this placement';
  end if;

  if p_event_type <> 'purchase' then
    if p_order_id is not null then raise exception 'order IDs are only accepted for purchase events'; end if;
    if v_campaign.product_id is not null and p_product_id is not null and p_product_id <> v_campaign.product_id then
      raise exception 'product does not match the campaign';
    end if;
    v_click_id := case when p_event_type = 'click' then coalesce(p_click_id, p_event_key) else p_click_id end;
  else
    if v_campaign.campaign_type = 'external_ad' then
      return jsonb_build_object('recorded', false, 'reason', 'external_ad_purchase_tracking_not_supported');
    end if;
    if auth.uid() is null or p_order_id is null or p_click_id is null then
      return jsonb_build_object('recorded', false, 'reason', 'purchase_requires_authenticated_order_and_click');
    end if;
    select * into v_order from public.orders
      where id = p_order_id and customer_id = auth.uid();
    if not found or v_order.payment_status <> 'paid' or v_order.order_status = 'cancelled'
      or (v_order.payment_provider = 'cod' and v_order.cod_collected_at is null)
      or (v_order.payment_provider <> 'cod' and v_order.payment_verified_at is null) then
      return jsonb_build_object('recorded', false, 'reason', 'order_not_confirmed_paid');
    end if;
    if v_campaign.product_id is not null and not exists (
      select 1 from public.order_items oi
      where oi.order_id = v_order.id and oi.product_id = v_campaign.product_id::text
    ) then
      return jsonb_build_object('recorded', false, 'reason', 'campaign_product_not_in_order');
    end if;
    if not exists (
      select 1 from public.ad_events click_event
      where click_event.campaign_id = p_campaign_id
        and click_event.event_type = 'click'
        and click_event.click_id = p_click_id
        and click_event.occurred_at >= now() - interval '30 days'
        and click_event.occurred_at <= now()
    ) then
      return jsonb_build_object('recorded', false, 'reason', 'no_eligible_click');
    end if;
    v_click_id := p_click_id;
    if v_campaign.product_id is not null then
      select coalesce(sum(oi.line_total_paise), 0)::bigint into v_value_paise
      from public.order_items oi
      where oi.order_id = v_order.id and oi.product_id = v_campaign.product_id::text;
    else
      v_value_paise := greatest(0, v_order.total_paise);
    end if;
  end if;

  insert into public.ad_events (
    event_key, campaign_id, event_type, placement, product_id, order_id,
    click_id, session_key, value_paise
  ) values (
    p_event_key, p_campaign_id, p_event_type, p_placement, p_product_id, p_order_id,
    v_click_id, p_session_key, v_value_paise
  ) on conflict do nothing;
  get diagnostics v_rows = row_count;
  return jsonb_build_object('recorded', v_rows = 1);
end
$function$;
revoke all on function public.record_ad_event(uuid,uuid,text,text,uuid,uuid,uuid,text) from public;
grant execute on function public.record_ad_event(uuid,uuid,text,text,uuid,uuid,uuid,text) to anon, authenticated;


create or replace function public.get_advertising_analytics(
  p_from date default (current_date - 29),
  p_to date default current_date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_result jsonb;
  v_start timestamptz;
  v_end timestamptz;
begin
  if auth.uid() is null or not public.timora_has_staff_permission('view_advertisement_analytics') then
    raise exception 'advertising analytics permission required';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 365 then
    raise exception 'invalid analytics date range';
  end if;
  v_start := p_from::timestamptz;
  v_end := (p_to + 1)::timestamptz;

  select coalesce(jsonb_agg(jsonb_build_object(
    'campaign_id', c.id,
    'campaign_name', c.campaign_name,
    'advertiser_name', a.business_name,
    'placement', c.placement,
    'status', c.status,
    'impressions', coalesce(e.impressions, 0),
    'clicks', coalesce(e.clicks, 0),
    'add_to_cart', coalesce(e.add_to_cart, 0),
    'purchases', coalesce(e.purchases, 0),
    'attributed_revenue_paise', coalesce(e.attributed_revenue_paise, 0),
    'ctr_percent', case when coalesce(e.impressions, 0) = 0 then 0 else round(coalesce(e.clicks, 0)::numeric * 100 / e.impressions, 2) end
  ) order by c.created_at desc), '[]'::jsonb)
  into v_result
  from public.ad_campaigns c
  join public.advertisers a on a.id = c.advertiser_id
  left join lateral (
    select
      count(*) filter (where event_type = 'impression')::bigint as impressions,
      count(*) filter (where event_type = 'click')::bigint as clicks,
      count(*) filter (where event_type = 'add_to_cart')::bigint as add_to_cart,
      count(*) filter (where event_type = 'purchase')::bigint as purchases,
      coalesce(sum(value_paise) filter (where event_type = 'purchase'), 0)::bigint as attributed_revenue_paise
    from public.ad_events ev
    where ev.campaign_id = c.id and ev.occurred_at >= v_start and ev.occurred_at < v_end
  ) e on true;

  return jsonb_build_object('from', p_from, 'to', p_to, 'campaigns', v_result);
end
$function$;
revoke all on function public.get_advertising_analytics(date,date) from public;
grant execute on function public.get_advertising_analytics(date,date) to authenticated;

commit;
