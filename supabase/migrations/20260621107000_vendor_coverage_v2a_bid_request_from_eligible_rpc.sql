begin;

drop function if exists public.rpc_order_vendor_bid_request_create_from_eligible(uuid, uuid[], jsonb);
create or replace function public.rpc_order_vendor_bid_request_create_from_eligible(
  p_order_id uuid,
  p_vendor_profile_ids uuid[],
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_order public.orders%rowtype;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_requested_count integer;
  v_eligible_count integer;
  v_recipients jsonb;
  v_payload_for_create jsonb;
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

  if not public.current_app_user_has_permission('bid_requests.create') then
    raise exception 'bid_request_create_permission_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('vendors.read') then
    raise exception 'vendor_read_permission_required'
      using errcode = '42501';
  end if;

  if p_vendor_profile_ids is null or cardinality(p_vendor_profile_ids) = 0 then
    raise exception 'eligible_vendor_profiles_required'
      using errcode = '22023';
  end if;

  if exists (
    select 1
      from unnest(p_vendor_profile_ids) as requested(vendor_profile_id)
     group by requested.vendor_profile_id
    having count(*) > 1
       and requested.vendor_profile_id is not null
  ) then
    raise exception 'eligible_vendor_profile_duplicate'
      using errcode = '23505';
  end if;

  if exists (
    select 1
      from unnest(p_vendor_profile_ids) as requested(vendor_profile_id)
     where requested.vendor_profile_id is null
  ) then
    raise exception 'eligible_vendor_profile_invalid'
      using errcode = '22023';
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    raise exception 'bid_request_payload_invalid'
      using errcode = '22023';
  end if;

  select *
    into v_order
    from public.orders
   where id = p_order_id;

  if not found
     or coalesce(v_order.company_id, public.default_company_id()) <> v_company_id
     or not public.current_app_user_can_read_order(p_order_id) then
    raise exception 'bid_request_order_not_found_or_not_authorized'
      using errcode = '42501';
  end if;

  if coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations' then
    raise exception 'order_scope_not_amc_operations'
      using errcode = '42501';
  end if;

  with requested as (
    select distinct requested.vendor_profile_id
      from unnest(p_vendor_profile_ids) as requested(vendor_profile_id)
  ),
  order_dimensions as (
    select
      public.amc_vendor_coverage_normalized_state(v_order.state) as matched_state,
      public.amc_vendor_coverage_normalized_county(v_order.county) as matched_county,
      lower(public.amc_vendor_normalized_text(v_order.property_type)) as matched_property_type,
      public.amc_vendor_coverage_assignment_type_from_order(v_order.report_type) as matched_assignment_type
  ),
  eligible as (
    select distinct on (cvp.id)
      cvp.id as vendor_profile_id,
      cvp.vendor_company_id,
      cr.id as relationship_id,
      od.matched_state,
      od.matched_county,
      od.matched_property_type,
      od.matched_assignment_type
    from requested r
    join public.company_vendor_profiles cvp
      on cvp.id = r.vendor_profile_id
     and cvp.owner_company_id = v_company_id
     and cvp.vendor_status = 'active'
    join public.companies vc
      on vc.id = cvp.vendor_company_id
     and vc.status = 'active'
    join public.company_relationships cr
      on cr.source_company_id = v_company_id
     and cr.target_company_id = cvp.vendor_company_id
     and cr.relationship_type = 'amc_vendor'
     and cr.status = 'active'
     and (
       cvp.relationship_id is null
       or cvp.relationship_id = cr.id
     )
    join order_dimensions od
      on od.matched_state is not null
     and od.matched_county is not null
     and od.matched_property_type is not null
     and od.matched_assignment_type is not null
    join public.vendor_coverage_states vcs
      on vcs.vendor_profile_id = cvp.id
     and vcs.company_id = cvp.vendor_company_id
     and vcs.state_code = od.matched_state
    join public.vendor_coverage_counties vcc
      on vcc.vendor_profile_id = cvp.id
     and vcc.company_id = cvp.vendor_company_id
     and vcc.state_code = od.matched_state
     and lower(btrim(vcc.county_name)) = lower(btrim(od.matched_county))
    join public.vendor_property_types vpt
      on vpt.vendor_profile_id = cvp.id
     and vpt.company_id = cvp.vendor_company_id
     and vpt.property_type = od.matched_property_type
    join public.vendor_assignment_types vat
      on vat.vendor_profile_id = cvp.id
     and vat.company_id = cvp.vendor_company_id
     and vat.assignment_type = od.matched_assignment_type
    order by cvp.id, cr.created_at desc, cr.id
  )
  select
    (select count(*) from requested),
    (select count(*) from eligible),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'vendor_profile_id', eligible.vendor_profile_id,
          'vendor_company_id', eligible.vendor_company_id,
          'relationship_id', eligible.relationship_id,
          'candidate_snapshot', jsonb_build_object(
            'source', 'eligible_vendors_panel',
            'deterministic_coverage_match', true,
            'matched_state', eligible.matched_state,
            'matched_county', eligible.matched_county,
            'matched_property_type', eligible.matched_property_type,
            'matched_assignment_type', eligible.matched_assignment_type
          )
        )
        order by eligible.vendor_profile_id
      ),
      '[]'::jsonb
    )
    into v_requested_count, v_eligible_count, v_recipients
    from eligible;

  if v_requested_count is null or v_requested_count = 0 then
    raise exception 'eligible_vendor_profiles_required'
      using errcode = '22023';
  end if;

  if v_eligible_count <> v_requested_count then
    raise exception 'eligible_vendor_profile_ineligible'
      using errcode = '42501';
  end if;

  v_payload_for_create :=
    v_payload
    || jsonb_build_object(
      'recipients', v_recipients,
      'candidate_snapshot',
        coalesce(v_payload -> 'candidate_snapshot', '{}'::jsonb)
        || jsonb_build_object(
          'source', 'eligible_vendors_panel',
          'deterministic_coverage_match', true
        )
    );

  return public.rpc_order_vendor_bid_request_create(p_order_id, v_payload_for_create);
end;
$$;

revoke all on function public.rpc_order_vendor_bid_request_create_from_eligible(uuid, uuid[], jsonb)
  from public, anon;
grant execute on function public.rpc_order_vendor_bid_request_create_from_eligible(uuid, uuid[], jsonb)
  to authenticated, service_role;

comment on function public.rpc_order_vendor_bid_request_create_from_eligible(uuid, uuid[], jsonb) is
  'Vendor Coverage V2A backend wrapper. Re-runs deterministic normalized coverage eligibility server-side for selected active vendor profiles, resolves active AMC vendor relationships, adds eligible_vendors_panel source metadata, and delegates to rpc_order_vendor_bid_request_create for duplicate-open-recipient prevention and bid request creation. Does not create assignments, mutate orders, send automatic outreach from match loading, or bypass procurement permissions.';

commit;
