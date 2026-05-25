# Falcon Role Test And Invitation Flow Plan

## Purpose

This document records the current Falcon invitation, authentication, membership, and role authority
contracts before any internal role-test accounts are created.

The goal is to separate two different needs:

- test the production invitation lifecycle safely;
- create reliable internal role-test accounts for owner, admin, reviewer, and appraiser UX review.

This plan is docs-only. It does not change runtime code, Supabase Auth users, application users,
memberships, role assignments, permissions, backend functions, schema, policies, workflows,
automation, notifications, AMC, Client Portal, AI behavior, or production data.

## Current Production Invite Flow

The intended production invite flow is invitation-first and acceptance-gated.

Current flow:

1. An authorized owner/admin opens Team Access and selects role presets.
2. The invite UI calls the `invite-company-member` Edge Function.
3. The Edge Function validates the caller's Supabase session.
4. The Edge Function calls `rpc_company_member_invite_prepare` as the caller.
5. The prepare RPC validates current-company membership, invite authority, company status, role
   preset validity, role assignment authority, and owner-grant authority when needed.
6. The prepare RPC creates a `prepared` invitation row only.
7. The Edge Function calls Supabase Auth Admin `inviteUserByEmail`.
8. The Edge Function calls `rpc_company_member_invite_finalize` with service-role authority.
9. Finalize records the Auth invite result and stages app access as pending.
10. The invitee lands on `/accept-invite/:invitationId`, signs in if needed, and the accept page
    calls `rpc_company_member_invite_accept`.
11. Acceptance activates the invited membership and invitation-scoped role assignments.
12. The accept page refreshes the session and switches active company context when needed.

Pending invitations do not grant operational visibility. Access becomes active only after the
authenticated invitee accepts the invitation.

## Invitation Tables, RPCs, And Functions

Primary tables:

- `public.company_member_invitations`;
- `public.company_memberships`;
- `public.user_role_assignments`;
- `public.users`;
- `public.roles`;
- `public.role_permissions`;
- `public.permissions`;
- `public.company_audit_events`.

Primary invitation RPCs:

- `public.rpc_company_member_invite_prepare`;
- `public.rpc_company_member_invite_finalize`;
- `public.rpc_company_member_invite_accept`;
- `public.rpc_company_member_invitations_list`;
- `public.rpc_company_member_invitation_cancel`;
- `public.rpc_company_member_invitation_resend_prepare`;
- `public.rpc_company_member_invitation_resend_finalize`;
- `public.rpc_company_role_preset_list`.

Primary Edge Functions:

- `invite-company-member`;
- `resend-company-member-invite`.

Primary frontend surfaces:

- `src/features/company-invitations/InviteCompanyMemberModal.jsx`;
- `src/features/company-invitations/CompanyInvitationsPanel.jsx`;
- `src/features/company-invitations/AcceptCompanyInvitePage.jsx`;
- route `/accept-invite/:invitationId`.

## Pending Membership Creation

Pending membership is created during invitation finalize, not during prepare.

`rpc_company_member_invite_prepare`:

- validates caller and role authority;
- creates a `company_member_invitations` row with status `prepared`;
- records role snapshot metadata;
- does not create membership rows;
- does not create role assignment rows.

`rpc_company_member_invite_finalize`:

- requires service-role execution;
- links or creates the canonical `public.users` row for the invited Auth identity;
- creates or updates `company_memberships` with status `invited`;
- sets `membership_type = invited`;
- stages `user_role_assignments` with status `inactive`;
- marks the invitation `sent` when Auth invite succeeds;
- records Auth invite failure as `auth_failed` when needed.

Resend uses the same pattern through resend prepare/finalize functions.

## Accepted Membership Finalization

Accepted membership is finalized by `rpc_company_member_invite_accept`.

Acceptance rules:

- the caller must be authenticated;
- the caller must resolve to a canonical app user through `current_app_user_id()`;
- the invitation must exist, be `sent`, and not be expired;
- the caller must match the invited Auth identity or invited email;
- the invitation membership must belong to the caller's app user;
- invited role presets must still be valid system template roles.

Acceptance effects:

- updates `company_memberships.status` to `active`;
- sets `joined_at` if missing;
- activates the invitation-scoped `user_role_assignments`;
- inactivates non-invitation role assignments for that user/company;
- marks the invitation `accepted`;
- writes a company audit event;
- returns `session_refresh_required = true`.

Acceptance does not directly switch active-company metadata; the frontend handles company-context
switching after acceptance when needed.

## Role Assignment Activation

Role assignments are staged inactive at finalize and activated at accept.

Authority-sensitive role mutation after acceptance is handled separately by
`rpc_company_member_role_update`, which:

- requires current-company membership;
- requires `users.manage_company_access`;
- requires `roles.assign`;
- requires owner-grant authority before adding Owner;
- requires owner-revoke authority and owner invariant preservation before removing Owner;
- uses only system template role presets;
- writes company audit events;
- does not sync legacy `user_roles`.

## Auth User To App User Mapping

Supabase Auth identity and Falcon app identity are separate.

Current mapping:

- Supabase Auth users live in `auth.users`.
- Canonical Falcon users live in `public.users`.
- `public.users.auth_id` links a Falcon app user to `auth.users.id`.
- `public.current_app_user_id()` resolves the current app user by matching
  `public.users.auth_id = auth.uid()`.
- `public.company_memberships.user_id` stores `public.users.id`, not `auth.users.id`.
- `public.user_role_assignments.user_id` stores `public.users.id`, not `auth.users.id`.
- the legacy `public.profiles` view exposes Auth-facing profile fields and is not the normalized
  company-role authority source.

Invite finalize can create or link the `public.users` row for the invited Auth identity. Direct
manual inserts into `auth.users` should not be used for test setup.

