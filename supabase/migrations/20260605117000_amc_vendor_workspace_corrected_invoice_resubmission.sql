begin;

create extension if not exists "pgcrypto";

create or replace function public.rpc_vendor_workspace_resubmit_invoice(
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
  v_invoice_number text;
  v_vendor_note text;
  v_currency text;
  v_invoice_date text;
  v_invoice_amount numeric;
  v_document_keys jsonb := '[]'::jsonb;
  v_documents jsonb := '[]'::jsonb;
  v_previous_invoice jsonb;
  v_invoice_history jsonb;
  v_invoice_payload jsonb;
  v_resubmitted_at timestamptz := now();
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
      'error', 'invoice_resubmission_invalid',
      'field_errors', jsonb_build_object('payload', 'Corrected invoice payload must be an object.')
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
      'error', 'invoice_resubmission_invalid',
      'field_errors', jsonb_build_object('invoice_amount', 'Corrected invoice amount must be a number.')
    );
  end;

  if v_invoice_number is null or length(v_invoice_number) > 80 then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_resubmission_invalid',
      'field_errors', jsonb_build_object('invoice_number', 'Enter a corrected invoice number.')
    );
  end if;

  if v_invoice_amount is null or v_invoice_amount <= 0 or v_invoice_amount > 999999.99 then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_resubmission_invalid',
      'field_errors', jsonb_build_object('invoice_amount', 'Enter a valid corrected invoice amount.')
    );
  end if;

  if v_currency !~ '^[A-Z]{3}$' then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_resubmission_invalid',
      'field_errors', jsonb_build_object('currency', 'Currency must be a three-letter code.')
    );
  end if;

  if v_invoice_date is not null and v_invoice_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_resubmission_invalid',
      'field_errors', jsonb_build_object('invoice_date', 'Use YYYY-MM-DD for invoice date.')
    );
  end if;

  if v_payload ? 'document_keys' then
    if jsonb_typeof(v_payload -> 'document_keys') <> 'array' then
      return jsonb_build_object(
        'ok', false,
        'error', 'invoice_resubmission_invalid',
        'field_errors', jsonb_build_object('document_keys', 'Corrected invoice document references must be a list.')
      );
    end if;

    if exists (
      select 1
        from jsonb_array_elements_text(v_payload -> 'document_keys') as document_key(value)
       where document_key.value !~ '^[0-9a-f]{64}$'
    ) then
      return jsonb_build_object(
        'ok', false,
        'error', 'invoice_resubmission_invalid',
        'field_errors', jsonb_build_object('document_keys', 'Corrected invoice document references are invalid.')
      );
    end if;

    v_document_keys := v_payload -> 'document_keys';
  end if;

  if jsonb_array_length(v_document_keys) = 0 then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_resubmission_invalid',
      'field_errors', jsonb_build_object('document_keys', 'Upload at least one corrected invoice file before submitting.')
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

  if v_assignment.status <> 'completed' then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_resubmission_invalid',
      'status', v_assignment.status,
      'field_errors', jsonb_build_object('action', 'Corrected invoices can only be submitted after the assignment is complete.')
    );
  end if;

  if lower(coalesce(v_assignment.submission_payload #>> '{invoice,status}', '')) <> 'rejected' then
    return jsonb_build_object(
      'ok', false,
      'error', 'invoice_resubmission_invalid',
      'field_errors', jsonb_build_object('action', 'Corrected invoices can only be submitted after an invoice is rejected.')
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
      'error', 'invoice_resubmission_invalid',
      'field_errors', jsonb_build_object('document_keys', 'Uploaded corrected invoice documents are invalid or unavailable.')
    );
  end if;

  v_previous_invoice := coalesce(v_assignment.submission_payload -> 'invoice', '{}'::jsonb);
  v_invoice_history := coalesce(v_previous_invoice -> 'history', '[]'::jsonb)
    || jsonb_build_array(
      jsonb_set(
        v_previous_invoice - 'history',
        '{archived_at}',
        to_jsonb(v_resubmitted_at),
        true
      )
    );

  v_invoice_payload := jsonb_strip_nulls(jsonb_build_object(
    'status', 'invoice_received',
    'invoice_number', v_invoice_number,
    'invoice_amount', v_invoice_amount,
    'currency', v_currency,
    'invoice_date', v_invoice_date,
    'vendor_note', v_vendor_note,
    'submitted_via', 'vendor_workspace',
    'submitted_at', v_resubmitted_at,
    'resubmitted_at', v_resubmitted_at,
    'submitted_by_user_id', v_actor_user_id,
    'document_count', jsonb_array_length(v_documents),
    'documents', v_documents,
    'correction_of_status', 'rejected',
    'history', v_invoice_history
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
      'vendor.invoice_resubmitted',
      'vendor_payments',
      'Corrected vendor invoice submitted',
      concat('Corrected invoice ', v_invoice_number, ' was submitted.'),
      concat('Corrected invoice ', v_invoice_number, ' was submitted.'),
      false,
      false,
      now(),
      '/vendors',
      jsonb_build_object(
        'source_type', 'vendor_invoice_resubmission',
        'event_key', 'vendor.invoice_resubmitted',
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
    'message', 'Corrected invoice submitted.',
    'invoice', jsonb_build_object(
      'invoice_number', v_invoice_number,
      'invoice_amount', v_invoice_amount,
      'currency', v_currency,
      'invoice_date', v_invoice_date,
      'vendor_note', v_vendor_note,
      'submitted_at', v_resubmitted_at,
      'resubmitted_at', v_resubmitted_at,
      'document_count', jsonb_array_length(v_documents),
      'history_count', jsonb_array_length(v_invoice_history),
      'documents', v_documents
    )
  );
end;
$$;

revoke all on function public.rpc_vendor_workspace_resubmit_invoice(text, jsonb) from public, anon;
grant execute on function public.rpc_vendor_workspace_resubmit_invoice(text, jsonb) to authenticated, service_role;

comment on function public.rpc_vendor_workspace_resubmit_invoice(text, jsonb) is
  'AMC-12D authenticated Vendor Workspace corrected invoice resubmission. Requires vendor_payments.read and vendor_invoices.submit, resolves only opaque assignment_work_key values scoped to current_company_id(), active AMC vendor relationship/profile rows, assigned vendor_appraisal assignments, AMC-scoped orders, completed assignments, and rejected invoice status. It preserves prior rejected invoice metadata/history, writes a new invoice_received corrected invoice payload, and notifies internal owner/admin users without approving, scheduling, paying, exposing raw ids, storage paths, client fees, AMC margins, owner-side financial notes, shared order routes, or payment APIs.';

commit;
