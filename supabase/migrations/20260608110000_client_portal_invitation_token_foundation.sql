begin;

insert into public.permissions (key, category, label, description)
values (
  'client_portal.members.invite',
  'client_portal',
  'Invite Client Portal members',
  'Allows staff to create expiring Client Portal invitations for client contacts without granting Internal or AMC workspace access.'
)
on conflict (key) do update
   set category = excluded.category,
       label = excluded.label,
       description = excluded.description;

create table if not exists public.client_portal_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id bigint not null references public.clients(id) on delete cascade,
  client_contact_id bigint null references public.client_contacts(id) on delete set null,
  email text not null,
  normalized_email text not null,
  token_hash text not null unique,
  token_last_four text not null,
  status text not null default 'pending',
  expires_at timestamptz not null,
  invited_by_user_id uuid null references public.users(id) on delete set null,
  accepted_by_user_id uuid null references public.users(id) on delete set null,
  accepted_at timestamptz null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint client_portal_invitations_status_check check (
    status = any (array['pending', 'accepted', 'revoked', 'expired'])
  ),
  constraint client_portal_invitations_email_check check (btrim(normalized_email) <> ''),
  constraint client_portal_invitations_token_hash_valid check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint client_portal_invitations_token_last_four_valid check (token_last_four ~ '^[0-9a-f]{4}$')
);

create unique index if not exists client_portal_invitations_pending_unique
  on public.client_portal_invitations (company_id, client_id, normalized_email)
  where status = 'pending';

create index if not exists idx_client_portal_invitations_company_client_status
  on public.client_portal_invitations (company_id, client_id, status, created_at desc);

create index if not exists idx_client_portal_invitations_normalized_email_status
  on public.client_portal_invitations (normalized_email, status, expires_at);

alter table public.client_portal_invitations enable row level security;

revoke all on table public.client_portal_invitations from public, anon, authenticated;
grant all on table public.client_portal_invitations to service_role;

create or replace function public.tg_client_portal_invitations_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_client_portal_invitations_touch_updated_at
  on public.client_portal_invitations;
create trigger trg_client_portal_invitations_touch_updated_at
before update on public.client_portal_invitations
for each row execute function public.tg_client_portal_invitations_touch_updated_at();

create or replace function public.tg_client_portal_invitations_guard_token_hash()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.token_hash is distinct from old.token_hash then
    raise exception 'client_portal_invitations.token_hash is immutable'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_client_portal_invitations_guard_token_hash
  on public.client_portal_invitations;
create trigger trg_client_portal_invitations_guard_token_hash
before update on public.client_portal_invitations
for each row execute function public.tg_client_portal_invitations_guard_token_hash();

