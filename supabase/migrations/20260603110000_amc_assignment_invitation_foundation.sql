begin;

create extension if not exists "pgcrypto";

create table if not exists public.order_company_assignment_invitations (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.order_company_assignments(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  owner_company_id uuid not null references public.companies(id) on delete restrict,
  assigned_company_id uuid not null references public.companies(id) on delete restrict,
  relationship_id uuid not null references public.company_relationships(id) on delete restrict,
  vendor_contact_id uuid null references public.vendor_contacts(id) on delete set null,
  token_hash text not null unique,
  token_last_four text not null,
  sent_to_email text not null,
  expires_at timestamptz not null,
  opened_at timestamptz null,
  last_opened_at timestamptz null,
  open_count integer not null default 0,
  accepted_at timestamptz null,
  declined_at timestamptz null,
  revoked_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_company_assignment_invitations_email_valid
    check (sent_to_email = lower(btrim(sent_to_email)) and sent_to_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  constraint order_company_assignment_invitations_token_last_four_valid
    check (token_last_four ~ '^[0-9a-f]{4}$'),
  constraint order_company_assignment_invitations_hash_valid
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint order_company_assignment_invitations_open_count_non_negative
    check (open_count >= 0),
  constraint order_company_assignment_invitations_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

create or replace function public.tg_order_company_assignment_invitation_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_assignment public.order_company_assignments%rowtype;
  v_order public.orders%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_contact public.vendor_contacts%rowtype;
  v_profile public.company_vendor_profiles%rowtype;
begin
  if TG_OP = 'UPDATE' then
    if NEW.assignment_id is distinct from OLD.assignment_id then
      raise exception 'order_company_assignment_invitations.assignment_id is immutable';
    end if;

    if NEW.order_id is distinct from OLD.order_id then
      raise exception 'order_company_assignment_invitations.order_id is immutable';
    end if;

    if NEW.owner_company_id is distinct from OLD.owner_company_id then
      raise exception 'order_company_assignment_invitations.owner_company_id is immutable';
    end if;

    if NEW.assigned_company_id is distinct from OLD.assigned_company_id then
      raise exception 'order_company_assignment_invitations.assigned_company_id is immutable';
    end if;

    if NEW.relationship_id is distinct from OLD.relationship_id then
      raise exception 'order_company_assignment_invitations.relationship_id is immutable';
    end if;

    if NEW.token_hash is distinct from OLD.token_hash then
      raise exception 'order_company_assignment_invitations.token_hash is immutable';
    end if;
  end if;

  NEW.sent_to_email := lower(btrim(NEW.sent_to_email));

  select *
    into v_assignment
    from public.order_company_assignments oca
   where oca.id = NEW.assignment_id;

  if not found then
    raise exception 'Assignment invitation assignment does not exist';
  end if;

  select *
    into v_order
    from public.orders o
   where o.id = v_assignment.order_id;

  if not found then
    raise exception 'Assignment invitation order does not exist';
  end if;

  select *
    into v_relationship
    from public.company_relationships cr
   where cr.id = v_assignment.relationship_id;

  if not found then
    raise exception 'Assignment invitation relationship does not exist';
  end if;

  if NEW.order_id is distinct from v_assignment.order_id then
    raise exception 'Assignment invitation order must match assignment order';
  end if;

  if NEW.owner_company_id is distinct from v_assignment.owner_company_id then
    raise exception 'Assignment invitation owner company must match assignment owner company';
  end if;

  if NEW.assigned_company_id is distinct from v_assignment.assigned_company_id then
    raise exception 'Assignment invitation assigned company must match assignment assigned company';
  end if;

  if NEW.relationship_id is distinct from v_assignment.relationship_id then
    raise exception 'Assignment invitation relationship must match assignment relationship';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) is distinct from v_assignment.owner_company_id then
    raise exception 'Assignment invitation order owner company mismatch';
  end if;

  if v_relationship.source_company_id is distinct from v_assignment.owner_company_id
     or v_relationship.target_company_id is distinct from v_assignment.assigned_company_id
     or v_relationship.relationship_type <> 'amc_vendor'
     or v_relationship.status <> 'active'
     or v_assignment.assignment_type <> 'vendor_appraisal' then
    raise exception 'Assignment invitation requires an active AMC vendor assignment relationship';
  end if;

  if NEW.vendor_contact_id is not null then
    select *
      into v_contact
      from public.vendor_contacts vc
     where vc.id = NEW.vendor_contact_id;

    if not found then
      raise exception 'Assignment invitation vendor contact does not exist';
    end if;

    select *
      into v_profile
      from public.company_vendor_profiles cvp
     where cvp.id = v_contact.vendor_profile_id;

    if not found
       or v_profile.owner_company_id is distinct from NEW.owner_company_id
       or v_profile.vendor_company_id is distinct from NEW.assigned_company_id
       or (
         v_profile.relationship_id is not null
         and v_profile.relationship_id is distinct from NEW.relationship_id
       ) then
      raise exception 'Assignment invitation vendor contact must belong to assigned vendor company';
    end if;
  end if;

  return NEW;
end;
$$;

create or replace function public.tg_order_company_assignment_invitation_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;

drop trigger if exists trg_order_company_assignment_invitation_guard on public.order_company_assignment_invitations;
create trigger trg_order_company_assignment_invitation_guard
before insert or update on public.order_company_assignment_invitations
for each row execute function public.tg_order_company_assignment_invitation_guard();

drop trigger if exists trg_order_company_assignment_invitation_touch_updated_at on public.order_company_assignment_invitations;
create trigger trg_order_company_assignment_invitation_touch_updated_at
before update on public.order_company_assignment_invitations
for each row execute function public.tg_order_company_assignment_invitation_touch_updated_at();

create index if not exists idx_order_company_assignment_invitations_assignment
  on public.order_company_assignment_invitations (assignment_id);

create index if not exists idx_order_company_assignment_invitations_order
  on public.order_company_assignment_invitations (order_id);

create index if not exists idx_order_company_assignment_invitations_owner_company
  on public.order_company_assignment_invitations (owner_company_id);

create index if not exists idx_order_company_assignment_invitations_assigned_company
  on public.order_company_assignment_invitations (assigned_company_id);

create index if not exists idx_order_company_assignment_invitations_relationship
  on public.order_company_assignment_invitations (relationship_id);

create index if not exists idx_order_company_assignment_invitations_sent_to_email
  on public.order_company_assignment_invitations (sent_to_email);

create index if not exists idx_order_company_assignment_invitations_expires_at
  on public.order_company_assignment_invitations (expires_at);

create index if not exists idx_order_company_assignment_invitations_active_assignment
  on public.order_company_assignment_invitations (assignment_id, expires_at)
  where accepted_at is null
    and declined_at is null
    and revoked_at is null;

alter table public.order_company_assignment_invitations enable row level security;

revoke all privileges on table public.order_company_assignment_invitations from public, anon, authenticated;
revoke all privileges on function public.tg_order_company_assignment_invitation_guard() from public, anon, authenticated;
revoke all privileges on function public.tg_order_company_assignment_invitation_touch_updated_at() from public, anon, authenticated;

grant all privileges on table public.order_company_assignment_invitations to service_role;
grant execute on function public.tg_order_company_assignment_invitation_guard() to service_role;
grant execute on function public.tg_order_company_assignment_invitation_touch_updated_at() to service_role;

create or replace function public.rpc_order_company_assignment_invitation_create(
  p_assignment_id uuid,
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
  v_assignment public.order_company_assignments%rowtype;
  v_order public.orders%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_profile public.company_vendor_profiles%rowtype;
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

  if not public.current_app_user_has_permission('order_company_assignments.offer') then
    raise exception 'assignment_offer_permission_required'
      using errcode = '42501';
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    raise exception 'assignment_invitation_payload_invalid'
      using errcode = '22023';
  end if;

  select *
    into v_assignment
    from public.order_company_assignments oca
   where oca.id = p_assignment_id
   for update;

  if not found then
    raise exception 'assignment_not_found_or_not_authorized'
      using errcode = '42501';
  end if;

  if v_assignment.owner_company_id <> v_company_id then
    raise exception 'assignment_owner_company_required'
      using errcode = '42501';
  end if;

  if v_assignment.assignment_type <> 'vendor_appraisal' then
    raise exception 'assignment_invitation_requires_vendor_appraisal'
      using errcode = '22023';
  end if;

  if v_assignment.status <> 'offered' then
    raise exception 'assignment_invitation_requires_offered_assignment'
      using errcode = '22023';
  end if;

  select *
    into v_order
    from public.orders o
   where o.id = v_assignment.order_id;

  if not found
     or coalesce(v_order.company_id, public.default_company_id()) <> v_company_id
     or not public.current_app_user_can_read_order(v_assignment.order_id) then
    raise exception 'assignment_order_not_found_or_not_authorized'
      using errcode = '42501';
  end if;

  if coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations' then
    raise exception 'order_scope_not_amc_operations'
      using errcode = '42501';
  end if;

  select *
    into v_relationship
    from public.company_relationships cr
   where cr.id = v_assignment.relationship_id;

  if not found
     or v_relationship.source_company_id <> v_company_id
     or v_relationship.target_company_id <> v_assignment.assigned_company_id
     or v_relationship.relationship_type <> 'amc_vendor'
     or v_relationship.status <> 'active'
     or v_assignment.assignment_type <> public.order_company_assignment_expected_type(v_relationship.relationship_type) then
    raise exception 'assignment_invitation_requires_active_amc_vendor_relationship'
      using errcode = '42501';
  end if;

  select *
    into v_profile
    from public.company_vendor_profiles cvp
   where cvp.owner_company_id = v_company_id
     and cvp.vendor_company_id = v_assignment.assigned_company_id
   order by
     case when cvp.relationship_id = v_assignment.relationship_id then 0 else 1 end,
     cvp.created_at desc
   limit 1;

  if not found
     or v_profile.vendor_status in ('inactive', 'do_not_use')
     or (
       v_profile.relationship_id is not null
       and v_profile.relationship_id <> v_assignment.relationship_id
     ) then
    raise exception 'assignment_invitation_vendor_profile_not_found_or_ineligible'
      using errcode = '42501';
  end if;

  v_contact_id := nullif(btrim(v_payload ->> 'vendor_contact_id'), '')::uuid;

  if v_contact_id is not null then
    select *
      into v_contact
      from public.vendor_contacts vc
     where vc.id = v_contact_id;

    if not found or v_contact.vendor_profile_id <> v_profile.id then
      raise exception 'assignment_invitation_vendor_contact_not_found_or_not_authorized'
        using errcode = '42501';
    end if;
  end if;

  v_sent_to_email := lower(nullif(btrim(v_payload ->> 'sent_to_email'), ''));

  if v_sent_to_email is null and v_contact_id is not null then
    v_sent_to_email := lower(nullif(btrim(v_contact.email), ''));
  end if;

  if v_sent_to_email is null then
    select *
      into v_contact
      from public.vendor_contacts vc
     where vc.vendor_profile_id = v_profile.id
       and nullif(btrim(vc.email), '') is not null
     order by
       vc.receives_assignment_notifications desc,
       vc.is_primary desc,
       vc.created_at asc
     limit 1;

    if found then
      v_contact_id := v_contact.id;
      v_sent_to_email := lower(nullif(btrim(v_contact.email), ''));
    end if;
  end if;

  if v_sent_to_email is null
     or v_sent_to_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'assignment_invitation_email_required'
      using errcode = '22023';
  end if;

  v_expires_at := coalesce(
    nullif(v_payload ->> 'expires_at', '')::timestamptz,
    v_assignment.expires_at,
    now() + interval '7 days'
  );

  if v_expires_at <= now() then
    raise exception 'assignment_invitation_expiration_must_be_future'
      using errcode = '22023';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');
  v_token_last_four := right(v_token, 4);
  v_path := '/vendor/assignment-offers/' || v_token;

  update public.order_company_assignment_invitations
     set revoked_at = now(),
         updated_at = now(),
         metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
           'revoked_reason', 'superseded_by_new_assignment_invitation'
         )
   where assignment_id = v_assignment.id
     and accepted_at is null
     and declined_at is null
     and revoked_at is null;

  insert into public.order_company_assignment_invitations (
    assignment_id,
    order_id,
    owner_company_id,
    assigned_company_id,
    relationship_id,
    vendor_contact_id,
    token_hash,
    token_last_four,
    sent_to_email,
    expires_at,
    metadata,
    created_by_user_id
  ) values (
    v_assignment.id,
    v_assignment.order_id,
    v_assignment.owner_company_id,
    v_assignment.assigned_company_id,
    v_assignment.relationship_id,
    v_contact_id,
    v_token_hash,
    v_token_last_four,
    v_sent_to_email,
    v_expires_at,
    coalesce(v_payload -> 'metadata', '{}'::jsonb),
    v_actor_user_id
  )
  returning id into v_invitation_id;

  return jsonb_build_object(
    'invitation_id', v_invitation_id,
    'assignment_id', v_assignment.id,
    'order_id', v_assignment.order_id,
    'sent_to_email', v_sent_to_email,
    'expires_at', v_expires_at,
    'token', v_token,
    'path', v_path,
    'link', v_path
  );
end;
$$;

revoke all on function public.rpc_order_company_assignment_invitation_create(uuid, jsonb) from public, anon;
grant execute on function public.rpc_order_company_assignment_invitation_create(uuid, jsonb) to authenticated, service_role;

comment on table public.order_company_assignment_invitations is
  'AMC-8A.1 assignment-offer invitation delivery/access records for tokenized vendor accept/decline. The assignment packet remains the canonical lifecycle record. Plaintext tokens are returned once by RPC and never stored.';

comment on column public.order_company_assignment_invitations.token_hash is
  'SHA-256 hash of the one-time plaintext invitation token. The plaintext token is never stored.';

comment on column public.order_company_assignment_invitations.token_last_four is
  'Last four hex characters of the plaintext token for coordinator diagnostics without storing the token.';

comment on function public.rpc_order_company_assignment_invitation_create(uuid, jsonb) is
  'AMC-8A.1 authenticated owner/coordinator RPC that creates an assignment-offer invitation token for an offered AMC vendor_appraisal assignment. It validates owner company, AMC order scope, active amc_vendor relationship, vendor profile/contact email, revokes prior active invitations for the same assignment, returns plaintext token once, and does not mutate assignment lifecycle status, orders, email, notifications, or public read/respond behavior. No public assignment offer page yet.';

commit;
