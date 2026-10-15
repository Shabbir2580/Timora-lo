-- Timora repair migration
-- Apply in Supabase SQL Editor before deploying the application changes.
-- Stock is reserved atomically when an order is created and restored only when
-- a still-unpaid order is cancelled, rejected, or expires.

begin;

alter table public.orders
  add column if not exists discount_paise bigint not null default 0,
  add column if not exists coupon_code text,
  add column if not exists cod_collected_at timestamptz,
  add column if not exists payment_verified_at timestamptz;

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value numeric not null check (discount_value > 0),
  minimum_order_paise bigint not null default 0 check (minimum_order_paise >= 0),
  max_discount_paise bigint check (max_discount_paise is null or max_discount_paise > 0),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_code_format check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,40}$'),
  constraint coupons_dates_valid check (expires_at is null or starts_at is null or expires_at > starts_at)
);
alter table public.coupons enable row level security;
drop policy if exists "Admins manage coupons" on public.coupons;
create policy "Admins manage coupons" on public.coupons for all to authenticated
using (exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role = 'admin'))
with check (exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role = 'admin'));
grant select, insert, update, delete on public.coupons to authenticated;

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text not null check (length(trim(title)) between 1 and 100),
  body text not null check (length(trim(body)) between 5 and 2000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, customer_id)
);
create index if not exists product_reviews_public_idx on public.product_reviews(product_id, status, created_at desc);
alter table public.product_reviews enable row level security;
drop policy if exists "Public can read approved reviews" on public.product_reviews;
create policy "Public can read approved reviews" on public.product_reviews for select to anon, authenticated using (status = 'approved' or customer_id = auth.uid() or exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role in ('admin','employee')));
grant select on public.product_reviews to anon, authenticated;

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  subscribed_at timestamptz not null default now(),
  is_active boolean not null default true
);
alter table public.newsletter_subscribers enable row level security;
revoke all on public.newsletter_subscribers from anon, authenticated;
grant usage on schema public to anon, authenticated;

-- Prevent direct client inserts that bypass transactional order/stock checks.
do $block$
declare p record;
begin
  for p in select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('orders','order_items') and cmd in ('INSERT','ALL')
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end
$block$;

