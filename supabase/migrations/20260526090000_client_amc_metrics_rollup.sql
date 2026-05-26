begin;

drop view if exists public.v_client_metrics;
drop view if exists public.v_client_kpis_appraiser;
drop view if exists public.v_client_kpis;

create or replace view public.v_client_kpis as
with client_base as (
  select
    c.company_id,
    c.id,
    c.name,
    coalesce(nullif(c.status, ''), 'active') as status,
    lower(coalesce(nullif(c.category, ''), nullif(c.client_type, ''), nullif(c.kind, ''), 'client')) as category,
    c.client_type,
    c.kind,
    c.contact_name_1,
    c.contact_phone_1,
    c.contact_email_1
  from public.clients c
),
metric_orders as (
  select distinct
    cb.id as client_id,
    o.id as order_id,
    o.status,
    o.fee_amount,
    o.base_fee,
    o.created_at
  from client_base cb
  left join public.orders o
    on coalesce(o.company_id, public.default_company_id()) = cb.company_id
   and (
     (
       cb.category = 'amc'
       and (
         o.managing_amc_id = cb.id
         or (
           o.managing_amc_id is null
           and exists (
             select 1
               from public.clients linked
              where linked.id = o.client_id
                and linked.amc_id = cb.id
                and coalesce(linked.company_id, public.default_company_id()) = cb.company_id
           )
         )
       )
     )
     or (
       cb.category <> 'amc'
       and o.client_id = cb.id
     )
   )
)
select
  cb.company_id,
  cb.id as client_id,
  cb.name as client_name,
  cb.name,
  cb.status,
  cb.category,
  cb.client_type,
  cb.kind,
  cb.contact_name_1 as primary_contact_name,
  cb.contact_phone_1 as primary_contact_phone,
  cb.contact_email_1 as primary_contact_email,
  count(mo.order_id)::integer as total_orders,
  count(mo.order_id)::integer as orders_count,
  count(mo.order_id) filter (
    where lower(coalesce(mo.status::text, '')) not in ('completed', 'complete', 'cancelled', 'canceled', 'voided')
  )::integer as active_orders,
  count(mo.order_id) filter (
    where lower(coalesce(mo.status::text, '')) in ('completed', 'complete')
  )::integer as completed_orders,
  avg(coalesce(mo.fee_amount, mo.base_fee)) as avg_total_fee,
  max(mo.created_at) as last_order_date
from client_base cb
left join metric_orders mo
  on mo.client_id = cb.id
group by
  cb.company_id,
  cb.id,
  cb.name,
  cb.status,
  cb.category,
  cb.client_type,
  cb.kind,
  cb.contact_name_1,
  cb.contact_phone_1,
  cb.contact_email_1;

create or replace view public.v_client_metrics as
select *
from public.v_client_kpis;

create or replace view public.v_client_kpis_appraiser as
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
where exists (
  select 1
    from public.orders o
   where o.client_id = k.client_id
     and coalesce(o.appraiser_id, o.assigned_to) = public.current_app_user_id()
);

grant select on public.v_client_kpis to authenticated;
grant select on public.v_client_kpis to anon;
grant select on public.v_client_kpis_appraiser to authenticated;
grant select on public.v_client_kpis_appraiser to anon;
grant select on public.v_client_metrics to authenticated;
grant select on public.v_client_metrics to anon;

do $$
begin
  if current_setting('server_version_num')::int >= 150000 then
    execute 'alter view public.v_client_kpis set (security_invoker = true)';
    execute 'alter view public.v_client_kpis_appraiser set (security_invoker = true)';
    execute 'alter view public.v_client_metrics set (security_invoker = true)';
  end if;
end;
$$;

