begin;

-- Repair the employee list RPC when the existing role column is a PostgreSQL enum
-- or the previously deployed function has a stale OUT-column definition.
-- PostgreSQL cannot change a function's OUT row type with CREATE OR REPLACE.
drop function if exists public.list_employee_task_members();

create function public.list_employee_task_members()
returns table (
  user_id uuid,
  email text,
  display_name text,
  role text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or not exists (
    select 1 from public.staff_roles sr
    where sr.user_id = auth.uid() and sr.role::text = 'admin'
  ) then
    raise exception 'Only administrators can list employee accounts.';
  end if;

  return query
  select
    u.id::uuid,
    coalesce(u.email::text, ''),
    coalesce(
      nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), ''),
      nullif(trim(coalesce(u.raw_user_meta_data ->> 'name', '')), ''),
      nullif(trim(concat_ws(' ', u.raw_user_meta_data ->> 'given_name', u.raw_user_meta_data ->> 'family_name')), ''),
      split_part(coalesce(u.email::text, 'Employee'), '@', 1)
    )::text,
    sr.role::text,
    sr.created_at::timestamptz
  from public.staff_roles sr
  join auth.users u on u.id = sr.user_id
  where sr.role::text = 'employee'
  order by lower(coalesce(
    nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(trim(coalesce(u.raw_user_meta_data ->> 'name', '')), ''),
    split_part(coalesce(u.email::text, 'Employee'), '@', 1)
  ));
end
$function$;

revoke all on function public.list_employee_task_members() from public, anon, authenticated;
grant execute on function public.list_employee_task_members() to authenticated;

commit;
