-- Timora loyalty and referral foundation.
-- Earn 1 point per ₹100 on paid, delivered orders. On a referred customer's first
-- paid, delivered order, both the referrer and the new customer receive 100 bonus points.
-- Points are recorded only; checkout redemption is intentionally not enabled by this migration.

begin;

create table if not exists public.customer_referrals (
  customer_id uuid primary key references auth.users(id) on delete cascade,
  referral_code text not null unique,
  referred_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint customer_referrals_code_format check (referral_code ~ '^[A-F0-9]{10}$'),
  constraint customer_referrals_no_self_referral check (referred_by is null or referred_by <> customer_id)
);

create table if not exists public.loyalty_points_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete restrict,
  points integer not null check (points > 0),
  entry_type text not null check (entry_type in ('order_earned', 'referral_bonus_referrer', 'referral_bonus_friend')),
  created_at timestamptz not null default now(),
  constraint loyalty_points_order_entry_unique unique (customer_id, order_id, entry_type)
);

create index if not exists customer_referrals_referred_by_idx on public.customer_referrals(referred_by);
create index if not exists loyalty_points_customer_created_idx on public.loyalty_points_ledger(customer_id, created_at desc);

alter table public.customer_referrals enable row level security;
alter table public.loyalty_points_ledger enable row level security;

drop policy if exists "Customers can view their own referral code" on public.customer_referrals;
create policy "Customers can view their own referral code"
on public.customer_referrals for select to authenticated
using (customer_id = auth.uid());

drop policy if exists "Customers can view their own loyalty points" on public.loyalty_points_ledger;
create policy "Customers can view their own loyalty points"
on public.loyalty_points_ledger for select to authenticated
using (customer_id = auth.uid());

revoke all on public.customer_referrals from anon, authenticated;
grant select on public.customer_referrals to authenticated;
revoke all on public.loyalty_points_ledger from anon, authenticated;
grant select on public.loyalty_points_ledger to authenticated;

create or replace function public.create_customer_referral_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_code text;
  v_referrer uuid;
  v_input_code text;
begin
  v_input_code := upper(trim(coalesce(new.raw_user_meta_data ->> 'referral_code', '')));

  if v_input_code <> '' then
    select cr.customer_id into v_referrer
      from public.customer_referrals cr
     where cr.referral_code = v_input_code
       and cr.customer_id <> new.id
     limit 1;
  end if;

  loop
    v_code := substr(upper(md5(new.id::text || clock_timestamp()::text || random()::text)), 1, 10);
    exit when not exists (
      select 1 from public.customer_referrals cr where cr.referral_code = v_code
    );
  end loop;

  insert into public.customer_referrals(customer_id, referral_code, referred_by)
  values (new.id, v_code, v_referrer)
  on conflict (customer_id) do nothing;

  return new;
end
$function$;

drop trigger if exists on_auth_user_created_customer_referral on auth.users;
create trigger on_auth_user_created_customer_referral
after insert on auth.users
for each row execute function public.create_customer_referral_profile();

-- Existing customers also need their own referral code when this migration is first applied.
do $backfill$
declare
  v_user record;
  v_code text;
begin
  for v_user in
    select u.id
      from auth.users u
     where not exists (
       select 1 from public.customer_referrals cr where cr.customer_id = u.id
     )
  loop
    loop
      v_code := substr(upper(md5(v_user.id::text || clock_timestamp()::text || random()::text)), 1, 10);
      exit when not exists (
        select 1 from public.customer_referrals cr where cr.referral_code = v_code
      );
    end loop;

    insert into public.customer_referrals(customer_id, referral_code)
    values (v_user.id, v_code)
    on conflict do nothing;
  end loop;
end
$backfill$;

create or replace function public.award_timora_loyalty_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_customer_id uuid;
  v_order_id uuid;
  v_total_paise bigint;
  v_points integer;
  v_referrer uuid;
  v_has_referral_bonus boolean;
