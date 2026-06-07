begin;

create extension if not exists "pgcrypto";

create or replace function public.rpc_vendor_workspace_available_work()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_vendor_company_id uuid := public.current_company_id();
  v_due_soon_window interval := interval '48 hours';
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

  with available_rows as (
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
        when br.response_due_at is not null and br.response_due_at < now() then 'overdue'
        when br.response_due_at is not null and br.response_due_at <= now() + v_due_soon_window then 'due_soon'
        when brr.status = 'viewed' then 'viewed'
        else 'available'
      end as status,
      br.response_due_at as bid_due_at,
      br.desired_vendor_due_at as requested_due_date,
      null::integer as requested_turn_time_days,
      o.order_number,
      coalesce(nullif(o.property_address, ''), nullif(o.address, '')) as property_address,
      o.city,
      o.state,
      coalesce(nullif(o.postal_code, ''), nullif(o.zip, '')) as postal_code,
      o.county,
      o.property_type,
      o.report_type,
      owner_company.name as owner_company_name,
      br.created_at
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
      and br.status in ('sent', 'partially_responded')
      and br.status not in ('closed', 'cancelled', 'expired')
      and brr.status in ('pending', 'sent', 'viewed')
      and response.id is null
      and coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'work_key', available_rows.work_key,
        'status', available_rows.status,
        'bid_due_at', available_rows.bid_due_at,
        'requested_due_date', available_rows.requested_due_date,
        'requested_turn_time_days', available_rows.requested_turn_time_days,
        'order', jsonb_build_object(
          'order_number', available_rows.order_number,
          'property_address', available_rows.property_address,
          'city', available_rows.city,
          'state', available_rows.state,
          'postal_code', available_rows.postal_code,
          'county', available_rows.county,
          'property_type', available_rows.property_type,
          'report_type', available_rows.report_type
        ),
        'owner', jsonb_build_object(
          'company_name', available_rows.owner_company_name
        ),
        'summary', jsonb_build_object(
          'scope', null,
          'complexity', '[]'::jsonb,
          'documents_available', 0
        )
      )
      order by
        case available_rows.status
          when 'overdue' then 1
          when 'due_soon' then 2
          when 'viewed' then 3
          else 4
        end,
        available_rows.bid_due_at asc nulls last,
        available_rows.created_at desc
    ),
    '[]'::jsonb
  )
    into v_items
    from available_rows;

  return jsonb_build_object(
    'ok', true,
    'items', coalesce(v_items, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.rpc_vendor_workspace_available_work() from public, anon;
grant execute on function public.rpc_vendor_workspace_available_work() to authenticated, service_role;

comment on function public.rpc_vendor_workspace_available_work() is
  'AMC-9C.2 backend-only authenticated Vendor Workspace Available Work list. Requires vendor_bids.read, scopes rows to order_vendor_bid_request_recipients.vendor_company_id = current_company_id(), includes only open respondable AMC-scoped bid recipient rows without submitted responses, returns opaque work_key values plus vendor-safe order/owner/list summary fields, and does not mutate bids, responses, orders, public token flows, routes, navigation, shared order APIs, or owner-side bid APIs.';

commit;
