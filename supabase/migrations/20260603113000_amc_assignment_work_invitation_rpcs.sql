begin;

create extension if not exists "pgcrypto";

create table if not exists public.order_company_assignment_work_invitations (
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
  started_at timestamptz null,
  submitted_at timestamptz null,
  revoked_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_company_assignment_work_invitations_email_valid
    check (sent_to_email = lower(btrim(sent_to_email)) and sent_to_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  constraint order_company_assignment_work_invitations_token_last_four_valid
    check (token_last_four ~ '^[0-9a-f]{4}$'),
  constraint order_company_assignment_work_invitations_hash_valid
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint order_company_assignment_work_invitations_open_count_non_negative
    check (open_count >= 0),
  constraint order_company_assignment_work_invitations_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

create or replace function public.tg_order_company_assignment_work_invitation_guard()
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
      raise exception 'order_company_assignment_work_invitations.assignment_id is immutable';
    end if;

    if NEW.order_id is distinct from OLD.order_id then
      raise exception 'order_company_assignment_work_invitations.order_id is immutable';
    end if;

    if NEW.owner_company_id is distinct from OLD.owner_company_id then
      raise exception 'order_company_assignment_work_invitations.owner_company_id is immutable';
    end if;

    if NEW.assigned_company_id is distinct from OLD.assigned_company_id then
      raise exception 'order_company_assignment_work_invitations.assigned_company_id is immutable';
    end if;

    if NEW.relationship_id is distinct from OLD.relationship_id then
      raise exception 'order_company_assignment_work_invitations.relationship_id is immutable';
    end if;

    if NEW.token_hash is distinct from OLD.token_hash then
      raise exception 'order_company_assignment_work_invitations.token_hash is immutable';
    end if;
  end if;

  NEW.sent_to_email := lower(btrim(NEW.sent_to_email));

  select *
    into v_assignment
    from public.order_company_assignments oca
   where oca.id = NEW.assignment_id;

  if not found then
    raise exception 'Assignment work invitation assignment does not exist';
  end if;

  select *
    into v_order
    from public.orders o
   where o.id = v_assignment.order_id;

  if not found then
    raise exception 'Assignment work invitation order does not exist';
  end if;

  select *
    into v_relationship
    from public.company_relationships cr
   where cr.id = v_assignment.relationship_id;

  if not found then
    raise exception 'Assignment work invitation relationship does not exist';
  end if;

  if NEW.order_id is distinct from v_assignment.order_id then
    raise exception 'Assignment work invitation order must match assignment order';
  end if;

  if NEW.owner_company_id is distinct from v_assignment.owner_company_id then
    raise exception 'Assignment work invitation owner company must match assignment owner company';
  end if;

  if NEW.assigned_company_id is distinct from v_assignment.assigned_company_id then
    raise exception 'Assignment work invitation assigned company must match assignment assigned company';
  end if;

  if NEW.relationship_id is distinct from v_assignment.relationship_id then
    raise exception 'Assignment work invitation relationship must match assignment relationship';
  end if;

  if coalesce(v_order.company_id, public.default_company_id()) is distinct from v_assignment.owner_company_id then
    raise exception 'Assignment work invitation order owner company mismatch';
  end if;

  if coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations'
     or v_relationship.source_company_id is distinct from v_assignment.owner_company_id
     or v_relationship.target_company_id is distinct from v_assignment.assigned_company_id
     or v_relationship.relationship_type <> 'amc_vendor'
     or v_relationship.status <> 'active'
     or v_assignment.assignment_type <> 'vendor_appraisal' then
    raise exception 'Assignment work invitation requires an active AMC vendor assignment relationship';
  end if;

  if NEW.vendor_contact_id is not null then
    select *
      into v_contact
      from public.vendor_contacts vc
     where vc.id = NEW.vendor_contact_id;

    if not found then
      raise exception 'Assignment work invitation vendor contact does not exist';
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
      raise exception 'Assignment work invitation vendor contact must belong to assigned vendor company';
    end if;
  end if;

  return NEW;
end;
$$;

create or replace function public.tg_order_company_assignment_work_invitation_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;

drop trigger if exists trg_order_company_assignment_work_invitation_guard on public.order_company_assignment_work_invitations;
create trigger trg_order_company_assignment_work_invitation_guard
before insert or update on public.order_company_assignment_work_invitations
for each row execute function public.tg_order_company_assignment_work_invitation_guard();

drop trigger if exists trg_order_company_assignment_work_invitation_touch_updated_at on public.order_company_assignment_work_invitations;
create trigger trg_order_company_assignment_work_invitation_touch_updated_at
before update on public.order_company_assignment_work_invitations
for each row execute function public.tg_order_company_assignment_work_invitation_touch_updated_at();

create index if not exists idx_order_company_assignment_work_invitations_assignment
  on public.order_company_assignment_work_invitations (assignment_id);

create index if not exists idx_order_company_assignment_work_invitations_order
  on public.order_company_assignment_work_invitations (order_id);

create index if not exists idx_order_company_assignment_work_invitations_owner_company
  on public.order_company_assignment_work_invitations (owner_company_id);

create index if not exists idx_order_company_assignment_work_invitations_assigned_company
  on public.order_company_assignment_work_invitations (assigned_company_id);

create index if not exists idx_order_company_assignment_work_invitations_relationship
  on public.order_company_assignment_work_invitations (relationship_id);

create index if not exists idx_order_company_assignment_work_invitations_sent_to_email
  on public.order_company_assignment_work_invitations (sent_to_email);

create index if not exists idx_order_company_assignment_work_invitations_expires_at
  on public.order_company_assignment_work_invitations (expires_at);

create index if not exists idx_order_company_assignment_work_invitations_active_assignment
  on public.order_company_assignment_work_invitations (assignment_id, expires_at)
  where submitted_at is null
    and revoked_at is null;

alter table public.order_company_assignment_work_invitations enable row level security;

create or replace function public.rpc_order_company_assignment_work_invitation_create(
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
    raise exception 'assignment_work_invitation_permission_required'
      using errcode = '42501';
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    raise exception 'assignment_work_invitation_payload_invalid'
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
    raise exception 'assignment_work_invitation_requires_vendor_appraisal'
      using errcode = '22023';
  end if;

  if v_assignment.status not in ('accepted', 'in_progress') then
    raise exception 'assignment_work_invitation_requires_active_assignment'
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
    raise exception 'assignment_work_invitation_requires_active_amc_vendor_relationship'
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
    raise exception 'assignment_work_invitation_vendor_profile_not_found_or_ineligible'
      using errcode = '42501';
  end if;

  v_contact_id := nullif(btrim(v_payload ->> 'vendor_contact_id'), '')::uuid;

  if v_contact_id is not null then
    select *
      into v_contact
      from public.vendor_contacts vc
     where vc.id = v_contact_id;

    if not found or v_contact.vendor_profile_id <> v_profile.id then
      raise exception 'assignment_work_invitation_vendor_contact_not_found_or_not_authorized'
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
    raise exception 'assignment_work_invitation_email_required'
      using errcode = '22023';
  end if;

  v_expires_at := coalesce(
    nullif(v_payload ->> 'expires_at', '')::timestamptz,
    case when v_assignment.due_at is not null and v_assignment.due_at > now() then v_assignment.due_at + interval '7 days' else null end,
    now() + interval '14 days'
  );

  if v_expires_at <= now() then
    raise exception 'assignment_work_invitation_expiration_must_be_future'
      using errcode = '22023';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');
  v_token_last_four := right(v_token, 4);
  v_path := '/vendor/assignment-work/' || v_token;

  update public.order_company_assignment_work_invitations
     set revoked_at = now(),
         updated_at = now(),
         metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
           'revoked_reason', 'superseded_by_new_assignment_work_invitation'
         )
   where assignment_id = v_assignment.id
     and submitted_at is null
     and revoked_at is null;

  insert into public.order_company_assignment_work_invitations (
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
    jsonb_strip_nulls(jsonb_build_object(
      'created_via', 'assignment_work_invitation_create',
      'source_assignment_status', v_assignment.status
    )),
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

create or replace function public.rpc_order_company_assignment_work_invitation_read(
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
    'error', 'assignment_work_invitation_invalid_or_expired'
  );
  v_token text := lower(btrim(coalesce(p_token, '')));
  v_token_hash text;
  v_invitation public.order_company_assignment_work_invitations%rowtype;
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
    from public.order_company_assignment_work_invitations inv
   where inv.token_hash = v_token_hash
   for update;

  if not found
     or v_invitation.revoked_at is not null
     or v_invitation.expires_at <= now() then
    return v_failure;
  end if;

  select oca.*
    into v_assignment
    from public.order_company_assignments oca
   where oca.id = v_invitation.assignment_id;

  if not found
     or v_assignment.status not in ('accepted', 'in_progress', 'submitted', 'completed')
     or v_assignment.assignment_type <> 'vendor_appraisal'
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

  update public.order_company_assignment_work_invitations inv
     set opened_at = coalesce(inv.opened_at, now()),
         last_opened_at = now(),
         open_count = inv.open_count + 1,
         updated_at = now()
   where inv.id = v_invitation.id
   returning inv.* into v_invitation;

  return jsonb_build_object(
    'ok', true,
    'access_mode', 'assignment_work_token',
    'invitation', jsonb_build_object(
      'status', v_assignment.status,
      'expires_at', v_invitation.expires_at,
      'sent_to_email', v_invitation.sent_to_email,
      'can_start_work', v_assignment.status = 'accepted',
      'can_submit_report', v_assignment.status in ('accepted', 'in_progress')
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
      'status', v_assignment.status,
      'accepted_at', v_assignment.accepted_at,
      'started_at', v_assignment.started_at,
      'submitted_at', v_assignment.submitted_at,
      'completed_at', v_assignment.completed_at,
      'due_at', v_assignment.due_at,
      'review_due_at', v_assignment.review_due_at,
      'instructions', v_assignment.instructions,
      'fee_amount', coalesce(v_assignment.terms -> 'fee_amount', v_assignment.handoff_payload #> '{selected_bid_snapshot,fee_amount}'),
      'currency', coalesce(v_assignment.terms ->> 'currency', v_assignment.handoff_payload #>> '{selected_bid_snapshot,currency}'),
      'turn_time_days', coalesce(v_assignment.terms -> 'turn_time_days', v_assignment.handoff_payload #> '{selected_bid_snapshot,turn_time_days}'),
      'comments', v_assignment.handoff_payload #>> '{selected_bid_snapshot,comments}'
    )
  );
end;
$$;

create or replace function public.rpc_order_company_assignment_work_invitation_respond(
  p_token text,
  p_action text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_failure constant jsonb := jsonb_build_object(
    'ok', false,
    'error', 'assignment_work_invitation_invalid_or_expired'
  );
  v_token text := lower(btrim(coalesce(p_token, '')));
  v_token_hash text;
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_invitation public.order_company_assignment_work_invitations%rowtype;
  v_assignment public.order_company_assignments%rowtype;
  v_order public.orders%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_profile public.company_vendor_profiles%rowtype;
  v_contact public.vendor_contacts%rowtype;
  v_responded_at timestamptz := now();
  v_submission_payload jsonb := '{}'::jsonb;
  v_activity_payload jsonb := '{}'::jsonb;
begin
  if v_token !~ '^[0-9a-f]{64}$' then
    return v_failure;
  end if;

  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  select inv.*
    into v_invitation
    from public.order_company_assignment_work_invitations inv
   where inv.token_hash = v_token_hash
   for update;

  if not found
     or v_invitation.revoked_at is not null
     or v_invitation.expires_at <= now() then
    return v_failure;
  end if;

  select oca.*
    into v_assignment
    from public.order_company_assignments oca
   where oca.id = v_invitation.assignment_id
   for update;

  if not found
     or v_assignment.status not in ('accepted', 'in_progress')
     or v_assignment.assignment_type <> 'vendor_appraisal'
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

  if jsonb_typeof(v_payload) <> 'object' then
    return jsonb_build_object(
      'ok', false,
      'error', 'assignment_work_response_invalid',
      'field_errors', jsonb_build_object(
        'payload', 'Assignment work response payload must be an object.'
      )
    );
  end if;

  if v_action not in ('start_work', 'submit_report') then
    return jsonb_build_object(
      'ok', false,
      'error', 'assignment_work_response_invalid',
      'field_errors', jsonb_build_object(
        'action', 'Choose start work or submit report.'
      )
    );
  end if;

  if v_action = 'start_work' then
    if v_assignment.status <> 'accepted' then
      return jsonb_build_object(
        'ok', false,
        'error', 'assignment_work_response_invalid',
        'field_errors', jsonb_build_object(
          'action', 'Only accepted assignments can be started.'
        )
      );
    end if;

    update public.order_company_assignments
       set status = 'in_progress',
           started_at = coalesce(started_at, v_responded_at)
     where id = v_assignment.id;

    update public.order_company_assignment_work_invitations
       set started_at = coalesce(started_at, v_responded_at),
           updated_at = now(),
           metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
             'last_response_via', 'token_assignment_work_invitation',
             'token_last_four', v_invitation.token_last_four
           )
     where id = v_invitation.id;

    v_activity_payload := jsonb_build_object(
      'responded_via', 'token_assignment_work_invitation',
      'invitation_token_last_four', v_invitation.token_last_four
    );

    perform public.log_order_company_assignment_event(
      v_assignment.id,
      'assignment.started',
      null,
      v_assignment.assigned_company_id,
      'Assignment started',
      v_activity_payload
    );
    perform public.notify_order_company_assignment_event(
      v_assignment.id,
      'assignment.started',
      null,
      v_assignment.assigned_company_id,
      v_activity_payload
    );

    return jsonb_build_object(
      'ok', true,
      'status', 'in_progress',
      'message', 'Work started.'
    );
  end if;

  v_submission_payload := jsonb_strip_nulls(jsonb_build_object(
    'note', nullif(btrim(v_payload ->> 'note'), ''),
    'submitted_via', 'token_assignment_work_invitation',
    'token_last_four', v_invitation.token_last_four
  ));

  update public.order_company_assignments
     set status = 'submitted',
         submitted_at = v_responded_at,
         submission_payload = v_submission_payload
   where id = v_assignment.id;

  update public.order_company_assignment_work_invitations
     set submitted_at = v_responded_at,
         updated_at = now(),
         metadata = coalesce(metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
           'last_response_via', 'token_assignment_work_invitation',
           'token_last_four', v_invitation.token_last_four,
           'submitted_at', v_responded_at
         ))
   where id = v_invitation.id;

  v_activity_payload := jsonb_build_object(
    'responded_via', 'token_assignment_work_invitation',
    'invitation_token_last_four', v_invitation.token_last_four
  );

  perform public.log_order_company_assignment_event(
    v_assignment.id,
    'assignment.submitted',
    null,
    v_assignment.assigned_company_id,
    'Assignment submitted',
    v_activity_payload
  );
  perform public.notify_order_company_assignment_event(
    v_assignment.id,
    'assignment.submitted',
    null,
    v_assignment.assigned_company_id,
    v_activity_payload
  );

  return jsonb_build_object(
    'ok', true,
    'status', 'submitted',
    'message', 'Report submitted.'
  );
end;
$$;

revoke all privileges on table public.order_company_assignment_work_invitations from public, anon, authenticated;
revoke all privileges on table public.order_company_assignments from public, anon, authenticated;
revoke all privileges on function public.tg_order_company_assignment_work_invitation_guard() from public, anon, authenticated;
revoke all privileges on function public.tg_order_company_assignment_work_invitation_touch_updated_at() from public, anon, authenticated;
revoke all on function public.rpc_order_company_assignment_work_invitation_create(uuid, jsonb) from public, anon;
revoke all on function public.rpc_order_company_assignment_work_invitation_read(text) from public;
revoke all on function public.rpc_order_company_assignment_work_invitation_respond(text, text, jsonb) from public;

grant all privileges on table public.order_company_assignment_work_invitations to service_role;
grant execute on function public.tg_order_company_assignment_work_invitation_guard() to service_role;
grant execute on function public.tg_order_company_assignment_work_invitation_touch_updated_at() to service_role;
grant execute on function public.rpc_order_company_assignment_work_invitation_create(uuid, jsonb) to authenticated, service_role;
grant execute on function public.rpc_order_company_assignment_work_invitation_read(text) to anon, authenticated, service_role;
grant execute on function public.rpc_order_company_assignment_work_invitation_respond(text, text, jsonb) to anon, authenticated, service_role;

comment on table public.order_company_assignment_work_invitations is
  'AMC-8B.1 tokenized public work-access records for accepted AMC vendor_appraisal assignments. Work invitations are separate from one-time offer invitations and do not replace the canonical order_company_assignments lifecycle.';

comment on function public.rpc_order_company_assignment_work_invitation_create(uuid, jsonb) is
  'AMC-8B.1 owner/coordinator RPC for generating a separate public work link after a vendor_appraisal assignment is accepted or in progress. Returns plaintext token only once, revokes prior active work invitations for the assignment, and does not mutate assignment status, order lifecycle, email, or offer invitation behavior.';

comment on function public.rpc_order_company_assignment_work_invitation_read(text) is
  'AMC-8B.1 public/token work read RPC. Validates a hashed work invitation token, active AMC vendor_appraisal assignment relationship, and returns allowlisted work packet fields for accepted, in-progress, submitted, or completed assignment states. Does not expose raw terms, handoff payload, internal ids, order lifecycle mutation, or email behavior.';

comment on function public.rpc_order_company_assignment_work_invitation_respond(text, text, jsonb) is
  'AMC-8B.1 public/token work respond RPC. Allows start_work and submit_report for accepted/in-progress vendor_appraisal assignments through a separate work token, reuses assignment.started and assignment.submitted activity/notification helpers, and does not mutate orders, add appraisal-specific statuses, create vendor login behavior, or change offer token behavior.';

commit;
