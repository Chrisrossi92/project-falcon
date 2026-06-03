# Falcon Permission-Scoped Surface Doctrine

## Purpose

This document defines how Falcon surfaces should be composed from role persona, owner-granted
permissions, and enabled module/product scope.

Core doctrine:

- role defines the default persona;
- permissions define actual allowed actions;
- module and product scope define which operational worlds the user can access;
- workspace context defines the active operational world and must reset stale workspace state when changed;
- owners control grants;
- admin does not automatically imply AMC access;
- the Internal Staff Appraiser Platform remains the Falcon v1 default;
- AMC Operations is v2+ and must be explicitly granted.

This doctrine is planning only. It does not implement runtime code, route changes, permission
changes, backend changes, schema changes, Supabase changes, workflow changes, AMC work, Client
Portal work, automation, AI, or production data changes.

## Owner Authority Model

Owner is the highest internal company authority.

Owner authority means:

- owners can grant and revoke company access where permission contracts allow;
- owners can grant sensitive role presets only when owner-grant permissions allow it;
- owners preserve the recovery path for the company;
- owners control whether future modules such as AMC Operations are enabled for a user or company;
- owners may delegate operational administration without delegating every module world.

Owner should not be treated as decorative metadata. Owner authority must remain permission-backed,
auditable, and protected by owner-invariant rules.

## Owner-Managed Access Model

Owner-managed access is composed from separate layers:

- primary role controls the user's default worldview, persona, and shell experience;
- additional role presets provide bundled authority without changing the primary persona by
  themselves;
- effective permissions control actions such as inviting users, updating orders, assigning roles,
  or changing workflow state;
- product/module scope controls which operational domains are visible.

Phase 1 of Owner Access Management proves only the read-only preview layer: owners can see the
effective permissions produced by selected role presets before saving role changes. It does not add
custom grants, custom revokes, direct per-member permission overrides, module enablement, shell
resolution changes, or backend permission resolver changes.

Future permission overrides must be explicit, auditable, grouped, human-readable, and safe from
unlocking hidden product modules by accident. Overrides may adjust action authority inside an
already-visible operational domain, but they must not expose AMC Operations, Assignments,
Relationships, Vendor Portal, Client Portal, or other hidden modules unless product/module scope
also allows that domain.

Role presets should prevent role explosion. Owners should first compose access from primary role
plus additional presets; direct overrides should be the exceptional precision layer, not a reason to
create many one-off roles.

Owner-protected role safeguards remain backend-authoritative. The UI may explain owner protection,
but the database/RPC layer must continue to enforce owner-grant, owner-revoke, and last-owner
invariants.

## Workspace Context Doctrine

Falcon is one platform with multiple role-native workspaces. Workspace doctrine is locked in
`docs/FALCON_WORKSPACE_DOCTRINE_NAVIGATION_ARCHITECTURE.md`.

Primary workspaces:

- Internal Operations Workspace
- AMC Operations Workspace
- future Vendor Workspace

Workspace switching is a context reset, not a table filter. When users switch between Internal Operations and AMC Operations, the runtime should clear workspace-specific filters, selections, queue state, and unsafe persisted detail context, then navigate to the target workspace dashboard and reload scoped data.

This matters because permissions can authorize broad read access while workspace context still determines which operational lane is active. A user must not see an Internal Operations order inside AMC Operations because the route persisted across a mode switch.

## Internal Staff Operations Scope

Internal Staff Appraiser Platform is the Falcon v1 default operational world.

Included v1 scope:

- internal order operations;
- staff appraiser work execution;
- review queue and revision loop;
- owner/admin operations command;
- team access where permissions allow;
- file/readiness/review context where governed reads support it;
- operational evidence that informs work without replacing workflow authority.

Internal staff operations should be available only through active company membership, appropriate
role/persona context, and the required permission gates for each surface.

## AMC Operations Scope

AMC Operations is a v2+ operational world.

The v1 AMC suppression doctrine lives in
`docs/FALCON_V1_AMC_OPERATIONAL_SURFACE_SUPPRESSION_DOCTRINE.md`.

AMC scope may eventually include:

- lender/client intake;
- vendor panel operations;
- assignment packet management;
- SLA and delivery-risk monitoring;
- AMC review/QC coordination;
- AMC analytics and network operations.

AMC surfaces must not appear simply because a user is an admin. AMC Operations requires explicit
module scope and the relevant permissions. Until those contracts are live, AMC surfaces should stay
hidden rather than appearing as disabled clutter.

Hidden AMC architecture is intentional. Multi-company relationships, assignment packet
foundations, vendor capability, and AMC workflow foundations may exist internally while remaining
suppressed from the Internal Staff Appraiser Platform. Dormant architecture must not leak into v1
navigation, dashboards, command palette entries, empty states, notification/activity labels, or
setup guidance.

AMC operational concepts should be exposed only when AMC module scope is enabled, AMC permissions
are granted, and the active operational domain intentionally renders AMC-native surfaces. Role title
alone is not enough: admin is not AMC Admin, and owner-granted admin authority inside Staff
Appraisal Mode does not automatically expose vendor panels, network assignments, client/lender
queues, SLA dashboards, or marketplace language.

