begin;

create or replace function public.rpc_company_member_access_save(
  p_user_id uuid,
  p_role_ids uuid[],
  p_primary_role_id uuid default null,
  p_overrides jsonb default '[]'::jsonb,
  p_save_permission_overrides boolean default true,
  p_reason text default null,
  p_request_id text default null
)
returns table (
  user_id uuid,
  membership_id uuid,
  role_changed boolean,
  permission_overrides_changed boolean,
  active_owner_count integer,
  role_assignments jsonb,
  permission_overrides jsonb
)
language plpgsql
volatile
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_role_result record;
  v_override_result record;
  v_permission_overrides_changed boolean := false;
  v_permission_overrides jsonb := '[]'::jsonb;
begin
  select *
    into v_role_result
    from public.rpc_company_member_role_update(
      p_user_id,
      p_role_ids,
      p_primary_role_id,
      p_reason,
      p_request_id
    );

  if p_save_permission_overrides then
    select *
      into v_override_result
      from public.rpc_company_member_permission_overrides_save(
        p_user_id,
        coalesce(p_overrides, '[]'::jsonb),
        p_reason,
        case
          when nullif(p_request_id, '') is null then null
          else p_request_id || ':permission-overrides'
        end
      );
    v_permission_overrides_changed := coalesce(v_override_result.changed, false);
    v_permission_overrides := coalesce(v_override_result.overrides, '[]'::jsonb);
  else
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'permission_key', cmpo.permission_key,
          'effect', cmpo.effect
        )
        order by cmpo.permission_key
      ),
      '[]'::jsonb
    )
      into v_permission_overrides
      from public.company_member_permission_overrides cmpo
     where cmpo.membership_id = v_role_result.membership_id
       and cmpo.user_id = p_user_id;
  end if;

  user_id := p_user_id;
  membership_id := v_role_result.membership_id;
  role_changed := coalesce(v_role_result.changed, false);
  permission_overrides_changed := v_permission_overrides_changed;
  active_owner_count := v_role_result.active_owner_count;
  role_assignments := coalesce(v_role_result.role_assignments, '[]'::jsonb);
  permission_overrides := coalesce(v_permission_overrides, '[]'::jsonb);
  return next;
end;
$$;

