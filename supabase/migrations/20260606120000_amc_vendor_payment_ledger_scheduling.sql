begin;

create extension if not exists "pgcrypto";

create table if not exists public.amc_vendor_payment_ledger (
  id uuid primary key default gen_random_uuid(),
  owner_company_id uuid not null references public.companies(id) on delete cascade,
  assignment_id uuid not null references public.order_company_assignments(id) on delete cascade,
  vendor_company_id uuid not null references public.companies(id) on delete restrict,
  invoice_key text not null,
  status text not null default 'scheduled',
  scheduled_payment_date date,
  paid_at timestamptz,
  payment_method_label text,
  reference_label text,
  internal_note text,
  vendor_payment_note text,
  scheduled_by_user_id uuid references auth.users(id) on delete set null,
  paid_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint amc_vendor_payment_ledger_status_check
    check (status in ('scheduled', 'paid', 'cancelled'))
);

create unique index if not exists amc_vendor_payment_ledger_one_active_assignment
  on public.amc_vendor_payment_ledger (assignment_id)
  where status in ('scheduled', 'paid');

create index if not exists amc_vendor_payment_ledger_owner_status_idx
  on public.amc_vendor_payment_ledger (owner_company_id, status, scheduled_payment_date);

alter table public.amc_vendor_payment_ledger enable row level security;

