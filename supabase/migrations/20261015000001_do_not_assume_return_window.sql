-- Do not assume a return window until Timora publishes its actual customer policy.
-- Customers can submit a request for a delivered order; staff reviews eligibility.
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
    )
  );
