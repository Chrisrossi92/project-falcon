begin;

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

  v_vendor_admin_has_view := v_vendor_admin_permissions ? 'vendor_workspace.view';

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
  'Temporary AMC-13 admin-only Vendor Workspace bootstrap diagnostic. Read-only report for public user, vendor contact, vendor company membership, Vendor Admin role assignment, and Vendor Admin permission wiring by email. Does not create memberships, roles, permissions, tokens, notifications, or emails.';

commit;
