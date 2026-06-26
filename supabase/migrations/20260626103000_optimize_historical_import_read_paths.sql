begin;

create index if not exists idx_orders_company_scope_client_created
  on public.orders (company_id, operations_scope, client_id, created_at desc)
  where client_id is not null;

create index if not exists idx_orders_company_scope_managing_amc_created
  on public.orders (company_id, operations_scope, managing_amc_id, created_at desc)
  where managing_amc_id is not null;

create or replace function public.rpc_order_filter_clients()
returns table (
  client_id bigint,
  client_name text
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
  v_can_read_all_orders boolean := false;
  v_can_read_all_clients boolean := false;
  v_can_read_assigned_orders boolean := false;
  v_can_read_assigned_clients boolean := false;
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

  v_can_read_all_orders := public.current_app_user_has_permission('orders.read.all');
  v_can_read_all_clients := public.current_app_user_has_permission('clients.read.all');
  v_can_read_assigned_orders := public.current_app_user_has_permission('orders.read.assigned');
  v_can_read_assigned_clients := public.current_app_user_has_permission('clients.read.assigned');

  if not (
    v_can_read_all_orders
    or v_can_read_all_clients
    or v_can_read_assigned_orders
    or v_can_read_assigned_clients
  ) then
    raise exception 'order_filter_clients_permission_required'
      using errcode = '42501';
  end if;

  return query
  with readable_orders as (
    select o.client_id
      from public.orders o
     where o.client_id is not null
       and coalesce(o.company_id, public.default_company_id()) = v_company_id
       and (
         v_can_read_all_orders
         or v_can_read_all_clients
         or (
           (v_can_read_assigned_orders or v_can_read_assigned_clients)
           and (
             coalesce(o.appraiser_id, o.assigned_to) = v_actor_user_id
             or (
               o.reviewer_id = v_actor_user_id
               and lower(coalesce(o.status, '')) = any (
                 array['in_review', 'needs_revisions', 'review_cleared', 'completed']
               )
             )
           )
         )
       )
     group by o.client_id
  )
  select
    c.id as client_id,
    c.name as client_name
  from readable_orders ro
  join public.clients c
    on c.id = ro.client_id
   and coalesce(c.company_id, public.default_company_id()) = v_company_id
  where nullif(trim(c.name), '') is not null
  order by c.name asc, c.id asc;
end;
$$;

create or replace function public.rpc_client_management_list(
  p_search text default '',
  p_category text default 'all',
  p_sort text default 'orders_desc',
  p_operations_scope text default null
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
  merged_into_id bigint
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
  v_operations_scope text := nullif(lower(trim(coalesce(p_operations_scope, ''))), '');
  v_can_read_all_clients boolean := false;
  v_can_read_assigned_clients boolean := false;
  v_can_read_all_orders boolean := false;
  v_can_read_assigned_orders boolean := false;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null or not public.current_app_user_has_current_company() then
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

  v_can_read_all_clients := public.current_app_user_has_permission('clients.read.all');
  v_can_read_assigned_clients := public.current_app_user_has_permission('clients.read.assigned');
  v_can_read_all_orders := public.current_app_user_has_permission('orders.read.all');
  v_can_read_assigned_orders := public.current_app_user_has_permission('orders.read.assigned');

  if not (v_can_read_all_clients or v_can_read_assigned_clients) then
    raise exception 'client_management_read_permission_required'
      using errcode = '42501';
  end if;

  if v_operations_scope is not null
     and v_operations_scope not in ('internal_operations', 'amc_operations') then
    raise exception 'invalid_client_operations_scope'
      using errcode = '22023';
  end if;

  if v_sort not in ('orders_desc', 'name_asc', 'name_desc', 'last_order_desc') then
    raise exception 'invalid_client_management_sort'
      using errcode = '22023';
  end if;

  return query
  with readable_orders as (
    select
      o.id,
      o.client_id,
      o.managing_amc_id,
      o.status,
      coalesce(o.fee_amount, o.base_fee, o.appraiser_fee) as fee,
      o.created_at
    from public.orders o
    where coalesce(o.company_id, public.default_company_id()) = v_company_id
      and (v_operations_scope is null or coalesce(o.operations_scope, 'internal_operations') = v_operations_scope)
      and (
        v_can_read_all_orders
        or v_can_read_all_clients
        or (
          (v_can_read_assigned_orders or v_can_read_assigned_clients)
          and (
            coalesce(o.appraiser_id, o.assigned_to) = v_actor_user_id
            or (
              o.reviewer_id = v_actor_user_id
              and lower(coalesce(o.status, '')) = any (
                array['in_review', 'needs_revisions', 'review_cleared', 'completed']
              )
            )
          )
        )
      )
  ),
  direct_metrics as (
    select
      ro.client_id as metric_client_id,
      count(ro.id)::integer as order_count,
      sum(ro.fee) as fee_sum,
      count(ro.fee)::integer as fee_count,
      max(ro.created_at) as last_order_date
    from readable_orders ro
    where ro.client_id is not null
    group by ro.client_id
  ),
  managed_metrics as (
    select
      ro.managing_amc_id as metric_client_id,
      count(ro.id)::integer as order_count,
      sum(ro.fee) as fee_sum,
      count(ro.fee)::integer as fee_count,
      max(ro.created_at) as last_order_date
    from readable_orders ro
    where ro.managing_amc_id is not null
    group by ro.managing_amc_id
  ),
  metrics as (
    select
      combined.metric_client_id,
      sum(combined.order_count)::integer as order_count,
      case
        when sum(combined.fee_count) > 0 then sum(combined.fee_sum) / sum(combined.fee_count)
        else null::numeric
      end as avg_fee,
      max(combined.last_order_date) as last_order_date
    from (
      select
        dm.metric_client_id,
        dm.order_count,
        dm.fee_sum,
        dm.fee_count,
        dm.last_order_date
      from direct_metrics dm
      union all
      select
        mm.metric_client_id,
        mm.order_count,
        mm.fee_sum,
        mm.fee_count,
        mm.last_order_date
      from managed_metrics mm
    ) combined
    group by combined.metric_client_id
  ),
  readable_clients as (
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
    left join metrics m
      on m.metric_client_id = c.id
    where coalesce(c.company_id, public.default_company_id()) = v_company_id
      and (
        v_can_read_all_clients
        or m.metric_client_id is not null
      )
      and (v_search = '' or c.name ilike ('%' || v_search || '%'))
      and (
        v_operations_scope is null
        or nullif(c.operations_scope, '') = v_operations_scope
        or m.metric_client_id is not null
      )
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
    rc.merged_into_id
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

revoke all privileges on function public.rpc_order_filter_clients() from public, anon;
revoke all privileges on function public.rpc_client_management_list(text, text, text, text) from public, anon;

grant execute on function public.rpc_order_filter_clients() to authenticated, service_role;
grant execute on function public.rpc_client_management_list(text, text, text, text) to authenticated, service_role;

comment on function public.rpc_order_filter_clients() is
  'Read-optimized Orders client filter projection. Broad read permissions use current-company readable order clients without legacy current_is_admin dependency; assigned reads use set-based order predicates.';

comment on function public.rpc_client_management_list(text, text, text, text) is
  'Read-optimized client relationship list for historical-import-sized datasets. Computes readable current-company orders once and aggregates client metrics set-wise without per-row current_app_user_can_read_order calls in hot joins.';

commit;
