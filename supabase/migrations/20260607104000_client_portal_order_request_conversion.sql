begin;

create or replace view public.v_client_portal_order_request_staff_review
with (security_invoker = false) as
select
  cpor.id as request_id,
  cpor.company_id,
  cpor.client_id,
  public.client_portal_order_request_key(cpor.id, cpor.company_id, cpor.client_id) as request_key,
  cpor.status,
  cpor.property_address,
  cpor.property_type,
  cpor.report_type,
  cpor.loan_purpose,
  cpor.requested_due_date,
  cpor.borrower_contact_name,
  cpor.client_contact_name,
  cpor.client_contact_phone,
  cpor.client_contact_email,
  cpor.notes,
  cpor.created_at as submitted_at,
  cpor.updated_at,
  cpor.reviewed_at,
  cpor.accepted_order_id,
  c.name as client_name,
  requester.full_name as requested_by_name,
  requester.email as requested_by_email,
  reviewer.full_name as reviewed_by_name,
  reviewer.email as reviewed_by_email,
  accepted_order.order_number as accepted_order_number
from public.client_portal_order_requests cpor
join public.clients c
  on c.id = cpor.client_id
 and coalesce(c.company_id, public.default_company_id()) = cpor.company_id
left join public.orders accepted_order
  on accepted_order.id = cpor.accepted_order_id
 and coalesce(accepted_order.company_id, public.default_company_id()) = cpor.company_id
left join public.users requester
  on requester.id = cpor.requested_by_user_id
left join public.users reviewer
  on reviewer.id = cpor.reviewed_by_user_id;

revoke all on public.v_client_portal_order_request_staff_review from public, anon, authenticated;
grant select on public.v_client_portal_order_request_staff_review to service_role;

drop function if exists public.rpc_client_portal_order_request_review_detail(text);

create or replace function public.rpc_client_portal_order_request_review_detail(p_request_key text)
returns table (
  request_key text,
  status text,
  client_name text,
  property_address text,
  property_type text,
  report_type text,
  loan_purpose text,
  requested_due_date date,
  borrower_contact_name text,
  client_contact_name text,
  client_contact_phone text,
  client_contact_email text,
  notes text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  requested_by_name text,
  requested_by_email text,
  reviewed_by_name text,
  reviewed_by_email text,
  accepted_order_id uuid,
  accepted_order_number text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_request_key text := btrim(coalesce(p_request_key, ''));
begin
  if v_request_key = '' then
    raise exception 'client_portal_order_request_key_required'
      using errcode = '22023';
  end if;

  if not public.current_app_user_can_read_client_portal_order_requests() then
    raise exception 'client_portal_order_requests_read_required'
      using errcode = '42501';
  end if;

  return query
  select
    v.request_key,
    v.status,
    v.client_name,
    v.property_address,
    v.property_type,
    v.report_type,
    v.loan_purpose,
    v.requested_due_date,
    v.borrower_contact_name,
    v.client_contact_name,
    v.client_contact_phone,
    v.client_contact_email,
    v.notes,
    v.submitted_at,
    v.reviewed_at,
    v.requested_by_name,
    v.requested_by_email,
    v.reviewed_by_name,
    v.reviewed_by_email,
    v.accepted_order_id,
    v.accepted_order_number
  from public.v_client_portal_order_request_staff_review v
  where v.company_id = public.current_company_id()
    and v.request_key = v_request_key
  limit 1;
end;
$$;

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
   where cpor.company_id = public.current_company_id()
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
    client_id,
    order_number,
    property_address,
    property_type,
    report_type,
    property_contact_name,
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
    v_request.client_id,
    public.next_order_number_v2(public.current_company_id(), now()),
    v_request.property_address,
    v_request.property_type,
    v_request.report_type,
    v_request.borrower_contact_name,
    v_request.borrower_contact_name,
    v_request.client_contact_phone,
    v_request.client_contact_name,
    v_request.client_contact_email,
    v_request.client_contact_phone,
    concat_ws(
      E'\n\n',
      nullif(v_request.loan_purpose, ''),
      nullif(v_request.notes, '')
    ),
    concat_ws(
      E'\n\n',
      'Created from Client Portal request.',
      nullif(v_request.loan_purpose, ''),
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
grant execute on function public.rpc_client_portal_order_request_review_detail(text)
  to authenticated, service_role;

comment on view public.v_client_portal_order_request_staff_review is
  'Staff-safe Client Portal order request review projection scoped by RPCs to current_company_id(). Shows intake request details, client/requester contact fields, and minimal accepted order linkage, but does not expose vendor procurement, assignment packets, fees, margins, invoices, or document storage internals.';

comment on function public.rpc_client_portal_order_request_review_detail(text) is
  'Returns current-company Client Portal order request detail by opaque request_key for staff review, including minimal converted order linkage when present. Requires client_portal.order_requests.read or manage.';

comment on function public.rpc_client_portal_order_request_convert_to_order(text) is
  'Converts a submitted or under_review Client Portal order request into one operational order after staff confirmation. Requires client_portal.order_requests.manage and orders.create, scopes to current_company_id(), links accepted_order_id, and does not create assignments, vendor bidding, invoices, payments, reports, or documents.';

commit;
