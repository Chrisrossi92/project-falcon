# Falcon Role Test Provisioning Runbook

## Purpose

This runbook defines a safe, reviewed, test-only path for provisioning active Falcon role-test
users without relying on access to real staff inboxes.

Role UX testing is separate from invitation acceptance testing. This runbook is for role UX only:
login, shell behavior, route visibility, navigation, dashboard access, My Work behavior, Team
Access visibility, and role-specific workflow affordances.

This runbook does not authorize production data mutation. It should be executed first in local or
staging only. Production execution requires explicit approval, confirmed backups, and a reviewed
operator plan.

## Role Map

Use these internal role-test personas:

- Mike / `mstout@continentalres.net` = Owner;
- Abby / `arossi@continentalres.net` = Admin;
- Pam / `pcasper@continentalres.net` = Reviewer;
- Chris / `crossi@continentalres.net` = Appraiser.

## Preconditions

Before running any SQL:

- target environment is local, dev, or staging;
- target Supabase project is confirmed;
- target Falcon company is confirmed;
- Supabase Auth users already exist for all four emails;
- Auth users were created through Supabase Auth Admin, Supabase Dashboard, or controlled admin
  tooling;
- no direct inserts into `auth.users` are used;
- operator has service-role or database admin access for the non-production environment;
- current active Owner count is known;
- owner recovery path is available.

## Safety Warnings

Do not:

- directly insert into `auth.users`;
- run this against production without explicit approval;
- demote or deactivate the last active Owner;
- use customer inboxes as a prerequisite for role UX testing;
- change schema, policies, RPCs, Edge Functions, or runtime code;
- use legacy `public.user_roles` as the authority source;
- rely on `public.users.role` as the effective permission source.

Authority must remain:

- active `public.company_memberships`;
- active `public.user_role_assignments`;
- system template `public.roles`;
- permission resolver RPCs such as `rpc_current_user_app_context`.

## Confirm Company Id

Confirm the target company before provisioning.

```sql
select id, slug, name, status
from public.companies
order by created_at nulls last, name;
```

If the environment uses the default company helper, confirm it resolves to the intended company.

```sql
select public.default_company_id() as default_company_id;

select c.id, c.slug, c.name, c.status
from public.companies c
where c.id = public.default_company_id();
```

Record the selected company id before continuing.

## Confirm Auth Users Exist

Auth users must already exist. Create them through Supabase Dashboard or Auth Admin tooling first.

Verification query:

```sql
select
  au.id as auth_id,
  au.email,
  au.email_confirmed_at,
  au.created_at,
  au.last_sign_in_at
from auth.users au
where lower(au.email) in (
  'mstout@continentalres.net',
  'arossi@continentalres.net',
  'pcasper@continentalres.net',
  'crossi@continentalres.net'
)
order by au.email;
```

Expected result:

- four rows returned;
- each row has a stable `auth_id`;
- email values match the role map;
- test passwords or magic-link access are controlled by the operator.

Stop if any Auth user is missing. Do not create missing users with SQL inserts.

## Confirm Role Presets

Verify the system template role ids.

```sql
select
  id as role_id,
  name,
  is_owner_role,
  is_system,
  is_template
from public.roles
where lower(name) in ('owner', 'admin', 'reviewer', 'appraiser')
order by
  case lower(name)
    when 'owner' then 1
    when 'admin' then 2
    when 'reviewer' then 3
    when 'appraiser' then 4
    else 99
  end;
```

Expected result:

- four rows returned;
- `is_system = true`;
- `is_template = true`;
- Owner role has `is_owner_role = true` or name `Owner`.

Stop if role presets are missing or ambiguous.

## Owner Recovery Preflight

Confirm active Owner count before provisioning.

