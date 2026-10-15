begin;

-- A NULL decision must be rejected explicitly; SQL's three-valued logic means
-- "NULL NOT IN (...)" is NULL, not TRUE.
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

revoke all on function public.review_employee_task(uuid, text, text) from public, anon, authenticated;
grant execute on function public.review_employee_task(uuid, text, text) to authenticated;

commit;
