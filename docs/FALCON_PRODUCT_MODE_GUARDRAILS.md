# Falcon Product Mode UX Guardrails

## Purpose

This document defines Falcon's canonical product-mode UX guardrails and anti-patterns before implementation begins.

It is planning documentation only. It does not change source code, route configuration, navigation components, dashboard components, command palette behavior, permission seeds, database migrations, billing logic, onboarding enforcement, company settings, or tenant/module/package runtime behavior.

Reference docs:

- `docs/FALCON_PRODUCT_MODE_COMPOSITION.md`
- `docs/FALCON_NAVIGATION_COMPOSITION.md`
- `docs/FALCON_PRODUCT_MODE_IMPLEMENTATION_SLICES.md`
- `docs/FALCON_MODE_NAV_DASHBOARD_BLUEPRINT.md`
- `docs/FALCON_MODE_EMPTY_STATES_AND_UPGRADES.md`
- `docs/FALCON_MODE_LANGUAGE_GUIDE.md`
- `docs/FALCON_CONTINENTAL_AMC_BLUEPRINT.md`
- `docs/FALCON_VENDOR_PORTAL_BLUEPRINT.md`
- `docs/FALCON_CLIENT_PORTAL_BLUEPRINT.md`
- `docs/FALCON_PRODUCT_PACKAGING_AND_ONBOARDING_DOCTRINE.md`
- `docs/FALCON_V1_AMC_OPERATIONAL_SURFACE_SUPPRESSION_DOCTRINE.md`

## Current Implementation Boundary

Phase 9H has implemented an inert metadata and shadow diagnostic foundation plus a limited set of current-live registry/helper migrations that preserve active UX.

Locked boundary:

- Product mode constants, product mode metadata, module categories, module registry metadata, module helpers, dependency metadata, and registration shapes now exist in source.
- Shadow diagnostics now exist for navigation, routes, command palette, dashboards, empty states, and upgrade prompts.
- A cross-registry integrity guard verifies module ID alignment, Vendor/Client hidden-concept safety, Hybrid lane separation, metadata-only permission semantics, unknown-input safety, and import safety.
- `/settings/product-metadata-diagnostics` now exposes the inert metadata and shadow outputs through an existing `settings.view` protected page.
- The diagnostics page is read-only, diagnostic/non-authoritative, local-state-only, and performs no writes.
- Shadow imports are allowed only in tests and the diagnostics page; they must not be imported into `TopNav`, `DashboardGate`, `CommandPalette`, active route authority, billing, onboarding, company settings, or module enforcement.
- Current-live registries/helpers now exist for active navigation, settings/admin utility links, primary `TopNav`, command palette commands, dashboard metadata, and `DashboardGate` resolution: `currentNavigationRegistry`, `currentSettingsUtilityLinks`, `currentPrimaryNavLinks`, `currentCommandRegistry`, `currentCommandPaletteCommands`, `currentDashboardRegistry`, and `currentDashboardResolution`.
- Active migrations are complete for Product Metadata Diagnostics route metadata, Notification Settings route metadata, settings/admin utility links, desktop primary `TopNav`, mobile primary `TopNav`, active `CommandPalette` command construction, and `DashboardGate` dashboard resolution.
- `docs/FALCON_COMMAND_PALETTE_PARITY_AUDIT.md` records the current active command palette behavior and shadow command expectations; it remains the reference after the completed helper-backed live command migration.
- `docs/FALCON_DASHBOARD_PARITY_AUDIT.md` records current `DashboardGate`, Staff/default dashboard, assignment dashboard, and shadow dashboard expectations; it remains the reference after the completed helper-backed `DashboardGate` migration.
- Active app behavior is preserved. The migrated live surfaces now read current-live helper metadata only where explicitly documented, while route/action permissions remain authority.
- No product-mode/shadow metadata authority, mode-aware runtime behavior, Vendor/Client future live surfaces, visible empty states, billing UI, onboarding UI, permission seeds, migrations, company settings, module settings, RLS changes, or RPC authority changes were introduced.
- Metadata permission domains do not grant visibility or authority.
- Metadata upgrade/billing fields do not grant package, billing, onboarding, or entitlement authority.
- Phase 10A company bootstrap doctrine does not change this boundary: bootstrap/module defaults may seed setup state or compose future UX, but they must not make product-mode metadata or module state security authority.

