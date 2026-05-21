begin;

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

create or replace function public.rpc_client_management_archive(
  p_client_id bigint,
  p_reason text default null,
  p_request_id text default null
)
returns table (
  client_id bigint,
  status text,
  is_archived boolean,
  changed boolean
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
  v_changed boolean;
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

  if not public.current_app_user_has_permission('clients.archive') then
    raise exception 'client_archive_permission_required'
      using errcode = '42501';
  end if;

  v_changed := lower(coalesce(nullif(v_client.status, ''), 'active')) <> 'inactive'
    or coalesce(v_client.is_archived, false) = false;

  if v_changed then
    update public.clients c
       set status = 'inactive',
           is_archived = true
     where c.id = v_client.id;
  end if;

  return query
  select
    c.id as client_id,
    coalesce(nullif(c.status, ''), 'active') as status,
    coalesce(c.is_archived, false) as is_archived,
    v_changed as changed
  from public.clients c
  where c.id = v_client.id
    and coalesce(c.company_id, public.default_company_id()) = v_company_id;
end;
$$;

revoke all privileges on function public.rpc_client_management_create(jsonb) from public, anon;
revoke all privileges on function public.rpc_client_management_update(bigint, jsonb) from public, anon;
revoke all privileges on function public.rpc_client_management_archive(bigint, text, text) from public, anon;

grant execute on function public.rpc_client_management_create(jsonb) to authenticated, service_role;
grant execute on function public.rpc_client_management_update(bigint, jsonb) to authenticated, service_role;
grant execute on function public.rpc_client_management_archive(bigint, text, text) to authenticated, service_role;

comment on function public.rpc_client_management_create(jsonb) is
  'Phase 8C5H2B safe broad client management create RPC. Inserts allowlisted current-company client fields only and returns a narrow projection.';

comment on function public.rpc_client_management_update(bigint, jsonb) is
  'Phase 8C5H2B safe broad client management update RPC. Updates allowlisted current-company client fields only and returns a narrow projection.';

comment on function public.rpc_client_management_archive(bigint, text, text) is
  'Phase 8C5H2B safe broad client management archive RPC. Marks current-company clients inactive/archived without hard delete.';

commit;
