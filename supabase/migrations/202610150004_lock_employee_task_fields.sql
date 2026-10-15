begin;

-- Employees may update only task status, not reassign tasks or edit task details.
revoke update on public.employee_tasks from authenticated;
grant update (status) on public.employee_tasks to authenticated;

commit;
