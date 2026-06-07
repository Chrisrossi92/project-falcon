begin;

insert into public.permissions (key, category, label, description, is_system, is_owner_only)
values (
  'vendor_payments.read',
  'vendor_payments',
  'Read vendor payments',
  'Authenticated vendor-company users can view read-only payment status for their assigned AMC work.',
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
select r.id, 'vendor_payments.read'
  from public.roles r
  join public.permissions p
    on p.key = 'vendor_payments.read'
 where r.company_id is null
   and lower(r.name) = lower('Vendor Admin')
on conflict (role_id, permission_key) do nothing;

create or replace function public.rpc_vendor_workspace_payments()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_vendor_company_id uuid := public.current_company_id();
  v_items jsonb := '[]'::jsonb;
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
      encode(
        extensions.digest(
          concat_ws(
            ':',
            'vendor_payment_v1',
            oca.id::text,
            oca.assigned_company_id::text
          ),
          'sha256'
        ),
        'hex'
      ) as payment_key,
      oca.status as assignment_status,
      oca.accepted_at,
      coalesce(oca.completed_at, oca.submitted_at) as completion_at,
      oca.completed_at,
      coalesce(
        nullif(oca.submission_payload #>> '{payment,status}', ''),
        nullif(oca.submission_payload #>> '{finance,payment_status}', ''),
        nullif(oca.terms #>> '{payment_status}', '')
      ) as raw_payment_status,
      coalesce(
        nullif(oca.submission_payload #>> '{invoice,status}', ''),
        nullif(oca.submission_payload #>> '{finance,invoice_status}', ''),
        nullif(oca.terms #>> '{invoice_status}', '')
      ) as raw_invoice_status,
      coalesce(oca.submission_payload -> 'invoice', '{}'::jsonb) as invoice_payload,
      coalesce(
        nullif(oca.submission_payload #>> '{payment,method_label}', ''),
        nullif(oca.submission_payload #>> '{payment,payment_method_label}', ''),
        nullif(oca.submission_payload #>> '{finance,payment_method_label}', ''),
        nullif(oca.terms #>> '{payment_method_label}', '')
      ) as payment_method_label,
      coalesce(
        nullif(oca.submission_payload #>> '{payment,paid_at}', ''),
        nullif(oca.submission_payload #>> '{payment,payment_date}', ''),
        nullif(oca.submission_payload #>> '{finance,payment_date}', ''),
        nullif(oca.terms #>> '{payment_date}', '')
      ) as payment_date_text,
      coalesce(
        nullif(oca.submission_payload #>> '{payment,reference_label}', ''),
        nullif(oca.submission_payload #>> '{payment,reference}', ''),
        nullif(oca.submission_payload #>> '{finance,payment_reference_label}', ''),
        nullif(oca.terms #>> '{payment_reference_label}', '')
      ) as payment_reference_label,
      coalesce(
        nullif(oca.submission_payload #>> '{payment,vendor_payment_note}', ''),
        nullif(oca.submission_payload #>> '{payment,vendor_note}', ''),
        nullif(oca.submission_payload #>> '{finance,vendor_payment_note}', '')
      ) as vendor_payment_note,
      coalesce(
        nullif(oca.terms ->> 'currency', ''),
        nullif(oca.handoff_payload #>> '{selected_bid_snapshot,currency}', ''),
        'USD'
      ) as currency,
      coalesce(
        nullif(oca.terms ->> 'vendor_fee', ''),
        nullif(oca.terms ->> 'fee_amount', ''),
        nullif(oca.terms ->> 'payable_amount', ''),
        nullif(oca.handoff_payload #>> '{selected_bid_snapshot,fee_amount}', '')
      ) as vendor_fee_text,
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
  ),
  normalized_rows as (
    select
      assignment_rows.*,
      case
        when lower(coalesce(raw_payment_status, '')) in ('paid', 'complete', 'completed') then 'paid'
        when lower(coalesce(raw_payment_status, '')) in ('scheduled', 'payment_scheduled') then 'scheduled'
        when lower(coalesce(raw_payment_status, raw_invoice_status, '')) in ('hold', 'on_hold', 'blocked') then 'on_hold'
        when lower(coalesce(raw_invoice_status, '')) in ('rejected', 'invoice_rejected') then 'rejected'
        when lower(coalesce(raw_invoice_status, '')) in ('approved', 'invoice_approved') then 'approved'
        when lower(coalesce(raw_invoice_status, '')) in ('received', 'invoice_received', 'submitted') then 'invoice_received'
        when assignment_status = 'completed' then 'ready_for_invoice'
        else 'not_ready'
      end as payment_status,
      case
        when vendor_fee_text ~ '^[0-9]+(\.[0-9]+)?$' then vendor_fee_text::numeric
        else null
      end as vendor_fee_amount
    from assignment_rows
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'payment_key', payment_key,
        'assignment_work_key', assignment_work_key,
        'assignment_status', assignment_status,
        'assignment_completed_at', completion_at,
        'accepted_at', accepted_at,
        'vendor_fee_amount', vendor_fee_amount,
        'currency', currency,
        'invoice_status', case payment_status
          when 'ready_for_invoice' then 'Ready for Invoice'
          when 'invoice_received' then 'Invoice Received'
          when 'approved' then 'Approved'
          when 'scheduled' then 'Approved'
          when 'paid' then 'Approved'
          when 'on_hold' then 'On Hold'
          when 'rejected' then 'Rejected'
          else 'Not Ready'
        end,
        'payment_status', case payment_status
          when 'ready_for_invoice' then 'Ready for Invoice'
          when 'invoice_received' then 'Invoice Received'
          when 'approved' then 'Approved'
          when 'scheduled' then 'Scheduled'
          when 'paid' then 'Paid'
          when 'on_hold' then 'On Hold'
          when 'rejected' then 'Rejected'
          else 'Not Ready'
        end,
        'payment_status_key', payment_status,
        'payment_date', case
          when payment_date_text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then payment_date_text
          else null
        end,
        'payment_method_label', payment_method_label,
        'payment_reference_label', payment_reference_label,
        'vendor_payment_note', vendor_payment_note,
        'invoice', jsonb_strip_nulls(jsonb_build_object(
          'invoice_number', nullif(invoice_payload ->> 'invoice_number', ''),
          'invoice_amount', case
            when (invoice_payload ->> 'invoice_amount') ~ '^[0-9]+(\.[0-9]+)?$'
              then (invoice_payload ->> 'invoice_amount')::numeric
            else null
          end,
          'currency', nullif(invoice_payload ->> 'currency', ''),
          'invoice_date', nullif(invoice_payload ->> 'invoice_date', ''),
          'vendor_note', nullif(invoice_payload ->> 'vendor_note', ''),
          'submitted_at', nullif(invoice_payload ->> 'submitted_at', ''),
          'resubmitted_at', nullif(invoice_payload ->> 'resubmitted_at', ''),
          'document_count', case
            when (invoice_payload ->> 'document_count') ~ '^[0-9]+$'
              then (invoice_payload ->> 'document_count')::integer
            else null
          end,
          'review', jsonb_strip_nulls(jsonb_build_object(
            'status', nullif(invoice_payload #>> '{review,status}', ''),
            'decision', nullif(invoice_payload #>> '{review,decision}', ''),
            'reviewed_at', nullif(invoice_payload #>> '{review,reviewed_at}', ''),
            'vendor_message', nullif(invoice_payload #>> '{review,vendor_message}', ''),
            'approved_amount', nullif(invoice_payload #>> '{review,approved_amount}', '')
          ))
        )),
        'next_action_label', case payment_status
          when 'ready_for_invoice' then 'Invoice submission coming later'
          when 'invoice_received' then 'Awaiting payment review'
          when 'approved' then 'Awaiting payment scheduling'
          when 'scheduled' then 'Payment scheduled'
          when 'paid' then 'Paid'
          when 'on_hold' then 'Contact AMC coordinator'
          when 'rejected' then 'Submit a corrected invoice if requested'
          else 'Payment visible after completion'
        end,
        'order', jsonb_build_object(
          'order_number', order_number,
          'property_address', property_address,
          'city', city,
          'state', state,
          'postal_code', postal_code,
          'county', county,
          'property_type', property_type,
          'report_type', report_type
        ),
        'owner', jsonb_build_object(
          'company_name', owner_company_name
        )
      )
      order by
        case payment_status
          when 'on_hold' then 1
          when 'ready_for_invoice' then 2
          when 'invoice_received' then 3
          when 'approved' then 4
          when 'scheduled' then 5
          when 'paid' then 6
          when 'rejected' then 7
          else 7
        end,
        completion_at desc nulls last,
        created_at desc
    ),
    '[]'::jsonb
  )
    into v_items
    from normalized_rows;

  return jsonb_build_object(
    'ok', true,
    'items', coalesce(v_items, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.rpc_vendor_workspace_payments() from public, anon;
grant execute on function public.rpc_vendor_workspace_payments() to authenticated, service_role;

comment on function public.rpc_vendor_workspace_payments() is
  'AMC-12A authenticated Vendor Workspace read-only payment visibility. Requires vendor_payments.read, scopes rows to current_company_id(), active AMC vendor relationship/profile rows, vendor_appraisal assignments, assigned vendor company, and AMC-scoped orders. Returns opaque payment/assignment keys, vendor-safe property/owner/report data, payable vendor amount from assignment terms or selected vendor bid handoff when modeled, invoice/payment status labels, payment date/reference labels, and next action copy. It does not mutate invoices or payments, expose raw ids, owner-side financial notes, storage paths, shared order routes, owner-side financial APIs, client fees, AMC margins, candidate data, or invoice upload behavior.';

commit;
