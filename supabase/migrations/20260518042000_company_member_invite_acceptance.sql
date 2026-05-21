begin;

create or replace function public.rpc_company_member_invite_accept(
  p_invitation_id uuid,
  p_request_id text default null
)
returns table (
  invitation_id uuid,
  company_id uuid,
  company_slug text,
  company_name text,
  invite_email text,
  invitation_status text,
  membership_id uuid,
  user_id uuid,
  accepted_at timestamptz,
  active_company_context_valid boolean,
  session_refresh_required boolean
)
language plpgsql
volatile
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_actor_auth_id uuid := auth.uid();
  v_auth_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_invitation public.company_member_invitations%rowtype;
  v_company_slug text;
  v_company_name text;
  v_company_status text;
  v_membership public.company_memberships%rowtype;
  v_role_count integer;
  v_valid_role_count integer;
  v_updated_role_count integer;
  v_accepted_at timestamptz := now();
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  select *
    into v_invitation
    from public.company_member_invitations cmi
   where cmi.id = p_invitation_id
   for update;

  if v_invitation.id is null then
    raise exception 'invitation_not_found'
      using errcode = '22023';
  end if;

  if v_invitation.status <> 'sent' then
    raise exception 'invitation_not_sent'
      using errcode = '22023';
  end if;

  if v_invitation.expires_at <= now() then
    update public.company_member_invitations cmi
       set status = 'expired',
           updated_at = now()
     where cmi.id = v_invitation.id;

    raise exception 'invitation_expired'
      using errcode = '22023';
  end if;

  if not (
    v_invitation.invited_auth_id = v_actor_auth_id
    or (
      v_auth_email <> ''
      and v_auth_email = v_invitation.normalized_email
    )
  ) then
    raise exception 'invitation_identity_mismatch'
      using errcode = '42501';
  end if;

  if v_invitation.invited_user_id is not null
     and v_invitation.invited_user_id <> v_actor_user_id then
    raise exception 'invitation_user_mismatch'
      using errcode = '42501';
  end if;

  select c.slug, c.name, c.status
    into v_company_slug, v_company_name, v_company_status
    from public.companies c
   where c.id = v_invitation.company_id;

  if v_company_status is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  if v_invitation.membership_id is null then
    raise exception 'invitation_membership_required'
      using errcode = '22023';
  end if;

  select *
    into v_membership
    from public.company_memberships cm
   where cm.id = v_invitation.membership_id
     and cm.company_id = v_invitation.company_id
     and cm.user_id = v_actor_user_id
   for update;

  if v_membership.id is null then
    raise exception 'invitation_membership_mismatch'
      using errcode = '42501';
  end if;

  select count(*)
    into v_role_count
    from unnest(v_invitation.role_ids) requested(role_id);

  select count(*)
    into v_valid_role_count
    from public.roles r
   where r.id = any(v_invitation.role_ids)
     and r.company_id is null
     and r.is_template = true
     and r.is_system = true;

  if coalesce(v_role_count, 0) = 0
     or v_valid_role_count <> v_role_count then
    raise exception 'role_preset_invalid'
      using errcode = '22023';
  end if;

  update public.company_memberships cm
     set status = 'active',
         joined_at = coalesce(cm.joined_at, v_accepted_at),
         updated_at = now()
   where cm.id = v_membership.id;

  update public.user_role_assignments ura
     set status = 'inactive',
         is_primary = false,
         updated_at = now()
   where ura.company_id = v_invitation.company_id
     and ura.user_id = v_actor_user_id
     and not (ura.role_id = any(v_invitation.role_ids))
     and (
       ura.status <> 'inactive'
       or ura.is_primary is distinct from false
     );

  update public.user_role_assignments ura
     set status = 'active',
         expires_at = null,
         is_primary = (ura.role_id = v_invitation.primary_role_id),
         updated_at = now()
   where ura.company_id = v_invitation.company_id
     and ura.user_id = v_actor_user_id
     and ura.role_id = any(v_invitation.role_ids);

  get diagnostics v_updated_role_count = row_count;

  if v_updated_role_count <> v_role_count then
    raise exception 'invitation_role_assignments_missing'
      using errcode = '22023';
  end if;

  update public.company_member_invitations cmi
     set status = 'accepted',
         accepted_at = v_accepted_at,
         invited_user_id = coalesce(cmi.invited_user_id, v_actor_user_id),
         membership_id = v_membership.id,
         metadata = coalesce(cmi.metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
           'accept_request_id', nullif(p_request_id, '')
         )),
         updated_at = now()
   where cmi.id = v_invitation.id;

  insert into public.company_audit_events (
    company_id,
    actor_user_id,
    actor_auth_id,
    actor_kind,
    event_type,
    target_type,
    target_id,
    metadata,
    idempotency_key
  )
  values (
    v_invitation.company_id,
    v_actor_user_id,
    v_actor_auth_id,
    'service_role',
    'company.member_invite_accepted',
    'invitation',
    v_invitation.id,
    jsonb_strip_nulls(jsonb_build_object(
      'target_user_id', v_actor_user_id,
      'membership_id', v_membership.id,
      'role_ids', to_jsonb(v_invitation.role_ids),
      'primary_role_id', v_invitation.primary_role_id,
      'request_id', nullif(p_request_id, '')
    )),
    nullif(p_request_id, '')
  );

  return query
  select
    v_invitation.id,
    v_invitation.company_id,
    v_company_slug,
    v_company_name,
    v_invitation.normalized_email,
    'accepted'::text,
    v_membership.id,
    v_actor_user_id,
    v_accepted_at,
    public.current_company_id() = v_invitation.company_id,
    true;
end;
$$;

revoke all privileges on function public.rpc_company_member_invite_accept(uuid, text) from public, anon;
grant execute on function public.rpc_company_member_invite_accept(uuid, text) to authenticated, service_role;

comment on function public.rpc_company_member_invite_accept(uuid, text) is
  'Phase 8C5E4 authenticated invite acceptance RPC. Activates a sent invitation only for the matching auth user/email, turns invited membership and staged role assignments active, writes audit, and does not switch active company metadata.';

commit;