## Admin With And Without AMC Permissions

Admin is an internal operational management persona, not a universal product passport.

Admin with Internal Staff scope:

- may see Operations Command where dashboard permissions allow;
- may see Team Access management where user permissions allow;
- may manage internal staff workflow surfaces where action permissions allow;
- should not automatically see AMC queues, vendor panel operations, client portal administration,
  or network dashboards.

Admin with explicit AMC scope:

- may see AMC Operations only when module scope and permissions both allow it;
- should receive AMC-native labels and dashboards, not internal staff dashboard copies;
- should keep internal staff and AMC work lanes distinct when both are enabled.

Admin without AMC scope should remain in the internal staff operational world.

## Appraiser View Expectations

Appraiser is an execution persona.

Expected appraiser surface behavior:

- default to `My Work` when the dedicated surface is available;
- prioritize assigned work, due pressure, revisions, inspections, and blockers;
- show only actions the appraiser can actually take;
- avoid owner/admin setup diagnostics;
- avoid broad management route inventory;
- avoid AMC, Client Portal, and vendor-network concepts unless explicitly scoped and permissioned.

Appraiser visibility should remain governed by assigned-work and readable-row authority. Role label
alone must not broaden order, client, assignment, or module visibility.

## Reviewer View Expectations

Reviewer is a review and clearance persona.

Expected reviewer surface behavior:

- default to `Review Queue` when available;
- prioritize work awaiting review, revision decisions, clearance context, and handoff pressure;
- show reviewer actions only when workflow/action permissions allow them;
- avoid owner/admin setup diagnostics unless the reviewer also has explicit management permission;
- avoid AMC review/QC surfaces unless AMC module scope and permissions are explicitly granted.

Reviewer visibility should remain tied to governed review assignment/read authority.

## Team Access Behavior By Permission

Team Access should adapt to permission shape.

Owner/admin management view:

- appears when user-read and management permissions allow;
- supports invitation/member/role management only when specific action permissions allow;
- preserves owner-grant and owner-revoke guardrails;
- keeps pending invitations separate from active access.

Read-only staff directory view:

- may appear when `users.read` or equivalent read permission allows;
- should show team identity and role context without mutation controls;
- should not show invite, deactivate, role-edit, or owner-management controls;
- should not imply that read access grants management authority.

Team Access should not be all-or-nothing if read-only directory access is useful, but management
controls must remain permission-scoped.

## Navigation Rules

Navigation is discoverability, not authority.

Rules:

- a nav item appears only when permission and module scope support it;
- route guards and backend/RPC/RLS authority remain authoritative;
- no AMC links appear for users without AMC scope;
- no Client Portal or Vendor Portal links appear before their module scope and live route contracts
  exist;
- no management mutation links appear for read-only users;
- hidden modules stay hidden rather than disabled;
- command palette entries follow the same permission/module-scope rules as visible navigation;
- mobile navigation should preserve the same authority boundaries as desktop navigation.

Do not use role labels alone to decide navigation visibility.

## Dashboard And Default Route Rules

Default routes should match the user's active operational world.

Recommended defaults:

- appraiser defaults to `My Work`;
- reviewer defaults to `Review Queue` when available;
- owner/admin defaults to `Operations Command`;
- assignment-only users default to assignment packet/workspace surfaces, not internal staff
  dashboards;
- users with multiple worlds should enter the most operationally relevant granted world and keep
  lane switching explicit.

Dashboard composition should come from module scope, permissions, and governed data availability.
It should not clone one dashboard across every role.

## Explicit v1 / v2 Boundary

Falcon v1:

- Internal Staff Appraiser Platform;
- daily Continental staff appraisal operations;
- appraiser work execution;
- reviewer queue/revision loop;
- owner/admin operational command;
- internal team access and setup readiness where permissioned.

Falcon v2+:

- AMC Operations;
- Vendor Portal;
- Client Portal;
- broader external network workflows;
- automation-heavy operational systems;
- AI workflow assistance.

v1 may preserve architectural hooks for v2+, but v2+ surfaces must not leak into v1 navigation,
dashboards, command palettes, or setup guidance before module scope and permission contracts exist.

## Anti-Patterns

Avoid:

- role-only UI decisions;
- assuming admin means AMC access;
- showing disabled controls as clutter;
- appraisers seeing setup diagnostics;
- reviewers seeing owner/admin setup copy without explicit management scope;
- read-only users seeing mutation controls;
- duplicate full surfaces that answer the same operational question;
- hidden future modules appearing as locked nav;
- management dashboards replacing appraiser/reviewer daily workstations;
- using permissions to imply visibility without governed data scope;
- using module scope to imply action authority without permissions.

## Falcon v1 Role-Based Surface Refinement Doctrine

Falcon v1 role surfaces should be composed from three separate decisions:

- role defines the user's worldview and default persona;
- permissions define action authority;
- product/module scope defines which operational world is visible.

These decisions must stay separate. A role can shape language, navigation priority, layout density,
and default surface selection, but it must not grant action authority. A permission can authorize
an action, but it must not expose an unrelated product world. A module/product scope can expose an
operational world, but it must not imply that every visible user can mutate it.

