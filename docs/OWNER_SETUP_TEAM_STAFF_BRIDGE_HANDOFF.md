# Owner Setup Team / Staff Bridge Handoff

## Purpose

Phase 10J3 closes the Team / Staff bridge slice and records the next Owner Setup /
onboarding improvement decision.

This is documentation-only plus read-only inspection. It does not add runtime code,
migrations, backend behavior changes, routes, registries, UI, tests, permissions, RLS, RPCs,
setup writes, invitation writes, staff activation, product-mode authority, module authority,
Vendor activation, or Client activation.

## Sources Inspected

- `docs/OWNER_SETUP_TEAM_STAFF_BRIDGE_DESIGN.md`
- `docs/OWNER_SETUP_PRODUCT_POLISH_HANDOFF.md`
- `docs/OWNER_SETUP_UI_SHELL_CONTRACT.md`
- `docs/IMPLEMENTATION_ROADMAP.md`
- `src/pages/admin/OwnerSetup.jsx`

## Bridge Behavior

Phase 10J2 implemented the Team / Staff bridge as a navigation-only Owner Setup action:

- The Team / Staff Invitations card remains in the Operations Setup group.
- The card copy points users to the existing guarded Team Access workflow.
- Owner Setup checks existing `PERMISSIONS.USERS_READ` visibility through the current
  permission helper.
- When `users.read` is allowed, the card renders one `Open Team Access` link.
- The link target is `/users`.
- When `users.read` is not allowed, the card remains informational.
- The card keeps its existing readiness/status mapping.
- Company Profile remains the only Owner Setup write card.

## Permission And Route Guard Behavior

Existing Team Access route:

- `/users`
- guarded by `PERMISSIONS.USERS_READ` / `users.read`

The bridge does not replace that guard. It only suppresses the launcher when the same route
visibility is unavailable from the current permission helper. If the launcher ever appears
incorrectly, the `/users` route guard remains authoritative.

Team Access remains responsible for invite and member-management action permissions:

- invitation management visibility stays inside Team Access;
- invite send remains behind the existing Team Access permission combination;
- member role/status actions remain behind existing Team Access checks and backend RPCs;
- Owner-role invitations remain protected by backend Owner-grant rules.

## Safety Boundaries

Owner Setup does not:

- submit invitations;
- list invitations;
- list members;
- resend or cancel invitations;
- activate, deactivate, or reactivate staff;
- assign or edit roles;
- call company-member invitation RPCs;
- call invite/resend Edge Functions;
- add permissions;
- bypass route guards;
- persist onboarding completion;
- use card readiness as authority;
- create product-mode or module authority;
- activate Vendor or Client surfaces.

Canonical runtime authority remains in permissions, route guards, RLS, security-definer RPCs,
Edge Functions where applicable, active company membership, and Team Access action checks.

## Current Owner Setup Inventory

| Card | Current behavior | Actionability |
| --- | --- | --- |
| Company Profile | Edits company `name`, `timezone`, and `locale` through the guarded profile update path. | Only write card |
| Owner Profile | Diagnostic owner presence / active owner membership guidance. | Non-writing |
| Basic Settings | Deferred with `Planned later` copy. | Non-actionable |
| Order Numbering | Deferred with company-safe numbering configuration held for future backend design. | Non-actionable |
| Workflow Assumptions | Diagnostic guidance only. | Non-writing |
| Team / Staff Invitations | Permission-aware link to `/users` when `users.read` is available. | Navigation-only |
| Role Review | Diagnostic role preset / owner role assignment guidance. | Non-writing |
| Notification Preferences | Deferred until company notification-default storage and policy rules exist. | Non-actionable |
| Branding | Deferred until branding storage, upload, and security rules exist. | Non-actionable |
| Readiness Checklist | Diagnostic live/sample readiness summary. | Non-writing |

## Recommended Next Onboarding Options

### Option A - Owner Profile Diagnostic / Identity Polish

Polish the Owner Profile card and identity diagnostics without adding broad profile authority.
This is a good next step because browser smoke recorded a nonblocking owner profile lookup
HTTP 403. A focused phase can decide whether the issue belongs to profile lookup policy,
current-user settings projection, company membership metadata, or simply display fallback copy.

### Option B - Team Access Route Smoke From Bridge

Run a small browser smoke from `/settings/owner-setup` through the `Open Team Access` link
to `/users`.

Suggested checks:

- user with `settings.view` and `users.read` sees the bridge link;
- link opens `/users`;
- `/users` loads Team Access;
- user without `users.read` does not see the bridge link;
- direct `/users` still respects its existing route guard;
- invitation actions remain available only from Team Access when existing action permissions
  allow them.

### Option C - Company Onboarding Persistence Design

Design durable setup/onboarding state only if product requirements need saved progress,
resume state, explicit acknowledgements, or package-specific setup milestones. This must
preserve the rule that onboarding state is guidance and cannot become permission authority.

### Option D - Basic Settings Narrow Contract Design

Design a narrow company settings contract for one or more basic defaults. This should avoid
broad `companies.settings` editing and should define storage, validation, permission, audit,
and rollback behavior before any Owner Setup write is added.

### Option E - Notification Defaults Or Branding Storage Design Later

Continue later with company notification-default or branding/storage design. Both remain
deferred until backend/storage/security contracts are clearer.

## Recommended Default Next Step

If confidence in the new bridge is needed, run Option B: Team Access route smoke from the
Owner Setup bridge.

If product momentum is preferred and another smoke pass is not necessary, run Option A:
Owner Profile diagnostic / identity polish. This is the better default product improvement
because the owner profile lookup HTTP 403 remains the only known nonblocking observation from
the route-level smoke work.

## 10J Closeout

Phase 10J is complete through 10J3.

Completed:

- 10J1 designed the Team / Staff bridge.
- 10J2 implemented the bridge as a permission-aware link to `/users`.
- 10J3 closes the slice and records next-step options.

The bridge is intentionally small: it connects Owner Setup to existing Team Access without
moving invitation or member-management behavior into Owner Setup and without changing backend,
permission, route, RLS, or RPC authority.