```sql
with target_company as (
  select public.default_company_id() as company_id
)
select count(*) as active_owner_count
from public.company_memberships cm
join public.user_role_assignments ura
  on ura.company_id = cm.company_id
 and ura.user_id = cm.user_id
 and ura.status = 'active'
 and (ura.expires_at is null or ura.expires_at > now())
join public.roles r
  on r.id = ura.role_id
join target_company tc
  on tc.company_id = cm.company_id
where cm.status = 'active'
  and (r.is_owner_role = true or lower(r.name) = 'owner');
```

Expected result:

- at least one active Owner exists before changes;
- Mike will be provisioned as an additional or confirmed Owner;
- no existing owner recovery account is removed.

Stop if active owner count is zero unless the explicit goal is owner recovery in a disposable
environment.

## Map Auth Users To Public Users

The canonical Falcon app user is `public.users.id`. Supabase Auth identity links through
`public.users.auth_id = auth.users.id`.

Shell personalization depends on the same public user/app-context fields. The setup should keep
`email`, `name`, and `display_name` populated so the top-right shell identity can show the logged-in
person instead of falling back to a generic account label.

Use this reviewed test-only pattern to link or create public users after Auth users already exist.

```sql
begin;

with role_test_users(email, display_name, compatibility_role) as (
  values
    ('mstout@continentalres.net', 'Mike', 'owner'),
    ('arossi@continentalres.net', 'Abby', 'admin'),
    ('pcasper@continentalres.net', 'Pam', 'reviewer'),
    ('crossi@continentalres.net', 'Chris', 'appraiser')
),
auth_matches as (
  select
    rtu.email,
    rtu.display_name,
    rtu.compatibility_role,
    au.id as auth_id
  from role_test_users rtu
  join auth.users au
    on lower(au.email) = rtu.email
),
updated_existing as (
  update public.users u
     set auth_id = am.auth_id,
         name = coalesce(nullif(u.name, ''), am.display_name),
         display_name = coalesce(nullif(u.display_name, ''), am.display_name),
         email = am.email,
         role = am.compatibility_role,
         status = 'active',
         is_active = true,
         updated_at = now()
    from auth_matches am
   where u.auth_id = am.auth_id
      or lower(u.email) = am.email
  returning u.id, u.email
),
inserted_missing as (
  insert into public.users (
    name,
    email,
    role,
    auth_id,
    display_name,
    status,
    is_active,
    created_at,
    updated_at
  )
  select
    am.display_name,
    am.email,
    am.compatibility_role,
    am.auth_id,
    am.display_name,
    'active',
    true,
    now(),
    now()
  from auth_matches am
  where not exists (
    select 1
    from public.users u
    where u.auth_id = am.auth_id
       or lower(u.email) = am.email
  )
  returning id, email
)
select 'mapped_public_users' as step, count(*) as affected_rows
from (
  select * from updated_existing
  union all
  select * from inserted_missing
) mapped;

rollback;
```

Review the result first with `rollback`. Replace `rollback` with `commit` only after the operator
confirms the target environment and affected rows.

## Provision Memberships

After mapping public users, provision active company memberships.

```sql
begin;

with target_company as (
  select public.default_company_id() as company_id
),
role_test_users(email) as (
  values
    ('mstout@continentalres.net'),
    ('arossi@continentalres.net'),
    ('pcasper@continentalres.net'),
    ('crossi@continentalres.net')
),
target_users as (
  select u.id as user_id, u.email
  from public.users u
  join role_test_users rtu
    on lower(u.email) = rtu.email
)
insert into public.company_memberships (
  company_id,
  user_id,
  status,
  membership_type,
  is_primary,
  joined_at,
  created_at,
  updated_at
)
select
  tc.company_id,
  tu.user_id,
  'active',
  'role_test',
  false,
  now(),
  now(),
  now()
from target_company tc
cross join target_users tu
on conflict (company_id, user_id) do update
  set status = 'active',
      membership_type = coalesce(nullif(public.company_memberships.membership_type, ''), 'role_test'),
      joined_at = coalesce(public.company_memberships.joined_at, now()),
      updated_at = now();

select cm.company_id, u.email, cm.status, cm.membership_type, cm.joined_at
from public.company_memberships cm
join public.users u
  on u.id = cm.user_id
join target_company tc
  on tc.company_id = cm.company_id
where lower(u.email) in (
  'mstout@continentalres.net',
  'arossi@continentalres.net',
  'pcasper@continentalres.net',
  'crossi@continentalres.net'
)
order by u.email;

rollback;
```

