begin;

drop function if exists public.amc_candidate_normalized_text(text);
create or replace function public.amc_candidate_normalized_text(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(btrim(coalesce(p_value, '')), '');
$$;

drop function if exists public.amc_candidate_normalized_state(text);
create or replace function public.amc_candidate_normalized_state(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when upper(public.amc_candidate_normalized_text(p_value)) ~ '^[A-Z]{2}$'
      then upper(public.amc_candidate_normalized_text(p_value))
    else null
  end;
$$;

drop function if exists public.amc_candidate_normalized_zip(text);
create or replace function public.amc_candidate_normalized_zip(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select substring(public.amc_candidate_normalized_text(p_value) from '^([0-9]{5})(?:-[0-9]{4})?$');
$$;

drop function if exists public.amc_candidate_normalized_county(text);
create or replace function public.amc_candidate_normalized_county(p_value text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_county text;
begin
  v_county := lower(public.amc_candidate_normalized_text(p_value));

  if v_county is null then
    return null;
  end if;

  v_county := regexp_replace(v_county, '[^a-z0-9]+', ' ', 'g');
  v_county := regexp_replace(v_county, '\s+', ' ', 'g');
  v_county := btrim(v_county);
  v_county := regexp_replace(v_county, '\s+county$', '');

  return nullif(btrim(v_county), '');
end;
$$;

drop function if exists public.amc_candidate_normalized_market(text);
create or replace function public.amc_candidate_normalized_market(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(
    btrim(
      regexp_replace(
        lower(public.amc_candidate_normalized_text(p_value)),
        '\s+',
        ' ',
        'g'
      )
    ),
    ''
  );
$$;

drop function if exists public.amc_candidate_normalized_product_slug(text);
create or replace function public.amc_candidate_normalized_product_slug(p_value text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_key text;
begin
  v_key := lower(public.amc_candidate_normalized_text(p_value));

  if v_key is null then
    return null;
  end if;

  v_key := regexp_replace(v_key, '[^a-z0-9]+', '_', 'g');
  v_key := regexp_replace(v_key, '(^_+|_+$)', '', 'g');

  return case v_key
    when 'appraisal' then 'appraisal'
    when 'restricted' then 'restricted_appraisal'
    when 'restricted_appraisal' then 'restricted_appraisal'
    when 'construction_draw' then 'construction_draw'
    when 'short_term_rental' then 'short_term_rental'
    when 'residential' then 'residential'
    when 'commercial' then 'commercial'
    when 'industrial' then 'industrial'
    when 'multifamily' then 'multifamily'
    when 'multi_family' then 'multifamily'
    when 'land' then 'land'
    when 'review' then 'review'
    else null
  end;
end;
$$;

drop function if exists public.amc_candidate_order_product_slugs(text, text);
create or replace function public.amc_candidate_order_product_slugs(
  p_report_type text,
  p_property_type text
)
returns text[]
language plpgsql
immutable
set search_path = public
as $$
declare
  v_report_key text;
  v_property_key text;
  v_property_slug text;
begin
  v_report_key := lower(public.amc_candidate_normalized_text(p_report_type));
  if v_report_key is not null then
    v_report_key := regexp_replace(v_report_key, '[^a-z0-9]+', '_', 'g');
    v_report_key := regexp_replace(v_report_key, '(^_+|_+$)', '', 'g');
  end if;

  v_property_key := lower(public.amc_candidate_normalized_text(p_property_type));
  if v_property_key is not null then
    v_property_key := regexp_replace(v_property_key, '[^a-z0-9]+', '_', 'g');
    v_property_key := regexp_replace(v_property_key, '(^_+|_+$)', '', 'g');
  end if;

  if v_report_key in ('restricted', 'restricted_appraisal') then
    return array['restricted_appraisal']::text[];
  end if;

  if v_report_key = 'construction_draw' then
    return array['construction_draw']::text[];
  end if;

  if v_report_key = 'review' then
    return array['review']::text[];
  end if;

  v_property_slug := case v_property_key
    when 'residential' then 'residential'
    when 'industrial' then 'industrial'
    when 'multifamily' then 'multifamily'
    when 'multi_family' then 'multifamily'
    when 'land' then 'land'
    when 'office' then 'commercial'
    when 'retail' then 'commercial'
    when 'mixed_use' then 'commercial'
    when 'special_purpose' then 'commercial'
    when 'medical_office' then 'commercial'
    when 'self_storage' then 'commercial'
    when 'hospitality' then 'commercial'
    when 'restaurant' then 'commercial'
    when 'auto_service' then 'commercial'
    when 'car_wash' then 'commercial'
    when 'gas_station_c_store' then 'commercial'
    when 'bank_branch' then 'commercial'
    when 'school_daycare' then 'commercial'
    when 'religious_facility' then 'commercial'
    when 'agricultural' then 'commercial'
    else null
  end;

  if v_property_slug is not null then
    return array[v_property_slug]::text[];
  end if;

  if v_report_key in ('appraisal', 'narrative', 'form') then
    return array['appraisal']::text[];
  end if;

  return '{}'::text[];
end;
$$;

drop function if exists public.rpc_vendor_assignment_candidates(uuid);
create or replace function public.rpc_vendor_assignment_candidates(p_order_id uuid)
returns table (
  vendor_profile_id uuid,
  vendor_company_id uuid,
  vendor_company_name text,
  vendor_status text,
  relationship_id uuid,
  relationship_status text,
  match_score integer,
  match_reasons jsonb,
  coverage_matches jsonb,
  primary_contact jsonb,
  warning_flags jsonb
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
  v_order public.orders%rowtype;
  v_order_state text;
  v_order_county text;
  v_order_zip text;
  v_order_market text;
  v_order_product_slugs text[];
  v_base_warnings jsonb := '[]'::jsonb;
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

  if not public.current_app_user_has_permission('vendors.read') then
    raise exception 'vendor_directory_vendors_read_permission_required'
      using errcode = '42501';
  end if;

  select *
    into v_order
    from public.orders o
   where o.id = p_order_id;

  if not found then
    raise exception 'order_not_found'
      using errcode = '42501';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) <> v_company_id then
    raise exception 'order_not_found_or_not_authorized'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_read_order(p_order_id) then
    raise exception 'order_not_found_or_not_authorized'
      using errcode = '42501';
  end if;

  v_order_state := public.amc_candidate_normalized_state(v_order.state);
  v_order_county := public.amc_candidate_normalized_county(v_order.county);
  v_order_zip := public.amc_candidate_normalized_zip(coalesce(v_order.postal_code, v_order.zip));

  if v_order.location is not null and jsonb_typeof(v_order.location) = 'object' then
    v_order_market := public.amc_candidate_normalized_market(
      coalesce(v_order.location ->> 'market', v_order.location ->> 'market_name')
    );
  end if;

  v_order_product_slugs := public.amc_candidate_order_product_slugs(
    v_order.report_type,
    v_order.property_type
  );

  if v_order_state is null then
    v_base_warnings := v_base_warnings || '["missing_order_state"]'::jsonb;
  end if;

  if v_order_county is null then
    v_base_warnings := v_base_warnings || '["missing_order_county"]'::jsonb;
  end if;

  if v_order_zip is null then
    v_base_warnings := v_base_warnings || '["missing_order_zip"]'::jsonb;
  end if;

  if v_order_market is null then
    v_base_warnings := v_base_warnings || '["missing_order_market"]'::jsonb;
  end if;

  if coalesce(array_length(v_order_product_slugs, 1), 0) = 0 then
    v_order_product_slugs := array['appraisal']::text[];
    v_base_warnings := v_base_warnings || '["unknown_order_product"]'::jsonb;
  end if;

  return query
  with matched_coverage as (
    select
      cvp.id as matched_vendor_profile_id,
      cvp.vendor_company_id as matched_vendor_company_id,
      vendor_company.name as matched_vendor_company_name,
      cvp.vendor_status as matched_vendor_status,
      cr.id as matched_relationship_id,
      cr.status as matched_relationship_status,
      vsa.id as matched_service_area_id,
      vsa.state,
      vsa.county,
      vsa.zip,
      vsa.market,
      vsa.radius_miles,
      public.amc_candidate_normalized_product_slug(vsa.product_type) as matched_product_type,
      case
        when v_order_zip is not null
          and public.amc_candidate_normalized_zip(vsa.zip) = v_order_zip
          then 'zip'
        when v_order_state is not null
          and v_order_county is not null
          and public.amc_candidate_normalized_state(vsa.state) = v_order_state
          and public.amc_candidate_normalized_county(vsa.county) = v_order_county
          then 'county'
        when v_order_state is not null
          and v_order_market is not null
          and public.amc_candidate_normalized_state(vsa.state) = v_order_state
          and public.amc_candidate_normalized_market(vsa.market) = v_order_market
          then 'market'
        when v_order_state is not null
          and public.amc_candidate_normalized_state(vsa.state) = v_order_state
          and public.amc_candidate_normalized_county(vsa.county) is null
          and public.amc_candidate_normalized_zip(vsa.zip) is null
          and public.amc_candidate_normalized_market(vsa.market) is null
          and vsa.radius_miles is null
          then 'statewide'
        else null
      end as geography_match_type,
      case
        when v_order_zip is not null
          and public.amc_candidate_normalized_zip(vsa.zip) = v_order_zip
          then 50
        when v_order_state is not null
          and v_order_county is not null
          and public.amc_candidate_normalized_state(vsa.state) = v_order_state
          and public.amc_candidate_normalized_county(vsa.county) = v_order_county
          then 40
        when v_order_state is not null
          and v_order_market is not null
          and public.amc_candidate_normalized_state(vsa.state) = v_order_state
          and public.amc_candidate_normalized_market(vsa.market) = v_order_market
          then 30
        when v_order_state is not null
          and public.amc_candidate_normalized_state(vsa.state) = v_order_state
          and public.amc_candidate_normalized_county(vsa.county) is null
          and public.amc_candidate_normalized_zip(vsa.zip) is null
          and public.amc_candidate_normalized_market(vsa.market) is null
          and vsa.radius_miles is null
          then 20
        else 0
      end as geography_score
    from public.company_vendor_profiles cvp
    join public.companies vendor_company
      on vendor_company.id = cvp.vendor_company_id
    join public.company_relationships cr
      on cr.id = cvp.relationship_id
     and cr.source_company_id = cvp.owner_company_id
     and cr.target_company_id = cvp.vendor_company_id
     and cr.relationship_type = 'amc_vendor'
     and cr.status = 'active'
    join public.vendor_service_areas vsa
      on vsa.vendor_profile_id = cvp.id
     and vsa.status = 'active'
    where cvp.owner_company_id = v_company_id
      and cvp.vendor_status not in ('inactive', 'do_not_use')
      and vendor_company.status = 'active'
      and public.amc_candidate_normalized_product_slug(vsa.product_type) = any(v_order_product_slugs)
  ),
  grouped as (
    select
      mc.matched_vendor_profile_id,
      mc.matched_vendor_company_id,
      mc.matched_vendor_company_name,
      mc.matched_vendor_status,
      mc.matched_relationship_id,
      mc.matched_relationship_status,
      max(mc.geography_score) as best_geography_score,
      (array_agg(mc.geography_match_type order by mc.geography_score desc, mc.geography_match_type))[1] as best_geography_match_type,
      array_agg(distinct mc.matched_product_type order by mc.matched_product_type) as matched_product_types,
      jsonb_agg(
        jsonb_build_object(
          'vendor_service_area_id', mc.matched_service_area_id,
          'match_type', mc.geography_match_type,
          'geography_score', mc.geography_score,
          'state', mc.state,
          'county', mc.county,
          'zip', mc.zip,
          'market', mc.market,
          'radius_miles', mc.radius_miles,
          'product_type', mc.matched_product_type
        )
        order by mc.geography_score desc, mc.state, mc.county, mc.zip, mc.market, mc.matched_product_type
      ) as matched_coverage
    from matched_coverage mc
    where mc.geography_match_type is not null
      and mc.geography_score > 0
    group by
      mc.matched_vendor_profile_id,
      mc.matched_vendor_company_id,
      mc.matched_vendor_company_name,
      mc.matched_vendor_status,
      mc.matched_relationship_id,
      mc.matched_relationship_status
  )
  select
    g.matched_vendor_profile_id,
    g.matched_vendor_company_id,
    g.matched_vendor_company_name,
    g.matched_vendor_status,
    g.matched_relationship_id,
    g.matched_relationship_status,
    (
      g.best_geography_score
      + 25
      + case g.matched_vendor_status
          when 'preferred' then 15
          when 'active' then 10
          when 'probation' then -10
          else 0
        end
      + 10
    )::integer as match_score,
    jsonb_build_object(
      'geography', jsonb_build_object(
        'best_match', g.best_geography_match_type,
        'score', g.best_geography_score
      ),
      'product', jsonb_build_object(
        'order_product_slugs', to_jsonb(v_order_product_slugs),
        'matched_product_types', to_jsonb(g.matched_product_types),
        'score', 25
      ),
      'vendor_status', g.matched_vendor_status,
      'relationship_status', g.matched_relationship_status
    ) as match_reasons,
    g.matched_coverage as coverage_matches,
    coalesce(primary_contact.contact, '{}'::jsonb) as primary_contact,
    (
      v_base_warnings
      || case
        when g.matched_vendor_status = 'probation' then '["probation_vendor"]'::jsonb
        else '[]'::jsonb
      end
      || case
        when g.best_geography_match_type = 'market' then '["market_text_match_only"]'::jsonb
        else '[]'::jsonb
      end
    ) as warning_flags
  from grouped g
  left join lateral (
    select jsonb_build_object(
      'vendor_contact_id', vc.id,
      'name', vc.name,
      'email', vc.email,
      'phone', vc.phone,
      'role_label', vc.role_label,
      'is_primary', vc.is_primary
    ) as contact
    from public.vendor_contacts vc
    where vc.vendor_profile_id = g.matched_vendor_profile_id
    order by vc.is_primary desc, vc.updated_at desc nulls last, vc.created_at desc
    limit 1
  ) primary_contact on true
  order by 7 desc, g.matched_vendor_company_name asc, g.matched_vendor_profile_id asc;
end;
$$;

revoke all on function public.amc_candidate_normalized_text(text) from public, anon, authenticated;
revoke all on function public.amc_candidate_normalized_state(text) from public, anon, authenticated;
revoke all on function public.amc_candidate_normalized_zip(text) from public, anon, authenticated;
revoke all on function public.amc_candidate_normalized_county(text) from public, anon, authenticated;
revoke all on function public.amc_candidate_normalized_market(text) from public, anon, authenticated;
revoke all on function public.amc_candidate_normalized_product_slug(text) from public, anon, authenticated;
revoke all on function public.amc_candidate_order_product_slugs(text, text) from public, anon, authenticated;

revoke all on function public.rpc_vendor_assignment_candidates(uuid) from public, anon;
grant execute on function public.rpc_vendor_assignment_candidates(uuid) to authenticated, service_role;

comment on function public.amc_candidate_normalized_text(text) is
  'AMC-5D internal helper for conservative assignment candidate text normalization.';

comment on function public.amc_candidate_normalized_state(text) is
  'AMC-5D internal helper. Normalizes candidate matching state values to two-letter uppercase codes or null.';

comment on function public.amc_candidate_normalized_zip(text) is
  'AMC-5D internal helper. Normalizes candidate matching ZIP values to five digits or null.';

comment on function public.amc_candidate_normalized_county(text) is
  'AMC-5D internal helper. Normalizes county names for exact candidate matching, including trailing County suffix cleanup.';

comment on function public.amc_candidate_normalized_market(text) is
  'AMC-5D internal helper. Normalizes market labels for exact text matching only; no geocoding or radius distance math.';

comment on function public.amc_candidate_normalized_product_slug(text) is
  'AMC-5D internal helper. Normalizes known Vendor Directory product labels/slugs to stable product slugs.';

comment on function public.amc_candidate_order_product_slugs(text, text) is
  'AMC-5D internal helper. Derives conservative vendor product slugs from order report_type/property_type display values.';

comment on function public.rpc_vendor_assignment_candidates(uuid) is
  'AMC-5D read-only Vendor Assignment Candidate RPC. Uses current company, vendors.read, order read authorization, active amc_vendor relationships, active vendor coverage rows, exact geography matching, and exact product slug matching. Does not create assignments, bid requests, notifications, UI routes, order mutations, assignment packet mutations, schema table changes, or /amc/* routes.';

commit;
