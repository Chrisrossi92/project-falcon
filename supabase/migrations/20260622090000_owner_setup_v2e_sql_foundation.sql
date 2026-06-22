begin;

insert into public.permissions (key, category, label, description, is_system, is_owner_only)
values (
  'company.setup.manage',
  'company',
  'Manage company setup',
  'Manage owner-facing company setup state and completion for the active company.',
  true,
  false
)
on conflict (key) do update
  set category = excluded.category,
      label = excluded.label,
      description = excluded.description,
      is_system = excluded.is_system,
      is_owner_only = excluded.is_owner_only,
      updated_at = now();

insert into public.role_permissions (role_id, permission_key)
select r.id, 'company.setup.manage'
  from public.roles r
 where r.company_id is null
   and lower(r.name) in ('owner', 'admin')
on conflict (role_id, permission_key) do nothing;

create table if not exists public.company_setup_states (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  minimum_ready_at timestamptz,
  setup_banner_dismissed_at timestamptz,
  completed_sections jsonb not null default '{}'::jsonb,
  tutorial_acknowledgements jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_setup_states_company_unique unique (company_id),
  constraint company_setup_states_completed_sections_object
    check (jsonb_typeof(completed_sections) = 'object'),
  constraint company_setup_states_tutorial_acknowledgements_object
    check (jsonb_typeof(tutorial_acknowledgements) = 'object'),
  constraint company_setup_states_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'company_setup_states_company_fkey'
       and conrelid = 'public.company_setup_states'::regclass
  ) then
    alter table public.company_setup_states
      add constraint company_setup_states_company_fkey
      foreign key (company_id)
      references public.companies(id)
      on delete cascade
      not valid;
  end if;
end;
$$;

create index if not exists idx_company_setup_states_company_updated
  on public.company_setup_states (company_id, updated_at desc);

alter table public.company_setup_states enable row level security;

revoke all privileges on table public.company_setup_states from public, anon, authenticated;
grant all privileges on table public.company_setup_states to service_role;

create or replace function public.tg_company_setup_states_touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_company_setup_states_touch_updated_at
  on public.company_setup_states;

create trigger trg_company_setup_states_touch_updated_at
before update on public.company_setup_states
for each row
execute function public.tg_company_setup_states_touch_updated_at();

revoke all privileges on function public.tg_company_setup_states_touch_updated_at()
  from public, anon, authenticated;
grant execute on function public.tg_company_setup_states_touch_updated_at()
  to service_role;

create or replace function public.rpc_owner_setup_state_get()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_app_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_company public.companies%rowtype;
  v_state public.company_setup_states%rowtype;
  v_can_read boolean;
begin
  if v_app_user_id is null then
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

  select c.*
    into v_company
    from public.companies c
   where c.id = v_company_id;

  if not found then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company.status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  v_can_read :=
    public.current_app_user_has_permission('company.setup.read')
    or public.current_app_user_has_permission('company.setup.manage');

  if not v_can_read then
    raise exception 'owner_setup_state_read_permission_required'
      using errcode = '42501';
  end if;

  select s.*
    into v_state
    from public.company_setup_states s
   where s.company_id = v_company_id;

  if not found then
    return jsonb_build_object(
      'company_id', v_company_id,
      'state_exists', false,
      'minimum_ready_at', null,
      'setup_banner_dismissed_at', null,
      'completed_sections', '{}'::jsonb,
      'tutorial_acknowledgements', '{}'::jsonb,
      'metadata', jsonb_build_object(
        'setup_version', 'owner_setup_v2',
        'status', 'not_started'
      ),
      'created_at', null,
      'updated_at', null,
      'banner_should_show', true,
      'source', jsonb_build_object(
        'rpc', 'rpc_owner_setup_state_get',
        'version', 'owner_setup_v2e',
        'write_on_read', false
      )
    );
  end if;

  return jsonb_build_object(
    'company_id', v_state.company_id,
    'state_exists', true,
    'minimum_ready_at', v_state.minimum_ready_at,
    'setup_banner_dismissed_at', v_state.setup_banner_dismissed_at,
    'completed_sections', v_state.completed_sections,
    'tutorial_acknowledgements', v_state.tutorial_acknowledgements,
    'metadata', v_state.metadata,
    'created_at', v_state.created_at,
    'updated_at', v_state.updated_at,
    'banner_should_show', v_state.setup_banner_dismissed_at is null,
    'source', jsonb_build_object(
      'rpc', 'rpc_owner_setup_state_get',
      'version', 'owner_setup_v2e',
      'write_on_read', false
    )
  );
end;
$$;

revoke all on function public.rpc_owner_setup_state_get() from public, anon;
grant execute on function public.rpc_owner_setup_state_get() to authenticated, service_role;

comment on table public.company_setup_states is
  'Owner Setup V2E company-scoped setup state storage. This table stores owner-facing setup completion and acknowledgement state only; it does not grant permissions, route access, workflow authority, product-mode authority, module access, assignments, numbering, notifications, or branding.';

comment on column public.company_setup_states.minimum_ready_at is
  'Future timestamp for when owner-facing minimum setup readiness is first persisted. Not authorization authority.';

comment on column public.company_setup_states.setup_banner_dismissed_at is
  'Future timestamp for hiding the dashboard setup banner after guarded setup completion. Not a standalone authorization or readiness signal.';

comment on column public.company_setup_states.completed_sections is
  'Owner-facing setup section completion state keyed by allowlisted setup section ids. Stores no raw diagnostic blocker keys.';

comment on column public.company_setup_states.tutorial_acknowledgements is
  'Reserved JSON shell for future tutorial acknowledgements until a separate user-level tutorial table is implemented.';

comment on column public.company_setup_states.metadata is
  'Safe setup-state metadata such as setup version/status. Must not store secrets, raw diagnostics, product-mode authority, broad settings, or workflow authority.';

comment on function public.rpc_owner_setup_state_get() is
  'Owner Setup V2E guarded read RPC. Returns owner-safe setup state for the active company or a default not-started state without writing on read. Does not expose raw diagnostics or mutate setup state.';

commit;