Review with `rollback` first. Commit only after confirming the target environment.

## Assign Roles

Assign exactly one active primary role per test persona.

```sql
begin;

with target_company as (
  select public.default_company_id() as company_id
),
role_map(email, role_name) as (
  values
    ('mstout@continentalres.net', 'owner'),
    ('arossi@continentalres.net', 'admin'),
    ('pcasper@continentalres.net', 'reviewer'),
    ('crossi@continentalres.net', 'appraiser')
),
resolved as (
  select
    tc.company_id,
    u.id as user_id,
    u.email,
    r.id as role_id,
    r.name as role_name
  from role_map rm
  join public.users u
    on lower(u.email) = rm.email
  join public.roles r
    on lower(r.name) = rm.role_name
   and r.company_id is null
   and r.is_system = true
   and r.is_template = true
  cross join target_company tc
),
inactive_other_roles as (
  update public.user_role_assignments ura
     set status = 'inactive',
         is_primary = false,
         updated_at = now()
    from resolved r
   where ura.company_id = r.company_id
     and ura.user_id = r.user_id
     and ura.role_id <> r.role_id
  returning ura.user_id
)
insert into public.user_role_assignments (
  company_id,
  user_id,
  role_id,
  status,
  is_primary,
  assigned_at,
  expires_at,
  created_at,
  updated_at
)
select
  company_id,
  user_id,
  role_id,
  'active',
  true,
  now(),
  null,
  now(),
  now()
from resolved
on conflict (company_id, user_id, role_id) do update
  set status = 'active',
      is_primary = true,
      expires_at = null,
      updated_at = now();

select
  u.email,
  cm.status as membership_status,
  r.name as active_role,
  ura.is_primary,
  ura.status as role_status
from public.users u
join public.company_memberships cm
  on cm.user_id = u.id
join target_company tc
  on tc.company_id = cm.company_id
join public.user_role_assignments ura
  on ura.company_id = cm.company_id
 and ura.user_id = u.id
join public.roles r
  on r.id = ura.role_id
where lower(u.email) in (
  'mstout@continentalres.net',
  'arossi@continentalres.net',
  'pcasper@continentalres.net',
  'crossi@continentalres.net'
)
order by u.email, ura.status, r.name;

rollback;
```

Review with `rollback` first. Commit only after confirming the target environment, role IDs, and
owner recovery state.

## Owner Recovery Postflight

After committed provisioning, confirm owner count again.

```sql
with target_company as (
  select public.default_company_id() as company_id
)
select count(*) as active_owner_count
from public.company_memberships cm
join public.user_role_assignments ura
  on ura.company_id = cm.company_id
 and ura.user_id = cm.user_id
 and ura.status = 'active'
 and (ura.expires_at is null or ura.expires_at > now())
join public.roles r
  on r.id = ura.role_id
join target_company tc
  on tc.company_id = cm.company_id
where cm.status = 'active'
  and (r.is_owner_role = true or lower(r.name) = 'owner');
```

Expected result:

- active owner count remains at least one;
- Mike is active with Owner role;
- any pre-existing owner recovery account remains active.

## Verify Effective Permissions

Each persona should verify their own context after logging in.

```sql
select *
from public.rpc_current_user_app_context();
```

Expected per persona:

- Mike: `is_owner = true`, primary role key `owner`;
- Abby: `is_admin_role = true`, primary role key `admin`;
- Pam: `is_reviewer_role = true`, primary role key `reviewer`;
- Chris: `is_appraiser_role = true`, primary role key `appraiser`.

Admin/service-role verification can inspect company member projections:

