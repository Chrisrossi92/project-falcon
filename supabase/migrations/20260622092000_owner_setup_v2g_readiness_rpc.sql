begin;

create or replace function public.rpc_owner_setup_readiness()
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
  v_completed_sections jsonb := '{}'::jsonb;
  v_required_sections constant text[] := array[
    'company_profile',
    'owner_profile',
    'team_access'
  ];
  v_optional_sections constant text[] := array[
    'workflow_defaults',
    'notification_defaults',
    'order_numbering',
    'branding',
    'product_modes'
  ];
  v_missing_required_sections text[] := array[]::text[];
  v_section text;
  v_completed_required_sections integer;
  v_required_section_count integer := array_length(v_required_sections, 1);
  v_percent_complete integer;
  v_minimum_ready boolean;
  v_next_recommended_action text;
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

  if not (
    public.current_app_user_has_permission('company.setup.read')
    or public.current_app_user_has_permission('company.setup.manage')
  ) then
    raise exception 'owner_setup_readiness_permission_required'
      using errcode = '42501';
  end if;

  select s.*
    into v_state
    from public.company_setup_states s
   where s.company_id = v_company_id;

  if found then
    v_completed_sections := coalesce(v_state.completed_sections, '{}'::jsonb);
  end if;

  foreach v_section in array v_required_sections loop
    if coalesce((v_completed_sections #>> array[v_section, 'completed'])::boolean, false) is not true then
      v_missing_required_sections := array_append(v_missing_required_sections, v_section);
    end if;
  end loop;

  v_completed_required_sections := v_required_section_count
    - coalesce(array_length(v_missing_required_sections, 1), 0);
  v_minimum_ready := v_completed_required_sections = v_required_section_count;
  v_percent_complete := case
    when v_required_section_count = 0 then 0
    else round((v_completed_required_sections::numeric / v_required_section_count::numeric) * 100)::integer
  end;
  v_next_recommended_action := case
    when v_minimum_ready then 'Company setup is ready for launch review.'
    when v_missing_required_sections[1] = 'company_profile' then 'Next: Company Profile'
    when v_missing_required_sections[1] = 'owner_profile' then 'Next: Owner Profile'
    when v_missing_required_sections[1] = 'team_access' then 'Next: Team Access'
    else 'Review required company setup sections.'
  end;

  return jsonb_build_object(
    'minimum_ready', v_minimum_ready,
    'completed_required_sections', v_completed_required_sections,
    'required_sections', v_required_section_count,
    'percent_complete', v_percent_complete,
    'missing_required_sections', to_jsonb(v_missing_required_sections),
    'next_recommended_action', v_next_recommended_action,
    'completed_sections', v_completed_sections,
    'source', jsonb_build_object(
      'rpc', 'rpc_owner_setup_readiness',
      'version', 'owner_setup_v2g',
      'required_sections', to_jsonb(v_required_sections),
      'ignored_optional_sections', to_jsonb(v_optional_sections),
      'write_on_read', false
    )
  );
end;
$$;

revoke all on function public.rpc_owner_setup_readiness() from public, anon;
grant execute on function public.rpc_owner_setup_readiness() to authenticated, service_role;

comment on function public.rpc_owner_setup_readiness() is
  'Owner Setup V2G read-only readiness evaluator. Evaluates only required owner-facing setup sections from completed_sections, ignores optional/deferred setup sections, performs no writes, does not update timestamps, does not hide banners, and does not mutate tutorial acknowledgements or company setup state.';

commit;
