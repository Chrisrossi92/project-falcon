begin;

create extension if not exists "pgcrypto";

create table if not exists public.order_vendor_bid_request_recipient_invitations (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.order_vendor_bid_request_recipients(id) on delete cascade,
  bid_request_id uuid not null references public.order_vendor_bid_requests(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  vendor_profile_id uuid not null references public.company_vendor_profiles(id) on delete restrict,
  vendor_company_id uuid not null references public.companies(id) on delete restrict,
  vendor_contact_id uuid null references public.vendor_contacts(id) on delete set null,
  token_hash text not null unique,
  token_last_four text not null,
  sent_to_email text not null,
  expires_at timestamptz not null,
  opened_at timestamptz null,
  last_opened_at timestamptz null,
  open_count integer not null default 0,
  submitted_at timestamptz null,
  revoked_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_vendor_bid_request_recipient_invitations_email_valid
    check (sent_to_email = lower(btrim(sent_to_email)) and sent_to_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  constraint order_vendor_bid_request_recipient_invitations_token_last_four_valid
    check (token_last_four ~ '^[0-9a-f]{4}$'),
  constraint order_vendor_bid_request_recipient_invitations_hash_valid
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint order_vendor_bid_request_recipient_invitations_open_count_non_negative
    check (open_count >= 0),
  constraint order_vendor_bid_request_recipient_invitations_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

create or replace function public.tg_order_vendor_bid_invitation_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_recipient public.order_vendor_bid_request_recipients%rowtype;
  v_request public.order_vendor_bid_requests%rowtype;
  v_contact public.vendor_contacts%rowtype;
begin
  if TG_OP = 'UPDATE' then
    if NEW.recipient_id is distinct from OLD.recipient_id then
      raise exception 'order_vendor_bid_request_recipient_invitations.recipient_id is immutable';
    end if;

    if NEW.bid_request_id is distinct from OLD.bid_request_id then
      raise exception 'order_vendor_bid_request_recipient_invitations.bid_request_id is immutable';
    end if;

    if NEW.order_id is distinct from OLD.order_id then
      raise exception 'order_vendor_bid_request_recipient_invitations.order_id is immutable';
    end if;

    if NEW.vendor_profile_id is distinct from OLD.vendor_profile_id then
      raise exception 'order_vendor_bid_request_recipient_invitations.vendor_profile_id is immutable';
    end if;

    if NEW.vendor_company_id is distinct from OLD.vendor_company_id then
      raise exception 'order_vendor_bid_request_recipient_invitations.vendor_company_id is immutable';
    end if;

    if NEW.token_hash is distinct from OLD.token_hash then
      raise exception 'order_vendor_bid_request_recipient_invitations.token_hash is immutable';
    end if;
  end if;

  NEW.sent_to_email := lower(btrim(NEW.sent_to_email));

  select *
    into v_recipient
    from public.order_vendor_bid_request_recipients brr
   where brr.id = NEW.recipient_id;

  if not found then
    raise exception 'Bid invitation recipient does not exist';
  end if;

  select *
    into v_request
    from public.order_vendor_bid_requests br
   where br.id = v_recipient.bid_request_id;

  if not found then
    raise exception 'Bid invitation request does not exist';
  end if;

  if NEW.bid_request_id is distinct from v_recipient.bid_request_id then
    raise exception 'Bid invitation request must match recipient request';
  end if;

  if NEW.order_id is distinct from v_request.order_id then
    raise exception 'Bid invitation order must match bid request order';
  end if;

  if NEW.vendor_profile_id is distinct from v_recipient.vendor_profile_id then
    raise exception 'Bid invitation vendor profile must match recipient vendor profile';
  end if;

  if NEW.vendor_company_id is distinct from v_recipient.vendor_company_id then
    raise exception 'Bid invitation vendor company must match recipient vendor company';
  end if;

  if NEW.vendor_contact_id is not null then
    select *
      into v_contact
      from public.vendor_contacts vc
     where vc.id = NEW.vendor_contact_id;

    if not found or v_contact.vendor_profile_id is distinct from NEW.vendor_profile_id then
      raise exception 'Bid invitation vendor contact must belong to recipient vendor profile';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_order_vendor_bid_invitation_guard on public.order_vendor_bid_request_recipient_invitations;
create trigger trg_order_vendor_bid_invitation_guard
before insert or update on public.order_vendor_bid_request_recipient_invitations
for each row execute function public.tg_order_vendor_bid_invitation_guard();

drop trigger if exists trg_order_vendor_bid_invitation_touch_updated_at on public.order_vendor_bid_request_recipient_invitations;
create trigger trg_order_vendor_bid_invitation_touch_updated_at
before update on public.order_vendor_bid_request_recipient_invitations
for each row execute function public.tg_order_vendor_bid_touch_updated_at();

create index if not exists idx_order_vendor_bid_invitations_recipient
  on public.order_vendor_bid_request_recipient_invitations (recipient_id);

create index if not exists idx_order_vendor_bid_invitations_bid_request
  on public.order_vendor_bid_request_recipient_invitations (bid_request_id);

create index if not exists idx_order_vendor_bid_invitations_order
  on public.order_vendor_bid_request_recipient_invitations (order_id);

create index if not exists idx_order_vendor_bid_invitations_vendor_profile
  on public.order_vendor_bid_request_recipient_invitations (vendor_profile_id);

create index if not exists idx_order_vendor_bid_invitations_sent_to_email
  on public.order_vendor_bid_request_recipient_invitations (sent_to_email);

create index if not exists idx_order_vendor_bid_invitations_expires_at
  on public.order_vendor_bid_request_recipient_invitations (expires_at);

create index if not exists idx_order_vendor_bid_invitations_active_recipient
  on public.order_vendor_bid_request_recipient_invitations (recipient_id, expires_at)
  where revoked_at is null
    and submitted_at is null;

alter table public.order_vendor_bid_request_recipient_invitations enable row level security;

revoke all privileges on table public.order_vendor_bid_request_recipient_invitations from public, anon, authenticated;
revoke all privileges on function public.tg_order_vendor_bid_invitation_guard() from public, anon, authenticated;

grant all privileges on table public.order_vendor_bid_request_recipient_invitations to service_role;
grant execute on function public.tg_order_vendor_bid_invitation_guard() to service_role;

create or replace function public.rpc_order_vendor_bid_invitation_create(
  p_recipient_id uuid,
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
  v_recipient public.order_vendor_bid_request_recipients%rowtype;
  v_request public.order_vendor_bid_requests%rowtype;
  v_order public.orders%rowtype;
  v_profile public.company_vendor_profiles%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_contact_id uuid;
  v_contact public.vendor_contacts%rowtype;
  v_sent_to_email text;
  v_expires_at timestamptz;
  v_token text;
  v_token_hash text;
  v_token_last_four text;
  v_invitation_id uuid;
  v_path text;
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
    raise exception 'bid_invitation_payload_invalid'
      using errcode = '22023';
  end if;

  select brr.*
    into v_recipient
    from public.order_vendor_bid_request_recipients brr
   where brr.id = p_recipient_id
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

  if v_recipient.status not in ('pending', 'sent', 'viewed') then
    raise exception 'bid_request_recipient_not_invitable'
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

  v_contact_id := nullif(v_payload ->> 'vendor_contact_id', '')::uuid;

  if v_contact_id is not null then
    select vc.*
      into v_contact
      from public.vendor_contacts vc
     where vc.id = v_contact_id;

    if not found or v_contact.vendor_profile_id <> v_recipient.vendor_profile_id then
      raise exception 'bid_invitation_contact_not_found_or_not_authorized'
        using errcode = '42501';
    end if;
  elsif nullif(btrim(v_payload ->> 'sent_to_email'), '') is null then
    select vc.*
      into v_contact
      from public.vendor_contacts vc
     where vc.vendor_profile_id = v_recipient.vendor_profile_id
       and nullif(btrim(vc.email), '') is not null
     order by vc.is_primary desc, vc.receives_assignment_notifications desc, vc.created_at, vc.id
     limit 1;

    if found then
      v_contact_id := v_contact.id;
    end if;
  end if;

  v_sent_to_email := lower(btrim(coalesce(
    nullif(v_payload ->> 'sent_to_email', ''),
    nullif(v_contact.email, '')
  )));

  if v_sent_to_email is null
     or v_sent_to_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'bid_invitation_email_required'
      using errcode = '22023';
  end if;

  v_expires_at := coalesce(
    nullif(v_payload ->> 'expires_at', '')::timestamptz,
    v_request.response_due_at,
    now() + interval '7 days'
  );

  if v_expires_at <= now() then
    raise exception 'bid_invitation_expiration_invalid'
      using errcode = '22023';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');
  v_token_last_four := right(v_token, 4);

  update public.order_vendor_bid_request_recipient_invitations
     set revoked_at = coalesce(revoked_at, now()),
         metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
           'revoked_by_invitation_reissue', true,
           'revoked_by_user_id', v_actor_user_id
         ),
         updated_at = now()
   where recipient_id = p_recipient_id
     and revoked_at is null
     and submitted_at is null;

  insert into public.order_vendor_bid_request_recipient_invitations (
    recipient_id,
    bid_request_id,
    order_id,
    vendor_profile_id,
    vendor_company_id,
    vendor_contact_id,
    token_hash,
    token_last_four,
    sent_to_email,
    expires_at,
    metadata,
    created_by_user_id
  ) values (
    v_recipient.id,
    v_request.id,
    v_request.order_id,
    v_recipient.vendor_profile_id,
    v_recipient.vendor_company_id,
    v_contact_id,
    v_token_hash,
    v_token_last_four,
    v_sent_to_email,
    v_expires_at,
    jsonb_strip_nulls(jsonb_build_object(
      'created_via', 'rpc_order_vendor_bid_invitation_create',
      'request_message_present', nullif(btrim(v_request.request_message), '') is not null
    )) || coalesce(v_payload -> 'metadata', '{}'::jsonb),
    v_actor_user_id
  )
  returning id into v_invitation_id;

  v_path := '/vendor/bid-invitations/' || v_token;

  return jsonb_build_object(
    'invitation_id', v_invitation_id,
    'recipient_id', v_recipient.id,
    'bid_request_id', v_request.id,
    'order_id', v_request.order_id,
    'sent_to_email', v_sent_to_email,
    'expires_at', v_expires_at,
    'token', v_token,
    'path', v_path,
    'link', v_path
  );
end;
$$;

revoke all on function public.rpc_order_vendor_bid_invitation_create(uuid, jsonb) from public, anon;
grant execute on function public.rpc_order_vendor_bid_invitation_create(uuid, jsonb) to authenticated, service_role;

comment on table public.order_vendor_bid_request_recipient_invitations is
  'AMC-7A tokenized vendor bid invitation delivery/access ledger. Bid invitations are scoped to bid request recipients and store only hashed tokens; plaintext tokens are returned once by the create RPC and are never stored.';

comment on column public.order_vendor_bid_request_recipient_invitations.recipient_id is
  'Bid recipient targeted by this invitation. Recipient lifecycle remains authoritative for procurement state; invitations only represent delivery/access records.';

comment on column public.order_vendor_bid_request_recipient_invitations.token_hash is
  'SHA-256 hash of the one-time plaintext token. Plaintext token values must never be stored.';

comment on column public.order_vendor_bid_request_recipient_invitations.token_last_four is
  'Last four hex characters of the plaintext token for coordinator audit/display only.';

comment on function public.tg_order_vendor_bid_invitation_guard() is
  'AMC-7A structural guard for tokenized bid invitation denormalized recipient/request/order/vendor/contact consistency. Does not read public tokens, submit bids, send email, create assignments, mutate orders, or add routes.';

comment on function public.rpc_order_vendor_bid_invitation_create(uuid, jsonb) is
  'AMC-7A authenticated coordinator RPC for creating tokenized vendor bid invitations. Requires bid_requests.update, current-company order read authority, amc_operations order scope, open bid request/recipient state, eligible active amc_vendor relationship, and valid recipient email. Revokes prior unsubmitted recipient invitations, stores only token hash/last-four, returns plaintext token once, and does not create public read RPCs, vendor UI, emails, assignments, order mutations, or /amc/* routes.';

commit;
