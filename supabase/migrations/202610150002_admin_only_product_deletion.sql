begin;

-- Product creation and editing remain available to authorized employees.
-- Permanent deletion is an administrator-only action.
drop policy if exists "Staff can delete products" on public.products;
drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products" on public.products
  for delete to authenticated
  using (exists (
    select 1 from public.staff_roles sr
    where sr.user_id = auth.uid() and sr.role = 'admin'
  ));

commit;
