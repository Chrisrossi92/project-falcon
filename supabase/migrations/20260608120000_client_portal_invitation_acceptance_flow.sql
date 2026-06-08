begin;

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
       set status = 'expired',
           updated_at = now()
     where cpi.id = v_invitation.id
    returning * into v_invitation;
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
       set status = 'expired',
           updated_at = now()
     where cpi.id = v_invitation.id
    returning * into v_invitation;

    raise exception 'client_portal_invitation_invalid_or_expired'
      using errcode = '22023';
  end if;

  if v_auth_email = '' or v_auth_email <> v_invitation.normalized_email then
    raise exception 'client_portal_invitation_email_mismatch'
      using errcode = '42501';
  end if;

  if v_invitation.status = 'accepted' then
    return query
    select
      c.name as client_name,
      v_invitation.email,
      v_invitation.status,
      v_invitation.accepted_at
    from public.clients c
    where c.id = v_invitation.client_id
      and coalesce(c.company_id, public.default_company_id()) = v_invitation.company_id;
    return;
  end if;

  if v_invitation.status <> 'pending' then
    raise exception 'client_portal_invitation_invalid_or_expired'
      using errcode = '22023';
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

revoke all on function public.rpc_client_portal_invitation_read(text)
  from public, anon;
revoke all on function public.rpc_client_portal_invitation_accept(text)
  from public, anon;

grant execute on function public.rpc_client_portal_invitation_read(text)
  to anon, authenticated, service_role;
grant execute on function public.rpc_client_portal_invitation_accept(text)
  to authenticated, service_role;

comment on function public.rpc_client_portal_invitation_read(text) is
  'Reads safe public Client Portal invitation display metadata by raw token, including pending, expired, revoked, or accepted state. Invalid tokens still fail closed.';

comment on function public.rpc_client_portal_invitation_accept(text) is
  'Accepts or idempotently confirms a Client Portal invitation for the authenticated matching email, creates or reactivates client_portal_members, and does not create company_memberships or operational role assignments.';

commit;
