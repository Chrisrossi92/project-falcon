-- Falcon historical orders import
-- Generated from imports/historical-orders/plans/falcon_2025_2026_orders_import_plan.csv
-- Approval gate: generated SQL only. Review before applying.
-- Planned safe order inserts: 0
-- Planned exact order-number skips excluded from this file: 552
-- Planned manual-review collisions excluded from this file: 8
-- Import source: Historical Import
-- Import batch: 2025_2026

begin;

-- Direct psql execution does not automatically carry Supabase JWT claims.
-- Set a transaction-local service-role claim so order attachment trigger
-- predicates evaluate the same way this approved staging import was planned.
set local "request.jwt.claims" = '{"role":"service_role","suppress_notifications":true,"suppress_email_queue":true}';

-- Historical imports are data backfills, not live workflow events. This flag
-- is consumed by notification/email trigger guards and prevents fanout.
set local "app.suppress_notifications" = 'on';

do $$
begin
  if not exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'orders'
       and column_name = 'import_source'
  ) then
    raise exception 'orders.import_source is required. Apply 20260626090000_add_historical_import_order_metadata.sql first.';
  end if;

  if not exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'orders'
       and column_name = 'import_batch'
  ) then
    raise exception 'orders.import_batch is required. Apply 20260626090000_add_historical_import_order_metadata.sql first.';
  end if;
end;
$$;

with source_orders (
  order_number,
  client_name,
  normalized_client_name,
  planned_existing_client_id,
  property_address,
  city,
  state,
  property_type,
  fee,
  ordered_date,
  inspection_date,
  completed_date,
  appraiser_user_id,
  reviewer_user_id,
  confidence,
  source_file,
  source_row
) as (
  values
    (null, null, null, null::bigint, null, null, null, null, null::numeric, null::date, null::date, null::date, null::uuid, null::uuid, null, null, null)
),
resolved_orders as (
  select
    so.*,
    coalesce(
      (
        select c.id
          from public.clients c
         where c.id = so.planned_existing_client_id
           and coalesce(c.company_id, public.default_company_id()) = public.current_company_id()
           and coalesce(c.is_merged, false) = false
           and public.current_app_user_can_attach_order_client(c.id)
           and public.client_relationship_has_operations_scope(c.id, public.current_company_id(), 'internal_operations')
         limit 1
      ),
      (
        select c.id
          from public.clients c
         where coalesce(c.company_id, public.default_company_id()) = public.current_company_id()
           and coalesce(c.is_merged, false) = false
           and public.current_app_user_can_attach_order_client(c.id)
           and public.client_relationship_has_operations_scope(c.id, public.current_company_id(), 'internal_operations')
           and coalesce(c.operations_scope, 'internal_operations') = 'internal_operations'
           and lower(regexp_replace(trim(coalesce(c.name, '')), '\s+', ' ', 'g')) = lower(regexp_replace(trim(coalesce(so.client_name, '')), '\s+', ' ', 'g'))
         order by c.created_at asc nulls last, c.id asc
         limit 1
      )
    ) as resolved_client_id
  from source_orders so
  where so.order_number is not null
),
insertable_orders as (
  select *
    from resolved_orders ro
   where ro.resolved_client_id is not null
     and public.current_app_user_can_attach_order_client(ro.resolved_client_id)
     and not exists (
       select 1
         from public.orders o
        where coalesce(o.company_id, public.default_company_id()) = public.default_company_id()
          and coalesce(o.order_number, '') = ro.order_number
     )
),
inserted_orders as (
  insert into public.orders (
    company_id,
    operations_scope,
    order_number,
    status,
    client_id,
    manual_client,
    manual_client_name,
    property_address,
    address,
    city,
    state,
    property_type,
    base_fee,
    fee_amount,
    date_ordered,
    inspection_date,
    date_billed,
    appraiser_id,
    assigned_to,
    reviewer_id,
    import_source,
    import_batch,
    notes,
    created_at,
    updated_at
  )
  select
    public.default_company_id(),
    'internal_operations',
    io.order_number,
    'completed',
    io.resolved_client_id,
    null,
    null,
    io.property_address,
    io.property_address,
    io.city,
    io.state,
    io.property_type,
    io.fee,
    io.fee,
    io.ordered_date,
    io.inspection_date,
    io.completed_date,
    io.appraiser_user_id,
    io.appraiser_user_id,
    io.reviewer_user_id,
    'Historical Import',
    '2025_2026',
    concat('Historical import from ', io.source_file, ' row ', io.source_row, '. confidence=', coalesce(io.confidence, '')),
    now(),
    now()
  from insertable_orders io
  returning id, order_number
)
select
  'historical_orders_import' as check_name,
  (select count(*) from source_orders where order_number is not null) as planned_safe_orders,
  (select count(*) from resolved_orders where resolved_client_id is null) as unresolved_client_orders,
  (
    select count(*)
      from resolved_orders
     where resolved_client_id is not null
       and not public.current_app_user_can_attach_order_client(resolved_client_id)
  ) as non_attachable_client_orders,
  (select count(*) from insertable_orders) as insertable_orders_this_run,
  (select count(*) from inserted_orders) as inserted_orders,
  (
    select count(*)
      from source_orders so
     where exists (
       select 1
         from public.orders o
        where coalesce(o.company_id, public.default_company_id()) = public.default_company_id()
          and coalesce(o.order_number, '') = so.order_number
     )
  ) as available_or_existing_after_import;

commit;