create or replace function public.rpc_client_portal_invitation_create(
  p_client_id bigint,
  p_client_contact_id bigint default null,
  p_email text default null
)
returns table (
  invitation_id uuid,
  client_id bigint,
  client_name text,
  client_contact_id bigint,
  contact_name text,
  email text,
  status text,
  expires_at timestamptz,
  token_last_four text,
  invitation_token text,
  invitation_path text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_client record;
  v_contact record;
  v_contact_name text := null;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_token text;
  v_token_hash text;
  v_token_last_four text;
  v_invitation_id uuid;
  v_expires_at timestamptz := now() + interval '14 days';
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null or not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('client_portal.members.invite') then
    raise exception 'client_portal_member_invite_permission_required'
      using errcode = '42501';
  end if;

  select
    c.id,
    c.name,
    coalesce(c.company_id, public.default_company_id()) as company_id,
    coalesce(nullif(c.status, ''), 'active') as status
    into v_client
    from public.clients c
   where c.id = p_client_id;

  if not found
     or v_client.company_id <> v_company_id
     or lower(coalesce(v_client.status, 'active')) <> 'active' then
    raise exception 'client_not_found'
      using errcode = 'P0002';
  end if;

  if not public.current_app_user_can_update_client_row(v_company_id, p_client_id) then
    raise exception 'client_portal_member_invite_client_update_required'
      using errcode = '42501';
  end if;

  if p_client_contact_id is not null then
    select
      cc.id,
      cc.name,
      cc.email,
      cc.status
      into v_contact
      from public.client_contacts cc
     where cc.id = p_client_contact_id
       and cc.company_id = v_company_id
       and cc.client_id = p_client_id;

    if not found or coalesce(v_contact.status, 'active') <> 'active' then
      raise exception 'client_contact_not_found'
        using errcode = 'P0002';
    end if;

    if v_email = '' then
      v_email := lower(btrim(coalesce(v_contact.email, '')));
    elsif nullif(lower(btrim(coalesce(v_contact.email, ''))), '') is not null
       and v_email <> lower(btrim(coalesce(v_contact.email, ''))) then
      raise exception 'client_portal_invitation_contact_email_mismatch'
        using errcode = '22023';
    end if;

    v_contact_name := nullif(v_contact.name, '');
  end if;

  if v_email = '' then
    raise exception 'client_portal_invitation_email_required'
      using errcode = '22023';
  end if;

  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'client_portal_invitation_email_invalid'
      using errcode = '22023';
  end if;

  if exists (
    select 1
      from public.client_portal_members cpm
      join public.users u
        on u.id = cpm.user_id
     where cpm.company_id = v_company_id
       and cpm.client_id = p_client_id
       and cpm.status = 'active'
       and lower(btrim(coalesce(u.email, ''))) = v_email
  ) then
    raise exception 'client_portal_member_already_exists'
      using errcode = '23505';
  end if;

  if exists (
    select 1
      from public.client_portal_invitations cpi
     where cpi.company_id = v_company_id
       and cpi.client_id = p_client_id
       and cpi.normalized_email = v_email
       and cpi.status = 'pending'
       and cpi.expires_at > now()
  ) then
    raise exception 'client_portal_invitation_already_pending'
      using errcode = '23505';
  end if;

  update public.client_portal_invitations cpi
     set status = 'expired'
   where cpi.company_id = v_company_id
     and cpi.client_id = p_client_id
     and cpi.normalized_email = v_email
     and cpi.status = 'pending'
     and cpi.expires_at <= now();

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');
  v_token_last_four := right(v_token, 4);

  insert into public.client_portal_invitations (
    company_id,
    client_id,
    client_contact_id,
    email,
    normalized_email,
    token_hash,
    token_last_four,
    status,
    expires_at,
    invited_by_user_id
  )
  values (
    v_company_id,
    p_client_id,
    p_client_contact_id,
    v_email,
    v_email,
    v_token_hash,
    v_token_last_four,
    'pending',
    v_expires_at,
    v_actor_user_id
  )
  returning id into v_invitation_id;

  return query
  select
    v_invitation_id,
    v_client.id,
    v_client.name,
    p_client_contact_id,
    v_contact_name,
    v_email,
    'pending'::text,
    v_expires_at,
    v_token_last_four,
    v_token,
    '/client-portal/invitations/' || v_token;
end;
$$;

create or replace function public.rpc_client_portal_invitation_read(p_token text)
returns table (
  client_name text,
  company_name text,
  contact_name text,
  email text,
  status text,
  expires_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_token text := lower(btrim(coalesce(p_token, '')));
  v_token_hash text;
  v_invitation public.client_portal_invitations%rowtype;
begin
  if v_token !~ '^[0-9a-f]{64}$' then
    raise exception 'client_portal_invitation_invalid_or_expired'
      using errcode = '22023';
  end if;

  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  select *
    into v_invitation
    from public.client_portal_invitations cpi
   where cpi.token_hash = v_token_hash
   limit 1;

  if not found then
    raise exception 'client_portal_invitation_invalid_or_expired'
      using errcode = 'P0002';
  end if;

  if v_invitation.status = 'pending' and v_invitation.expires_at <= now() then
    update public.client_portal_invitations cpi
       set status = 'expired'
     where cpi.id = v_invitation.id;

    raise exception 'client_portal_invitation_invalid_or_expired'
      using errcode = '22023';
  end if;

  if v_invitation.status <> 'pending' then
    raise exception 'client_portal_invitation_invalid_or_expired'
      using errcode = '22023';
  end if;

  return query
  select
    c.name as client_name,
    coalesce(co.name, 'Falcon') as company_name,
    cc.name as contact_name,
    v_invitation.email,
    v_invitation.status,
    v_invitation.expires_at
  from public.client_portal_invitations cpi
  join public.clients c
    on c.id = cpi.client_id
   and coalesce(c.company_id, public.default_company_id()) = cpi.company_id
  left join public.companies co
    on co.id = cpi.company_id
  left join public.client_contacts cc
    on cc.id = cpi.client_contact_id
   and cc.company_id = cpi.company_id
   and cc.client_id = cpi.client_id
  where cpi.id = v_invitation.id;
end;
$$;

create or replace function public.rpc_client_portal_invitation_accept(p_token text)
returns table (
  client_name text,
  email text,
  status text,
  accepted_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_token text := lower(btrim(coalesce(p_token, '')));
  v_token_hash text;
  v_auth_user_id uuid := auth.uid();
  v_auth_email text := '';
  v_claims jsonb := '{}'::jsonb;
  v_invitation public.client_portal_invitations%rowtype;
  v_user_id uuid;
  v_member_id uuid;
begin
  if v_auth_user_id is null then
    raise exception 'authentication_required'
      using errcode = '42501';
  end if;

  if v_token !~ '^[0-9a-f]{64}$' then
    raise exception 'client_portal_invitation_invalid_or_expired'
      using errcode = '22023';
  end if;

  begin
    v_claims := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
  exception
    when others then
      v_claims := '{}'::jsonb;
  end;

  v_auth_email := lower(btrim(coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    nullif(v_claims->>'email', ''),
    ''
  )));

  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  select *
    into v_invitation
    from public.client_portal_invitations cpi
   where cpi.token_hash = v_token_hash
   for update;

  if not found then
    raise exception 'client_portal_invitation_invalid_or_expired'
      using errcode = 'P0002';
  end if;

  if v_invitation.status = 'pending' and v_invitation.expires_at <= now() then
    update public.client_portal_invitations cpi
       set status = 'expired'
     where cpi.id = v_invitation.id;

    raise exception 'client_portal_invitation_invalid_or_expired'
      using errcode = '22023';
  end if;

  if v_invitation.status <> 'pending' then
    raise exception 'client_portal_invitation_invalid_or_expired'
      using errcode = '22023';
  end if;

  if v_auth_email = '' or v_auth_email <> v_invitation.normalized_email then
    raise exception 'client_portal_invitation_email_mismatch'
      using errcode = '42501';
  end if;

  select u.id
    into v_user_id
    from public.users u
   where u.auth_id = v_auth_user_id
   limit 1;

  if v_user_id is null then
    select u.id
      into v_user_id
      from public.users u
     where lower(btrim(coalesce(u.email, ''))) = v_invitation.normalized_email
     order by u.auth_id is null desc, u.created_at
     limit 1;
  end if;

  if v_user_id is null then
    insert into public.users (
      name,
      email,
      role,
      auth_id,
      status,
      is_active,
      created_at,
      updated_at
    )
    values (
      split_part(v_invitation.normalized_email, '@', 1),
      v_invitation.normalized_email,
      'appraiser',
      v_auth_user_id,
      'active',
      true,
      now(),
      now()
    )
    returning id into v_user_id;
  else
    update public.users u
       set auth_id = coalesce(u.auth_id, v_auth_user_id),
           email = coalesce(nullif(u.email, ''), v_invitation.normalized_email),
           status = coalesce(nullif(u.status, ''), 'active'),
           is_active = true,
           updated_at = now()
     where u.id = v_user_id
       and (u.auth_id is null or u.auth_id = v_auth_user_id)
    returning u.id into v_user_id;

    if v_user_id is null then
      raise exception 'client_portal_invitation_user_conflict'
        using errcode = '42501';
    end if;
  end if;

  insert into public.client_portal_members (
    company_id,
    client_id,
    user_id,
    status,
    created_at,
    updated_at
  )
  values (
    v_invitation.company_id,
    v_invitation.client_id,
    v_user_id,
    'active',
    now(),
    now()
  )
  on conflict (company_id, client_id, user_id) do update
    set status = 'active',
        updated_at = now()
  returning id into v_member_id;

  update public.client_portal_invitations cpi
     set status = 'accepted',
         accepted_by_user_id = v_user_id,
         accepted_at = now(),
         updated_at = now(),
         metadata = cpi.metadata || jsonb_build_object('client_portal_member_id', v_member_id)
   where cpi.id = v_invitation.id
  returning * into v_invitation;

  return query
  select
    c.name as client_name,
    v_invitation.email,
    v_invitation.status,
    v_invitation.accepted_at
  from public.clients c
  where c.id = v_invitation.client_id
    and coalesce(c.company_id, public.default_company_id()) = v_invitation.company_id;
end;
$$;

revoke all on function public.rpc_client_portal_invitation_create(bigint, bigint, text)
  from public, anon;
revoke all on function public.rpc_client_portal_invitation_read(text)
  from public, anon;
revoke all on function public.rpc_client_portal_invitation_accept(text)
  from public, anon;

grant execute on function public.rpc_client_portal_invitation_create(bigint, bigint, text)
  to authenticated, service_role;
grant execute on function public.rpc_client_portal_invitation_read(text)
  to anon, authenticated, service_role;
grant execute on function public.rpc_client_portal_invitation_accept(text)
  to authenticated, service_role;

comment on table public.client_portal_invitations is
  'AMC-19 Client Portal invite tokens. Stores only token hashes and scopes invite acceptance to a company/client/contact/email without granting Internal or AMC company membership.';

comment on function public.rpc_client_portal_invitation_create(bigint, bigint, text) is
  'Creates a one-time Client Portal invitation token for staff-managed client contacts. Requires client_portal.members.invite and client update authority. Returns the raw token only at creation time.';

comment on function public.rpc_client_portal_invitation_read(text) is
  'Reads safe public Client Portal invitation display metadata by raw token. Fails closed for invalid, expired, revoked, or accepted invites.';

comment on function public.rpc_client_portal_invitation_accept(text) is
  'Accepts a Client Portal invitation for the authenticated matching email, creates or reactivates client_portal_members, and does not create company_memberships or operational role assignments.';

commit;