revoke all on public.amc_vendor_payment_ledger from public, anon, authenticated;
grant all on public.amc_vendor_payment_ledger to service_role;

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
      coalesce(vpl.status, lower(coalesce(oca.submission_payload #>> '{payment,status}', '')), lower(coalesce(oca.submission_payload #>> '{invoice,status}', ''))) as payment_status,
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
        or coalesce(vpl.status, lower(coalesce(oca.submission_payload #>> '{payment,status}', '')), lower(coalesce(oca.submission_payload #>> '{invoice,status}', ''))) = v_status
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

create or replace function public.rpc_amc_schedule_vendor_payment(
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
  v_scheduled_date date;
  v_method_label text;
  v_reference_label text;
  v_internal_note text;
  v_vendor_note text;
  v_payment public.amc_vendor_payment_ledger%rowtype;
  v_payment_payload jsonb;
  v_payment_key text;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found' using errcode = '42501';
  end if;

  if v_owner_company_id is null then
    raise exception 'company_not_found' using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required' using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('vendors.read')
     or not public.current_app_user_has_permission('billing.update') then
    raise exception 'vendor_payment_schedule_permission_required' using errcode = '42501';
  end if;

  if p_invoice_key is null or p_invoice_key !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'vendor_invoice_unavailable');
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'vendor_payment_schedule_invalid', 'field_errors', jsonb_build_object('payload', 'Payment schedule payload must be an object.'));
  end if;

  begin
    v_scheduled_date := nullif(v_payload ->> 'scheduled_payment_date', '')::date;
  exception when others then
    return jsonb_build_object('ok', false, 'error', 'vendor_payment_schedule_invalid', 'field_errors', jsonb_build_object('scheduled_payment_date', 'Use YYYY-MM-DD for scheduled payment date.'));
  end;

  if v_scheduled_date is null then
    return jsonb_build_object('ok', false, 'error', 'vendor_payment_schedule_invalid', 'field_errors', jsonb_build_object('scheduled_payment_date', 'Choose a scheduled payment date.'));
  end if;

  v_method_label := nullif(btrim(coalesce(v_payload ->> 'payment_method_label', '')), '');
  v_reference_label := nullif(btrim(coalesce(v_payload ->> 'reference_label', v_payload ->> 'reference_note', '')), '');
  v_internal_note := nullif(btrim(coalesce(v_payload ->> 'internal_note', '')), '');
  v_vendor_note := nullif(btrim(coalesce(v_payload ->> 'vendor_payment_note', v_payload ->> 'vendor_note', '')), '');

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
      and lower(coalesce(oca.submission_payload #>> '{invoice,status}', '')) = 'approved'
      and encode(
            extensions.digest(concat_ws(':', 'amc_vendor_invoice_v1', oca.id::text, oca.owner_company_id::text), 'sha256'),
            'hex'
          ) = p_invoice_key
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'vendor_invoice_unavailable');
  end if;

  insert into public.amc_vendor_payment_ledger (
    owner_company_id,
    assignment_id,
    vendor_company_id,
    invoice_key,
    status,
    scheduled_payment_date,
    payment_method_label,
    reference_label,
    internal_note,
    vendor_payment_note,
    scheduled_by_user_id
  ) values (
    v_assignment.owner_company_id,
    v_assignment.id,
    v_assignment.assigned_company_id,
    p_invoice_key,
    'scheduled',
    v_scheduled_date,
    v_method_label,
    v_reference_label,
    v_internal_note,
    v_vendor_note,
    v_actor_user_id
  )
  on conflict (assignment_id) where status in ('scheduled', 'paid')
  do update set
    status = 'scheduled',
    scheduled_payment_date = excluded.scheduled_payment_date,
    payment_method_label = excluded.payment_method_label,
    reference_label = excluded.reference_label,
    internal_note = excluded.internal_note,
    vendor_payment_note = excluded.vendor_payment_note,
    scheduled_by_user_id = excluded.scheduled_by_user_id,
    paid_at = null,
    paid_by_user_id = null,
    updated_at = now()
  returning * into v_payment;

  v_payment_key := encode(
    extensions.digest(concat_ws(':', 'amc_vendor_payment_v1', v_payment.id::text, v_payment.owner_company_id::text), 'sha256'),
    'hex'
  );

  v_payment_payload := jsonb_strip_nulls(jsonb_build_object(
    'status', 'scheduled',
    'scheduled_payment_date', v_scheduled_date,
    'method_label', v_method_label,
    'reference_label', v_reference_label,
    'vendor_payment_note', v_vendor_note,
    'scheduled_at', now(),
    'scheduled_by_user_id', v_actor_user_id
  ));

  update public.order_company_assignments
     set submission_payload = jsonb_set(
           jsonb_set(coalesce(submission_payload, '{}'::jsonb), '{invoice,status}', to_jsonb('scheduled'::text), true),
           '{payment}',
           v_payment_payload,
           true
         )
   where id = v_assignment.id;

  return jsonb_build_object(
    'ok', true,
    'payment_key', v_payment_key,
    'payment_status', 'scheduled',
    'message', 'Vendor payment scheduled.'
  );
end;
$$;

create or replace function public.rpc_amc_mark_vendor_payment_paid(
  p_payment_key text,
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
  v_payment public.amc_vendor_payment_ledger%rowtype;
  v_paid_date date;
  v_method_label text;
  v_reference_label text;
  v_internal_note text;
  v_vendor_note text;
  v_payment_payload jsonb;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found' using errcode = '42501';
  end if;

  if v_owner_company_id is null then
    raise exception 'company_not_found' using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required' using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('vendors.read')
     or not public.current_app_user_has_permission('billing.update') then
    raise exception 'vendor_payment_paid_permission_required' using errcode = '42501';
  end if;

  if p_payment_key is null or p_payment_key !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'vendor_payment_unavailable');
  end if;

  begin
    v_paid_date := coalesce(nullif(v_payload ->> 'paid_date', '')::date, current_date);
  exception when others then
    return jsonb_build_object('ok', false, 'error', 'vendor_payment_paid_invalid', 'field_errors', jsonb_build_object('paid_date', 'Use YYYY-MM-DD for paid date.'));
  end;

  v_method_label := nullif(btrim(coalesce(v_payload ->> 'payment_method_label', '')), '');
  v_reference_label := nullif(btrim(coalesce(v_payload ->> 'reference_label', v_payload ->> 'reference_note', '')), '');
  v_internal_note := nullif(btrim(coalesce(v_payload ->> 'internal_note', '')), '');
  v_vendor_note := nullif(btrim(coalesce(v_payload ->> 'vendor_payment_note', v_payload ->> 'vendor_note', '')), '');

  select vpl.*
    into v_payment
    from public.amc_vendor_payment_ledger vpl
    join public.order_company_assignments oca
      on oca.id = vpl.assignment_id
     and oca.owner_company_id = vpl.owner_company_id
     and oca.assignment_type = 'vendor_appraisal'
    join public.orders o
      on o.id = oca.order_id
     and coalesce(o.company_id, public.default_company_id()) = oca.owner_company_id
     and coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'
    where vpl.owner_company_id = v_owner_company_id
      and vpl.status = 'scheduled'
      and encode(
            extensions.digest(concat_ws(':', 'amc_vendor_payment_v1', vpl.id::text, vpl.owner_company_id::text), 'sha256'),
            'hex'
          ) = p_payment_key
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'vendor_payment_unavailable');
  end if;

  update public.amc_vendor_payment_ledger
     set status = 'paid',
         paid_at = v_paid_date::timestamptz,
         paid_by_user_id = v_actor_user_id,
         payment_method_label = coalesce(v_method_label, payment_method_label),
         reference_label = coalesce(v_reference_label, reference_label),
         internal_note = coalesce(v_internal_note, internal_note),
         vendor_payment_note = coalesce(v_vendor_note, vendor_payment_note),
         updated_at = now()
   where id = v_payment.id
   returning * into v_payment;

  v_payment_payload := jsonb_strip_nulls(jsonb_build_object(
    'status', 'paid',
    'scheduled_payment_date', v_payment.scheduled_payment_date,
    'paid_at', v_payment.paid_at,
    'payment_date', v_paid_date,
    'method_label', v_payment.payment_method_label,
    'reference_label', v_payment.reference_label,
    'vendor_payment_note', v_payment.vendor_payment_note,
    'paid_by_user_id', v_actor_user_id
  ));

  update public.order_company_assignments
     set submission_payload = jsonb_set(
           jsonb_set(coalesce(submission_payload, '{}'::jsonb), '{invoice,status}', to_jsonb('paid'::text), true),
           '{payment}',
           v_payment_payload,
           true
         )
   where id = v_payment.assignment_id;

  return jsonb_build_object(
    'ok', true,
    'payment_key', p_payment_key,
    'payment_status', 'paid',
    'message', 'Vendor payment marked paid.'
  );
end;
$$;

revoke all on function public.rpc_amc_vendor_payment_ledger(text) from public, anon;
revoke all on function public.rpc_amc_schedule_vendor_payment(text, jsonb) from public, anon;
revoke all on function public.rpc_amc_mark_vendor_payment_paid(text, jsonb) from public, anon;

grant execute on function public.rpc_amc_vendor_payment_ledger(text) to authenticated, service_role;
grant execute on function public.rpc_amc_schedule_vendor_payment(text, jsonb) to authenticated, service_role;
grant execute on function public.rpc_amc_mark_vendor_payment_paid(text, jsonb) to authenticated, service_role;

comment on table public.amc_vendor_payment_ledger is
  'AMC-12E internal-only vendor payment scheduling ledger for approved AMC vendor invoices. It tracks schedule/paid state without payment processor integration and keeps internal notes out of Vendor Workspace.';

comment on function public.rpc_amc_vendor_payment_ledger(text) is
  'AMC-12E internal payment ledger queue. Requires vendors.read and billing.update, scopes to current owner company, AMC-scoped vendor_appraisal assignments, and approved/scheduled/paid invoice states. Returns opaque payment/invoice keys and internal scheduling data only.';

comment on function public.rpc_amc_schedule_vendor_payment(text, jsonb) is
  'AMC-12E internal payment scheduling action. Schedules only approved vendor invoices, stores internal notes separately from vendor payment notes, updates vendor-visible payment status to scheduled, and does not call banks or payment processors.';

comment on function public.rpc_amc_mark_vendor_payment_paid(text, jsonb) is
  'AMC-12E internal mark-paid action. Marks scheduled vendor payments paid, stamps paid date/reference, keeps internal notes internal, updates vendor-visible payment status to paid, and does not call banks or payment processors.';

commit;