create or replace function public.create_order_atomic(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_address text,
  p_landmark text,
  p_city text,
  p_state text,
  p_pincode text,
  p_delivery_note text,
  p_payment_provider text,
  p_items jsonb,
  p_coupon_code text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_product public.products%rowtype;
  v_order_id uuid;
  v_qty integer;
  v_unit_paise bigint;
  v_line_paise bigint;
  v_subtotal bigint := 0;
  v_shipping bigint := 0;
  v_discount bigint := 0;
  v_total bigint := 0;
  v_coupon public.coupons%rowtype;
  v_code text := nullif(upper(trim(coalesce(p_coupon_code,''))), '');
  v_coupon_found boolean := false;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if length(trim(coalesce(p_customer_name,''))) not between 1 and 120
    or length(trim(coalesce(p_customer_email,''))) not between 3 and 254
    or length(trim(coalesce(p_customer_phone,''))) not between 10 and 15
    or length(trim(coalesce(p_address,''))) not between 1 and 500
    or length(trim(coalesce(p_city,''))) not between 1 and 100
    or length(trim(coalesce(p_state,''))) not between 1 and 100
    or coalesce(p_pincode,'') !~ '^[0-9]{6}$'
  then raise exception 'invalid customer details'; end if;
  if p_payment_provider not in ('upi_qr','whatsapp','cod') then raise exception 'invalid payment provider'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception 'invalid items';
  end if;

  if v_code is not null then
    select * into v_coupon from public.coupons where code = v_code for update;
    if not found then raise exception 'Coupon code is invalid.'; end if;
    v_coupon_found := true;
    if not v_coupon.is_active then raise exception 'This coupon is inactive.'; end if;
    if v_coupon.starts_at is not null and v_coupon.starts_at > now() then raise exception 'This coupon is not active yet.'; end if;
    if v_coupon.expires_at is not null and v_coupon.expires_at <= now() then raise exception 'This coupon has expired.'; end if;
    if v_coupon.usage_limit is not null and v_coupon.usage_count >= v_coupon.usage_limit then raise exception 'This coupon has reached its usage limit.'; end if;
  end if;

  insert into public.orders (
    customer_id, customer_name, customer_email, customer_phone, address, landmark,
    city, state, pincode, delivery_note, subtotal_paise, shipping_paise,
    discount_paise, coupon_code, total_paise, order_status, payment_status, payment_provider
  ) values (
    v_user_id, trim(p_customer_name), lower(trim(p_customer_email)), regexp_replace(p_customer_phone, '[^0-9]', '', 'g'),
    trim(p_address), nullif(trim(coalesce(p_landmark,'')),''), trim(p_city), trim(p_state), trim(p_pincode),
    nullif(trim(coalesce(p_delivery_note,'')),''), 0, 0, 0, null, 0, 'pending_payment', 'pending', p_payment_provider
  ) returning id into v_order_id;

  -- Lock and reserve in stable product-id order to reduce deadlocks.
  for v_item in
    select value from jsonb_array_elements(p_items) order by (value->>'productId')
  loop
    if coalesce(v_item->>'variant','Default') <> 'Default' then raise exception 'product options are not configured'; end if;
    if (v_item->>'quantity') !~ '^[0-9]+$' then raise exception 'invalid item quantity'; end if;
    v_qty := (v_item->>'quantity')::integer;
    if v_qty < 1 or v_qty > 99 then raise exception 'invalid item quantity'; end if;
    begin
      select * into v_product from public.products where id = (v_item->>'productId')::uuid for update;
    exception when invalid_text_representation then
      raise exception 'invalid item product';
    end;
    if not found or not v_product.is_active then raise exception 'product no longer available'; end if;
    if v_product.stock < v_qty then raise exception 'insufficient stock'; end if;
    if v_product.price < 0 or v_product.price > 999999999 then raise exception 'invalid order total'; end if;

    v_unit_paise := round(v_product.price * 100)::bigint;
    v_line_paise := v_unit_paise * v_qty;
    v_subtotal := v_subtotal + v_line_paise;
    update public.products set stock = stock - v_qty, updated_at = now() where id = v_product.id;
    insert into public.order_items(order_id, product_id, product_slug, product_name, variant, quantity, unit_price_paise, line_total_paise)
    values (v_order_id, v_product.id::text, v_product.slug, v_product.name, 'Default', v_qty, v_unit_paise, v_line_paise);
  end loop;

  v_shipping := case when v_subtotal < 99900 then 8000 else 0 end;
  if v_coupon_found then
    if v_subtotal < v_coupon.minimum_order_paise then raise exception 'Your order does not meet this coupon minimum.'; end if;
    if v_coupon.discount_type = 'percent' then
      v_discount := floor(v_subtotal * v_coupon.discount_value / 100)::bigint;
      if v_coupon.max_discount_paise is not null then v_discount := least(v_discount, v_coupon.max_discount_paise); end if;
    else
      v_discount := least(v_subtotal, round(v_coupon.discount_value)::bigint);
    end if;
    v_discount := greatest(0, least(v_discount, v_subtotal));
    update public.coupons set usage_count = usage_count + 1, updated_at = now() where id = v_coupon.id;
  end if;
  v_total := greatest(0, v_subtotal + v_shipping - v_discount);

  update public.orders set subtotal_paise = v_subtotal, shipping_paise = v_shipping,
    discount_paise = v_discount, coupon_code = v_code, total_paise = v_total, updated_at = now()
  where id = v_order_id;

  return jsonb_build_object('order_id',v_order_id,'subtotal_paise',v_subtotal,'shipping_paise',v_shipping,'discount_paise',v_discount,'total_paise',v_total);
end
$function$;

create or replace function public.cancel_my_pending_order(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_order public.orders%rowtype; v_item record;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_order from public.orders where id = p_order_id and customer_id = auth.uid() for update;
  if not found then raise exception 'order not found'; end if;
  if v_order.order_status <> 'pending_payment' or v_order.payment_status <> 'pending' then raise exception 'only unpaid pending orders can be cancelled'; end if;
  update public.orders set order_status = 'cancelled', updated_at = now() where id = p_order_id;
  for v_item in select product_id, quantity from public.order_items where order_id = p_order_id loop
    update public.products set stock = stock + v_item.quantity, updated_at = now() where id::text = v_item.product_id;
  end loop;
  if v_order.coupon_code is not null then
    update public.coupons set usage_count = greatest(0,usage_count-1), updated_at = now() where code = v_order.coupon_code;
  end if;
  return jsonb_build_object('success',true,'order_id',p_order_id);
end
$function$;

create or replace function public.expire_stale_pending_orders()
returns integer language plpgsql security definer set search_path = ''
as $function$
declare v_order public.orders%rowtype; v_item record; v_count integer := 0;
begin
  if auth.uid() is not null and not exists (select 1 from public.staff_roles where user_id = auth.uid() and role in ('admin','employee')) then
    raise exception 'permission denied';
  end if;
  for v_order in select * from public.orders where order_status = 'pending_payment' and payment_status = 'pending' and created_at < now() - interval '30 minutes' for update skip locked loop
    update public.orders set order_status = 'cancelled', updated_at = now() where id = v_order.id;
    for v_item in select product_id, quantity from public.order_items where order_id = v_order.id loop
      update public.products set stock = stock + v_item.quantity, updated_at = now() where id::text = v_item.product_id;
    end loop;
    if v_order.coupon_code is not null then
      update public.coupons set usage_count = greatest(0,usage_count-1), updated_at = now() where code = v_order.coupon_code;
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end
$function$;

create or replace function public.review_cod_order(p_order_id uuid, p_decision text, p_rejection_reason text default null)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_order public.orders%rowtype; v_item record;
begin
  if auth.uid() is null or not exists (select 1 from public.staff_roles where user_id = auth.uid() and role in ('admin','employee')) then raise exception 'permission denied'; end if;
  if p_decision not in ('approve','reject') then raise exception 'invalid decision'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.payment_provider <> 'cod' or v_order.order_status <> 'pending_payment' or v_order.payment_status <> 'pending' then raise exception 'order is not awaiting COD approval'; end if;
  if p_decision = 'approve' then
    update public.orders set order_status = 'confirmed', cod_approved_by = auth.uid(), cod_approved_at = now(), updated_at = now() where id = p_order_id;
  else
    update public.orders set order_status = 'cancelled', cod_rejection_reason = left(coalesce(p_rejection_reason,''),500), updated_at = now() where id = p_order_id;
    for v_item in select product_id, quantity from public.order_items where order_id = p_order_id loop
      update public.products set stock = stock + v_item.quantity, updated_at = now() where id::text = v_item.product_id;
    end loop;
    if v_order.coupon_code is not null then update public.coupons set usage_count = greatest(0,usage_count-1), updated_at = now() where code = v_order.coupon_code; end if;
  end if;
  return jsonb_build_object('success',true,'order_id',p_order_id,'decision',p_decision);
end
$function$;

create or replace function public.verify_order_payment(p_order_id uuid, p_payment_reference text default null)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_order public.orders%rowtype;
begin
  if auth.uid() is null or not exists (select 1 from public.staff_roles where user_id = auth.uid() and role in ('admin','employee')) then raise exception 'permission denied'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order not found'; end if;
  if v_order.payment_provider = 'cod' or v_order.payment_status <> 'pending' or v_order.order_status <> 'pending_payment' then raise exception 'order is not awaiting payment verification'; end if;
  update public.orders set payment_status = 'paid', order_status = 'confirmed',
    payment_reference = nullif(left(trim(coalesce(p_payment_reference,'')),200),''),
    payment_verified_at = now(), updated_at = now() where id = p_order_id;
  return jsonb_build_object('success',true,'order_id',p_order_id,'payment_status','paid');
end
$function$;

create or replace function public.mark_cod_collected(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_order public.orders%rowtype;
begin
  if auth.uid() is null or not exists (select 1 from public.staff_roles where user_id = auth.uid() and role in ('admin','employee')) then raise exception 'permission denied'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.payment_provider <> 'cod' or v_order.order_status <> 'delivered' or v_order.payment_status = 'paid' or v_order.cod_approved_at is null then raise exception 'COD can only be collected for an approved delivered order'; end if;
  update public.orders set payment_status = 'paid', cod_collected_at = now(), payment_verified_at = now(), updated_at = now() where id = p_order_id;
  return jsonb_build_object('success',true,'order_id',p_order_id,'payment_status','paid');
end
$function$;

create or replace function public.submit_product_review(p_product_id uuid, p_rating integer, p_title text, p_body text)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_rating not between 1 and 5 or length(trim(coalesce(p_title,''))) not between 1 and 100 or length(trim(coalesce(p_body,''))) not between 5 and 2000 then raise exception 'invalid review'; end if;
  if not exists (
    select 1 from public.orders o join public.order_items oi on oi.order_id = o.id
    where o.customer_id = auth.uid() and o.order_status = 'delivered' and o.payment_status = 'paid' and oi.product_id = p_product_id::text
  ) then raise exception 'Only customers with a delivered and paid order can review this product.'; end if;
  insert into public.product_reviews(product_id,customer_id,rating,title,body,status)
  values (p_product_id,auth.uid(),p_rating,trim(p_title),trim(p_body),'pending')
  on conflict (product_id,customer_id) do update set rating = excluded.rating, title = excluded.title, body = excluded.body, status = 'pending', updated_at = now();
  return jsonb_build_object('success',true);
end
$function$;

create or replace function public.moderate_product_review(p_review_id uuid, p_decision text)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
begin
  if auth.uid() is null or not exists (select 1 from public.staff_roles where user_id = auth.uid() and role in ('admin','employee')) then raise exception 'permission denied'; end if;
  if p_decision not in ('approve','reject') then raise exception 'invalid moderation decision'; end if;
  update public.product_reviews set status = case when p_decision = 'approve' then 'approved' else 'rejected' end, updated_at = now() where id = p_review_id;
  if not found then raise exception 'review not found'; end if;
  return jsonb_build_object('success',true,'review_id',p_review_id,'status',case when p_decision='approve' then 'approved' else 'rejected' end);
end
$function$;

create or replace function public.subscribe_newsletter(p_email text)
returns text language plpgsql security definer set search_path = ''
as $function$
declare v_email text := lower(trim(coalesce(p_email,''))); v_rows integer;
begin
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(v_email) > 254 then raise exception 'invalid email'; end if;
  insert into public.newsletter_subscribers(email) values (v_email) on conflict (email) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 1 then return 'subscribed'; end if;
  update public.newsletter_subscribers set is_active = true where email = v_email and is_active = false;
  get diagnostics v_rows = row_count;
  if v_rows = 1 then return 'subscribed'; end if;
  return 'already_subscribed';
end
$function$;

-- Product writes are admin-only. Employees may process orders/reviews but cannot alter the catalogue.
do $block$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'products'
  loop
    execute format('drop policy if exists %I on public.products', p.policyname);
  end loop;
end
$block$;
create policy "Public can read active products" on public.products
  for select to anon, authenticated using (is_active = true);
create policy "Staff can read all products" on public.products
  for select to authenticated using (exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role in ('admin','employee')));
create policy "Admins insert products" on public.products
  for insert to authenticated with check (exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role = 'admin'));
create policy "Admins update products" on public.products
  for update to authenticated using (exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role = 'admin'))
  with check (exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role = 'admin'));
