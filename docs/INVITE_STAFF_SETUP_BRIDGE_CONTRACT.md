# Invite / Staff Setup Bridge Contract

## Purpose

This document locks the Phase 10A6 invite/staff setup bridge contract.

It defines how company bootstrap and onboarding should connect to Team Access invitation and role setup before implementation.

This is not an implementation plan. It does not add migrations, runtime code, permissions, RLS policies, RPCs, routes, registries, or UI.

Phase 10A6 defines the future bridge between a newly bootstrapped company owner and the staff setup work needed to make the company operationally ready.

Staff setup is company-scoped. Owner authority is company-scoped. Invitations, onboarding checklist state, product modes, and module metadata are not security authority.

Canonical runtime authority remains:

- Active company membership.
- Company-scoped role assignments.
- Permission resolution through backend helpers.
- RLS and security-definer RPC checks.
- Route guards.
- Assignment packet visibility rules.
- Workflow transition rules.

## Current Confirmed Invitation Baseline

The following primitives are confirmed in the current backend:

- `public.company_member_invitations`
- `public.rpc_company_member_invite_prepare(text, uuid[], uuid, interval, text, text)`
- `public.rpc_company_member_invite_finalize(uuid, uuid, text, boolean, text, text, jsonb)`
- `public.rpc_company_member_invite_accept(uuid, text)`
- `public.rpc_company_member_invitations_list(text, integer)`
- `public.rpc_company_member_invitation_cancel(uuid, text, text)`
- `public.rpc_company_member_invitation_resend_prepare(uuid, interval, text, text)`
- A service-role mediated `invite-company-member` Edge Function
- A service-role mediated `resend-company-member-invite` Edge Function
- `public.company_memberships`
- `public.user_role_assignments`
- `public.rpc_company_member_list(boolean)`
- `public.rpc_company_role_preset_list()`
- `public.company_audit_events`

Confirmed behavior:

- Invitation storage is service-role-owned; app roles do not directly access `company_member_invitations`.
- Prepare runs in current-company context and requires invite, company-access management, and role-assignment authority.
- Prepare validates role IDs against global system template roles and requires Owner grant authority when an Owner role is requested.
- Prepare creates a `prepared` invitation row and writes `company.member_invite_prepared`.
- Prepare does not create membership or role assignment rows.
- Finalize requires `service_role`.
- Finalize records Auth invite outcomes.
- Finalize creates or resolves the invited app user when needed.
- Finalize creates or updates a `company_memberships` row with `status = 'invited'` and `membership_type = 'invited'`.
- Finalize creates `user_role_assignments` rows with `status = 'inactive'`.
- Finalize marks the invitation `sent` when Auth invite work succeeds and writes `company.member_invite_sent`.
- Acceptance requires the authenticated invitee to match the invited Auth identity or invited email.
- Acceptance activates the invited membership, activates only the invitation-scoped role assignments, marks the invitation `accepted`, writes `company.member_invite_accepted`, and returns `session_refresh_required = true`.
- Acceptance does not switch active-company metadata by itself.
- Pending, sent, auth-failed, cancelled, expired, and accepted invitation rows are lifecycle records, not operational visibility grants.

Unknowns requiring later implementation inspection:

- Whether owner setup should call existing invitation Edge Functions directly or a future setup-specific wrapper.
- Whether solo-owner companies should mark team setup complete through an explicit acknowledgement task or a derived readiness rule.
- Whether product/package selections will require minimum staff roles.
- Whether a future company-specific role-template layer will replace global system template roles.
- Whether onboarding state will store invitation-task completion or derive it from invitation/member projections.
- Whether company audit events should be enough for staff setup history or if user-visible activity should be added later.

## Bridge Purpose

The invite/staff setup bridge should connect three systems without merging their authority:

- Bootstrap creates the company and first owner authority.
- Onboarding guides the owner through readiness work.
- Team Access handles invitations, memberships, and role assignment activation through canonical backend flows.

The bridge should answer:

- Has the owner reviewed team setup?
- Has the owner invited required or optional staff?
- Are pending invites still actionable?
- Are accepted members active in the company?
- Are role assignments active only after acceptance?
- Are role presets reviewable without exposing raw permission internals?
- Can a solo-owner company proceed without staff?

The bridge should not answer:

