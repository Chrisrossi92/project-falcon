begin;

create extension if not exists "pgcrypto";

create or replace function public.rpc_vendor_workspace_resubmit_report(
  p_assignment_work_key text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_vendor_company_id uuid := public.current_company_id();
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_assignment public.order_company_assignments%rowtype;
  v_order public.orders%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_profile public.company_vendor_profiles%rowtype;
  v_resubmitted_at timestamptz := now();
  v_note text;
  v_document_keys jsonb := '[]'::jsonb;
  v_prior_submission jsonb;
  v_submission_payload jsonb;
  v_activity_payload jsonb;
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

  if not public.current_app_user_has_permission('vendor_assignments.progress') then
    raise exception 'vendor_assignments_progress_permission_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('vendor_documents.upload') then
    raise exception 'vendor_documents_upload_permission_required'
      using errcode = '42501';
  end if;

  if p_assignment_work_key is null
     or p_assignment_work_key !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object(
      'ok', false,
      'error', 'assigned_order_unavailable'
    );
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    return jsonb_build_object(
      'ok', false,
      'error', 'report_resubmission_invalid',
      'field_errors', jsonb_build_object(
        'payload', 'Report resubmission payload must be an object.'
      )
    );
  end if;

  v_note := nullif(btrim(coalesce(v_payload ->> 'comments', v_payload ->> 'revision_response_note', v_payload ->> 'delivery_note', v_payload ->> 'note', '')), '');

  if v_payload ? 'document_keys' then
    if jsonb_typeof(v_payload -> 'document_keys') <> 'array' then
      return jsonb_build_object(
        'ok', false,
        'error', 'report_resubmission_invalid',
        'field_errors', jsonb_build_object(
          'document_keys', 'Document references must be a list.'
        )
      );
    end if;

    if exists (
      select 1
        from jsonb_array_elements_text(v_payload -> 'document_keys') as document_key(value)
       where document_key.value !~ '^[0-9a-f]{64}$'
    ) then
      return jsonb_build_object(
        'ok', false,
        'error', 'report_resubmission_invalid',
        'field_errors', jsonb_build_object(
          'document_keys', 'Document references are invalid.'
        )
      );
    end if;

    v_document_keys := v_payload -> 'document_keys';
  end if;

  select oca.*
    into v_assignment
    from public.order_company_assignments oca
   where encode(
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
         ) = p_assignment_work_key
     and oca.assigned_company_id = v_vendor_company_id
     and oca.assignment_type = 'vendor_appraisal'
   for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error', 'assigned_order_unavailable'
    );
  end if;

  select o.*
    into v_order
    from public.orders o
   where o.id = v_assignment.order_id;

  if not found
     or coalesce(v_order.company_id, public.default_company_id()) is distinct from v_assignment.owner_company_id
     or coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations' then
    return jsonb_build_object(
      'ok', false,
      'error', 'assigned_order_unavailable'
    );
  end if;

  select cr.*
    into v_relationship
    from public.company_relationships cr
   where cr.id = v_assignment.relationship_id;

  if not found
     or v_relationship.source_company_id is distinct from v_assignment.owner_company_id
     or v_relationship.target_company_id is distinct from v_assignment.assigned_company_id
     or v_relationship.relationship_type <> 'amc_vendor'
     or v_relationship.status <> 'active'
     or v_assignment.assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type) then
    return jsonb_build_object(
      'ok', false,
      'error', 'assigned_order_unavailable'
    );
  end if;

  select cvp.*
    into v_profile
    from public.company_vendor_profiles cvp
   where cvp.owner_company_id = v_assignment.owner_company_id
     and cvp.vendor_company_id = v_assignment.assigned_company_id
   order by
     case when cvp.relationship_id = v_assignment.relationship_id then 0 else 1 end,
     cvp.created_at desc
   limit 1;

  if not found
     or v_profile.vendor_status in ('inactive', 'do_not_use')
     or (
       v_profile.relationship_id is not null
       and v_profile.relationship_id is distinct from v_assignment.relationship_id
     ) then
    return jsonb_build_object(
      'ok', false,
      'error', 'assigned_order_unavailable'
    );
  end if;

  if v_assignment.status <> 'revision_requested' then
    return jsonb_build_object(
      'ok', false,
      'error', 'report_resubmission_invalid',
      'status', v_assignment.status,
      'field_errors', jsonb_build_object(
        'action', 'Reports can only be resubmitted when a revision has been requested.'
      )
    );
  end if;

  if jsonb_array_length(v_document_keys) = 0 then
    return jsonb_build_object(
      'ok', false,
      'error', 'report_resubmission_invalid',
      'field_errors', jsonb_build_object(
        'document_keys', 'Upload at least one revised report file before resubmitting.'
      )
    );
  end if;

  if exists (
    select 1
      from jsonb_array_elements_text(v_document_keys) as document_key(value)
     where not exists (
       select 1
         from public.order_documents od
        where od.order_id = v_assignment.order_id
          and od.company_id = v_assignment.owner_company_id
          and od.category = 'final_report'
          and od.visibility_scope = 'vendor'
          and od.status = 'active'
          and encode(
                extensions.digest(
                  concat_ws(
                    ':',
                    'vendor_assignment_document_v1',
                    od.id::text,
                    p_assignment_work_key
                  ),
                  'sha256'
                ),
                'hex'
              ) = document_key.value
     )
  ) then
    return jsonb_build_object(
      'ok', false,
      'error', 'report_resubmission_invalid',
      'field_errors', jsonb_build_object(
        'document_keys', 'Uploaded revised report documents are invalid or unavailable.'
      )
    );
  end if;

  v_prior_submission := v_assignment.submission_payload;
  v_submission_payload := jsonb_strip_nulls(jsonb_build_object(
    'note', v_note,
    'submitted_via', 'vendor_workspace',
    'document_keys', v_document_keys,
    'resubmission', jsonb_build_object(
      'resubmitted_at', v_resubmitted_at,
      'response_note', v_note,
      'document_keys', v_document_keys,
      'prior_submission', v_prior_submission,
      'responded_via', 'vendor_workspace'
    )
  ));

  update public.order_company_assignments
     set status = 'submitted',
         submitted_at = v_resubmitted_at,
         submission_payload = v_submission_payload
   where id = v_assignment.id
   returning * into v_assignment;

  v_activity_payload := jsonb_strip_nulls(jsonb_build_object(
    'responded_via', 'vendor_workspace',
    'assignment_work_key', p_assignment_work_key,
    'has_note', v_note is not null,
    'document_reference_count', jsonb_array_length(v_document_keys),
    'resubmitted_at', v_assignment.submitted_at
  ));

  perform public.log_order_company_assignment_event(
    v_assignment.id,
    'assignment.resubmitted',
    v_actor_user_id,
    v_vendor_company_id,
    'Assignment resubmitted',
    v_activity_payload
  );
  perform public.notify_order_company_assignment_event(
    v_assignment.id,
    'assignment.resubmitted',
    v_actor_user_id,
    v_vendor_company_id,
    v_activity_payload
  );

  return jsonb_build_object(
    'ok', true,
    'status', 'submitted',
    'message', 'Report resubmitted.',
    'resubmitted_at', v_assignment.submitted_at,
    'submitted_at', v_assignment.submitted_at
  );
end;
$$;

revoke all on function public.rpc_vendor_workspace_resubmit_report(text, jsonb) from public, anon;
grant execute on function public.rpc_vendor_workspace_resubmit_report(text, jsonb) to authenticated, service_role;

comment on function public.rpc_vendor_workspace_resubmit_report(text, jsonb) is
  'AMC-10G authenticated Vendor Workspace revision resubmission action. Requires vendor_assignments.progress and vendor_documents.upload, resolves only opaque assignment_work_key values scoped to current_company_id(), active AMC vendor relationship/profile rows, vendor_appraisal assignments, AMC-scoped orders, and revision_requested assignment state. Reuses existing report upload/document metadata and order_company_assignments lifecycle by moving the assignment back to submitted, stamping submitted_at/resubmitted_at in payload, and logging/notifying assignment.resubmitted without exposing raw ids, storage paths, shared order routes, client fees, AMC margins, internal notes, procurement/candidate data, owner-side APIs, or token route behavior.';

commit;
