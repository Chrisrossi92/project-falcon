begin;

create extension if not exists "pgcrypto";

create or replace function public.rpc_order_vendor_bid_invitation_submit(
  p_token text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_failure constant jsonb := jsonb_build_object(
    'ok', false,
    'error', 'bid_invitation_invalid_or_expired'
  );
  v_token text := lower(btrim(coalesce(p_token, '')));
  v_token_hash text;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_field_errors jsonb := '{}'::jsonb;
  v_invitation public.order_vendor_bid_request_recipient_invitations%rowtype;
  v_request public.order_vendor_bid_requests%rowtype;
  v_recipient public.order_vendor_bid_request_recipients%rowtype;
  v_order public.orders%rowtype;
  v_profile public.company_vendor_profiles%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_fee_text text;
  v_fee_amount numeric;
  v_currency text;
  v_proposed_due_text text;
  v_proposed_due_at timestamptz;
  v_turn_time_text text;
  v_turn_time_days integer;
  v_comments text;
  v_contact_name text;
  v_contact_email text;
  v_contact_phone text;
  v_submitted_at timestamptz := now();
  v_request_status text;
  v_response_id uuid;
begin
  if v_token !~ '^[0-9a-f]{64}$' then
    return v_failure;
  end if;

  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

  select inv.*
    into v_invitation
    from public.order_vendor_bid_request_recipient_invitations inv
   where inv.token_hash = v_token_hash
   for update;

  if not found
     or v_invitation.revoked_at is not null
     or v_invitation.submitted_at is not null
     or v_invitation.expires_at <= now() then
    return v_failure;
  end if;

  select brr.*
    into v_recipient
    from public.order_vendor_bid_request_recipients brr
   where brr.id = v_invitation.recipient_id
   for update;

  if not found
     or v_recipient.status not in ('pending', 'sent', 'viewed')
     or v_recipient.bid_request_id is distinct from v_invitation.bid_request_id
     or v_recipient.vendor_profile_id is distinct from v_invitation.vendor_profile_id
     or v_recipient.vendor_company_id is distinct from v_invitation.vendor_company_id then
    return v_failure;
  end if;

  select br.*
    into v_request
    from public.order_vendor_bid_requests br
   where br.id = v_invitation.bid_request_id
   for update;

  if not found
     or v_request.status not in ('sent', 'partially_responded')
     or v_request.id is distinct from v_recipient.bid_request_id
     or v_request.order_id is distinct from v_invitation.order_id then
    return v_failure;
  end if;

  select o.*
    into v_order
    from public.orders o
   where o.id = v_invitation.order_id;

  if not found
     or coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations' then
    return v_failure;
  end if;

  select cvp.*
    into v_profile
    from public.company_vendor_profiles cvp
   where cvp.id = v_invitation.vendor_profile_id;

  if not found
     or v_profile.vendor_company_id is distinct from v_invitation.vendor_company_id
     or v_profile.vendor_status in ('inactive', 'do_not_use') then
    return v_failure;
  end if;

  select cr.*
    into v_relationship
    from public.company_relationships cr
   where cr.id = v_recipient.relationship_id;

  if not found
     or v_relationship.source_company_id is distinct from v_profile.owner_company_id
     or v_relationship.target_company_id is distinct from v_invitation.vendor_company_id
     or v_relationship.relationship_type <> 'amc_vendor'
     or v_relationship.status <> 'active'
     or (
       v_profile.relationship_id is not null
       and v_profile.relationship_id is distinct from v_recipient.relationship_id
     ) then
    return v_failure;
  end if;

  if exists (
    select 1
      from public.order_vendor_bid_responses obr
     where obr.recipient_id = v_recipient.id
  ) then
    return v_failure;
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
  v_contact_name := nullif(btrim(v_payload ->> 'contact_name'), '');
  v_contact_email := lower(nullif(btrim(v_payload ->> 'contact_email'), ''));
  v_contact_phone := nullif(btrim(v_payload ->> 'contact_phone'), '');

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

  if v_contact_email is not null
     and v_contact_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    v_field_errors := v_field_errors || jsonb_build_object('contact_email', 'Contact email must be valid.');
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
      'submitted_via', 'token_invitation',
      'invitation_id', v_invitation.id,
      'token_last_four', v_invitation.token_last_four,
      'contact_name', v_contact_name,
      'contact_email', v_contact_email,
      'contact_phone', v_contact_phone
    ))
  )
  returning id into v_response_id;

  update public.order_vendor_bid_request_recipients
     set status = 'responded',
         responded_at = v_submitted_at,
         updated_at = now()
   where id = v_recipient.id;

  update public.order_vendor_bid_request_recipient_invitations
     set submitted_at = v_submitted_at,
         updated_at = now()
   where id = v_invitation.id;

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
    'message', 'Your bid has been submitted.'
  );
end;
$$;

revoke all privileges on table public.order_vendor_bid_request_recipient_invitations from public, anon, authenticated;
revoke all privileges on table public.order_vendor_bid_requests from public, anon, authenticated;
revoke all privileges on table public.order_vendor_bid_request_recipients from public, anon, authenticated;
revoke all privileges on table public.order_vendor_bid_responses from public, anon, authenticated;
revoke all on function public.rpc_order_vendor_bid_invitation_submit(text, jsonb) from public;
grant execute on function public.rpc_order_vendor_bid_invitation_submit(text, jsonb) to anon, authenticated, service_role;

comment on function public.rpc_order_vendor_bid_invitation_submit(text, jsonb) is
  'AMC-7D.1 public/token bid submission RPC. Validates a hashed invitation token, returns a constant failure shape for token and lifecycle failures, validates public submission payload only after token validity is established, inserts one bid response, marks the bid recipient responded, advances the bid request lifecycle, sets invitation submitted_at, and returns a compact public success payload. Does not mutate orders, select bids, create assignment packets, send email or notifications, expose internal ids in the public response, or grant direct table access.';

commit;
