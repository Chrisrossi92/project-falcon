begin;

create or replace function public.rpc_order_vendor_bid_response_record(
  p_recipient_id uuid,
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
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_request public.order_vendor_bid_requests%rowtype;
  v_recipient public.order_vendor_bid_request_recipients%rowtype;
  v_order public.orders%rowtype;
  v_response_id uuid;
  v_fee_amount numeric;
  v_currency text := 'USD';
  v_proposed_due_at timestamptz;
  v_turn_time_days integer;
  v_comments text;
  v_request_status text;
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

  if not public.current_app_user_has_permission('bid_requests.update') then
    raise exception 'bid_request_update_permission_required'
      using errcode = '42501';
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    raise exception 'bid_response_payload_invalid'
      using errcode = '22023';
  end if;

  select brr.*
    into v_recipient
    from public.order_vendor_bid_request_recipients brr
   where brr.id = p_recipient_id;

  if not found then
    raise exception 'bid_request_recipient_not_found_or_not_authorized'
      using errcode = '42501';
  end if;

  select br.*
    into v_request
    from public.order_vendor_bid_requests br
   where br.id = v_recipient.bid_request_id;

  select o.*
    into v_order
    from public.orders o
   where o.id = v_request.order_id;

  if not found
     or v_request.company_id <> v_company_id
     or coalesce(v_order.company_id, public.default_company_id()) <> v_company_id
     or not public.current_app_user_can_read_order(v_request.order_id) then
    raise exception 'bid_request_not_found_or_not_authorized'
      using errcode = '42501';
  end if;

  if coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations' then
    raise exception 'order_scope_not_amc_operations'
      using errcode = '42501';
  end if;

  if v_request.status in ('cancelled', 'expired', 'closed') then
    raise exception 'bid_request_not_open'
      using errcode = '22023';
  end if;

  if v_recipient.status in ('declined', 'expired', 'cancelled', 'selected', 'not_selected') then
    raise exception 'bid_request_recipient_not_open'
      using errcode = '22023';
  end if;

  v_fee_amount := nullif(v_payload ->> 'fee_amount', '')::numeric;
  v_currency := upper(coalesce(nullif(btrim(v_payload ->> 'currency'), ''), 'USD'));
  v_proposed_due_at := nullif(v_payload ->> 'proposed_due_at', '')::timestamptz;
  v_turn_time_days := nullif(v_payload ->> 'turn_time_days', '')::integer;
  v_comments := nullif(btrim(v_payload ->> 'comments'), '');

  if v_fee_amount is not null and v_fee_amount < 0 then
    raise exception 'bid_response_fee_invalid'
      using errcode = '22023';
  end if;

  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'bid_response_currency_invalid'
      using errcode = '22023';
  end if;

  if v_turn_time_days is not null and v_turn_time_days < 0 then
    raise exception 'bid_response_turn_time_invalid'
      using errcode = '22023';
  end if;

  insert into public.order_vendor_bid_responses (
    recipient_id,
    fee_amount,
    currency,
    proposed_due_at,
    turn_time_days,
    comments,
    submitted_at,
    metadata
  ) values (
    p_recipient_id,
    v_fee_amount,
    v_currency,
    v_proposed_due_at,
    v_turn_time_days,
    v_comments,
    now(),
    jsonb_build_object(
      'recorded_by_user_id',
      v_actor_user_id
    ) || coalesce(v_payload -> 'metadata', '{}'::jsonb)
  )
  on conflict (recipient_id) do update
    set fee_amount = excluded.fee_amount,
        currency = excluded.currency,
        proposed_due_at = excluded.proposed_due_at,
        turn_time_days = excluded.turn_time_days,
        comments = excluded.comments,
        submitted_at = excluded.submitted_at,
        selected_at = null,
        selected_by_user_id = null,
        metadata = excluded.metadata,
        updated_at = now()
  returning id into v_response_id;

  update public.order_vendor_bid_request_recipients
     set status = 'responded',
         responded_at = now(),
         updated_at = now()
   where id = p_recipient_id;

  if exists (
    select 1
      from public.order_vendor_bid_request_recipients brr
     where brr.bid_request_id = v_request.id
       and brr.status in ('pending', 'sent', 'viewed')
  ) then
    v_request_status := 'partially_responded';
  else
    v_request_status := 'closed';
  end if;

  update public.order_vendor_bid_requests
     set status = v_request_status,
         closed_at = case when v_request_status = 'closed' then coalesce(closed_at, now()) else closed_at end,
         updated_at = now()
   where id = v_request.id;

  select jsonb_build_object(
    'bid_request_id', br.id,
    'order_id', br.order_id,
    'request_status', br.status,
    'recipient_id', brr.id,
    'recipient_status', brr.status,
    'response_id', obr.id,
    'fee_amount', obr.fee_amount,
    'currency', obr.currency,
    'proposed_due_at', obr.proposed_due_at,
    'turn_time_days', obr.turn_time_days,
    'comments', obr.comments,
    'submitted_at', obr.submitted_at,
    'selected_at', obr.selected_at
  )
    into v_result
    from public.order_vendor_bid_requests br
    join public.order_vendor_bid_request_recipients brr
      on brr.bid_request_id = br.id
    join public.order_vendor_bid_responses obr
      on obr.recipient_id = brr.id
   where obr.id = v_response_id;

  return v_result;
end;
$$;

create or replace function public.rpc_order_vendor_bid_response_select(
  p_response_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_response public.order_vendor_bid_responses%rowtype;
  v_recipient public.order_vendor_bid_request_recipients%rowtype;
  v_request public.order_vendor_bid_requests%rowtype;
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

  if not public.current_app_user_has_permission('bid_requests.select') then
    raise exception 'bid_request_select_permission_required'
      using errcode = '42501';
  end if;

  select obr.*
    into v_response
    from public.order_vendor_bid_responses obr
   where obr.id = p_response_id;

  if not found then
    raise exception 'bid_response_not_found_or_not_authorized'
      using errcode = '42501';
  end if;

  select brr.*
    into v_recipient
    from public.order_vendor_bid_request_recipients brr
   where brr.id = v_response.recipient_id;

  select br.*
    into v_request
    from public.order_vendor_bid_requests br
   where br.id = v_recipient.bid_request_id;

  select o.*
    into v_order
    from public.orders o
   where o.id = v_request.order_id;

  if not found
     or v_request.company_id <> v_company_id
     or coalesce(v_order.company_id, public.default_company_id()) <> v_company_id
     or not public.current_app_user_can_read_order(v_request.order_id) then
    raise exception 'bid_request_not_found_or_not_authorized'
      using errcode = '42501';
  end if;

  if coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations' then
    raise exception 'order_scope_not_amc_operations'
      using errcode = '42501';
  end if;

  if v_request.status in ('cancelled', 'expired') then
    raise exception 'bid_request_not_selectable'
      using errcode = '22023';
  end if;

  if v_recipient.status in ('declined', 'expired', 'cancelled', 'not_selected') then
    raise exception 'bid_response_not_selectable'
      using errcode = '22023';
  end if;

  if v_response.submitted_at is null then
    raise exception 'bid_response_not_submitted'
      using errcode = '22023';
  end if;

  update public.order_vendor_bid_responses obr
     set selected_at = null,
         selected_by_user_id = null,
         updated_at = now()
    from public.order_vendor_bid_request_recipients brr
   where obr.recipient_id = brr.id
     and brr.bid_request_id = v_request.id
     and obr.id <> p_response_id;

  update public.order_vendor_bid_responses
     set selected_at = now(),
         selected_by_user_id = v_actor_user_id,
         updated_at = now()
   where id = p_response_id;

  update public.order_vendor_bid_request_recipients
     set status = case when id = v_recipient.id then 'selected' else 'not_selected' end,
         updated_at = now()
   where bid_request_id = v_request.id
     and status in ('pending', 'sent', 'viewed', 'responded', 'selected', 'not_selected');

  update public.order_vendor_bid_requests
     set status = 'closed',
         closed_at = coalesce(closed_at, now()),
         updated_at = now()
   where id = v_request.id;

  select jsonb_build_object(
    'bid_request_id', br.id,
    'order_id', br.order_id,
    'request_status', br.status,
    'selected_recipient_id', brr.id,
    'selected_vendor_profile_id', brr.vendor_profile_id,
    'selected_vendor_company_id', brr.vendor_company_id,
    'selected_response_id', obr.id,
    'fee_amount', obr.fee_amount,
    'currency', obr.currency,
    'proposed_due_at', obr.proposed_due_at,
    'turn_time_days', obr.turn_time_days,
    'comments', obr.comments,
    'submitted_at', obr.submitted_at,
    'selected_at', obr.selected_at,
    'selected_by_user_id', obr.selected_by_user_id
  )
    into v_result
    from public.order_vendor_bid_requests br
    join public.order_vendor_bid_request_recipients brr
      on brr.bid_request_id = br.id
    join public.order_vendor_bid_responses obr
      on obr.recipient_id = brr.id
   where obr.id = p_response_id;

  return v_result;
end;
$$;

revoke all on function public.rpc_order_vendor_bid_response_record(uuid, jsonb) from public, anon;
revoke all on function public.rpc_order_vendor_bid_response_select(uuid) from public, anon;

grant execute on function public.rpc_order_vendor_bid_response_record(uuid, jsonb) to authenticated, service_role;
grant execute on function public.rpc_order_vendor_bid_response_select(uuid) to authenticated, service_role;

comment on function public.rpc_order_vendor_bid_response_record(uuid, jsonb) is
  'AMC-6O.2 backend-only bid response record RPC. Requires bid_requests.update, current-company order read authority, and amc_operations order scope. Records or updates one response, marks the recipient responded, and advances request status without creating assignments, mutating orders, creating UI/frontend APIs, sending notifications, or creating /amc/* routes.';

comment on function public.rpc_order_vendor_bid_response_select(uuid) is
  'AMC-6O.2 backend-only bid response select RPC. Requires bid_requests.select, current-company order read authority, and amc_operations order scope. Selects one submitted response, marks sibling recipients not_selected, closes the request, and does not call assignment offer RPCs, create assignments, mutate orders, create UI/frontend APIs, send notifications, or create /amc/* routes.';

commit;
