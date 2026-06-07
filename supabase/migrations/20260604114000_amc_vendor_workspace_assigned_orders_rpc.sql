begin;

create extension if not exists "pgcrypto";

create or replace function public.rpc_vendor_workspace_assigned_orders()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_vendor_company_id uuid := public.current_company_id();
  v_due_soon_window interval := interval '72 hours';
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

  if not public.current_app_user_has_permission('vendor_assignments.read') then
    raise exception 'vendor_assignments_read_permission_required'
      using errcode = '42501';
  end if;

  with assignment_rows as (
    select
      encode(
        extensions.digest(
          concat_ws(
            ':',
            'vendor_assignment_work_v1',
            oca.id::text,
            oca.assigned_company_id::text
          ),
          'sha256'
        ),
        'hex'
      ) as assignment_work_key,
      case
        when oca.status = 'accepted' and oca.started_at is null then 'accepted_not_started'
        when oca.status = 'in_progress'
             and nullif(oca.handoff_payload #>> '{inspection,status}', '') is not null then 'inspection_scheduled'
        when oca.status = 'in_progress' then 'in_progress'
        when oca.status = 'submitted' then 'report_submitted'
        when oca.status = 'revision_requested' then 'revision_requested'
        when oca.status = 'completed' then 'completed_closed'
        else 'awaiting_review'
      end as assignment_status,
      case
        when oca.status = 'accepted' and oca.started_at is null then 'Accepted / Not Started'
        when oca.status = 'in_progress'
             and nullif(oca.handoff_payload #>> '{inspection,status}', '') is not null then 'Inspection Scheduled'
        when oca.status = 'in_progress' then 'In Progress'
        when oca.status = 'submitted' then 'Report Submitted'
        when oca.status = 'revision_requested' then 'Revision Requested'
        when oca.status = 'completed' then 'Completed / Closed'
        else 'Awaiting Review'
      end as status_label,
      case
        when oca.status = 'accepted' and oca.started_at is null then 'Start Work'
        when oca.status = 'in_progress' then 'Submit Report'
        when oca.status = 'submitted' then 'Awaiting Review'
        when oca.status = 'revision_requested' then 'Review Revision Request'
        when oca.status = 'completed' then 'Closed'
        else 'Review Assignment'
      end as next_action_label,
      case
        when oca.status in ('accepted', 'in_progress') then oca.due_at
        else oca.review_due_at
      end as due_at,
      oca.accepted_at,
      oca.started_at,
      oca.submitted_at,
      oca.completed_at,
      nullif(oca.handoff_payload #>> '{inspection,status}', '') as inspection_status,
      oca.status = 'submitted' as report_submitted,
      (
        (oca.status = 'accepted' and oca.started_at is null)
        or oca.status = 'revision_requested'
        or (
          oca.status in ('accepted', 'in_progress')
          and oca.due_at is not null
          and oca.due_at <= now() + v_due_soon_window
        )
      ) as needs_attention,
      o.order_number,
      coalesce(nullif(o.property_address, ''), nullif(o.address, '')) as property_address,
      o.city,
      o.state,
      coalesce(nullif(o.postal_code, ''), nullif(o.zip, '')) as postal_code,
      o.county,
      o.property_type,
      o.report_type,
      owner_company.name as owner_company_name,
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
      and oca.status in ('accepted', 'in_progress', 'submitted', 'revision_requested', 'completed')
      and coalesce(o.company_id, public.default_company_id()) = oca.owner_company_id
      and coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'
      and exists (
        select 1
          from public.company_vendor_profiles cvp
         where cvp.owner_company_id = oca.owner_company_id
           and cvp.vendor_company_id = oca.assigned_company_id
           and (
             cvp.relationship_id is null
             or cvp.relationship_id = oca.relationship_id
           )
           and cvp.vendor_status not in ('inactive', 'do_not_use')
      )
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'assignment_work_key', assignment_rows.assignment_work_key,
        'work_key', assignment_rows.assignment_work_key,
        'assignment_status', assignment_rows.assignment_status,
        'status_label', assignment_rows.status_label,
        'accepted_at', assignment_rows.accepted_at,
        'started_at', assignment_rows.started_at,
        'submitted_at', assignment_rows.submitted_at,
        'completed_at', assignment_rows.completed_at,
        'due_at', assignment_rows.due_at,
        'inspection_status', assignment_rows.inspection_status,
        'report_submitted', assignment_rows.report_submitted,
        'next_action_label', assignment_rows.next_action_label,
        'needs_attention', assignment_rows.needs_attention,
        'order', jsonb_build_object(
          'order_number', assignment_rows.order_number,
          'property_address', assignment_rows.property_address,
          'city', assignment_rows.city,
          'state', assignment_rows.state,
          'postal_code', assignment_rows.postal_code,
          'county', assignment_rows.county,
          'property_type', assignment_rows.property_type,
          'report_type', assignment_rows.report_type
        ),
        'owner', jsonb_build_object(
          'company_name', assignment_rows.owner_company_name
        )
      )
      order by
        case
          when assignment_rows.needs_attention then 1
          when assignment_rows.assignment_status in ('accepted_not_started', 'in_progress', 'inspection_scheduled') then 2
          when assignment_rows.assignment_status in ('report_submitted', 'awaiting_review') then 3
          else 4
        end,
        assignment_rows.due_at asc nulls last,
        assignment_rows.created_at desc
    ),
    '[]'::jsonb
  )
    into v_items
    from assignment_rows;

  return jsonb_build_object(
    'ok', true,
    'items', coalesce(v_items, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.rpc_vendor_workspace_assigned_orders() from public, anon;
grant execute on function public.rpc_vendor_workspace_assigned_orders() to authenticated, service_role;

comment on function public.rpc_vendor_workspace_assigned_orders() is
  'AMC-10A authenticated Vendor Workspace assigned orders queue. Requires vendor_assignments.read, scopes rows to order_company_assignments.assigned_company_id = current_company_id(), active AMC vendor relationship/profile rows, vendor_appraisal assignments, and AMC-scoped orders. Returns opaque assignment_work_key values plus vendor-safe order, owner, assignment status, due date, next action, and attention fields without exposing raw ids, storage paths, client fees, AMC margins, internal notes, candidate scoring, shared order routes, or owner-side procurement APIs.';

commit;
