begin;

-- Allow authorized Timora admins and employees to permanently delete products.
-- Keep this permission limited to accounts explicitly present in staff_roles.
drop policy if exists "Admins can delete products" on public.products;
drop policy if exists "Staff can delete products" on public.products;

create policy "Staff can delete products"
  on public.products
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.staff_roles sr
      where sr.user_id = auth.uid()
        and sr.role in ('admin', 'employee')
    )
  );

commit;
