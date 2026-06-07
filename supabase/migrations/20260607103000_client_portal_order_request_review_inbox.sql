begin;

insert into public.permissions (key, category, label, description)
values
  (
    'client_portal.order_requests.read',
    'client_portal',
    'Read Client Portal order requests',
    'Allows staff to view submitted Client Portal appraisal request intake records for the current company.'
  ),
  (
    'client_portal.order_requests.manage',
    'client_portal',
    'Manage Client Portal order requests',
    'Allows staff to mark submitted Client Portal appraisal request intake records as reviewing or rejected.'
  )
on conflict (key) do update
   set category = excluded.category,
       label = excluded.label,
       description = excluded.description;

create or replace function public.current_app_user_can_read_client_portal_order_requests()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_app_user_has_current_company()
    and public.current_app_user_id() is not null
    and (
      public.current_app_user_has_permission('client_portal.order_requests.read')
      or public.current_app_user_has_permission('client_portal.order_requests.manage')
    );
$$;

create or replace function public.current_app_user_can_manage_client_portal_order_requests()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_app_user_has_current_company()
    and public.current_app_user_id() is not null
    and public.current_app_user_has_permission('client_portal.order_requests.manage');
$$;

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
  reviewer.email as reviewed_by_email
from public.client_portal_order_requests cpor
join public.clients c
  on c.id = cpor.client_id
 and coalesce(c.company_id, public.default_company_id()) = cpor.company_id
left join public.users requester
  on requester.id = cpor.requested_by_user_id
left join public.users reviewer
  on reviewer.id = cpor.reviewed_by_user_id;

revoke all on public.v_client_portal_order_request_staff_review from public, anon, authenticated;
grant select on public.v_client_portal_order_request_staff_review to service_role;

create or replace function public.rpc_client_portal_order_requests_for_review()
returns table (
  request_key text,
  status text,
  client_name text,
  property_address text,
  property_type text,
  report_type text,
  requested_due_date date,
  submitted_at timestamptz,
  requested_by_name text,
  requested_by_email text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
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
    v.requested_due_date,
    v.submitted_at,
    v.requested_by_name,
    v.requested_by_email
  from public.v_client_portal_order_request_staff_review v
  where v.company_id = public.current_company_id()
  order by
    case v.status
      when 'submitted' then 0
      when 'under_review' then 1
      when 'accepted' then 2
      when 'declined' then 3
      when 'cancelled' then 4
      else 5
    end,
    v.submitted_at desc,
    v.request_key asc;
end;
$$;

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
  accepted_order_id uuid
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
    v.accepted_order_id
  from public.v_client_portal_order_request_staff_review v
  where v.company_id = public.current_company_id()
    and v.request_key = v_request_key
  limit 1;
end;
$$;

create or replace function public.rpc_client_portal_order_request_review_update_status(
  p_request_key text,
  p_status text
)
returns table (
  request_key text,
  status text,
  reviewed_at timestamptz,
  reviewed_by_name text,
  reviewed_by_email text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_request_key text := btrim(coalesce(p_request_key, ''));
  v_status text := lower(btrim(coalesce(p_status, '')));
  v_request public.client_portal_order_requests%rowtype;
  v_reviewer public.users%rowtype;
begin
  if v_request_key = '' then
    raise exception 'client_portal_order_request_key_required'
      using errcode = '22023';
  end if;

  if v_status not in ('under_review', 'declined') then
    raise exception 'client_portal_order_request_status_unsupported'
      using errcode = '22023';
  end if;

  if not public.current_app_user_can_manage_client_portal_order_requests() then
    raise exception 'client_portal_order_requests_manage_required'
      using errcode = '42501';
  end if;

  select cpor.*
    into v_request
    from public.client_portal_order_requests cpor
   where cpor.company_id = public.current_company_id()
     and public.client_portal_order_request_key(cpor.id, cpor.company_id, cpor.client_id) = v_request_key
   limit 1;

  if not found then
    raise exception 'client_portal_order_request_not_found'
      using errcode = 'P0002';
  end if;

  if v_request.status in ('accepted', 'declined', 'cancelled') then
    raise exception 'client_portal_order_request_terminal'
      using errcode = '22023';
  end if;

  update public.client_portal_order_requests cpor
     set status = v_status,
         reviewed_by_user_id = public.current_app_user_id(),
         reviewed_at = now()
   where cpor.id = v_request.id
   returning *
    into v_request;

  select *
    into v_reviewer
    from public.users u
   where u.id = v_request.reviewed_by_user_id
   limit 1;

  return query
  select
    public.client_portal_order_request_key(v_request.id, v_request.company_id, v_request.client_id),
    v_request.status,
    v_request.reviewed_at,
    v_reviewer.full_name,
    v_reviewer.email;
end;
$$;

revoke all on function public.current_app_user_can_read_client_portal_order_requests() from public, anon;
revoke all on function public.current_app_user_can_manage_client_portal_order_requests() from public, anon;
revoke all on function public.rpc_client_portal_order_requests_for_review() from public, anon;
revoke all on function public.rpc_client_portal_order_request_review_detail(text) from public, anon;
revoke all on function public.rpc_client_portal_order_request_review_update_status(text, text) from public, anon;

grant execute on function public.current_app_user_can_read_client_portal_order_requests()
  to authenticated, service_role;
grant execute on function public.current_app_user_can_manage_client_portal_order_requests()
  to authenticated, service_role;
grant execute on function public.rpc_client_portal_order_requests_for_review()
  to authenticated, service_role;
grant execute on function public.rpc_client_portal_order_request_review_detail(text)
  to authenticated, service_role;
grant execute on function public.rpc_client_portal_order_request_review_update_status(text, text)
  to authenticated, service_role;

comment on view public.v_client_portal_order_request_staff_review is
  'Staff-safe Client Portal order request review projection scoped by RPCs to current_company_id(). Shows intake request details and client/requester contact fields, but does not create operational orders or expose vendor procurement, assignment packets, fees, margins, invoices, or document storage internals.';

comment on function public.rpc_client_portal_order_requests_for_review() is
  'Lists current-company Client Portal order requests for staff review. Requires client_portal.order_requests.read or manage.';

comment on function public.rpc_client_portal_order_request_review_detail(text) is
  'Returns current-company Client Portal order request detail by opaque request_key for staff review. Requires client_portal.order_requests.read or manage.';

comment on function public.rpc_client_portal_order_request_review_update_status(text, text) is
  'Marks current-company Client Portal order request as under_review or declined. Requires client_portal.order_requests.manage. Does not convert requests into operational orders.';

commit;
