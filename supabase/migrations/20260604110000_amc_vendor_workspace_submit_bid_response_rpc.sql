begin;

create extension if not exists "pgcrypto";

create or replace function public.rpc_vendor_workspace_submit_bid_response(
  p_work_key text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_vendor_company_id uuid := public.current_company_id();
  v_work_key text := lower(btrim(coalesce(p_work_key, '')));
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_field_errors jsonb := '{}'::jsonb;
  v_recipient public.order_vendor_bid_request_recipients%rowtype;
  v_request public.order_vendor_bid_requests%rowtype;
  v_order public.orders%rowtype;
  v_profile public.company_vendor_profiles%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_existing_response public.order_vendor_bid_responses%rowtype;
  v_fee_text text;
  v_fee_amount numeric;
  v_currency text;
  v_proposed_due_text text;
  v_proposed_due_at timestamptz;
  v_turn_time_text text;
  v_turn_time_days integer;
  v_comments text;
  v_submitted_at timestamptz := now();
  v_request_status text;
  v_response_id uuid;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_vendor_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('vendor_bids.respond') then
    raise exception 'vendor_bids_respond_permission_required'
      using errcode = '42501';
  end if;

  if v_work_key !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object(
      'ok', false,
      'error', 'available_work_unavailable'
    );
  end if;

  select brr.*
    into v_recipient
    from public.order_vendor_bid_request_recipients brr
   where brr.vendor_company_id = v_vendor_company_id
     and encode(
       extensions.digest(
         concat_ws(
           ':',
           'vendor_available_work_v1',
           brr.id::text,
           brr.vendor_company_id::text
         ),
         'sha256'
       ),
       'hex'
     ) = v_work_key
   for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error', 'available_work_unavailable'
    );
  end if;

  select br.*
    into v_request
    from public.order_vendor_bid_requests br
   where br.id = v_recipient.bid_request_id
   for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error', 'available_work_unavailable'
    );
  end if;

  select o.*
    into v_order
    from public.orders o
   where o.id = v_request.order_id;

  if not found
     or coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations' then
    return jsonb_build_object(
      'ok', false,
      'error', 'available_work_unavailable'
    );
  end if;

  select cvp.*
    into v_profile
    from public.company_vendor_profiles cvp
   where cvp.id = v_recipient.vendor_profile_id;

  if not found
     or v_profile.owner_company_id is distinct from v_request.company_id
     or v_profile.vendor_company_id is distinct from v_vendor_company_id
     or v_profile.vendor_status in ('inactive', 'do_not_use') then
    return jsonb_build_object(
      'ok', false,
      'error', 'available_work_unavailable'
    );
  end if;

  select cr.*
    into v_relationship
    from public.company_relationships cr
   where cr.id = v_recipient.relationship_id;

  if not found
     or v_relationship.source_company_id is distinct from v_request.company_id
     or v_relationship.target_company_id is distinct from v_vendor_company_id
     or v_relationship.relationship_type <> 'amc_vendor'
     or v_relationship.status <> 'active'
     or (
       v_profile.relationship_id is not null
       and v_profile.relationship_id is distinct from v_recipient.relationship_id
     ) then
    return jsonb_build_object(
      'ok', false,
      'error', 'available_work_unavailable'
    );
  end if;

  select obr.*
    into v_existing_response
    from public.order_vendor_bid_responses obr
   where obr.recipient_id = v_recipient.id
   order by obr.submitted_at desc nulls last, obr.created_at desc
   limit 1;

  if found then
    return jsonb_build_object(
      'ok', false,
      'error', 'bid_already_submitted',
      'bid', jsonb_strip_nulls(jsonb_build_object(
        'status', 'submitted',
        'fee_amount', v_existing_response.fee_amount,
        'currency', v_existing_response.currency,
        'turn_time_days', v_existing_response.turn_time_days,
        'proposed_due_at', v_existing_response.proposed_due_at,
        'comments', v_existing_response.comments,
        'submitted_at', v_existing_response.submitted_at
      ))
    );
  end if;

  if v_request.status in ('closed', 'cancelled', 'expired')
     or v_request.status not in ('sent', 'partially_responded')
     or v_recipient.status in ('responded', 'declined', 'expired', 'cancelled', 'selected', 'not_selected')
     or v_recipient.status not in ('pending', 'sent', 'viewed') then
    return jsonb_build_object(
      'ok', false,
      'error', case
        when v_request.status = 'expired' or v_recipient.status = 'expired' then 'bid_opportunity_expired'
        else 'available_work_unavailable'
      end
    );
  end if;

  if v_request.response_due_at is not null
     and v_request.response_due_at <= now() then
    return jsonb_build_object(
      'ok', false,
      'error', 'bid_opportunity_expired'
    );
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    return jsonb_build_object(
      'ok', false,
      'error', 'bid_submission_invalid',
      'field_errors', jsonb_build_object(
        'payload', 'Bid submission payload must be an object.'
      )
    );
  end if;

  v_fee_text := nullif(btrim(v_payload ->> 'fee_amount'), '');
  v_currency := upper(coalesce(nullif(btrim(v_payload ->> 'currency'), ''), 'USD'));
  v_proposed_due_text := nullif(btrim(v_payload ->> 'proposed_due_at'), '');
  v_turn_time_text := nullif(btrim(v_payload ->> 'turn_time_days'), '');
  v_comments := nullif(btrim(v_payload ->> 'comments'), '');

  if v_fee_text is null then
    v_field_errors := v_field_errors || jsonb_build_object('fee_amount', 'Fee amount is required.');
  elsif v_fee_text !~ '^\d+(\.\d+)?$' then
    v_field_errors := v_field_errors || jsonb_build_object('fee_amount', 'Fee amount must be numeric.');
  else
    v_fee_amount := v_fee_text::numeric;
    if v_fee_amount < 0 then
      v_field_errors := v_field_errors || jsonb_build_object('fee_amount', 'Fee amount must be non-negative.');
    end if;
  end if;

  if v_currency !~ '^[A-Z]{3}$' then
    v_field_errors := v_field_errors || jsonb_build_object('currency', 'Currency must be a three-letter code.');
  end if;

  if v_turn_time_text is not null then
    if v_turn_time_text !~ '^\d+$' then
      v_field_errors := v_field_errors || jsonb_build_object('turn_time_days', 'Turn time must be a non-negative integer.');
    else
      v_turn_time_days := v_turn_time_text::integer;
    end if;
  end if;

  if v_proposed_due_text is not null then
    begin
      v_proposed_due_at := v_proposed_due_text::timestamptz;
    exception
      when others then
        v_field_errors := v_field_errors || jsonb_build_object('proposed_due_at', 'Proposed due date must be a valid timestamp.');
    end;
  end if;

  if v_turn_time_text is null and v_proposed_due_text is null then
    v_field_errors := v_field_errors || jsonb_build_object(
      'timing',
      'Provide either turn time days or a proposed due date.'
    );
  end if;

  if v_field_errors <> '{}'::jsonb then
    return jsonb_build_object(
      'ok', false,
      'error', 'bid_submission_invalid',
      'field_errors', v_field_errors
    );
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
    v_recipient.id,
    v_fee_amount,
    v_currency,
    v_proposed_due_at,
    v_turn_time_days,
    v_comments,
    v_submitted_at,
    jsonb_strip_nulls(jsonb_build_object(
      'submitted_via', 'vendor_workspace'
    ))
  )
  returning id into v_response_id;

  update public.order_vendor_bid_request_recipients
     set status = 'responded',
         responded_at = v_submitted_at,
         updated_at = now()
   where id = v_recipient.id;

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
         closed_at = case when v_request_status = 'closed' then coalesce(closed_at, v_submitted_at) else closed_at end,
         updated_at = now()
   where id = v_request.id;

  return jsonb_build_object(
    'ok', true,
    'status', 'bid_submitted',
    'submitted_at', v_submitted_at,
    'message', 'Your bid has been submitted.',
    'bid', jsonb_strip_nulls(jsonb_build_object(
      'status', 'submitted',
      'fee_amount', v_fee_amount,
      'currency', v_currency,
      'turn_time_days', v_turn_time_days,
      'proposed_due_at', v_proposed_due_at,
      'comments', v_comments,
      'submitted_at', v_submitted_at
    ))
  );
end;
$$;

revoke all privileges on table public.order_vendor_bid_requests from public, anon, authenticated;
revoke all privileges on table public.order_vendor_bid_request_recipients from public, anon, authenticated;
revoke all privileges on table public.order_vendor_bid_responses from public, anon, authenticated;
revoke all on function public.rpc_vendor_workspace_submit_bid_response(text, jsonb) from public, anon;
grant execute on function public.rpc_vendor_workspace_submit_bid_response(text, jsonb) to authenticated, service_role;

comment on function public.rpc_vendor_workspace_submit_bid_response(text, jsonb) is
  'AMC-9D.2 authenticated Vendor Workspace bid submission RPC. Requires vendor_bids.respond, resolves an opaque work key only across rows scoped to the current vendor company, reuses the existing bid response and recipient/request lifecycle semantics, returns compact vendor-safe success/error payloads, and does not mutate assignments, orders, public token flows, shared order APIs, or owner-side bid APIs.';

commit;
