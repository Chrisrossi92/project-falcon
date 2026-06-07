# AMC-15 Visual Identity Checkpoint

Run date: 2026-06-07.

## Decision

AMC-15 visual environment separation is complete for controlled pilot readiness.

This checkpoint improves user clarity and business perception across Internal Operations and AMC
Operations. Internal pages now read as Continental appraisal production surfaces, while AMC pages
read as Falcon AMC management, procurement, vendor, and payment surfaces.

AMC-15 is a frontend visual-identity and page-chrome checkpoint. It does not certify full
legal/business separation, backend operation entitlements, production organization switching, or
full white-label onboarding.

## Completed Visual Identity Work

| Area | Status | Evidence |
| --- | --- | --- |
| Centralized workspace identity config | Complete | `workspaceIdentity.js` now owns Internal/AMC labels, document titles, dashboard copy, navigation labels, page chrome, and badge/accent hooks. |
| Badges and environment labels | Complete | TopNav, workspace selector, dashboard/order contexts, and order detail render explicit Continental Internal Operations or Falcon AMC identity cues. |
| Dashboard, Orders, and navigation separation | Complete | Internal uses appraisal-production language such as Client Orders, Staff Assignments, and Review Workflow. AMC uses Management Operations, Procurement, Vendor Network, Assignment Oversight, and Client Services. |
| Page chrome separation | Complete | Activity, Calendar, Clients, Vendors, Assignments, and shared Order Detail surfaces use identity-driven titles, eyebrows, badges, and descriptions. |
| Business-surface identity | Complete | Vendor Workspace payments, available-work detail, assigned-order detail, and shared order detail now clearly frame Falcon AMC payments, Vendor Invoices, procurement opportunities, and assignment oversight. |
| Route/switch isolation continuity | Complete | AMC-15 builds on AMC-14B route ownership guards, workspace switch reset/cache invalidation, notification/search/activity isolation, and Vendor Workspace route isolation without changing those behaviors. |

## Pilot Readiness Boundary

AMC-15 certifies:

- a user can quickly identify whether they are operating in Continental Internal Operations or
  Falcon AMC;
- navigation copy and page headers reduce ambiguity between internal appraisal production and AMC
  procurement/vendor/payment workflows;
- high-risk business surfaces such as payments, invoices, procurement opportunities, vendor
  assignment detail, and order detail carry explicit workspace context;
- visual identity is centralized enough for future refinements to avoid scattered hardcoded
  Internal/AMC copy;
- route behavior, workflow behavior, permissions, data access, and Vendor Workspace isolation from
  AMC-14B were not intentionally changed.

AMC-15 does not certify:

- independent legal ownership between Internal Operations and AMC Operations;
- a backend operation-membership or operation-role entitlement model;
- operation-specific onboarding, invitation, or user-management flows;
- production-grade organization switching beyond current active-company context;
- full white-label branding, tenant theming, custom domains, external vendor onboarding at scale,
  payment processor branding, or accounting export;
- a complete visual browser QA pass across every viewport and workflow.

## Known Limitation

Backend authority remains company-scoped. AMC-15 makes the selected environment visibly clearer, but
it does not create server-side operation entitlements. Scenarios such as one person owning Internal
Operations while a different person owns AMC Operations still require a future backend
permission/onboarding project.

The current visual identity system should be treated as a presentation layer over the existing
workspace and company model, not as proof of legal or backend business separation.

## Recommended Next Phase

AMC-16 should be the Permission Center phase.

Recommended scope:

- define the operation entitlement model needed for separate Internal/AMC ownership and authority;
- expose clear permission-center UI for owner/admin/coordinator/appraiser/vendor/client boundaries;
- separate operation-specific invitation and user-management behavior from global company
  assumptions;
- preserve current Continental demo behavior while introducing explicit backend-backed operation
  access where available;
- add migration, RLS/RPC, and frontend permission tests before claiming deeper business separation.

## Validation Summary

Validation completed during AMC-15 implementation:

- workspace identity tests;
- WorkspaceBadge tests;
- TopNav/workspace selector tests;
- affected navigation/layout tests;
- affected Activity, Calendar, Clients, Vendors, Assignments, Orders, Order Detail, and Vendor
  Workspace tests;
- route guard and route composition tests;
- Vendor Workspace API tests;
- `npm run build`;
- `npm run lint`;
- `git diff --check`.

Known validation warnings remain unchanged:

- lint passes with existing unrelated warnings;
- build passes with existing Vite large-chunk warning;
- build passes with existing Tailwind ambiguous `ease-[${EASING}]` warning.

## Related Checkpoints

- [AMC-14B Workspace Isolation Checkpoint](./AMC_14B_WORKSPACE_ISOLATION_CHECKPOINT.md)
- [AMC-14B Workspace Data Isolation Audit](./AMC_14B_WORKSPACE_DATA_ISOLATION_AUDIT.md)
- [AMC-14B Operation Role Scope Audit](./AMC_14B_OPERATION_ROLE_SCOPE_AUDIT.md)
