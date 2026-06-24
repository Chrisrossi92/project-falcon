begin;

drop function if exists public.rpc_order_form_client_options();
drop function if exists public.rpc_order_form_client_name_search(text, integer);

create or replace function public.rpc_order_form_client_options(
  p_operations_scope text default null
)
returns table (
  client_id bigint,
  client_name text,
  category text,
  amc_id bigint,
  is_merged boolean,
  contact_name text,
  contact_email text,
  contact_phone text,
  operations_scope text
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
  v_operations_scope text := nullif(lower(trim(coalesce(p_operations_scope, ''))), '');
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

  if v_operations_scope is not null
     and v_operations_scope not in ('internal_operations', 'amc_operations') then
    raise exception 'invalid_order_form_client_operations_scope'
      using errcode = '22023';
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
    c.contact_phone_1 as contact_phone,
    nullif(c.operations_scope, '') as operations_scope
  from public.clients c
  where coalesce(c.company_id, public.default_company_id()) = v_company_id
    and lower(coalesce(nullif(c.status, ''), 'active')) = 'active'
    and coalesce(c.is_merged, false) = false
    and nullif(trim(c.name), '') is not null
    and (
      v_operations_scope is null
      or public.client_relationship_has_operations_scope(c.id, v_company_id, v_operations_scope)
    )
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
  p_limit integer default 5,
  p_operations_scope text default null
)
returns table (
  client_id bigint,
  client_name text,
  category text,
  status text,
  is_merged boolean,
  merged_into_id bigint,
  operations_scope text
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
  v_operations_scope text := nullif(lower(trim(coalesce(p_operations_scope, ''))), '');
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

  if v_operations_scope is not null
     and v_operations_scope not in ('internal_operations', 'amc_operations') then
    raise exception 'invalid_order_form_client_operations_scope'
      using errcode = '22023';
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
    c.merged_into_id,
    nullif(c.operations_scope, '') as operations_scope
  from public.clients c
  where coalesce(c.company_id, public.default_company_id()) = v_company_id
    and nullif(trim(c.name), '') is not null
    and c.name ilike ('%' || v_search || '%')
    and (
      v_operations_scope is null
      or public.client_relationship_has_operations_scope(c.id, v_company_id, v_operations_scope)
    )
  order by
    case when lower(trim(c.name)) = lower(v_search) then 0 else 1 end,
    c.name asc,
    c.id asc
  limit v_limit;
end;
$$;

revoke all privileges on function public.rpc_order_form_client_options(text) from public, anon;
revoke all privileges on function public.rpc_order_form_client_name_search(text, integer, text) from public, anon;

grant execute on function public.rpc_order_form_client_options(text) to authenticated, service_role;
grant execute on function public.rpc_order_form_client_name_search(text, integer, text) to authenticated, service_role;

comment on function public.rpc_order_form_client_options(text) is
  'Scope-aware current-company order form client/AMC picker projection. Null operations scope preserves compatibility; explicit internal_operations or amc_operations filters through client_relationship_has_operations_scope.';

comment on function public.rpc_order_form_client_name_search(text, integer, text) is
  'Scope-aware current-company order form duplicate-name search. Null operations scope preserves compatibility; explicit internal_operations or amc_operations filters through client_relationship_has_operations_scope.';

commit;
