begin;

create extension if not exists "pgcrypto";

insert into public.permissions (key, category, label, description, is_system, is_owner_only)
values (
  'vendor_invoices.submit',
  'vendor_payments',
  'Submit vendor invoices',
  'Authenticated vendor-company users can submit invoice documents for payment-eligible assigned AMC work.',
  true,
  false
)
on conflict (key) do update
  set category = excluded.category,
      label = excluded.label,
      description = excluded.description,
      is_system = excluded.is_system,
      is_owner_only = excluded.is_owner_only,
      updated_at = now();

insert into public.role_permissions (role_id, permission_key)
select r.id, 'vendor_invoices.submit'
  from public.roles r
  join public.permissions p
    on p.key = 'vendor_invoices.submit'
 where r.company_id is null
   and lower(r.name) = lower('Vendor Admin')
on conflict (role_id, permission_key) do nothing;

do $$
begin
  if exists (
    select 1
      from pg_constraint
     where conname = 'order_documents_category_check'
       and conrelid = 'public.order_documents'::regclass
  ) then
    alter table public.order_documents
      drop constraint order_documents_category_check;
  end if;

  alter table public.order_documents
    add constraint order_documents_category_check check (
      category = any (
        array[
          'engagement',
          'source_documents',
          'property_media',
          'review_revisions',
          'final_report',
          'internal_workfile',
          'invoice'
        ]
      )
    );
end;
$$;

create index if not exists idx_order_documents_vendor_invoice_pending
  on public.order_documents (company_id, order_id, uploaded_by_user_id, created_at desc)
  where category = 'invoice'
    and visibility_scope = 'vendor'
    and status in ('pending', 'active');

create or replace function public.rpc_vendor_workspace_prepare_invoice_upload(
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

  if not public.current_app_user_has_permission('vendor_payments.read') then
    raise exception 'vendor_payments_read_permission_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('vendor_invoices.submit') then
    raise exception 'vendor_invoices_submit_permission_required'
      using errcode = '42501';
  end if;

  if p_assignment_work_key is null
     or p_assignment_work_key !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'payment_unavailable');
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_upload_invalid',
      'field_errors', jsonb_build_object('payload', 'Invoice upload metadata must be an object.')
    );
  end if;

  v_file_name := public.order_document_sanitize_file_name(v_payload ->> 'file_name');
  v_mime_type := nullif(btrim(coalesce(v_payload ->> 'mime_type', '')), '');

  begin
    v_file_size := nullif(v_payload ->> 'file_size', '')::bigint;
  exception when others then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_upload_invalid',
      'field_errors', jsonb_build_object('file_size', 'File size must be a number.')
    );
  end;

  if v_payload ->> 'file_name' is null
     or btrim(v_payload ->> 'file_name') = '' then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_upload_invalid',
      'field_errors', jsonb_build_object('file_name', 'Choose an invoice file to upload.')
    );
  end if;

  if v_mime_type is null
     or lower(v_mime_type) <> 'application/pdf' then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_upload_invalid',
      'field_errors', jsonb_build_object('mime_type', 'Upload a PDF invoice file.')
    );
  end if;

  if v_file_size is null
     or v_file_size <= 0
     or v_file_size > 52428800 then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_upload_invalid',
      'field_errors', jsonb_build_object('file_size', 'Invoice files must be 50 MB or smaller.')
    );
  end if;

  select oca.*
    into v_assignment
    from public.order_company_assignments oca
   where encode(
           extensions.digest(
             concat_ws(':', 'vendor_assignment_work_v1', oca.id::text, oca.assigned_company_id::text),
             'sha256'
           ),
           'hex'
         ) = p_assignment_work_key
     and oca.assigned_company_id = v_vendor_company_id
     and oca.assignment_type = 'vendor_appraisal'
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'payment_unavailable');
  end if;

  select o.*
    into v_order
    from public.orders o
   where o.id = v_assignment.order_id;

  if not found
     or coalesce(v_order.company_id, public.default_company_id()) is distinct from v_assignment.owner_company_id
     or coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations' then
    return jsonb_build_object('ok', false, 'error', 'payment_unavailable');
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
    return jsonb_build_object('ok', false, 'error', 'payment_unavailable');
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
    return jsonb_build_object('ok', false, 'error', 'payment_unavailable');
  end if;

  if v_assignment.status <> 'completed' then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_upload_invalid',
      'status', v_assignment.status,
      'field_errors', jsonb_build_object('action', 'Invoices can only be uploaded after the assignment is complete.')
    );
  end if;

  if lower(coalesce(v_assignment.submission_payload #>> '{invoice,status}', '')) in
     ('invoice_received', 'received', 'submitted', 'approved', 'scheduled', 'paid', 'on_hold') then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_already_submitted',
      'field_errors', jsonb_build_object('action', 'An invoice has already been submitted for this assignment.')
    );
  end if;

  v_storage_path := format(
    'vendor-workspace/assignments/%s/invoices/%s/%s',
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
    'invoice',
    'Vendor Invoice',
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
            concat_ws(':', 'vendor_assignment_invoice_document_v1', v_document.id::text, p_assignment_work_key),
            'sha256'
          ),
          'hex'
        ),
      'document_role', 'vendor_invoice',
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