create or replace function public.rpc_company_member_permission_overrides_save(
  p_user_id uuid,
  p_overrides jsonb,
  p_reason text default null,
  p_request_id text default null
)
returns table (
  user_id uuid,
  membership_id uuid,
  changed boolean,
  overrides jsonb
)
language plpgsql
volatile
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_actor_auth_id uuid := auth.uid();
  v_company_id uuid := public.current_company_id();
  v_membership_id uuid;
  v_previous jsonb;
  v_next jsonb;
  v_payload jsonb := coalesce(p_overrides, '[]'::jsonb);
  v_target_has_owner boolean;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if jsonb_typeof(v_payload) <> 'array' then
    raise exception 'permission_overrides_array_required'
      using errcode = '22023';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('users.manage_company_access') then
    raise exception 'users_manage_company_access_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('roles.manage_permissions') then
    raise exception 'roles_manage_permissions_required'
      using errcode = '42501';
  end if;

  select cm.id
    into v_membership_id
    from public.company_memberships cm
   where cm.company_id = v_company_id
     and cm.user_id = p_user_id
   for update;

  if v_membership_id is null then
    raise exception 'target_company_membership_required'
      using errcode = '42501';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(v_payload) item
     where not (item ? 'permission_key')
        or nullif(trim(item->>'permission_key'), '') is null
        or not (item ? 'effect')
        or lower(trim(item->>'effect')) not in ('grant', 'revoke')
  ) then
    raise exception 'invalid_permission_override_payload'
      using errcode = '22023';
  end if;

  if exists (
    select 1
      from (
        select trim(item->>'permission_key') as permission_key
          from jsonb_array_elements(v_payload) item
      ) parsed
     group by parsed.permission_key
    having count(*) > 1
  ) then
    raise exception 'duplicate_permission_override'
      using errcode = '22023';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(v_payload) item
      left join public.permissions p
        on p.key = trim(item->>'permission_key')
     where p.key is null
  ) then
    raise exception 'unknown_permission_key'
      using errcode = '22023';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(v_payload) item
     where not public.permission_override_is_v1_safe(trim(item->>'permission_key'))
  ) then
    raise exception 'permission_override_hidden_module_scope_required'
      using errcode = '42501';
  end if;

  v_target_has_owner := public.user_has_owner_role_in_company(p_user_id, v_company_id);

  if p_user_id = v_actor_user_id
     and v_target_has_owner
     and exists (
       select 1
         from jsonb_array_elements(v_payload) item
         join public.permissions p
           on p.key = trim(item->>'permission_key')
        where lower(trim(item->>'effect')) = 'revoke'
          and (
            p.is_owner_only
            or p.key in (
              'users.grant_owner',
              'users.revoke_owner',
              'roles.manage_owner_role',
              'company.transfer_ownership',
              'company.manage_security'
            )
          )
     ) then
    raise exception 'owner_self_protection_override_blocked'
      using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'permission_key', cmpo.permission_key,
        'effect', cmpo.effect
      )
      order by cmpo.permission_key
    ),
    '[]'::jsonb
  )
    into v_previous
    from public.company_member_permission_overrides cmpo
   where cmpo.company_id = v_company_id
     and cmpo.membership_id = v_membership_id
     and cmpo.user_id = p_user_id;

  delete from public.company_member_permission_overrides cmpo
   where cmpo.company_id = v_company_id
     and cmpo.membership_id = v_membership_id
     and cmpo.user_id = p_user_id
     and not exists (
       select 1
         from jsonb_array_elements(v_payload) item
        where trim(item->>'permission_key') = cmpo.permission_key
     );

  insert into public.company_member_permission_overrides (
    company_id,
    membership_id,
    user_id,
    permission_key,
    effect,
    created_by_user_id,
    reason,
    created_at,
    updated_at
  )
  select
    v_company_id,
    v_membership_id,
    p_user_id,
    trim(item->>'permission_key'),
    lower(trim(item->>'effect')),
    v_actor_user_id,
    nullif(p_reason, ''),
    now(),
    now()
  from jsonb_array_elements(v_payload) item
  on conflict (company_id, membership_id, permission_key) do update
    set effect = excluded.effect,
        created_by_user_id = excluded.created_by_user_id,
        reason = excluded.reason,
        updated_at = now();

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'permission_key', cmpo.permission_key,
        'effect', cmpo.effect
      )
      order by cmpo.permission_key
    ),
    '[]'::jsonb
  )
    into v_next
    from public.company_member_permission_overrides cmpo
   where cmpo.company_id = v_company_id
     and cmpo.membership_id = v_membership_id
     and cmpo.user_id = p_user_id;

  changed := v_previous is distinct from v_next;

  if changed then
    insert into public.company_audit_events (
      company_id,
      actor_user_id,
      actor_auth_id,
      actor_kind,
      event_type,
      target_type,
      target_id,
      metadata,
      idempotency_key
    )
    values (
      v_company_id,
      v_actor_user_id,
      v_actor_auth_id,
      'service_role',
      'company.member_permission_overrides_updated',
      'membership',
      v_membership_id,
      jsonb_strip_nulls(jsonb_build_object(
        'target_user_id', p_user_id,
        'previous_overrides', v_previous,
        'new_overrides', v_next,
        'reason', nullif(p_reason, ''),
        'request_id', nullif(p_request_id, '')
      )),
      nullif(p_request_id, '')
    );
  end if;

  user_id := p_user_id;
  membership_id := v_membership_id;
  overrides := v_next;
  return next;
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
   where cc.id = v_contact.id;

  return query
  select *
    from public.rpc_client_contact_list(v_contact.client_id) listed
   where listed.contact_id = v_contact.id;