- Who can access data outside current-company permissions.
- Whether a user is globally admin.
- Whether a product mode or module grants access.
- Whether a pending invite is an active operational user.

## Fit With Company Onboarding

Staff setup should be one onboarding readiness domain, not a separate security system.

Recommended onboarding signals:

- `team_setup_started`: owner opens or reviews Team Access setup.
- `role_review_complete`: owner reviews available role presets and Owner grant implications.
- `staff_invite_started`: owner sends at least one invitation, when applicable.
- `staff_invite_pending`: one or more sent/prepared/auth-failed invites still need attention.
- `staff_invite_accepted`: one or more invited members accepted and became active.
- `solo_owner_acknowledged`: owner explicitly acknowledges solo operation when staff is optional.
- `team_setup_complete`: derived or stored readiness state indicating the team setup requirement is satisfied.

Onboarding may use these signals to show progress, warnings, and dashboard prompts.

Onboarding must not use these signals to grant access, activate roles, bypass invitation acceptance, or bypass route/RPC permission checks.

## Owner Setup Relationship

The owner setup shell should expose staff setup as a guided card or step.

The staff setup card should eventually:

- Explain the company-scoped nature of team access in business language.
- Let the owner review default role presets.
- Let the owner invite staff when permissions allow.
- Show pending invitation status.
- Warn about failed, expired, or cancelled invites.
- Let solo-owner companies continue when package policy allows.
- Link to the canonical Team Access surface when available.

The owner setup shell should not directly write membership or role assignment rows. It should use the same backend/Edge invitation path as Team Access or a future wrapper that preserves that authority boundary.

## First-Owner Versus Later-Staff Flows

The first owner is established by bootstrap.

Future bootstrap should create or resolve:

- Company record.
- Owner app user/Auth mapping.
- Active owner membership.
- Active owner role assignment using the canonical Owner role source.
- Audit event.

Later staff should enter through invitation flows.

Staff invitation should create only pending/invited state until the invitee authenticates and accepts:

- Invitation record.
- Invited membership, if finalize succeeds.
- Inactive role assignments, if finalize succeeds.
- Auth invite state.
- Audit events.

Staff activation should happen only after identity-checked acceptance:

- Membership moves to active.
- Invitation-scoped role assignments move to active.
- Session refresh and active-company switch happen through the existing active-company mechanism or a future explicit wrapper.

## Future Staff Setup Sequence

The recommended future sequence is:

1. Owner opens team setup from owner onboarding, dashboard prompt, or Team Access.
2. Owner enters invitee email and optional display/context fields.
3. Owner selects company-scoped role preset or template role.
4. UI obtains role options from a safe backend projection, not static authority.
5. Backend prepares the invitation through the canonical prepare RPC or a wrapper.
6. Prepared invitation is recorded with safe role snapshot and audit metadata.
7. Edge/service-role code sends the Auth invite.
8. Service-role finalize records Auth result.
9. Finalize creates invited membership and inactive role assignments, if supported by the current architecture.
10. Invitee accepts through authenticated invite acceptance.
11. Backend verifies Auth identity or invite email.
12. Backend activates the membership.
13. Backend activates only invitation-scoped role assignments.
14. Session refresh and active-company context handling occur through the canonical active-company mechanism.
15. Onboarding checklist derives or records staff setup progress.
16. Audit/readiness history records the lifecycle.

Frontend multi-table provisioning is not allowed.

## Relationship To Existing Invitation Infrastructure

The existing Team Access invitation infrastructure should be treated as the canonical foundation unless a later implementation audit finds a concrete reason to wrap or evolve it.

Known current pieces:

- `company_member_invitations`: service-role-owned invitation lifecycle ledger.
- `rpc_company_member_invite_prepare(...)`: authenticated prepare RPC for current-company invite authority.
- `rpc_company_member_invite_finalize(...)`: service-role-only Auth result and invitation finalization RPC.
- `rpc_company_member_invite_accept(...)`: authenticated acceptance RPC that activates membership and staged role assignments after identity checks.
- `invite-company-member`: Edge Function that validates caller auth, calls prepare, uses Supabase Auth Admin invite behavior through service role, and calls finalize.
- `rpc_company_member_invitations_list(...)`: safe current-company invitation list projection.
- `rpc_company_member_invitation_cancel(...)`: current-company cancel RPC for pending/actionable invites.
- `rpc_company_member_invitation_resend_prepare(...)` and resend Edge flow: resend support for non-accepted invitations.
- `rpc_company_member_list(...)`: safe current-company member projection.
- `rpc_company_role_preset_list()`: safe current-company role preset projection over system template roles.

