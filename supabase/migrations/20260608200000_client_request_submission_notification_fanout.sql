begin;

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
  v_client_name text;
  v_request public.client_portal_order_requests%rowtype;
  v_request_key text;
  v_notification_body text;
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
    v_request.property_type,
    v_request.report_type,
    v_request.requested_due_date;
end;
$$;

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
  'Creates a Client Portal order request for the authenticated active client_portal_members company/client context and fanouts an AMC-scoped in-app notification to active Owner/Admin/request-review staff. Does not require operational company membership, create operational orders, expose vendor/procurement/order ids, or send email.';

commit;
