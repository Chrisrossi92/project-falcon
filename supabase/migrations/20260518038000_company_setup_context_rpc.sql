begin;

insert into public.permissions (key, category, label, description, is_system, is_owner_only)
values (
  'company.setup.read',
  'company',
  'Read company setup context',
  'View safe company setup checklist status for the active company.',
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
select r.id, 'company.setup.read'
  from public.roles r
 where r.company_id is null
   and lower(r.name) in ('owner', 'admin')
on conflict (role_id, permission_key) do nothing;

create or replace function public.rpc_company_setup_context()
returns table (
  company_id uuid,
  company_slug text,
  company_name text,
  company_type text,
  company_status text,
  timezone text,
  locale text,
  active_company_claim_id uuid,
  active_company_context_valid boolean,
  profile_complete boolean,
  owner_invariant_ok boolean,
  active_owner_count integer,
  active_member_count integer,
  active_role_assignment_count integer,
  role_presets_ready boolean,
  owner_role_ready boolean,
  relationship_readiness jsonb,
  assignment_readiness jsonb,
  dashboard_readiness jsonb,
  audit_readiness jsonb,
  setup_complete boolean,
  setup_blockers jsonb,
  checklist jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_app_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_company public.companies%rowtype;
  v_claim_company_id uuid;
  v_has_current_membership boolean;
  v_has_setup_read boolean;
  v_profile_complete boolean;
  v_owner_count integer;
  v_member_count integer;
  v_role_assignment_count integer;
  v_owner_role_ready boolean;
  v_role_presets_ready boolean;
  v_relationship_readiness jsonb;
  v_assignment_readiness jsonb;
  v_dashboard_readiness jsonb;
  v_audit_readiness jsonb;
  v_owner_invariant_ok boolean;
  v_setup_complete boolean;
  v_blockers text[] := array[]::text[];
  v_checklist jsonb;
  v_active_relationship_count integer;
  v_can_relationship_read boolean;
  v_can_relationship_invite boolean;
  v_can_relationship_assign_work boolean;
  v_can_assignment_read_owner boolean;
  v_can_assignment_read_assigned boolean;
  v_can_assignment_offer boolean;
  v_can_assignment_respond boolean;
  v_order_dashboard_ready boolean;
  v_assignment_dashboard_ready boolean;
  v_has_bootstrap_audit boolean;
  v_has_active_company_switch_audit boolean;
begin
  if v_app_user_id is null then
    raise exception 'app_user_not_found'
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

  v_has_setup_read := public.current_app_user_has_permission('company.setup.read');
  if not v_has_setup_read then
    raise exception 'setup_read_permission_missing'
      using errcode = '42501';
  end if;

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
  )
  select case
    when value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then value::uuid
    else null::uuid
  end
    into v_claim_company_id
    from raw_claim;

  v_has_current_membership := public.current_app_user_has_company(v_company_id);
  v_profile_complete :=
    nullif(trim(v_company.slug), '') is not null
    and nullif(trim(v_company.name), '') is not null
    and nullif(trim(v_company.company_type), '') is not null
    and nullif(trim(v_company.timezone), '') is not null
    and nullif(trim(v_company.locale), '') is not null;

  select public.company_active_owner_count(v_company_id)
    into v_owner_count;

  select count(*)::integer
    into v_member_count
    from public.company_memberships cm
   where cm.company_id = v_company_id
     and cm.status = 'active';

  select count(*)::integer
    into v_role_assignment_count
    from public.user_role_assignments ura
   where ura.company_id = v_company_id
     and ura.status = 'active'
     and (ura.expires_at is null or ura.expires_at > now());

  select exists (
    select 1
      from public.roles r
      join public.role_permissions rp
        on rp.role_id = r.id
       and rp.permission_key = 'company.setup.read'
     where r.company_id is null
       and lower(r.name) = 'owner'
       and r.is_owner_role = true
  )
    into v_owner_role_ready;

  with expected_roles(role_name) as (
    values ('owner'), ('admin'), ('appraiser'), ('reviewer'), ('billing')
  )
  select not exists (
    select 1
      from expected_roles er
     where not exists (
       select 1
         from public.roles r
        where r.company_id is null
          and lower(r.name) = er.role_name
          and r.is_template = true
          and r.is_system = true
     )
  )
  and exists (
    select 1
      from public.roles r
      join public.role_permissions rp
        on rp.role_id = r.id
     where r.company_id is null
       and lower(r.name) = 'admin'
       and rp.permission_key = 'company.setup.read'
  )
    into v_role_presets_ready;

  v_can_relationship_read := public.current_app_user_has_permission('relationships.read');
  v_can_relationship_invite := public.current_app_user_has_permission('relationships.invite');
  v_can_relationship_assign_work := public.current_app_user_has_permission('relationships.assign_work');

  select count(*)::integer
    into v_active_relationship_count
    from public.company_relationships cr
   where cr.status = 'active'
     and v_company_id in (cr.source_company_id, cr.target_company_id);

  v_relationship_readiness := jsonb_build_object(
    'enabled', to_regclass('public.company_relationships') is not null,
    'can_read', v_can_relationship_read,
    'can_invite', v_can_relationship_invite,
    'can_assign_work', v_can_relationship_assign_work,
    'active_relationship_count', v_active_relationship_count
  );

  v_can_assignment_read_owner := public.current_app_user_has_permission('order_company_assignments.read_owner');
  v_can_assignment_read_assigned := public.current_app_user_has_permission('order_company_assignments.read_assigned');
  v_can_assignment_offer := public.current_app_user_has_permission('order_company_assignments.offer');
  v_can_assignment_respond := public.current_app_user_has_permission('order_company_assignments.respond');

  v_assignment_readiness := jsonb_build_object(
    'enabled', to_regclass('public.order_company_assignments') is not null,
    'can_read_owner_packets', v_can_assignment_read_owner,
    'can_read_assigned_packets', v_can_assignment_read_assigned,
    'can_offer', v_can_assignment_offer,
    'can_respond', v_can_assignment_respond,
    'requires_active_relationship', true
  );

  v_order_dashboard_ready :=
    public.current_app_user_has_permission('navigation.dashboard.view')
    and (
      public.current_app_user_has_permission('orders.read.all')
      or public.current_app_user_has_permission('orders.read.assigned')
    );

  v_assignment_dashboard_ready :=
    v_can_assignment_read_owner
    or v_can_assignment_read_assigned;

  v_dashboard_readiness := jsonb_build_object(
    'order_dashboard_ready', v_order_dashboard_ready,
    'assignment_dashboard_ready', v_assignment_dashboard_ready,
    'has_any_dashboard', v_order_dashboard_ready or v_assignment_dashboard_ready
  );

  select exists (
    select 1
      from public.company_audit_events cae
     where cae.company_id = v_company_id
       and cae.event_type = 'company.bootstrap.completed'
  )
    into v_has_bootstrap_audit;

  select exists (
    select 1
      from public.company_audit_events cae
     where cae.company_id = v_company_id
       and cae.event_type = 'company.active_company_changed'
  )
    into v_has_active_company_switch_audit;

  v_audit_readiness := jsonb_build_object(
    'enabled', to_regclass('public.company_audit_events') is not null,
    'has_bootstrap_audit', v_has_bootstrap_audit,
    'has_active_company_switch_audit', v_has_active_company_switch_audit
  );

  v_owner_invariant_ok := v_owner_count > 0;

  if not v_profile_complete then
    v_blockers := array_append(v_blockers, 'company_profile_incomplete');
  end if;

  if v_owner_count < 1 then
    v_blockers := array_append(v_blockers, 'active_owner_missing');
  end if;

  if not v_owner_role_ready then
    v_blockers := array_append(v_blockers, 'owner_role_template_missing');
  end if;

  if v_owner_count < 1 or not v_owner_role_ready then
    v_blockers := array_append(v_blockers, 'owner_role_assignment_missing');
  end if;

  if not v_role_presets_ready then
    v_blockers := array_append(v_blockers, 'role_presets_incomplete');
  end if;

  if not (v_order_dashboard_ready or v_assignment_dashboard_ready) then
    v_blockers := array_append(v_blockers, 'dashboard_unavailable');
  end if;

  v_setup_complete :=
    v_profile_complete
    and v_owner_invariant_ok
    and v_owner_role_ready
    and v_role_presets_ready
    and (v_order_dashboard_ready or v_assignment_dashboard_ready);

  v_checklist := jsonb_build_array(
    jsonb_build_object(
      'key', 'active_company_context',
      'label', 'Active company context',
      'required', true,
      'ready', v_has_current_membership,
      'status', case when v_has_current_membership then 'complete' else 'blocked' end,
      'blockers', case when v_has_current_membership then '[]'::jsonb else jsonb_build_array('current_company_membership_required') end
    ),
    jsonb_build_object(
      'key', 'company_profile',
      'label', 'Company profile',
      'required', true,
      'ready', v_profile_complete,
      'status', case when v_profile_complete then 'complete' else 'blocked' end,
      'blockers', case when v_profile_complete then '[]'::jsonb else jsonb_build_array('company_profile_incomplete') end
    ),
    jsonb_build_object(
      'key', 'owner_protection',
      'label', 'Owner protection',
      'required', true,
      'ready', v_owner_invariant_ok,
      'status', case when v_owner_invariant_ok then 'complete' else 'blocked' end,
      'blockers', case when v_owner_invariant_ok then '[]'::jsonb else jsonb_build_array('active_owner_missing') end
    ),
    jsonb_build_object(
      'key', 'team_foundation',
      'label', 'Team foundation',
      'required', true,
      'ready', v_member_count > 0,
      'status', case when v_member_count > 0 then 'complete' else 'blocked' end,
      'blockers', case when v_member_count > 0 then '[]'::jsonb else jsonb_build_array('current_company_membership_required') end
    ),
    jsonb_build_object(
      'key', 'role_presets',
      'label', 'Role presets',
      'required', true,
      'ready', v_role_presets_ready,
      'status', case when v_role_presets_ready then 'complete' else 'blocked' end,
      'blockers', case when v_role_presets_ready then '[]'::jsonb else jsonb_build_array('role_presets_incomplete') end
    ),
    jsonb_build_object(
      'key', 'relationship_readiness',
      'label', 'Relationship readiness',
      'required', false,
      'ready', (v_relationship_readiness ->> 'enabled')::boolean,
      'status', case when (v_relationship_readiness ->> 'enabled')::boolean then 'complete' else 'blocked' end,
      'blockers', '[]'::jsonb
    ),
    jsonb_build_object(
      'key', 'assignment_readiness',
      'label', 'Assignment readiness',
      'required', false,
      'ready', (v_assignment_readiness ->> 'enabled')::boolean,
      'status', case when (v_assignment_readiness ->> 'enabled')::boolean then 'complete' else 'blocked' end,
      'blockers', '[]'::jsonb
    ),
    jsonb_build_object(
      'key', 'dashboard_readiness',
      'label', 'Dashboard readiness',
      'required', true,
      'ready', v_order_dashboard_ready or v_assignment_dashboard_ready,
      'status', case when v_order_dashboard_ready or v_assignment_dashboard_ready then 'complete' else 'blocked' end,
      'blockers', case when v_order_dashboard_ready or v_assignment_dashboard_ready then '[]'::jsonb else jsonb_build_array('dashboard_unavailable') end
    ),
    jsonb_build_object(
      'key', 'audit_readiness',
      'label', 'Audit readiness',
      'required', true,
      'ready', (v_audit_readiness ->> 'enabled')::boolean,
      'status', case when (v_audit_readiness ->> 'enabled')::boolean then 'complete' else 'blocked' end,
      'blockers', '[]'::jsonb
    )
  );

  return query
  select
    v_company.id,
    v_company.slug,
    v_company.name,
    v_company.company_type,
    v_company.status,
    v_company.timezone,
    v_company.locale,
    v_claim_company_id,
    v_has_current_membership and v_company.status = 'active',
    v_profile_complete,
    v_owner_invariant_ok,
    v_owner_count,
    v_member_count,
    v_role_assignment_count,
    v_role_presets_ready,
    v_owner_role_ready,
    v_relationship_readiness,
    v_assignment_readiness,
    v_dashboard_readiness,
    v_audit_readiness,
    v_setup_complete,
    to_jsonb(v_blockers),
    v_checklist;
end;
$$;

revoke all privileges on function public.rpc_company_setup_context() from public, anon;
grant execute on function public.rpc_company_setup_context() to authenticated, service_role;

comment on function public.rpc_company_setup_context() is
  'Phase 8C5D safe active-company setup checklist context. Returns current-company aggregates and readiness booleans only; does not expose raw company membership, roles, permissions, operational orders, clients, assignments, relationship details, or audit rows.';

commit;
