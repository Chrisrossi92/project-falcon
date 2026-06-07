begin;

create extension if not exists "pgcrypto";

create or replace function public.rpc_vendor_workspace_assigned_order_detail(p_assignment_work_key text)
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
  v_item jsonb;
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

  if p_assignment_work_key is null
     or p_assignment_work_key !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object(
      'ok', false,
      'error', 'assigned_order_unavailable'
    );
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
      o.id as scoped_order_row_id,
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
      oca.review_due_at,
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
      nullif(oca.handoff_payload #>> '{scope,summary}', '') as scope_summary,
      nullif(btrim(oca.instructions), '') as vendor_instructions,
      nullif(oca.submission_payload->>'note', '') as submitted_report_note,
      nullif(oca.submission_payload #>> '{resubmission,response_note}', '') as resubmission_note,
      nullif(oca.submission_payload #>> '{resubmission,resubmitted_at}', '')::timestamptz as resubmitted_at,
      case
        when jsonb_typeof(oca.submission_payload -> 'document_keys') = 'array'
          then jsonb_array_length(oca.submission_payload -> 'document_keys')
        else 0
      end as submitted_report_document_count,
      case
        when oca.status = 'revision_requested' then coalesce(
          nullif(oca.submission_payload #>> '{revision,summary}', ''),
          nullif(oca.submission_payload #>> '{revision,instructions}', ''),
          nullif(oca.submission_payload #>> '{revision,note}', '')
        )
        else null
      end as revision_summary
      ,
      case
        when oca.status = 'revision_requested' then coalesce(
          nullif(oca.submission_payload #>> '{revision,instructions}', ''),
          nullif(oca.submission_payload #>> '{revision,summary}', ''),
          nullif(oca.submission_payload #>> '{revision,note}', '')
        )
        else null
      end as revision_instructions,
      case
        when oca.status = 'revision_requested' then coalesce(
          nullif(oca.submission_payload #>> '{revision,requested_at}', '')::timestamptz,
          nullif(oca.submission_payload #>> '{revision_requested_at}', '')::timestamptz,
          oca.updated_at
        )
        else null
      end as revision_requested_at,
      case
        when oca.status = 'revision_requested' then coalesce(
          nullif(oca.submission_payload #>> '{revision,due_at}', '')::timestamptz,
          oca.review_due_at,
          oca.due_at
        )
        else null
      end as revision_due_at,
      case
        when oca.status = 'revision_requested' then coalesce(
          nullif(oca.submission_payload #>> '{revision,requested_by_label}', ''),
          owner_company.name,
          'AMC coordinator'
        )
        else null
      end as revision_requested_by_label
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
  ),
  selected_assignment as (
    select *
      from assignment_rows
     where assignment_work_key = p_assignment_work_key
     limit 1
  ),
  vendor_documents as (
    select
      jsonb_build_object(
        'document_key',
          encode(
            extensions.digest(
              concat_ws(
                ':',
                'vendor_assignment_document_v1',
                od.id::text,
                selected_assignment.assignment_work_key
              ),
              'sha256'
            ),
            'hex'
          ),
        'category', od.category,
        'title', coalesce(nullif(od.title, ''), nullif(od.file_name, ''), 'Document'),
        'file_name', od.file_name,
        'mime_type', od.mime_type,
        'file_size', od.file_size,
        'created_at', od.created_at
      ) as document
    from selected_assignment
    join public.order_documents od
      on od.order_id = selected_assignment.scoped_order_row_id
     and od.status = 'active'
     and od.visibility_scope = 'vendor'
    order by od.created_at desc
  )
  select jsonb_strip_nulls(
    jsonb_build_object(
      'assignment_work_key', selected_assignment.assignment_work_key,
      'work_key', selected_assignment.assignment_work_key,
      'assignment_status', selected_assignment.assignment_status,
      'status_label', selected_assignment.status_label,
      'accepted_at', selected_assignment.accepted_at,
      'started_at', selected_assignment.started_at,
      'submitted_at', selected_assignment.submitted_at,
      'completed_at', selected_assignment.completed_at,
      'due_at', selected_assignment.due_at,
      'review_due_at', selected_assignment.review_due_at,
      'inspection_status', selected_assignment.inspection_status,
      'report_submitted', selected_assignment.report_submitted,
      'next_action_label', selected_assignment.next_action_label,
      'needs_attention', selected_assignment.needs_attention,
      'order', jsonb_build_object(
        'order_number', selected_assignment.order_number,
        'property_address', selected_assignment.property_address,
        'city', selected_assignment.city,
        'state', selected_assignment.state,
        'postal_code', selected_assignment.postal_code,
        'county', selected_assignment.county,
        'property_type', selected_assignment.property_type,
        'report_type', selected_assignment.report_type
      ),
      'owner', jsonb_build_object(
        'company_name', selected_assignment.owner_company_name
      ),
      'summary', jsonb_build_object(
        'scope', selected_assignment.scope_summary,
        'documents_available', coalesce((select count(*) from vendor_documents), 0)
      ),
      'instructions', selected_assignment.vendor_instructions,
      'timeline', jsonb_build_object(
        'accepted_at', selected_assignment.accepted_at,
        'started_at', selected_assignment.started_at,
        'submitted_at', selected_assignment.submitted_at,
        'completed_at', selected_assignment.completed_at
      ),
      'report_submission', jsonb_build_object(
        'status',
          case
            when selected_assignment.submitted_at is not null then 'submitted'
            else 'not_submitted'
          end,
        'submitted_at', selected_assignment.submitted_at,
        'resubmitted_at', selected_assignment.resubmitted_at,
        'note', coalesce(selected_assignment.resubmission_note, selected_assignment.submitted_report_note),
        'document_count', selected_assignment.submitted_report_document_count
      ),
      'revision',
        case
          when selected_assignment.assignment_status = 'revision_requested' then
            jsonb_build_object(
              'status', 'revision_requested',
              'requested_at', selected_assignment.revision_requested_at,
              'summary', selected_assignment.revision_summary,
              'instructions', selected_assignment.revision_instructions,
              'requested_by_label', selected_assignment.revision_requested_by_label,
              'due_at', selected_assignment.revision_due_at,
              'prior_submission', jsonb_build_object(
                'submitted_at', selected_assignment.submitted_at,
                'note', selected_assignment.submitted_report_note,
                'document_count', selected_assignment.submitted_report_document_count
              )
            )
          else null
        end,
      'documents', coalesce(
        (select jsonb_agg(vendor_documents.document) from vendor_documents),
        '[]'::jsonb
      )
    )
  )
    into v_item
    from selected_assignment;

  if v_item is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'assigned_order_unavailable'
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'item', v_item
  );
end;
$$;

revoke all on function public.rpc_vendor_workspace_assigned_order_detail(text) from public, anon;
grant execute on function public.rpc_vendor_workspace_assigned_order_detail(text) to authenticated, service_role;

comment on function public.rpc_vendor_workspace_assigned_order_detail(text) is
  'AMC-10B/10G authenticated Vendor Workspace assigned order detail. Requires vendor_assignments.read, scopes by opaque assignment_work_key to current_company_id(), active AMC vendor relationship/profile rows, vendor_appraisal assignments, and AMC-scoped orders. Returns vendor-safe assignment status, property, owner, timeline, scope, instructions, submitted report summary, revision request/resubmission summary, and vendor-visible document metadata only; it does not expose raw ids, storage paths, client fees, AMC margins, internal notes, procurement/candidate data, shared order routes, or owner-side assignment APIs.';

commit;
