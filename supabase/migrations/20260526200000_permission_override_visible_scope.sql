begin;

create or replace function public.permission_override_is_v1_ui_visible(p_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.permissions p
     where p.key = trim(coalesce(p_permission_key, ''))
       and p.key not in (
         'orders.assignable_as_appraiser',
         'orders.assignable_as_reviewer'
       )
       and p.category in (
         'orders',
         'clients',
         'users',
         'roles',
         'workflow',
         'billing',
         'settings'
       )
  );
$$;

create or replace function public.rpc_company_member_permission_overrides(
  p_user_id uuid
)
returns table (
  override_id uuid,
  membership_id uuid,
  user_id uuid,
  permission_key text,
  permission_category text,
  permission_label text,
  permission_description text,
  effect text,
  reason text,
  created_by_user_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_membership_id uuid;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('roles.read') then
    raise exception 'roles_read_permission_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('users.read') then
    raise exception 'users_read_permission_required'
      using errcode = '42501';
  end if;

  select cm.id
    into v_membership_id
    from public.company_memberships cm
   where cm.company_id = v_company_id
     and cm.user_id = p_user_id;

  if v_membership_id is null then
    raise exception 'target_company_membership_required'
      using errcode = '42501';
  end if;

  return query
  select
    cmpo.id as override_id,
    cmpo.membership_id,
    cmpo.user_id,
    cmpo.permission_key,
    p.category as permission_category,
    p.label as permission_label,
    p.description as permission_description,
    cmpo.effect,
    cmpo.reason,
    cmpo.created_by_user_id,
    cmpo.created_at,
    cmpo.updated_at
  from public.company_member_permission_overrides cmpo
  join public.permissions p
    on p.key = cmpo.permission_key
  where cmpo.company_id = v_company_id
    and cmpo.membership_id = v_membership_id
    and cmpo.user_id = p_user_id
    and public.permission_override_is_v1_ui_visible(cmpo.permission_key)
  order by p.category, p.label, cmpo.permission_key;
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
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_actor_auth_id uuid := auth.uid();
  v_company_id uuid := public.current_company_id();
  v_membership_id uuid;
  v_previous jsonb;
  v_next jsonb;
  v_payload jsonb := coalesce(p_overrides, '[]'::jsonb);
  v_visible_payload jsonb := '[]'::jsonb;
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
  ) then
    raise exception 'invalid_permission_override_payload'
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
     where public.permission_override_is_v1_ui_visible(trim(item->>'permission_key'))
       and (
         not (item ? 'effect')
         or lower(trim(item->>'effect')) not in ('grant', 'revoke')
       )
  ) then
    raise exception 'invalid_permission_override_payload'
      using errcode = '22023';
  end if;

  if exists (
    select 1
      from (
        select trim(item->>'permission_key') as permission_key
          from jsonb_array_elements(v_payload) item
         where public.permission_override_is_v1_ui_visible(trim(item->>'permission_key'))
      ) parsed
     group by parsed.permission_key
    having count(*) > 1
  ) then
    raise exception 'duplicate_permission_override'
      using errcode = '22023';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'permission_key', parsed.permission_key,
        'effect', parsed.effect
      )
      order by parsed.permission_key
    ),
    '[]'::jsonb
  )
    into v_visible_payload
    from (
      select
        trim(item->>'permission_key') as permission_key,
        lower(trim(item->>'effect')) as effect
        from jsonb_array_elements(v_payload) item
       where public.permission_override_is_v1_ui_visible(trim(item->>'permission_key'))
    ) parsed;

  v_target_has_owner := public.user_has_owner_role_in_company(p_user_id, v_company_id);

  if p_user_id = v_actor_user_id
     and v_target_has_owner
     and exists (
       select 1
         from jsonb_array_elements(v_visible_payload) item
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
     and cmpo.user_id = p_user_id
     and public.permission_override_is_v1_ui_visible(cmpo.permission_key);

  delete from public.company_member_permission_overrides cmpo
   where cmpo.company_id = v_company_id
     and cmpo.membership_id = v_membership_id
     and cmpo.user_id = p_user_id
     and public.permission_override_is_v1_ui_visible(cmpo.permission_key)
     and not exists (
       select 1
         from jsonb_array_elements(v_visible_payload) item
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
  from jsonb_array_elements(v_visible_payload) item
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
     and cmpo.user_id = p_user_id
     and public.permission_override_is_v1_ui_visible(cmpo.permission_key);

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

revoke all privileges on function public.permission_override_is_v1_ui_visible(text) from public, anon;
revoke all privileges on function public.rpc_company_member_permission_overrides(uuid) from public, anon;
revoke all privileges on function public.rpc_company_member_permission_overrides_save(uuid, jsonb, text, text) from public, anon;

grant execute on function public.permission_override_is_v1_ui_visible(text) to authenticated, service_role;
grant execute on function public.rpc_company_member_permission_overrides(uuid) to authenticated, service_role;
grant execute on function public.rpc_company_member_permission_overrides_save(uuid, jsonb, text, text) to authenticated, service_role;

comment on function public.permission_override_is_v1_ui_visible(text) is
  'Returns true for permission override keys that the active V1 Users/Edit Access UI may read and mutate. Work eligibility and hidden enterprise surfaces remain preserved but outside the active override editing scope.';

comment on function public.rpc_company_member_permission_overrides(uuid) is
  'Reads active V1-visible explicit permission overrides for one current-company member. Hidden or deferred override categories are intentionally excluded from the active Users/Edit Access flow.';

comment on function public.rpc_company_member_permission_overrides_save(uuid, jsonb, text, text) is
  'Replaces only active V1-visible explicit permission overrides for one current-company member. Hidden/deferred override rows are preserved and ignored by this UI-scoped save path.';

commit;

