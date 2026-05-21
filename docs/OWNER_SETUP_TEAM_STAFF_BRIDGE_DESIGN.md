# Owner Setup Team / Staff Bridge Design

## Purpose

Phase 10J1 designs a safe Owner Setup bridge from the Team / Staff Invitations card to
the existing Team Access route and functionality.

This is documentation-only plus read-only inspection. It does not add runtime code,
migrations, backend behavior changes, routes, registries, UI, tests, permissions, RLS, RPCs,
setup writes, invitation writes, product-mode authority, module authority, Vendor activation,
or Client activation.

## Sources Inspected

Runtime and tests:

- `src/pages/admin/OwnerSetup.jsx`
- `src/pages/admin/__tests__/OwnerSetup.test.jsx`
- `src/routes/index.jsx`
- `src/pages/admin/UsersIndex.jsx`
- `src/features/company-invitations/CompanyInvitationsPanel.jsx`
- `src/features/company-invitations/InviteCompanyMemberModal.jsx`
- `src/features/company-invitations/api.js`
- `src/features/company-members/api.js`
- `src/components/shell/TopNav.jsx`
- `src/lib/navigation/currentNavigationRegistry.js`
- `src/lib/permissions/constants.js`

Docs:

- `docs/OWNER_SETUP_PRODUCT_POLISH_HANDOFF.md`
- `docs/INVITE_STAFF_SETUP_BRIDGE_CONTRACT.md`
- `docs/OWNER_SETUP_UI_SHELL_CONTRACT.md`
- `docs/FALCON_PERMISSION_MATRIX.md`
- `docs/FALCON_MODULE_REGISTRY.md`
- `docs/MULTI_COMPANY_OPERATIONAL_ARCHITECTURE.md`
- `docs/SCHEMA_DEPRECATION_TRACKER.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

## Existing Team Access Route And Guard

Current route:

- `/users`

Current route guard:

- `ProtectedRoute requiredPermission={PERMISSIONS.USERS_READ}`
- canonical permission string: `users.read`

Current redirect behavior:

- `/users/:userId` redirects to `/users`
- `/users/new` redirects to `/users`
- `/users/view/:userId` redirects to `/settings`

Current Team Access page:

- `src/pages/admin/UsersIndex.jsx`
- page heading: `Team Access`
- lists current-company members through `rpc_company_member_list(...)`
- lists invitations through `rpc_company_member_invitations_list(...)`
- sends invitations through the `invite-company-member` Edge Function
- cancels invitations through `rpc_company_member_invitation_cancel(...)`
- resends invitations through the `resend-company-member-invite` Edge Function
- updates member roles/status through company-member RPCs

Current action permission model:

- Route/list visibility: `users.read`
- Invitation management visibility: `users.invite` plus `users.manage_company_access`
- Send invitation action: `users.invite` plus `users.manage_company_access` plus `roles.assign`
- Owner-role invitations remain protected by backend Owner-grant checks.

The Owner Setup bridge must rely on this existing Team Access route and its existing guards.
It must not duplicate the invite form, re-check raw role authority, or infer action authority
from setup readiness.

## Existing Owner Setup Card

Current card:

- Title: `Team / Staff Invitations`
- Group: `Operations Setup`
- Current description: `Use Team Access when staff invitation setup is ready.`
- Base status: `Coming later`
- Readiness keys: `invitation_pipeline`, `staff_readiness`
- Ready status: `Ready`
- Attention status: `Coming later`

Current behavior:

- The card is non-writing.
- The card can show readiness-derived `Ready` when invitation and staff readiness summaries pass.
- The card does not submit invitations.
- The card does not mutate memberships, role assignments, invitations, onboarding state, product
  modes, modules, Vendor surfaces, or Client surfaces.

## Bridge Design

The bridge should be a navigation handoff only.

Recommended 10J2 behavior:

- Keep the Team / Staff Invitations card inside Owner Setup.
- Keep Owner Setup non-writing for this card.
- If the current user has likely Team Access route visibility, show one action:
  - `Open Team Access`
  - acceptable alternate label: `Manage team access`
- The action should navigate to `/users`.
- The action should not open an invite modal inside Owner Setup.
- The action should not call invitation RPCs, Edge Functions, member RPCs, or role RPCs from Owner
  Setup.
- The `/users` route should remain responsible for enforcing `users.read`.
- Team Access should remain responsible for deciding whether invite, cancel, resend, role, or member
  status actions are visible and allowed.

Recommended visibility check:

- Prefer the same permission the route uses: `PERMISSIONS.USERS_READ`.
- If the current Owner Setup runtime can use the existing permission hook without new backend calls,
  show the bridge only when `users.read` is allowed.
- If route visibility cannot be determined cheaply, leave the card informational rather than
  showing a link that predictably lands on a guard failure.
- Do not use readiness status as the link authority.

## Copy And Status Guidance

Recommended card copy:

- Description: `Open Team Access to manage company members and invitations through the existing guarded team workflow.`
- Link/action label: `Open Team Access`
- If no route visibility is available: keep informational copy such as `Team Access handles company members and invitations when your permissions allow it.`

Recommended status behavior:

- Keep readiness mapping unchanged:
  - `Ready` when `invitation_pipeline` and `staff_readiness` pass.
  - `Coming later` when those signals are absent or not passing.
- Do not introduce a new status solely because the link is visible.
- Do not label the card as complete, unlocked, activated, or access-granting.
- Do not treat opening Team Access as setup completion.

## Permission And Guard Preservation

The bridge preserves permissions by making Owner Setup a launcher only:

- Owner Setup may show a link based on `users.read`.
- The `/users` route keeps its `users.read` guard.
- Team Access keeps its existing action checks for invitations, role assignment, and member access.
- Backend RPCs and Edge Functions remain the authority for invitation and membership writes.
- Pending invitation state remains non-authoritative until authenticated acceptance activates the
  membership and invitation-scoped role assignments.

If the Owner Setup link is shown incorrectly, the route guard must still win.

## No-Go Rules

Do not implement any of the following in Owner Setup:

- Invitation submission.
- Invite resend or cancel.
- Member activation, deactivation, or reactivation.
- Role assignment or role editing.
- New RPC calls for the Team / Staff Invitations card.
- New Edge Function calls for the Team / Staff Invitations card.
- New permissions.
- Route guard bypass.
- Automatic staff activation.
- Onboarding-complete persistence.
- Product-mode or module authority.
- Vendor activation.
- Client activation.
- Direct frontend table reads or writes for members, invitations, roles, or role assignments.
- Service-role behavior in browser code.

## What Should Not Be Implemented In 10J2

10J2 should not:

- embed `InviteCompanyMemberModal` inside Owner Setup;
- list invitations inside Owner Setup;
- list members inside Owner Setup;
- introduce a setup-specific invite wrapper;
- create a solo-owner acknowledgement model;
- persist team setup progress;
- add dashboard prompts;
- change navigation labels or route registry entries;
- change Team Access permissions or action checks;
- change invitation/membership/role RPCs or Edge Functions.

Those may be separate future phases if product requirements justify them.

## Recommended 10J2 Implementation

Implement a narrow Owner Setup UI change only:

1. Add metadata to the Team / Staff Invitations card for the existing Team Access route.
2. In `OwnerSetup.jsx`, detect whether the current user can see Team Access using existing
   permission state for `PERMISSIONS.USERS_READ`.
3. Render one link/action on the Team / Staff Invitations card when that permission is allowed.
4. Point the action to `/users`.
5. Preserve Company Profile as the only write card.
6. Preserve all existing readiness/status mapping.
7. Update Owner Setup tests to verify:
   - the bridge link appears when `users.read` is allowed;
   - the bridge link is absent when `users.read` is not allowed;
   - no invite form appears in Owner Setup;
   - Company Profile still uses only the guarded profile update path;
   - deferred cards remain non-actionable.

No backend changes are recommended for 10J2.

## Validation Recommended For 10J2

Because 10J2 should be frontend-only, recommended validation is:

- targeted Owner Setup tests;
- `npm run lint`;
- `npm run build`;
- `git diff --check`.

Manual smoke should verify:

- user with `settings.view` and `users.read` sees `Open Team Access` and reaches `/users`;
- user with `settings.view` but without `users.read` does not see the bridge link;
- direct `/users` access still respects the existing route guard;
- invitation submission remains available only from Team Access when existing action permissions allow it.

## 10J1 Decision

Phase 10J1 is complete as design-only. The safe bridge is a permission-aware link from the
Owner Setup Team / Staff Invitations card to `/users`, not an embedded invite flow and not a
new authority surface.

## 10J2 Implementation Update

Phase 10J2 implemented the bridge as a narrow Owner Setup UI change:

- `src/pages/admin/OwnerSetup.jsx` now marks the Team / Staff Invitations card as the Team
  Access bridge card.
- The card description points owners to the existing guarded Team Access workflow.
- Owner Setup checks existing `PERMISSIONS.USERS_READ` visibility with the current permission
  helper.
- When `users.read` is allowed, the card renders one `Open Team Access` link to `/users`.
- When `users.read` is not allowed, the card remains informational.
- Readiness/status mapping stays unchanged.
- Company Profile remains the only Owner Setup write card.

10J2 did not add invitation submission from Owner Setup, invite forms, member lists,
invitation lists, new RPC calls, Edge Function calls, permissions, route guards, migrations,
backend behavior, RLS changes, staff activation, product-mode authority, module authority,
Vendor activation, or Client activation.

Tests were updated in `src/pages/admin/__tests__/OwnerSetup.test.jsx` to cover link visibility,
link target, absence without `users.read`, absence of invite UI in Owner Setup, and preservation
of the existing write boundaries.

## 10J3 Closeout

Phase 10J3 closes the bridge slice in `docs/OWNER_SETUP_TEAM_STAFF_BRIDGE_HANDOFF.md`.

Phase 10J is complete through design, implementation, and closeout. The bridge remains a
permission-aware navigation handoff to `/users`; invitation and member-management behavior
remain inside Team Access. Recommended next options are Team Access route smoke from the
bridge if confidence is needed, or Owner Profile diagnostic / identity polish if product
momentum is preferred.
