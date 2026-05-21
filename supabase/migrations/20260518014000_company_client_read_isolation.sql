begin;

create or replace function public.current_app_user_can_read_client_row(
  p_company_id uuid,
  p_client_id bigint
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_app_user_has_current_company()
    and coalesce(p_company_id, public.default_company_id()) = public.current_company_id()
    and (
      public.current_app_user_has_permission('clients.read.all')
      or (
        public.current_app_user_has_permission('clients.read.assigned')
        and exists (
          select 1
          from public.orders o
          where (o.client_id = p_client_id or o.managing_amc_id = p_client_id)
            and public.current_app_user_can_read_order(o.id)
        )
      )
    );
$$;

grant execute on function public.current_app_user_can_read_client_row(uuid, bigint) to authenticated;

comment on function public.current_app_user_can_read_client_row(uuid, bigint) is
  'Slice 7D client read predicate. Requires current-company membership, client company match, and either clients.read.all or clients.read.assigned through a readable source order.';

drop policy if exists "clients_admin_select" on public.clients;
drop policy if exists "clients_appraiser_select" on public.clients;
drop policy if exists "clients_related_read" on public.clients;
drop policy if exists "clients_select_admin" on public.clients;
drop policy if exists "clients_select_my_clients" on public.clients;
drop policy if exists "clients_select_scoped" on public.clients;

-- These historical ALL policies were intended as write/admin compatibility
-- rules, but ALL also granted SELECT and bypassed client read isolation.
-- Recreate them as command-specific write policies without changing their
-- write predicates.
drop policy if exists "clients_admin_write" on public.clients;
drop policy if exists "clients_owner_admin_write" on public.clients;
drop policy if exists "clients_write_admin" on public.clients;

create policy "clients_select_company_visibility"
on public.clients
for select
to authenticated
using (
  public.current_app_user_can_read_client_row(company_id, id)
);

create policy "clients_admin_insert"
on public.clients
for insert
with check (
  ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = any (array['admin'::text, 'reviewer'::text])
);

create policy "clients_admin_update"
on public.clients
for update
using (
  ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = any (array['admin'::text, 'reviewer'::text])
)
with check (
  ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = any (array['admin'::text, 'reviewer'::text])
);

create policy "clients_admin_delete"
on public.clients
for delete
using (
  ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = any (array['admin'::text, 'reviewer'::text])
);

create policy "clients_owner_admin_insert"
on public.clients
for insert
with check (public.current_is_admin());

create policy "clients_owner_admin_update"
on public.clients
for update
using (public.current_is_admin())
with check (public.current_is_admin());

create policy "clients_owner_admin_delete"
on public.clients
for delete
using (public.current_is_admin());

create policy "clients_write_admin_insert"
on public.clients
for insert
with check (public.current_is_admin());

create policy "clients_write_admin_update"
on public.clients
for update
using (public.current_is_admin())
with check (public.current_is_admin());

create policy "clients_write_admin_delete"
on public.clients
for delete
using (public.current_is_admin());

drop view if exists public.v_client_metrics;
drop view if exists public.v_client_kpis_appraiser;
drop view if exists public.v_client_kpis;

create or replace view public.v_client_kpis
with (security_invoker = true) as
select
  c.company_id,
  c.id as client_id,
  c.name as client_name,
  c.name,
  c.status,
  c.category,
  c.client_type,
  c.kind,
  c.contact_name_1 as primary_contact_name,
  c.contact_phone_1 as primary_contact_phone,
  c.contact_email_1 as primary_contact_email,
  count(o.id)::integer as total_orders,
  count(o.id)::integer as orders_count,
  count(o.id) filter (
    where lower(coalesce(o.status::text, '')) not in ('completed', 'complete', 'cancelled', 'canceled')
  )::integer as active_orders,
  count(o.id) filter (
    where lower(coalesce(o.status::text, '')) in ('completed', 'complete')
  )::integer as completed_orders,
  avg(coalesce(o.fee_amount, o.base_fee)) as avg_total_fee,
  max(o.created_at) as last_order_date
from public.clients c
left join public.orders o
  on o.client_id = c.id
 and coalesce(o.company_id, public.default_company_id()) = coalesce(c.company_id, public.default_company_id())
 and public.current_app_user_can_read_order(o.id)
where public.current_app_user_can_read_client_row(c.company_id, c.id)
group by
  c.company_id,
  c.id,
  c.name,
  c.status,
  c.category,
  c.client_type,
  c.kind,
  c.contact_name_1,
  c.contact_phone_1,
  c.contact_email_1;

create or replace view public.v_client_metrics
with (security_invoker = true) as
select *
from public.v_client_kpis;

create or replace view public.v_client_kpis_appraiser
with (security_invoker = true) as
select
  k.client_id,
  k.client_name,
  k.primary_contact_name,
  k.primary_contact_phone,
  k.total_orders::bigint as total_orders,
  k.avg_total_fee,
  k.last_order_date as last_order_at,
  k.company_id
from public.v_client_kpis k
where public.current_app_user_has_permission('clients.read.assigned')
  and public.current_app_user_can_read_client_row(k.company_id, k.client_id);

grant select on public.v_client_kpis to authenticated;
grant select on public.v_client_kpis to anon;
grant select on public.v_client_kpis_appraiser to authenticated;
grant select on public.v_client_kpis_appraiser to anon;
grant select on public.v_client_metrics to authenticated;
grant select on public.v_client_metrics to anon;

create or replace function public.get_clients_for_user()
returns table (
  client_id text,
  client_name text,
  primary_contact_name text,
  primary_contact_phone text,
  total_orders bigint,
  avg_total_fee numeric,
  last_order_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    k.client_id::text,
    k.client_name,
    k.primary_contact_name,
    k.primary_contact_phone,
    k.total_orders::bigint,
    k.avg_total_fee,
    k.last_order_date as last_order_at
  from public.v_client_kpis k
  where public.current_app_user_can_read_client_row(k.company_id, k.client_id)
  order by k.client_name;
$$;

grant execute on function public.get_clients_for_user() to authenticated;

drop function if exists public.client_name_taken(text, bigint);
create or replace function public.client_name_taken(
  p_name text,
  p_ignore_id bigint default null
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.clients c
     where coalesce(c.company_id, public.default_company_id()) = public.current_company_id()
       and public.current_app_user_can_read_client_row(c.company_id, c.id)
       and lower(trim(coalesce(c.name, ''))) = lower(trim(coalesce(p_name, '')))
       and (p_ignore_id is null or c.id <> p_ignore_id)
       and coalesce(c.is_merged, false) = false
  );
$$;

grant execute on function public.client_name_taken(text, bigint) to authenticated;

comment on view public.v_client_kpis is
  'Slice 7D company-aware client KPI projection. Rows require readable clients; order counts include readable source orders only.';

comment on view public.v_client_metrics is
  'Slice 7D compatibility alias for readable-client KPI metrics.';

comment on view public.v_client_kpis_appraiser is
  'Slice 7D compatibility projection for assigned-client readers.';

comment on function public.get_clients_for_user() is
  'Slice 7D compatibility RPC returning readable clients for the active company.';

comment on function public.client_name_taken(text, bigint) is
  'Slice 7D duplicate-name check scoped to current_company_id() and readable clients.';

commit;
