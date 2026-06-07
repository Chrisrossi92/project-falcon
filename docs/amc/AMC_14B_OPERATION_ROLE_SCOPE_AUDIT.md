# AMC-14B Operation Role Scope Audit

Run date: 2026-06-07.

## Scope

Audited operation ownership and role-scope boundaries for users who can belong to multiple Falcon
operations with different roles.

Surfaces reviewed:

- `company_memberships`
- `user_role_assignments`
- active permission helper wrappers
- `rpc_current_user_app_context()`
- company member list, role update, access-save, invitation, and permission override RPCs
- TopNav workspace selector / operations mode availability
- protected route role checks that consume active permissions and current workspace mode

## Result

Company-level authority is scoped to `current_company_id()`:

- active permission checks call
  `current_app_user_permission_keys_for_company(public.current_company_id())`;
- current user app context reads `user_role_assignments` for the resolved active company;
- user-management list and mutation RPCs target only current-company memberships;
- invitation prepare/finalize paths write membership and role assignment rows for the current
  company only.

The remaining model gap is operation-specific entitlement inside a single company context. Falcon
does not yet have a dedicated operation-membership table that can express "Owner in Internal,
Admin in AMC" independently inside one company record. Until that backend model exists, the
workspace selector must not convert owner/admin authority into access for every operation when an
explicit operation entitlement is present.

## Change

Added a central operation-access resolver for the shell:

- explicit operation metadata from app context is authoritative when present;
- AMC-only entitlement no longer receives Internal automatically;
- Internal-only entitlement blocks AMC even for an owner/admin with `vendors.read`;
- legacy fallback is preserved for current Continental demo behavior when no explicit operation
  metadata exists.

Supported explicit metadata shapes:

- `available_operations_modes` / `availableOperationsModes`
- `operations_modes` / `operationsModes`
- `operation_access` / `operationAccess`
- `operations_access` / `operationsAccess`

## Follow-Up

A future backend slice should introduce an operation entitlement source in the app context, backed
by server-side membership/role records. That model should represent operation ownership and admin
authority independently from company-level membership and should remain compatible with users who
have no access to one operation but owner/admin access to another.
