begin;

create or replace function public.rpc_vendor_workspace_bootstrap()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_user_id uuid := public.current_app_user_id();
  v_auth_claims jsonb := case
    when nullif(current_setting('request.jwt.claims', true), '') is null
      then '{}'::jsonb
    else current_setting('request.jwt.claims', true)::jsonb
  end;
  v_auth_email text;
  v_auth_name text;
  v_vendor_role_id uuid;
  v_vendor_role_name text;
  v_match record;
  v_existing_user public.users%rowtype;
  v_membership_id uuid;
  v_role_assignment_id uuid;
  v_contact_linked_count integer := 0;
  v_permission_keys text[];
begin
  if v_auth_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  v_auth_email := lower(btrim(coalesce(v_auth_claims ->> 'email', '')));
  v_auth_name := nullif(btrim(coalesce(
    v_auth_claims ->> 'name',
    v_auth_claims ->> 'full_name',
    v_auth_claims #>> '{user_metadata,name}',
    v_auth_claims #>> '{user_metadata,full_name}',
    v_auth_email
  )), '');

  if v_auth_email = '' then
    return jsonb_build_object(
      'ok', false,
      'error', 'vendor_workspace_email_required'
    );
  end if;

  if v_user_id is null then
    select *
      into v_existing_user
      from public.users u
     where u.auth_id = v_auth_user_id
        or (
          lower(u.email) = v_auth_email
          and (u.auth_id is null or u.auth_id = v_auth_user_id)
        )
     order by (u.auth_id = v_auth_user_id) desc, u.created_at desc
     limit 1;

    if found then
      update public.users u
         set auth_id = coalesce(u.auth_id, v_auth_user_id),
             name = coalesce(nullif(btrim(u.name), ''), coalesce(v_auth_name, v_auth_email)),
             display_name = coalesce(nullif(btrim(u.display_name), ''), v_auth_name),
             full_name = coalesce(nullif(btrim(u.full_name), ''), v_auth_name),
             status = coalesce(nullif(btrim(u.status), ''), 'active'),
             is_active = true,
             updated_at = now()
       where u.id = v_existing_user.id
         and (u.auth_id is null or u.auth_id = v_auth_user_id)
       returning u.id
        into v_user_id;
    end if;

    if v_user_id is null then
      insert into public.users (
        name,
        email,
        role,
        auth_id,
        display_name,
        full_name,
        status,
        is_active,
        is_admin
      ) values (
        coalesce(v_auth_name, v_auth_email),
        v_auth_email,
        'appraiser',
        v_auth_user_id,
        v_auth_name,
        v_auth_name,
        'active',
        true,
        false
      )
      returning id
        into v_user_id;
    end if;
  end if;

  if v_user_id is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'vendor_workspace_app_user_unavailable'
    );
  end if;

  select r.id, r.name
    into v_vendor_role_id, v_vendor_role_name
    from public.roles r
   where r.company_id is null
     and lower(r.name) = lower('Vendor Admin')
   limit 1;

  if v_vendor_role_id is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'vendor_workspace_role_missing'
    );
  end if;

  select
    vc.id as contact_id,
    cvp.id as vendor_profile_id,
    cvp.vendor_company_id,
    vendor_company.name as vendor_company_name,
    cvp.owner_company_id,
    cr.id as relationship_id,
    coalesce(vc.is_primary, false) as is_primary_contact,
    vc.updated_at,
    vc.created_at
    into v_match
    from public.vendor_contacts vc
    join public.company_vendor_profiles cvp
      on cvp.id = vc.vendor_profile_id
    join public.companies vendor_company
      on vendor_company.id = cvp.vendor_company_id
     and vendor_company.status = 'active'
    join public.company_relationships cr
      on cr.source_company_id = cvp.owner_company_id
     and cr.target_company_id = cvp.vendor_company_id
     and cr.relationship_type = 'amc_vendor'
     and cr.status = 'active'
     and (
       cvp.relationship_id is null
       or cr.id = cvp.relationship_id
     )
   where lower(btrim(coalesce(vc.email, ''))) = v_auth_email
     and (vc.user_id is null or vc.user_id = v_user_id)
     and cvp.vendor_status not in ('inactive', 'do_not_use')
   order by coalesce(vc.is_primary, false) desc,
            vc.updated_at desc nulls last,
            vc.created_at desc,
            cvp.created_at desc
   limit 1;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error', 'vendor_workspace_contact_not_found',
      'diagnostics', jsonb_build_object(
        'auth_email_present', v_auth_email <> '',
        'app_user_resolved', v_user_id is not null,
        'matched_vendor_contact', false
      )
    );
  end if;

  insert into public.company_memberships (
    company_id,
    user_id,
    status,
    membership_type,
    is_primary,
    joined_at
  ) values (
    v_match.vendor_company_id,
    v_user_id,
    'active',
    'vendor_workspace_contact',
    true,
    now()
  )
  on conflict (company_id, user_id) do update
    set status = 'active',
        membership_type = coalesce(nullif(public.company_memberships.membership_type, ''), 'vendor_workspace_contact'),
        is_primary = true,
        joined_at = coalesce(public.company_memberships.joined_at, excluded.joined_at),
        updated_at = now()
  returning id
    into v_membership_id;

  insert into public.user_role_assignments (
    company_id,
    user_id,
    role_id,
    status,
    is_primary,
    assigned_at
  ) values (
    v_match.vendor_company_id,
    v_user_id,
    v_vendor_role_id,
    'active',
    true,
    now()
  )
  on conflict (company_id, user_id, role_id) do update
    set status = 'active',
        is_primary = true,
        expires_at = null,
        updated_at = now()
  returning id
    into v_role_assignment_id;

  update public.vendor_contacts vc
     set user_id = v_user_id,
         updated_at = now()
   where vc.id = v_match.contact_id
     and vc.user_id is null;

  get diagnostics v_contact_linked_count = row_count;

  select coalesce(array_agg(granted.permission_key order by granted.permission_key), '{}'::text[])
    into v_permission_keys
    from public.current_app_user_permission_keys_for_company(v_match.vendor_company_id)
      as granted(permission_key);

  return jsonb_build_object(
    'ok', true,
    'vendor_company_id', v_match.vendor_company_id,
    'vendor_company_name', v_match.vendor_company_name,
    'vendor_profile_id', v_match.vendor_profile_id,
    'vendor_contact_id', v_match.contact_id,
    'relationship_id', v_match.relationship_id,
    'membership_id', v_membership_id,
    'role_assignment_id', v_role_assignment_id,
    'role_id', v_vendor_role_id,
    'role_name', v_vendor_role_name,
    'contact_linked', v_contact_linked_count > 0,
    'permission_keys', to_jsonb(coalesce(v_permission_keys, '{}'::text[])),
    'has_vendor_workspace_view', 'vendor_workspace.view' = any(coalesce(v_permission_keys, '{}'::text[])),
    'diagnostics', jsonb_build_object(
      'auth_email_present', v_auth_email <> '',
      'app_user_resolved', v_user_id is not null,
      'matched_vendor_contact', true,
      'membership_active', v_membership_id is not null,
      'vendor_admin_role_assigned', v_role_assignment_id is not null,
      'permission_helper_aliased', true
    )
  );