Bridge design recommendation:

- Reuse existing invitation prepare/finalize/accept semantics.
- Prefer a future setup-specific wrapper only if owner onboarding needs a different result shape, checklist metadata, or idempotency behavior.
- Do not broaden direct table access.
- Do not expose service-role RPCs to browser-authenticated callers.
- Do not duplicate invite acceptance logic in onboarding code.

## Role / Permission Defaults

Canonical owner role handling remains a pre-10A7 blocker.

Current confirmed role behavior:

- Role assignments are stored in `user_role_assignments` with `company_id`, `user_id`, `role_id`, `status`, and `is_primary`.
- Permission resolution uses active company-scoped role assignments.
- Existing invitation prepare validates role IDs against system template roles.
- Existing role preset projection exposes safe role summaries and assignability, not raw permission arrays.
- Owner-role invitations require `users.grant_owner`.
- Legacy role-string surfaces such as `public.users.role`, legacy role RPCs, and legacy `is_admin` semantics must not become owner-instance authority.

Default staff roles should be reviewed as presets, not hardcoded UI authority.

Likely default staff role concepts:

- Owner: company-scoped owner authority.
- Admin-like company operator: broad company operations without platform authority.
- Appraiser: order production responsibility where assigned.
- Reviewer: review responsibility where assigned.
- Billing or finance-adjacent role, if still part of active role presets.

These labels are descriptive. Actual capability comes from backend role templates, role assignments, permission keys, and runtime authorization checks.

Product modes and modules may recommend which role presets appear first. They must not grant roles, permissions, or operational visibility.

## Pending Versus Active Concepts

Invitation states are lifecycle states:

- `prepared`: invite is staged before Auth finalize.
- `sent`: invite was finalized and can be accepted.
- `auth_failed`: Auth invite failed and may need retry.
- `accepted`: invitee accepted and activation occurred.
- `cancelled`: invite was cancelled.
- `expired`: invite aged out.

Membership states are authority-relevant only when active:

- `invited`: membership exists but should not grant operational access.
- `active`: membership may participate in permission resolution.
- `inactive`: membership should not participate in active-company authority.

Role assignment states are authority-relevant only when active:

- `inactive`: staged role assignment; does not grant permissions.
- `active`: permission resolver may use it if membership and expiry checks pass.

Pending invitations and inactive role assignments must not appear as assignable operational staff, order owners, reviewers, appraisers, notification recipients for order-tied operational records, or active company context options.

## Tenant-Safety Requirements

Staff setup must avoid tenant leakage by default.

Required boundaries:

- Invitation list reads must be current-company scoped.
- Member list reads must be current-company scoped.
- Role preset reads must not expose raw permission internals unless a future explicit authority surface is designed.
- Invite preparation must reject inactive current-company context.
- Invitee identity must be verified before activation.
- Owner grant must require explicit Owner grant authority.
- Auth invite/provider details must not be exposed to the browser.
- Failed, expired, cancelled, or pending invites must not leak cross-company existence details.
- Existing users in other companies must not become visible through invite lookup except through safe same-company invite results.
- A person with a pending invitation must not become assignable until membership and roles are active.

## Global Admin Escalation Avoidance

Company owners are not platform/system admins.

The staff setup bridge must not:

- Write global admin flags.
- Treat `public.users.role = 'admin'` as owner authority.
- Treat legacy `current_is_admin()` or legacy role RPCs as bootstrap authority.
- Grant service-role capabilities to company owners.
- Permit company owners to manage users outside their current company.
- Make Owner role grants possible without explicit current-company Owner grant permission.

## Onboarding Checklist Integration

Recommended checklist handling:

- Team setup should start when the owner opens the staff setup step or role review step.
- Staff invitation may be required, optional, or not applicable depending on future package policy.
- Pending invites should count as "started" but not necessarily "complete."
- Accepted active members can satisfy team setup when package policy requires more than one user.
- Failed or expired invites should create warnings and action prompts.
- Cancelled invites should preserve history but should not satisfy required staff setup by themselves.
- Solo-owner companies can become operationally ready if the selected product/package allows solo operation and the owner acknowledges solo setup.
- Dashboard/readiness prompts may show missing team setup, pending invites, failed invites, or no active staff.
- Prompts must not become security gates by themselves.