Future UX implementation must continue to satisfy the validation baseline from this lock before wiring any active surface:

- Metadata and shadow composition tests.
- Cross-registry integrity guard.
- Current-live helper and active surface tests for settings utility links, primary `TopNav`, `CommandPalette`, `DashboardGate`, and dashboard diagnostics.
- `npm run lint`.
- `npm run build`.
- `git diff --check`.
- Static import scans proving shadow composition modules are limited to tests and the protected diagnostics page before an explicit wiring phase.
- Static import scans proving product-mode/shadow metadata is not imported into active navigation, route, command, or dashboard authority surfaces.
- Current navigation, command palette, and dashboard parity audits staying current before any active navigation, command, or dashboard wiring.

Migration readiness checklist:

- Diagnostics output reviewed manually for each product mode.
- Staff current navigation and dashboard parity understood.
- Current command palette parity reviewed.
- Current dashboard parity reviewed, including assignment-only dashboard safety.
- Vendor/Client hidden-surface guardrails passing.
- Hybrid lane metadata confirmed.
- Command palette behavior mapped.
- Route exposure mapped.
- Permission metadata still non-authoritative.
- Runtime composition deferred until a fallback plan exists.
- Phase 9H40 is the current consolidation baseline. The next safe options are to pause Phase 9H and begin a fresh phase/thread, start H41 route metadata broader extraction, start H41 current dashboard widget registry cleanup, or continue onboarding/package planning later. Company module settings and database enforcement remain deferred.

## Core Doctrine

- Product modes must feel intentionally designed, not like partial access to one universal admin app.
- Hidden surfaces are preferable to disabled clutter.
- Visibility must remain explicit and scoped.
- Assignment packet access is not canonical order access.
- Relationship state alone grants no operational visibility.
- Vendor and Client users should never feel like second-class users in someone else's app.
- Vendor Portal must present a complete assignment-packet workspace without canonical order dashboards, internal AMC queues, or hidden Staff-module clutter.
- Client Portal must present a complete request/status/document workspace without internal AMC queues, vendor packet visibility, reviewer/appraiser workflow leakage, or hidden Staff/AMC-module clutter.
- Hybrid experiences must preserve mental separation between internal operations and network participation.
- Language, navigation, dashboards, empty states, command palette entries, and upgrade prompts are part of authorization design, not just styling.
- Implementation must start with constants and metadata before tenant/module/package enforcement.
- Packaging should map to operational outcomes, not hidden features, and must follow `docs/FALCON_PRODUCT_PACKAGING_AND_ONBOARDING_DOCTRINE.md`.
- Continental AMC should prove AMC network operations without becoming the default UX for Staff, Vendor, or Client modes.
- Falcon v1 should suppress AMC/network surfaces from Staff Appraisal runtime UX unless the AMC
  operational domain is explicitly enabled, permissioned, and intentionally exposed.

## UX Guardrails

Product modes:

- A mode should present a coherent workspace for a specific operating job.
- A mode should not expose surfaces whose primary objects are outside that user's job.
- A mode should not explain itself as a restriction from another mode.
- Mode-native language should apply to labels, empty states, notifications, activity, errors, and upgrade prompts.

Surface composition:

- Navigation should derive from enabled modules, product-mode lanes, permissions, and visibility scope.
- Dashboard sections should answer the mode's primary daily question before showing optional analytics, setup, or upgrades.
- Command palette entries should accelerate visible/available work, not bypass hidden navigation.
- Empty states should explain the current surface in mode-native language and point to the next natural action.
- Upgrade prompts should be sparse, contextual, and tied to current intent.

Safe defaults:

