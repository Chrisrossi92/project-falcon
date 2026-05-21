begin;

create or replace function public.rpc_order_form_client_create(p_client jsonb)
returns table (
  client_id bigint,
  client_name text,
  category text,
  amc_id bigint,
  status text
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
  v_amc_id_text text := trim(coalesce(p_client->>'amc_id', ''));
  v_amc_id bigint;
  v_created public.clients%rowtype;
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
    public.current_app_user_has_permission('orders.create')
    or public.current_app_user_has_permission('clients.create')
  ) then
    raise exception 'order_form_client_create_permission_required'
      using errcode = '42501';
  end if;

  if v_name = '' then
    raise exception 'client_name_required'
      using errcode = '22023';
  end if;

  if v_amc_id_text <> '' then
    if v_amc_id_text !~ '^[0-9]+$' then
      raise exception 'invalid_amc'
        using errcode = '23503';
    end if;

    v_amc_id := v_amc_id_text::bigint;
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

  if v_amc_id is not null and not exists (
    select 1
      from public.clients amc
     where amc.id = v_amc_id
       and coalesce(amc.company_id, public.default_company_id()) = v_company_id
       and lower(coalesce(nullif(amc.status, ''), 'active')) = 'active'
       and coalesce(amc.is_merged, false) = false
       and lower(coalesce(nullif(amc.category, ''), nullif(amc.client_type, ''), nullif(amc.kind, ''), 'client')) = 'amc'
  ) then
    raise exception 'invalid_amc'
      using errcode = '23503';
  end if;

  insert into public.clients (
    name,
    status,
    category,
    amc_id,
    company_id
  )
  values (
    v_name,
    'active',
    'client',
    v_amc_id,
    v_company_id
  )
  returning * into v_created;

  return query
  select
    v_created.id as client_id,
    v_created.name as client_name,
    lower(coalesce(nullif(v_created.category, ''), 'client')) as category,
    v_created.amc_id,
    coalesce(nullif(v_created.status, ''), 'active') as status;
end;
$$;

revoke all privileges on function public.rpc_order_form_client_create(jsonb) from public, anon;
grant execute on function public.rpc_order_form_client_create(jsonb) to authenticated, service_role;

comment on function public.rpc_order_form_client_create(jsonb) is
  'Phase 8C5G4C3A narrow inline order-form client creation RPC. Creates active current-company client rows only, validates optional current-company active non-merged AMC attachment, and returns a safe created-client projection.';

commit;
