begin;

create or replace function public.rpc_owner_setup_section_complete(
  p_section_id text,
  p_completed boolean default true
)
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
  v_section_id text := lower(btrim(coalesce(p_section_id, '')));
  v_completed boolean := coalesce(p_completed, true);
  v_allowed_sections constant text[] := array[
    'company_profile',
    'owner_profile',
    'team_access',
    'workflow_defaults',
    'notification_defaults',
    'order_numbering',
    'branding',
    'product_modes'
  ];
  v_section_payload jsonb;
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

  if v_section_id <> any(v_allowed_sections) then
    raise exception 'owner_setup_unknown_section: %', v_section_id
      using errcode = '22023';
  end if;

  v_section_payload := jsonb_build_object(
    'completed', true,
    'completed_at', now(),
    'completed_by', v_app_user_id
  );

  insert into public.company_setup_states (
    company_id,
    completed_sections,
    metadata
  )
  values (
    v_company_id,
    case
      when v_completed then jsonb_build_object(v_section_id, v_section_payload)
      else '{}'::jsonb
    end,
    jsonb_build_object(
      'setup_version', 'owner_setup_v2',
      'status', 'in_progress'
    )
  )
  on conflict (company_id) do update
     set completed_sections = case
           when v_completed then
             coalesce(public.company_setup_states.completed_sections, '{}'::jsonb)
             || jsonb_build_object(v_section_id, v_section_payload)
           else
             coalesce(public.company_setup_states.completed_sections, '{}'::jsonb) - v_section_id
         end,
         metadata = coalesce(public.company_setup_states.metadata, '{}'::jsonb)
           || jsonb_build_object(
             'setup_version', coalesce(
               public.company_setup_states.metadata->>'setup_version',
               'owner_setup_v2'
             ),
             'status', coalesce(
               public.company_setup_states.metadata->>'status',
               'in_progress'
             )
           ),
         updated_at = now();

  return public.rpc_owner_setup_state_get();
end;
$$;

revoke all on function public.rpc_owner_setup_section_complete(text, boolean)
  from public, anon;
grant execute on function public.rpc_owner_setup_section_complete(text, boolean)
  to authenticated, service_role;

comment on function public.rpc_owner_setup_section_complete(text, boolean) is
  'Owner Setup V2F guarded section completion writer. Allows only known owner-facing setup section ids, writes completed_sections only, removes the section key when p_completed=false, returns rpc_owner_setup_state_get(), and does not hide banners, write tutorials, change permissions, change routes, alter workflow/product-mode authority, or modify company profile fields.';

commit;