- Hide surfaces when module, permission, or visibility scope is not ready.
- Show a mode-native empty state only when the surface itself is valid for the mode and user.
- Show nothing instead of an upsell when a prompt would reveal a hidden module or internal concept.
- Prefer a stable unavailable state over redirect loops or repeated access-denied messages.
- Keep existing route/nav/dashboard behavior stable during early metadata-only slices.

## Forbidden UI Patterns

These patterns are forbidden:

- Disabled-module graveyards.
- Locked nav sections for hidden modules.
- "Access denied" spam where the surface should be hidden.
- Internal operations concepts shown to Vendor or Client users.
- Canonical order routes exposed to assignment-only users.
- Relationship topology leaked into UI copy.
- Permission keys, RLS, RPC names, helper names, `company_id`, or package entitlement terminology in normal UI.
- Mixed-lane Hybrid dashboards that blend internal orders, received packets, sent assignments, and client requests without labels.
- Dashboard clutter from irrelevant modules.
- Staff empty-state language reused in Vendor or Client modes.
- Command palette entries that expose hidden concepts.
- Upgrade prompts that form a locked-feature catalog.
- Onboarding flows that expose unrelated modules before runtime composition is stable.
- Billing or package states that bypass permission or visibility doctrine.
- Tenant/module/package runtime enforcement before metadata foundations, company settings, rollout semantics, and package doctrine are stable.

## Product-Mode Isolation Rules

Staff Appraisal Mode:

- Can use order, workflow, appraiser, reviewer, revision, due-date, client, and delivery language.
- Should not show AMC command-center, Vendor packet, or Client portal surfaces unless explicitly enabled.
- Should not mix network packet work into internal order queues without a clear lane.
- May preserve AMC-capable backend architecture without exposing AMC-native runtime concepts.
- Should treat `AMC` as an ordinary client/relationship category only where the current
  client/order model already requires it, not as a gateway to AMC Operations.

AMC Operations Mode:

- Can use intake, assignment, vendor panel, client/lender, SLA, QC/review, escalation, and delivery-risk language.
- Should not present itself as Staff Appraisal Mode with extra AMC tools.
- Should keep owner-company order operations separate from vendor-facing packet execution.
- Must be explicitly enabled as its own operational domain. Admin role title alone must not expose
  AMC Operations.

Vendor Portal Mode:

- Should use assignment, packet, offer, work request, submit, due date, correction, and timeline language.
- Must not show internal order operations, client CRM, review queues, team admin, or owner-company workflow concepts.
- Must not link assignment packets to canonical order routes.
- Must follow the Vendor Portal visibility, communication, dashboard, navigation, and upgrade doctrine in `docs/FALCON_VENDOR_PORTAL_BLUEPRINT.md`.

Client Portal Mode:

- Should use request, status, document, report, delivery, action-needed, and message language.
- Must not show appraiser, reviewer, vendor assignment, internal workflow, QC queue, or internal lifecycle concepts.
- Must not imply the client is inside the operator's internal workspace.
- Must follow the Client Portal visibility, communication, dashboard, navigation, and upgrade doctrine in `docs/FALCON_CLIENT_PORTAL_BLUEPRINT.md`.

Hybrid / Ecosystem Mode:

- Must use lane labels to separate internal operations, network work, sent assignments, received packets, relationships, client access, and administration.
- Must not collapse everything into a generic "work items" dashboard.
- Must use lane-native language inside each lane.

## Visibility-Leak Prevention Doctrine

Visibility boundaries:

- Company membership defines company participation.
- Permissions define action authority.
- Readable orders, readable clients, assignment packets, relationship lifecycle projections, and portal scopes define operational visibility.
- Relationship existence alone does not expose orders, clients, activity, notifications, calendar events, queues, workflow state, or team data.
- Assignment packet access exposes packet data only; it is not canonical order access.

Leak prevention rules:

- Do not show counts for hidden or unreadable objects.
- Do not show "some results hidden" if that reveals data outside scope.
- Do not expose internal IDs, policy names, permission keys, relationship topology, or backend helper names.
- Do not route users to a detail page and rely on an access-denied screen when the list/action should have hidden the link.
- Do not let command palette search reveal hidden modules, routes, objects, or actions.

