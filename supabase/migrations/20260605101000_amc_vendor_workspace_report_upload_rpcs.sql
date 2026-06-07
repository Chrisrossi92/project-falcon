begin;

create extension if not exists "pgcrypto";

create or replace function public.rpc_vendor_workspace_prepare_report_document_upload(
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
  v_file_name text;
  v_mime_type text;
  v_file_size bigint;
  v_document_role text;
  v_document_id uuid := gen_random_uuid();
  v_storage_bucket text := 'order-documents';
  v_storage_path text;
  v_document public.order_documents%rowtype;
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

  if not public.current_app_user_has_permission('vendor_documents.upload') then
    raise exception 'vendor_documents_upload_permission_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('vendor_assignments.progress') then
    raise exception 'vendor_assignments_progress_permission_required'
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
      'error', 'report_upload_invalid',
      'field_errors', jsonb_build_object(
        'payload', 'Report upload metadata must be an object.'
      )
    );
  end if;

  v_file_name := public.order_document_sanitize_file_name(v_payload ->> 'file_name');
  v_mime_type := nullif(btrim(coalesce(v_payload ->> 'mime_type', '')), '');
  v_document_role := lower(btrim(coalesce(nullif(v_payload ->> 'document_role', ''), 'submitted_report')));

  begin
    v_file_size := nullif(v_payload ->> 'file_size', '')::bigint;
  exception when others then
    return jsonb_build_object(
      'ok', false,
      'error', 'report_upload_invalid',
      'field_errors', jsonb_build_object(
        'file_size', 'File size must be a number.'
      )
    );
  end;

  if v_payload ->> 'file_name' is null
     or btrim(v_payload ->> 'file_name') = '' then
    return jsonb_build_object(
      'ok', false,
      'error', 'report_upload_invalid',
      'field_errors', jsonb_build_object(
        'file_name', 'Choose a report file to upload.'
      )
    );
  end if;

  if v_mime_type is null
     or lower(v_mime_type) <> 'application/pdf' then
    return jsonb_build_object(
      'ok', false,
      'error', 'report_upload_invalid',
      'field_errors', jsonb_build_object(
        'mime_type', 'Upload a PDF report file.'
      )
    );
  end if;

  if v_file_size is null
     or v_file_size <= 0
     or v_file_size > 52428800 then
    return jsonb_build_object(
      'ok', false,
      'error', 'report_upload_invalid',
      'field_errors', jsonb_build_object(
        'file_size', 'Report files must be 50 MB or smaller.'
      )
    );
  end if;

  if v_document_role not in ('report', 'submitted_report') then
    return jsonb_build_object(
      'ok', false,
      'error', 'report_upload_invalid',
      'field_errors', jsonb_build_object(
        'document_role', 'Choose a valid report document type.'
      )
    );
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

  if v_assignment.status not in ('in_progress', 'revision_requested') then
    return jsonb_build_object(
      'ok', false,
      'error', 'report_upload_invalid',
      'status', v_assignment.status,
      'field_errors', jsonb_build_object(
        'action', 'Report files can only be uploaded for in-progress assignments.'
      )
    );
  end if;

  v_storage_path := format(
    'vendor-workspace/assignments/%s/reports/%s/%s',
    p_assignment_work_key,
    v_document_id,
    v_file_name
  );

  insert into public.order_documents (
    id,
    company_id,
    order_id,
    uploaded_by_user_id,
    category,
    title,
    file_name,
    mime_type,
    file_size,
    storage_bucket,
    storage_path,
    visibility_scope,
    status
  )
  values (
    v_document_id,
    v_assignment.owner_company_id,
    v_assignment.order_id,
    v_actor_user_id,
    'final_report',
    case
      when v_document_role = 'submitted_report' then 'Submitted Report'
      else 'Report'
    end,
    v_file_name,
    v_mime_type,
    v_file_size,
    v_storage_bucket,
    v_storage_path,
    'vendor',
    'pending'
  )
  returning * into v_document;

  return jsonb_build_object(
    'ok', true,
    'document', jsonb_build_object(
      'document_key',
        encode(
          extensions.digest(
            concat_ws(
              ':',
              'vendor_assignment_document_v1',
              v_document.id::text,
              p_assignment_work_key
            ),
            'sha256'
          ),
          'hex'
        ),
      'document_role', v_document_role,
      'category', v_document.category,
      'title', v_document.title,
      'file_name', v_document.file_name,
      'mime_type', v_document.mime_type,
      'file_size', v_document.file_size,
      'status', v_document.status,
      'created_at', v_document.created_at
    ),
    'upload', jsonb_build_object(
      'storage_bucket', v_document.storage_bucket,
      'storage_path', v_document.storage_path
    )
  );
end;
$$;