create or replace function public.rpc_vendor_workspace_register_invoice_document(
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

  if not public.current_app_user_has_permission('vendor_payments.read') then
    raise exception 'vendor_payments_read_permission_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('vendor_invoices.submit') then
    raise exception 'vendor_invoices_submit_permission_required'
      using errcode = '42501';
  end if;

  if p_assignment_work_key is null
     or p_assignment_work_key !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'payment_unavailable');
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_upload_invalid',
      'field_errors', jsonb_build_object('payload', 'Invoice upload metadata must be an object.')
    );
  end if;

  if v_document_key !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_upload_invalid',
      'field_errors', jsonb_build_object('document_key', 'Invoice document reference is invalid.')
    );
  end if;

  begin
    v_file_size := nullif(v_payload ->> 'file_size', '')::bigint;
  exception when others then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_upload_invalid',
      'field_errors', jsonb_build_object('file_size', 'File size must be a number.')
    );
  end;

  if v_mime_type is not null
     and lower(v_mime_type) <> 'application/pdf' then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_upload_invalid',
      'field_errors', jsonb_build_object('mime_type', 'Upload a PDF invoice file.')
    );
  end if;

  if v_file_size is not null
     and (v_file_size <= 0 or v_file_size > 52428800) then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_upload_invalid',
      'field_errors', jsonb_build_object('file_size', 'Invoice files must be 50 MB or smaller.')
    );
  end if;

  select oca.*
    into v_assignment
    from public.order_company_assignments oca
    join public.orders o
      on o.id = oca.order_id
     and coalesce(o.company_id, public.default_company_id()) = oca.owner_company_id
     and coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'
    join public.company_relationships cr
      on cr.id = oca.relationship_id
     and cr.source_company_id = oca.owner_company_id
     and cr.target_company_id = oca.assigned_company_id
     and cr.relationship_type = 'amc_vendor'
     and cr.status = 'active'
    where encode(
            extensions.digest(
              concat_ws(':', 'vendor_assignment_work_v1', oca.id::text, oca.assigned_company_id::text),
              'sha256'
            ),
            'hex'
          ) = p_assignment_work_key
      and oca.assigned_company_id = v_vendor_company_id
      and oca.assignment_type = 'vendor_appraisal'
      and oca.status = 'completed'
      and oca.assignment_type = public.order_company_assignment_expected_type(cr.relationship_type)
      and exists (
        select 1
          from public.company_vendor_profiles cvp
         where cvp.owner_company_id = oca.owner_company_id
           and cvp.vendor_company_id = oca.assigned_company_id
           and (cvp.relationship_id is null or cvp.relationship_id = oca.relationship_id)
           and cvp.vendor_status not in ('inactive', 'do_not_use')
      )
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'payment_unavailable');
  end if;

  select od.*
    into v_document
    from public.order_documents od
   where od.order_id = v_assignment.order_id
     and od.company_id = v_assignment.owner_company_id
     and od.uploaded_by_user_id = v_actor_user_id
     and od.category = 'invoice'
     and od.visibility_scope = 'vendor'
     and od.status = 'pending'
     and encode(
           extensions.digest(
             concat_ws(':', 'vendor_assignment_invoice_document_v1', od.id::text, p_assignment_work_key),
             'sha256'
           ),
           'hex'
         ) = v_document_key
   limit 1
   for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_upload_invalid',
      'field_errors', jsonb_build_object('document_key', 'Invoice document is unavailable or already registered.')
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
      'error', 'invoice_upload_invalid',
      'field_errors', jsonb_build_object('document_key', 'Upload the invoice file before registering it.')
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
      'document_role', 'vendor_invoice',
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