## Current Authority Source

The current source of truth for company role UX and permission authority is:

- active `public.company_memberships`;
- active `public.user_role_assignments`;
- system template `public.roles`;
- `public.role_permissions` and `public.permissions`;
- permission resolver helpers such as `current_app_user_has_permission`;
- app context projection `rpc_current_user_app_context`;
- company member projections such as `rpc_company_member_list` and
  `rpc_company_assignable_users`.

Legacy role-string paths are deprecated for browser authority:

- `public.user_roles` direct authenticated reads are revoked;
- legacy role RPCs are no longer available to authenticated browser callers;
- `public.users.role` remains compatibility metadata and should not be treated as the source of
  current company authority.

## Proposed Role-Test Accounts

Proposed internal role-test personas:

- Mike = Owner;
- Abby = Admin;
- Pam = Reviewer;
- Chris = Appraiser.

Use project-owned test emails, not personal production inbox dependencies. Example placeholders:

- `mike.owner+falcon-test@<controlled-domain>`;
- `abby.admin+falcon-test@<controlled-domain>`;
- `pam.reviewer+falcon-test@<controlled-domain>`;
- `chris.appraiser+falcon-test@<controlled-domain>`.

The exact domain should be controlled by the team or by the local/staging email capture system.
Do not rely on real customer inboxes for role UX testing.

## Safest Test Setup Strategy

The safest setup depends on what is being tested.

### Role UX Testing

For role UX testing, use a dev or staging Supabase project and create confirmed Auth users through
supported admin tooling:

- Supabase Dashboard Auth user creation;
- Supabase Auth Admin API;
- a reviewed local/staging admin script using the Supabase service role.

Do not insert directly into `auth.users`.

After Auth users exist, provision app access through a test-only SQL/admin runbook that:

- links or creates `public.users` rows with `auth_id = auth.users.id`;
- creates active `company_memberships` rows for the target company;
- creates active `user_role_assignments` rows using existing system template role IDs;
- sets exactly one primary role per persona unless multi-role testing is intentional;
- leaves production data untouched.

This bypasses email delivery only for role UX testing. It should be run only in local/dev/staging
unless production execution is explicitly approved with a reviewed runbook.

### Invitation Lifecycle Testing

Invite acceptance should be tested separately from role UX testing.

Invitation testing should use:

- controlled test inboxes;
- Supabase local email capture if available;
- staging email capture;
- or Auth Admin invite links observed through approved non-production tooling.

This test should verify prepare, Auth invite, finalize, accept, session refresh, and active-company
switch behavior. It should not be conflated with routine owner/admin/reviewer/appraiser UX review.

## Owner Recovery Safeguards

Any role-test setup must preserve owner recovery.

Required safeguards:

- confirm at least one existing active Owner before setup;
- create or preserve Mike as an active Owner before testing lower-privilege users;
- never deactivate, demote, or replace the last active Owner;
- run an owner-count preflight before any role updates;
- run an owner-count postflight after setup;
- keep a known service-role/admin recovery path available in dev/staging;
- do not test owner revocation in production.

The existing role mutation RPCs enforce owner invariants, but test setup scripts must still include
explicit preflight checks.

## Recommended Test Runbook Shape

The actual runbook should be created as a separate reviewed artifact before any data mutation.

Recommended steps:

1. Select environment: local or staging first.
2. Confirm target company id and slug.
3. Confirm system template role IDs for Owner, Admin, Reviewer, and Appraiser.
4. Confirm active owner count is at least one.
5. Create Auth users through supported admin tooling.
6. Link/create `public.users` records by `auth_id`.
7. Upsert active `company_memberships`.
8. Upsert active `user_role_assignments`.
9. Verify `rpc_current_user_app_context` for each persona.
10. Verify shell/nav/route visibility for each persona.
11. Verify no production data was touched.

The runbook should be idempotent, environment-scoped, and reversible for non-production data.

## Questions Answered

1. Intended production invite flow:
   Team Access UI to Edge Function, prepare RPC, Auth Admin invite, finalize RPC, accept route,
   acceptance RPC, session refresh, and optional active-company switch.

2. Tables/RPCs/functions that handle invitations:
   `company_member_invitations`, invitation prepare/finalize/accept/list/cancel/resend RPCs,
   `invite-company-member`, `resend-company-member-invite`, and the company invitation frontend
   surfaces.

3. Pending membership creation:
   service-role finalize RPC creates or updates `company_memberships.status = invited` and inactive
   role assignments.

4. Accepted membership finalization:
   authenticated accept RPC activates membership, activates invited role assignments, and marks the
   invitation accepted.

5. Role assignment activation:
   invitation-scoped role assignments become active only during accept. Post-accept role changes use
   guarded company member role mutation RPCs.

6. Auth-to-app user connection:
   `public.users.auth_id` links to `auth.users.id`; `current_app_user_id()` resolves canonical app
   user id from `auth.uid()`.

7. Current authority source:
   active company membership plus active normalized role assignments and permission resolver RPCs.
   Legacy role strings are compatibility data, not current browser authority.

8. Safest internal role-test account setup:
   create Auth users through supported admin tooling in dev/staging, then provision active app
   users, memberships, and role assignments through a reviewed test-only admin runbook. Keep invite
   acceptance testing separate.

## Explicit Non-Goals

This plan does not authorize:

- production data mutation;
- direct inserts into `auth.users`;
- runtime code changes;
- schema changes;
- Supabase policy changes;
- permission changes;
- workflow/lifecycle changes;
- Smart Action changes;
- backend function changes;
- automation or notification changes;
- AMC work;
- Client Portal work;
- AI work;
- owner recovery removal.

## Validation

Validation for this plan:

- docs-only diff;
- `git diff --check`;
- trailing whitespace scan.