create policy "Admins delete products" on public.products
  for delete to authenticated using (exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role = 'admin'));
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

-- Existing delivery-transition RPC is kept; it already validates staff roles and delivery progression.

revoke all on function public.create_order_atomic(text,text,text,text,text,text,text,text,text,text,jsonb,text) from public;
revoke all on function public.cancel_my_pending_order(uuid) from public;
revoke all on function public.expire_stale_pending_orders() from public;
revoke all on function public.review_cod_order(uuid,text,text) from public;
revoke all on function public.verify_order_payment(uuid,text) from public;
revoke all on function public.mark_cod_collected(uuid) from public;
revoke all on function public.submit_product_review(uuid,integer,text,text) from public;
revoke all on function public.moderate_product_review(uuid,text) from public;
revoke all on function public.subscribe_newsletter(text) from public;

grant execute on function public.create_order_atomic(text,text,text,text,text,text,text,text,text,text,jsonb,text) to authenticated;
grant execute on function public.cancel_my_pending_order(uuid) to authenticated;
grant execute on function public.expire_stale_pending_orders() to authenticated, service_role;
grant execute on function public.review_cod_order(uuid,text,text) to authenticated;
grant execute on function public.verify_order_payment(uuid,text) to authenticated;
grant execute on function public.mark_cod_collected(uuid) to authenticated;
grant execute on function public.submit_product_review(uuid,integer,text,text) to authenticated;
grant execute on function public.moderate_product_review(uuid,text) to authenticated;
grant execute on function public.subscribe_newsletter(text) to anon, authenticated;

commit;
