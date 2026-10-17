-- Add secure coupon preview and Razorpay payment lifecycle functions.
-- Shipping: ₹80 below ₹999; free at/above ₹999. Coupon rules are rechecked during order creation.

begin;

drop function if exists public.create_order_atomic(text,text,text,text,text,text,text,text,text,text,jsonb,text);

create function public.create_order_atomic(
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
)
returns table (
  order_id uuid,
  subtotal_paise bigint,
  shipping_paise bigint,
  discount_paise bigint,
  total_paise bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_variant text;
  v_quantity integer;
  v_price numeric;
  v_name text;
  v_slug text;
  v_stock integer;
  v_subtotal bigint := 0;
  v_shipping bigint := 0;
  v_discount bigint := 0;
  v_total bigint;
  v_coupon_code text := upper(nullif(btrim(p_coupon_code), ''));
  v_item_count integer;
  v_product_active boolean;
  v_coupon public.coupons%rowtype;
  v_coupon_found boolean := false;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if nullif(btrim(p_customer_name), '') is null
    or nullif(btrim(p_customer_email), '') is null
    or nullif(btrim(p_customer_phone), '') is null
    or nullif(btrim(p_address), '') is null
    or nullif(btrim(p_city), '') is null
    or nullif(btrim(p_state), '') is null
    or coalesce(p_pincode, '') !~ '^\d{6}$'
  then
    raise exception 'invalid customer';
  end if;

  if p_payment_provider is null or p_payment_provider not in ('upi_qr', 'whatsapp', 'cod', 'razorpay') then
    raise exception 'invalid payment provider';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception 'invalid item list';
  end if;

  -- Lock product rows in deterministic UUID order before any stock changes.
  for v_item in
    select value from jsonb_array_elements(p_items)
    order by (value->>'productId')::uuid
  loop
    if coalesce(v_item->>'variant', 'Default') <> 'Default' then
      raise exception 'product options are not configured';
    end if;
    if coalesce(v_item->>'quantity', '') !~ '^[0-9]+$' then raise exception 'invalid item quantity'; end if;
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity < 1 or v_quantity > 99 then
      raise exception 'invalid item quantity';
    end if;
    v_product_id := (v_item->>'productId')::uuid;
    perform 1 from public.products p where p.id = v_product_id for update;
    if not found then raise exception 'product no longer available'; end if;
  end loop;

  select count(*) into v_item_count from jsonb_array_elements(p_items);
  if v_item_count < 1 then raise exception 'invalid item list'; end if;
  if v_item_count <> (
    select count(distinct (value->>'productId')::uuid)
    from jsonb_array_elements(p_items)
  ) then
    raise exception 'duplicate product lines are not allowed';
  end if;

  -- Validate and calculate from the locked live catalogue, never client prices.
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'productId')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    select p.name, p.slug, p.price, p.stock, p.is_active
      into v_name, v_slug, v_price, v_stock, v_product_active
      from public.products p where p.id = v_product_id;
    if not coalesce(v_product_active, false) then
      raise exception 'product no longer available';
    end if;
    if v_price is null or v_price < 0 or v_stock is null or v_stock < v_quantity then
      raise exception 'insufficient stock';
    end if;
    v_subtotal := v_subtotal + (round(v_price * 100)::bigint * v_quantity);
  end loop;

  if v_subtotal <= 0 then raise exception 'invalid order total'; end if;

  -- Shipping is INR 80 below INR 999 and free from INR 999 onward.
  -- Evaluate the threshold against the live subtotal before coupon discounts.
  v_shipping := case when v_subtotal >= 99900 then 0 else 8000 end;

  -- Lock the coupon row so simultaneous checkouts cannot exceed usage limits.
  if v_coupon_code is not null then
    select * into v_coupon from public.coupons c where c.code = v_coupon_code for update;
    if not found then raise exception 'Coupon code is invalid.'; end if;
    v_coupon_found := true;
    if not v_coupon.is_active then raise exception 'This coupon is inactive.'; end if;
    if v_coupon.starts_at is not null and v_coupon.starts_at > now() then raise exception 'This coupon is not active yet.'; end if;
    if v_coupon.expires_at is not null and v_coupon.expires_at <= now() then raise exception 'This coupon has expired.'; end if;
    if v_coupon.usage_limit is not null and v_coupon.usage_count >= v_coupon.usage_limit then raise exception 'This coupon has reached its usage limit.'; end if;
    if v_subtotal < v_coupon.minimum_order_paise then raise exception 'Your order does not meet this coupon minimum.'; end if;

    if v_coupon.discount_type = 'percent' then
      v_discount := floor(v_subtotal * v_coupon.discount_value / 100)::bigint;
      if v_coupon.max_discount_paise is not null then
        v_discount := least(v_discount, v_coupon.max_discount_paise);
      end if;
    elsif v_coupon.discount_type = 'fixed' then
      v_discount := least(v_subtotal, round(v_coupon.discount_value)::bigint);
    else
      raise exception 'This coupon has an unsupported discount type.';
    end if;
    v_discount := greatest(0, least(v_discount, v_subtotal));
  end if;

  v_total := v_subtotal + v_shipping - v_discount;
  if v_total < 0 then raise exception 'invalid order total'; end if;

  insert into public.orders (
    customer_id, customer_name, customer_email, customer_phone,
    address, landmark, city, state, pincode, delivery_note,
    subtotal_paise, shipping_paise, discount_paise, coupon_code, total_paise,
    order_status, payment_status, payment_provider, payment_reference
  ) values (
    v_user_id, btrim(p_customer_name), lower(btrim(p_customer_email)), btrim(p_customer_phone),
    btrim(p_address), nullif(btrim(p_landmark), ''), btrim(p_city), btrim(p_state),
    btrim(p_pincode), nullif(btrim(p_delivery_note), ''),
    v_subtotal, v_shipping, v_discount, v_coupon_code, v_total,
    'pending_payment', 'pending', p_payment_provider, null
  ) returning id into v_order_id;

  if v_coupon_found then
    update public.coupons
    set usage_count = usage_count + 1, updated_at = now()
    where id = v_coupon.id;
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'productId')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    v_variant := coalesce(nullif(btrim(v_item->>'variant'), ''), 'Default');
    select p.name, p.slug, p.price into v_name, v_slug, v_price
      from public.products p where p.id = v_product_id;
    insert into public.order_items (
      order_id, product_id, product_name, product_slug, quantity,
      unit_price_paise, line_total_paise, variant
    ) values (
      v_order_id, v_product_id, v_name, v_slug, v_quantity,
      round(v_price * 100)::bigint, round(v_price * 100)::bigint * v_quantity, v_variant
    );
    update public.products set stock = stock - v_quantity, updated_at = now()
      where id = v_product_id;
  end loop;

  return query select v_order_id, v_subtotal, v_shipping, v_discount, v_total;
