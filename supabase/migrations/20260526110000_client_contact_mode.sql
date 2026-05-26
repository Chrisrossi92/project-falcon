begin;

alter table public.clients
  add column if not exists contact_mode text not null default 'contacts';

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'clients_contact_mode_check'
       and conrelid = 'public.clients'::regclass
  ) then
    alter table public.clients
      add constraint clients_contact_mode_check
      check (contact_mode in ('contacts', 'no_specific_contact'));
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
  contact_mode text,
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
      coalesce(nullif(c.contact_mode, ''), 'contacts') as contact_mode,
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
    rc.contact_mode,
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
  contact_mode text,
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
      coalesce(nullif(c.contact_mode, ''), 'contacts') as contact_mode,
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
    tc.contact_mode,
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

drop function if exists public.rpc_client_management_create(jsonb);
create or replace function public.rpc_client_management_create(
  p_client jsonb
)
returns table (
  client_id bigint,
  client_name text,
  status text,
  category text,
  amc_id bigint,
  amc_name text,
  contact_mode text,
  notes text,
  contact_name_1 text,
  contact_email_1 text,
  contact_phone_1 text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_company_status text;
  v_name text := trim(coalesce(p_client->>'name', ''));
  v_status text := lower(trim(coalesce(p_client->>'status', 'active')));
  v_category text := lower(trim(coalesce(p_client->>'category', 'client')));
  v_contact_mode text := lower(trim(coalesce(p_client->>'contact_mode', 'contacts')));
  v_amc_id bigint := null;
  v_new_client_id bigint;
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

  if not public.current_app_user_has_permission('clients.create') then
    raise exception 'client_create_permission_required'
      using errcode = '42501';
  end if;

  if v_name = '' then
    raise exception 'client_name_required'
      using errcode = '22023';
  end if;

  if v_status not in ('active', 'inactive') then
    raise exception 'invalid_client_status'
      using errcode = '22023';
  end if;

  if v_category not in ('client', 'lender', 'amc') then
    raise exception 'invalid_client_category'
      using errcode = '22023';
  end if;

  if v_contact_mode not in ('contacts', 'no_specific_contact') then
    raise exception 'invalid_client_contact_mode'
      using errcode = '22023';
  end if;

  if v_category <> 'amc'
     and p_client ? 'amc_id'
     and nullif(trim(coalesce(p_client->>'amc_id', '')), '') is not null then
    if not trim(coalesce(p_client->>'amc_id', '')) ~ '^[0-9]+$' then
      raise exception 'invalid_amc'
        using errcode = '22023';
    end if;

    v_amc_id := (p_client->>'amc_id')::bigint;

    if not exists (
      select 1
        from public.clients a
       where a.id = v_amc_id
         and coalesce(a.company_id, public.default_company_id()) = v_company_id
         and lower(coalesce(nullif(a.status, ''), 'active')) = 'active'
         and coalesce(a.is_merged, false) = false
         and lower(coalesce(nullif(a.category, ''), nullif(a.client_type, ''), nullif(a.kind, ''), 'client')) = 'amc'
    ) then
      raise exception 'invalid_amc'
        using errcode = '22023';
    end if;
  end if;

  if exists (
    select 1
      from public.clients c
     where coalesce(c.company_id, public.default_company_id()) = v_company_id
       and lower(trim(coalesce(c.name, ''))) = lower(v_name)
       and lower(coalesce(nullif(c.status, ''), 'active')) = 'active'
       and coalesce(c.is_merged, false) = false
  ) then
    raise exception 'client_name_already_exists'
      using errcode = '23505';
  end if;

  insert into public.clients (
    name,
    status,
    category,
    amc_id,
    contact_mode,
    notes,
    contact_name_1,
    contact_email_1,
    contact_phone_1,
    created_at
  )
  values (
    v_name,
    v_status,
    v_category,
    case when v_category = 'amc' then null else v_amc_id end,
    v_contact_mode,
    nullif(p_client->>'notes', ''),
    nullif(p_client->>'contact_name_1', ''),
    nullif(p_client->>'contact_email_1', ''),
    nullif(p_client->>'contact_phone_1', ''),
    now()
  )
  returning id into v_new_client_id;

  return query
  select
    c.id as client_id,
    c.name as client_name,
    coalesce(nullif(c.status, ''), 'active') as status,
    lower(coalesce(nullif(c.category, ''), nullif(c.client_type, ''), nullif(c.kind, ''), 'client')) as category,
    c.amc_id,
    a.name as amc_name,
    coalesce(nullif(c.contact_mode, ''), 'contacts') as contact_mode,
    c.notes,
    c.contact_name_1,
    c.contact_email_1,
    c.contact_phone_1
  from public.clients c
  left join public.clients a
    on a.id = c.amc_id
   and coalesce(a.company_id, public.default_company_id()) = v_company_id
  where c.id = v_new_client_id
    and coalesce(c.company_id, public.default_company_id()) = v_company_id;
end;
$$;

drop function if exists public.rpc_client_management_update(bigint, jsonb);
create or replace function public.rpc_client_management_update(
  p_client_id bigint,
  p_patch jsonb
)
returns table (
  client_id bigint,
  client_name text,
  status text,
  category text,
  amc_id bigint,
  amc_name text,
  contact_mode text,
  notes text,
  contact_name_1 text,
  contact_email_1 text,
  contact_phone_1 text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_company_status text;
  v_client public.clients%rowtype;
  v_name text;
  v_status text;
  v_category text;
  v_contact_mode text;
  v_amc_id bigint;
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

  select *
    into v_client
    from public.clients c
   where c.id = p_client_id
     and coalesce(c.company_id, public.default_company_id()) = v_company_id
   for update;

  if not found then
    raise exception 'client_not_found'
      using errcode = 'P0002';
  end if;

  if not public.current_app_user_can_update_client_row(v_client.company_id, v_client.id) then
    raise exception 'client_update_permission_required'
      using errcode = '42501';
  end if;

  if coalesce(v_client.is_merged, false) then
    raise exception 'client_merged'
      using errcode = '22023';
  end if;

  v_name := case
    when p_patch ? 'name' then trim(coalesce(p_patch->>'name', ''))
    else v_client.name
  end;

  if v_name is null or trim(v_name) = '' then
    raise exception 'client_name_required'
      using errcode = '22023';
  end if;

  v_status := case
    when p_patch ? 'status' then lower(trim(coalesce(p_patch->>'status', '')))
    else lower(coalesce(nullif(v_client.status, ''), 'active'))
  end;

  if v_status not in ('active', 'inactive') then
    raise exception 'invalid_client_status'
      using errcode = '22023';
  end if;

  v_category := case
    when p_patch ? 'category' then lower(trim(coalesce(p_patch->>'category', '')))
    else lower(coalesce(nullif(v_client.category, ''), nullif(v_client.client_type, ''), nullif(v_client.kind, ''), 'client'))
  end;

  if v_category not in ('client', 'lender', 'amc') then
    raise exception 'invalid_client_category'
      using errcode = '22023';
  end if;

  v_contact_mode := case
    when p_patch ? 'contact_mode' then lower(trim(coalesce(p_patch->>'contact_mode', '')))
    else lower(coalesce(nullif(v_client.contact_mode, ''), 'contacts'))
  end;

  if v_contact_mode not in ('contacts', 'no_specific_contact') then
    raise exception 'invalid_client_contact_mode'
      using errcode = '22023';
  end if;

  v_amc_id := v_client.amc_id;

  if v_category = 'amc' then
    v_amc_id := null;
  elsif p_patch ? 'amc_id' then
    if nullif(trim(coalesce(p_patch->>'amc_id', '')), '') is null then
      v_amc_id := null;
    else
      if not trim(coalesce(p_patch->>'amc_id', '')) ~ '^[0-9]+$' then
        raise exception 'invalid_amc'
          using errcode = '22023';
      end if;

      v_amc_id := (p_patch->>'amc_id')::bigint;
    end if;
  end if;

  if v_amc_id is not null then
    if not exists (
      select 1
        from public.clients a
       where a.id = v_amc_id
         and a.id <> v_client.id
         and coalesce(a.company_id, public.default_company_id()) = v_company_id
         and lower(coalesce(nullif(a.status, ''), 'active')) = 'active'
         and coalesce(a.is_merged, false) = false
         and lower(coalesce(nullif(a.category, ''), nullif(a.client_type, ''), nullif(a.kind, ''), 'client')) = 'amc'
    ) then
      raise exception 'invalid_amc'
        using errcode = '22023';
    end if;
  end if;

  if lower(trim(coalesce(v_client.name, ''))) is distinct from lower(v_name)
     and exists (
       select 1
         from public.clients c
        where c.id <> v_client.id
          and coalesce(c.company_id, public.default_company_id()) = v_company_id
          and lower(trim(coalesce(c.name, ''))) = lower(v_name)
          and lower(coalesce(nullif(c.status, ''), 'active')) = 'active'
          and coalesce(c.is_merged, false) = false
     ) then
    raise exception 'client_name_already_exists'
      using errcode = '23505';
  end if;

  update public.clients c
     set name = v_name,
         status = v_status,
         category = v_category,
         amc_id = v_amc_id,
         contact_mode = v_contact_mode,
         notes = case when p_patch ? 'notes' then nullif(p_patch->>'notes', '') else c.notes end,
         contact_name_1 = case when p_patch ? 'contact_name_1' then nullif(p_patch->>'contact_name_1', '') else c.contact_name_1 end,
         contact_email_1 = case when p_patch ? 'contact_email_1' then nullif(p_patch->>'contact_email_1', '') else c.contact_email_1 end,
         contact_phone_1 = case when p_patch ? 'contact_phone_1' then nullif(p_patch->>'contact_phone_1', '') else c.contact_phone_1 end
   where c.id = v_client.id;

  return query
  select
    c.id as client_id,
    c.name as client_name,
    coalesce(nullif(c.status, ''), 'active') as status,
    lower(coalesce(nullif(c.category, ''), nullif(c.client_type, ''), nullif(c.kind, ''), 'client')) as category,
    c.amc_id,
    a.name as amc_name,
    coalesce(nullif(c.contact_mode, ''), 'contacts') as contact_mode,
    c.notes,
    c.contact_name_1,
    c.contact_email_1,
    c.contact_phone_1
  from public.clients c
  left join public.clients a
    on a.id = c.amc_id
   and coalesce(a.company_id, public.default_company_id()) = v_company_id
  where c.id = v_client.id
    and coalesce(c.company_id, public.default_company_id()) = v_company_id;
end;
$$;

revoke all privileges on function public.rpc_client_management_list(text, text, text) from public, anon;
revoke all privileges on function public.rpc_client_management_detail(bigint) from public, anon;
revoke all privileges on function public.rpc_client_management_create(jsonb) from public, anon;
revoke all privileges on function public.rpc_client_management_update(bigint, jsonb) from public, anon;

grant execute on function public.rpc_client_management_list(text, text, text) to authenticated, service_role;
grant execute on function public.rpc_client_management_detail(bigint) to authenticated, service_role;
grant execute on function public.rpc_client_management_create(jsonb) to authenticated, service_role;
grant execute on function public.rpc_client_management_update(bigint, jsonb) to authenticated, service_role;

comment on column public.clients.contact_mode is
  'Routine relationship contact mode. contacts means specific contacts may be recorded; no_specific_contact means portal or general intake only.';

comment on function public.rpc_client_management_detail(bigint) is
  'Returns a current-company client relationship detail row, including contact optionality and AMC/lender rollup metrics.';

commit;
