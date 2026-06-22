begin;

create or replace function public.rpc_owner_setup_mark_complete()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_app_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_company public.companies%rowtype;
  v_readiness jsonb;
  v_completed_sections jsonb := '{}'::jsonb;
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

  if not public.current_app_user_has_permission('company.setup.manage') then
    raise exception 'owner_setup_manage_permission_required'
      using errcode = '42501';
  end if;

  v_readiness := public.rpc_owner_setup_readiness();

  if coalesce((v_readiness->>'minimum_ready')::boolean, false) is not true then
    raise exception 'owner_setup_minimum_readiness_required'
      using
        errcode = '22023',
        detail = coalesce((v_readiness->'missing_required_sections')::text, '[]');
  end if;

  v_completed_sections := coalesce(v_readiness->'completed_sections', '{}'::jsonb);

  insert into public.company_setup_states (
    company_id,
    minimum_ready_at,
    setup_banner_dismissed_at,
    completed_sections,
    metadata
  )
  values (
    v_company_id,
    now(),
    now(),
    v_completed_sections,
    jsonb_build_object(
      'setup_version', 'owner_setup_v2',
      'status', 'completed',
      'completed_by', v_app_user_id
    )
  )
  on conflict (company_id) do update
    set minimum_ready_at = coalesce(public.company_setup_states.minimum_ready_at, now()),
        setup_banner_dismissed_at = coalesce(public.company_setup_states.setup_banner_dismissed_at, now()),
        completed_sections = coalesce(public.company_setup_states.completed_sections, '{}'::jsonb),
        metadata = coalesce(public.company_setup_states.metadata, '{}'::jsonb)
          || jsonb_build_object(
            'setup_version', coalesce(public.company_setup_states.metadata->>'setup_version', 'owner_setup_v2'),
            'status', 'completed',
            'completed_by', v_app_user_id
          ),
        updated_at = now();

  return jsonb_build_object(
    'setup_state', public.rpc_owner_setup_state_get(),
    'readiness', public.rpc_owner_setup_readiness(),
    'source', jsonb_build_object(
      'rpc', 'rpc_owner_setup_mark_complete',
      'version', 'owner_setup_v2h'
    )
  );
end;
$$;

revoke all on function public.rpc_owner_setup_mark_complete() from public, anon;
grant execute on function public.rpc_owner_setup_mark_complete() to authenticated, service_role;

comment on function public.rpc_owner_setup_mark_complete() is
  'Owner Setup V2H guarded setup completion RPC. Requires company.setup.manage and minimum readiness from rpc_owner_setup_readiness(), then idempotently sets minimum_ready_at and setup_banner_dismissed_at without changing tutorial acknowledgements or dashboard behavior.';

commit;