create or replace function public.rpc_vendor_workspace_submit_invoice(
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
  v_invoice_number text;
  v_vendor_note text;
  v_currency text;
  v_invoice_date text;
  v_invoice_amount numeric;
  v_document_keys jsonb := '[]'::jsonb;
  v_documents jsonb := '[]'::jsonb;
  v_invoice_payload jsonb;
  v_submitted_at timestamptz := now();
  v_recipient_id uuid;
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

  if not public.current_app_user_has_permission('vendor_payments.read') then
    raise exception 'vendor_payments_read_permission_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('vendor_invoices.submit') then
    raise exception 'vendor_invoices_submit_permission_required'
      using errcode = '42501';
  end if;

  if p_assignment_work_key is null
     or p_assignment_work_key !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'payment_unavailable');
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_submission_invalid',
      'field_errors', jsonb_build_object('payload', 'Invoice submission payload must be an object.')
    );
  end if;

  v_invoice_number := nullif(btrim(coalesce(v_payload ->> 'invoice_number', '')), '');
  v_vendor_note := nullif(btrim(coalesce(v_payload ->> 'vendor_note', v_payload ->> 'comments', '')), '');
  v_currency := upper(btrim(coalesce(nullif(v_payload ->> 'currency', ''), 'USD')));
  v_invoice_date := nullif(btrim(coalesce(v_payload ->> 'invoice_date', '')), '');

  begin
    v_invoice_amount := nullif(v_payload ->> 'invoice_amount', '')::numeric;
  exception when others then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_submission_invalid',
      'field_errors', jsonb_build_object('invoice_amount', 'Invoice amount must be a number.')
    );
  end;

  if v_invoice_number is null or length(v_invoice_number) > 80 then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_submission_invalid',
      'field_errors', jsonb_build_object('invoice_number', 'Enter an invoice number.')
    );
  end if;

  if v_invoice_amount is null or v_invoice_amount <= 0 or v_invoice_amount > 999999.99 then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_submission_invalid',
      'field_errors', jsonb_build_object('invoice_amount', 'Enter a valid invoice amount.')
    );
  end if;

  if v_currency !~ '^[A-Z]{3}$' then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_submission_invalid',
      'field_errors', jsonb_build_object('currency', 'Currency must be a three-letter code.')
    );
  end if;

  if v_invoice_date is not null and v_invoice_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_submission_invalid',
      'field_errors', jsonb_build_object('invoice_date', 'Use YYYY-MM-DD for invoice date.')
    );
  end if;

  if v_payload ? 'document_keys' then
    if jsonb_typeof(v_payload -> 'document_keys') <> 'array' then
      return jsonb_build_object(
        'ok', false,
        'error', 'invoice_submission_invalid',
        'field_errors', jsonb_build_object('document_keys', 'Invoice document references must be a list.')
      );
    end if;

    if exists (
      select 1
        from jsonb_array_elements_text(v_payload -> 'document_keys') as document_key(value)
       where document_key.value !~ '^[0-9a-f]{64}$'
    ) then
      return jsonb_build_object(
        'ok', false,
        'error', 'invoice_submission_invalid',
        'field_errors', jsonb_build_object('document_keys', 'Invoice document references are invalid.')
      );
    end if;

    v_document_keys := v_payload -> 'document_keys';
  end if;

  if jsonb_array_length(v_document_keys) = 0 then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_submission_invalid',
      'field_errors', jsonb_build_object('document_keys', 'Upload at least one invoice file before submitting.')
    );
  end if;

  select oca.*
    into v_assignment
    from public.order_company_assignments oca
    join public.orders o
      on o.id = oca.order_id
     and coalesce(o.company_id, public.default_company_id()) = oca.owner_company_id
     and coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'
    join public.company_relationships cr
      on cr.id = oca.relationship_id
     and cr.source_company_id = oca.owner_company_id
     and cr.target_company_id = oca.assigned_company_id
     and cr.relationship_type = 'amc_vendor'
     and cr.status = 'active'
    where encode(
            extensions.digest(
              concat_ws(':', 'vendor_assignment_work_v1', oca.id::text, oca.assigned_company_id::text),
              'sha256'
            ),
            'hex'
          ) = p_assignment_work_key
      and oca.assigned_company_id = v_vendor_company_id
      and oca.assignment_type = 'vendor_appraisal'
      and oca.assignment_type = public.order_company_assignment_expected_type(cr.relationship_type)
      and exists (
        select 1
          from public.company_vendor_profiles cvp
         where cvp.owner_company_id = oca.owner_company_id
           and cvp.vendor_company_id = oca.assigned_company_id
           and (cvp.relationship_id is null or cvp.relationship_id = oca.relationship_id)
           and cvp.vendor_status not in ('inactive', 'do_not_use')
      )
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'payment_unavailable');
  end if;

  select o.*
    into v_order
    from public.orders o
   where o.id = v_assignment.order_id;

  if v_assignment.status <> 'completed' then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_submission_invalid',
      'status', v_assignment.status,
      'field_errors', jsonb_build_object('action', 'Invoices can only be submitted after the assignment is complete.')
    );
  end if;

  if lower(coalesce(v_assignment.submission_payload #>> '{invoice,status}', '')) in
     ('invoice_received', 'received', 'submitted', 'approved', 'scheduled', 'paid', 'on_hold') then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_already_submitted',
      'field_errors', jsonb_build_object('action', 'An invoice has already been submitted for this assignment.')
    );
  end if;

  with requested_keys as (
    select distinct value as document_key
      from jsonb_array_elements_text(v_document_keys)
  ),
  matched_documents as (
    select
      rk.document_key,
      od.file_name,
      od.mime_type,
      od.file_size,
      od.created_at
    from requested_keys rk
    join public.order_documents od
      on od.order_id = v_assignment.order_id
     and od.company_id = v_assignment.owner_company_id
     and od.uploaded_by_user_id = v_actor_user_id
     and od.category = 'invoice'
     and od.visibility_scope = 'vendor'
     and od.status = 'active'
     and encode(
           extensions.digest(
             concat_ws(':', 'vendor_assignment_invoice_document_v1', od.id::text, p_assignment_work_key),
             'sha256'
           ),
           'hex'
         ) = rk.document_key
  )
  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'document_key', document_key,
               'file_name', file_name,
               'mime_type', mime_type,
               'file_size', file_size,
               'created_at', created_at
             )
             order by created_at asc
           ),
           '[]'::jsonb
         )
    into v_documents
    from matched_documents;

  if jsonb_array_length(v_documents) <> (
    select count(distinct value)
      from jsonb_array_elements_text(v_document_keys)
  ) then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_submission_invalid',
      'field_errors', jsonb_build_object('document_keys', 'Uploaded invoice documents are invalid or unavailable.')
    );
  end if;

  v_invoice_payload := jsonb_strip_nulls(jsonb_build_object(
    'status', 'invoice_received',
    'invoice_number', v_invoice_number,
    'invoice_amount', v_invoice_amount,
    'currency', v_currency,
    'invoice_date', v_invoice_date,
    'vendor_note', v_vendor_note,
    'submitted_via', 'vendor_workspace',
    'submitted_at', v_submitted_at,
    'submitted_by_user_id', v_actor_user_id,
    'document_count', jsonb_array_length(v_documents),
    'documents', v_documents
  ));

  update public.order_company_assignments
     set submission_payload = jsonb_set(
           coalesce(submission_payload, '{}'::jsonb),
           '{invoice}',
           v_invoice_payload,
           true
         )
   where id = v_assignment.id
   returning * into v_assignment;

  for v_recipient_id in
    select distinct cm.user_id
      from public.company_memberships cm
      join public.user_roles ur
        on ur.user_id = cm.user_id
       and lower(ur.role) in ('owner', 'admin')
     where cm.company_id = v_assignment.owner_company_id
       and cm.status = 'active'
       and cm.user_id is distinct from v_actor_user_id
  loop
    insert into public.notifications (
      user_id,
      company_id,
      type,
      category,
      title,
      body,
      message,
      is_read,
      read,
      created_at,
      link_path,
      payload,
      priority
    ) values (
      v_recipient_id,
      v_assignment.owner_company_id,
      'vendor.invoice_submitted',
      'vendor_payments',
      'Vendor invoice submitted',
      concat('Invoice ', v_invoice_number, ' was submitted for ', coalesce(v_order.order_number, 'assigned work'), '.'),
      concat('Invoice ', v_invoice_number, ' was submitted for ', coalesce(v_order.order_number, 'assigned work'), '.'),
      false,
      false,
      now(),
      '/dashboard',
      jsonb_build_object(
        'source_type', 'vendor_invoice_submission',
        'event_key', 'vendor.invoice_submitted',
        'assignment_work_key', p_assignment_work_key,
        'invoice_number', v_invoice_number,
        'invoice_amount', v_invoice_amount,
        'currency', v_currency,
        'document_count', jsonb_array_length(v_documents)
      ),
      'normal'
    );
  end loop;

  return jsonb_build_object(
    'ok', true,
    'status', 'invoice_received',
    'message', 'Invoice submitted.',
    'invoice', jsonb_build_object(
      'invoice_number', v_invoice_number,
      'invoice_amount', v_invoice_amount,
      'currency', v_currency,
      'invoice_date', v_invoice_date,
      'vendor_note', v_vendor_note,
      'submitted_at', v_submitted_at,
      'document_count', jsonb_array_length(v_documents),
      'documents', v_documents
    )
  );
