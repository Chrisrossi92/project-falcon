begin;

create extension if not exists "pgcrypto";

create table if not exists public.user_role_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  user_id uuid not null,
  role_id uuid not null,
  status text not null default 'active',
  is_primary boolean not null default false,
  assigned_by uuid null,
  assigned_at timestamptz not null default now(),
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'user_role_assignments_company_id_fkey'
       and conrelid = 'public.user_role_assignments'::regclass
  ) then
    alter table public.user_role_assignments
      add constraint user_role_assignments_company_id_fkey
      foreign key (company_id)
      references public.companies(id)
      on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'user_role_assignments_user_id_fkey'
       and conrelid = 'public.user_role_assignments'::regclass
  ) then
    alter table public.user_role_assignments
      add constraint user_role_assignments_user_id_fkey
      foreign key (user_id)
      references public.users(id)
      on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'user_role_assignments_role_id_fkey'
       and conrelid = 'public.user_role_assignments'::regclass
  ) then
    alter table public.user_role_assignments
      add constraint user_role_assignments_role_id_fkey
      foreign key (role_id)
      references public.roles(id)
      on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'user_role_assignments_assigned_by_fkey'
       and conrelid = 'public.user_role_assignments'::regclass
  ) then
    alter table public.user_role_assignments
      add constraint user_role_assignments_assigned_by_fkey
      foreign key (assigned_by)
      references public.users(id)
      on delete set null
      not valid;
  end if;
end;
$$;

create unique index if not exists user_role_assignments_company_user_role_unique
  on public.user_role_assignments (company_id, user_id, role_id);

create index if not exists idx_user_role_assignments_user_company
  on public.user_role_assignments (user_id, company_id);

create index if not exists idx_user_role_assignments_company_role
  on public.user_role_assignments (company_id, role_id);

create index if not exists idx_user_role_assignments_company_status
  on public.user_role_assignments (company_id, status);

create or replace function public.tg_user_role_assignments_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;

drop trigger if exists trg_user_role_assignments_touch_updated_at on public.user_role_assignments;
create trigger trg_user_role_assignments_touch_updated_at
before update on public.user_role_assignments
for each row execute function public.tg_user_role_assignments_touch_updated_at();

with resolved_legacy_roles as (
  select distinct
    coalesce(u_by_id.id, u_by_auth.id) as app_user_id,
    lower(trim(ur.role)) as role_name
  from public.user_roles ur
  left join public.users u_by_id
    on u_by_id.id = ur.user_id
  left join public.users u_by_auth
    on u_by_auth.auth_id = ur.user_id
  where ur.role is not null
),
matched_roles as (
  select
    public.default_company_id() as company_id,
    rlr.app_user_id as user_id,
    r.id as role_id,
    row_number() over (
      partition by rlr.app_user_id
      order by case rlr.role_name
        when 'owner' then 1
        when 'admin' then 2
        when 'reviewer' then 3
        when 'appraiser' then 4
        when 'billing' then 5
        else 99
      end
    ) = 1 as is_primary
  from resolved_legacy_roles rlr
  join public.roles r
    on r.company_id is null
   and lower(r.name) = rlr.role_name
  where rlr.app_user_id is not null
)
insert into public.user_role_assignments (
  company_id,
  user_id,
  role_id,
  status,
  is_primary,
  assigned_at
)
select
  company_id,
  user_id,
  role_id,
  'active',
  is_primary,
  now()
from matched_roles
on conflict (company_id, user_id, role_id) do update
  set status = coalesce(public.user_role_assignments.status, excluded.status),
      is_primary = public.user_role_assignments.is_primary or excluded.is_primary,
      assigned_at = coalesce(public.user_role_assignments.assigned_at, excluded.assigned_at),
      updated_at = now();

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
    select 1
      from ctx
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
  )
  select distinct key
    from (
      select key from owner_permissions
      union all
      select key from assigned_role_permissions
      union all
      select key from legacy_template_role_permissions
    ) permissions
   where key is not null
   order by key;
$$;

grant execute on function public.current_app_user_permission_keys_for_company(uuid) to authenticated;

create or replace function public.current_app_user_has_permission_for_company(
  p_company_id uuid,
  p_permission_key text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.current_app_user_permission_keys_for_company(p_company_id) k(permission_key)
     where k.permission_key = p_permission_key
  );
$$;

grant execute on function public.current_app_user_has_permission_for_company(uuid, text) to authenticated;

create or replace function public.current_app_user_has_any_permission_for_company(
  p_company_id uuid,
  p_permission_keys text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from unnest(coalesce(p_permission_keys, '{}'::text[])) requested(permission_key)
      join public.current_app_user_permission_keys_for_company(p_company_id) granted(permission_key)
        on granted.permission_key = requested.permission_key
  );
$$;

grant execute on function public.current_app_user_has_any_permission_for_company(uuid, text[]) to authenticated;

create or replace function public.current_app_user_has_all_permissions_for_company(
  p_company_id uuid,
  p_permission_keys text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
      from unnest(coalesce(p_permission_keys, '{}'::text[])) requested(permission_key)
     where not exists (
       select 1
         from public.current_app_user_permission_keys_for_company(p_company_id) granted(permission_key)
        where granted.permission_key = requested.permission_key
     )
  );
$$;

grant execute on function public.current_app_user_has_all_permissions_for_company(uuid, text[]) to authenticated;

comment on table public.user_role_assignments is
  'Additive company-scoped role assignment layer. Compatibility phase only: active authorization still uses legacy/global-mode helpers until wrapper migration.';

comment on column public.user_role_assignments.company_id is
  'Company context for this role assignment. Future permission/RLS enforcement should resolve effective permissions in this company context.';

comment on column public.user_role_assignments.user_id is
  'Canonical app user id from public.users.id, not auth.users.id.';

comment on column public.user_role_assignments.role_id is
  'Role bundle from public.roles. Template roles are used during default-company compatibility; future company roles can use roles.company_id.';

comment on column public.user_role_assignments.is_primary is
  'Compatibility/display hint only. A user may have multiple company-scoped role assignments.';

comment on function public.current_app_user_permission_keys_for_company(uuid) is
  'Additive company-aware permission resolver successor. Not yet used by active RLS or frontend authorization; current helpers remain compatibility/global-mode.';

comment on function public.current_app_user_has_permission_for_company(uuid, text) is
  'Additive company-aware permission predicate successor for future wrapper/RLS migration.';

comment on function public.current_app_user_has_any_permission_for_company(uuid, text[]) is
  'Additive company-aware any-permission predicate successor for future wrapper/RLS migration.';

comment on function public.current_app_user_has_all_permissions_for_company(uuid, text[]) is
  'Additive company-aware all-permissions predicate successor for future wrapper/RLS migration.';

commit;
