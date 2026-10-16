-- Guard the return/refund lifecycle at the database boundary.
-- This complements RLS: RLS controls who may update a request, while this trigger
-- prevents accidental or out-of-order status changes and impossible refund amounts.

begin;

create or replace function public.timora_guard_return_request_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_total bigint;
  v_allowed boolean := false;
begin
  if tg_op = 'INSERT' then
    if new.status is null or new.status <> 'requested' then
      raise exception 'new return requests must start as requested';
    end if;
    if new.refund_amount_paise is not null then
      raise exception 'refund amount cannot be set when a return request is created';
    end if;
    new.updated_at := now();
    return new;
  end if;

  if new.order_id is distinct from old.order_id
    or new.customer_id is distinct from old.customer_id
  then
    raise exception 'return request ownership and order cannot be changed';
  end if;

  if new.status is distinct from old.status then
    v_allowed := case old.status
      when 'requested' then new.status in ('under_review', 'rejected')
      when 'under_review' then new.status in ('approved', 'rejected')
      when 'approved' then new.status in ('pickup_scheduled', 'received', 'refund_pending', 'closed')
      when 'pickup_scheduled' then new.status in ('received', 'closed')
      when 'received' then new.status in ('refund_pending', 'closed')
      when 'refund_pending' then new.status in ('refunded', 'closed')
      when 'refunded' then new.status = 'closed'
      when 'rejected' then new.status = 'closed'
      when 'closed' then false
      else false
    end;

    if not v_allowed then
      raise exception 'invalid return status transition: % -> %', old.status, new.status;
    end if;
  end if;

  if new.refund_amount_paise is not null then
    if new.refund_amount_paise < 0 then
      raise exception 'refund amount cannot be negative';
    end if;

    select o.total_paise into v_order_total
    from public.orders o
    where o.id = new.order_id and o.customer_id = new.customer_id;

    if not found then
      raise exception 'return order not found';
    end if;

    if new.refund_amount_paise > v_order_total then
      raise exception 'refund amount cannot exceed the order total';
    end if;
  end if;

  if new.status = 'refunded' and new.refund_amount_paise is null then
    raise exception 'record the confirmed refund amount before marking refunded';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists timora_guard_return_request_lifecycle on public.return_requests;
create trigger timora_guard_return_request_lifecycle
before insert or update on public.return_requests
for each row execute function public.timora_guard_return_request_lifecycle();

revoke all on function public.timora_guard_return_request_lifecycle() from public, anon, authenticated;

commit;
