begin;

create or replace function public.current_app_user_can_use_order_form_client_options()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_app_user_has_current_company()
    and (
      public.current_app_user_has_permission('orders.create')
      or public.current_app_user_has_permission('orders.update.all')
      or public.current_app_user_has_permission('clients.create')
      or public.current_app_user_has_permission('clients.update.all')
      or public.current_app_user_has_permission('clients.read.all')
    );
$$;

grant execute on function public.current_app_user_can_use_order_form_client_options() to authenticated, service_role;

create or replace function public.rpc_order_form_client_options()
returns table (
  client_id bigint,
  client_name text,
  category text,
  amc_id bigint,
  is_merged boolean,
  contact_name text,
  contact_email text,
  contact_phone text
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

  if not public.current_app_user_can_use_order_form_client_options() then
    raise exception 'order_form_client_options_permission_required'
      using errcode = '42501';
  end if;

  return query
  select
    c.id as client_id,
    c.name as client_name,
    lower(coalesce(nullif(c.category, ''), nullif(c.client_type, ''), nullif(c.kind, ''), 'client')) as category,
    c.amc_id,
    coalesce(c.is_merged, false) as is_merged,
    c.contact_name_1 as contact_name,
    c.contact_email_1 as contact_email,
    c.contact_phone_1 as contact_phone
  from public.clients c
  where coalesce(c.company_id, public.default_company_id()) = v_company_id
    and lower(coalesce(nullif(c.status, ''), 'active')) = 'active'
    and coalesce(c.is_merged, false) = false
    and nullif(trim(c.name), '') is not null
  order by
    case lower(coalesce(nullif(c.category, ''), nullif(c.client_type, ''), nullif(c.kind, ''), 'client'))
      when 'amc' then 0
      else 1
    end,
    c.name asc,
    c.id asc;
end;
$$;

create or replace function public.rpc_order_form_client_name_search(
  p_search text,
  p_limit integer default 5
)
returns table (
  client_id bigint,
  client_name text,
  category text,
  status text,
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
  v_limit integer := least(greatest(coalesce(p_limit, 5), 1), 25);
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

  if not public.current_app_user_can_use_order_form_client_options() then
    raise exception 'order_form_client_options_permission_required'
      using errcode = '42501';
  end if;

  if length(v_search) < 2 then
    return;
  end if;

  return query
  select
    c.id as client_id,
    c.name as client_name,
    lower(coalesce(nullif(c.category, ''), nullif(c.client_type, ''), nullif(c.kind, ''), 'client')) as category,
    coalesce(nullif(c.status, ''), 'active') as status,
    coalesce(c.is_merged, false) as is_merged,
    c.merged_into_id
  from public.clients c
  where coalesce(c.company_id, public.default_company_id()) = v_company_id
    and nullif(trim(c.name), '') is not null
    and c.name ilike ('%' || v_search || '%')
  order by
    case when lower(trim(c.name)) = lower(v_search) then 0 else 1 end,
    c.name asc,
    c.id asc
  limit v_limit;
end;
$$;

revoke all privileges on function public.current_app_user_can_use_order_form_client_options() from public, anon;
revoke all privileges on function public.rpc_order_form_client_options() from public, anon;
revoke all privileges on function public.rpc_order_form_client_name_search(text, integer) from public, anon;

grant execute on function public.current_app_user_can_use_order_form_client_options() to authenticated, service_role;
grant execute on function public.rpc_order_form_client_options() to authenticated, service_role;
grant execute on function public.rpc_order_form_client_name_search(text, integer) to authenticated, service_role;

comment on function public.current_app_user_can_use_order_form_client_options() is
  'Phase 8C5G4C1 helper for order form client/AMC picker projections. Requires current-company membership and order/client write/read capability.';

comment on function public.rpc_order_form_client_options() is
  'Phase 8C5G4C1 safe current-company order form client/AMC picker projection. Returns active non-merged clients and AMCs with limited contact preview fields only.';

comment on function public.rpc_order_form_client_name_search(text, integer) is
  'Phase 8C5G4C1 safe current-company order form duplicate-name search. Returns limited client identity/status fields only and clamps result limits.';

commit;
