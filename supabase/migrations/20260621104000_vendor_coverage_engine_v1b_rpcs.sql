begin;

drop function if exists public.amc_vendor_coverage_normalized_state(text);
create or replace function public.amc_vendor_coverage_normalized_state(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when upper(public.amc_vendor_normalized_text(p_value)) ~ '^[A-Z]{2}$'
      then upper(public.amc_vendor_normalized_text(p_value))
    else null
  end;
$$;

drop function if exists public.amc_vendor_coverage_normalized_county(text);
create or replace function public.amc_vendor_coverage_normalized_county(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select public.amc_vendor_normalized_text(p_value);
$$;

drop function if exists public.amc_vendor_coverage_validate_jsonb_array(jsonb, text);
create or replace function public.amc_vendor_coverage_validate_jsonb_array(
  p_payload jsonb,
  p_error text
)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
begin
  if p_payload is null or p_payload = 'null'::jsonb then
    return '[]'::jsonb;
  end if;

  if jsonb_typeof(p_payload) <> 'array' then
    raise exception '%', coalesce(p_error, 'vendor_coverage_payload_invalid')
      using errcode = '22023';
  end if;

  return p_payload;
end;
$$;

drop function if exists public.amc_vendor_coverage_require_visible_profile(uuid, text, text);
create or replace function public.amc_vendor_coverage_require_visible_profile(
  p_vendor_profile_id uuid,
  p_permission_key text,
  p_permission_error text
)
returns table (
  vendor_profile_id uuid,
  vendor_company_id uuid,
  owner_company_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_company_status text;
begin
  if v_actor_user_id is null then
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

  select c.status
    into v_company_status
    from public.companies c
   where c.id = v_company_id;

  if not found then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission(p_permission_key) then
    raise exception '%', p_permission_error
      using errcode = '42501';
  end if;

  return query
  select cvp.id, cvp.vendor_company_id, cvp.owner_company_id
    from public.company_vendor_profiles cvp
   where cvp.id = p_vendor_profile_id
     and cvp.owner_company_id = v_company_id;

  if not found then
    raise exception 'vendor_profile_not_found_or_not_authorized'
      using errcode = '42501';
  end if;
end;
$$;

drop function if exists public.amc_vendor_coverage_payload(uuid);
create or replace function public.amc_vendor_coverage_payload(p_vendor_profile_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'states',
      coalesce((
        select jsonb_agg(vcs.state_code order by vcs.state_code)
          from public.vendor_coverage_states vcs
         where vcs.vendor_profile_id = p_vendor_profile_id
      ), '[]'::jsonb),
    'counties',
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'state_code', vcc.state_code,
            'county_name', vcc.county_name
          )
          order by vcc.state_code, lower(vcc.county_name), vcc.county_name
        )
          from public.vendor_coverage_counties vcc
         where vcc.vendor_profile_id = p_vendor_profile_id
      ), '[]'::jsonb),
    'property_types',
      coalesce((
        select jsonb_agg(vpt.property_type order by vpt.property_type)
          from public.vendor_property_types vpt
         where vpt.vendor_profile_id = p_vendor_profile_id
      ), '[]'::jsonb),
    'assignment_types',
      coalesce((
        select jsonb_agg(vat.assignment_type order by vat.assignment_type)
          from public.vendor_assignment_types vat
         where vat.vendor_profile_id = p_vendor_profile_id
      ), '[]'::jsonb)
  );
$$;

