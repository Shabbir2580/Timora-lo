-- Evaluate auth.uid() once per statement in policies that still call it per row.
-- This preserves every policy's roles and predicates while applying the documented
-- init-plan optimization to the policies identified by Supabase's performance advisor.
begin;

do $migration$
declare
  policy_row record;
  alter_sql text;
begin
  for policy_row in
    select
      n.nspname as schema_name,
      c.relname as table_name,
      p.polname as policy_name,
      pg_get_expr(p.polqual, p.polrelid) as using_expression,
      pg_get_expr(p.polwithcheck, p.polrelid) as check_expression
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'return_request_staff_notes',
        'employee_tasks',
        'staff_permissions',
        'ad_campaigns',
        'business_expenses',
        'staff_audit_log'
      )
      and (
        coalesce(pg_get_expr(p.polqual, p.polrelid), '') ~ 'auth\.uid\(\)'
        or coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') ~ 'auth\.uid\(\)'
      )
  loop
    alter_sql := format(
      'alter policy %I on %I.%I',
      policy_row.policy_name,
      policy_row.schema_name,
      policy_row.table_name
    );

    if policy_row.using_expression is not null then
      alter_sql := alter_sql || format(
        ' using (%s)',
        replace(
          policy_row.using_expression,
          'auth.uid()',
          '(select auth.uid())'
        )
      );
    end if;

    if policy_row.check_expression is not null then
      alter_sql := alter_sql || format(
        ' with check (%s)',
        replace(
          policy_row.check_expression,
          'auth.uid()',
          '(select auth.uid())'
        )
      );
    end if;

    execute alter_sql;
  end loop;
end
$migration$;

commit;
