# Owner Setup Product Polish Handoff

## Purpose

Phase 10H6 closes the Owner Setup product polish arc.

This is documentation-only plus read-only inspection. It does not add runtime code, migrations, backend behavior changes, route changes, registry changes, UI changes, tests, setup writes, onboarding authority, readiness authority, blocking gates, product-mode/module authority, Vendor/Client activation, order-numbering configuration, notification-default configuration, branding configuration, or broad settings writes.

## Sources Inspected

Docs inspected:

- `docs/OWNER_SETUP_LAYOUT_POLISH_DESIGN.md`
- `docs/OWNER_SETUP_UI_SHELL_CONTRACT.md`
- `docs/COMPANY_SETUP_LIVE_READONLY_HANDOFF.md`
- `docs/OWNER_SETUP_ACTIONABLE_FOUNDATION_HANDOFF.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Runtime inspected:

- `src/pages/admin/OwnerSetup.jsx`

## Completed 10H Work

Phase 10H completed Owner Setup product polish without changing authority behavior:

- 10H1 designed grouped layout, card vocabulary, status labels, and copy rules.
- 10H2 implemented grouped Owner Setup sections and normalized status labels.
- 10H3 mapped safe live readiness diagnostics into selected card badges.
- 10H4 improved deferred-card presentation with consistent `Planned later` explanations.
- 10H5 made readiness summaries more owner-readable while keeping raw diagnostics secondary.
- 10H6 closes the phase with this handoff.

## Current Owner Setup UX

Current route and guard:

- `/settings/owner-setup`
- guarded by existing `settings.view`
- discoverable through the existing Settings utility link and dashboard prompt behavior

Current data behavior:

- consumes `useCompanySetupContext()`
- feeds live context into `resolveCompanyReadiness(...)`
- preserves a static sample fallback
- keeps readiness diagnostic-only
- keeps setup progress non-authoritative

Current write behavior:

- Company Profile is the only actionable setup card.
- Company Profile updates only `name`, `timezone`, and `locale`.
- Profile saves use the guarded profile update path and refetch setup context after success.
- No other setup card writes anything.

## Current Card Inventory

| Card | Current state | Behavior | Notes |
|---|---|---|---|
| Company Profile | Actionable / `Available` | Edits `name`, `timezone`, and `locale` only | Only setup write path |
| Owner Profile | Diagnostic / `Coming later`, `Ready`, or `Needs attention` | Reads owner presence and active membership diagnostics | No owner profile write model yet |
| Basic Settings | `Deferred` | Non-actionable with `Planned later` explanation | Waiting on narrow settings storage/security contract |
| Order Numbering | `Deferred` | Non-actionable with `Planned later` explanation | Configuration remains deferred even after order-numbering safety work |
| Workflow Assumptions | `Diagnostic only` | Non-actionable guidance | No workflow authority changes |
| Team / Staff Invitations | `Coming later` or readiness-based `Ready` | Reads invitation/staff readiness diagnostics when available | No invite submission from Owner Setup |
| Role Review | Diagnostic / `Ready` or `Needs attention` | Reads role preset and owner role assignment diagnostics | No role assignment mutation from Owner Setup |
| Notification Preferences | `Deferred` | Non-actionable with `Planned later` explanation | Company defaults remain unimplemented |
| Branding | `Deferred` | Non-actionable with `Planned later` explanation | Storage/upload/security design still required |
| Readiness Checklist | `Diagnostic only` | Shows owner-readable counts plus secondary resolver details | Not onboarding state and not permission authority |

## Current Safety Boundaries

Owner Setup still must not:

- grant access;
- deny access;
- become a blocking gate;
- persist onboarding completion;
- call bootstrap wrappers from browser code;
- mutate broad company settings;
- mutate order-numbering configuration;
- mutate notification defaults;
- mutate branding or upload logo assets;
- activate Vendor/Client shells;
- create product-mode/module authority;
- replace permissions, route guards, RLS, RPC guards, workflow guards, assignment visibility, or company membership checks.

Canonical runtime authority remains in permissions, route guards, RLS/RPCs, workflow rules, assignment packet visibility, and active company membership.

## Recommended Next Phase Options

### Option A - Owner Profile Narrow Model

Design a narrow owner profile read/write model for setup attribution and display identity.

Use this only after deciding which owner fields are canonical and whether they belong to user settings, company membership metadata, or a future owner setup projection.

### Option B - Team/Staff Setup Bridge

Bridge Owner Setup to existing Team Access and invitation flows.

This should remain a guided link or read-only summary first. Do not submit invitations directly from Owner Setup until a narrow setup-specific contract exists.

### Option C - Route-Level Browser Smoke

Run product-level browser smoke across the recently hardened flows:

- Owner Setup load and profile save.
- Order create.
- Order edit.
- Site visit update.
- Status transition.
- Order-number override.

This is valuable after Phase 10G's direct-write RLS restriction because UI tests and SQL smoke passed, but route-level browser behavior has not been locked in this handoff.

### Option D - Company Onboarding Storage/State Design

Return to onboarding storage/state design if durable setup progress is needed.

This must preserve the doctrine that readiness is guidance and cannot become permission authority.

### Option E - Notification Defaults Or Branding Storage Design

Continue later with company notification-default storage or branding storage/upload design.

Both remain deferred until backend/storage/security contracts are clearer.

## Recommended Default Next Step

Recommended default next step: Option C, route-level browser smoke validation.

Reason:

Phase 10G changed direct `orders` write RLS and Phase 10H polished Owner Setup. Before adding more onboarding/product setup features, Falcon should validate runtime UX across the important routed flows that now depend on guarded RPC paths and the polished setup page.

Suggested smoke scope:

- load `/settings/owner-setup`;
- update Company Profile with live context;
- create an order;
- edit an order;
- update site visit;
- transition status;
- override order number through explicit flow;
- confirm no direct-write/RLS regression appears in normal UI.

## Do Not Do Next

Do not use the next phase to:

- make Owner Setup a blocking gate;
- add readiness authority;
- persist onboarding completion without a separate storage model;
- wire order-numbering configuration;
- wire notification-default configuration;
- wire branding upload/configuration;
- add broad company settings writes;
- activate Vendor/Client shells;
- call bootstrap wrappers from browser code;
- use card status as permission or routing authority.

## Handoff Lock

Phase 10H is complete through productized Owner Setup polish.

Owner Setup is now clearer, grouped, status-aware, and owner-readable, with one narrow guarded write card and all other cards diagnostic, coming-later, or deferred. It is not full onboarding, not a setup gate, and not an authority surface.

## 10I1 Follow-Up

Phase 10I1 created `docs/ROUTE_LEVEL_BROWSER_SMOKE_PLAN.md` as the route-level browser smoke checklist for Owner Setup and the primary RPC-backed order flows. The plan is documentation-only and marks smoke planning complete; browser execution remains the next step before more product work.

## 10J1 Follow-Up

Phase 10J1 created `docs/OWNER_SETUP_TEAM_STAFF_BRIDGE_DESIGN.md` as the design for
bridging the Owner Setup Team / Staff Invitations card to existing Team Access.

The recommended bridge is navigation-only: show `Open Team Access` or `Manage team access`
when the current user has likely `/users` visibility through existing `users.read` permission,
and link to `/users`. Owner Setup should not embed the invite form, submit invitations, call
new RPCs or Edge Functions, add permissions, bypass route guards, activate staff, or treat
team setup readiness as authority.

## 10J2 Follow-Up

Phase 10J2 implemented the Owner Setup Team Access bridge in `src/pages/admin/OwnerSetup.jsx`.
The Team / Staff Invitations card now renders one `Open Team Access` link to `/users` only
when existing `users.read` visibility is allowed. The card remains non-writing when the
permission is unavailable.

Invitation submission, invitation lists, member lists, invite/resend/cancel actions, role
editing, and member status changes remain inside Team Access. No backend writes, new RPCs,
new permissions, route guard changes, product-mode/module authority, Vendor activation, or
Client activation were added from Owner Setup.

## 10J3 Follow-Up

Phase 10J3 closes the Team / Staff bridge slice in
`docs/OWNER_SETUP_TEAM_STAFF_BRIDGE_HANDOFF.md`.

Phase 10J is complete through design, implementation, and closeout. The bridge is now a
small permission-aware launcher to `/users`, not an onboarding state model and not a new
invitation surface. Recommended next default is either a focused Team Access route smoke from
the Owner Setup bridge when confidence is needed, or Owner Profile diagnostic / identity
polish when product momentum is preferred.
