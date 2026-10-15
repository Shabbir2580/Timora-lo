-- Keep internal return-review notes out of customer-readable return_requests rows.
create table if not exists public.return_request_staff_notes (
  return_request_id uuid primary key
    references public.return_requests(id) on delete cascade,
  staff_note text not null default '' check (char_length(staff_note) <= 1500),
  updated_at timestamptz not null default now()
);

alter table public.return_request_staff_notes enable row level security;

drop policy if exists "Staff can view private return notes" on public.return_request_staff_notes;
create policy "Staff can view private return notes"
  on public.return_request_staff_notes for select to authenticated
  using (
    exists (
      select 1 from public.staff_roles sr
      where sr.user_id = auth.uid() and sr.role in ('admin', 'employee')
    )
  );

drop policy if exists "Admins can insert private return notes" on public.return_request_staff_notes;
create policy "Admins can insert private return notes"
  on public.return_request_staff_notes for insert to authenticated
  with check (
    exists (
      select 1 from public.staff_roles sr
      where sr.user_id = auth.uid() and sr.role = 'admin'
    )
  );

drop policy if exists "Admins can update private return notes" on public.return_request_staff_notes;
create policy "Admins can update private return notes"
  on public.return_request_staff_notes for update to authenticated
  using (
    exists (
      select 1 from public.staff_roles sr
      where sr.user_id = auth.uid() and sr.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.staff_roles sr
      where sr.user_id = auth.uid() and sr.role = 'admin'
    )
  );

insert into public.return_request_staff_notes (return_request_id, staff_note)
select id, staff_note
from public.return_requests
where staff_note is not null and btrim(staff_note) <> ''
on conflict (return_request_id) do update
set staff_note = excluded.staff_note, updated_at = now();

alter table public.return_requests drop column if exists staff_note;

create or replace function public.set_return_staff_note_updated_at()
returns trigger language plpgsql set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists return_request_staff_notes_updated_at on public.return_request_staff_notes;
create trigger return_request_staff_notes_updated_at
before update on public.return_request_staff_notes
for each row execute function public.set_return_staff_note_updated_at();