end;
$$;

revoke all on function public.rpc_vendor_workspace_bootstrap() from public, anon;
grant execute on function public.rpc_vendor_workspace_bootstrap() to authenticated, service_role;

comment on function public.rpc_vendor_workspace_bootstrap() is
  'AMC-13 Vendor Workspace bootstrap permission alias alignment. Creates/links the app user for the authenticated email when needed, matches active vendor contacts by email, creates/activates vendor-company membership and Vendor Admin role assignment, and returns vendor-company permission diagnostics using an explicit alias for current_app_user_permission_keys_for_company(uuid). Does not create orders, assignments, bid responses, tokens, notifications, emails, or owner-side access.';

create or replace function public.rpc_admin_vendor_workspace_bootstrap_diagnostics(
  p_email text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_user_ids uuid[];
  v_vendor_company_ids uuid[];
  v_user_rows jsonb := '[]'::jsonb;
  v_vendor_contact_rows jsonb := '[]'::jsonb;
  v_membership_rows jsonb := '[]'::jsonb;
  v_role_assignment_rows jsonb := '[]'::jsonb;
  v_vendor_admin_permissions jsonb := '[]'::jsonb;
  v_vendor_admin_has_view boolean := false;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if not (
    public.current_app_user_has_permission('users.manage_company_access')
    or public.current_app_user_has_permission('roles.read')
  ) then
    raise exception 'vendor_workspace_diagnostics_admin_permission_required'
      using errcode = '42501';
  end if;

  if v_email = '' then
    raise exception 'vendor_workspace_diagnostics_email_required'
      using errcode = '22023';
  end if;

  select coalesce(array_agg(u.id order by u.created_at desc), '{}'::uuid[])
    into v_user_ids
    from public.users u
   where lower(btrim(coalesce(u.email, ''))) = v_email;

  select coalesce(array_agg(distinct cvp.vendor_company_id), '{}'::uuid[])
    into v_vendor_company_ids
    from public.vendor_contacts vc
    join public.company_vendor_profiles cvp
      on cvp.id = vc.vendor_profile_id
   where lower(btrim(coalesce(vc.email, ''))) = v_email;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id', u.id,
        'email', u.email,
        'auth_linked', u.auth_id is not null,
        'status', u.status,
        'is_active', u.is_active,
        'created_at', u.created_at,
        'updated_at', u.updated_at
      )
      order by u.created_at desc
    ),
    '[]'::jsonb
  )
    into v_user_rows
    from public.users u
   where u.id = any(v_user_ids);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'vendor_contact_id', vc.id,
        'vendor_contact_user_id', vc.user_id,
        'vendor_contact_email', vc.email,
        'vendor_contact_name', vc.name,
        'is_primary', vc.is_primary,
        'receives_assignment_notifications', vc.receives_assignment_notifications,
        'vendor_profile_id', cvp.id,
        'vendor_status', cvp.vendor_status,
        'owner_company_id', cvp.owner_company_id,
        'vendor_company_id', cvp.vendor_company_id,
        'vendor_company_name', vendor_company.name,
        'vendor_company_status', vendor_company.status,
        'relationship_id', cr.id,
        'relationship_status', cr.status,
        'relationship_type', cr.relationship_type,
        'relationship_matches_profile',
          cvp.relationship_id is null or cvp.relationship_id = cr.id
      )
      order by vc.is_primary desc, vc.updated_at desc nulls last, vc.created_at desc
    ),
    '[]'::jsonb
  )
    into v_vendor_contact_rows
    from public.vendor_contacts vc
    join public.company_vendor_profiles cvp
      on cvp.id = vc.vendor_profile_id
    join public.companies vendor_company
      on vendor_company.id = cvp.vendor_company_id
    left join public.company_relationships cr
      on cr.source_company_id = cvp.owner_company_id
     and cr.target_company_id = cvp.vendor_company_id
     and cr.relationship_type = 'amc_vendor'
     and (
       cvp.relationship_id is null
       or cr.id = cvp.relationship_id
     )
   where lower(btrim(coalesce(vc.email, ''))) = v_email;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'membership_id', cm.id,
        'user_id', cm.user_id,
        'company_id', cm.company_id,
        'company_name', c.name,
        'company_status', c.status,
        'membership_status', cm.status,
        'membership_type', cm.membership_type,
        'is_primary', cm.is_primary,
        'joined_at', cm.joined_at
      )
      order by cm.status = 'active' desc, cm.is_primary desc, cm.created_at desc
    ),
    '[]'::jsonb
  )
    into v_membership_rows
    from public.company_memberships cm
    join public.companies c
      on c.id = cm.company_id
   where cm.user_id = any(v_user_ids)
     and (
       coalesce(array_length(v_vendor_company_ids, 1), 0) = 0
       or cm.company_id = any(v_vendor_company_ids)
     );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'role_assignment_id', ura.id,
        'user_id', ura.user_id,
        'company_id', ura.company_id,
        'company_name', c.name,
        'role_id', r.id,
        'role_name', r.name,
        'role_assignment_status', ura.status,
        'is_primary', ura.is_primary,
        'assigned_at', ura.assigned_at,
        'expires_at', ura.expires_at,
        'has_vendor_workspace_view', exists (
          select 1
            from public.role_permissions rp
           where rp.role_id = r.id
             and rp.permission_key = 'vendor_workspace.view'
        )
      )
      order by ura.status = 'active' desc, ura.is_primary desc, ura.created_at desc
    ),
    '[]'::jsonb
  )
    into v_role_assignment_rows
    from public.user_role_assignments ura
    join public.roles r
      on r.id = ura.role_id
    join public.companies c
      on c.id = ura.company_id
   where ura.user_id = any(v_user_ids)
     and (
       coalesce(array_length(v_vendor_company_ids, 1), 0) = 0
       or ura.company_id = any(v_vendor_company_ids)
     );

  select coalesce(
    jsonb_agg(rp.permission_key order by rp.permission_key),
    '[]'::jsonb
  )
    into v_vendor_admin_permissions
    from public.roles r
    join public.role_permissions rp
      on rp.role_id = r.id
   where r.company_id is null
     and lower(r.name) = lower('Vendor Admin');

  select exists (
    select 1
      from public.roles r
      join public.role_permissions rp
        on rp.role_id = r.id
     where r.company_id is null
       and lower(r.name) = lower('Vendor Admin')
       and rp.permission_key = 'vendor_workspace.view'
  )
    into v_vendor_admin_has_view;

  return jsonb_build_object(
    'ok', true,
    'email', v_email,
    'public_users', v_user_rows,
    'vendor_contacts', v_vendor_contact_rows,
    'memberships', v_membership_rows,
    'role_assignments', v_role_assignment_rows,
    'vendor_admin_permissions', v_vendor_admin_permissions,
    'summary', jsonb_build_object(
      'public_user_exists', jsonb_array_length(v_user_rows) > 0,
      'vendor_contact_exists', jsonb_array_length(v_vendor_contact_rows) > 0,
      'active_vendor_company_membership_exists', exists (
        select 1
          from public.company_memberships cm
         where cm.user_id = any(v_user_ids)
           and cm.company_id = any(v_vendor_company_ids)
           and cm.status = 'active'
      ),
      'vendor_admin_role_assigned', exists (
        select 1
          from public.user_role_assignments ura
          join public.roles r
            on r.id = ura.role_id
         where ura.user_id = any(v_user_ids)
           and ura.company_id = any(v_vendor_company_ids)
           and ura.status = 'active'
           and lower(r.name) = lower('Vendor Admin')
      ),
      'vendor_admin_has_vendor_workspace_view', v_vendor_admin_has_view,
      'contact_linked_to_public_user', exists (
        select 1
          from public.vendor_contacts vc
         where lower(btrim(coalesce(vc.email, ''))) = v_email
           and vc.user_id = any(v_user_ids)
      )
    )
  );
end;
$$;

revoke all on function public.rpc_admin_vendor_workspace_bootstrap_diagnostics(text) from public, anon;
grant execute on function public.rpc_admin_vendor_workspace_bootstrap_diagnostics(text)
  to authenticated, service_role;

comment on function public.rpc_admin_vendor_workspace_bootstrap_diagnostics(text) is
  'Temporary AMC-13 admin-only Vendor Workspace bootstrap diagnostic. Read-only report for public user, vendor contact, vendor company membership, Vendor Admin role assignment, and Vendor Admin permission wiring by email. Uses role_permissions.permission_key directly and does not create memberships, roles, permissions, tokens, notifications, or emails.';

commit;
