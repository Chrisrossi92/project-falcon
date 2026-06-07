# AMC-16 Permission Center Checkpoint

Run date: 2026-06-07.

## Decision

AMC-16 is complete for the controlled-pilot Permission Center slice.

The Permission Center now gives owners/admins a guided company-scoped permission-management
experience from User Management. It explains who has access, which role/template grants that
access, which permissions are effective, what is changing, and what will be saved before the
existing company access mutation path is invoked.

AMC-16 improves administrative clarity and confidence. It does not create a dedicated backend
operation-entitlement model, legal/business separation between Internal and AMC operations, or full
white-label onboarding.

## Implemented

| Area | Result | Notes |
| --- | --- | --- |
| Read-only permission summary | Complete | Shows user identity, active operation/company context, primary role, secondary templates, and grouped effective permissions. |
| Grouped permissions | Complete | Permissions are grouped by Orders, Assignments, Vendors, Clients, Payments, Reports, Administration, and Notifications / Activity. |
| Human-readable labels | Complete | Permission keys are translated into readable names and short descriptions with safe fallbacks. |
| Source labels | Complete | Rows identify Primary role, Secondary template, Individual override, Pending change, and Not granted states. |
| Secondary templates | Complete | Edit mode allows adding/removing secondary role templates as local draft state. |
| Individual overrides | Complete | Edit mode supports individual permission add/remove overrides without parent/child category toggles. |
| Draft/review flow | Complete | Changes remain local until Review changes. Review summarizes added/removed templates, added/removed permissions, and affected categories. |
| Confirmed save flow | Complete | Save is enabled only on review with valid pending changes and requires an explicit confirmation dialog. |
| Operation/company scoping | Complete | Display and save use the current company/operation context; Permission Center does not apply global cross-operation access. |
| Self-edit warning | Complete | Self-edits show a warning before review/save. Existing backend rules remain authoritative. |
| Existing Edit Access | Preserved | The original Edit Access modal remains available and continues to use the existing mutation path. |

## Mutation Path

Permission Center save uses the existing company access service path:

```text
saveCompanyMemberAccess(...)
-> rpc_company_member_access_save(...)
-> rpc_company_member_role_update(...)
-> rpc_company_member_permission_overrides_save(...)
```

Payload shape:

```json
{
  "userId": "target app user id",
  "roleIds": ["selected role ids"],
  "primaryRoleId": "selected primary role id",
  "permissionOverrides": [
    {
      "permission_key": "orders.read.all",
      "effect": "grant"
    }
  ],
  "savePermissionOverrides": true,
  "reason": "Updated from Permission Center",
  "requestId": "client-generated idempotency id"
}
```

The RPCs remain scoped by the active company context. AMC-16 does not change role semantics,
permission keys, route guards, RLS policies, or data-access rules.

## Audit Visibility Finding

`rpc_company_member_access_save(...)` preserves the audit behavior of its existing child RPCs:

- role updates write `company.member_roles_updated` rows to `company_audit_events`;
- permission override updates write `company.member_permission_overrides_updated` rows to
  `company_audit_events`;
- the atomic access-save wrapper calls those RPCs instead of introducing a parallel write model.

`company_audit_events` is service-role-owned audit storage and is not currently exposed through an
authenticated member access history RPC or a user-management activity projection. Because no
app-readable recent-access-history source is available yet, Permission Center does not render a fake
history feed. It instead shows read-only microcopy:

```text
Changes are saved through the company access system. Detailed permission history is planned.
```

## Pilot Boundary

AMC-16 certifies:

- readable current access summaries for company members;
- grouped, human-readable permission display;
- primary role, secondary template, individual override, and pending-change source labels;
- local draft editing for secondary templates and individual permissions;
- review-before-save summaries;
- explicit confirmation before save;
- company/operation-scoped save through existing access RPCs;
- success/error handling that preserves draft state on failure;
- preservation of the existing Edit Access path.

AMC-16 does not certify:

- a dedicated backend operation-entitlement model for separate Internal and AMC ownership;
- operation-specific invitation, onboarding, or admin delegation flows;
- app-visible detailed permission history;
- legal separation between Internal Operations and AMC Operations;
- full white-label tenant onboarding or external organization administration.

## Recommended Next Phase

Recommended follow-up: design the backend operation-entitlement and permission-audit read model.

That phase should define separate Internal/AMC ownership, operation-specific admin authority,
operation-specific invitations/onboarding, and an app-readable recent access history API before
Permission Center becomes the only access mutation surface.

## Validation Target

Required validation for the checkpoint:

- Permission Center model tests;
- Users page Permission Center tests;
- operation role-scope tests;
- existing user-management/Edit Access tests;
- `npm run build`;
- `npm run lint`;
- `git diff --check`;
- `git diff --cached --check`;
- markdown lint if available.