Recommended completion rules:

- Staff-optional package: `team_setup_complete` can be true after role review plus either at least one invite sent/accepted or solo-owner acknowledgement.
- Staff-required package: `team_setup_complete` should require at least one non-owner active member or another explicit package-specific backend rule.
- Unknown package policy: default to non-blocking warning until package policy exists.

## Activity And Audit

The current confirmed lifecycle uses `company_audit_events` for invitation prepare, sent/auth failure, acceptance, cancellation, and resend-related actions.

Future owner setup may show readiness history derived from audit events, invitation projections, or onboarding state.

User-facing operational activity is not required for staff setup unless a future product requirement explicitly defines it.

Audit should remain backend-owned and should include:

- Company ID.
- Actor app user/Auth context where applicable.
- Target invitation or membership ID.
- Role IDs or safe role snapshot.
- Request/idempotency key when available.
- Lifecycle event type.

## Hard No-Go Rules

Future implementation must not introduce:

- Invite flow granting cross-company visibility.
- Invitation bypassing Auth identity verification.
- Product-mode or module-authoritative role grants.
- Global admin escalation.
- Continental-specific staff defaults.
- Frontend-owned membership provisioning.
- Frontend-owned role assignment provisioning.
- Automatic Vendor/Client shell activation.
- Pending invites treated as active operational users.
- Inactive role assignments participating in permission resolution.
- Direct browser access to service-role-only invitation tables or finalize RPCs.
- Owner role grants without explicit Owner grant authority.
- Staff setup as a blanket route access gate.
- Raw permission internals exposed as setup UX copy.

## Implementation Slice Recommendations

Recommended later slices:

1. Invitation backend contract hardening: confirm prepare/finalize/accept/list/cancel/resend result shapes, idempotency, and error taxonomy for owner setup consumption.
2. Staff setup route shell: add a future setup-owned route/card that links to Team Access without changing authority.
3. Role template resolver: define the canonical safe role preset source for setup, including Owner grant display rules.
4. Invite form plus backend wrapper: decide whether setup calls `invite-company-member` directly or a setup wrapper that adds checklist/request metadata.
5. Invitation status list: show pending, auth-failed, expired, cancelled, and accepted states from safe projections.
6. Onboarding checklist resolver integration: derive or store team setup started/completed/warning states.
7. Audit/readiness wiring: expose safe lifecycle history for diagnostics.
8. Solo-owner acknowledgement: define package-aware solo operation completion semantics.
9. Active-company refresh validation: confirm accepted invited users can refresh and switch into the accepted company safely.
10. Tenant isolation tests: cover cross-company invitation reads, inactive membership, inactive roles, Owner grant protection, and pending invite non-assignability.

## Open Questions Before Implementation

Phase 10A7 completes the bootstrap readiness/checklist contract in `docs/COMPANY_BOOTSTRAP_READINESS_CHECKLIST.md`. Future staff setup completion, pending-invite warnings, solo-owner acknowledgement, and staff-required package rules should feed that readiness layer without treating invitations or onboarding as access authority.

- Should setup use the existing `invite-company-member` Edge Function directly, or a setup-specific wrapper?
- Should checklist completion be stored, derived, or hybrid?
- How should package policy declare staff-required versus staff-optional setup?
- Should role presets remain global system templates or become company-local copies?
- Should Owner setup show permission summaries or only role labels and warnings?
- What is the canonical solo-owner acknowledgement storage location?
- How should expired/auth-failed invites influence readiness status?
- Should accepted staff setup trigger dashboard prompts for role-specific next steps?
- How should invitation resend/cancel lifecycle be represented in onboarding progress?
- Should staff setup ever require activation of notification preferences before readiness?

## Phase 10A6 Lock

Phase 10A6 is documentation-only.

It defines the invite/staff setup bridge between bootstrap, onboarding, owner setup, and existing Team Access invitation infrastructure. It adds no runtime behavior, migrations, permission seeds, RLS policies, RPC edits, route changes, registry changes, UI changes, product-mode authority, module-authoritative security, Vendor/Client live surfaces, global admin escalation, or Continental-specific staff defaults.
