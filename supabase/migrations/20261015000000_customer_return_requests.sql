-- Timora customer return requests
-- Apply this migration in the Supabase SQL editor before enabling the Returns page.
-- Requests are only allowed for delivered orders and within 30 days of delivery.
create table if not exists public.return_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  customer_id uuid not null references auth.users(id) on delete restrict,
  reason text not null check (reason in ('damaged', 'wrong_item', 'missing_item', 'not_as_described', 'other')),
  customer_note text not null default '' check (char_length(customer_note) <= 1500),
  status text not null default 'requested' check (status in ('requested', 'under_review', 'approved', 'rejected', 'pickup_scheduled', 'received', 'refund_pending', 'refunded', 'closed')),
  staff_note text,
  refund_amount_paise bigint check (refund_amount_paise is null or refund_amount_paise >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint return_requests_one_active_per_order unique (order_id)
);

alter table public.return_requests enable row level security;

drop policy if exists "Customers can view own return requests" on public.return_requests;
create policy "Customers can view own return requests"
  on public.return_requests for select to authenticated
  using (customer_id = auth.uid());

drop policy if exists "Customers can request returns for eligible delivered orders" on public.return_requests;
create policy "Customers can request returns for eligible delivered orders"
  on public.return_requests for insert to authenticated
  with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.customer_id = auth.uid()
        and o.order_status = 'delivered'
        and o.delivered_at is not null
        and o.delivered_at >= now() - interval '30 days'
    )
  );

drop policy if exists "Staff can view return requests" on public.return_requests;
create policy "Staff can view return requests"
  on public.return_requests for select to authenticated
  using (
    exists (
      select 1 from public.staff_roles sr
      where sr.user_id = auth.uid() and sr.role in ('admin', 'employee')
    )
  );

drop policy if exists "Admins can update return requests" on public.return_requests;
create policy "Admins can update return requests"
  on public.return_requests for update to authenticated
  using (
    exists (
      select 1 from public.staff_roles sr
      where sr.user_id = auth.uid() and sr.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.staff_roles sr
      where sr.user_id = auth.uid() and sr.role = 'admin'
    )
  );

create index if not exists return_requests_customer_created_idx
  on public.return_requests (customer_id, created_at desc);
create index if not exists return_requests_status_created_idx
  on public.return_requests (status, created_at desc);

create or replace function public.set_return_request_updated_at()
returns trigger language plpgsql set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists return_requests_updated_at on public.return_requests;
create trigger return_requests_updated_at
before update on public.return_requests
for each row execute function public.set_return_request_updated_at();
