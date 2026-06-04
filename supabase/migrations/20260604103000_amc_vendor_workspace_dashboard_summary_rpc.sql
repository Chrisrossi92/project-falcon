begin;

create or replace function public.rpc_vendor_workspace_dashboard_summary()
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
  v_counts jsonb;
  v_actions jsonb;
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

  if not public.current_app_user_has_permission('vendor_workspace.view') then
    raise exception 'vendor_workspace_view_permission_required'
      using errcode = '42501';
  end if;

  with
  vendor_bid_rows as (
    select
      brr.id,
      brr.status as recipient_status,
      br.status as request_status,
      br.response_due_at,
      br.desired_vendor_due_at,
      response.submitted_at as response_submitted_at,
      response.selected_at as response_selected_at,
      o.order_number,
      coalesce(nullif(o.property_address, ''), nullif(o.address, '')) as property_address,
      o.city,
      o.state,
      coalesce(nullif(o.postal_code, ''), nullif(o.zip, '')) as postal_code,
      o.county,
      o.property_type,
      o.report_type,
      owner_company.name as owner_company_name
    from public.order_vendor_bid_request_recipients brr
    join public.order_vendor_bid_requests br
      on br.id = brr.bid_request_id
    join public.orders o
      on o.id = br.order_id
    join public.companies owner_company
      on owner_company.id = br.company_id
    join public.company_relationships cr
      on cr.id = brr.relationship_id
     and cr.source_company_id = br.company_id
     and cr.target_company_id = brr.vendor_company_id
     and cr.relationship_type = 'amc_vendor'
     and cr.status = 'active'
    left join public.order_vendor_bid_responses response
      on response.recipient_id = brr.id
    where brr.vendor_company_id = v_vendor_company_id
      and coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'
  ),
  available_work_rows as (
    select *
      from vendor_bid_rows
     where request_status in ('sent', 'partially_responded')
       and recipient_status in ('pending', 'sent', 'viewed')
       and response_submitted_at is null
  ),
  pending_bid_rows as (
    select *
      from vendor_bid_rows
     where response_submitted_at is not null
       and response_selected_at is null
       and recipient_status = 'responded'
       and request_status not in ('cancelled', 'expired')
  ),
  vendor_assignment_rows as (
    select
      oca.id,
      oca.status,
      oca.due_at,
      oca.review_due_at,
      oca.expires_at,
      oca.accepted_at,
      oca.started_at,
      o.order_number,
      coalesce(nullif(o.property_address, ''), nullif(o.address, '')) as property_address,
      o.city,
      o.state,
      coalesce(nullif(o.postal_code, ''), nullif(o.zip, '')) as postal_code,
      o.county,
      o.property_type,
      o.report_type,
      owner_company.name as owner_company_name
    from public.order_company_assignments oca
    join public.orders o
      on o.id = oca.order_id
    join public.companies owner_company
      on owner_company.id = oca.owner_company_id
    join public.company_relationships cr
      on cr.id = oca.relationship_id
     and cr.source_company_id = oca.owner_company_id
     and cr.target_company_id = oca.assigned_company_id
     and cr.relationship_type = 'amc_vendor'
     and cr.status = 'active'
    where oca.assigned_company_id = v_vendor_company_id
      and oca.assignment_type = 'vendor_appraisal'
      and oca.status in ('offered', 'accepted', 'in_progress', 'submitted')
      and coalesce(o.company_id, public.default_company_id()) = oca.owner_company_id
      and coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'
  ),
  count_values as (
    select
      (select count(*)::integer from available_work_rows) as available_work,
      (select count(*)::integer from pending_bid_rows) as pending_bids,
      (select count(*)::integer from vendor_assignment_rows where status = 'offered') as assignment_offers,
      (select count(*)::integer from vendor_assignment_rows where status in ('accepted', 'in_progress')) as active_assigned_orders,
      (select count(*)::integer from vendor_assignment_rows where status = 'submitted') as submitted_awaiting_review,
      (
        (select count(*)::integer
           from available_work_rows
          where response_due_at is not null
            and response_due_at <= now() + v_due_soon_window)
        + (select count(*)::integer from vendor_assignment_rows where status = 'offered')
        + (select count(*)::integer from vendor_assignment_rows where status = 'accepted' and started_at is null)
        + (select count(*)::integer
             from vendor_assignment_rows
            where status = 'in_progress'
              and due_at is not null
              and due_at <= now() + v_due_soon_window)
      ) as needs_attention
  )
  select jsonb_build_object(
    'available_work', count_values.available_work,
    'pending_bids', count_values.pending_bids,
    'assignment_offers', count_values.assignment_offers,
    'active_assigned_orders', count_values.active_assigned_orders,
    'submitted_awaiting_review', count_values.submitted_awaiting_review,
    'needs_attention', count_values.needs_attention
  )
    into v_counts
    from count_values;

  with
  vendor_bid_rows as (
    select
      'bid_request'::text as kind,
      'Submit bid'::text as label,
      br.response_due_at as due_at,
      case
        when br.response_due_at is not null and br.response_due_at < now() then 'overdue'
        when br.response_due_at is not null and br.response_due_at <= now() + v_due_soon_window then 'due_soon'
        else 'normal'
      end as priority,
      o.order_number,
      coalesce(nullif(o.property_address, ''), nullif(o.address, '')) as property_address,
      o.city,
      o.state,
      coalesce(nullif(o.postal_code, ''), nullif(o.zip, '')) as postal_code,
      o.county,
      o.property_type,
      o.report_type,
      owner_company.name as owner_company_name,
      10 as kind_rank,
      br.created_at
    from public.order_vendor_bid_request_recipients brr
    join public.order_vendor_bid_requests br
      on br.id = brr.bid_request_id
    join public.orders o
      on o.id = br.order_id
    join public.companies owner_company
      on owner_company.id = br.company_id
    join public.company_relationships cr
      on cr.id = brr.relationship_id
     and cr.source_company_id = br.company_id
     and cr.target_company_id = brr.vendor_company_id
     and cr.relationship_type = 'amc_vendor'
     and cr.status = 'active'
    left join public.order_vendor_bid_responses response
      on response.recipient_id = brr.id
    where brr.vendor_company_id = v_vendor_company_id
      and br.status in ('sent', 'partially_responded')
      and brr.status in ('pending', 'sent', 'viewed')
      and response.submitted_at is null
      and coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'
  ),
  vendor_assignment_rows as (
    select
      case
        when oca.status = 'offered' then 'assignment_offer'
        when oca.status = 'accepted' and oca.started_at is null then 'start_work'
        when oca.status = 'in_progress' then 'submit_report'
        else 'submitted'
      end as kind,
      case
        when oca.status = 'offered' then 'Review assignment offer'
        when oca.status = 'accepted' and oca.started_at is null then 'Start work'
        when oca.status = 'in_progress' then 'Submit report'
        else 'Awaiting review'
      end as label,
      case
        when oca.status = 'offered' then oca.expires_at
        when oca.status in ('accepted', 'in_progress') then oca.due_at
        else oca.review_due_at
      end as due_at,
      case
        when coalesce(
          case
            when oca.status = 'offered' then oca.expires_at
            when oca.status in ('accepted', 'in_progress') then oca.due_at
            else oca.review_due_at
          end,
          now() + interval '100 years'
        ) < now() then 'overdue'
        when coalesce(
          case
            when oca.status = 'offered' then oca.expires_at
            when oca.status in ('accepted', 'in_progress') then oca.due_at
            else oca.review_due_at
          end,
          now() + interval '100 years'
        ) <= now() + v_due_soon_window then 'due_soon'
        else 'normal'
      end as priority,
      o.order_number,
      coalesce(nullif(o.property_address, ''), nullif(o.address, '')) as property_address,
      o.city,
      o.state,
      coalesce(nullif(o.postal_code, ''), nullif(o.zip, '')) as postal_code,
      o.county,
      o.property_type,
      o.report_type,
      owner_company.name as owner_company_name,
      case
        when oca.status = 'offered' then 20
        when oca.status = 'accepted' and oca.started_at is null then 30
        when oca.status = 'in_progress' then 40
        else 50
      end as kind_rank,
      oca.created_at
    from public.order_company_assignments oca
    join public.orders o
      on o.id = oca.order_id
    join public.companies owner_company
      on owner_company.id = oca.owner_company_id
    join public.company_relationships cr
      on cr.id = oca.relationship_id
     and cr.source_company_id = oca.owner_company_id
     and cr.target_company_id = oca.assigned_company_id
     and cr.relationship_type = 'amc_vendor'
     and cr.status = 'active'
    where oca.assigned_company_id = v_vendor_company_id
      and oca.assignment_type = 'vendor_appraisal'
      and (
        oca.status = 'offered'
        or (oca.status = 'accepted' and oca.started_at is null)
        or oca.status in ('in_progress', 'submitted')
      )
      and coalesce(o.company_id, public.default_company_id()) = oca.owner_company_id
      and coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'
  ),
  combined_actions as (
    select * from vendor_bid_rows
    union all
    select * from vendor_assignment_rows
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'kind', action_rows.kind,
        'priority', action_rows.priority,
        'label', action_rows.label,
        'due_at', action_rows.due_at,
        'order', jsonb_build_object(
          'order_number', action_rows.order_number,
          'property_address', action_rows.property_address,
          'city', action_rows.city,
          'state', action_rows.state,
          'postal_code', action_rows.postal_code,
          'county', action_rows.county,
          'property_type', action_rows.property_type,
          'report_type', action_rows.report_type
        ),
        'owner', jsonb_build_object(
          'company_name', action_rows.owner_company_name
        )
      )
      order by
        case action_rows.priority
          when 'overdue' then 1
          when 'due_soon' then 2
          else 3
        end,
        action_rows.due_at asc nulls last,
        action_rows.kind_rank,
        action_rows.created_at desc
    ),
    '[]'::jsonb
  )
    into v_actions
    from (
      select *
        from combined_actions
       order by
        case priority
          when 'overdue' then 1
          when 'due_soon' then 2
          else 3
        end,
        due_at asc nulls last,
        kind_rank,
        created_at desc
       limit 8
    ) action_rows;

  return jsonb_build_object(
    'ok', true,
    'counts', coalesce(
      v_counts,
      jsonb_build_object(
        'available_work', 0,
        'pending_bids', 0,
        'assignment_offers', 0,
        'active_assigned_orders', 0,
        'submitted_awaiting_review', 0,
        'needs_attention', 0
      )
    ),
    'actions', coalesce(v_actions, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.rpc_vendor_workspace_dashboard_summary() from public, anon;
grant execute on function public.rpc_vendor_workspace_dashboard_summary() to authenticated, service_role;

comment on function public.rpc_vendor_workspace_dashboard_summary() is
  'AMC-9B.2 backend-only authenticated Vendor Workspace dashboard summary. Requires vendor_workspace.view, scopes bid rows to order_vendor_bid_request_recipients.vendor_company_id = current_company_id(), scopes assignment rows to order_company_assignments.assigned_company_id = current_company_id(), filters to AMC-scoped orders, and returns counts plus capped safe action summaries without mutating bids, assignments, orders, public token flows, routes, navigation, or shared order APIs.';

commit;
