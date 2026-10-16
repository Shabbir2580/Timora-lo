begin;

-- Create tasks through a narrowly scoped, role-checked RPC so task assignment
-- does not depend on fragile client-side INSERT RLS policy comparisons.
create or replace function public.assign_employee_task(
  p_title text,
  p_description text,
  p_assigned_to uuid,
  p_priority text default 'normal',
  p_due_date date default null
)
returns public.employee_tasks
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_task public.employee_tasks%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in before assigning a task.';
  end if;

  if not exists (
    select 1
    from public.staff_roles sr
    where sr.user_id = auth.uid()
      and sr.role::text = 'admin'
  ) then
    raise exception 'Only administrators can assign employee tasks.';
  end if;

  if p_title is null or char_length(trim(p_title)) not between 1 and 160 then
    raise exception 'Task title must contain between 1 and 160 characters.';
  end if;

  if p_priority is null or p_priority not in ('low', 'normal', 'high') then
    raise exception 'Choose a valid task priority.';
  end if;

  if not exists (
    select 1
    from public.staff_roles target
    where target.user_id = p_assigned_to
      and target.role::text = 'employee'
  ) then
    raise exception 'Choose an authorized employee account.';
  end if;

  insert into public.employee_tasks (
    title,
    description,
    assigned_to,
    assigned_by,
    priority,
    due_date
  )
  values (
    trim(p_title),
    nullif(trim(coalesce(p_description, '')), ''),
    p_assigned_to,
    auth.uid(),
    p_priority,
    p_due_date
  )
  returning * into v_task;

  return v_task;
end
$function$;

revoke all on function public.assign_employee_task(text, text, uuid, text, date) from public, anon, authenticated;
grant execute on function public.assign_employee_task(text, text, uuid, text, date) to authenticated;

commit;
