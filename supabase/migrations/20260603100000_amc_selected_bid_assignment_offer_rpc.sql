begin;

create or replace function public.rpc_order_vendor_bid_response_convert_to_assignment_offer(
  p_response_id uuid,
  p_payload jsonb default '{}'::jsonb
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
  v_response public.order_vendor_bid_responses%rowtype;
  v_recipient public.order_vendor_bid_request_recipients%rowtype;
  v_request public.order_vendor_bid_requests%rowtype;
  v_order public.orders%rowtype;
  v_profile public.company_vendor_profiles%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_assignment_id uuid;
  v_note text;
  v_due_at timestamptz;
  v_review_due_at timestamptz;
  v_expires_at timestamptz;
  v_terms jsonb;
  v_selected_bid_snapshot jsonb;
  v_handoff_payload jsonb;
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

  if not public.current_app_user_has_permission('order_company_assignments.offer') then
    raise exception 'assignment_offer_permission_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('relationships.assign_work') then
    raise exception 'relationship_assign_work_permission_required'
      using errcode = '42501';
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    raise exception 'selected_bid_assignment_payload_invalid'
      using errcode = '22023';
  end if;

  select obr.*
    into v_response
    from public.order_vendor_bid_responses obr
   where obr.id = p_response_id
   for update;

  if not found then
    raise exception 'bid_response_not_found_or_not_authorized'
      using errcode = '42501';
  end if;

  select brr.*
    into v_recipient
    from public.order_vendor_bid_request_recipients brr
   where brr.id = v_response.recipient_id
   for update;

  if not found then
    raise exception 'bid_request_recipient_not_found_or_not_authorized'
      using errcode = '42501';
  end if;

  select br.*
    into v_request
    from public.order_vendor_bid_requests br
   where br.id = v_recipient.bid_request_id;

  if not found then
    raise exception 'bid_request_not_found_or_not_authorized'
      using errcode = '42501';
  end if;

  select o.*
    into v_order
    from public.orders o
   where o.id = v_request.order_id
   for update;

  if not found
     or v_request.company_id <> v_company_id
     or coalesce(v_order.company_id, public.default_company_id()) <> v_company_id
     or not public.current_app_user_can_read_order(v_request.order_id) then
    raise exception 'bid_request_not_found_or_not_authorized'
      using errcode = '42501';
  end if;

  if not public.current_app_user_can_update_order_row(
    v_order.company_id,
    v_order.appraiser_id,
    v_order.assigned_to,
    v_order.reviewer_id,
    v_order.status
  ) then
    raise exception 'order_update_authority_required'
      using errcode = '42501';
  end if;

  if coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations' then
    raise exception 'order_scope_not_amc_operations'
      using errcode = '42501';
  end if;

  if v_response.submitted_at is null then
    raise exception 'bid_response_not_submitted'
      using errcode = '22023';
  end if;

  if v_response.selected_at is null then
    raise exception 'bid_response_not_selected'
      using errcode = '22023';
  end if;

  if v_recipient.status <> 'selected' then
    raise exception 'bid_request_recipient_not_selected'
      using errcode = '22023';
  end if;

  if v_request.status in ('cancelled', 'expired') then
    raise exception 'bid_request_not_convertible'
      using errcode = '22023';
  end if;

  select cvp.*
    into v_profile
    from public.company_vendor_profiles cvp
   where cvp.id = v_recipient.vendor_profile_id;

  if not found
     or v_profile.owner_company_id <> v_company_id
     or v_profile.vendor_company_id <> v_recipient.vendor_company_id then
    raise exception 'bid_request_vendor_not_found_or_not_authorized'
      using errcode = '42501';
  end if;

  if v_profile.vendor_status in ('inactive', 'do_not_use') then
    raise exception 'bid_request_vendor_ineligible'
      using errcode = '42501';
  end if;

  select cr.*
    into v_relationship
    from public.company_relationships cr
   where cr.id = v_recipient.relationship_id;

  if not found
     or v_relationship.source_company_id <> v_company_id
     or v_relationship.target_company_id <> v_recipient.vendor_company_id
     or v_relationship.relationship_type <> 'amc_vendor'
     or v_relationship.status <> 'active' then
    raise exception 'bid_request_vendor_ineligible'
      using errcode = '42501';
  end if;

  if v_profile.relationship_id is not null
     and v_profile.relationship_id <> v_recipient.relationship_id then
    raise exception 'bid_request_vendor_not_found_or_not_authorized'
      using errcode = '42501';
  end if;

  if exists (
    select 1
      from public.order_company_assignments oca
     where oca.order_id = v_request.order_id
       and oca.assignment_type = 'vendor_appraisal'
       and oca.status in ('offered', 'accepted', 'in_progress', 'submitted')
  ) then
    raise exception 'order_vendor_assignment_active_exists'
      using errcode = '23505';
  end if;

  v_due_at := coalesce(
    nullif(v_payload ->> 'due_at', '')::timestamptz,
    v_response.proposed_due_at
  );
  v_review_due_at := nullif(v_payload ->> 'review_due_at', '')::timestamptz;
  v_expires_at := nullif(v_payload ->> 'expires_at', '')::timestamptz;

  v_note := nullif(
    btrim(
      coalesce(nullif(v_payload ->> 'instructions', ''), nullif(v_payload ->> 'note', ''), '') ||
      case
        when nullif(btrim(v_request.request_message), '') is not null then
          case
            when nullif(coalesce(v_payload ->> 'instructions', v_payload ->> 'note', ''), '') is not null
              then E'\n\nBid request message: '
            else 'Bid request message: '
          end || btrim(v_request.request_message)
        else ''
      end ||
      case
        when nullif(btrim(v_response.comments), '') is not null then
          E'\n\nVendor response comments: ' || btrim(v_response.comments)
        else ''
      end
    ),
    ''
  );

  v_terms := coalesce(v_payload -> 'terms', '{}'::jsonb)
    || jsonb_strip_nulls(jsonb_build_object(
      'source', 'selected_bid_response',
      'fee_amount', v_response.fee_amount,
      'currency', v_response.currency,
      'turn_time_days', v_response.turn_time_days,
      'proposed_due_at', v_response.proposed_due_at
    ));

  v_selected_bid_snapshot := jsonb_strip_nulls(jsonb_build_object(
    'bid_request_id', v_request.id,
    'bid_recipient_id', v_recipient.id,
    'bid_response_id', v_response.id,
    'order_id', v_request.order_id,
    'vendor_profile_id', v_recipient.vendor_profile_id,
    'vendor_company_id', v_recipient.vendor_company_id,
    'relationship_id', v_recipient.relationship_id,
    'request_message', v_request.request_message,
    'response_due_at', v_request.response_due_at,
    'client_due_at', v_request.client_due_at,
    'desired_vendor_due_at', v_request.desired_vendor_due_at,
    'fee_amount', v_response.fee_amount,
    'currency', v_response.currency,
    'turn_time_days', v_response.turn_time_days,
    'proposed_due_at', v_response.proposed_due_at,
    'comments', v_response.comments,
    'submitted_at', v_response.submitted_at,
    'selected_at', v_response.selected_at
  ));

  v_handoff_payload := coalesce(v_payload -> 'handoff_payload', '{}'::jsonb)
    || jsonb_build_object(
      'source', 'selected_bid_response',
      'bid_request_id', v_request.id,
      'bid_recipient_id', v_recipient.id,
      'bid_response_id', v_response.id,
      'vendor_profile_id', v_recipient.vendor_profile_id,
      'vendor_company_id', v_recipient.vendor_company_id,
      'relationship_id', v_recipient.relationship_id,
      'selected_bid_snapshot', v_selected_bid_snapshot
    );

  v_assignment_id := public.rpc_order_company_assignment_offer(
    v_request.order_id,
    v_recipient.vendor_company_id,
    v_recipient.relationship_id,
    'vendor_appraisal',
    v_note,
    v_terms,
    v_handoff_payload,
    v_due_at,
    v_review_due_at,
    v_expires_at
  );

  return jsonb_build_object(
    'assignment_id', v_assignment_id,
    'order_id', v_request.order_id,
    'vendor_profile_id', v_recipient.vendor_profile_id,
    'vendor_company_id', v_recipient.vendor_company_id,
    'bid_request_id', v_request.id,
    'bid_recipient_id', v_recipient.id,
    'bid_response_id', v_response.id,
    'status', 'offered',
    'result', 'assignment_offer_created'
  );
end;
$$;

revoke all on function public.rpc_order_vendor_bid_response_convert_to_assignment_offer(uuid, jsonb) from public, anon;
grant execute on function public.rpc_order_vendor_bid_response_convert_to_assignment_offer(uuid, jsonb) to authenticated, service_role;

comment on function public.rpc_order_vendor_bid_response_convert_to_assignment_offer(uuid, jsonb) is
  'AMC-6W.1 backend-only selected bid conversion wrapper. Loads selected bid response, recipient, request, and order server-side; revalidates AMC order scope, assignment offer authority, active amc_vendor relationship, usable vendor profile, and no active vendor_appraisal assignment; then delegates to rpc_order_company_assignment_offer so canonical assignment packet guards, activity, and notification behavior are preserved. Does not mutate bid request/response rows, orders, frontend UI, routes/nav, or /amc/* routes.';

commit;
