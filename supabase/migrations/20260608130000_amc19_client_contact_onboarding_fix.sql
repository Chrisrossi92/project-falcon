begin;

create or replace function public.rpc_client_contact_create(
  p_client_id bigint,
  p_contact jsonb
)
returns table (
  contact_id bigint,
  company_id uuid,
  client_id bigint,
  name text,
  title text,
  email text,
  phone text,
  notes text,
  status text,
  is_default boolean,
  created_at timestamptz,
  updated_at timestamptz,
  created_by_user_id uuid
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_client_company_id uuid;
  v_name text := trim(coalesce(p_contact->>'name', ''));
  v_status text := lower(trim(coalesce(p_contact->>'status', 'active')));
  v_is_default boolean := coalesce((p_contact->>'is_default')::boolean, false);
  v_contact_id bigint;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null or not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  select coalesce(c.company_id, public.default_company_id())
    into v_client_company_id
    from public.clients c
   where c.id = p_client_id;

  if not found or v_client_company_id <> v_company_id then
    raise exception 'client_not_found'
      using errcode = 'P0002';
  end if;

  if not public.current_app_user_can_update_client_row(v_client_company_id, p_client_id) then
    raise exception 'client_contact_write_permission_required'
      using errcode = '42501';
  end if;

  if v_name = '' then
    raise exception 'client_contact_name_required'
      using errcode = '22023';
  end if;

  if v_status not in ('active', 'inactive') then
    raise exception 'invalid_client_contact_status'
      using errcode = '22023';
  end if;

  if v_is_default and v_status = 'active' then
    update public.client_contacts cc
       set is_default = false
     where cc.company_id = v_company_id
       and cc.client_id = p_client_id
       and cc.is_default is true;
  end if;

  insert into public.client_contacts (
    company_id,
    client_id,
    name,
    title,
    email,
    phone,
    notes,
    status,
    is_default,
    created_by_user_id
  )
  values (
    v_company_id,
    p_client_id,
    v_name,
    nullif(p_contact->>'title', ''),
    nullif(p_contact->>'email', ''),
    nullif(p_contact->>'phone', ''),
    nullif(p_contact->>'notes', ''),
    v_status,
    case when v_status = 'active' then v_is_default else false end,
    v_actor_user_id
  )
  returning id into v_contact_id;

  return query
  select *
    from public.rpc_client_contact_list(p_client_id) listed
   where listed.contact_id = v_contact_id;
end;
$$;

create or replace function public.rpc_client_contact_update(
  p_contact_id bigint,
  p_patch jsonb
)
returns table (
  contact_id bigint,
  company_id uuid,
  client_id bigint,
  name text,
  title text,
  email text,
  phone text,
  notes text,
  status text,
  is_default boolean,
  created_at timestamptz,
  updated_at timestamptz,
  created_by_user_id uuid
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_contact public.client_contacts%rowtype;
  v_name text;
  v_status text;
  v_is_default boolean;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null or not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  select *
    into v_contact
    from public.client_contacts cc
   where cc.id = p_contact_id
     and cc.company_id = v_company_id
   for update;

  if not found then
    raise exception 'client_contact_not_found'
      using errcode = 'P0002';
  end if;

  if not public.current_app_user_can_update_client_row(v_contact.company_id, v_contact.client_id) then
    raise exception 'client_contact_write_permission_required'
      using errcode = '42501';
  end if;

  v_name := case
    when p_patch ? 'name' then trim(coalesce(p_patch->>'name', ''))
    else v_contact.name
  end;

  if v_name = '' then
    raise exception 'client_contact_name_required'
      using errcode = '22023';
  end if;

  v_status := case
    when p_patch ? 'status' then lower(trim(coalesce(p_patch->>'status', '')))
    else v_contact.status
  end;

  if v_status not in ('active', 'inactive') then
    raise exception 'invalid_client_contact_status'
      using errcode = '22023';
  end if;

  v_is_default := case
    when p_patch ? 'is_default' then coalesce((p_patch->>'is_default')::boolean, false)
    else v_contact.is_default
  end;

  if v_status <> 'active' then
    v_is_default := false;
  end if;

  if v_is_default then
    update public.client_contacts cc
       set is_default = false
     where cc.company_id = v_contact.company_id
       and cc.client_id = v_contact.client_id
       and cc.id <> v_contact.id
       and cc.is_default is true;
  end if;

  update public.client_contacts cc
     set name = v_name,
         title = case when p_patch ? 'title' then nullif(p_patch->>'title', '') else cc.title end,
         email = case when p_patch ? 'email' then nullif(p_patch->>'email', '') else cc.email end,
         phone = case when p_patch ? 'phone' then nullif(p_patch->>'phone', '') else cc.phone end,
         notes = case when p_patch ? 'notes' then nullif(p_patch->>'notes', '') else cc.notes end,
         status = v_status,
         is_default = v_is_default
   where cc.id = v_contact.id
     and cc.company_id = v_contact.company_id;

  return query
  select *
    from public.rpc_client_contact_list(v_contact.client_id) listed
   where listed.contact_id = v_contact.id;
end;
$$;

create or replace function public.rpc_client_contact_set_default(
  p_contact_id bigint
)
returns table (
  contact_id bigint,
  company_id uuid,
  client_id bigint,
  name text,
  title text,
  email text,
  phone text,
  notes text,
  status text,
  is_default boolean,
  created_at timestamptz,
  updated_at timestamptz,
  created_by_user_id uuid
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_contact public.client_contacts%rowtype;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null or not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  select *
    into v_contact
    from public.client_contacts cc
   where cc.id = p_contact_id
     and cc.company_id = v_company_id
   for update;

  if not found then
    raise exception 'client_contact_not_found'
      using errcode = 'P0002';
  end if;

  if not public.current_app_user_can_update_client_row(v_contact.company_id, v_contact.client_id) then
    raise exception 'client_contact_write_permission_required'
      using errcode = '42501';
  end if;

  update public.client_contacts cc
     set is_default = false
   where cc.company_id = v_contact.company_id
     and cc.client_id = v_contact.client_id
     and cc.id <> v_contact.id
     and cc.is_default is true;

  update public.client_contacts cc
     set status = 'active',
         is_default = true
   where cc.id = v_contact.id
     and cc.company_id = v_contact.company_id;

  return query
  select *
    from public.rpc_client_contact_list(v_contact.client_id) listed
   where listed.contact_id = v_contact.id;
end;
$$;

revoke all privileges on function public.rpc_client_contact_create(bigint, jsonb) from public, anon;
revoke all privileges on function public.rpc_client_contact_update(bigint, jsonb) from public, anon;
revoke all privileges on function public.rpc_client_contact_set_default(bigint) from public, anon;

grant execute on function public.rpc_client_contact_create(bigint, jsonb) to authenticated, service_role;
grant execute on function public.rpc_client_contact_update(bigint, jsonb) to authenticated, service_role;
grant execute on function public.rpc_client_contact_set_default(bigint) to authenticated, service_role;

comment on function public.rpc_client_contact_create(bigint, jsonb) is
  'AMC-19 onboarding fix. Creates a scoped reusable client contact with qualified company/client references so minimal name/email contact setup can precede Client Portal invitation.';

comment on function public.rpc_client_contact_update(bigint, jsonb) is
  'AMC-19 onboarding fix. Updates a scoped reusable client contact with qualified company/client references and preserves default-contact behavior.';

comment on function public.rpc_client_contact_set_default(bigint) is
  'AMC-19 onboarding fix. Sets a scoped default reusable client contact through qualified current-company updates.';

commit;