create or replace function public.rpc_vendor_workspace_register_report_document(
  p_assignment_work_key text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_vendor_company_id uuid := public.current_company_id();
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_assignment public.order_company_assignments%rowtype;
  v_order public.orders%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_profile public.company_vendor_profiles%rowtype;
  v_document public.order_documents%rowtype;
  v_document_key text := lower(btrim(coalesce(v_payload ->> 'document_key', '')));
  v_mime_type text := nullif(btrim(coalesce(v_payload ->> 'mime_type', '')), '');
  v_file_size bigint;
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

  if not public.current_app_user_has_permission('vendor_documents.upload') then
    raise exception 'vendor_documents_upload_permission_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('vendor_assignments.progress') then
    raise exception 'vendor_assignments_progress_permission_required'
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
      'error', 'report_upload_invalid',
      'field_errors', jsonb_build_object(
        'payload', 'Report upload metadata must be an object.'
      )
    );
  end if;

  if v_document_key !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object(
      'ok', false,
      'error', 'report_upload_invalid',
      'field_errors', jsonb_build_object(
        'document_key', 'Report document reference is invalid.'
      )
    );
  end if;

  begin
    v_file_size := nullif(v_payload ->> 'file_size', '')::bigint;
  exception when others then
    return jsonb_build_object(
      'ok', false,
      'error', 'report_upload_invalid',
      'field_errors', jsonb_build_object(
        'file_size', 'File size must be a number.'
      )
    );
  end;

  if v_mime_type is not null
     and lower(v_mime_type) <> 'application/pdf' then
    return jsonb_build_object(
      'ok', false,
      'error', 'report_upload_invalid',
      'field_errors', jsonb_build_object(
        'mime_type', 'Upload a PDF report file.'
      )
    );
  end if;

  if v_file_size is not null
     and (v_file_size <= 0 or v_file_size > 52428800) then
    return jsonb_build_object(
      'ok', false,
      'error', 'report_upload_invalid',
      'field_errors', jsonb_build_object(
        'file_size', 'Report files must be 50 MB or smaller.'
      )
    );
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

  if v_assignment.status not in ('in_progress', 'revision_requested') then
    return jsonb_build_object(
      'ok', false,
      'error', 'report_upload_invalid',
      'status', v_assignment.status,
      'field_errors', jsonb_build_object(
        'action', 'Report files can only be registered for in-progress assignments.'
      )
    );
  end if;

  select od.*
    into v_document
    from public.order_documents od
   where od.order_id = v_assignment.order_id
     and od.company_id = v_assignment.owner_company_id
     and od.uploaded_by_user_id = v_actor_user_id
     and od.category = 'final_report'
     and od.visibility_scope = 'vendor'
     and od.status = 'pending'
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
         ) = v_document_key
   limit 1
   for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error', 'report_upload_invalid',
      'field_errors', jsonb_build_object(
        'document_key', 'Report document is unavailable or already registered.'
      )
    );
  end if;

  if not exists (
    select 1
      from storage.objects so
     where so.bucket_id = v_document.storage_bucket
       and so.name = v_document.storage_path
  ) then
    return jsonb_build_object(
      'ok', false,
      'error', 'report_upload_invalid',
      'field_errors', jsonb_build_object(
        'document_key', 'Upload the report file before registering it.'
      )
    );
  end if;

  update public.order_documents od
     set status = 'active',
         mime_type = coalesce(v_mime_type, od.mime_type),
         file_size = coalesce(v_file_size, od.file_size),
         updated_at = now()
   where od.id = v_document.id
   returning * into v_document;

  return jsonb_build_object(
    'ok', true,
    'document', jsonb_build_object(
      'document_key', v_document_key,
      'document_role', 'submitted_report',
      'category', v_document.category,
      'title', v_document.title,
      'file_name', v_document.file_name,
      'mime_type', v_document.mime_type,
      'file_size', v_document.file_size,
      'status', v_document.status,
      'created_at', v_document.created_at
    )
  );
end;
$$;

revoke all on function public.rpc_vendor_workspace_prepare_report_document_upload(text, jsonb) from public, anon;
revoke all on function public.rpc_vendor_workspace_register_report_document(text, jsonb) from public, anon;
grant execute on function public.rpc_vendor_workspace_prepare_report_document_upload(text, jsonb) to authenticated, service_role;
grant execute on function public.rpc_vendor_workspace_register_report_document(text, jsonb) to authenticated, service_role;

comment on function public.rpc_vendor_workspace_prepare_report_document_upload(text, jsonb) is
  'AMC-10F authenticated Vendor Workspace report upload preparation. Requires vendor_documents.upload and vendor_assignments.progress, resolves only opaque assignment_work_key values scoped to current_company_id(), active AMC vendor relationship/profile rows, vendor_appraisal assignments, AMC-scoped orders, and in-progress/revision-requested assignment states. Creates pending order_documents metadata with vendor visibility and server-generated private storage target for Edge signing; frontend responses must not expose raw ids or storage paths.';

comment on function public.rpc_vendor_workspace_register_report_document(text, jsonb) is
  'AMC-10F authenticated Vendor Workspace report upload registration. Requires vendor_documents.upload and vendor_assignments.progress, resolves only opaque assignment_work_key and document_key values scoped to current_company_id(), active AMC vendor relationship/profile rows, vendor_appraisal assignments, AMC-scoped orders, and in-progress/revision-requested assignment states. Finalizes pending vendor-visible final_report metadata after storage object existence validation without exposing raw ids, storage paths, client fees, AMC margins, internal notes, procurement/candidate data, shared order routes, owner-side APIs, or token route behavior.';

commit;