end;
$$;

revoke all on function public.create_order_atomic(text,text,text,text,text,text,text,text,text,text,jsonb,text) from public, anon;
grant execute on function public.create_order_atomic(text,text,text,text,text,text,text,text,text,text,jsonb,text) to authenticated;


-- Preview coupon eligibility and totals from live product rows without reserving stock or coupon usage.
create or replace function public.preview_checkout_totals(
  p_items jsonb,
  p_coupon_code text default null
)
returns table (
  subtotal_paise bigint,
  shipping_paise bigint,
  discount_paise bigint,
  total_paise bigint,
  coupon_code text
)
language plpgsql
security definer
set search_path = ''
as $preview$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_price numeric;
  v_stock integer;
  v_active boolean;
  v_subtotal bigint := 0;
  v_shipping bigint := 0;
  v_discount bigint := 0;
  v_total bigint;
  v_code text := upper(nullif(btrim(p_coupon_code), ''));
  v_coupon public.coupons%rowtype;
  v_item_count integer;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception 'invalid item list';
  end if;

  select count(*) into v_item_count from jsonb_array_elements(p_items);
  if v_item_count <> (select count(distinct (value->>'productId')::uuid) from jsonb_array_elements(p_items)) then
    raise exception 'duplicate product lines are not allowed';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    if coalesce(v_item->>'variant', 'Default') <> 'Default' then raise exception 'product options are not configured'; end if;
    if coalesce(v_item->>'quantity', '') !~ '^[0-9]+$' then raise exception 'invalid item quantity'; end if;
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity < 1 or v_quantity > 99 then raise exception 'invalid item quantity'; end if;
    v_product_id := (v_item->>'productId')::uuid;
    select p.price, p.stock, p.is_active into v_price, v_stock, v_active
      from public.products p where p.id = v_product_id;
    if not found or not coalesce(v_active, false) then raise exception 'product no longer available'; end if;
    if v_price is null or v_price < 0 or v_stock is null or v_stock < v_quantity then raise exception 'insufficient stock'; end if;
    v_subtotal := v_subtotal + round(v_price * 100)::bigint * v_quantity;
  end loop;

  if v_subtotal <= 0 then raise exception 'invalid order total'; end if;
  v_shipping := case when v_subtotal >= 99900 then 0 else 8000 end;

  if v_code is not null then
    select * into v_coupon from public.coupons c where c.code = v_code;
    if not found then raise exception 'Coupon code is invalid.'; end if;
    if not v_coupon.is_active then raise exception 'This coupon is inactive.'; end if;
    if v_coupon.starts_at is not null and v_coupon.starts_at > now() then raise exception 'This coupon is not active yet.'; end if;
    if v_coupon.expires_at is not null and v_coupon.expires_at <= now() then raise exception 'This coupon has expired.'; end if;
    if v_coupon.usage_limit is not null and v_coupon.usage_count >= v_coupon.usage_limit then raise exception 'This coupon has reached its usage limit.'; end if;
    if v_subtotal < v_coupon.minimum_order_paise then raise exception 'Your order does not meet this coupon minimum.'; end if;
    if v_coupon.discount_type = 'percent' then
      v_discount := floor(v_subtotal * v_coupon.discount_value / 100)::bigint;
      if v_coupon.max_discount_paise is not null then v_discount := least(v_discount, v_coupon.max_discount_paise); end if;
    elsif v_coupon.discount_type = 'fixed' then
      v_discount := least(v_subtotal, round(v_coupon.discount_value)::bigint);
    else
      raise exception 'This coupon has an unsupported discount type.';
    end if;
    v_discount := greatest(0, least(v_discount, v_subtotal));
  end if;

  v_total := v_subtotal + v_shipping - v_discount;
  return query select v_subtotal, v_shipping, v_discount, v_total, v_code;
