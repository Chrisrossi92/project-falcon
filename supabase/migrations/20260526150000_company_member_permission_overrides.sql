begin;

create extension if not exists "pgcrypto";

create table if not exists public.company_member_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  membership_id uuid not null references public.company_memberships(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  effect text not null,
  created_by_user_id uuid null references public.users(id) on delete set null,
  reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_member_permission_overrides_effect_check
    check (effect in ('grant', 'revoke'))
);

create unique index if not exists company_member_permission_overrides_company_member_permission_unique
  on public.company_member_permission_overrides (company_id, membership_id, permission_key);

create index if not exists idx_company_member_permission_overrides_user_company
  on public.company_member_permission_overrides (user_id, company_id);

create or replace function public.tg_company_member_permission_overrides_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;

drop trigger if exists trg_company_member_permission_overrides_touch_updated_at
  on public.company_member_permission_overrides;
create trigger trg_company_member_permission_overrides_touch_updated_at
before update on public.company_member_permission_overrides
for each row execute function public.tg_company_member_permission_overrides_touch_updated_at();

alter table public.company_member_permission_overrides enable row level security;

revoke all privileges on public.company_member_permission_overrides from public, anon, authenticated;
grant all privileges on public.company_member_permission_overrides to service_role;

create or replace function public.permission_override_is_v1_safe(p_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.permissions p
     where p.key = p_permission_key
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

create or replace function public.current_app_user_permission_keys_for_company(p_company_id uuid)
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  with ctx as (
    select
      public.current_app_user_id() as user_id,
      p_company_id as company_id,
      public.default_company_id() as default_company_id
  ),
  membership as (
    select cm.id as membership_id
      from ctx
      join public.company_memberships cm
        on cm.user_id = ctx.user_id
       and cm.company_id = ctx.company_id
       and cm.status = 'active'
     where ctx.user_id is not null
       and ctx.company_id is not null
       and public.current_app_user_has_company(ctx.company_id)
  ),
  assigned_roles as (
    select r.id, r.name, r.is_owner_role
      from ctx
      join membership on true
      join public.user_role_assignments ura
        on ura.user_id = ctx.user_id
       and ura.company_id = ctx.company_id
       and ura.status = 'active'
       and (ura.expires_at is null or ura.expires_at > now())
      join public.roles r
        on r.id = ura.role_id
  ),
  legacy_roles as (
    select distinct lower(trim(ur.role)) as role_name
      from ctx
      join membership on true
      left join public.users u
        on u.id = ctx.user_id
      join public.user_roles ur
        on ur.user_id = ctx.user_id
        or ur.user_id = u.auth_id
     where ctx.company_id = ctx.default_company_id
       and ur.role is not null
  ),
  owner_permissions as (
    select p.key
      from public.permissions p
     where exists (
       select 1
         from assigned_roles ar
        where ar.is_owner_role
           or lower(ar.name) = 'owner'
     )
        or exists (
       select 1
         from legacy_roles lr
        where lr.role_name = 'owner'
     )
  ),
  assigned_role_permissions as (
    select rp.permission_key as key
      from assigned_roles ar
      join public.role_permissions rp
        on rp.role_id = ar.id
  ),
  legacy_template_role_permissions as (
    select rp.permission_key as key
      from legacy_roles lr
      join public.roles r
        on r.company_id is null
       and lower(r.name) = lr.role_name
      join public.role_permissions rp
        on rp.role_id = r.id
  ),
  role_derived_permissions as (
    select key from owner_permissions
    union
    select key from assigned_role_permissions
    union
    select key from legacy_template_role_permissions
  ),
  explicit_grants as (
    select cmpo.permission_key as key
      from ctx
      join membership m on true
      join public.company_member_permission_overrides cmpo
        on cmpo.company_id = ctx.company_id
       and cmpo.membership_id = m.membership_id
       and cmpo.user_id = ctx.user_id
       and cmpo.effect = 'grant'
  ),
  explicit_revokes as (
    select cmpo.permission_key as key
      from ctx
      join membership m on true
      join public.company_member_permission_overrides cmpo
        on cmpo.company_id = ctx.company_id
       and cmpo.membership_id = m.membership_id
       and cmpo.user_id = ctx.user_id
       and cmpo.effect = 'revoke'
  )
  select distinct key
    from (
      select key from role_derived_permissions
      union
      select key from explicit_grants
    ) permissions
   where key is not null
     and not exists (
       select 1
         from explicit_revokes er
        where er.key = permissions.key
     )
   order by key;
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

revoke all privileges on function public.permission_override_is_v1_safe(text) from public, anon;
revoke all privileges on function public.rpc_company_member_permission_overrides(uuid) from public, anon;
revoke all privileges on function public.rpc_company_member_permission_overrides_save(uuid, jsonb, text, text) from public, anon;

grant execute on function public.current_app_user_permission_keys_for_company(uuid) to authenticated, service_role;
grant execute on function public.permission_override_is_v1_safe(text) to authenticated, service_role;
grant execute on function public.rpc_company_member_permission_overrides(uuid) to authenticated, service_role;
grant execute on function public.rpc_company_member_permission_overrides_save(uuid, jsonb, text, text) to authenticated, service_role;

comment on table public.company_member_permission_overrides is
  'Explicit per-company-member permission grants/revokes. Overrides adjust action authority only and do not enable hidden product/module domains.';

comment on function public.current_app_user_permission_keys_for_company(uuid) is
  'Company-aware effective permission resolver. Effective permissions are active role permissions plus explicit grants minus explicit revokes.';

comment on function public.rpc_company_member_permission_overrides(uuid) is
  'Reads explicit permission overrides for one current-company member. Returns safe human-readable permission metadata.';

comment on function public.rpc_company_member_permission_overrides_save(uuid, jsonb, text, text) is
  'Replaces explicit V1-safe permission overrides for one current-company member. Requires company-access and role-permission management authority and writes an audit event.';

commit;
