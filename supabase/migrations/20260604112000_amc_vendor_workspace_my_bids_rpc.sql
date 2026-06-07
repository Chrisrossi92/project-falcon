begin;

create extension if not exists "pgcrypto";

create or replace function public.rpc_vendor_workspace_my_bids()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_vendor_company_id uuid := public.current_company_id();
  v_items jsonb;
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

  if not public.current_app_user_has_permission('vendor_bids.read') then
    raise exception 'vendor_bids_read_permission_required'
      using errcode = '42501';
  end if;

  with bid_rows as (
    select
      encode(
        extensions.digest(
          concat_ws(
            ':',
            'vendor_available_work_v1',
            brr.id::text,
            brr.vendor_company_id::text
          ),
          'sha256'
        ),
        'hex'
      ) as work_key,
      case
        when response.selected_at is not null or brr.status = 'selected' then 'selected'
        when brr.status = 'not_selected' then 'not_selected'
        when brr.status = 'declined' then 'passed'
        when br.status = 'expired' or brr.status = 'expired' then 'expired'
        when response.submitted_at is not null or brr.status = 'responded' then 'submitted'
        else null
      end as bid_status,
      case
        when response.selected_at is not null or brr.status = 'selected' then 'selected'
        when brr.status = 'not_selected' then 'not_selected'
        else null
      end as selection_outcome,
      coalesce(response.submitted_at, brr.responded_at) as submitted_at,
      brr.declined_at,
      coalesce(brr.expired_at, case when br.status = 'expired' then br.updated_at else null end) as expired_at,
      br.response_due_at as bid_due_at,
      br.desired_vendor_due_at as requested_due_date,
      null::integer as requested_turn_time_days,
      response.fee_amount,
      response.currency,
      response.turn_time_days,
      response.proposed_due_at,
      response.comments as bid_comments,
      brr.metadata ->> 'decline_reason' as decline_reason,
      brr.metadata ->> 'decline_comments' as decline_comments,
      o.order_number,
      coalesce(nullif(o.property_address, ''), nullif(o.address, '')) as property_address,
      o.city,
      o.state,
      coalesce(nullif(o.postal_code, ''), nullif(o.zip, '')) as postal_code,
      o.county,
      o.property_type,
      o.report_type,
      owner_company.name as owner_company_name,
      greatest(
        coalesce(response.submitted_at, '-infinity'::timestamptz),
        coalesce(brr.declined_at, '-infinity'::timestamptz),
        coalesce(brr.expired_at, '-infinity'::timestamptz),
        coalesce(response.selected_at, '-infinity'::timestamptz),
        coalesce(brr.updated_at, '-infinity'::timestamptz),
        coalesce(br.updated_at, '-infinity'::timestamptz)
      ) as sort_at
    from public.order_vendor_bid_request_recipients brr
    join public.order_vendor_bid_requests br
      on br.id = brr.bid_request_id
    join public.orders o
      on o.id = br.order_id
    join public.company_relationships cr
      on cr.id = brr.relationship_id
     and cr.source_company_id = br.company_id
     and cr.target_company_id = brr.vendor_company_id
     and cr.relationship_type = 'amc_vendor'
     and cr.status = 'active'
    join public.company_vendor_profiles cvp
      on cvp.id = brr.vendor_profile_id
     and cvp.owner_company_id = br.company_id
     and cvp.vendor_company_id = brr.vendor_company_id
     and (
       cvp.relationship_id is null
       or cvp.relationship_id = brr.relationship_id
     )
     and cvp.vendor_status not in ('inactive', 'do_not_use')
    join public.companies owner_company
      on owner_company.id = br.company_id
    left join public.order_vendor_bid_responses response
      on response.recipient_id = brr.id
     and response.submitted_at is not null
    where brr.vendor_company_id = v_vendor_company_id
      and coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'
      and (
        response.id is not null
        or brr.status in ('responded', 'declined', 'selected', 'not_selected', 'expired')
        or br.status = 'expired'
      )
  )
  select coalesce(
    jsonb_agg(
      jsonb_strip_nulls(jsonb_build_object(
        'work_key', bid_rows.work_key,
        'bid_status', bid_rows.bid_status,
        'selection_outcome', bid_rows.selection_outcome,
        'submitted_at', bid_rows.submitted_at,
        'declined_at', bid_rows.declined_at,
        'expired_at', bid_rows.expired_at,
        'bid_due_at', bid_rows.bid_due_at,
        'requested_due_date', bid_rows.requested_due_date,
        'requested_turn_time_days', bid_rows.requested_turn_time_days,
        'order', jsonb_build_object(
          'order_number', bid_rows.order_number,
          'property_address', bid_rows.property_address,
          'city', bid_rows.city,
          'state', bid_rows.state,
          'postal_code', bid_rows.postal_code,
          'county', bid_rows.county,
          'property_type', bid_rows.property_type,
          'report_type', bid_rows.report_type
        ),
        'owner', jsonb_build_object(
          'company_name', bid_rows.owner_company_name
        ),
        'bid', jsonb_strip_nulls(jsonb_build_object(
          'fee_amount', bid_rows.fee_amount,
          'currency', bid_rows.currency,
          'turn_time_days', bid_rows.turn_time_days,
          'proposed_due_at', bid_rows.proposed_due_at,
          'comments', bid_rows.bid_comments
        )),
        'decline', jsonb_strip_nulls(jsonb_build_object(
          'reason', bid_rows.decline_reason,
          'comments', bid_rows.decline_comments
        ))
      ))
      order by bid_rows.sort_at desc nulls last
    ),
    '[]'::jsonb
  )
    into v_items
    from bid_rows
   where bid_rows.bid_status is not null;

  return jsonb_build_object(
    'ok', true,
    'items', coalesce(v_items, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.rpc_vendor_workspace_my_bids() from public, anon;
grant execute on function public.rpc_vendor_workspace_my_bids() to authenticated, service_role;

comment on function public.rpc_vendor_workspace_my_bids() is
  'AMC-9E authenticated Vendor Workspace My Bids history. Requires vendor_bids.read, scopes rows to the current vendor company, returns submitted, passed, selected, not-selected, and expired AMC-scoped bid history with opaque work keys and vendor-safe fields only, and does not expose raw ids, competing bids, internal notes, shared order APIs, or owner-side procurement APIs.';

commit;
