begin;

create or replace function public.rpc_order_vendor_bid_request_create(
  p_order_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_order public.orders%rowtype;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_recipients jsonb;
  v_send_now boolean := true;
  v_request_status text;
  v_recipient_status text;
  v_bid_request_id uuid;
  v_recipient jsonb;
  v_vendor_profile_id uuid;
  v_vendor_company_id uuid;
  v_relationship_id uuid;
  v_profile public.company_vendor_profiles%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_recipient_count integer := 0;
  v_result jsonb;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('bid_requests.create') then
    raise exception 'bid_request_create_permission_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('vendors.read') then
    raise exception 'vendor_read_permission_required'
      using errcode = '42501';
  end if;

  select *
    into v_order
    from public.orders
   where id = p_order_id;

  if not found
     or coalesce(v_order.company_id, public.default_company_id()) <> v_company_id
     or not public.current_app_user_can_read_order(p_order_id) then
    raise exception 'bid_request_order_not_found_or_not_authorized'
      using errcode = '42501';
  end if;

  if coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations' then
    raise exception 'order_scope_not_amc_operations'
      using errcode = '42501';
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    raise exception 'bid_request_payload_invalid'
      using errcode = '22023';
  end if;

  v_recipients := v_payload -> 'recipients';

  if v_recipients is null
     or jsonb_typeof(v_recipients) <> 'array'
     or jsonb_array_length(v_recipients) = 0 then
    raise exception 'bid_request_recipients_required'
      using errcode = '22023';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(v_recipients) as recipient(value)
     group by recipient.value ->> 'vendor_profile_id'
    having count(*) > 1
       and recipient.value ->> 'vendor_profile_id' is not null
  ) then
    raise exception 'bid_request_recipient_duplicate'
      using errcode = '23505';
  end if;

  if v_payload ? 'send_now' then
    v_send_now := coalesce((v_payload ->> 'send_now')::boolean, true);
  end if;

  v_request_status := case when v_send_now then 'sent' else 'draft' end;
  v_recipient_status := case when v_send_now then 'sent' else 'pending' end;

  for v_recipient in
    select value from jsonb_array_elements(v_recipients) as recipients(value)
  loop
    if jsonb_typeof(v_recipient) <> 'object' then
      raise exception 'bid_request_payload_invalid'
        using errcode = '22023';
    end if;

    v_vendor_profile_id := nullif(v_recipient ->> 'vendor_profile_id', '')::uuid;
    v_vendor_company_id := nullif(v_recipient ->> 'vendor_company_id', '')::uuid;
    v_relationship_id := nullif(v_recipient ->> 'relationship_id', '')::uuid;

    if v_vendor_profile_id is null
       or v_vendor_company_id is null
       or v_relationship_id is null then
      raise exception 'bid_request_payload_invalid'
        using errcode = '22023';
    end if;

    select *
      into v_profile
      from public.company_vendor_profiles
     where id = v_vendor_profile_id;

    if not found
       or v_profile.owner_company_id <> v_company_id
       or v_profile.vendor_company_id <> v_vendor_company_id then
      raise exception 'bid_request_vendor_not_found_or_not_authorized'
        using errcode = '42501';
    end if;

    if v_profile.vendor_status in ('inactive', 'do_not_use') then
      raise exception 'bid_request_vendor_ineligible'
        using errcode = '42501';
    end if;

    select *
      into v_relationship
      from public.company_relationships
     where id = v_relationship_id;

    if not found
       or v_relationship.source_company_id <> v_company_id
       or v_relationship.target_company_id <> v_vendor_company_id
       or v_relationship.relationship_type <> 'amc_vendor'
       or v_relationship.status <> 'active' then
      raise exception 'bid_request_vendor_ineligible'
        using errcode = '42501';
    end if;

    if v_profile.relationship_id is not null
       and v_profile.relationship_id <> v_relationship_id then
      raise exception 'bid_request_vendor_not_found_or_not_authorized'
        using errcode = '42501';
    end if;
  end loop;

  if exists (
    select 1
      from public.order_vendor_bid_requests br
      join public.order_vendor_bid_request_recipients brr
        on brr.bid_request_id = br.id
      join jsonb_array_elements(v_recipients) as recipient(value)
        on brr.vendor_profile_id = (recipient.value ->> 'vendor_profile_id')::uuid
     where br.company_id = v_company_id
       and br.order_id = p_order_id
       and br.status in ('draft', 'sent', 'partially_responded')
       and brr.status in ('pending', 'sent', 'viewed', 'responded')
  ) then
    raise exception 'bid_request_open_recipient_exists'
      using errcode = '23505';
  end if;

  insert into public.order_vendor_bid_requests (
    company_id,
    order_id,
    requested_by_user_id,
    request_message,
    response_due_at,
    client_due_at,
    desired_vendor_due_at,
    review_due_at,
    status,
    metadata
  ) values (
    v_company_id,
    p_order_id,
    v_actor_user_id,
    nullif(btrim(v_payload ->> 'request_message'), ''),
    nullif(v_payload ->> 'response_due_at', '')::timestamptz,
    nullif(v_payload ->> 'client_due_at', '')::timestamptz,
    nullif(v_payload ->> 'desired_vendor_due_at', '')::timestamptz,
    nullif(v_payload ->> 'review_due_at', '')::timestamptz,
    v_request_status,
    jsonb_build_object(
      'candidate_snapshot',
      coalesce(v_payload -> 'candidate_snapshot', '{}'::jsonb)
    )
  )
  returning id into v_bid_request_id;

  for v_recipient in
    select value from jsonb_array_elements(v_recipients) as recipients(value)
  loop
    v_vendor_profile_id := (v_recipient ->> 'vendor_profile_id')::uuid;
    v_vendor_company_id := (v_recipient ->> 'vendor_company_id')::uuid;
    v_relationship_id := (v_recipient ->> 'relationship_id')::uuid;

    insert into public.order_vendor_bid_request_recipients (
      bid_request_id,
      vendor_profile_id,
      vendor_company_id,
      relationship_id,
      status,
      sent_at,
      metadata
    ) values (
      v_bid_request_id,
      v_vendor_profile_id,
      v_vendor_company_id,
      v_relationship_id,
      v_recipient_status,
      case when v_send_now then now() else null end,
      jsonb_build_object(
        'candidate_snapshot',
        coalesce(v_recipient -> 'candidate_snapshot', '{}'::jsonb)
      )
    );

    v_recipient_count := v_recipient_count + 1;
  end loop;

  select jsonb_build_object(
    'bid_request_id', br.id,
    'order_id', br.order_id,
    'status', br.status,
    'recipient_count', v_recipient_count,
    'recipients', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'recipient_id', brr.id,
          'vendor_profile_id', brr.vendor_profile_id,
          'vendor_company_id', brr.vendor_company_id,
          'relationship_id', brr.relationship_id,
          'status', brr.status
        )
        order by brr.created_at, brr.id
      ),
      '[]'::jsonb
    )
  )
    into v_result
    from public.order_vendor_bid_requests br
    left join public.order_vendor_bid_request_recipients brr
      on brr.bid_request_id = br.id
   where br.id = v_bid_request_id
   group by br.id, br.order_id, br.status;

  return v_result;
