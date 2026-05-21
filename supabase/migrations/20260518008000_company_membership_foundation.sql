begin;

create extension if not exists "pgcrypto";

create table if not exists public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  user_id uuid not null,
  status text not null default 'active',
  membership_type text null,
  is_primary boolean not null default true,
  joined_at timestamptz null,
  invited_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'company_memberships_company_id_fkey'
       and conrelid = 'public.company_memberships'::regclass
  ) then
    alter table public.company_memberships
      add constraint company_memberships_company_id_fkey
      foreign key (company_id)
      references public.companies(id)
      on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'company_memberships_user_id_fkey'
       and conrelid = 'public.company_memberships'::regclass
  ) then
    alter table public.company_memberships
      add constraint company_memberships_user_id_fkey
      foreign key (user_id)
      references public.users(id)
      on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'company_memberships_invited_by_fkey'
       and conrelid = 'public.company_memberships'::regclass
  ) then
    alter table public.company_memberships
      add constraint company_memberships_invited_by_fkey
      foreign key (invited_by)
      references public.users(id)
      on delete set null
      not valid;
  end if;
end;
$$;

create unique index if not exists company_memberships_company_user_unique
  on public.company_memberships (company_id, user_id);

create index if not exists idx_company_memberships_user_company
  on public.company_memberships (user_id, company_id);

create index if not exists idx_company_memberships_company_status
  on public.company_memberships (company_id, status);

create or replace function public.tg_company_memberships_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;

drop trigger if exists trg_company_memberships_touch_updated_at on public.company_memberships;
create trigger trg_company_memberships_touch_updated_at
before update on public.company_memberships
for each row execute function public.tg_company_memberships_touch_updated_at();

insert into public.company_memberships (
  company_id,
  user_id,
  status,
  membership_type,
  is_primary,
  joined_at
)
select
  public.default_company_id(),
  u.id,
  'active',
  'default_company_backfill',
  true,
  now()
from public.users u
where u.id is not null
on conflict (company_id, user_id) do update
  set status = coalesce(public.company_memberships.status, excluded.status),
      is_primary = coalesce(public.company_memberships.is_primary, excluded.is_primary),
      joined_at = coalesce(public.company_memberships.joined_at, excluded.joined_at),
      updated_at = now();

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select public.default_company_id();
$$;

grant execute on function public.current_company_id() to authenticated;

create or replace function public.current_app_user_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select cm.company_id
    from public.company_memberships cm
   where cm.user_id = public.current_app_user_id()
     and cm.status = 'active'
   order by cm.is_primary desc, cm.joined_at nulls last, cm.created_at;
$$;

grant execute on function public.current_app_user_company_ids() to authenticated;

create or replace function public.current_app_user_has_company(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.company_memberships cm
     where cm.user_id = public.current_app_user_id()
       and cm.company_id = p_company_id
       and cm.status = 'active'
  );
$$;

grant execute on function public.current_app_user_has_company(uuid) to authenticated;

comment on table public.company_memberships is
  'Additive membership foundation. Compatibility phase only: membership is not yet enforced by RLS or permission resolution.';

comment on column public.company_memberships.company_id is
  'Company the app user belongs to. Existing users are backfilled to falcon_default during default-company mode.';

comment on column public.company_memberships.user_id is
  'Canonical app user id from public.users.id, not auth.users.id.';

comment on column public.company_memberships.is_primary is
  'Default-company compatibility marker. Future org switching should use explicit active-company context verified against membership.';

comment on function public.current_company_id() is
  'Compatibility helper. Returns falcon_default until active-company/org-switching context exists.';

comment on function public.current_app_user_company_ids() is
  'Returns active company memberships for the current app user. Not yet used for RLS enforcement.';

comment on function public.current_app_user_has_company(uuid) is
  'Membership predicate for future company-aware authorization. Current RLS remains compatibility/global-mode.';

commit;