Good:

- "No packets are available for this relationship."
- "No requests match these filters."
- "This item is not available in your current workspace."

Bad:

- "Canonical order access denied."
- "Relationship exists but order visibility predicate failed."
- "3 hidden orders require orders.read.all."

## Navigation Anti-Patterns

Forbidden:

- Showing hidden modules as disabled nav entries.
- Showing Vendor or Client users Staff/AMC nav with locks.
- Adding every optional module to the primary nav.
- Showing package/billing placeholders before package mapping is stable.
- Using command palette as the only way to reach a valid mode surface.
- Showing nav badges based on unreadable objects.

Safe pattern:

- Resolve mode lanes first.
- Add entries only from enabled modules.
- Filter by permission and visibility scope.
- Apply mode-native labels.
- Hide unavailable entries completely.

Good:

- Vendor nav: Dashboard, Assignments, Calendar, Notifications, Profile, Settings.
- Client nav: Dashboard, Requests / Orders, Reports / Documents, Messages / Activity, Settings.

Bad:

- Vendor nav with disabled Orders, Clients, Reviews, Team Access, Vendor Panel, and Billing.
- Client nav with locked Appraiser Queue or Reviewer Queue.

## Dashboard Anti-Patterns

Forbidden:

- One universal dashboard with irrelevant widgets hidden inside cards.
- Assignment-only users seeing an internal order cockpit.
- Client users seeing internal workflow queues.
- Vendor users seeing owner-company order KPIs.
- Hybrid dashboards blending internal orders and network packets without lane labels.
- Empty widgets for hidden modules.
- Dashboard prompts that advertise unrelated upgrades.

Safe pattern:

- Select a mode-specific dashboard shell.
- Answer the mode's primary daily question first.
- Compose only enabled and permission-visible widgets.
- Use mode-native empty states for valid but empty widgets.
- Keep optional upgrades sparse and contextual.

Good:

- "Assignment Packet Dashboard" with offers waiting, active packets, due soon, and corrections requested.
- "Client Order Status Dashboard" with requests in progress, action needed, reports available, and documents needed.

Bad:

- Vendor dashboard showing active orders, appraiser workload, reviewer workload, and client CRM.
- Client dashboard showing vendor offers, QC queue, workflow transitions, and internal activity.

## Upgrade-Prompt Anti-Patterns

Forbidden:

- Locked-feature catalogs.
- Upgrade prompts in primary execution paths.
- Upsells that reveal hidden modules.
- Package names before package doctrine is stable.
- Prompts shown to users who cannot act on them.
- Prompts shown when data is empty because of visibility scope.
- Prompts that make Vendor or Client users feel they are missing internal staff tools.

Safe pattern:

- Show prompts only in adjacent, enabled workflows.
- Name the outcome, not the hidden module mechanics.
- Make prompts dismissible and non-blocking.
- Prefer owner/admin contexts for package-level prompts.

Good:

- Staff delivery context: "Add client portal access for status and report delivery."
- AMC vendor context: "Add Vendor Portal so vendors can accept and complete packets."

Bad:

- "Upgrade to unlock hidden modules."
- "You do not have access to Staff tools."
- "Enable package entitlement vendor_portal."

## Hybrid-Lane Safety Rules

Hybrid mode must preserve mental separation:

- Internal Operations: owned orders, internal assignments, review, delivery, clients.
- Sent Assignments: owner-side vendor offers and active outsourced work.
- Received Packets: assignment packets the company is completing for others.
- Relationships: relationship lifecycle and vendor/client network management.
- Client Access: request, status, document, and report surfaces.
- Administration: team, settings, package, and company controls when enabled.

Rules:

- Every dashboard section should declare its lane when ambiguity is possible.
- Notifications and activity should identify the lane when the same object words could mean different things.
- Command palette entries should include lane-specific labels for ambiguous actions.
- Empty states should not use one shared "No work found" message across lanes.

