begin;

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
  metrics as (
    select
      rc.id as metric_client_id,
      count(o.id)::integer as order_count,
      avg(coalesce(o.fee_amount, o.base_fee, o.appraiser_fee)) as avg_fee,
      max(o.created_at) as last_order_date
    from readable_clients rc
    left join public.orders o
      on o.client_id = rc.id
     and coalesce(o.company_id, public.default_company_id()) = v_company_id
     and public.current_app_user_can_read_order(o.id)
    group by rc.id
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
    m.order_count,
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
  last_order_date timestamptz
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
  metrics as (
    select
      tc.id as metric_client_id,
      count(o.id)::integer as order_count,
      avg(coalesce(o.fee_amount, o.base_fee, o.appraiser_fee)) as avg_fee,
      max(o.created_at) as last_order_date
    from target_client tc
    left join public.orders o
      on o.client_id = tc.id
     and coalesce(o.company_id, public.default_company_id()) = v_company_id
     and public.current_app_user_can_read_order(o.id)
    group by tc.id
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
    m.order_count,
    m.avg_fee,
    m.last_order_date
  from target_client tc
  left join metrics m
    on m.metric_client_id = tc.id
  left join public.clients amc
    on amc.id = tc.amc_id
   and coalesce(amc.company_id, public.default_company_id()) = v_company_id;
end;
$$;

create or replace function public.rpc_client_management_amc_options()
returns table (
  amc_id bigint,
  amc_name text
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
    or public.current_app_user_has_permission('clients.create')
    or public.current_app_user_has_permission('clients.update.all')
    or public.current_app_user_has_permission('clients.update.assigned')
    or public.current_app_user_has_permission('orders.create')
    or public.current_app_user_has_permission('orders.update.all')
  ) then
    raise exception 'client_management_amc_options_permission_required'
      using errcode = '42501';
  end if;

  return query
  select
    c.id as amc_id,
    c.name as amc_name
  from public.clients c
  where coalesce(c.company_id, public.default_company_id()) = v_company_id
    and lower(coalesce(nullif(c.status, ''), 'active')) = 'active'
    and coalesce(c.is_merged, false) = false
    and lower(coalesce(nullif(c.category, ''), nullif(c.client_type, ''), nullif(c.kind, ''), 'client')) = 'amc'
    and (
      public.current_app_user_has_permission('clients.read.all')
      or public.current_app_user_has_permission('clients.create')
      or public.current_app_user_has_permission('clients.update.all')
      or public.current_app_user_has_permission('orders.create')
      or public.current_app_user_has_permission('orders.update.all')
      or public.current_app_user_can_read_client_row(c.company_id, c.id)
    )
  order by c.name asc, c.id asc;
end;
$$;

revoke all privileges on function public.rpc_client_management_list(text, text, text) from public, anon;
revoke all privileges on function public.rpc_client_management_detail(bigint) from public, anon;
revoke all privileges on function public.rpc_client_management_amc_options() from public, anon;

grant execute on function public.rpc_client_management_list(text, text, text) to authenticated, service_role;
grant execute on function public.rpc_client_management_detail(bigint) to authenticated, service_role;
grant execute on function public.rpc_client_management_amc_options() to authenticated, service_role;

comment on function public.rpc_client_management_list(text, text, text) is
  'Phase 8C5H1A safe broad client management list projection. Returns current-company readable client card fields and aggregate readable-order metrics only.';

comment on function public.rpc_client_management_detail(bigint) is
  'Phase 8C5H1A safe broad client management detail projection. Returns allowlisted current-company readable client fields only.';

comment on function public.rpc_client_management_amc_options() is
  'Phase 8C5H1A safe broad client management AMC option projection. Returns active current-company non-merged AMC id/name pairs only.';

commit;
