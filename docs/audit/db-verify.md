# DB Verification (Read-only)

Paste this in Supabase SQL to validate expected tables, views, functions, RLS, policies, and indexes.

```sql
-- FALCON MVP — DB VERIFICATION (read-only)
with
-- 1) tables
tbl(name, ok) as (
  values
    ('public.orders',           to_regclass('public.orders') is not null),
    ('public.activity_log',     to_regclass('public.activity_log') is not null),
    ('public.calendar_events',  to_regclass('public.calendar_events') is not null)
),
-- 2) views
vws(name, ok) as (
  values
    ('public.v_orders_list',                       to_regclass('public.v_orders_list') is not null),
    ('public.v_orders_list_with_last_activity',    to_regclass('public.v_orders_list_with_last_activity') is not null),
    ('public.v_admin_calendar',                    to_regclass('public.v_admin_calendar') is not null)
),
-- 3) functions (exist + EXECUTE for role 'authenticated' + SECURITY DEFINER)
fns(name, signature, ok) as (
  values
    ('rpc_log_status_change',    'public.rpc_log_status_change(uuid,text,text,text)',
       (to_regprocedure('public.rpc_log_status_change(uuid,text,text,text)') is not null)
       and has_function_privilege('authenticated','public.rpc_log_status_change(uuid,text,text,text)','EXECUTE')
       and coalesce((select p.prosecdef from pg_proc p where p.oid = to_regprocedure('public.rpc_log_status_change(uuid,text,text,text)')),false)
    ),
    ('rpc_log_note',             'public.rpc_log_note(uuid,text)',
       (to_regprocedure('public.rpc_log_note(uuid,text)') is not null)
       and has_function_privilege('authenticated','public.rpc_log_note(uuid,text)','EXECUTE')
       and coalesce((select p.prosecdef from pg_proc p where p.oid = to_regprocedure('public.rpc_log_note(uuid,text)')),false)
    ),
    ('rpc_create_calendar_event','public.rpc_create_calendar_event(text,text,timestamptz,timestamptz,uuid,uuid,text,text)',
       (to_regprocedure('public.rpc_create_calendar_event(text,text,timestamptz,timestamptz,uuid,uuid,text,text)') is not null)
       and has_function_privilege('authenticated','public.rpc_create_calendar_event(text,text,timestamptz,timestamptz,uuid,uuid,text,text)','EXECUTE')
       and coalesce((select p.prosecdef from pg_proc p where p.oid = to_regprocedure('public.rpc_create_calendar_event(text,text,timestamptz,timestamptz,uuid,uuid,text,text)')),false)
    ),
    ('rpc_update_order_status','public.rpc_update_order_status(uuid,text,text)',
       (to_regprocedure('public.rpc_update_order_status(uuid,text,text)') is not null)
       and has_function_privilege('authenticated','public.rpc_update_order_status(uuid,text,text)','EXECUTE')
       and coalesce((select p.prosecdef from pg_proc p where p.oid = to_regprocedure('public.rpc_update_order_status(uuid,text,text)')),false)
    ),
    ('rpc_assign_order','public.rpc_assign_order(uuid,uuid,text)',
       (to_regprocedure('public.rpc_assign_order(uuid,uuid,text)') is not null)
       and has_function_privilege('authenticated','public.rpc_assign_order(uuid,uuid,text)','EXECUTE')
       and coalesce((select p.prosecdef from pg_proc p where p.oid = to_regprocedure('public.rpc_assign_order(uuid,uuid,text)')),false)
    ),
    ('rpc_update_due_dates','public.rpc_update_due_dates(uuid,date,date)',
       (to_regprocedure('public.rpc_update_due_dates(uuid,date,date)') is not null)
       and has_function_privilege('authenticated','public.rpc_update_due_dates(uuid,date,date)','EXECUTE')
       and coalesce((select p.prosecdef from pg_proc p where p.oid = to_regprocedure('public.rpc_update_due_dates(uuid,date,date)')),false)
    )
),
-- 4) RLS enabled flags
rls(name, ok) as (
  select 'public.orders' as name,       c.relrowsecurity as ok
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='orders'
  union all
  select 'public.activity_log', c.relrowsecurity
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='activity_log'
  union all
  select 'public.calendar_events', c.relrowsecurity
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='calendar_events'
),
-- 5) policies present (any)
pol(table_name, ok, detail) as (
  select 'orders',             count(*)>0, array_to_string(array_agg(policyname||':'||cmd||':'||array_to_string(roles,',')),' | ')
  from pg_policies where schemaname='public' and tablename='orders'
  union all
  select 'activity_log',       count(*)>0, array_to_string(array_agg(policyname||':'||cmd||':'||array_to_string(roles,',')),' | ')
  from pg_policies where schemaname='public' and tablename='activity_log'
  union all
  select 'calendar_events',    count(*)>0, array_to_string(array_agg(policyname||':'||cmd||':'||array_to_string(roles,',')),' | ')
  from pg_policies where schemaname='public' and tablename='calendar_events'
),
-- 6) expected indexes on orders
-- 6) expected indexes on orders
idx_expect(name) as (
  select unnest(array[
    'orders_status_idx',
    'orders_created_at_idx',
    'orders_assigned_to_idx',
    'orders_appraiser_id_idx',
    'orders_client_id_idx',
    'orders_due_date_idx',
    'orders_review_due_date_idx',
    'orders_active_created_at_idx'
  ])
),
idx_found(indexname) as (
  select indexname
  from pg_indexes
  where schemaname='public' and tablename='orders'
),
idx(name, ok) as (
  select e.name, (f.indexname is not null) as ok
  from idx_expect e
  left join idx_found f on e.name = f.indexname
)
select * from (
  select 'table'   as section, name, ok, null::text as detail from tbl
  union all
  select 'view',          name, ok, null         from vws
  union all
  select 'function',      name, ok, signature    from fns
  union all
  select 'index',         name, ok, null         from idx
  union all
  select 'rls',           name, ok, null         from rls
  union all
  select 'policy',        table_name, ok, detail from pol
) z
order by section, name;
```````
:contentReference[oaicite:3]{index=3}

---

## `docs/audit/db-verify.md`
```md
# DB Verification (Read-only)

Paste this SQL in Supabase to validate expected tables, views, functions, RLS, policies, and indexes.

```sql
-- FALCON MVP — DB VERIFICATION (read-only)
-- Checks tables, views, RPCs, RLS, policies, and indexes
<full SQL block kept verbatim>

