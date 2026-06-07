begin;

create or replace function public.rpc_vendor_workspace_profile()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_vendor_company_id uuid := public.current_company_id();
  v_profile public.company_vendor_profiles%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_vendor_company public.companies%rowtype;
  v_contacts jsonb := '[]'::jsonb;
  v_primary_contact jsonb := null;
  v_coverage jsonb := '{}'::jsonb;
  v_product_types jsonb := '[]'::jsonb;
  v_property_types jsonb := '[]'::jsonb;
  v_report_types jsonb := '[]'::jsonb;
  v_default_turn_time_days integer := null;
  v_compliance_summary jsonb := '{}'::jsonb;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_vendor_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('vendor_profile.read') then
    raise exception 'vendor_profile_read_permission_required'
      using errcode = '42501';
  end if;

  select *
    into v_vendor_company
    from public.companies c
   where c.id = v_vendor_company_id;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error', 'vendor_profile_unavailable'
    );
  end if;

  select cvp.*
    into v_profile
    from public.company_vendor_profiles cvp
    join public.company_relationships cr
      on cr.id = cvp.relationship_id
     and cr.source_company_id = cvp.owner_company_id
     and cr.target_company_id = cvp.vendor_company_id
   where cvp.vendor_company_id = v_vendor_company_id
     and cvp.vendor_status not in ('inactive', 'do_not_use')
     and cr.relationship_type = 'amc_vendor'
     and cr.status = 'active'
   order by cvp.updated_at desc, cvp.created_at desc
   limit 1;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error', 'vendor_profile_unavailable'
    );
  end if;

  select *
    into v_relationship
    from public.company_relationships cr
   where cr.id = v_profile.relationship_id
     and cr.source_company_id = v_profile.owner_company_id
     and cr.target_company_id = v_profile.vendor_company_id
     and cr.relationship_type = 'amc_vendor'
     and cr.status = 'active';

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error', 'vendor_profile_unavailable'
    );
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', vc.name,
        'email', vc.email,
        'phone', vc.phone,
        'role_label', vc.role_label,
        'is_primary', vc.is_primary,
        'receives_assignment_notifications', vc.receives_assignment_notifications
      )
      order by vc.is_primary desc, vc.receives_assignment_notifications desc, vc.created_at asc
    ),
    '[]'::jsonb
  )
    into v_contacts
    from public.vendor_contacts vc
   where vc.vendor_profile_id = v_profile.id;

  select jsonb_build_object(
    'name', vc.name,
    'email', vc.email,
    'phone', vc.phone,
    'role_label', vc.role_label
  )
    into v_primary_contact
    from public.vendor_contacts vc
   where vc.vendor_profile_id = v_profile.id
   order by vc.is_primary desc, vc.receives_assignment_notifications desc, vc.created_at asc
   limit 1;

  with active_coverage as (
    select
      nullif(btrim(vsa.state), '') as state,
      nullif(btrim(vsa.county), '') as county,
      nullif(btrim(vsa.zip), '') as zip,
      nullif(btrim(vsa.market), '') as market,
      vsa.radius_miles,
      nullif(btrim(vsa.product_type), '') as product_type
    from public.vendor_service_areas vsa
    where vsa.vendor_profile_id = v_profile.id
      and vsa.status = 'active'
  )
  select
    jsonb_build_object(
      'row_count', count(*)::integer,
      'states', coalesce(jsonb_agg(distinct state) filter (where state is not null), '[]'::jsonb),
      'counties', coalesce(
        jsonb_agg(distinct jsonb_build_object('state', state, 'county', county))
          filter (where state is not null and county is not null),
        '[]'::jsonb
      ),
      'markets', coalesce(jsonb_agg(distinct market) filter (where market is not null), '[]'::jsonb),
      'zips', coalesce(jsonb_agg(distinct zip) filter (where zip is not null), '[]'::jsonb),
      'service_areas', coalesce(
        jsonb_agg(
          jsonb_build_object(
            'state', state,
            'county', county,
            'zip', zip,
            'market', market,
            'radius_miles', radius_miles,
            'product_type', product_type
          )
          order by state nulls last, county nulls last, market nulls last, zip nulls last
        ),
        '[]'::jsonb
      )
    ),
    coalesce(jsonb_agg(distinct product_type) filter (where product_type is not null), '[]'::jsonb)
    into v_coverage, v_product_types
    from active_coverage;

  v_property_types := case
    when jsonb_typeof(v_profile.product_eligibility -> 'property_types') = 'array' then v_profile.product_eligibility -> 'property_types'
    when jsonb_typeof(v_profile.product_eligibility -> 'propertyTypes') = 'array' then v_profile.product_eligibility -> 'propertyTypes'
    when jsonb_typeof(v_profile.capabilities -> 'property_types') = 'array' then v_profile.capabilities -> 'property_types'
    when jsonb_typeof(v_profile.capabilities -> 'propertyTypes') = 'array' then v_profile.capabilities -> 'propertyTypes'
    else '[]'::jsonb
  end;

  v_report_types := case
    when jsonb_typeof(v_profile.product_eligibility -> 'report_types') = 'array' then v_profile.product_eligibility -> 'report_types'
    when jsonb_typeof(v_profile.product_eligibility -> 'reportTypes') = 'array' then v_profile.product_eligibility -> 'reportTypes'
    when jsonb_typeof(v_profile.capabilities -> 'report_types') = 'array' then v_profile.capabilities -> 'report_types'
    when jsonb_typeof(v_profile.capabilities -> 'reportTypes') = 'array' then v_profile.capabilities -> 'reportTypes'
    else '[]'::jsonb
  end;

  begin
    v_default_turn_time_days := coalesce(
      nullif(v_profile.capabilities ->> 'default_turn_time_days', '')::integer,
      nullif(v_profile.capabilities ->> 'defaultTurnTimeDays', '')::integer,
      nullif(v_profile.product_eligibility ->> 'default_turn_time_days', '')::integer,
      nullif(v_profile.product_eligibility ->> 'defaultTurnTimeDays', '')::integer
    );
  exception when others then
    v_default_turn_time_days := null;
  end;

  v_compliance_summary := jsonb_build_object(
    'status', coalesce(
      nullif(v_relationship.compliance ->> 'status', ''),
      nullif(v_relationship.compliance ->> 'compliance_status', ''),
      nullif(v_relationship.compliance ->> 'complianceStatus', ''),
      'Not provided'
    ),
    'insurance_status', nullif(v_relationship.compliance ->> 'insurance_status', ''),
    'license_status', nullif(v_relationship.compliance ->> 'license_status', ''),
    'document_count', 0,
    'last_updated_at', greatest(v_profile.updated_at, v_relationship.updated_at)
  );

  return jsonb_build_object(
    'ok', true,
    'profile', jsonb_build_object(
      'company', jsonb_build_object(
        'name', v_vendor_company.name,
        'public_phone', v_profile.public_phone,
        'website', v_profile.website,
        'primary_address', coalesce(v_profile.primary_address, '{}'::jsonb)
      ),
      'status', jsonb_build_object(
        'vendor_status', v_profile.vendor_status,
        'relationship_status', v_relationship.status,
        'is_active', true
      ),
      'primary_contact', v_primary_contact,
      'contacts', v_contacts,
      'coverage', v_coverage,
      'accepted_work_types', jsonb_build_object(
        'product_types', v_product_types,
        'property_types', v_property_types,
        'report_types', v_report_types
      ),
      'default_turn_time_days', v_default_turn_time_days,
      'compliance', v_compliance_summary,
      'last_updated_at', greatest(v_profile.updated_at, v_relationship.updated_at)
    )
  );
end;
$$;

revoke all on function public.rpc_vendor_workspace_profile() from public, anon;
grant execute on function public.rpc_vendor_workspace_profile() to authenticated, service_role;

comment on function public.rpc_vendor_workspace_profile() is
  'AMC-11C authenticated Vendor Workspace read-only profile/coverage read model. Requires vendor_profile.read, scopes to current_company_id(), active amc_vendor relationship/profile rows, and returns vendor-safe company, contact, coverage, accepted work type, compliance summary, and last-updated fields only. Does not expose raw relationship ids, vendor profile ids, owner-side Vendor Directory APIs, internal notes, pricing, client fees, AMC margin, candidate/procurement data, edit mutations, shared order routes, or storage paths.';

commit;
