begin;

create or replace function public.rpc_client_portal_order_request_convert_to_order(
  p_request_key text
)
returns table (
  request_key text,
  status text,
  order_id uuid,
  order_number text,
  property_address text,
  client_name text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_request_key text := btrim(coalesce(p_request_key, ''));
  v_request public.client_portal_order_requests%rowtype;
  v_order public.orders%rowtype;
  v_client public.clients%rowtype;
  v_company_id uuid := public.current_company_id();
begin
  if v_request_key = '' then
    raise exception 'client_portal_order_request_key_required'
      using errcode = '22023';
  end if;

  if not public.current_app_user_can_manage_client_portal_order_requests() then
    raise exception 'client_portal_order_requests_manage_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_create_order() then
    raise exception 'orders_create_required'
      using errcode = '42501';
  end if;

  select cpor.*
    into v_request
    from public.client_portal_order_requests cpor
   where cpor.company_id = v_company_id
     and public.client_portal_order_request_key(cpor.id, cpor.company_id, cpor.client_id) = v_request_key
   for update;

  if not found then
    raise exception 'client_portal_order_request_not_found'
      using errcode = 'P0002';
  end if;

  if v_request.status in ('declined', 'cancelled') then
    raise exception 'client_portal_order_request_not_convertible'
      using errcode = '22023';
  end if;

  if v_request.accepted_order_id is not null or v_request.status = 'accepted' then
    raise exception 'client_portal_order_request_already_converted'
      using errcode = '22023';
  end if;

  if v_request.status not in ('submitted', 'under_review') then
    raise exception 'client_portal_order_request_not_convertible'
      using errcode = '22023';
  end if;

  select *
    into v_client
    from public.clients c
   where c.id = v_request.client_id
     and coalesce(c.company_id, public.default_company_id()) = v_request.company_id
   limit 1;

  if not found then
    raise exception 'client_not_found'
      using errcode = 'P0002';
  end if;

  insert into public.orders (
    company_id,
    operations_scope,
    client_id,
    order_number,
    property_address,
    property_type,
    report_type,
    property_contact_name,
    property_contact_phone,
    entry_contact_name,
    entry_contact_phone,
    client_contact_name,
    client_contact_email,
    client_contact_phone,
    special_instructions,
    notes,
    final_due_at,
    status,
    created_at,
    updated_at
  )
  values (
    v_request.company_id,
    'amc_operations',
    v_request.client_id,
    public.next_order_number_v2(v_request.company_id, now()),
    v_request.property_address,
    v_request.property_type,
    v_request.report_type,
    v_request.borrower_contact_name,
    v_request.client_contact_phone,
    v_request.borrower_contact_name,
    v_request.client_contact_phone,
    v_request.client_contact_name,
    v_request.client_contact_email,
    v_request.client_contact_phone,
    concat_ws(
      E'\n\n',
      case
        when nullif(v_request.loan_purpose, '') is null then null
        else 'Intended use / loan purpose: ' || v_request.loan_purpose
      end,
      nullif(v_request.notes, '')
    ),
    concat_ws(
      E'\n\n',
      'Created from Client Portal request.',
      'Client Portal request key: ' || v_request_key,
      case
        when nullif(v_request.loan_purpose, '') is null then null
        else 'Intended use / loan purpose: ' || v_request.loan_purpose
      end,
      nullif(v_request.notes, '')
    ),
    case
      when v_request.requested_due_date is null then null
      else v_request.requested_due_date::timestamptz
    end,
    'new',
    now(),
    now()
  )
  returning *
    into v_order;

  update public.client_portal_order_requests cpor
     set status = 'accepted',
         accepted_order_id = v_order.id,
         reviewed_by_user_id = public.current_app_user_id(),
         reviewed_at = coalesce(cpor.reviewed_at, now())
   where cpor.id = v_request.id
   returning *
    into v_request;

  return query
  select
    public.client_portal_order_request_key(v_request.id, v_request.company_id, v_request.client_id),
    v_request.status,
    v_order.id,
    v_order.order_number,
    v_order.property_address,
    v_client.name;
end;
$$;

revoke all on function public.rpc_client_portal_order_request_convert_to_order(text) from public, anon;
grant execute on function public.rpc_client_portal_order_request_convert_to_order(text)
  to authenticated, service_role;

comment on function public.rpc_client_portal_order_request_convert_to_order(text) is
  'Converts a submitted or under_review Client Portal order request into one current-company AMC Operations order after staff confirmation. Maps client, property/report type, intended use, due date, contact fields, notes, and request linkage; does not create assignments, vendor bidding, invoices, payments, reports, or documents.';

commit;
