-- Permit a customer to submit a new return request if the previous request
-- was rejected or closed, while preventing multiple unresolved requests.
-- Existing requests are preserved.
alter table public.return_requests
  drop constraint if exists return_requests_one_active_per_order;

drop index if exists public.return_requests_one_active_per_order_idx;

create unique index if not exists return_requests_one_active_per_order_idx
  on public.return_requests (order_id)
  where status not in ('rejected', 'closed');
