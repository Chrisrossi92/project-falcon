begin;

create table if not exists public.client_portal_order_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id bigint not null references public.clients(id) on delete cascade,
  requested_by_user_id uuid not null references public.users(id) on delete restrict,
  status text not null default 'submitted',
  property_address text not null,
  property_type text not null,
  report_type text not null,
  loan_purpose text,
  requested_due_date date,
  borrower_contact_name text,
  client_contact_name text,
  client_contact_phone text,
  client_contact_email text,
  notes text,
  accepted_order_id uuid references public.orders(id) on delete set null,
  reviewed_by_user_id uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_portal_order_requests_status_check check (
    status = any (array['submitted', 'under_review', 'accepted', 'declined', 'cancelled'])
  ),
  constraint client_portal_order_requests_property_address_check check (btrim(property_address) <> ''),
  constraint client_portal_order_requests_property_type_check check (btrim(property_type) <> ''),
  constraint client_portal_order_requests_report_type_check check (btrim(report_type) <> '')
);

create index if not exists idx_client_portal_order_requests_company_status_created
  on public.client_portal_order_requests (company_id, status, created_at desc);

create index if not exists idx_client_portal_order_requests_company_client_created
  on public.client_portal_order_requests (company_id, client_id, created_at desc);

create index if not exists idx_client_portal_order_requests_requested_by
  on public.client_portal_order_requests (company_id, requested_by_user_id, created_at desc);

alter table public.client_portal_order_requests enable row level security;

revoke all on table public.client_portal_order_requests from public, anon, authenticated;
grant all on table public.client_portal_order_requests to service_role;

create or replace function public.tg_client_portal_order_requests_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_client_portal_order_requests_touch_updated_at
  on public.client_portal_order_requests;
create trigger trg_client_portal_order_requests_touch_updated_at
before update on public.client_portal_order_requests
for each row execute function public.tg_client_portal_order_requests_touch_updated_at();

create or replace function public.client_portal_order_request_key(
  p_request_id uuid,
  p_company_id uuid,
  p_client_id bigint
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select encode(
    extensions.digest(
      concat_ws(
        ':',
        'client_portal_order_request_v1',
        coalesce(p_request_id::text, ''),
        coalesce(p_company_id::text, ''),
        coalesce(p_client_id::text, '')
      ),
      'sha256'
    ),
    'hex'
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
    public.current_app_user_has_current_company()
    and public.current_app_user_id() is not null
    and public.current_app_user_has_permission('client_portal.orders.create')
    and exists (
      select 1
      from public.current_app_user_client_portal_client_ids()
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
  v_company_id uuid := public.current_company_id();
  v_user_id uuid := public.current_app_user_id();
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
  if not public.current_app_user_can_create_client_portal_order_request() then
    raise exception 'client_portal_order_request_create_required'
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

  select readable.client_id
    into v_client_id
    from public.current_app_user_client_portal_client_ids() readable
    order by readable.client_id
    limit 1;

  if v_client_id is null then
    raise exception 'client_portal_access_required'
      using errcode = '42501';
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

revoke all on function public.client_portal_order_request_key(uuid, uuid, bigint) from public, anon;
revoke all on function public.current_app_user_can_create_client_portal_order_request() from public, anon;
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

grant execute on function public.client_portal_order_request_key(uuid, uuid, bigint)
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

comment on table public.client_portal_order_requests is
  'Client Portal submitted appraisal request intake records. These are reviewable intake requests and do not automatically create operational orders, assignments, vendor procurement, fees, invoices, or documents.';

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
  'Creates a Client Portal order request intake row for the authenticated current-company client portal member. Requires client_portal.orders.create and active client_portal_members scope. Does not accept raw company/client/order ids and does not create an operational order or expose internal assignment, vendor, procurement, fee, or document controls.';

commit;