```sql
select *
from public.rpc_company_member_list(true)
where lower(email) in (
  'mstout@continentalres.net',
  'arossi@continentalres.net',
  'pcasper@continentalres.net',
  'crossi@continentalres.net'
);
```

If testing assignment selectors, verify:

```sql
select email, role_keys, can_be_appraiser, can_be_reviewer
from public.rpc_company_assignable_users('all')
where lower(email) in (
  'mstout@continentalres.net',
  'arossi@continentalres.net',
  'pcasper@continentalres.net',
  'crossi@continentalres.net'
)
order by email;
```

## Login Shell Test Matrix

### Owner: Mike

Verify:

- owner can reach owner/admin operational surfaces expected for v1;
- Team Access is visible;
- role management affordances appear where allowed;
- Owner grant/revoke affordances follow existing permissions;
- owner recovery account remains active;
- shell profile does not collapse into appraiser-only navigation.

### Admin: Abby

Verify:

- admin operational surfaces are available;
- Team Access and invite/member management visibility matches permissions;
- Owner-only actions are hidden or blocked when Abby lacks owner grant authority;
- admin can see management-oriented Dashboard / Operations surfaces where expected;
- appraiser-only My Work behavior does not replace admin navigation.

### Reviewer: Pam

Verify:

- reviewer sees reviewer-appropriate order/review surfaces;
- reviewer does not see owner/admin-only Team Access mutations unless permissions allow them;
- reviewer assignment/read visibility follows existing governed data;
- shell orientation is reviewer-appropriate;
- no appraiser-only My Work assumptions are applied incorrectly.

### Appraiser: Chris

Verify:

- appraiser sees the dedicated My Work lane when current navigation rules allow it;
- My Work answers daily execution needs with assigned governed rows only;
- appraiser does not see owner/admin-only Team Access controls;
- order visibility remains assigned-work scoped;
- appraiser shell remains task-first and does not expose broad management route inventory.

## Rollback Notes

Rollback should be environment-specific and reviewed before execution.

For local/dev/staging role-test cleanup, prefer inactivating memberships and role assignments
rather than deleting Auth users.

Example cleanup shape:

```sql
begin;

with target_company as (
  select public.default_company_id() as company_id
),
target_users as (
  select u.id as user_id, u.email
  from public.users u
  where lower(u.email) in (
    'mstout@continentalres.net',
    'arossi@continentalres.net',
    'pcasper@continentalres.net',
    'crossi@continentalres.net'
  )
)
update public.user_role_assignments ura
   set status = 'inactive',
       is_primary = false,
       updated_at = now()
  from target_company tc, target_users tu
 where ura.company_id = tc.company_id
   and ura.user_id = tu.user_id;

update public.company_memberships cm
   set status = 'inactive',
       updated_at = now()
  from target_company tc, target_users tu
 where cm.company_id = tc.company_id
   and cm.user_id = tu.user_id
   and lower(tu.email) <> 'mstout@continentalres.net';

rollback;
```

This cleanup intentionally does not deactivate Mike by default because Owner recovery must be
preserved. Adjust only with explicit owner-count verification.

## Invite Flow Test Plan

Invitation acceptance should be tested later with controlled inboxes or email capture.

Invite-flow test scope:

- create a fresh test Auth recipient or disposable mailbox;
- send invite through Team Access;
- verify `company_member_invitations.status = sent`;
- confirm pending membership is `invited`;
- confirm staged role assignments are `inactive`;
- accept through `/accept-invite/:invitationId`;
- verify membership becomes `active`;
- verify invitation-scoped role assignments become `active`;
- verify session refresh and active-company switch behavior;
- verify accepted invitation appears in invitation history.

Invite-flow testing should not be required for every role UX pass. Role UX testing can use the
active provisioning runbook above; invitation lifecycle testing should prove the invite machinery
separately.

## Validation

Validation for this runbook:

- docs-only diff;
- `git diff --check`;
- trailing whitespace scan.
