begin;

create table if not exists public.employee_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text,
  assigned_to uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employee_tasks_assigned_to_created_idx
  on public.employee_tasks (assigned_to, created_at desc);

alter table public.employee_tasks enable row level security;

drop policy if exists "Admins can view all employee tasks" on public.employee_tasks;
create policy "Admins can view all employee tasks" on public.employee_tasks
  for select to authenticated
  using (exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role = 'admin'));

drop policy if exists "Employees can view their assigned tasks" on public.employee_tasks;
create policy "Employees can view their assigned tasks" on public.employee_tasks
  for select to authenticated
  using (assigned_to = auth.uid() and exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role = 'employee'));

drop policy if exists "Admins can create employee tasks" on public.employee_tasks;
create policy "Admins can create employee tasks" on public.employee_tasks
  for insert to authenticated
  with check (
    assigned_by = auth.uid()
    and exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role = 'admin')
    and exists (select 1 from public.staff_roles target where target.user_id = assigned_to and target.role = 'employee')
  );

drop policy if exists "Admins can update employee tasks" on public.employee_tasks;
create policy "Admins can update employee tasks" on public.employee_tasks
  for update to authenticated
  using (exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role = 'admin'))
  with check (exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role = 'admin'));

drop policy if exists "Employees can update their task progress" on public.employee_tasks;
create policy "Employees can update their task progress" on public.employee_tasks
  for update to authenticated
  using (assigned_to = auth.uid() and exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role = 'employee'))
  with check (
    assigned_to = auth.uid()
    and exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role = 'employee')
  );

grant select, insert, update on public.employee_tasks to authenticated;

commit;
