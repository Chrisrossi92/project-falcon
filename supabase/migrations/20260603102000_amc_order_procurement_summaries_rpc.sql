begin;

create or replace function public.rpc_amc_order_procurement_summaries(
  p_order_ids uuid[]
)
returns table (
  order_id uuid,
  status text,
  label text,
  tone text,
  contacted_count integer,
  responded_count integer,
  selected_vendor_name text,
  response_due_at timestamptz,
  client_due_at timestamptz,
  assignment_status text,
  assignment_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
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

  if not public.current_app_user_has_permission('bid_requests.read') then
    raise exception 'bid_request_read_permission_required'
      using errcode = '42501';
  end if;

  if p_order_ids is null or cardinality(p_order_ids) = 0 then
    return;
  end if;

  return query
  with requested_orders as (
    select distinct unnest(p_order_ids) as id
  ),
  eligible_orders as (
    select o.id
      from requested_orders requested
      join public.orders o
        on o.id = requested.id
     where coalesce(o.company_id, public.default_company_id()) = v_company_id
       and coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'
       and public.current_app_user_can_read_order(o.id)
  ),
  assignment_candidates as (
    select distinct on (oca.order_id)
      oca.order_id,
      oca.id as assignment_id,
      oca.status as assignment_status
    from public.order_company_assignments oca
    join eligible_orders eo
      on eo.id = oca.order_id
   where oca.owner_company_id = v_company_id
     and oca.assignment_type = 'vendor_appraisal'
     and oca.status in ('offered', 'accepted', 'in_progress', 'submitted')
   order by
     oca.order_id,
     case
       when oca.status in ('accepted', 'in_progress', 'submitted') then 1
       when oca.status = 'offered' then 2
       else 3
     end,
     oca.updated_at desc nulls last,
     oca.created_at desc nulls last
  ),
  bid_rollup as (
    select
      br.order_id,
      count(distinct brr.id)::integer as contacted_count,
      (count(distinct brr.id) filter (
        where brr.status in ('responded', 'selected', 'not_selected')
           or response.submitted_at is not null
      ))::integer as responded_count,
      bool_or(br.status not in ('cancelled', 'expired')) as has_active_bid_request,
      bool_or(response.submitted_at is not null) as has_submitted_response,
      max(br.response_due_at) filter (
        where br.status not in ('cancelled', 'expired')
      ) as response_due_at,
      max(br.client_due_at) filter (
        where br.status not in ('cancelled', 'expired')
      ) as client_due_at
    from public.order_vendor_bid_requests br
    join eligible_orders eo
      on eo.id = br.order_id
    left join public.order_vendor_bid_request_recipients brr
      on brr.bid_request_id = br.id
    left join public.order_vendor_bid_responses response
      on response.recipient_id = brr.id
   where br.company_id = v_company_id
   group by br.order_id
  ),
  selected_bid as (
    select distinct on (br.order_id)
      br.order_id,
      coalesce(company.name, brr.vendor_company_id::text) as selected_vendor_name,
      br.response_due_at,
      br.client_due_at
    from public.order_vendor_bid_requests br
    join eligible_orders eo
      on eo.id = br.order_id
    join public.order_vendor_bid_request_recipients brr
      on brr.bid_request_id = br.id
    left join public.order_vendor_bid_responses response
      on response.recipient_id = brr.id
    left join public.companies company
      on company.id = brr.vendor_company_id
   where br.company_id = v_company_id
     and (
       brr.status = 'selected'
       or response.selected_at is not null
     )
   order by
     br.order_id,
     response.selected_at desc nulls last,
     brr.updated_at desc nulls last,
     br.updated_at desc nulls last
  ),
  summarized as (
    select
      eo.id as order_id,
      coalesce(br.contacted_count, 0) as contacted_count,
      coalesce(br.responded_count, 0) as responded_count,
      selected.selected_vendor_name,
      coalesce(selected.response_due_at, br.response_due_at) as response_due_at,
      coalesce(selected.client_due_at, br.client_due_at) as client_due_at,
      assignment.assignment_status,
      assignment.assignment_id,
      case
        when assignment.assignment_status in ('accepted', 'in_progress', 'submitted') then 'assigned'
        when assignment.assignment_status = 'offered' then 'assignment_offered'
        when selected.order_id is not null then 'bid_selected'
        when coalesce(br.has_submitted_response, false) then 'responses_received'
        when coalesce(br.has_active_bid_request, false) then 'bids_requested'
        else 'no_bids'
      end as summary_status
    from eligible_orders eo
    left join assignment_candidates assignment
      on assignment.order_id = eo.id
    left join bid_rollup br
      on br.order_id = eo.id
    left join selected_bid selected
      on selected.order_id = eo.id
  )
  select
    summarized.order_id,
    summarized.summary_status as status,
    case summarized.summary_status
      when 'assigned' then 'Assigned'
      when 'assignment_offered' then 'Assignment Offered'
      when 'bid_selected' then 'Bid Selected'
      when 'responses_received' then 'Responses Received'
      when 'bids_requested' then 'Bids Requested'
      else 'No Bids'
    end as label,
    case summarized.summary_status
      when 'assigned' then 'success'
      when 'assignment_offered' then 'warning'
      when 'bid_selected' then 'success'
      when 'responses_received' then 'info'
      when 'bids_requested' then 'info'
      else 'neutral'
    end as tone,
    summarized.contacted_count,
    summarized.responded_count,
    summarized.selected_vendor_name,
    summarized.response_due_at,
    summarized.client_due_at,
    summarized.assignment_status,
    summarized.assignment_id
  from summarized
  order by summarized.order_id;
end;
$$;

revoke all on function public.rpc_amc_order_procurement_summaries(uuid[]) from public, anon;
grant execute on function public.rpc_amc_order_procurement_summaries(uuid[]) to authenticated, service_role;

comment on function public.rpc_amc_order_procurement_summaries(uuid[]) is
  'AMC-6X.1 backend-only batched AMC procurement summary RPC for Orders list visibility. Requires bid_requests.read, current-company membership, order read authority, and amc_operations order scope. Returns compact bid/assignment procurement state for eligible current-company orders without mutating bid rows, assignment packets, orders, routes, navigation, or /amc/* routes.';

commit;
