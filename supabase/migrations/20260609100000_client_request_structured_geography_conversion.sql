begin;

alter table public.client_portal_order_requests
  add column if not exists property_city text null,
  add column if not exists property_state text null,
  add column if not exists property_postal_code text null,
  add column if not exists property_county text null;

comment on column public.client_portal_order_requests.property_city is
  'AMC-10A structured client request geography copied to orders.city during conversion.';
comment on column public.client_portal_order_requests.property_state is
  'AMC-10A structured client request state copied to orders.state during conversion.';
comment on column public.client_portal_order_requests.property_postal_code is
  'AMC-10A structured client request ZIP/postal code copied to orders.postal_code and orders.zip during conversion.';
comment on column public.client_portal_order_requests.property_county is
  'AMC-10A optional structured client request county copied to orders.county during conversion when provided.';

drop function if exists public.rpc_client_portal_order_request_create(
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
);

create or replace function public.rpc_client_portal_order_request_create(
  p_property_address text,
  p_property_city text default null,
  p_property_state text default null,
  p_property_postal_code text default null,
  p_property_county text default null,
  p_property_type text default null,
  p_report_type text default null,
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
  property_city text,
  property_state text,
  property_postal_code text,
  property_county text,
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
  v_client_name text;
  v_request public.client_portal_order_requests%rowtype;
  v_request_key text;
  v_notification_body text;
  v_property_address text := btrim(coalesce(p_property_address, ''));
  v_property_city text := nullif(btrim(coalesce(p_property_city, '')), '');
  v_property_state text := nullif(upper(btrim(coalesce(p_property_state, ''))), '');
  v_property_postal_code text := nullif(btrim(coalesce(p_property_postal_code, '')), '');
  v_property_county text := nullif(btrim(coalesce(p_property_county, '')), '');
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

  if v_property_city is null then
    raise exception 'property_city_required'
      using errcode = '22023';
  end if;

  if v_property_state is null or v_property_state !~ '^[A-Z]{2}$' then
    raise exception 'property_state_required'
      using errcode = '22023';
  end if;

  if v_property_postal_code is null then
    raise exception 'property_postal_code_required'
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

  select c.name
    into v_client_name
    from public.clients c
   where c.id = v_client_id
     and coalesce(c.company_id, public.default_company_id()) = v_company_id
   limit 1;

  insert into public.client_portal_order_requests (
    company_id,
    client_id,
    requested_by_user_id,
    property_address,
    property_city,
    property_state,
    property_postal_code,
    property_county,
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
    v_property_city,
    v_property_state,
    v_property_postal_code,
    v_property_county,
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

  v_request_key := public.client_portal_order_request_key(
    v_request.id,
    v_request.company_id,
    v_request.client_id
  );

  v_notification_body := concat_ws(
    ' ',
    nullif(v_property_address, ''),
    case
      when nullif(v_client_name, '') is null then 'is waiting for review.'
      else '(' || v_client_name || ') is waiting for review.'
    end
  );

  insert into public.notifications (
    user_id,
    company_id,
    type,
    category,
    priority,
    title,
    body,
    message,
    order_id,
    link_path,
    payload,
    is_read,
    created_at
  )
  select
    recipients.user_id,
    v_company_id,
    'client_portal.order_request.submitted',
    'client_portal',
    'action',
    'New client request submitted',
    v_notification_body,
    v_notification_body,
    null::uuid,
    '/client-requests',
    jsonb_build_object(
      'operations_scope', 'amc_operations',
      'request_key', v_request_key,
      'property_address', v_property_address,
      'property_city', v_property_city,
      'property_state', v_property_state,
      'property_postal_code', v_property_postal_code,
      'property_county', v_property_county,
      'client_name', nullif(v_client_name, ''),
      'requested_due_date', v_request.requested_due_date,
      'source_type', 'client_portal_order_request'
    ),
    false,
    now()
  from (
    with candidates as (
      select
        u.id as user_id,
        case
          when r.is_owner_role or lower(btrim(r.name)) = 'owner' then 1
          when lower(btrim(r.name)) = 'admin' then 2
          else 3
        end as sort_key
        from public.company_memberships cm
        join public.users u
          on u.id = cm.user_id
        join public.user_role_assignments ura
          on ura.user_id = cm.user_id
         and ura.company_id = cm.company_id
         and ura.status = 'active'
         and (ura.expires_at is null or ura.expires_at > now())
        join public.roles r
          on r.id = ura.role_id
        left join public.role_permissions rp
          on rp.role_id = r.id
         and rp.permission_key in (
           'client_portal.order_requests.read',
           'client_portal.order_requests.manage'
         )
       where cm.company_id = v_company_id
         and cm.status = 'active'
         and cm.user_id <> v_user_id
         and coalesce(u.is_active, true)
         and coalesce(lower(btrim(u.status)), 'active') = 'active'
         and (
           r.is_owner_role
           or lower(btrim(r.name)) in ('owner', 'admin')
           or rp.permission_key is not null
         )
    )
    select distinct on (c.user_id)
      c.user_id,
      c.sort_key
      from candidates c
     order by c.user_id, c.sort_key
  ) recipients
  order by recipients.sort_key, recipients.user_id
  on conflict do nothing;

  return query
  select
    v_request_key,
    v_request.status,
    v_request.created_at,
    v_request.property_address,
    v_request.property_city,
    v_request.property_state,
    v_request.property_postal_code,
    v_request.property_county,
    v_request.property_type,
    v_request.report_type,
    v_request.requested_due_date;
end;
$$;

drop function if exists public.rpc_client_portal_order_request_convert_to_order(text);
drop function if exists public.rpc_client_portal_order_request_review_update_status(text, text);
drop function if exists public.rpc_client_portal_order_request_review_detail(text);
drop function if exists public.rpc_client_portal_order_requests_for_review();

drop view if exists public.v_client_portal_order_request_staff_review;

create view public.v_client_portal_order_request_staff_review
with (security_invoker = false) as
select
  cpor.id as request_id,
  cpor.company_id,
  cpor.client_id,
  public.client_portal_order_request_key(cpor.id, cpor.company_id, cpor.client_id) as request_key,
  cpor.status,
  cpor.property_address,
  cpor.property_city,
  cpor.property_state,
  cpor.property_postal_code,
  cpor.property_county,
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

create or replace function public.rpc_client_portal_order_requests_for_review()
returns table (
  request_key text,
  status text,
  client_name text,
  property_address text,
  property_city text,
  property_state text,
  property_postal_code text,
  property_county text,
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
    v.property_city,
    v.property_state,
    v.property_postal_code,
    v.property_county,
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
  property_city text,
  property_state text,
  property_postal_code text,
  property_county text,
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
    v.property_city,
    v.property_state,
    v.property_postal_code,
    v.property_county,
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
    address,
    city,
    state,
    county,
    postal_code,
    zip,
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
    client_due_at,
    final_due_at,
    due_to_client,
    due_date,
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
    v_request.property_address,
    v_request.property_city,
    v_request.property_state,
    v_request.property_county,
    v_request.property_postal_code,
    v_request.property_postal_code,
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
    case
      when v_request.requested_due_date is null then null
      else v_request.requested_due_date::timestamptz
    end,
    v_request.requested_due_date,
    v_request.requested_due_date,
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

create or replace function public.rpc_client_portal_pending_order_requests()
returns table (
  request_key text,
  status text,
  status_label text,
  property_address text,
  property_city text,
  property_state text,
  property_postal_code text,
  property_county text,
  property_type text,
  report_type text,
  requested_due_date date,
  submitted_at timestamptz,
  status_copy text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.current_app_user_can_read_client_portal() then
    raise exception 'client_portal_membership_required'
      using errcode = '42501';
  end if;

  return query
  select
    public.client_portal_order_request_key(cpor.id, cpor.company_id, cpor.client_id) as request_key,
    cpor.status,
    case cpor.status
      when 'submitted' then 'Submitted'
      when 'under_review' then 'Awaiting review'
      when 'accepted' then 'Accepted'
      when 'declined' then 'Declined'
      else initcap(replace(coalesce(cpor.status, 'submitted'), '_', ' '))
    end as status_label,
    cpor.property_address,
    cpor.property_city,
    cpor.property_state,
    cpor.property_postal_code,
    cpor.property_county,
    cpor.property_type,
    cpor.report_type,
    cpor.requested_due_date,
    cpor.created_at as submitted_at,
    case
      when cpor.status in ('submitted', 'under_review') then
        'Your appraisal team is reviewing this request.'
      when cpor.status = 'accepted' then
        'Your appraisal team accepted this request.'
      when cpor.status = 'declined' then
        'Your appraisal team could not accept this request.'
      else
        'Your appraisal team is reviewing this request.'
    end as status_copy
  from public.client_portal_order_requests cpor
  join public.current_app_user_client_portal_memberships() readable
    on readable.company_id = cpor.company_id
   and readable.client_id = cpor.client_id
  where cpor.accepted_order_id is null
    and cpor.status in ('submitted', 'under_review')
  order by cpor.created_at desc, cpor.id desc;
end;
$$;

revoke all on function public.rpc_client_portal_order_request_create(
  text, text, text, text, text, text, text, text, date, text, text, text, text, text
) from public, anon;
revoke all on function public.rpc_client_portal_order_requests_for_review() from public, anon;
revoke all on function public.rpc_client_portal_order_request_review_detail(text) from public, anon;
revoke all on function public.rpc_client_portal_order_request_review_update_status(text, text) from public, anon;
revoke all on function public.rpc_client_portal_order_request_convert_to_order(text) from public, anon;
revoke all on function public.rpc_client_portal_pending_order_requests() from public, anon;

grant execute on function public.rpc_client_portal_order_request_create(
  text, text, text, text, text, text, text, text, date, text, text, text, text, text
) to authenticated, service_role;
grant execute on function public.rpc_client_portal_order_requests_for_review()
  to authenticated, service_role;
grant execute on function public.rpc_client_portal_order_request_review_detail(text)
  to authenticated, service_role;
grant execute on function public.rpc_client_portal_order_request_review_update_status(text, text)
  to authenticated, service_role;
grant execute on function public.rpc_client_portal_order_request_convert_to_order(text)
  to authenticated, service_role;
grant execute on function public.rpc_client_portal_pending_order_requests()
  to authenticated, service_role;

comment on function public.rpc_client_portal_order_request_create(
  text, text, text, text, text, text, text, text, date, text, text, text, text, text
) is
  'AMC-10A structured Client Portal intake. Stores street/city/state/ZIP/optional county plus product fields and fanouts an AMC-scoped in-app notification. Does not create operational orders.';

comment on function public.rpc_client_portal_order_request_convert_to_order(text) is
  'AMC-10B request-to-order conversion. Copies structured client request geography into existing order address/city/state/county/postal_code/zip fields and preserves property/report type, due date, contact, loan purpose, and source marker for procurement readiness.';

comment on function public.rpc_client_portal_pending_order_requests() is
  'Returns client-safe pending Client Portal intake requests including structured address fields for active client_portal_members. Does not expose staff notes, conversion ids, internal review details, vendor procurement, assignments, fees, or documents.';

comment on view public.v_client_portal_order_request_staff_review is
  'Staff-safe Client Portal order request review projection with structured request geography and minimal accepted order linkage. Scoped by RPCs to current_company_id(); does not expose vendor procurement, assignments, fees, margins, invoices, or storage internals.';

commit;
