# AMC-16 Permission Center Foundation

Run date: 2026-06-07.

## Decision

AMC-16 starts with a read-only Permission Center foundation.

This slice does not replace governed role mutation RPCs and does not introduce new permission
mutation flows. It creates the model and UI architecture needed for owners/admins to understand
who has access, which role/template grants access, which permissions are effective, and where
individual overrides exist before a future guided save flow is added.

## Current Permission Model Findings

Current backend authority is company-scoped:

- active user authority resolves through `public.current_company_id()`;
- users gain access through `company_memberships`;
- roles are assigned through `user_role_assignments` scoped to `company_id` and `user_id`;
- role presets live in `roles`;
- role-to-permission grants live in `role_permissions`;
- direct permission checks use current-company helper wrappers such as
  `current_app_user_has_permission(...)`;
- user management reads and mutations are RPC-backed and scoped to current company membership;
- invitation prepare/finalize flows create company-scoped pending access and role assignment rows;
- explicit backend operation entitlements for separate Internal/AMC ownership do not exist yet.

Current frontend authority display:

- Users page lists current-company members only.
- Member cards show active role labels, primary role, status, owner/admin indicators, and access
  summary.
- Existing `Edit Access` modal supports role preset changes and V1-safe individual permission
  overrides.
- Existing edit flow is governed by backend RPCs and remains the only mutation path in this slice.

## Permission Center Architecture

The first Permission Center foundation introduces:

- a reusable permission-center model;
- human-readable permission labels and fallback descriptions;
- business-category grouping:
  - Orders;
  - Assignments;
  - Vendors;
  - Clients;
  - Payments;
  - Reports;
  - Administration;
  - Notifications / Activity;
- source labels for:
  - Primary role;
  - Secondary role/template;
  - Primary or secondary role/template;
  - Individual override;
  - Not granted;
- operation context display using the active Internal/AMC workspace identity.

The read-only Permission Center intentionally avoids parent/child toggle conflicts. It does not
present editable parent category toggles or duplicated permission switches. Categories are
collapsible summaries with clear counts and row-level source labels.

## Safe Entry Point

The safest current entry point is the existing Users page:

```text
User Management
-> Select member card
-> Permission Center
-> Read current access summary
```

This entry point is safe because:

- it already loads current-company members through governed RPCs;
- it already has role/permission preview APIs used by the existing edit modal;
- it can display permission detail without changing workflows, routes, permissions, or data access;
- mutation remains isolated to the existing `Edit Access` modal.

## Read-Only Scope In This Slice

Read-only now:

- user identity;
- active operation/company scope label;
- primary role;
- secondary role/template summary;
- grouped effective permissions;
- source labels;
- override markers;
- category counts.

Still editable only through the existing governed edit path:

- role assignment changes;
- primary role changes;
- individual V1-safe permission overrides;
- save/confirmation behavior.

Deferred until the display model is proven:

- guided role/template application flow;
- advanced customize-permissions flow;
- review changes step;
- explicit confirm-save step;
- success/revert audit panel;
- backend operation-entitlement mutation.

## Operation Scope Rule

Permission Center displays are scoped to the active operation/company context. A user may appear
with different roles in Internal and AMC if the current backend/app context supplies different
current-company or operation-scoped metadata.

AMC-16 foundation does not assume one owner controls both Internal and AMC. It displays the active
operation identity and relies on the current company/operation context supplied by the shell and
backend RPCs.

## Next Implementation Slices

Recommended AMC-16 sequence:

1. Add read-only Permission Center summaries for the current member set. Complete in this slice.
2. Add guided review-changes state for role/template changes.
3. Add confirm-save before calling existing governed RPCs.
4. Add success state with clear audit/revert guidance.
5. Design backend operation entitlements for separate Internal/AMC ownership and authority.
6. Add operation-specific invitation/user-management flows after entitlement schema is explicit.

## Validation Target

Required validation for the foundation:

- permission-center model tests;
- Users page Permission Center rendering tests;
- existing user-management tests;
- operation role-scope audit tests;
- route guard tests if touched;
- `npm run build`;
- `npm run lint`;
- `git diff --check`.
