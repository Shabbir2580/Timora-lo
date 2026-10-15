-- Atomic checkout and stock reservations for Timora.
-- Shipping remains zero until shipping rules are configured.
-- Prices are stored in public.products.price as INR and order totals in paise.
-- Pending orders reserve stock immediately. Cancellation/expiry releases it exactly once.

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
set search_path = public, auth
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
  v_coupon text := upper(nullif(btrim(p_coupon_code), ''));
  v_item_count integer;
  v_coupon_used boolean;
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
    or p_pincode !~ '^\d{6}$'
  then
    raise exception 'invalid customer';
  end if;

  if p_payment_provider is null or p_payment_provider not in ('upi_qr', 'whatsapp', 'cod') then
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
    if coalesce(v_item->>'quantity', '') !~ '^\d+$' then
      raise exception 'invalid item quantity';
    end if;
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
      into v_name, v_slug, v_price, v_stock, v_coupon_used
      from public.products p where p.id = v_product_id;
    if not coalesce(v_coupon_used, false) then
      raise exception 'product no longer available';
    end if;
    if v_price is null or v_price < 0 or v_stock is null or v_stock < v_quantity then
      raise exception 'insufficient stock';
    end if;
    v_subtotal := v_subtotal + (round(v_price * 100)::bigint * v_quantity);
  end loop;

  if v_subtotal <= 0 then raise exception 'invalid order total'; end if;

  if v_coupon is not null then
    if v_coupon = 'TIMORA500' then
      if v_subtotal < 499900 then raise exception 'Coupon TIMORA500 requires a minimum order of INR 4,999'; end if;
      v_discount := 50000;
    elsif v_coupon = 'FIRST10' then
      if v_subtotal < 99900 then raise exception 'Coupon FIRST10 requires a minimum order of INR 999'; end if;
      if exists (select 1 from public.orders o where o.customer_id = v_user_id and o.order_status <> 'cancelled') then
        raise exception 'Coupon FIRST10 is available only on your first order';
      end if;
      v_discount := floor(v_subtotal * 0.10)::bigint;
    else
      raise exception 'Invalid coupon code';
    end if;
    v_discount := least(v_discount, v_subtotal);
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
    v_subtotal, v_shipping, v_discount, v_coupon, v_total,
    'pending_payment', 'pending', p_payment_provider, null
  ) returning id into v_order_id;

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

create or replace function public.cancel_my_pending_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select * into v_order
  from public.orders
  where id = p_order_id and customer_id = auth.uid()
  for update;

  if not found then raise exception 'order not found'; end if;
  if v_order.order_status <> 'pending_payment' or v_order.payment_status <> 'pending' then
    raise exception 'only unpaid pending orders can be cancelled';
  end if;

  for v_item in select product_id, quantity from public.order_items where order_id = v_order.id
  loop
    if v_item.product_id is not null then
      update public.products set stock = stock + v_item.quantity, updated_at = now()
      where id = v_item.product_id;
    end if;
  end loop;

  update public.orders
  set order_status = 'cancelled', updated_at = now()
  where id = v_order.id;

  return true;
end;
$$;

revoke all on function public.cancel_my_pending_order(uuid) from public, anon;
grant execute on function public.cancel_my_pending_order(uuid) to authenticated;

create or replace function public.expire_stale_pending_orders()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_count integer := 0;
begin
  if not exists (
    select 1 from public.staff_roles sr
    where sr.user_id = auth.uid() and sr.role in ('admin', 'employee')
  ) then
    raise exception 'permission denied';
  end if;

  for v_order in
    select * from public.orders
    where order_status = 'pending_payment'
      and payment_status = 'pending'
      and created_at < now() - interval '30 minutes'
    for update skip locked
  loop
    for v_item in select product_id, quantity from public.order_items where order_id = v_order.id
    loop
      if v_item.product_id is not null then
        update public.products set stock = stock + v_item.quantity, updated_at = now()
        where id = v_item.product_id;
      end if;
    end loop;
    update public.orders set order_status = 'cancelled', updated_at = now()
      where id = v_order.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.expire_stale_pending_orders() from public, anon;
grant execute on function public.expire_stale_pending_orders() to authenticated;
