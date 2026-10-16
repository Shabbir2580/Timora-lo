-- Atomically manage customer address defaults and default-address deletion.
-- Apply this migration in Supabase before deploying the matching application commit.

begin;

create or replace function public.set_customer_default_address(p_address_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  -- Confirm ownership before changing any rows; RLS remains in force.
  perform 1
  from public.addresses
  where id = p_address_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Address not found' using errcode = 'P0002';
  end if;

  update public.addresses
  set is_default = false, updated_at = now()
  where user_id = v_user_id and is_default = true and id <> p_address_id;

  update public.addresses
  set is_default = true, updated_at = now()
  where id = p_address_id and user_id = v_user_id;
end;
$$;

create or replace function public.delete_customer_address(p_address_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_was_default boolean;
  v_replacement_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select is_default into v_was_default
  from public.addresses
  where id = p_address_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Address not found' using errcode = 'P0002';
  end if;

  delete from public.addresses
  where id = p_address_id and user_id = v_user_id;

  if v_was_default then
    select id into v_replacement_id
    from public.addresses
    where user_id = v_user_id
    order by created_at desc, id
    limit 1
    for update;

    if v_replacement_id is not null then
      update public.addresses
      set is_default = true, updated_at = now()
      where id = v_replacement_id and user_id = v_user_id;
    end if;
  end if;
end;
$$;

revoke all on function public.set_customer_default_address(uuid) from public, anon;
revoke all on function public.delete_customer_address(uuid) from public, anon;
grant execute on function public.set_customer_default_address(uuid) to authenticated;
grant execute on function public.delete_customer_address(uuid) to authenticated;

commit;