Good:

- "Internal Operations: no orders need review."
- "Received Packets: no packets are available."
- "Sent Assignments: no vendor offers need follow-up."

Bad:

- "No work items found."
- "Orders and packets needing attention."
- "Relationship access is active, but order visibility is denied."

## Assignment-Only User Safety Rules

Assignment-only users:

- Operate from assignment packets.
- Should not see canonical order dashboards, order detail routes, client CRM, internal activity logs, or owner workflow controls.
- Should receive packet-native notifications and activity.
- Should deep-link to `/assignments/:assignmentId`, not `/orders/:orderId`.

Forbidden:

- Linking packet rows to order detail.
- Showing order numbers, client data, fees, internal notes, or owner assignment columns unless included in the packet contract.
- Reusing Staff order empty states.
- Saying "order access denied" instead of hiding the order surface.

Good:

- "Open packet."
- "No assignment packets are available yet."
- "A correction was requested for this packet."

Bad:

- "Open order."
- "No orders found."
- "Canonical order unreadable."

## Client Portal Safety Rules

Client users:

- Operate from request, status, document, report, and message surfaces.
- Should not see internal appraiser/reviewer/vendor/QC/workflow concepts.
- Should receive client-safe status and delivery updates.
- Should not infer internal staffing, vendor capacity, or review bottlenecks unless intentionally productized.

Forbidden:

- Internal workflow status labels.
- Reviewer/appraiser assignment labels.
- Vendor packet or offer status.
- Internal activity logs.
- Relationship topology or client visibility predicate language.

Good:

- "Your request is in progress."
- "A report is ready to download."
- "Upload the requested document to keep this request moving."

Bad:

- "Reviewer requested revisions."
- "Vendor assignment declined."
- "Workflow status changed to ready_for_review."

## Vocabulary Leak Prevention

Normal UI copy must not include:

- Module IDs.
- Permission keys.
- RLS.
- RPC.
- Policy names.
- Relationship topology.
- Canonical order access.
- Assignment visibility predicate.
- Active-company claim.
- `company_id`.
- Service role.
- Security definer/invoker.
- Tenant enforcement.
- Package entitlement.

Review every label, empty state, command, notification, activity line, toast, and error against `docs/FALCON_MODE_LANGUAGE_GUIDE.md` before implementation.

## Future Implementation Review Checklist

Before merging product-mode UX implementation:

- The slice starts from metadata/constants unless it is intentionally later in the implementation sequence.
- Existing routes, nav, dashboard, and command palette behavior remain stable during metadata-only slices.
- The selected product mode has a complete lane model.
- Hidden modules are hidden, not disabled.
- Navigation entries come only from enabled modules plus permission and scope checks.
- Dashboard widgets answer the mode's daily question and do not include irrelevant modules.
- Command palette entries do not expose hidden routes, modules, or actions.
- Empty states use mode-native language.
- Upgrade prompts are contextual, sparse, and non-blocking.
- Vendor surfaces use assignment/packet/work request language.
- Client surfaces use request/status/document/report language.
- Hybrid surfaces preserve lane separation.
- Assignment-only users do not see canonical order routes or order dashboards.
- Relationship existence is not treated as visibility.
- Counts, badges, notifications, and activity do not reveal unreadable objects.
- No permission/system/database/security terminology appears in user-facing copy.
- Billing, onboarding, tenant settings, and runtime module enforcement remain deferred until their metadata foundations are complete.
- `npm run lint`, `npm run build`, and `git diff --check` pass.

## Future Contributor Guardrails

When adding a new product surface:

- Start by identifying the product mode and user job.
- Pick the primary object noun from the language guide.
- Decide whether the surface is enabled, optional, hidden, or upgrade-adjacent for each mode.
- Define the visibility scope before designing labels or links.
- Design empty states before adding route or dashboard entry points.
- Add command palette entries only after the surface is visible through normal navigation or context.
- Prefer no UI over misleading UI.
- Treat copy, labels, and empty states as authorization-adjacent design.
