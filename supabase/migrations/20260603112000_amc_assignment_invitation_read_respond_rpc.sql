begin;

create extension if not exists "pgcrypto";

create or replace function public.rpc_order_company_assignment_invitation_read(
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_failure constant jsonb := jsonb_build_object(
    'ok', false,
    'error', 'assignment_invitation_invalid_or_expired'
  );
  v_token text := lower(btrim(coalesce(p_token, '')));
  v_token_hash text;
  v_invitation public.order_company_assignment_invitations%rowtype;
  v_assignment public.order_company_assignments%rowtype;
  v_order public.orders%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_profile public.company_vendor_profiles%rowtype;
  v_contact public.vendor_contacts%rowtype;
  v_vendor_company_name text;
  v_owner_company_name text;
begin
  if v_token !~ '^[0-9a-f]{64}$' then
    return v_failure;
  end if;

  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  select inv.*
    into v_invitation
    from public.order_company_assignment_invitations inv
   where inv.token_hash = v_token_hash
   for update;

  if not found
     or v_invitation.revoked_at is not null
     or v_invitation.accepted_at is not null
     or v_invitation.declined_at is not null
     or v_invitation.expires_at <= now() then
    return v_failure;
  end if;

  select oca.*
    into v_assignment
    from public.order_company_assignments oca
   where oca.id = v_invitation.assignment_id;

  if not found
     or v_assignment.status <> 'offered'
     or v_assignment.assignment_type <> 'vendor_appraisal'
     or (
       v_assignment.expires_at is not null
       and v_assignment.expires_at <= now()
     )
     or v_assignment.id is distinct from v_invitation.assignment_id
     or v_assignment.order_id is distinct from v_invitation.order_id
     or v_assignment.owner_company_id is distinct from v_invitation.owner_company_id
     or v_assignment.assigned_company_id is distinct from v_invitation.assigned_company_id
     or v_assignment.relationship_id is distinct from v_invitation.relationship_id then
    return v_failure;
  end if;

  select o.*
    into v_order
    from public.orders o
   where o.id = v_assignment.order_id;

  if not found
     or coalesce(v_order.company_id, public.default_company_id()) is distinct from v_assignment.owner_company_id
     or coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations' then
    return v_failure;
  end if;

  select cr.*
    into v_relationship
    from public.company_relationships cr
   where cr.id = v_assignment.relationship_id;

  if not found
     or v_relationship.source_company_id is distinct from v_assignment.owner_company_id
     or v_relationship.target_company_id is distinct from v_assignment.assigned_company_id
     or v_relationship.relationship_type <> 'amc_vendor'
     or v_relationship.status <> 'active'
     or v_assignment.assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type) then
    return v_failure;
  end if;

  select cvp.*
    into v_profile
    from public.company_vendor_profiles cvp
   where cvp.owner_company_id = v_assignment.owner_company_id
     and cvp.vendor_company_id = v_assignment.assigned_company_id
   order by
     case when cvp.relationship_id = v_assignment.relationship_id then 0 else 1 end,
     cvp.created_at desc
   limit 1;

  if not found
     or v_profile.vendor_status in ('inactive', 'do_not_use')
     or (
       v_profile.relationship_id is not null
       and v_profile.relationship_id is distinct from v_assignment.relationship_id
     ) then
    return v_failure;
  end if;

  if v_invitation.vendor_contact_id is not null then
    select vc.*
      into v_contact
      from public.vendor_contacts vc
     where vc.id = v_invitation.vendor_contact_id
       and vc.vendor_profile_id = v_profile.id;

    if not found then
      return v_failure;
    end if;
  end if;

  select c.name
    into v_vendor_company_name
    from public.companies c
   where c.id = v_assignment.assigned_company_id;

  select c.name
    into v_owner_company_name
    from public.companies c
   where c.id = v_assignment.owner_company_id;

  update public.order_company_assignment_invitations inv
     set opened_at = coalesce(inv.opened_at, now()),
         last_opened_at = now(),
         open_count = inv.open_count + 1,
         updated_at = now()
   where inv.id = v_invitation.id
   returning inv.* into v_invitation;

  return jsonb_build_object(
    'ok', true,
    'access_mode', 'assignment_offer_token',
    'invitation', jsonb_build_object(
      'status', 'offered',
      'expires_at', v_invitation.expires_at,
      'sent_to_email', v_invitation.sent_to_email,
      'can_accept', true,
      'can_decline', true
    ),
    'vendor', jsonb_build_object(
      'company_name', v_vendor_company_name,
      'contact_name', v_contact.name,
      'contact_email', coalesce(nullif(v_contact.email, ''), v_invitation.sent_to_email)
    ),
    'owner', jsonb_build_object(
      'company_name', v_owner_company_name
    ),
    'order', jsonb_build_object(
      'order_number', v_order.order_number,
      'property_address', coalesce(nullif(v_order.property_address, ''), nullif(v_order.address, '')),
      'city', v_order.city,
      'state', v_order.state,
      'postal_code', coalesce(nullif(v_order.postal_code, ''), nullif(v_order.zip, '')),
      'county', v_order.county,
      'property_type', v_order.property_type,
      'report_type', v_order.report_type
    ),
    'assignment', jsonb_build_object(
      'status', 'offered',
      'offered_at', v_assignment.offered_at,
      'due_at', v_assignment.due_at,
      'review_due_at', v_assignment.review_due_at,
      'expires_at', v_assignment.expires_at,
      'instructions', v_assignment.instructions,
      'fee_amount', coalesce(v_assignment.terms -> 'fee_amount', v_assignment.handoff_payload #> '{selected_bid_snapshot,fee_amount}'),
      'currency', coalesce(v_assignment.terms ->> 'currency', v_assignment.handoff_payload #>> '{selected_bid_snapshot,currency}'),
      'turn_time_days', coalesce(v_assignment.terms -> 'turn_time_days', v_assignment.handoff_payload #> '{selected_bid_snapshot,turn_time_days}'),
      'proposed_due_at', coalesce(v_assignment.terms ->> 'proposed_due_at', v_assignment.handoff_payload #>> '{selected_bid_snapshot,proposed_due_at}'),
      'comments', v_assignment.handoff_payload #>> '{selected_bid_snapshot,comments}'
    )
  );
end;
$$;

create or replace function public.rpc_order_company_assignment_invitation_respond(
  p_token text,
  p_action text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_failure constant jsonb := jsonb_build_object(
    'ok', false,
    'error', 'assignment_invitation_invalid_or_expired'
  );
  v_token text := lower(btrim(coalesce(p_token, '')));
  v_token_hash text;
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_invitation public.order_company_assignment_invitations%rowtype;
  v_assignment public.order_company_assignments%rowtype;
  v_order public.orders%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_profile public.company_vendor_profiles%rowtype;
  v_contact public.vendor_contacts%rowtype;
  v_responded_at timestamptz := now();
  v_activity_payload jsonb := '{}'::jsonb;
begin
  if v_token !~ '^[0-9a-f]{64}$' then
    return v_failure;
  end if;

  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  select inv.*
    into v_invitation
    from public.order_company_assignment_invitations inv
   where inv.token_hash = v_token_hash
   for update;

  if not found
     or v_invitation.revoked_at is not null
     or v_invitation.accepted_at is not null
     or v_invitation.declined_at is not null
     or v_invitation.expires_at <= now() then
    return v_failure;
  end if;

  select oca.*
    into v_assignment
    from public.order_company_assignments oca
   where oca.id = v_invitation.assignment_id
   for update;

  if not found
     or v_assignment.status <> 'offered'
     or v_assignment.assignment_type <> 'vendor_appraisal'
     or (
       v_assignment.expires_at is not null
       and v_assignment.expires_at <= now()
     )
     or v_assignment.id is distinct from v_invitation.assignment_id
     or v_assignment.order_id is distinct from v_invitation.order_id
     or v_assignment.owner_company_id is distinct from v_invitation.owner_company_id
     or v_assignment.assigned_company_id is distinct from v_invitation.assigned_company_id
     or v_assignment.relationship_id is distinct from v_invitation.relationship_id then
    return v_failure;
  end if;

  select o.*
    into v_order
    from public.orders o
   where o.id = v_assignment.order_id;

  if not found
     or coalesce(v_order.company_id, public.default_company_id()) is distinct from v_assignment.owner_company_id
     or coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations' then
    return v_failure;
  end if;

  select cr.*
    into v_relationship
    from public.company_relationships cr
   where cr.id = v_assignment.relationship_id;

  if not found
     or v_relationship.source_company_id is distinct from v_assignment.owner_company_id
     or v_relationship.target_company_id is distinct from v_assignment.assigned_company_id
     or v_relationship.relationship_type <> 'amc_vendor'
     or v_relationship.status <> 'active'
     or v_assignment.assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type) then
    return v_failure;
  end if;

  select cvp.*
    into v_profile
    from public.company_vendor_profiles cvp
   where cvp.owner_company_id = v_assignment.owner_company_id
     and cvp.vendor_company_id = v_assignment.assigned_company_id
   order by
     case when cvp.relationship_id = v_assignment.relationship_id then 0 else 1 end,
     cvp.created_at desc
   limit 1;

  if not found
     or v_profile.vendor_status in ('inactive', 'do_not_use')
     or (
       v_profile.relationship_id is not null
       and v_profile.relationship_id is distinct from v_assignment.relationship_id
     ) then
    return v_failure;
  end if;

  if v_invitation.vendor_contact_id is not null then
    select vc.*
      into v_contact
      from public.vendor_contacts vc
     where vc.id = v_invitation.vendor_contact_id
       and vc.vendor_profile_id = v_profile.id;

    if not found then
      return v_failure;
    end if;
  end if;

  if v_action not in ('accept', 'decline') then
    return jsonb_build_object(
      'ok', false,
      'error', 'assignment_response_invalid',
      'field_errors', jsonb_build_object(
        'action', 'Choose accept or decline.'
      )
    );
  end if;

  if v_action = 'accept' then
    update public.order_company_assignments
       set status = 'accepted',
           accepted_at = v_responded_at
     where id = v_assignment.id;

    update public.order_company_assignment_invitations
       set accepted_at = v_responded_at,
           updated_at = now(),
           metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
             'responded_via', 'token_assignment_invitation',
             'token_last_four', v_invitation.token_last_four
           )
     where id = v_invitation.id;

    v_activity_payload := jsonb_build_object(
      'responded_via', 'token_assignment_invitation',
      'invitation_token_last_four', v_invitation.token_last_four
    );

    perform public.log_order_company_assignment_event(
      v_assignment.id,
      'assignment.accepted',
      null,
      v_assignment.assigned_company_id,
      'Assignment accepted',
      v_activity_payload
    );
    perform public.notify_order_company_assignment_event(
      v_assignment.id,
      'assignment.accepted',
      null,
      v_assignment.assigned_company_id,
      v_activity_payload
    );

    return jsonb_build_object(
      'ok', true,
      'status', 'accepted',
      'message', 'Assignment accepted.'
    );
  end if;

  update public.order_company_assignments
     set status = 'declined',
         declined_at = v_responded_at,
         submission_payload = case
           when v_reason is null then submission_payload
           else jsonb_set(
             coalesce(submission_payload, '{}'::jsonb),
             '{decline_reason}',
             to_jsonb(v_reason),
             true
           )
         end
   where id = v_assignment.id;

  update public.order_company_assignment_invitations
     set declined_at = v_responded_at,
         updated_at = now(),
         metadata = coalesce(metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
           'responded_via', 'token_assignment_invitation',
           'token_last_four', v_invitation.token_last_four,
           'decline_reason', v_reason
         ))
   where id = v_invitation.id;

  v_activity_payload := jsonb_strip_nulls(jsonb_build_object(
    'responded_via', 'token_assignment_invitation',
    'invitation_token_last_four', v_invitation.token_last_four,
    'reason', v_reason
  ));

  perform public.log_order_company_assignment_event(
    v_assignment.id,
    'assignment.declined',
    null,
    v_assignment.assigned_company_id,
    'Assignment declined',
    v_activity_payload
  );
  perform public.notify_order_company_assignment_event(
    v_assignment.id,
    'assignment.declined',
    null,
    v_assignment.assigned_company_id,
    v_activity_payload
  );

  return jsonb_build_object(
    'ok', true,
    'status', 'declined',
    'message', 'Assignment declined.'
  );
end;
$$;

revoke all privileges on table public.order_company_assignment_invitations from public, anon, authenticated;
revoke all privileges on table public.order_company_assignments from public, anon, authenticated;
revoke all on function public.rpc_order_company_assignment_invitation_read(text) from public;
revoke all on function public.rpc_order_company_assignment_invitation_respond(text, text, text) from public;
grant execute on function public.rpc_order_company_assignment_invitation_read(text) to anon, authenticated, service_role;
grant execute on function public.rpc_order_company_assignment_invitation_respond(text, text, text) to anon, authenticated, service_role;

comment on function public.rpc_order_company_assignment_invitation_read(text) is
  'AMC-8A.3 public/token assignment-offer read RPC. Validates a hashed assignment invitation token with a constant invalid/expired response, revalidates offered AMC vendor_appraisal assignment state and active amc_vendor relationship, updates invitation open telemetry only, and returns allowlisted vendor-safe offer fields. Does not expose raw terms, raw handoff_payload, internal ids, relationship ids, vendor profile ids, bid response ids, candidate scores, client fee, AMC margin, audit metadata, direct table access, email behavior, assignment lifecycle mutation, report submission, or order mutation.';

comment on function public.rpc_order_company_assignment_invitation_respond(text, text, text) is
  'AMC-8A.3 public/token assignment-offer respond RPC. Validates a hashed assignment invitation token with a constant invalid/expired response, validates accept/decline only after token lifecycle is valid, advances offered vendor_appraisal assignments only to accepted or declined, stamps invitation accepted_at or declined_at, stores an optional decline reason in assignment submission_payload, logs/notifies through existing assignment helpers, and does not mutate orders, create report submissions, send email, or expose internal ids in public responses.';

commit;