drop function if exists public.rpc_get_vendor_coverage(uuid);
create or replace function public.rpc_get_vendor_coverage(p_vendor_profile_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_profile record;
begin
  select *
    into v_profile
    from public.amc_vendor_coverage_require_visible_profile(
      p_vendor_profile_id,
      'vendors.read',
      'vendor_directory_vendors_read_permission_required'
    )
   limit 1;

  return public.amc_vendor_coverage_payload(v_profile.vendor_profile_id);
end;
$$;

drop function if exists public.rpc_save_vendor_coverage(uuid, jsonb, jsonb, jsonb, jsonb);
create or replace function public.rpc_save_vendor_coverage(
  p_vendor_profile_id uuid,
  p_states jsonb default '[]'::jsonb,
  p_counties jsonb default '[]'::jsonb,
  p_property_types jsonb default '[]'::jsonb,
  p_assignment_types jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_states jsonb := public.amc_vendor_coverage_validate_jsonb_array(p_states, 'vendor_coverage_states_invalid');
  v_counties jsonb := public.amc_vendor_coverage_validate_jsonb_array(p_counties, 'vendor_coverage_counties_invalid');
  v_property_types jsonb := public.amc_vendor_coverage_validate_jsonb_array(p_property_types, 'vendor_property_types_invalid');
  v_assignment_types jsonb := public.amc_vendor_coverage_validate_jsonb_array(p_assignment_types, 'vendor_assignment_types_invalid');
begin
  select *
    into v_profile
    from public.amc_vendor_coverage_require_visible_profile(
      p_vendor_profile_id,
      'vendors.service_areas.manage',
      'vendor_service_areas_manage_permission_required'
    )
   limit 1;

  delete from public.vendor_coverage_states
   where vendor_profile_id = v_profile.vendor_profile_id;
  delete from public.vendor_coverage_counties
   where vendor_profile_id = v_profile.vendor_profile_id;
  delete from public.vendor_property_types
   where vendor_profile_id = v_profile.vendor_profile_id;
  delete from public.vendor_assignment_types
   where vendor_profile_id = v_profile.vendor_profile_id;

  insert into public.vendor_coverage_states (vendor_profile_id, company_id, state_code)
  select v_profile.vendor_profile_id, v_profile.vendor_company_id, state_code
    from (
      select distinct public.amc_vendor_coverage_normalized_state(value) as state_code
        from jsonb_array_elements_text(v_states) as state_values(value)
    ) normalized
   where state_code is not null;

  if exists (
    select 1
      from jsonb_array_elements_text(v_states) as state_values(value)
     where public.amc_vendor_normalized_text(value) is not null
       and public.amc_vendor_coverage_normalized_state(value) is null
  ) then
    raise exception 'vendor_coverage_state_invalid'
      using errcode = '22023';
  end if;

  insert into public.vendor_coverage_counties (vendor_profile_id, company_id, state_code, county_name)
  select v_profile.vendor_profile_id, v_profile.vendor_company_id, state_code, county_name
    from (
      select distinct
             public.amc_vendor_coverage_normalized_state(county_value ->> 'state_code') as state_code,
             public.amc_vendor_coverage_normalized_county(county_value ->> 'county_name') as county_name
        from jsonb_array_elements(v_counties) as county_values(county_value)
       where jsonb_typeof(county_value) = 'object'
    ) normalized
   where state_code is not null
     and county_name is not null;

  if exists (
    select 1
      from jsonb_array_elements(v_counties) as county_values(county_value)
     where jsonb_typeof(county_value) <> 'object'
        or public.amc_vendor_coverage_normalized_state(county_value ->> 'state_code') is null
        or public.amc_vendor_coverage_normalized_county(county_value ->> 'county_name') is null
  ) then
    raise exception 'vendor_coverage_county_invalid'
      using errcode = '22023';
  end if;

  insert into public.vendor_property_types (vendor_profile_id, company_id, property_type)
  select v_profile.vendor_profile_id, v_profile.vendor_company_id, property_type
    from (
      select distinct lower(public.amc_vendor_normalized_text(value)) as property_type
        from jsonb_array_elements_text(v_property_types) as property_values(value)
    ) normalized
   where property_type in (
      'commercial',
      'industrial',
      'retail',
      'office',
      'multifamily',
      'agricultural',
      'land',
      'residential'
    );

  if exists (
    select 1
      from jsonb_array_elements_text(v_property_types) as property_values(value)
     where public.amc_vendor_normalized_text(value) is not null
       and lower(public.amc_vendor_normalized_text(value)) not in (
        'commercial',
        'industrial',
        'retail',
        'office',
        'multifamily',
        'agricultural',
        'land',
        'residential'
      )
  ) then
    raise exception 'vendor_property_type_invalid'
      using errcode = '22023';
  end if;

  insert into public.vendor_assignment_types (vendor_profile_id, company_id, assignment_type)
  select v_profile.vendor_profile_id, v_profile.vendor_company_id, assignment_type
    from (
      select distinct lower(public.amc_vendor_normalized_text(value)) as assignment_type
        from jsonb_array_elements_text(v_assignment_types) as assignment_values(value)
    ) normalized
   where assignment_type in (
      'appraisal',
      'review',
      'desktop',
      'restricted',
      'evaluation'
    );

  if exists (
    select 1
      from jsonb_array_elements_text(v_assignment_types) as assignment_values(value)
     where public.amc_vendor_normalized_text(value) is not null
       and lower(public.amc_vendor_normalized_text(value)) not in (
        'appraisal',
        'review',
        'desktop',
        'restricted',
        'evaluation'
      )
  ) then
    raise exception 'vendor_assignment_type_invalid'
      using errcode = '22023';
  end if;

  return public.amc_vendor_coverage_payload(v_profile.vendor_profile_id);
end;
$$;

revoke all on function public.amc_vendor_coverage_normalized_state(text) from public, anon, authenticated;
revoke all on function public.amc_vendor_coverage_normalized_county(text) from public, anon, authenticated;
revoke all on function public.amc_vendor_coverage_validate_jsonb_array(jsonb, text) from public, anon, authenticated;
revoke all on function public.amc_vendor_coverage_require_visible_profile(uuid, text, text) from public, anon, authenticated;
revoke all on function public.amc_vendor_coverage_payload(uuid) from public, anon, authenticated;
revoke all on function public.rpc_get_vendor_coverage(uuid) from public, anon;
revoke all on function public.rpc_save_vendor_coverage(uuid, jsonb, jsonb, jsonb, jsonb) from public, anon;

grant execute on function public.amc_vendor_coverage_normalized_state(text) to service_role;
grant execute on function public.amc_vendor_coverage_normalized_county(text) to service_role;
grant execute on function public.amc_vendor_coverage_validate_jsonb_array(jsonb, text) to service_role;
grant execute on function public.amc_vendor_coverage_require_visible_profile(uuid, text, text) to service_role;
grant execute on function public.amc_vendor_coverage_payload(uuid) to service_role;
grant execute on function public.rpc_get_vendor_coverage(uuid) to authenticated, service_role;
grant execute on function public.rpc_save_vendor_coverage(uuid, jsonb, jsonb, jsonb, jsonb) to authenticated, service_role;

comment on function public.rpc_get_vendor_coverage(uuid) is
  'Vendor Coverage Engine V1B read RPC. Requires current-company Vendor Directory read access, scopes by company_vendor_profiles.owner_company_id, and returns only normalized coverage for the requested vendor profile. Does not run matching, recommendations, bid automation, or assignment behavior.';

comment on function public.rpc_save_vendor_coverage(uuid, jsonb, jsonb, jsonb, jsonb) is
  'Vendor Coverage Engine V1B save RPC. Requires vendors.service_areas.manage, validates and normalizes coverage payloads, atomically replaces normalized coverage rows for one vendor profile, and returns saved normalized coverage. Does not touch vendor_service_areas, matching, recommendations, bid automation, or assignment behavior.';

commit;