end;
$preview$;

revoke all on function public.preview_checkout_totals(jsonb,text) from public, anon;
grant execute on function public.preview_checkout_totals(jsonb,text) to authenticated;

-- Bind a Razorpay order to the authenticated customer's pending Timora order.
create or replace function public.set_razorpay_order_reference(p_order_id uuid, p_razorpay_order_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $setref$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_razorpay_order_id is null or left(p_razorpay_order_id, 6) <> 'order_' or length(p_razorpay_order_id) < 10 then raise exception 'invalid Razorpay order ID'; end if;
  update public.orders
    set payment_reference = p_razorpay_order_id, updated_at = now()
    where id = p_order_id and customer_id = auth.uid()
      and payment_provider = 'razorpay' and payment_status = 'pending'
      and order_status = 'pending_payment' and payment_reference is null;
  if not found then raise exception 'pending Razorpay order not found'; end if;
  return jsonb_build_object('success', true, 'order_id', p_order_id);
end;
$setref$;

revoke all on function public.set_razorpay_order_reference(uuid,text) from public, anon;
grant execute on function public.set_razorpay_order_reference(uuid,text) to authenticated;

-- Finalize payment only after the API route has verified the Razorpay signature and captured status.
create or replace function public.verify_razorpay_order_payment(
  p_order_id uuid,
  p_razorpay_order_id text,
  p_payment_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $verify$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if coalesce(p_payment_id, '') not like 'pay_%' or length(p_payment_id) < 8 then raise exception 'invalid Razorpay payment ID'; end if;
  update public.orders
    set payment_status = 'paid',
        order_status = 'confirmed',
        payment_reference = left(p_payment_id, 200),
        payment_verified_at = now(),
        updated_at = now()
    where id = p_order_id and customer_id = auth.uid()
      and payment_provider = 'razorpay'
      and payment_status = 'pending'
      and order_status = 'pending_payment'
      and payment_reference = p_razorpay_order_id;
  if not found then raise exception 'Razorpay payment does not match a pending order'; end if;
  return jsonb_build_object('success', true, 'order_id', p_order_id, 'payment_status', 'paid');
end;
$verify$;

revoke all on function public.verify_razorpay_order_payment(uuid,text,text) from public, anon;
grant execute on function public.verify_razorpay_order_payment(uuid,text,text) to authenticated;


commit;
