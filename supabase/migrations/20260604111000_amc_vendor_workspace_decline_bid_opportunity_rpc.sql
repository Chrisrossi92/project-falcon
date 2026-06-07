begin;

create extension if not exists "pgcrypto";

create or replace function public.rpc_vendor_workspace_decline_bid_opportunity(
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
  v_reason text;
  v_comments text;
  v_declined_at timestamptz := now();
  v_request_status text;
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

  if v_recipient.status = 'declined' then
    return jsonb_build_object(
      'ok', false,
      'error', 'bid_already_declined',
      'decline', jsonb_strip_nulls(jsonb_build_object(
        'status', 'declined',
        'reason', v_recipient.metadata ->> 'decline_reason',
        'comments', v_recipient.metadata ->> 'decline_comments',
        'declined_at', v_recipient.declined_at
      ))
    );
  end if;

  if v_request.status in ('closed', 'cancelled', 'expired')
     or v_request.status not in ('sent', 'partially_responded')
     or v_recipient.status in ('responded', 'expired', 'cancelled', 'selected', 'not_selected')
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
      'error', 'bid_decline_invalid',
      'field_errors', jsonb_build_object(
        'payload', 'Decline payload must be an object.'
      )
    );
  end if;

  v_reason := nullif(btrim(v_payload ->> 'reason'), '');
  v_comments := nullif(btrim(v_payload ->> 'comments'), '');

  if v_reason is not null
     and v_reason not in (
       'Too busy / capacity',
       'Outside coverage area',
       'Fee does not work',
       'Due date / turn time does not work',
       'Other'
     ) then
    v_field_errors := v_field_errors || jsonb_build_object('reason', 'Choose a valid decline reason.');
  end if;

  if v_comments is not null and length(v_comments) > 2000 then
    v_field_errors := v_field_errors || jsonb_build_object('comments', 'Comments must be 2000 characters or fewer.');
  end if;

  if v_field_errors <> '{}'::jsonb then
    return jsonb_build_object(
      'ok', false,
      'error', 'bid_decline_invalid',
      'field_errors', v_field_errors
    );
  end if;

  update public.order_vendor_bid_request_recipients
     set status = 'declined',
         declined_at = v_declined_at,
         metadata = jsonb_strip_nulls(
           coalesce(metadata, '{}'::jsonb)
           || jsonb_build_object(
             'declined_via', 'vendor_workspace',
             'decline_reason', v_reason,
             'decline_comments', v_comments
           )
         ),
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
         closed_at = case when v_request_status = 'closed' then coalesce(closed_at, v_declined_at) else closed_at end,
         updated_at = now()
   where id = v_request.id;

  return jsonb_build_object(
    'ok', true,
    'status', 'declined',
    'declined_at', v_declined_at,
    'message', 'Opportunity declined.',
    'decline', jsonb_strip_nulls(jsonb_build_object(
      'status', 'declined',
      'reason', v_reason,
      'comments', v_comments,
      'declined_at', v_declined_at
    ))
  );
end;
$$;

revoke all privileges on table public.order_vendor_bid_requests from public, anon, authenticated;
revoke all privileges on table public.order_vendor_bid_request_recipients from public, anon, authenticated;
revoke all privileges on table public.order_vendor_bid_responses from public, anon, authenticated;
revoke all on function public.rpc_vendor_workspace_decline_bid_opportunity(text, jsonb) from public, anon;
grant execute on function public.rpc_vendor_workspace_decline_bid_opportunity(text, jsonb) to authenticated, service_role;

comment on function public.rpc_vendor_workspace_decline_bid_opportunity(text, jsonb) is
  'AMC-9D.3 authenticated Vendor Workspace decline/pass RPC. Requires vendor_bids.respond, resolves an opaque work key only across rows scoped to the current vendor company, writes declined status into the existing bid recipient/request lifecycle, returns compact vendor-safe success/error payloads, and does not mutate assignments, orders, public token flows, shared order APIs, or owner-side bid APIs.';

commit;