drop function if exists public.rpc_client_management_list(text, text, text);
create or replace function public.rpc_client_management_list(
  p_search text default '',
  p_category text default 'all',
  p_sort text default 'orders_desc'
)
returns table (
  client_id bigint,
  client_name text,
  status text,
  category text,
  amc_id bigint,
  amc_name text,
  contact_name text,
  contact_email text,
  contact_phone text,
  order_count integer,
  avg_fee numeric,
  last_order_date timestamptz,
  is_merged boolean,
  merged_into_id bigint,
  active_order_count integer,
  completed_order_count integer,
  direct_order_count integer,
  managed_order_count integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_company_status text;
  v_search text := trim(coalesce(p_search, ''));
  v_category text := lower(trim(coalesce(p_category, 'all')));
  v_sort text := lower(trim(coalesce(p_sort, 'orders_desc')));
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  select c.status
    into v_company_status
    from public.companies c
   where c.id = v_company_id;

  if not found then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  if not (
    public.current_app_user_has_permission('clients.read.all')
    or public.current_app_user_has_permission('clients.read.assigned')
  ) then
    raise exception 'client_management_read_permission_required'
      using errcode = '42501';
  end if;

  if v_sort not in ('orders_desc', 'name_asc', 'name_desc', 'last_order_desc') then
    raise exception 'invalid_client_management_sort'
      using errcode = '22023';
  end if;

  if v_category <> 'all'
     and v_category not in ('client', 'amc', 'lender', 'bank', 'private')
     and not exists (
       select 1
         from public.clients c
        where coalesce(c.company_id, public.default_company_id()) = v_company_id
          and lower(coalesce(nullif(c.category, ''), nullif(c.client_type, ''), nullif(c.kind, ''), 'client')) = v_category
     ) then
    raise exception 'invalid_client_management_category'
      using errcode = '22023';
  end if;

  return query
  with readable_clients as (
    select
      c.id,
      c.name,
      coalesce(nullif(c.status, ''), 'active') as client_status,
      lower(coalesce(nullif(c.category, ''), nullif(c.client_type, ''), nullif(c.kind, ''), 'client')) as client_category,
      c.amc_id,
      c.contact_name_1,
      c.contact_email_1,
      c.contact_phone_1,
      coalesce(c.is_merged, false) as client_is_merged,
      c.merged_into_id
    from public.clients c
    where coalesce(c.company_id, public.default_company_id()) = v_company_id
      and public.current_app_user_can_read_client_row(c.company_id, c.id)
      and (v_search = '' or c.name ilike ('%' || v_search || '%'))
  ),
  metric_orders as (
    select distinct
      rc.id as metric_client_id,
      o.id as order_id,
      o.status,
      coalesce(o.fee_amount, o.base_fee, o.appraiser_fee) as fee,
      o.created_at,
      (o.client_id = rc.id) as is_direct_order,
      (
        rc.client_category = 'amc'
        and (
          o.managing_amc_id = rc.id
          or (
            o.managing_amc_id is null
            and exists (
              select 1
                from public.clients linked
               where linked.id = o.client_id
                 and linked.amc_id = rc.id
                 and coalesce(linked.company_id, public.default_company_id()) = v_company_id
            )
          )
        )
      ) as is_managed_order
    from readable_clients rc
    left join public.orders o
      on coalesce(o.company_id, public.default_company_id()) = v_company_id
     and public.current_app_user_can_read_order(o.id)
     and (
       (
         rc.client_category = 'amc'
         and (
           o.managing_amc_id = rc.id
           or (
             o.managing_amc_id is null
             and exists (
               select 1
                 from public.clients linked
                where linked.id = o.client_id
                  and linked.amc_id = rc.id
                  and coalesce(linked.company_id, public.default_company_id()) = v_company_id
             )
           )
         )
       )
       or (
         rc.client_category <> 'amc'
         and o.client_id = rc.id
       )
     )
  ),
  metrics as (
    select
      mo.metric_client_id,
      count(mo.order_id)::integer as order_count,
      avg(mo.fee) as avg_fee,
      max(mo.created_at) as last_order_date,
      count(mo.order_id) filter (
        where lower(coalesce(mo.status::text, '')) not in ('completed', 'complete', 'cancelled', 'canceled', 'voided')
      )::integer as active_order_count,
      count(mo.order_id) filter (
        where lower(coalesce(mo.status::text, '')) in ('completed', 'complete')
      )::integer as completed_order_count,
      count(mo.order_id) filter (where mo.is_direct_order)::integer as direct_order_count,
      count(mo.order_id) filter (where mo.is_managed_order)::integer as managed_order_count
    from metric_orders mo
    group by mo.metric_client_id
  )
  select
    rc.id as client_id,
    rc.name as client_name,
    rc.client_status as status,
    rc.client_category as category,
    rc.amc_id,
    amc.name as amc_name,
    rc.contact_name_1 as contact_name,
    rc.contact_email_1 as contact_email,
    rc.contact_phone_1 as contact_phone,
    coalesce(m.order_count, 0) as order_count,
    m.avg_fee,
    m.last_order_date,
    rc.client_is_merged as is_merged,
    rc.merged_into_id,
    coalesce(m.active_order_count, 0) as active_order_count,
    coalesce(m.completed_order_count, 0) as completed_order_count,
    coalesce(m.direct_order_count, 0) as direct_order_count,
    coalesce(m.managed_order_count, 0) as managed_order_count
  from readable_clients rc
  left join metrics m
    on m.metric_client_id = rc.id
  left join public.clients amc
    on amc.id = rc.amc_id
   and coalesce(amc.company_id, public.default_company_id()) = v_company_id
  where v_category = 'all'
     or rc.client_category = v_category
  order by
    case when v_sort = 'orders_desc' then coalesce(m.order_count, 0) end desc,
    case when v_sort = 'last_order_desc' then m.last_order_date end desc nulls last,
    case when v_sort = 'name_asc' then rc.name end asc,
    case when v_sort = 'name_desc' then rc.name end desc,
    rc.name asc,
    rc.id asc;
end;
$$;

drop function if exists public.rpc_client_management_detail(bigint);
create or replace function public.rpc_client_management_detail(
  p_client_id bigint
)
returns table (
  client_id bigint,
  client_name text,
  status text,
  category text,
  amc_id bigint,
  amc_name text,
  notes text,
  contact_name_1 text,
  contact_email_1 text,
  contact_phone_1 text,
  contact_name_2 text,
  contact_email_2 text,
  contact_phone_2 text,
  is_merged boolean,
  merged_into_id bigint,
  order_count integer,
  avg_fee numeric,
  last_order_date timestamptz,
  active_order_count integer,
  completed_order_count integer,
  direct_order_count integer,
  managed_order_count integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_company_status text;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  select c.status
    into v_company_status
    from public.companies c
   where c.id = v_company_id;

  if not found then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  if not (
    public.current_app_user_has_permission('clients.read.all')
    or public.current_app_user_has_permission('clients.read.assigned')
  ) then
    raise exception 'client_management_read_permission_required'
      using errcode = '42501';
  end if;

  return query
  with target_client as (
    select
      c.id,
      c.name,
      coalesce(nullif(c.status, ''), 'active') as client_status,
      lower(coalesce(nullif(c.category, ''), nullif(c.client_type, ''), nullif(c.kind, ''), 'client')) as client_category,
      c.amc_id,
      c.notes,
      c.contact_name_1,
      c.contact_email_1,
      c.contact_phone_1,
      c.contact_name_2,
      c.contact_email_2,
      c.contact_phone_2,
      coalesce(c.is_merged, false) as client_is_merged,
      c.merged_into_id
    from public.clients c
    where c.id = p_client_id
      and coalesce(c.company_id, public.default_company_id()) = v_company_id
      and public.current_app_user_can_read_client_row(c.company_id, c.id)
  ),
  metric_orders as (
    select distinct
      tc.id as metric_client_id,
      o.id as order_id,
      o.status,
      coalesce(o.fee_amount, o.base_fee, o.appraiser_fee) as fee,
      o.created_at,
      (o.client_id = tc.id) as is_direct_order,
      (
        tc.client_category = 'amc'
        and (
          o.managing_amc_id = tc.id
          or (
            o.managing_amc_id is null
            and exists (
              select 1
                from public.clients linked
               where linked.id = o.client_id
                 and linked.amc_id = tc.id
                 and coalesce(linked.company_id, public.default_company_id()) = v_company_id
            )
          )
        )
      ) as is_managed_order
    from target_client tc
    left join public.orders o
      on coalesce(o.company_id, public.default_company_id()) = v_company_id
     and public.current_app_user_can_read_order(o.id)
     and (
       (
         tc.client_category = 'amc'
         and (
           o.managing_amc_id = tc.id
           or (
             o.managing_amc_id is null
             and exists (
               select 1
                 from public.clients linked
                where linked.id = o.client_id
                  and linked.amc_id = tc.id
                  and coalesce(linked.company_id, public.default_company_id()) = v_company_id
             )
           )
         )
       )
       or (
         tc.client_category <> 'amc'
         and o.client_id = tc.id
       )
     )
  ),
  metrics as (
    select
      mo.metric_client_id,
      count(mo.order_id)::integer as order_count,
      avg(mo.fee) as avg_fee,
      max(mo.created_at) as last_order_date,
      count(mo.order_id) filter (
        where lower(coalesce(mo.status::text, '')) not in ('completed', 'complete', 'cancelled', 'canceled', 'voided')
      )::integer as active_order_count,
      count(mo.order_id) filter (
        where lower(coalesce(mo.status::text, '')) in ('completed', 'complete')
      )::integer as completed_order_count,
      count(mo.order_id) filter (where mo.is_direct_order)::integer as direct_order_count,
      count(mo.order_id) filter (where mo.is_managed_order)::integer as managed_order_count
    from metric_orders mo
    group by mo.metric_client_id
  )
  select
    tc.id as client_id,
    tc.name as client_name,
    tc.client_status as status,
    tc.client_category as category,
    tc.amc_id,
    amc.name as amc_name,
    tc.notes,
    tc.contact_name_1,
    tc.contact_email_1,
    tc.contact_phone_1,
    tc.contact_name_2,
    tc.contact_email_2,
    tc.contact_phone_2,
    tc.client_is_merged as is_merged,
    tc.merged_into_id,
    coalesce(m.order_count, 0) as order_count,
    m.avg_fee,
    m.last_order_date,
    coalesce(m.active_order_count, 0) as active_order_count,
    coalesce(m.completed_order_count, 0) as completed_order_count,
    coalesce(m.direct_order_count, 0) as direct_order_count,
    coalesce(m.managed_order_count, 0) as managed_order_count
  from target_client tc
  left join metrics m
    on m.metric_client_id = tc.id
  left join public.clients amc
    on amc.id = tc.amc_id
   and coalesce(amc.company_id, public.default_company_id()) = v_company_id;
end;
$$;

revoke all privileges on function public.rpc_client_management_list(text, text, text) from public, anon;
revoke all privileges on function public.rpc_client_management_detail(bigint) from public, anon;

grant execute on function public.rpc_client_management_list(text, text, text) to authenticated, service_role;
grant execute on function public.rpc_client_management_detail(bigint) to authenticated, service_role;

comment on view public.v_client_kpis is
  'Company-aware client KPI projection. AMC category rows aggregate managed orders via orders.managing_amc_id, with clients.amc_id fallback for untagged orders; non-AMC rows keep direct client_id metrics.';

comment on view public.v_client_metrics is
  'Compatibility alias for company-aware client KPI metrics with AMC umbrella rollups.';

comment on function public.rpc_client_management_list(text, text, text) is
  'Safe broad client management list projection. Non-AMC rows use direct client_id metrics; AMC rows use managed/umbrella order metrics without double-counting.';

comment on function public.rpc_client_management_detail(bigint) is
  'Safe broad client management detail projection. Non-AMC rows use direct client_id metrics; AMC rows use managed/umbrella order metrics without double-counting.';

commit;