### Role Worldview Rules

Appraiser surfaces should feel like assigned-work execution, not company management. Appraiser
navigation, lists, order detail, drawers, and directory views should prioritize `My Work`,
`Assigned Orders`, schedule pressure, files, notes, activity, contacts, and the next allowed
execution step.

Reviewer surfaces should feel like review and quality control, not owner/admin management. Review
queues, review order detail, revision context, files, activity, and decision controls should be
framed around review readiness and permitted review action.

Admin surfaces may expose operational coordination tools, but only within granted permissions.
Admin users should see company operations, staffing, workload, scheduling, and coordination
surfaces when their permissions allow them, without automatically inheriting owner-only setup or
AMC/network worlds.

Owner surfaces can expose company setup, users, permissions, high-level operational controls, and
owner-sensitive readiness. Owner authority still remains permission-backed and should not be
treated as decorative metadata.

AMC/network concepts must not leak into Internal Staff Appraiser Platform views unless AMC scope is
explicitly enabled. Staff appraisers should not see assignment-network, vendor, panel, packet, or
AMC queue concepts simply because the architecture contains those future capabilities.

### Language And Structure Rules

Use plain operational language:

- appraiser/reviewer: `Staff Directory`, `Assigned Orders`, `My Work`;
- owner/admin: `Users`, `Operations`, `Setup`, `Management`.

Avoid redundant explanatory copy once UI structure is clear. If a surface is already framed by a
plain title, clear grouping, and obvious controls, do not add doctrine-like helper copy inside the
runtime UI.

Avoid fake navigation that redirects back to the same place. A link should represent a meaningful
surface or be hidden until the surface exists.

Drawers should provide secondary context only. They should not duplicate the row they came from or
the full detail page.

Appraiser and reviewer directory views should be read-only contact context, not access management.
Owner/admin user surfaces should remain the place for invitation, role, and access controls.

Table and list systems should be reused rather than creating weaker duplicate versions. Role-based
surfaces may provide a role-native wrapper or data subset, but should not fork lower-quality table
behavior when the established list system already answers the same operational question.

Visual polish should prioritize calm hierarchy, density, and clarity over dashboard clutter.

### Reviewer Worldview Checkpoint

The reviewer worldview pass is complete as the first post-appraiser role refinement checkpoint.

Reviewer role doctrine:

- reviewer is a quality-control and revision-coordination persona;
- reviewer surfaces should feel like review workflow, not owner/admin/company management;
- reviewer authority still comes from permissions and workflow state, not from role label alone;
- reviewer visibility remains governed by current review/order read authority;
- AMC/network operations language must not leak into reviewer Staff Appraiser Platform views.

Completed reviewer surface refinements:

- reviewer dashboard is simplified into the `Pam's Reviews` / `My Reviews` queue model;
- reviewer dashboard keeps calendar and active review work while removing duplicate KPI rails,
  operational support blocks, and explanatory management copy;
- reviewer Orders is reframed as user-specific orders rather than active operations inventory;
- reviewer Order Detail removes Attention Summary, Operational Context, review-derived summary
  blocks, file-readiness derived clutter, and passive derived messages;
- reviewer Order Detail preserves files, notes/activity, map/contact info, due/site/review dates,
  revision communication, review actions, and workflow history;
- reviewer Order Detail hides the general `Edit` action while preserving `Print Packet` and
  `Back`;
- reviewer notification leakage is corrected so pre-review appraiser notes do not alert reviewers;
- first appraiser submission language now says submitted/sent to review, while true resubmission
  language is used only after revisions;
- Smart Action button/dropdown clicks no longer open the order drawer;
- reviewer Smart Actions now apply optimistic row/status refresh after successful workflow actions.

This checkpoint does not authorize backend/schema/Supabase changes, permission model changes,
query-authority broadening, lifecycle authority changes, route migration, AMC implementation,
automation, Client Portal behavior, AI, or production data changes.

### Next-Phase Role Refinement Order

The appraiser experience and reviewer worldview are visually and structurally locked pending final
smoke testing.

Next refinement order:

1. Admin worldview.
2. Owner worldview.
3. Cross-role consistency pass.

## Implementation Guidance

Future implementation should resolve surfaces in this order:

1. Confirm active company membership.
2. Resolve enabled module/product scope.
3. Resolve effective permissions.
4. Resolve role/persona defaults.
5. Compose nav, dashboard, command, and setup surfaces from the intersection.
6. Keep route guards and backend authority unchanged.

Role is still useful, but it should provide default language, dashboard preference, and mental
model. It should not replace permission checks or module-scope checks.

## Explicit Non-Goals

This doctrine does not authorize:

- runtime implementation;
- permission seed changes;
- module setting implementation;
- route changes;
- navigation changes;
- dashboard changes;
- command palette changes;
- backend/schema/Supabase changes;
- workflow/action changes;
- AMC implementation;
- Client Portal implementation;
- Vendor Portal implementation;
- automation;
- AI work;
- production data changes.

## Validation

Validation for this doctrine:

- docs-only diff;
- `git diff --check`;
- trailing whitespace scan.
