begin;

alter table public.clients
  add column if not exists operations_scope text null;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'clients_operations_scope_valid'
       and conrelid = 'public.clients'::regclass
  ) then
    alter table public.clients
      add constraint clients_operations_scope_valid
      check (operations_scope is null or operations_scope in ('internal_operations', 'amc_operations'));
  end if;
end;
$$;

create index if not exists idx_clients_company_operations_scope
  on public.clients (company_id, operations_scope);

comment on column public.clients.operations_scope is
  'AMC-18 production pilot relationship scope. Null preserves legacy/order-derived behavior; explicit values keep zero-order client relationships in the workspace where staff created them.';

create or replace function public.client_relationship_has_operations_scope(
  p_client_id bigint,
  p_company_id uuid,
  p_operations_scope text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with target_client as (
    select nullif(c.operations_scope, '') as operations_scope
      from public.clients c
     where c.id = p_client_id
       and coalesce(c.company_id, public.default_company_id()) = p_company_id
  )
  select case
    when p_operations_scope is null then true
    when p_operations_scope not in ('internal_operations', 'amc_operations') then false
    when exists (
      select 1
        from target_client tc
       where tc.operations_scope = p_operations_scope
    ) then true
    when exists (
      select 1
        from target_client tc
       where tc.operations_scope in ('internal_operations', 'amc_operations')
         and tc.operations_scope <> p_operations_scope
    ) then false
    when p_operations_scope = 'internal_operations' then
      not exists (
        select 1
          from public.orders o
         where coalesce(o.company_id, public.default_company_id()) = p_company_id
           and (o.client_id = p_client_id or o.managing_amc_id = p_client_id)
           and coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'
      )
      or exists (
        select 1
          from public.orders o
         where coalesce(o.company_id, public.default_company_id()) = p_company_id
           and (o.client_id = p_client_id or o.managing_amc_id = p_client_id)
           and coalesce(o.operations_scope, 'internal_operations') = 'internal_operations'
      )
    when p_operations_scope = 'amc_operations' then
      exists (
        select 1
          from public.orders o
         where coalesce(o.company_id, public.default_company_id()) = p_company_id
           and (o.client_id = p_client_id or o.managing_amc_id = p_client_id)
           and coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'
      )
    else true
  end;
$$;

create or replace function public.company_role_matches_operations_scope(
  p_role_id uuid,
  p_operations_scope text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select nullif(lower(trim(coalesce(p_operations_scope, ''))), '') as operations_scope
  ),
  role_row as (
    select
      r.id,
      r.name,
      r.is_owner_role
    from public.roles r
    where r.id = p_role_id
  ),
  role_permission as (
    select rp.permission_key
    from public.role_permissions rp
    where rp.role_id = p_role_id
  )
  select case
    when (select operations_scope from normalized) is null then true
    when (select operations_scope from normalized) not in ('internal_operations', 'amc_operations') then false
    when exists (
      select 1
      from role_row r
      where r.is_owner_role = true
         or lower(r.name) = 'owner'
    ) then true
    when (select operations_scope from normalized) = 'amc_operations' then exists (
      select 1
      from role_permission rp
      where rp.permission_key like 'vendor\_%' escape '\'
         or rp.permission_key like 'vendor_workspace.%'
         or rp.permission_key like 'bid_requests.%'
         or rp.permission_key like 'order_company_assignments.%'
         or rp.permission_key in (
           'client_portal.order_requests.read',
           'client_portal.order_requests.manage',
           'orders.assignable_as_appraiser',
           'orders.assignable_as_reviewer'
         )
    )
    when (select operations_scope from normalized) = 'internal_operations' then exists (
      select 1
      from role_permission rp
      where rp.permission_key like 'orders.%'
         or rp.permission_key like 'assignments.%'
         or rp.permission_key like 'workflow.%'
         or rp.permission_key like 'activity.%'
         or rp.permission_key like 'communications.%'
         or rp.permission_key like 'documents.%'
         or rp.permission_key like 'billing.%'
         or rp.permission_key like 'clients.%'
         or rp.permission_key like 'users.%'
         or rp.permission_key like 'roles.%'
         or rp.permission_key like 'reports.%'
         or rp.permission_key like 'settings.%'
         or rp.permission_key like 'company.%'
         or rp.permission_key like 'navigation.%'
    )
    else false
  end;
$$;

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
  portal_url text,
  portal_notes text,
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
  v_operations_scope text := nullif(lower(trim(coalesce(p_client->>'operations_scope', ''))), '');
  v_amc_id bigint := null;
  v_new_client_id bigint;
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

  if v_operations_scope is not null
     and v_operations_scope not in ('internal_operations', 'amc_operations') then
    raise exception 'invalid_client_operations_scope'
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
         and public.client_relationship_has_operations_scope(a.id, v_company_id, v_operations_scope)
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
       and (
         v_operations_scope is null
         or c.operations_scope = v_operations_scope
       )
  ) then
    raise exception 'client_name_already_exists'
      using errcode = '23505';
  end if;

  insert into public.clients (
    company_id,
    operations_scope,
    name,
    status,
    category,
    amc_id,
    contact_mode,
    portal_url,
    portal_notes,
    notes,
    contact_name_1,
    contact_email_1,
    contact_phone_1,
    created_at
  )
  values (
    v_company_id,
    v_operations_scope,
    v_name,
    v_status,
    v_category,
    case when v_category = 'amc' then null else v_amc_id end,
    v_contact_mode,
    nullif(trim(coalesce(p_client->>'portal_url', '')), ''),
    nullif(p_client->>'portal_notes', ''),
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
    c.portal_url,
    c.portal_notes,
    c.notes,
    c.contact_name_1,
    c.contact_email_1,
    c.contact_phone_1
  from public.clients c
  left join public.clients a
    on a.id = c.amc_id
   and coalesce(a.company_id, public.default_company_id()) = v_company_id
  where c.id = v_new_client_id
    and coalesce(c.company_id, public.default_company_id()) = v_company_id
    and public.client_relationship_has_operations_scope(c.id, v_company_id, v_operations_scope);
end;
$$;

revoke all privileges on function public.client_relationship_has_operations_scope(bigint, uuid, text)
  from public, anon;
revoke all privileges on function public.company_role_matches_operations_scope(uuid, text)
  from public, anon;
revoke all privileges on function public.rpc_client_management_create(jsonb)
  from public, anon;

grant execute on function public.client_relationship_has_operations_scope(bigint, uuid, text)
  to authenticated, service_role;
grant execute on function public.company_role_matches_operations_scope(uuid, text)
  to authenticated, service_role;
grant execute on function public.rpc_client_management_create(jsonb)
  to authenticated, service_role;

comment on function public.rpc_client_management_create(jsonb) is
  'AMC-18 production pilot client creation. Persists optional operations_scope from the active workspace so zero-order client relationships remain visible only in the workspace where staff created them.';

commit;
