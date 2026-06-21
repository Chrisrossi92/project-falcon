begin;

drop function if exists public.amc_vendor_coverage_assignment_type_from_order(text);
create or replace function public.amc_vendor_coverage_assignment_type_from_order(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when public.amc_vendor_normalized_text(p_value) is null then null
    when lower(public.amc_vendor_normalized_text(p_value)) in ('appraisal', 'review', 'desktop', 'restricted', 'evaluation')
      then lower(public.amc_vendor_normalized_text(p_value))
    when lower(public.amc_vendor_normalized_text(p_value)) like '%review%' then 'review'
    when lower(public.amc_vendor_normalized_text(p_value)) like '%desktop%' then 'desktop'
    when lower(public.amc_vendor_normalized_text(p_value)) like '%restricted%' then 'restricted'
    when lower(public.amc_vendor_normalized_text(p_value)) like '%evaluation%' then 'evaluation'
    when lower(public.amc_vendor_normalized_text(p_value)) like '%appraisal%' then 'appraisal'
    else lower(public.amc_vendor_normalized_text(p_value))
  end;
$$;

drop function if exists public.rpc_get_matching_vendors_for_order(uuid);
create or replace function public.rpc_get_matching_vendors_for_order(p_order_id uuid)
returns table (
  vendor_profile_id uuid,
  company_id uuid,
  company_name text,
  matched_state text,
  matched_county text,
  matched_property_type text,
  matched_assignment_type text
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
  v_order_property_type text;
  v_order_assignment_type text;
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

  v_order_state := public.amc_vendor_coverage_normalized_state(v_order.state);
  v_order_county := public.amc_vendor_coverage_normalized_county(v_order.county);
  v_order_property_type := lower(public.amc_vendor_normalized_text(v_order.property_type));
  v_order_assignment_type := public.amc_vendor_coverage_assignment_type_from_order(v_order.report_type);

  if v_order_state is null
     or v_order_county is null
     or v_order_property_type is null
     or v_order_assignment_type is null then
    return;
  end if;

  return query
  select
    cvp.id as vendor_profile_id,
    cvp.vendor_company_id as company_id,
    vc.name as company_name,
    vcs.state_code as matched_state,
    vcc.county_name as matched_county,
    vpt.property_type as matched_property_type,
    vat.assignment_type as matched_assignment_type
  from public.company_vendor_profiles cvp
  join public.companies vc
    on vc.id = cvp.vendor_company_id
   and vc.status = 'active'
  join public.vendor_coverage_states vcs
    on vcs.vendor_profile_id = cvp.id
   and vcs.company_id = cvp.vendor_company_id
   and vcs.state_code = v_order_state
  join public.vendor_coverage_counties vcc
    on vcc.vendor_profile_id = cvp.id
   and vcc.company_id = cvp.vendor_company_id
   and vcc.state_code = v_order_state
   and lower(btrim(vcc.county_name)) = lower(btrim(v_order_county))
  join public.vendor_property_types vpt
    on vpt.vendor_profile_id = cvp.id
   and vpt.company_id = cvp.vendor_company_id
   and vpt.property_type = v_order_property_type
  join public.vendor_assignment_types vat
    on vat.vendor_profile_id = cvp.id
   and vat.company_id = cvp.vendor_company_id
   and vat.assignment_type = v_order_assignment_type
  where cvp.owner_company_id = v_company_id
    and cvp.vendor_status = 'active'
  order by vc.name asc, cvp.id asc;
end;
$$;

revoke all on function public.amc_vendor_coverage_assignment_type_from_order(text) from public, anon, authenticated;
revoke all on function public.rpc_get_matching_vendors_for_order(uuid) from public, anon;

grant execute on function public.amc_vendor_coverage_assignment_type_from_order(text) to service_role;
grant execute on function public.rpc_get_matching_vendors_for_order(uuid) to authenticated, service_role;

comment on function public.rpc_get_matching_vendors_for_order(uuid) is
  'Vendor Coverage Engine V1C deterministic matching RPC. Requires current-company membership, vendors.read, and readable order scope. Returns only active vendors whose normalized V1A coverage exactly matches order state, county, property type, and report-derived assignment type. Does not rank, score, recommend, create bid requests, mutate procurement, or automate assignments.';

commit;
