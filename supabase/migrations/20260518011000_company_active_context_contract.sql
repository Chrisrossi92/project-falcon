begin;

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  with jwt_claims as (
    select coalesce(auth.jwt(), '{}'::jsonb) as claims
  ),
  raw_claim as (
    select coalesce(
      claims #>> '{app_metadata,active_company_id}',
      claims #>> '{app_metadata,current_company_id}',
      claims ->> 'active_company_id',
      claims ->> 'current_company_id'
    ) as value
    from jwt_claims
  ),
  claimed_company as (
    select case
      when value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then value::uuid
      else null::uuid
    end as company_id
    from raw_claim
  ),
  current_context as (
    select public.current_app_user_id() as user_id
  ),
  valid_claim as (
    select cc.company_id
    from claimed_company cc
    join current_context ctx on true
    where cc.company_id is not null
      and ctx.user_id is not null
      and exists (
        select 1
        from public.company_memberships cm
        where cm.user_id = ctx.user_id
          and cm.company_id = cc.company_id
          and cm.status = 'active'
      )
  )
  select coalesce(
    (select company_id from valid_claim limit 1),
    public.default_company_id()
  );
$$;

grant execute on function public.current_company_id() to authenticated;

create or replace function public.current_app_user_has_current_company()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_user_has_company(public.current_company_id());
$$;

grant execute on function public.current_app_user_has_current_company() to authenticated;

create or replace function public.rpc_current_company_context()
returns table (
  auth_user_id uuid,
  app_user_id uuid,
  active_company_claim_id uuid,
  current_company_id uuid,
  has_current_company_membership boolean,
  permission_count integer,
  role_assignments jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with jwt_claims as (
    select coalesce(auth.jwt(), '{}'::jsonb) as claims
  ),
  raw_claim as (
    select coalesce(
      claims #>> '{app_metadata,active_company_id}',
      claims #>> '{app_metadata,current_company_id}',
      claims ->> 'active_company_id',
      claims ->> 'current_company_id'
    ) as value
    from jwt_claims
  ),
  claimed_company as (
    select case
      when value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then value::uuid
      else null::uuid
    end as company_id
    from raw_claim
  ),
  ctx as (
    select
      auth.uid() as auth_user_id,
      public.current_app_user_id() as app_user_id,
      (select company_id from claimed_company limit 1) as active_company_claim_id,
      public.current_company_id() as current_company_id
  ),
  permissions as (
    select count(*)::integer as permission_count
    from public.current_app_user_permission_keys() p(permission_key)
  ),
  roles as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'assignment_id', ura.id,
          'role_id', r.id,
          'role_name', r.name,
          'status', ura.status,
          'is_primary', ura.is_primary,
          'expires_at', ura.expires_at
        )
        order by ura.is_primary desc, r.name
      ),
      '[]'::jsonb
    ) as role_assignments
    from ctx
    join public.user_role_assignments ura
      on ura.user_id = ctx.app_user_id
     and ura.company_id = ctx.current_company_id
    join public.roles r
      on r.id = ura.role_id
  )
  select
    ctx.auth_user_id,
    ctx.app_user_id,
    ctx.active_company_claim_id,
    ctx.current_company_id,
    public.current_app_user_has_company(ctx.current_company_id) as has_current_company_membership,
    permissions.permission_count,
    roles.role_assignments
  from ctx
  cross join permissions
  cross join roles;
$$;

grant execute on function public.rpc_current_company_context() to authenticated;

comment on function public.current_company_id() is
  'Slice 7A active-company contract. Uses a JWT/app_metadata active_company_id/current_company_id only when the current app user has active membership; otherwise falls back to falcon_default for compatibility mode. Future org switching should set the JWT claim, and future tenant enforcement should validate all sensitive writes server-side instead of trusting frontend company_id values.';

comment on function public.current_app_user_has_current_company() is
  'Returns whether the current app user has active membership in the resolved current_company_id(). Compatibility fallback still resolves to falcon_default until org switching is introduced.';

comment on function public.rpc_current_company_context() is
  'Diagnostic Slice 7A RPC for explaining active-company resolution, membership, permission count, and role assignments. This is observability only and does not enforce tenant isolation.';

commit;
