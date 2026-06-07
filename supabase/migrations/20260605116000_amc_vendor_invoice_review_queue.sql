begin;

create extension if not exists "pgcrypto";

create or replace function public.rpc_amc_vendor_invoices(
  p_status text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_owner_company_id uuid := public.current_company_id();
  v_status text := lower(nullif(btrim(coalesce(p_status, '')), ''));
  v_items jsonb := '[]'::jsonb;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_owner_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('vendors.read')
     or not public.current_app_user_has_permission('billing.update') then
    raise exception 'vendor_invoice_review_permission_required'
      using errcode = '42501';
  end if;

  if v_status is not null
     and v_status not in ('invoice_received', 'approved', 'on_hold', 'rejected') then
    return jsonb_build_object(
      'ok', false,
      'error', 'vendor_invoice_status_invalid',
      'items', '[]'::jsonb
    );
  end if;

  with invoice_rows as (
    select
      oca.id as assignment_id,
      oca.order_id,
      oca.assigned_company_id,
      oca.submission_payload -> 'invoice' as invoice_payload,
      lower(coalesce(oca.submission_payload #>> '{invoice,status}', '')) as invoice_status,
      encode(
        extensions.digest(
          concat_ws(':', 'amc_vendor_invoice_v1', oca.id::text, oca.owner_company_id::text),
          'sha256'
        ),
        'hex'
      ) as invoice_key,
      encode(
        extensions.digest(
          concat_ws(':', 'vendor_assignment_work_v1', oca.id::text, oca.assigned_company_id::text),
          'sha256'
        ),
        'hex'
      ) as assignment_work_key,
      oca.completed_at,
      oca.submitted_at as assignment_submitted_at,
      o.order_number,
      coalesce(nullif(o.property_address, ''), nullif(o.address, '')) as property_address,
      o.city,
      o.state,
      coalesce(nullif(o.postal_code, ''), nullif(o.zip, '')) as postal_code,
      o.county,
      o.report_type,
      vendor_company.name as vendor_company_name
    from public.order_company_assignments oca
    join public.orders o
      on o.id = oca.order_id
     and coalesce(o.company_id, public.default_company_id()) = oca.owner_company_id
     and coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'
    join public.companies vendor_company
      on vendor_company.id = oca.assigned_company_id
    join public.company_relationships cr
      on cr.id = oca.relationship_id
     and cr.source_company_id = oca.owner_company_id
     and cr.target_company_id = oca.assigned_company_id
     and cr.relationship_type = 'amc_vendor'
     and cr.status = 'active'
    where oca.owner_company_id = v_owner_company_id
      and oca.assignment_type = 'vendor_appraisal'
      and oca.submission_payload ? 'invoice'
      and lower(coalesce(oca.submission_payload #>> '{invoice,status}', '')) in
        ('invoice_received', 'approved', 'on_hold', 'rejected')
      and (v_status is null or lower(coalesce(oca.submission_payload #>> '{invoice,status}', '')) = v_status)
  ),
  invoice_documents as (
    select
      ir.assignment_id,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'document_key', doc.document_key,
            'document_id', od.id,
            'file_name', od.file_name,
            'mime_type', od.mime_type,
            'file_size', od.file_size,
            'created_at', od.created_at
          )
          order by od.created_at asc
        ) filter (where od.id is not null),
        '[]'::jsonb
      ) as documents
    from invoice_rows ir
    left join lateral jsonb_array_elements(coalesce(ir.invoice_payload -> 'documents', '[]'::jsonb)) as invoice_doc(value)
      on true
    left join lateral (
      select invoice_doc.value ->> 'document_key' as document_key
    ) doc
      on true
    left join public.order_documents od
      on od.order_id = ir.order_id
     and od.company_id = v_owner_company_id
     and od.category = 'invoice'
     and od.visibility_scope = 'vendor'
     and od.status = 'active'
     and encode(
           extensions.digest(
             concat_ws(':', 'vendor_assignment_invoice_document_v1', od.id::text, ir.assignment_work_key),
             'sha256'
           ),
           'hex'
         ) = doc.document_key
    group by ir.assignment_id
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'invoice_key', ir.invoice_key,
        'assignment_work_key', ir.assignment_work_key,
        'invoice_status', ir.invoice_status,
        'invoice_status_label', case ir.invoice_status
          when 'invoice_received' then 'Invoice Received'
          when 'approved' then 'Approved'
          when 'on_hold' then 'On Hold'
          when 'rejected' then 'Rejected'
          else 'Unknown'
        end,
        'invoice_number', ir.invoice_payload ->> 'invoice_number',
        'invoice_amount', nullif(ir.invoice_payload ->> 'invoice_amount', '')::numeric,
        'currency', coalesce(nullif(ir.invoice_payload ->> 'currency', ''), 'USD'),
        'invoice_date', ir.invoice_payload ->> 'invoice_date',
        'vendor_note', ir.invoice_payload ->> 'vendor_note',
        'submitted_at', ir.invoice_payload ->> 'submitted_at',
        'review', jsonb_build_object(
          'reviewed_at', ir.invoice_payload #>> '{review,reviewed_at}',
          'decision', ir.invoice_payload #>> '{review,decision}',
          'vendor_message', ir.invoice_payload #>> '{review,vendor_message}',
          'approved_amount', ir.invoice_payload #>> '{review,approved_amount}'
        ),
        'documents', coalesce(idoc.documents, '[]'::jsonb),
        'order', jsonb_build_object(
          'order_number', ir.order_number,
          'property_address', ir.property_address,
          'city', ir.city,
          'state', ir.state,
          'postal_code', ir.postal_code,
          'county', ir.county,
          'report_type', ir.report_type
        ),
        'vendor', jsonb_build_object(
          'company_name', ir.vendor_company_name
        )
      )
      order by
        case ir.invoice_status
          when 'invoice_received' then 1
          when 'on_hold' then 2
          when 'rejected' then 3
          when 'approved' then 4
          else 5
        end,
        (ir.invoice_payload ->> 'submitted_at')::timestamptz desc nulls last
    ),
    '[]'::jsonb
  )
    into v_items
    from invoice_rows ir
    left join invoice_documents idoc
      on idoc.assignment_id = ir.assignment_id;

  return jsonb_build_object('ok', true, 'items', coalesce(v_items, '[]'::jsonb));
end;
$$;

create or replace function public.rpc_amc_review_vendor_invoice(
  p_invoice_key text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_owner_company_id uuid := public.current_company_id();
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_assignment public.order_company_assignments%rowtype;
  v_invoice_payload jsonb;
  v_decision text;
  v_next_status text;
  v_reviewer_note text;
  v_vendor_message text;
  v_approved_amount numeric;
  v_reviewed_at timestamptz := now();
  v_invoice_key text;
  v_vendor_recipient_id uuid;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_owner_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('vendors.read')
     or not public.current_app_user_has_permission('billing.update') then
    raise exception 'vendor_invoice_review_permission_required'
      using errcode = '42501';
  end if;

  if p_invoice_key is null or p_invoice_key !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'vendor_invoice_unavailable');
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    return jsonb_build_object(
      'ok', false,
      'error', 'vendor_invoice_review_invalid',
      'field_errors', jsonb_build_object('payload', 'Review payload must be an object.')
    );
  end if;

  v_decision := lower(btrim(coalesce(v_payload ->> 'decision', '')));
  if v_decision not in ('approve', 'hold', 'reject') then
    return jsonb_build_object(
      'ok', false,
      'error', 'vendor_invoice_review_invalid',
      'field_errors', jsonb_build_object('decision', 'Choose approve, hold, or reject.')
    );
  end if;

  v_next_status := case v_decision
    when 'approve' then 'approved'
    when 'hold' then 'on_hold'
    else 'rejected'
  end;
  v_reviewer_note := nullif(btrim(coalesce(v_payload ->> 'reviewer_note', '')), '');
  v_vendor_message := nullif(btrim(coalesce(v_payload ->> 'vendor_message', '')), '');

  if v_decision in ('hold', 'reject') and v_vendor_message is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'vendor_invoice_review_invalid',
      'field_errors', jsonb_build_object('vendor_message', 'Add a vendor-facing message for held or rejected invoices.')
    );
  end if;

  begin
    v_approved_amount := nullif(v_payload ->> 'approved_amount', '')::numeric;
  exception when others then
    return jsonb_build_object(
      'ok', false,
      'error', 'vendor_invoice_review_invalid',
      'field_errors', jsonb_build_object('approved_amount', 'Approved amount must be a number.')
    );
  end;

  if v_approved_amount is not null and (v_approved_amount <= 0 or v_approved_amount > 999999.99) then
    return jsonb_build_object(
      'ok', false,
      'error', 'vendor_invoice_review_invalid',
      'field_errors', jsonb_build_object('approved_amount', 'Approved amount must be greater than zero.')
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
    where oca.owner_company_id = v_owner_company_id
      and oca.assignment_type = 'vendor_appraisal'
      and oca.submission_payload ? 'invoice'
      and lower(coalesce(oca.submission_payload #>> '{invoice,status}', '')) in
        ('invoice_received', 'approved', 'on_hold', 'rejected')
      and encode(
            extensions.digest(
              concat_ws(':', 'amc_vendor_invoice_v1', oca.id::text, oca.owner_company_id::text),
              'sha256'
            ),
            'hex'
          ) = p_invoice_key
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'vendor_invoice_unavailable');
  end if;

  v_invoice_payload := coalesce(v_assignment.submission_payload -> 'invoice', '{}'::jsonb);

  v_invoice_payload := jsonb_set(
    v_invoice_payload,
    '{status}',
    to_jsonb(v_next_status),
    true
  );

  v_invoice_payload := jsonb_set(
    v_invoice_payload,
    '{review}',
    jsonb_strip_nulls(jsonb_build_object(
      'decision', v_decision,
      'status', v_next_status,
      'reviewed_at', v_reviewed_at,
      'reviewed_by_user_id', v_actor_user_id,
      'internal_reviewer_note', v_reviewer_note,
      'vendor_message', v_vendor_message,
      'approved_amount', v_approved_amount
    )),
    true
  );

  update public.order_company_assignments
     set submission_payload = jsonb_set(
           coalesce(submission_payload, '{}'::jsonb),
           '{invoice}',
           v_invoice_payload,
           true
         )
   where id = v_assignment.id
   returning * into v_assignment;

  v_invoice_key := encode(
    extensions.digest(
      concat_ws(':', 'amc_vendor_invoice_v1', v_assignment.id::text, v_assignment.owner_company_id::text),
      'sha256'
    ),
    'hex'
  );

  v_vendor_recipient_id := nullif(v_assignment.submission_payload #>> '{invoice,submitted_by_user_id}', '')::uuid;
  if v_vendor_recipient_id is not null then
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
      v_vendor_recipient_id,
      v_assignment.assigned_company_id,
      'vendor.invoice_reviewed',
      'vendor_payments',
      case v_next_status
        when 'approved' then 'Invoice approved'
        when 'on_hold' then 'Invoice on hold'
        else 'Invoice rejected'
      end,
      coalesce(v_vendor_message, case v_next_status
        when 'approved' then 'Your invoice has been approved.'
        when 'on_hold' then 'Your invoice is on hold.'
        else 'Your invoice was rejected.'
      end),
      coalesce(v_vendor_message, case v_next_status
        when 'approved' then 'Your invoice has been approved.'
        when 'on_hold' then 'Your invoice is on hold.'
        else 'Your invoice was rejected.'
      end),
      false,
      false,
      now(),
      '/vendor-workspace/payments',
      jsonb_build_object(
        'source_type', 'vendor_invoice_review',
        'event_key', 'vendor.invoice_reviewed',
        'invoice_key', v_invoice_key,
        'status', v_next_status,
        'vendor_message', v_vendor_message
      ),
      case when v_next_status in ('on_hold', 'rejected') then 'high' else 'normal' end
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'invoice', jsonb_build_object(
      'invoice_key', v_invoice_key,
      'invoice_status', v_next_status,
      'invoice_status_label', case v_next_status
        when 'approved' then 'Approved'
        when 'on_hold' then 'On Hold'
        when 'rejected' then 'Rejected'
        else 'Invoice Received'
      end,
      'reviewed_at', v_reviewed_at,
      'vendor_message', v_vendor_message,
      'approved_amount', v_approved_amount
    )
  );
end;
$$;

revoke all on function public.rpc_amc_vendor_invoices(text) from public, anon;
revoke all on function public.rpc_amc_review_vendor_invoice(text, jsonb) from public, anon;
grant execute on function public.rpc_amc_vendor_invoices(text) to authenticated, service_role;
grant execute on function public.rpc_amc_review_vendor_invoice(text, jsonb) to authenticated, service_role;

comment on function public.rpc_amc_vendor_invoices(text) is
  'AMC-12C internal AMC vendor invoice review queue. Requires vendors.read and billing.update, scopes to current owner company, active AMC vendor relationships, AMC-scoped orders, and invoice-bearing vendor_appraisal assignments. Returns opaque invoice keys, vendor/order/invoice summaries, and internal document ids for owner-side document download only; no Vendor Workspace approval path, payment scheduling, paid mutation, client fee, AMC margin, or vendor-facing internal notes.';

comment on function public.rpc_amc_review_vendor_invoice(text, jsonb) is
  'AMC-12C internal AMC vendor invoice approve/hold/reject action. Requires vendors.read and billing.update, scopes by opaque invoice_key to current owner company and AMC vendor assignment invoices. Updates invoice status to approved, on_hold, or rejected only; stores internal reviewer note separately from vendor_message, preserves submitted invoice documents/metadata, notifies the vendor with safe status/message only, and does not schedule/pay invoices or mutate assignment/order lifecycle.';

commit;
