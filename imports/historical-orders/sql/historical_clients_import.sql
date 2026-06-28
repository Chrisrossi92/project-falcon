-- Falcon historical clients import
-- Generated from imports/historical-orders/plans/falcon_2025_2026_clients_import_plan.csv
-- Approval gate: generated SQL only. Review before applying.
-- Expected planned creates: 0
-- Import source: Historical Import
-- Import batch: 2025_2026

begin;

do $$
begin
  if not exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'clients'
       and column_name = 'operations_scope'
  ) then
    raise exception 'clients.operations_scope is required before historical import';
  end if;
end;
$$;

with source_clients (
  source_client_name,
  normalized_client_name,
  source_years,
  source_order_numbers
) as (
  values
    (null, null, null, null)
),
eligible_clients as (
  select *
    from source_clients
   where source_client_name is not null
),
inserted_clients as (
  insert into public.clients (
    company_id,
    operations_scope,
    name,
    status,
    category,
    contact_mode,
    notes,
    created_at
  )
  select
    public.default_company_id(),
    'internal_operations',
    ec.source_client_name,
    'active',
    'client',
    'contacts',
    concat('Created by historical import planner. source=', 'Historical Import', '; batch=', '2025_2026', '; source_order_numbers=', ec.source_order_numbers),
    now()
  from eligible_clients ec
  where not exists (
    select 1
      from public.clients c
     where coalesce(c.company_id, public.default_company_id()) = public.default_company_id()
       and coalesce(c.is_merged, false) = false
       and lower(coalesce(nullif(c.status, ''), 'active')) = 'active'
       and coalesce(c.operations_scope, 'internal_operations') = 'internal_operations'
       and lower(regexp_replace(trim(coalesce(c.name, '')), '\s+', ' ', 'g')) = lower(regexp_replace(trim(coalesce(ec.source_client_name, '')), '\s+', ' ', 'g'))
  )
  returning id, name
)
select
  'historical_clients_import' as check_name,
  (select count(*) from eligible_clients) as planned_create_clients,
  (select count(*) from inserted_clients) as inserted_clients,
  (
    select count(*)
      from eligible_clients ec
     where exists (
       select 1
         from public.clients c
        where coalesce(c.company_id, public.default_company_id()) = public.default_company_id()
          and coalesce(c.is_merged, false) = false
          and lower(coalesce(nullif(c.status, ''), 'active')) = 'active'
          and coalesce(c.operations_scope, 'internal_operations') = 'internal_operations'
          and lower(regexp_replace(trim(coalesce(c.name, '')), '\s+', ' ', 'g')) = lower(regexp_replace(trim(coalesce(ec.source_client_name, '')), '\s+', ' ', 'g'))
     )
  ) as available_after_import;

commit;
