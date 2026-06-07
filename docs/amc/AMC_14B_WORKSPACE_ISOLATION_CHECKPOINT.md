# AMC-14B Workspace Isolation Checkpoint

Run date: 2026-06-07.

## Decision

AMC-14B workspace isolation hardening is complete for controlled pilot readiness.

This checkpoint certifies route, shell, selected-workspace state, secondary UI surfaces, and
current-company data-access boundaries for the current AMC pilot architecture. It does not certify
full legal/business separation between Internal Operations and AMC Operations inside one company
record because Falcon does not yet have a dedicated backend operation-entitlement model.

## Hardened Slices

| Area | Status | Evidence |
| --- | --- | --- |
| Order detail workspace isolation | Complete | Order Detail now fails closed for wrong workspace state and tests cover Internal/AMC detail isolation. |
| Route ownership guard foundation | Complete | Protected routes can declare workspace ownership and wrong-workspace deep links redirect to `/dashboard` with replace navigation before unsafe pages render. |
| Expanded route guard coverage | Complete | Orders, AMC procurement/bid/assignment, payments/invoices, clients, dashboard, and obvious internal/admin routes were added to centralized guard coverage. |
| Workspace switch reset/cache invalidation | Complete | Internal/AMC switches navigate to `/dashboard` with `replace: true`, clear order filters/search, clear workspace-scoped storage, emit invalidation, and preserve auth/session. |
| Notification/activity/search/command palette isolation | Complete | Notifications, unread counts, activity links, command palette entries, and search/recent surfaces are scoped to the selected workspace and refresh/clear on workspace switch. |
| Data/RLS/view security audit | Complete | Shared order projections were restored to caller/RLS semantics, and high-risk RPC/table families were audited for `current_company_id()` and `operations_scope` boundaries. |
| Operation role-scope audit | Complete with explicit limitation | Active permissions and app context roles resolve through current-company role assignments. The shell now honors explicit operation access metadata when present. Backend operation-entitlement records remain future work. |

## Pilot Readiness Boundary

AMC-14B certifies:

- wrong workspace route access does not render stale Internal or AMC pages;
- selected workspace changes reset unsafe UI state and avoid unsafe deep-link history;
- secondary surfaces do not bypass workspace isolation;
- Vendor Workspace remains isolated from shared `/orders` and internal data paths;
- current-company permissions, app context, user management, invitations, and audited AMC RPCs remain company-scoped;
- order and dashboard query wrappers continue to pass selected `operations_scope`;
- existing Continental demo behavior is preserved when explicit backend operation metadata is not present.

AMC-14B does not certify:

- independent legal ownership between Internal and AMC inside the same company record;
- a backend operation-membership/operation-role table;
- operation-specific onboarding or invitation workflows;
- production-grade organization switching beyond current active-company context;
- external payment processing, accounting export, production data migration, or broad visual browser QA.

## Known Limitation

Backend authority is company-scoped today. A future backend/onboarding/permissions project should
introduce operation entitlements that can express scenarios such as:

- Owner in Internal Operations, Admin in AMC Operations;
- Admin in Internal Operations, no AMC access;
- Owner in AMC Operations, no Internal access;
- different owners for Internal Operations and AMC Operations under the same platform login family.

AMC-14B deliberately does not add that backend model. It prevents the current UI and route surfaces
from assuming global ownership when explicit operation metadata is present and documents the model
gap for a future deeper slice.

## Validation Summary

Validation completed during AMC-14B:

- focused Order Detail and Orders tests;
- route guard tests;
- TopNav/workspace selector tests;
- notification and secondary-surface tests;
- operation access/provider tests;
- static DB/RPC/RLS audit tests;
- user-management role-scope tests;
- affected AMC procurement/payment/order tests;
- `npm run build`;
- `npm run lint`;
- `git diff --check`.

Known validation warnings remain unchanged:

- lint passes with existing unrelated warnings;
- build passes with existing Vite large-chunk warning;
- build passes with existing Tailwind ambiguous `ease-[${EASING}]` warning.

## Related Audit Docs

- [AMC-14B Workspace Data Isolation Audit](./AMC_14B_WORKSPACE_DATA_ISOLATION_AUDIT.md)
- [AMC-14B Operation Role Scope Audit](./AMC_14B_OPERATION_ROLE_SCOPE_AUDIT.md)
