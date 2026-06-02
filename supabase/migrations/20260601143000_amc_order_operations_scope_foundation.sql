begin;

alter table public.orders
  add column if not exists operations_scope text default 'internal_operations';

update public.orders
   set operations_scope = 'internal_operations'
 where operations_scope is null;

alter table public.orders
  alter column operations_scope set default 'internal_operations',
  alter column operations_scope set not null;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conrelid = 'public.orders'::regclass
       and conname = 'orders_operations_scope_valid'
  ) then
    alter table public.orders
      add constraint orders_operations_scope_valid
      check (operations_scope in ('internal_operations', 'amc_operations'));
  end if;
end;
$$;

create index if not exists idx_orders_company_operations_scope
  on public.orders (company_id, operations_scope);

comment on column public.orders.operations_scope is
  'AMC-6H compliance-sensitive operational lane. internal_operations orders use internal staff/appraiser workflow; amc_operations orders use AMC/vendor-network workflow. Scope must be explicit and must not be inferred from UI mode.';

comment on constraint orders_operations_scope_valid on public.orders is
  'AMC-6H allows only internal_operations and amc_operations. Hybrid scope remains deferred.';

create or replace view public.v_orders_frontend_v4 as
select
  o.id,
  o.id as order_id,
  o.company_id,
  o.order_number,
  o.order_number as order_no,

  coalesce(c.name, o.manual_client, o.manual_client_name) as client_name,
  o.client_id,
  o.amc_id,
  o.managing_amc_id,
  coalesce(mamc.name, amc.name) as amc_name,
  coalesce(o.appraiser_id, o.assigned_to) as assigned_appraiser_id,
  coalesce(o.manual_appraiser, ua.display_name, ua.full_name, ua.name) as assigned_appraiser_name,
  o.assigned_to,
  o.appraiser_id,
  o.reviewer_id,
  coalesce(o.manual_appraiser, ua.display_name, ua.full_name, ua.name) as appraiser_name,
  coalesce(ur.display_name, ur.full_name, ur.name) as reviewer_name,
  coalesce(ua.color, ua.display_color) as appraiser_color,
  coalesce(ur.color, ur.display_color) as reviewer_color,

  coalesce(o.property_address, o.address) as address_line1,
  coalesce(o.property_address, o.address) as address,
  coalesce(o.order_number, o.title) as display_title,
  coalesce(o.property_address, o.address) as display_subtitle,
  o.city,
  o.state,
  coalesce(o.postal_code, o.zip) as postal_code,
  coalesce(o.postal_code, o.zip) as zip,
  o.property_type,
  o.report_type,

  coalesce(o.fee_amount, o.base_fee) as fee_amount,
  coalesce(o.fee_amount, o.base_fee) as fee,
  o.base_fee,
  o.appraiser_fee,
  coalesce(o.split_pct, o.appraiser_split) as split_pct,

  coalesce(
    o.site_visit_at,
    (o.site_visit_date)::timestamptz,
    (o.inspection_date)::timestamptz
  ) as site_visit_at,
  coalesce(
    o.site_visit_at,
    (o.site_visit_date)::timestamptz,
    (o.inspection_date)::timestamptz
  ) as site_visit_date,
  coalesce(
    o.review_due_at,
    (o.due_for_review)::timestamptz,
    (o.review_due_date)::timestamptz
  ) as review_due_at,
  coalesce(
    o.review_due_at,
    (o.due_for_review)::timestamptz,
    (o.review_due_date)::timestamptz
  ) as review_due_date,
  coalesce(
    o.final_due_at,
    o.client_due_at,
    (o.due_to_client)::timestamptz,
    (o.due_date)::timestamptz
  ) as final_due_at,
  coalesce(
    o.final_due_at,
    o.client_due_at,
    (o.due_to_client)::timestamptz,
    (o.due_date)::timestamptz
  ) as final_due_date,
  coalesce(
    o.final_due_at,
    o.client_due_at,
    (o.due_to_client)::timestamptz,
    (o.due_date)::timestamptz
  ) as due_date,

  o.status,
  o.created_at,
  o.updated_at,
  o.date_ordered,
  coalesce(o.is_archived, o.archived, false) as is_archived,
  o.property_contact_name,
  o.property_contact_phone,
  o.entry_contact_name,
  o.entry_contact_phone,
  o.access_notes,
  o.notes,
  a.last_activity_at,
  o.client_contact_id,
  o.client_contact_name,
  o.client_contact_title,
  o.client_contact_email,
  o.client_contact_phone,
  o.operations_scope
from public.orders o
left join public.clients c on c.id = o.client_id
left join public.clients mamc on mamc.id = o.managing_amc_id
left join public.amcs amc on amc.id = o.amc_id
left join public.users ua on ua.id = o.appraiser_id
left join public.users ur on ur.id = o.reviewer_id
left join lateral (
  select max(al.created_at) as last_activity_at
    from public.activity_log al
   where al.order_id = o.id
) a on true;

create or replace view public.v_orders_active_frontend_v4 as
select *
from public.v_orders_frontend_v4
where lower(coalesce(status::text, '')) not in ('completed', 'complete', 'cancelled', 'canceled');

grant select on public.v_orders_frontend_v4 to authenticated;
grant select on public.v_orders_frontend_v4 to anon;
grant select on public.v_orders_active_frontend_v4 to authenticated;
grant select on public.v_orders_active_frontend_v4 to anon;

