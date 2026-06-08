begin;

create or replace function public.current_app_user_client_portal_memberships()
returns table (
  company_id uuid,
  client_id bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct cpm.company_id, cpm.client_id
    from public.client_portal_members cpm
    join public.clients c
      on c.id = cpm.client_id
     and coalesce(c.company_id, public.default_company_id()) = cpm.company_id
   where cpm.user_id = public.current_app_user_id()
     and cpm.status = 'active'
     and coalesce(c.status, 'active') <> 'archived';
$$;

create or replace function public.current_app_user_client_portal_client_ids()
returns table (
  client_id bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct readable.client_id
    from public.current_app_user_client_portal_memberships() readable;
$$;

create or replace function public.current_app_user_can_read_client_portal()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_app_user_id() is not null
    and (
      public.current_app_user_has_permission('client_portal.dashboard.view')
      or public.current_app_user_has_permission('client_portal.orders.read')
    )
    and exists (
      select 1
        from public.current_app_user_client_portal_memberships()
    );
$$;

create or replace function public.current_app_user_can_create_client_portal_order_request()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_app_user_id() is not null
    and public.current_app_user_has_permission('client_portal.orders.create')
    and exists (
      select 1
        from public.current_app_user_client_portal_memberships()
    );
$$;

create or replace function public.rpc_client_portal_order_request_create(
  p_property_address text,
  p_property_type text,
  p_report_type text,
  p_loan_purpose text default null,
  p_requested_due_date date default null,
  p_borrower_contact_name text default null,
  p_client_contact_name text default null,
  p_client_contact_phone text default null,
  p_client_contact_email text default null,
  p_notes text default null
)
returns table (
  request_key text,
  status text,
  submitted_at timestamptz,
  property_address text,
  property_type text,
  report_type text,
  requested_due_date date
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.current_app_user_id();
  v_company_id uuid;
  v_client_id bigint;
  v_request public.client_portal_order_requests%rowtype;
  v_property_address text := btrim(coalesce(p_property_address, ''));
  v_property_type text := btrim(coalesce(p_property_type, ''));
  v_report_type text := btrim(coalesce(p_report_type, ''));
  v_loan_purpose text := nullif(btrim(coalesce(p_loan_purpose, '')), '');
  v_borrower_contact_name text := nullif(btrim(coalesce(p_borrower_contact_name, '')), '');
  v_client_contact_name text := nullif(btrim(coalesce(p_client_contact_name, '')), '');
  v_client_contact_phone text := nullif(btrim(coalesce(p_client_contact_phone, '')), '');
  v_client_contact_email text := nullif(lower(btrim(coalesce(p_client_contact_email, ''))), '');
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
begin
  if v_user_id is null then
    raise exception 'client_portal_authentication_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('client_portal.orders.create') then
    raise exception 'client_portal_order_request_permission_required'
      using errcode = '42501';
  end if;

  select readable.company_id, readable.client_id
    into v_company_id, v_client_id
    from public.current_app_user_client_portal_memberships() readable
    order by readable.company_id, readable.client_id
    limit 1;

  if v_company_id is null or v_client_id is null then
    raise exception 'client_portal_membership_required'
      using errcode = '42501';
  end if;

  if v_property_address = '' then
    raise exception 'property_address_required'
      using errcode = '22023';
  end if;

  if v_property_type = '' then
    raise exception 'property_type_required'
      using errcode = '22023';
  end if;

  if v_report_type = '' then
    raise exception 'report_type_required'
      using errcode = '22023';
  end if;

  if p_requested_due_date is not null and p_requested_due_date < current_date then
    raise exception 'requested_due_date_must_be_future'
      using errcode = '22023';
  end if;

  if v_client_contact_email is not null
     and v_client_contact_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'client_contact_email_invalid'
      using errcode = '22023';
  end if;

  insert into public.client_portal_order_requests (
    company_id,
    client_id,
    requested_by_user_id,
    property_address,
    property_type,
    report_type,
    loan_purpose,
    requested_due_date,
    borrower_contact_name,
    client_contact_name,
    client_contact_phone,
    client_contact_email,
    notes
  )
  values (
    v_company_id,
    v_client_id,
    v_user_id,
    v_property_address,
    v_property_type,
    v_report_type,
    v_loan_purpose,
    p_requested_due_date,
    v_borrower_contact_name,
    v_client_contact_name,
    v_client_contact_phone,
    v_client_contact_email,
    v_notes
  )
  returning *
    into v_request;

  return query
  select
    public.client_portal_order_request_key(v_request.id, v_request.company_id, v_request.client_id),
    v_request.status,
    v_request.created_at,
    v_request.property_address,
    v_request.property_type,
    v_request.report_type,
    v_request.requested_due_date;
end;
$$;

revoke all on function public.current_app_user_client_portal_memberships()
  from public, anon;
revoke all on function public.current_app_user_client_portal_client_ids()
  from public, anon;
revoke all on function public.current_app_user_can_read_client_portal()
  from public, anon;
revoke all on function public.current_app_user_can_create_client_portal_order_request()
  from public, anon;
revoke all on function public.rpc_client_portal_order_request_create(
  text,
  text,
  text,
  text,
  date,
  text,
  text,
  text,
  text,
  text
) from public, anon;

grant execute on function public.current_app_user_client_portal_memberships()
  to authenticated, service_role;
grant execute on function public.current_app_user_client_portal_client_ids()
  to authenticated, service_role;
grant execute on function public.current_app_user_can_read_client_portal()
  to authenticated, service_role;
grant execute on function public.current_app_user_can_create_client_portal_order_request()
  to authenticated, service_role;
grant execute on function public.rpc_client_portal_order_request_create(
  text,
  text,
  text,
  text,
  date,
  text,
  text,
  text,
  text,
  text
) to authenticated, service_role;

comment on function public.current_app_user_client_portal_memberships() is
  'Returns active Client Portal company/client memberships for the authenticated app user without requiring operational company membership.';

comment on function public.rpc_client_portal_order_request_create(
  text,
  text,
  text,
  text,
  date,
  text,
  text,
  text,
  text,
  text
) is
  'Creates a Client Portal order request for the authenticated active client_portal_members company/client context. Does not require operational company membership and returns specific errors for missing auth, permission, membership, or required intake fields.';

commit;
