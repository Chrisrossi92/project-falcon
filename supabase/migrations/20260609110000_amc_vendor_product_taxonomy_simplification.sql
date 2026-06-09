begin;

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
    when 'full_appraisal' then 'appraisal'
    when 'commercial' then 'commercial_appraisal'
    when 'commercial_appraisal' then 'commercial_appraisal'
    when 'residential' then 'residential_appraisal'
    when 'residential_appraisal' then 'residential_appraisal'
    when 'restricted_appraisal' then 'restricted_appraisal'
    when 'restricted' then 'restricted_appraisal'
    when 'construction_draw' then 'construction_draw'
    when 'draw' then 'construction_draw'
    when 'draw_inspection' then 'construction_draw'
    when 'short_term_rental' then 'short_term_rental'
    when 'str' then 'short_term_rental'
    when 'review' then 'review'
    when 'appraisal_review' then 'review'
    when 'single_family' then 'single_family'
    when 'condo' then 'condo'
    when 'condominium' then 'condo'
    when 'two_to_four_family' then 'two_to_four_family'
    when '2_4_family' then 'two_to_four_family'
    when 'manufactured_home' then 'manufactured_home'
    when 'residential_land' then 'residential_land'
    when 'other_residential' then 'other_residential'
    when 'office' then 'office'
    when 'retail' then 'retail'
    when 'industrial' then 'industrial'
    when 'multifamily' then 'multifamily'
    when 'multi_family' then 'multifamily'
    when 'mixed_use' then 'mixed_use'
    when 'land' then 'land'
    when 'commercial_land' then 'land'
    when 'special_purpose' then 'special_purpose'
    when 'hospitality' then 'hospitality'
    when 'self_storage' then 'self_storage'
    when 'medical_office' then 'medical_office'
    when 'restaurant' then 'restaurant'
    when 'other_commercial' then 'other_commercial'
    else v_key
  end;
end;
$$;

create or replace function public.amc_candidate_product_major_category(p_product_slug text)
returns text
language sql
immutable
set search_path = public
as $$
  select case public.amc_candidate_normalized_product_slug(p_product_slug)
    when 'office' then 'commercial_appraisal'
    when 'retail' then 'commercial_appraisal'
    when 'industrial' then 'commercial_appraisal'
    when 'multifamily' then 'commercial_appraisal'
    when 'mixed_use' then 'commercial_appraisal'
    when 'land' then 'commercial_appraisal'
    when 'special_purpose' then 'commercial_appraisal'
    when 'hospitality' then 'commercial_appraisal'
    when 'self_storage' then 'commercial_appraisal'
    when 'medical_office' then 'commercial_appraisal'
    when 'restaurant' then 'commercial_appraisal'
    when 'other_commercial' then 'commercial_appraisal'
    when 'single_family' then 'residential_appraisal'
    when 'condo' then 'residential_appraisal'
    when 'two_to_four_family' then 'residential_appraisal'
    when 'manufactured_home' then 'residential_appraisal'
    when 'residential_land' then 'residential_appraisal'
    when 'other_residential' then 'residential_appraisal'
    else public.amc_candidate_normalized_product_slug(p_product_slug)
  end;
$$;

create or replace function public.amc_candidate_order_property_subtype(
  p_report_type text,
  p_property_type text
)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_report_key text;
  v_property_key text;
begin
  v_report_key := public.amc_candidate_normalized_product_slug(p_report_type);
  v_property_key := public.amc_candidate_normalized_product_slug(p_property_type);

  if v_report_key in ('review', 'restricted_appraisal', 'construction_draw', 'short_term_rental') then
    return null;
  end if;

  if public.amc_candidate_product_major_category(v_property_key) in (
    'commercial_appraisal',
    'residential_appraisal'
  ) and v_property_key not in (
    'commercial_appraisal',
    'residential_appraisal',
    'appraisal'
  ) then
    return v_property_key;
  end if;

  return null;
end;
$$;

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
  v_property_category text;
begin
  v_report_key := public.amc_candidate_normalized_product_slug(p_report_type);
  v_property_key := public.amc_candidate_normalized_product_slug(p_property_type);
  v_property_category := public.amc_candidate_product_major_category(v_property_key);

  if v_report_key in ('restricted_appraisal', 'construction_draw', 'review', 'short_term_rental') then
    return array[v_report_key]::text[];
  end if;

  if v_property_category in ('commercial_appraisal', 'residential_appraisal') then
    return array[v_property_category]::text[];
  end if;

  if v_report_key in (
    'appraisal',
    'narrative',
    'narrative_appraisal',
    'form',
    'form_appraisal'
  ) then
    return array['appraisal']::text[];
  end if;

  return '{}'::text[];
end;
$$;

create or replace function public.amc_candidate_product_match_score(
  p_vendor_product_type text,
  p_order_major_product text,
  p_order_property_subtype text
)
returns integer
language sql
immutable
set search_path = public
as $$
  with normalized as (
    select
      public.amc_candidate_normalized_product_slug(p_vendor_product_type) as vendor_product,
      public.amc_candidate_product_major_category(p_vendor_product_type) as vendor_major_product,
      public.amc_candidate_normalized_product_slug(p_order_major_product) as order_major_product,
      public.amc_candidate_normalized_product_slug(p_order_property_subtype) as order_property_subtype
  )
  select case
    when vendor_product is null or order_major_product is null then 0
    when order_property_subtype is not null
      and vendor_product = order_property_subtype then 35
    when vendor_product = order_major_product then 25
    when vendor_product = 'appraisal'
      and order_major_product in ('commercial_appraisal', 'residential_appraisal') then 15
    else 0
  end
  from normalized;
