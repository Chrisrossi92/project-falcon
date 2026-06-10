begin;

create extension if not exists "pgcrypto";

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  with jwt_claims as (
    select case
      when nullif(current_setting('request.jwt.claims', true), '') is null
        then '{}'::jsonb
      else current_setting('request.jwt.claims', true)::jsonb
    end as claims
  ),
  raw_claim as (
    select coalesce(
      claims #>> '{app_metadata,active_company_id}',
      claims #>> '{app_metadata,current_company_id}',
      claims ->> 'active_company_id',
      claims ->> 'current_company_id'
    ) as value
    from jwt_claims
  ),
  claimed_company as (
    select case
      when value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then value::uuid
      else null::uuid
    end as company_id
    from raw_claim
  ),
  current_context as (
    select public.current_app_user_id() as user_id
  ),
  valid_claim as (
    select cc.company_id
      from claimed_company cc
      join current_context ctx on true
     where cc.company_id is not null
       and ctx.user_id is not null
       and exists (
         select 1
           from public.company_memberships cm
          where cm.user_id = ctx.user_id
            and cm.company_id = cc.company_id
            and cm.status = 'active'
       )
  ),
  primary_membership as (
    select cm.company_id
      from public.company_memberships cm
      join current_context ctx
        on ctx.user_id = cm.user_id
     where ctx.user_id is not null
       and cm.status = 'active'
     order by cm.is_primary desc, cm.joined_at desc nulls last, cm.created_at desc
     limit 1
  )
  select coalesce(
    (select company_id from valid_claim limit 1),
    (select company_id from primary_membership limit 1),
    public.default_company_id()
  );
$$;

insert into public.roles (name, description, is_template, is_system, is_owner_role)
select
  'Vendor Admin',
  'Authenticated vendor-company role for Vendor Workspace access. Grants only vendor-side permissions.',
  true,
  true,
  false
where not exists (
  select 1
    from public.roles r
   where r.company_id is null
     and lower(r.name) = lower('Vendor Admin')
);

with role_permission_seed(role_name, permission_key) as (
  values
    ('Vendor Admin', 'vendor_workspace.view'),
    ('Vendor Admin', 'vendor_bids.read'),
    ('Vendor Admin', 'vendor_bids.respond'),
    ('Vendor Admin', 'vendor_assignments.read'),
    ('Vendor Admin', 'vendor_assignments.respond'),
    ('Vendor Admin', 'vendor_assignments.progress'),
    ('Vendor Admin', 'vendor_documents.read'),
    ('Vendor Admin', 'vendor_documents.upload'),
    ('Vendor Admin', 'vendor_profile.read'),
    ('Vendor Admin', 'vendor_profile.update')
)
insert into public.role_permissions (role_id, permission_key)
select r.id, seed.permission_key
  from role_permission_seed seed
  join public.roles r
    on r.company_id is null
   and lower(r.name) = lower(seed.role_name)
  join public.permissions p
    on p.key = seed.permission_key
on conflict (role_id, permission_key) do nothing;

create or replace function public.rpc_vendor_workspace_bootstrap()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.current_app_user_id();
  v_auth_claims jsonb := case
    when nullif(current_setting('request.jwt.claims', true), '') is null
      then '{}'::jsonb
    else current_setting('request.jwt.claims', true)::jsonb
  end;
  v_auth_email text;
  v_vendor_role_id uuid;
  v_match record;
  v_membership_id uuid;
  v_role_assignment_id uuid;
  v_contact_linked_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  select lower(btrim(coalesce(v_auth_claims ->> 'email', u.email, '')))
    into v_auth_email
    from public.users u
   where u.id = v_user_id
   limit 1;

  if v_auth_email = '' then
    return jsonb_build_object(
      'ok', false,
      'error', 'vendor_workspace_email_required'
    );
  end if;

  select r.id
    into v_vendor_role_id
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
      'error', 'vendor_workspace_contact_not_found'
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

  return jsonb_build_object(
    'ok', true,
    'vendor_company_id', v_match.vendor_company_id,
    'vendor_company_name', v_match.vendor_company_name,
    'vendor_profile_id', v_match.vendor_profile_id,
    'vendor_contact_id', v_match.contact_id,
    'relationship_id', v_match.relationship_id,
    'membership_id', v_membership_id,
    'role_assignment_id', v_role_assignment_id,
    'contact_linked', v_contact_linked_count > 0
  );
end;
$$;

revoke all on function public.rpc_vendor_workspace_bootstrap() from public, anon;
grant execute on function public.rpc_vendor_workspace_bootstrap() to authenticated, service_role;
grant execute on function public.current_company_id() to authenticated;

comment on function public.current_company_id() is
  'Resolves the authenticated active company from a valid JWT company claim when present; otherwise falls back to the user primary active company membership before the default company. This supports vendor-contact login bootstrap without exposing cross-company data.';

comment on function public.rpc_vendor_workspace_bootstrap() is
  'AMC-13 Vendor Workspace login bootstrap. Matches the authenticated user email to an active vendor contact on an active AMC vendor relationship/profile, links the contact to the app user when unclaimed, creates/activates vendor-company membership and Vendor Admin role assignment, and returns vendor workspace context. Does not create orders, assignments, bid responses, tokens, notifications, emails, or owner-side access.';

commit;
