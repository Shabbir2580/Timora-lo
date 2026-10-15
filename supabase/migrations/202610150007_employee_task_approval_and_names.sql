begin;

-- Add an explicit employee submission / admin approval workflow.
alter table public.employee_tasks
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists review_note text;

-- Replace the original three-state constraint while preserving existing task rows.
do $migration$
declare
  v_constraint record;
begin
  for v_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.employee_tasks'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.employee_tasks drop constraint %I', v_constraint.conname);
  end loop;
end
$migration$;

alter table public.employee_tasks
  add constraint employee_tasks_status_check
  check (status in ('todo', 'in_progress', 'submitted', 'needs_changes', 'done'));

create index if not exists employee_tasks_status_due_date_idx
  on public.employee_tasks (status, due_date);

-- Return authorized employees with a human-readable name. Auth metadata is optional;
-- the email prefix is a safe fallback when the account has no profile name.
create or replace function public.list_employee_task_members()
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
    where sr.user_id = auth.uid() and sr.role = 'admin'
  ) then
    raise exception 'Only administrators can list employee accounts.';
  end if;

  return query
  select
    u.id,
    coalesce(u.email, ''),
    coalesce(
      nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), ''),
      nullif(trim(coalesce(u.raw_user_meta_data ->> 'name', '')), ''),
      nullif(trim(concat_ws(' ', u.raw_user_meta_data ->> 'given_name', u.raw_user_meta_data ->> 'family_name')), ''),
      split_part(coalesce(u.email, 'Employee'), '@', 1)
    ),
    sr.role,
    sr.created_at
  from public.staff_roles sr
  join auth.users u on u.id = sr.user_id
  where sr.role = 'employee'
  order by lower(coalesce(
    nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(trim(coalesce(u.raw_user_meta_data ->> 'name', '')), ''),
    split_part(coalesce(u.email, 'Employee'), '@', 1)
  ));
end
$function$;

-- Employees may start/restart work but cannot mark a task completed themselves.
create or replace function public.start_employee_task(p_task_id uuid)
returns public.employee_tasks
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_task public.employee_tasks%rowtype;
begin
  if auth.uid() is null or not exists (
    select 1 from public.staff_roles sr
    where sr.user_id = auth.uid() and sr.role = 'employee'
  ) then
    raise exception 'Only authorized employees can update their work.';
  end if;

  update public.employee_tasks t
  set status = 'in_progress', updated_at = now()
  where t.id = p_task_id
    and t.assigned_to = auth.uid()
    and t.status in ('todo', 'needs_changes')
  returning t.* into v_task;

  if not found then
    raise exception 'This task cannot be started. Refresh the page and check its status.';
  end if;

  return v_task;
end
$function$;

create or replace function public.submit_employee_task(p_task_id uuid)
returns public.employee_tasks
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_task public.employee_tasks%rowtype;
begin
  if auth.uid() is null or not exists (
    select 1 from public.staff_roles sr
    where sr.user_id = auth.uid() and sr.role = 'employee'
  ) then
    raise exception 'Only authorized employees can submit work.';
  end if;

  update public.employee_tasks t
  set status = 'submitted',
      submitted_at = now(),
      reviewed_at = null,
      reviewed_by = null,
      review_note = null,
      updated_at = now()
  where t.id = p_task_id
    and t.assigned_to = auth.uid()
    and t.status = 'in_progress'
  returning t.* into v_task;

  if not found then
    raise exception 'Start the task before submitting it for approval.';
  end if;

  return v_task;
end
$function$;

-- Admins approve submitted work or return it with a note explaining what needs changing.
create or replace function public.review_employee_task(
  p_task_id uuid,
  p_decision text,
  p_review_note text default null
)
returns public.employee_tasks
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_task public.employee_tasks%rowtype;
  v_status text;
  v_note text := nullif(trim(coalesce(p_review_note, '')), '');
begin
  if auth.uid() is null or not exists (
    select 1 from public.staff_roles sr
    where sr.user_id = auth.uid() and sr.role = 'admin'
  ) then
    raise exception 'Only administrators can review submitted work.';
  end if;

  if p_decision is null or p_decision not in ('approve', 'request_changes') then
    raise exception 'Invalid review decision.';
  end if;

  if p_decision = 'request_changes' and v_note is null then
    raise exception 'Add a short note explaining what the employee should change.';
  end if;

  v_status := case when p_decision = 'approve' then 'done' else 'needs_changes' end;

  update public.employee_tasks t
  set status = v_status,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      review_note = v_note,
      updated_at = now()
  where t.id = p_task_id
    and t.status = 'submitted'
  returning t.* into v_task;

  if not found then
    raise exception 'This task is not waiting for approval. Refresh the page and try again.';
  end if;

  return v_task;
end
$function$;

-- Force all status changes through the role-checked functions above.
revoke update on public.employee_tasks from authenticated;
revoke update (status) on public.employee_tasks from authenticated;

revoke all on function public.list_employee_task_members() from public, anon, authenticated;
revoke all on function public.start_employee_task(uuid) from public, anon, authenticated;
revoke all on function public.submit_employee_task(uuid) from public, anon, authenticated;
revoke all on function public.review_employee_task(uuid, text, text) from public, anon, authenticated;

grant execute on function public.list_employee_task_members() to authenticated;
grant execute on function public.start_employee_task(uuid) to authenticated;
grant execute on function public.submit_employee_task(uuid) to authenticated;
grant execute on function public.review_employee_task(uuid, text, text) to authenticated;

commit;