begin
  if new.customer_id is null
     or new.order_status <> 'delivered'
     or new.payment_status <> 'paid'
     or coalesce(new.total_paise, 0) <= 0 then
    return new;
  end if;

  v_customer_id := new.customer_id;
  v_order_id := new.id;
  v_total_paise := new.total_paise;
  v_points := floor(v_total_paise::numeric / 10000)::integer;

  if v_points > 0 then
    insert into public.loyalty_points_ledger(customer_id, order_id, points, entry_type)
    values (v_customer_id, v_order_id, v_points, 'order_earned')
    on conflict (customer_id, order_id, entry_type) do nothing;
  end if;

  -- Referral bonuses are awarded only once per referred customer and only
  -- after their first successfully paid and delivered order.
  select cr.referred_by into v_referrer
    from public.customer_referrals cr
   where cr.customer_id = v_customer_id
   for update;

  if v_referrer is not null then
    select exists (
      select 1 from public.loyalty_points_ledger l
       where l.customer_id = v_customer_id
         and l.entry_type = 'referral_bonus_friend'
    ) into v_has_referral_bonus;

    if not v_has_referral_bonus then
      insert into public.loyalty_points_ledger(customer_id, order_id, points, entry_type)
      values
        (v_customer_id, v_order_id, 100, 'referral_bonus_friend'),
        (v_referrer, v_order_id, 100, 'referral_bonus_referrer')
      on conflict (customer_id, order_id, entry_type) do nothing;
    end if;
  end if;

  return new;
end
$function$;

drop trigger if exists on_order_insert_award_timora_points on public.orders;
create trigger on_order_insert_award_timora_points
after insert on public.orders
for each row execute function public.award_timora_loyalty_points();

drop trigger if exists on_order_delivered_award_timora_points on public.orders;
create trigger on_order_delivered_award_timora_points
after update of order_status, payment_status, total_paise
on public.orders
for each row execute function public.award_timora_loyalty_points();

create or replace function public.apply_my_referral_code(p_referral_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_referral_code, '')));
  v_referrer uuid;
  v_existing_referrer uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if v_code !~ '^[A-F0-9]{10}$' then
    raise exception 'Enter a valid 10-character referral code.';
  end if;

  select cr.customer_id into v_referrer
    from public.customer_referrals cr
   where cr.referral_code = v_code
   limit 1;

  if v_referrer is null or v_referrer = v_user_id then
    raise exception 'That referral code is invalid.';
  end if;

  select cr.referred_by into v_existing_referrer
    from public.customer_referrals cr
   where cr.customer_id = v_user_id
   for update;

  if not found then
    raise exception 'Your referral profile is not ready yet.';
  end if;

  if v_existing_referrer is not null then
    if v_existing_referrer = v_referrer then
      return jsonb_build_object('success', true, 'already_applied', true);
    end if;
    raise exception 'A referral code has already been applied to this account.';
  end if;

  if exists (
    select 1 from public.orders o where o.customer_id = v_user_id
  ) then
    raise exception 'Referral codes must be applied before placing an order.';
  end if;

  update public.customer_referrals
     set referred_by = v_referrer
   where customer_id = v_user_id
     and referred_by is null;

  if not found then
    raise exception 'A referral code could not be applied to this account.';
  end if;

  return jsonb_build_object('success', true, 'already_applied', false);
end
$function$;

create or replace function public.get_my_rewards_summary()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_code text;
  v_balance bigint;
  v_referral_count bigint;
  v_entries jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select cr.referral_code into v_code
    from public.customer_referrals cr
   where cr.customer_id = v_user_id;

  select coalesce(sum(l.points), 0) into v_balance
    from public.loyalty_points_ledger l
   where l.customer_id = v_user_id;

  select count(*) into v_referral_count
    from public.customer_referrals cr
   where cr.referred_by = v_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', recent.id,
    'order_id', recent.order_id,
    'points', recent.points,
    'entry_type', recent.entry_type,
    'created_at', recent.created_at
  ) order by recent.created_at desc), '[]'::jsonb)
  into v_entries
  from (
    select l.id, l.order_id, l.points, l.entry_type, l.created_at
      from public.loyalty_points_ledger l
     where l.customer_id = v_user_id
     order by l.created_at desc
     limit 20
  ) recent;

  return jsonb_build_object(
    'referral_code', v_code,
    'points_balance', v_balance,
    'referral_count', v_referral_count,
    'entries', v_entries,
    'earning_rule', '1 point per ₹100 on paid, delivered orders',
    'referral_rule', '100 bonus points for each person after their first paid, delivered order, for both people'
  );
end
$function$;

revoke all on function public.create_customer_referral_profile() from public, anon, authenticated;
revoke all on function public.award_timora_loyalty_points() from public, anon, authenticated;
revoke all on function public.get_my_rewards_summary() from public, anon;
revoke all on function public.apply_my_referral_code(text) from public, anon;
grant execute on function public.apply_my_referral_code(text) to authenticated;
grant execute on function public.get_my_rewards_summary() to authenticated;

commit;