end;
$$;

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
  select case
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

  if not (
    public.current_app_user_has_permission('clients.read.all')
    or public.current_app_user_has_permission('clients.read.assigned')
  ) then
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
      and public.client_relationship_has_operations_scope(c.id, v_company_id, v_operations_scope)
  ),
  metrics as (
    select
      rc.id as metric_client_id,
      count(o.id)::integer as order_count,
      avg(coalesce(o.fee_amount, o.base_fee, o.appraiser_fee)) as avg_fee,
      max(o.created_at) as last_order_date
    from readable_clients rc
    left join public.orders o
      on (o.client_id = rc.id or o.managing_amc_id = rc.id)
     and coalesce(o.company_id, public.default_company_id()) = v_company_id
     and (v_operations_scope is null or coalesce(o.operations_scope, 'internal_operations') = v_operations_scope)
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
  p_client_id bigint,
  p_operations_scope text default null
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
  v_operations_scope text := nullif(lower(trim(coalesce(p_operations_scope, ''))), '');
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

  if not (
    public.current_app_user_has_permission('clients.read.all')
    or public.current_app_user_has_permission('clients.read.assigned')
  ) then
    raise exception 'client_management_read_permission_required'
      using errcode = '42501';
  end if;

  if v_operations_scope is not null
     and v_operations_scope not in ('internal_operations', 'amc_operations') then
    raise exception 'invalid_client_operations_scope'
      using errcode = '22023';
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
      and public.client_relationship_has_operations_scope(c.id, v_company_id, v_operations_scope)
  ),
  metrics as (
    select
      tc.id as metric_client_id,
      count(o.id)::integer as order_count,
      avg(coalesce(o.fee_amount, o.base_fee, o.appraiser_fee)) as avg_fee,
      max(o.created_at) as last_order_date
    from target_client tc
    left join public.orders o
      on (o.client_id = tc.id or o.managing_amc_id = tc.id)
     and coalesce(o.company_id, public.default_company_id()) = v_company_id
     and (v_operations_scope is null or coalesce(o.operations_scope, 'internal_operations') = v_operations_scope)
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

revoke all privileges on function public.rpc_company_member_access_save(uuid, uuid[], uuid, jsonb, boolean, text, text)
  from public, anon;
revoke all privileges on function public.rpc_company_member_permission_overrides_save(uuid, jsonb, text, text)
  from public, anon;
revoke all privileges on function public.rpc_client_contact_set_default(bigint)
  from public, anon;
revoke all privileges on function public.client_relationship_has_operations_scope(bigint, uuid, text)
  from public, anon;
revoke all privileges on function public.rpc_client_management_list(text, text, text, text)
  from public, anon;
revoke all privileges on function public.rpc_client_management_detail(bigint, text)
  from public, anon;

grant execute on function public.rpc_company_member_access_save(uuid, uuid[], uuid, jsonb, boolean, text, text)
  to authenticated, service_role;
grant execute on function public.rpc_company_member_permission_overrides_save(uuid, jsonb, text, text)
  to authenticated, service_role;
grant execute on function public.rpc_client_contact_set_default(bigint)
  to authenticated, service_role;
grant execute on function public.client_relationship_has_operations_scope(bigint, uuid, text)
  to authenticated, service_role;
grant execute on function public.rpc_client_management_list(text, text, text, text)
  to authenticated, service_role;
grant execute on function public.rpc_client_management_detail(bigint, text)
  to authenticated, service_role;

comment on function public.rpc_company_member_access_save(uuid, uuid[], uuid, jsonb, boolean, text, text) is
  'Atomically saves one current-company member access edit. AMC-18 qualifies PL/pgSQL output-column conflicts so membership_id cannot collide with table columns during Permission Center saves.';

comment on function public.rpc_client_contact_set_default(bigint) is
  'Marks one active reusable client relationship contact as the default for its client using qualified current-company contact updates.';

comment on function public.client_relationship_has_operations_scope(bigint, uuid, text) is
  'AMC-18 helper for client relationship workspace separation. AMC scope requires related AMC orders; Internal scope excludes clients that are only related to AMC orders.';

comment on function public.rpc_client_management_list(text, text, text, text) is
  'Lists current-company client relationships scoped by optional operations_scope so Internal and AMC client relationship surfaces do not bleed into each other.';

comment on function public.rpc_client_management_detail(bigint, text) is
  'Returns one current-company client relationship scoped by optional operations_scope so wrong-workspace detail routes return no row.';

commit;