end;
$$;

create or replace function public.rpc_order_vendor_bid_requests_for_order(
  p_order_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_order public.orders%rowtype;
  v_result jsonb;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('bid_requests.read') then
    raise exception 'bid_request_read_permission_required'
      using errcode = '42501';
  end if;

  select *
    into v_order
    from public.orders
   where id = p_order_id;

  if not found
     or coalesce(v_order.company_id, public.default_company_id()) <> v_company_id
     or not public.current_app_user_can_read_order(p_order_id) then
    raise exception 'bid_request_order_not_found_or_not_authorized'
      using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'bid_request_id', br.id,
        'order_id', br.order_id,
        'status', br.status,
        'request_message', br.request_message,
        'response_due_at', br.response_due_at,
        'client_due_at', br.client_due_at,
        'desired_vendor_due_at', br.desired_vendor_due_at,
        'review_due_at', br.review_due_at,
        'cancelled_at', br.cancelled_at,
        'closed_at', br.closed_at,
        'created_at', br.created_at,
        'updated_at', br.updated_at,
        'recipients', coalesce(recipients.recipients, '[]'::jsonb)
      )
      order by br.created_at desc, br.id
    ),
    '[]'::jsonb
  )
    into v_result
    from public.order_vendor_bid_requests br
    left join lateral (
      select jsonb_agg(
        jsonb_build_object(
          'recipient_id', brr.id,
          'vendor_profile_id', brr.vendor_profile_id,
          'vendor_company_id', brr.vendor_company_id,
          'vendor_company_name', vendor_company.name,
          'relationship_id', brr.relationship_id,
          'status', brr.status,
          'sent_at', brr.sent_at,
          'viewed_at', brr.viewed_at,
          'responded_at', brr.responded_at,
          'declined_at', brr.declined_at,
          'expired_at', brr.expired_at,
          'cancelled_at', brr.cancelled_at,
          'response', case
            when response.id is null then null
            else jsonb_build_object(
              'response_id', response.id,
              'fee_amount', response.fee_amount,
              'currency', response.currency,
              'proposed_due_at', response.proposed_due_at,
              'turn_time_days', response.turn_time_days,
              'comments', response.comments,
              'submitted_at', response.submitted_at,
              'selected_at', response.selected_at,
              'selected_by_user_id', response.selected_by_user_id
            )
          end
        )
        order by brr.created_at, brr.id
      ) as recipients
      from public.order_vendor_bid_request_recipients brr
      join public.companies vendor_company
        on vendor_company.id = brr.vendor_company_id
      left join public.order_vendor_bid_responses response
        on response.recipient_id = brr.id
      where brr.bid_request_id = br.id
    ) recipients on true
   where br.company_id = v_company_id
     and br.order_id = p_order_id;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

revoke all on function public.rpc_order_vendor_bid_request_create(uuid, jsonb) from public, anon;
revoke all on function public.rpc_order_vendor_bid_requests_for_order(uuid) from public, anon;

grant execute on function public.rpc_order_vendor_bid_request_create(uuid, jsonb) to authenticated, service_role;
grant execute on function public.rpc_order_vendor_bid_requests_for_order(uuid) to authenticated, service_role;

comment on function public.rpc_order_vendor_bid_request_create(uuid, jsonb) is
  'AMC-6O.1 backend-only bid request create RPC. Requires amc_operations order scope, bid_requests.create, vendors.read, current-company order read authority, active amc_vendor relationships, eligible vendor profiles, and no duplicate open vendor bid recipient for the same order/vendor. Creates bid request and recipient rows only; does not create assignments, mutate orders, create UI/frontend APIs, send notifications, or create /amc/* routes.';

comment on function public.rpc_order_vendor_bid_requests_for_order(uuid) is
  'AMC-6O.1 backend-only bid request list RPC. Requires bid_requests.read and current-company order read authority. Returns request, recipient, vendor company, and response summary JSON for one order. Does not create assignments, mutate orders, create UI/frontend APIs, send notifications, or create /amc/* routes.';

commit;