$$;

create or replace function public.amc_candidate_product_match_type(
  p_vendor_product_type text,
  p_order_major_product text,
  p_order_property_subtype text
)
returns text
language sql
immutable
set search_path = public
as $$
  with normalized as (
    select
      public.amc_candidate_normalized_product_slug(p_vendor_product_type) as vendor_product,
      public.amc_candidate_product_major_category(p_vendor_product_type) as vendor_major_product,
      public.amc_candidate_normalized_product_slug(p_order_major_product) as order_major_product,
      public.amc_candidate_normalized_product_slug(p_order_property_subtype) as order_property_subtype
  )
  select case
    when vendor_product is null or order_major_product is null then null
    when order_property_subtype is not null
      and vendor_product = order_property_subtype then 'exact_subtype'
    when vendor_product = order_major_product then 'major_product'
    when vendor_product = 'appraisal'
      and order_major_product in ('commercial_appraisal', 'residential_appraisal') then 'broad_appraisal'
    else null
  end
  from normalized;
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
  v_order_major_product text;
  v_order_property_subtype text;
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

  if coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations' then
    raise exception 'order_scope_not_amc_operations'
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
  v_order_major_product := v_order_product_slugs[1];
  v_order_property_subtype := public.amc_candidate_order_property_subtype(
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

  if v_order_major_product is null then
    v_order_product_slugs := array['appraisal']::text[];
    v_order_major_product := 'appraisal';
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
      public.amc_candidate_product_match_score(
        vsa.product_type,
        v_order_major_product,
        v_order_property_subtype
      ) as product_score,
      public.amc_candidate_product_match_type(
        vsa.product_type,
        v_order_major_product,
        v_order_property_subtype
      ) as product_match_type,
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
      and public.amc_candidate_product_match_score(
        vsa.product_type,
        v_order_major_product,
        v_order_property_subtype
      ) > 0
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
      max(mc.product_score) as best_product_score,
      (array_agg(mc.geography_match_type order by mc.geography_score desc, mc.geography_match_type))[1] as best_geography_match_type,
      (array_agg(mc.product_match_type order by mc.product_score desc, mc.product_match_type))[1] as best_product_match_type,
      array_agg(distinct mc.matched_product_type order by mc.matched_product_type) as matched_product_types,
      jsonb_agg(
        jsonb_build_object(
          'vendor_service_area_id', mc.matched_service_area_id,
          'match_type', mc.geography_match_type,
          'geography_score', mc.geography_score,
          'product_match_type', mc.product_match_type,
          'product_score', mc.product_score,
          'state', mc.state,
          'county', mc.county,
          'zip', mc.zip,
          'market', mc.market,
          'radius_miles', mc.radius_miles,
          'product_type', mc.matched_product_type
        )
        order by mc.geography_score desc, mc.product_score desc, mc.state, mc.county, mc.zip, mc.market, mc.matched_product_type
      ) as matched_coverage
    from matched_coverage mc
    where mc.geography_match_type is not null
      and mc.geography_score > 0
      and mc.product_score > 0
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
      + g.best_product_score
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
        'major_product_category', v_order_major_product,
        'property_subtype', v_order_property_subtype,
        'order_product_slugs', to_jsonb(v_order_product_slugs),
        'matched_product_types', to_jsonb(g.matched_product_types),
        'best_match', g.best_product_match_type,
        'score', g.best_product_score
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

revoke all on function public.amc_candidate_normalized_product_slug(text) from public, anon, authenticated;
revoke all on function public.amc_candidate_product_major_category(text) from public, anon, authenticated;
revoke all on function public.amc_candidate_order_property_subtype(text, text) from public, anon, authenticated;
revoke all on function public.amc_candidate_order_product_slugs(text, text) from public, anon, authenticated;
revoke all on function public.amc_candidate_product_match_score(text, text, text) from public, anon, authenticated;
revoke all on function public.amc_candidate_product_match_type(text, text, text) from public, anon, authenticated;
revoke all on function public.rpc_vendor_assignment_candidates(uuid) from public, anon;

grant execute on function public.rpc_vendor_assignment_candidates(uuid) to authenticated, service_role;

comment on function public.amc_candidate_normalized_product_slug(text) is
  'AMC-10C product taxonomy helper. Normalizes legacy vendor coverage product labels to major appraisal categories or property subtypes.';

comment on function public.amc_candidate_product_major_category(text) is
  'AMC-10C product taxonomy helper. Maps commercial/residential property subtypes to commercial_appraisal or residential_appraisal.';

comment on function public.amc_candidate_order_property_subtype(text, text) is
  'AMC-10C product taxonomy helper. Derives the order property subtype used for specificity scoring, not eligibility exclusion.';

comment on function public.amc_candidate_order_product_slugs(text, text) is
  'AMC-10C product taxonomy helper. Derives major product category from order report/property fields; Industrial, Office, Retail, Multifamily, Land, Mixed Use, Special Purpose, Hospitality, Self Storage, Medical Office, and Restaurant derive commercial_appraisal.';

comment on function public.amc_candidate_product_match_score(text, text, text) is
  'AMC-10C product taxonomy helper. Scores exact subtype over major commercial/residential appraisal coverage, with Appraisal retained as lower-specificity broad coverage.';

comment on function public.rpc_vendor_assignment_candidates(uuid) is
  'AMC-10C read-only Vendor Assignment Candidate RPC. Keeps current-company, order-read, AMC scope, active vendor, and geography rules unchanged while matching vendor coverage by major product category plus optional subtype specificity. Does not create assignments, bid requests, notifications, UI routes, order mutations, or schema table changes.';

commit;
