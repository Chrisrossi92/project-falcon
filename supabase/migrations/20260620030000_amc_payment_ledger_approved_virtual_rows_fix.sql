begin;

create or replace function public.rpc_amc_vendor_payment_ledger(
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
    raise exception 'vendor_payment_ledger_permission_required'
      using errcode = '42501';
  end if;

  if v_status is not null and v_status not in ('approved', 'scheduled', 'paid') then
    return jsonb_build_object('ok', false, 'error', 'vendor_payment_status_invalid', 'items', '[]'::jsonb);
  end if;

  with payment_rows as (
    select
      oca.id as assignment_id,
      oca.order_id,
      oca.assigned_company_id,
      oca.submission_payload -> 'invoice' as invoice_payload,
      oca.submission_payload -> 'payment' as payment_payload,
      lower(coalesce(oca.submission_payload #>> '{invoice,status}', '')) as invoice_status,
      encode(
        extensions.digest(concat_ws(':', 'amc_vendor_invoice_v1', oca.id::text, oca.owner_company_id::text), 'sha256'),
        'hex'
      ) as invoice_key,
      encode(
        extensions.digest(concat_ws(':', 'vendor_assignment_work_v1', oca.id::text, oca.assigned_company_id::text), 'sha256'),
        'hex'
      ) as assignment_work_key,
      encode(
        extensions.digest(concat_ws(':', 'amc_vendor_payment_v1', vpl.id::text, oca.owner_company_id::text), 'sha256'),
        'hex'
      ) as payment_key,
      coalesce(vpl.status, lower(coalesce(oca.submission_payload #>> '{invoice,status}', '')), lower(coalesce(oca.submission_payload #>> '{payment,status}', ''))) as payment_status,
      vpl.scheduled_payment_date,
      vpl.paid_at,
      coalesce(vpl.payment_method_label, oca.submission_payload #>> '{payment,method_label}') as payment_method_label,
      coalesce(vpl.reference_label, oca.submission_payload #>> '{payment,reference_label}') as reference_label,
      vpl.internal_note,
      coalesce(vpl.vendor_payment_note, oca.submission_payload #>> '{payment,vendor_payment_note}') as vendor_payment_note,
      o.order_number,
      coalesce(nullif(o.property_address, ''), nullif(o.address, '')) as property_address,
      o.city,
      o.state,
      coalesce(nullif(o.postal_code, ''), nullif(o.zip, '')) as postal_code,
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
    left join public.amc_vendor_payment_ledger vpl
      on vpl.assignment_id = oca.id
     and vpl.owner_company_id = oca.owner_company_id
     and vpl.status in ('scheduled', 'paid')
    where oca.owner_company_id = v_owner_company_id
      and oca.assignment_type = 'vendor_appraisal'
      and lower(coalesce(oca.submission_payload #>> '{invoice,status}', '')) in ('approved', 'scheduled', 'paid')
      and (
        v_status is null
        or coalesce(vpl.status, lower(coalesce(oca.submission_payload #>> '{invoice,status}', '')), lower(coalesce(oca.submission_payload #>> '{payment,status}', ''))) = v_status
      )
  )
  select coalesce(
    jsonb_agg(
      jsonb_strip_nulls(jsonb_build_object(
        'invoice_key', invoice_key,
        'payment_key', payment_key,
        'assignment_work_key', assignment_work_key,
        'payment_status', payment_status,
        'payment_status_label', case payment_status
          when 'approved' then 'Approved'
          when 'scheduled' then 'Scheduled'
          when 'paid' then 'Paid'
          else 'Unknown'
        end,
        'scheduled_payment_date', scheduled_payment_date,
        'paid_at', paid_at,
        'payment_method_label', payment_method_label,
        'reference_label', reference_label,
        'internal_note', internal_note,
        'vendor_payment_note', vendor_payment_note,
        'invoice', jsonb_build_object(
          'invoice_number', invoice_payload ->> 'invoice_number',
          'invoice_amount', nullif(invoice_payload ->> 'invoice_amount', '')::numeric,
          'currency', coalesce(nullif(invoice_payload ->> 'currency', ''), 'USD'),
          'approved_amount', nullif(invoice_payload #>> '{review,approved_amount}', '')::numeric
        ),
        'order', jsonb_build_object(
          'order_number', order_number,
          'property_address', property_address,
          'city', city,
          'state', state,
          'postal_code', postal_code,
          'report_type', report_type
        ),
        'vendor', jsonb_build_object('company_name', vendor_company_name)
      ))
      order by
        case payment_status when 'approved' then 1 when 'scheduled' then 2 when 'paid' then 3 else 4 end,
        scheduled_payment_date asc nulls last,
        paid_at desc nulls last
    ),
    '[]'::jsonb
  )
    into v_items
    from payment_rows;

  return jsonb_build_object('ok', true, 'items', coalesce(v_items, '[]'::jsonb));
end;
$$;

revoke all on function public.rpc_amc_vendor_payment_ledger(text) from public, anon;
grant execute on function public.rpc_amc_vendor_payment_ledger(text) to authenticated, service_role;

comment on function public.rpc_amc_vendor_payment_ledger(text) is
  'AMC-13I internal AMC vendor payment ledger queue. Replays approved virtual-row generation from assignment invoice payloads while keeping physical payment ledger rows limited to scheduled and paid payments.';

commit;
