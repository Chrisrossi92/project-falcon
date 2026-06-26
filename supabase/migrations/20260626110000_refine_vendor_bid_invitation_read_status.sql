begin;

create extension if not exists "pgcrypto";

create or replace function public.rpc_order_vendor_bid_invitation_read(
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unavailable constant jsonb := jsonb_build_object(
    'ok', false,
    'error', 'bid_invitation_unavailable',
    'status', 'unavailable',
    'reason', 'unavailable'
  );
  v_token text := lower(btrim(coalesce(p_token, '')));
  v_token_hash text;
  v_invitation public.order_vendor_bid_request_recipient_invitations%rowtype;
  v_request public.order_vendor_bid_requests%rowtype;
  v_recipient public.order_vendor_bid_request_recipients%rowtype;
  v_order public.orders%rowtype;
  v_profile public.company_vendor_profiles%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_contact public.vendor_contacts%rowtype;
  v_vendor_company_name text;
begin
  if v_token !~ '^[0-9a-f]{64}$' then
    return v_unavailable;
  end if;

  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  select inv.*
    into v_invitation
    from public.order_vendor_bid_request_recipient_invitations inv
   where inv.token_hash = v_token_hash
   for update;

  if not found then
    return v_unavailable;
  end if;

  if v_invitation.revoked_at is not null then
    return jsonb_build_object(
      'ok', false,
      'error', 'bid_invitation_unavailable',
      'status', 'unavailable',
      'reason', 'revoked',
      'invitation', jsonb_build_object(
        'status', 'unavailable',
        'can_submit', false
      )
    );
  end if;

  if v_invitation.submitted_at is not null then
    return jsonb_build_object(
      'ok', false,
      'error', 'bid_invitation_already_submitted',
      'status', 'submitted',
      'reason', 'already_submitted',
      'invitation', jsonb_build_object(
        'status', 'submitted',
        'submitted_at', v_invitation.submitted_at,
        'can_submit', false
      )
    );
  end if;

  if v_invitation.expires_at <= now() then
    return jsonb_build_object(
      'ok', false,
      'error', 'bid_invitation_expired',
      'status', 'expired',
      'reason', 'expired',
      'invitation', jsonb_build_object(
        'status', 'expired',
        'expires_at', v_invitation.expires_at,
        'can_submit', false
      )
    );
  end if;

  select br.*
    into v_request
    from public.order_vendor_bid_requests br
   where br.id = v_invitation.bid_request_id;

  if not found
     or v_request.status not in ('sent', 'partially_responded') then
    return v_unavailable;
  end if;

  select brr.*
    into v_recipient
    from public.order_vendor_bid_request_recipients brr
   where brr.id = v_invitation.recipient_id;

  if not found
     or v_recipient.bid_request_id is distinct from v_invitation.bid_request_id
     or v_recipient.vendor_profile_id is distinct from v_invitation.vendor_profile_id
     or v_recipient.vendor_company_id is distinct from v_invitation.vendor_company_id then
    return v_unavailable;
  end if;

  if v_recipient.status in ('responded', 'selected', 'not_selected') then
    return jsonb_build_object(
      'ok', false,
      'error', 'bid_invitation_already_submitted',
      'status', 'submitted',
      'reason', 'already_submitted',
      'invitation', jsonb_build_object(
        'status', 'submitted',
        'can_submit', false
      )
    );
  end if;

  if v_recipient.status not in ('pending', 'sent', 'viewed') then
    return v_unavailable;
  end if;

  select o.*
    into v_order
    from public.orders o
   where o.id = v_invitation.order_id;

  if not found
     or v_request.order_id is distinct from v_invitation.order_id
     or coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations' then
    return v_unavailable;
  end if;

  select cvp.*
    into v_profile
    from public.company_vendor_profiles cvp
   where cvp.id = v_invitation.vendor_profile_id;

  if not found
     or v_profile.vendor_company_id is distinct from v_invitation.vendor_company_id
     or v_profile.vendor_status in ('inactive', 'do_not_use') then
    return v_unavailable;
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
    return v_unavailable;
  end if;

  if v_invitation.vendor_contact_id is not null then
    select vc.*
      into v_contact
      from public.vendor_contacts vc
     where vc.id = v_invitation.vendor_contact_id
       and vc.vendor_profile_id = v_invitation.vendor_profile_id;
  end if;

  select c.name
    into v_vendor_company_name
    from public.companies c
   where c.id = v_invitation.vendor_company_id;

  update public.order_vendor_bid_request_recipient_invitations inv
     set opened_at = coalesce(inv.opened_at, now()),
         last_opened_at = now(),
         open_count = inv.open_count + 1,
         updated_at = now()
   where inv.id = v_invitation.id
   returning inv.* into v_invitation;

  return jsonb_build_object(
    'ok', true,
    'access_mode', 'token_invitation',
    'invitation', jsonb_build_object(
      'status', 'available_to_bid',
      'expires_at', v_invitation.expires_at,
      'sent_to_email', v_invitation.sent_to_email,
      'opened_at', v_invitation.opened_at,
      'last_opened_at', v_invitation.last_opened_at,
      'can_submit', true
    ),
    'vendor', jsonb_build_object(
      'company_name', v_vendor_company_name,
      'contact_name', v_contact.name,
      'contact_email', coalesce(nullif(v_contact.email, ''), v_invitation.sent_to_email)
    ),
    'order', jsonb_build_object(
      'order_number', v_order.order_number,
      'property_address', coalesce(nullif(v_order.property_address, ''), nullif(v_order.address, '')),
      'city', v_order.city,
      'state', v_order.state,
      'postal_code', coalesce(nullif(v_order.postal_code, ''), nullif(v_order.zip, '')),
      'county', v_order.county,
      'property_type', v_order.property_type,
      'report_type', v_order.report_type,
      'site_visit_at', coalesce(
        v_order.site_visit_at::timestamptz,
        v_order.inspection_date::timestamptz,
        v_order.site_visit_date::timestamptz
      ),
      'site_visit_date', coalesce(v_order.inspection_date, v_order.site_visit_date),
      'client_due_at', coalesce(v_request.client_due_at, v_order.client_due_at),
      'final_due_at', coalesce(v_order.final_due_at, v_order.client_due_at, v_order.due_to_client::timestamptz, v_order.due_date::timestamptz),
      'status_label', 'Available to Bid'
    ),
    'bid_request', jsonb_build_object(
      'request_message', v_request.request_message,
      'response_due_at', v_request.response_due_at,
      'desired_vendor_due_at', v_request.desired_vendor_due_at,
      'client_due_at', v_request.client_due_at,
      'status', 'open'
    ),
    'response', null
  );
end;
$$;

revoke all privileges on table public.order_vendor_bid_request_recipient_invitations from public, anon, authenticated;
revoke all on function public.rpc_order_vendor_bid_invitation_read(text) from public;
grant execute on function public.rpc_order_vendor_bid_invitation_read(text) to anon, authenticated, service_role;

comment on function public.rpc_order_vendor_bid_invitation_read(text) is
  'AMC vendor bid public-token read RPC. Returns safe closed-token reasons for expired and already-submitted invitations where the token is valid, returns a generic unavailable status for invalid or revoked links, updates invitation open tracking only on valid open reads, and does not submit bids, mutate orders, select bids, create assignments, send email/notifications, expose internal ids, or grant direct table access.';

commit;