end;
$$;

revoke all on function public.rpc_vendor_workspace_prepare_invoice_upload(text, jsonb) from public, anon;
revoke all on function public.rpc_vendor_workspace_register_invoice_document(text, jsonb) from public, anon;
revoke all on function public.rpc_vendor_workspace_submit_invoice(text, jsonb) from public, anon;
grant execute on function public.rpc_vendor_workspace_prepare_invoice_upload(text, jsonb) to authenticated, service_role;
grant execute on function public.rpc_vendor_workspace_register_invoice_document(text, jsonb) to authenticated, service_role;
grant execute on function public.rpc_vendor_workspace_submit_invoice(text, jsonb) to authenticated, service_role;

comment on function public.rpc_vendor_workspace_prepare_invoice_upload(text, jsonb) is
  'AMC-12B authenticated Vendor Workspace invoice upload preparation. Requires vendor_payments.read and vendor_invoices.submit, resolves only opaque assignment_work_key values scoped to current_company_id(), active AMC vendor relationship/profile rows, assigned vendor_appraisal assignments, AMC-scoped orders, and completed payment-eligible assignments. Creates pending vendor-visible invoice order_documents metadata with a server-generated private storage target for Edge signing without exposing raw ids, storage paths, client fees, AMC margins, owner-side financial notes, shared order routes, payment approval/scheduling, or owner-side APIs.';

comment on function public.rpc_vendor_workspace_register_invoice_document(text, jsonb) is
  'AMC-12B authenticated Vendor Workspace invoice document registration. Requires vendor_payments.read and vendor_invoices.submit, resolves opaque assignment_work_key and document_key values scoped to the current vendor company, active AMC vendor relationship/profile rows, completed AMC assignments, and pending vendor-visible invoice metadata. It validates storage object existence and returns safe document metadata only.';

comment on function public.rpc_vendor_workspace_submit_invoice(text, jsonb) is
  'AMC-12B authenticated Vendor Workspace invoice submission. Requires vendor_payments.read and vendor_invoices.submit, resolves only opaque assignment_work_key values scoped to the current vendor company, active AMC vendor relationship/profile rows, assigned vendor_appraisal assignments, AMC-scoped orders, and completed payment-eligible assignments. It stores invoice_received status and vendor-submitted invoice metadata on the assignment submission payload, not payment approval/scheduling, and notifies owner/admin users without exposing raw ids, storage paths, client fees, AMC margins, owner-side financial notes, shared order routes, or payment mutation APIs.';

commit;