alter view public.v_orders_frontend_v4 set (security_invoker = false);
alter view public.v_orders_active_frontend_v4 set (security_invoker = false);

comment on view public.v_orders_frontend_v4 is
  'Frontend order projection including AMC-6H operations_scope for compliance-lane separation. This migration projects scope only; mode-aware filtering is deferred.';

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

revoke all on function public.rpc_vendor_assignment_candidates(uuid) from public, anon;
grant execute on function public.rpc_vendor_assignment_candidates(uuid) to authenticated, service_role;

comment on function public.rpc_vendor_assignment_candidates(uuid) is
  'AMC-6H patched read-only Vendor Assignment Candidate RPC. Requires amc_operations order scope before matching. Uses current company, vendors.read, order read authorization, active amc_vendor relationships, active vendor coverage rows, exact geography matching, and exact product slug matching. Does not create assignments, bid requests, notifications, UI routes, order mutations, assignment packet mutations, schema table changes beyond operations_scope foundation, or /amc/* routes.';

create or replace function public.rpc_order_company_assignment_offer(
  p_order_id uuid,
  p_assigned_company_id uuid,
  p_relationship_id uuid,
  p_assignment_type text,
  p_instructions text default null,
  p_terms jsonb default '{}'::jsonb,
  p_handoff_payload jsonb default '{}'::jsonb,
  p_due_at timestamptz default null,
  p_review_due_at timestamptz default null,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_order public.orders%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_assignment_type text := lower(trim(coalesce(p_assignment_type, '')));
  v_assignment_id uuid;
begin
  if v_actor_user_id is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.offer') then
    raise exception 'missing required assignment offer permission'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('relationships.assign_work') then
    raise exception 'missing required relationship work-assignment permission'
      using errcode = '42501';
  end if;

  select *
    into v_order
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'order not found';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) <> v_company_id then
    raise exception 'order is not owned by the current company'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_read_order(p_order_id) then
    raise exception 'order is not readable by current user'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_update_order_row(
    v_order.company_id,
    v_order.appraiser_id,
    v_order.assigned_to,
    v_order.reviewer_id,
    v_order.status
  ) then
    raise exception 'order is not updateable by current user'
      using errcode = '42501';
  end if;

  select *
    into v_relationship
    from public.company_relationships
   where id = p_relationship_id;

  if not found then
    raise exception 'company relationship not found';
  end if;

  if v_relationship.status <> 'active' then
    raise exception 'order-company assignment offer requires an active company relationship';
  end if;

  if v_relationship.source_company_id <> v_company_id then
    raise exception 'relationship source must match current owner company'
      using errcode = '42501';
  end if;

  if v_relationship.source_company_id <> coalesce(v_order.company_id, public.default_company_id()) then
    raise exception 'relationship source must match order owner company'
      using errcode = '42501';
  end if;

  if v_relationship.target_company_id <> p_assigned_company_id then
    raise exception 'relationship target must match assigned company'
      using errcode = '42501';
  end if;

  if v_assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type) then
    raise exception 'assignment type % is incompatible with relationship type %',
      p_assignment_type,
      v_relationship.relationship_type;
  end if;

  if v_assignment_type = 'vendor_appraisal'
     and coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations' then
    raise exception 'order_scope_not_amc_operations'
      using errcode = '42501';
  end if;

  if v_assignment_type = 'vendor_appraisal'
     and exists (
       select 1
         from public.order_company_assignments oca
        where oca.order_id = p_order_id
          and oca.assignment_type = 'vendor_appraisal'
          and oca.status in ('offered', 'accepted', 'in_progress', 'submitted')
     ) then
    raise exception 'order_vendor_assignment_active_exists'
      using errcode = '23505';
  end if;

  insert into public.order_company_assignments (
    order_id,
    owner_company_id,
    assigned_company_id,
    relationship_id,
    assignment_type,
    status,
    instructions,
    terms,
    handoff_payload,
    offered_by_user_id,
    offered_at,
    due_at,
    review_due_at,
    expires_at
  ) values (
    p_order_id,
    coalesce(v_order.company_id, public.default_company_id()),
    p_assigned_company_id,
    p_relationship_id,
    v_assignment_type,
    'offered',
    p_instructions,
    coalesce(p_terms, '{}'::jsonb),
    coalesce(p_handoff_payload, '{}'::jsonb),
    v_actor_user_id,
    now(),
    p_due_at,
    p_review_due_at,
    p_expires_at
  )
  returning id into v_assignment_id;

  perform public.log_order_company_assignment_event(
    v_assignment_id,
    'assignment.offered',
    v_actor_user_id,
    v_company_id,
    'Assignment offered',
    '{}'::jsonb
  );
  perform public.notify_order_company_assignment_event(
    v_assignment_id,
    'assignment.offered',
    v_actor_user_id,
    v_company_id,
    '{}'::jsonb
  );

  return v_assignment_id;
end;
$$;

comment on function public.rpc_order_company_assignment_offer(uuid, uuid, uuid, text, text, jsonb, jsonb, timestamptz, timestamptz, timestamptz) is
  'AMC-6H patched owner-side assignment offer RPC. Requires amc_operations order scope for vendor_appraisal offers and preserves existing non-vendor assignment offer behavior. Keeps order_vendor_assignment_active_exists enforcement for one active vendor_appraisal packet per order. Does not modify core order assignment columns or create UI/routes.';

commit;
