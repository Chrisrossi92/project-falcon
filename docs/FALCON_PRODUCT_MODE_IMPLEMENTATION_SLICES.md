# Falcon Product Mode Implementation Slices

## Purpose

This document converts the Phase 9B product-mode docs into a safe future implementation roadmap.

It is planning documentation only. It does not change source code, route configuration, navigation components, dashboards, command palette behavior, permission seeds, billing logic, onboarding UI, company settings, database migrations, or tenant enforcement.

The implementation sequence must start with constants and metadata only. Falcon should not introduce tenant-specific module enforcement, billing packages, onboarding gates, or company module settings until the module registry, product-mode composition, permission matrix, and navigation/dashboard composition model are stable.

Reference docs:

- `docs/FALCON_MODULE_REGISTRY.md`
- `docs/FALCON_PERMISSION_MATRIX.md`
- `docs/FALCON_PRODUCT_MODE_COMPOSITION.md`
- `docs/FALCON_NAVIGATION_COMPOSITION.md`
- `docs/FALCON_MODE_NAV_DASHBOARD_BLUEPRINT.md`
- `docs/FALCON_MODE_EMPTY_STATES_AND_UPGRADES.md`
- `docs/FALCON_MODE_LANGUAGE_GUIDE.md`
- `docs/FALCON_PRODUCT_MODE_GUARDRAILS.md`
- `docs/FALCON_CONTINENTAL_AMC_BLUEPRINT.md`
- `docs/FALCON_AMC_QUEUE_WORKFLOW_TAXONOMY.md`
- `docs/FALCON_AMC_VENDOR_PANEL_DOCTRINE.md`
- `docs/FALCON_AMC_CLIENT_LENDER_DOCTRINE.md`
- `docs/FALCON_AMC_NOTIFICATION_ACTIVITY_ESCALATION_DOCTRINE.md`
- `docs/FALCON_VENDOR_PORTAL_BLUEPRINT.md`
- `docs/FALCON_VENDOR_PACKET_LIFECYCLE_TAXONOMY.md`
- `docs/FALCON_VENDOR_PROFILE_AVAILABILITY_UPGRADE_DOCTRINE.md`
- `docs/FALCON_CLIENT_PORTAL_BLUEPRINT.md`
- `docs/FALCON_PRODUCT_PACKAGING_AND_ONBOARDING_DOCTRINE.md`

## Phase 9H Runtime Metadata Lock

Phase 9H1 through Phase 9H40 are complete as an inert runtime metadata, live-surface registry, parity diagnostic, protected developer diagnostics, first live route-reference foundation, low-risk settings/admin utility link registry foundation, primary `TopNav` behavior audit foundation, behavior-preserving desktop/mobile primary `TopNav` helper migration, active `CommandPalette` migration planning, helper extraction, active helper-backed rendering, command migration doc lock, active dashboard migration planning, dashboard helper extraction, active `DashboardGate` helper-backed resolution, dashboard migration doc lock, and final Phase 9H runtime metadata consolidation lock.

Completed metadata foundation:

- Product mode constants and stable product mode IDs.
- Product mode metadata for Staff Appraisal, AMC Operations, Vendor Portal, Client Portal, and Hybrid/Ecosystem modes.
- Module category constants.
- Module registry constants with status, bundle type, dependencies, permission domains, and metadata-only nav/dashboard registration shapes.
- Module helper functions for product-mode module composition, optional/hidden module lookup, dependency checks, and metadata-only nav/dashboard registration access.
- Metadata-only registration shapes for navigation, dashboard, command palette, empty states, and upgrade prompts.

Completed shadow diagnostics:

- Shadow navigation composition diagnostics.
- Shadow command palette composition diagnostics.
- Shadow dashboard shell/widget composition diagnostics.
- Shadow empty-state composition diagnostics.
- Shadow upgrade-prompt composition diagnostics.
- Cross-registry shadow composition integrity guard.
- Shadow route and permission mapping diagnostics.
- Read-only developer diagnostics page at `/settings/product-metadata-diagnostics`.
- Current navigation vs shadow navigation parity audit in `docs/FALCON_NAVIGATION_PARITY_AUDIT.md`.
- Current command palette vs shadow command composition parity audit in `docs/FALCON_COMMAND_PALETTE_PARITY_AUDIT.md`.
- Active command palette migration plan in `docs/FALCON_ACTIVE_COMMAND_PALETTE_MIGRATION_PLAN.md`.
- Current dashboard vs shadow dashboard composition parity audit in `docs/FALCON_DASHBOARD_PARITY_AUDIT.md`.
- Active dashboard migration plan in `docs/FALCON_ACTIVE_DASHBOARD_MIGRATION_PLAN.md`.
- Active navigation migration plan in `docs/FALCON_ACTIVE_NAVIGATION_MIGRATION_PLAN.md`.

Completed current-live registries:

- `src/lib/navigation/currentNavigationRegistry.js` describes current `TopNav`, mobile nav, avatar/settings, route-only diagnostics, assignment, relationship, clients, users/team, notification settings, and active route-adjacent navigation concepts.
- `src/lib/navigation/currentSettingsUtilityLinks.js` derives current settings/admin utility links from current-live navigation metadata.
- `src/lib/navigation/currentPrimaryNavLinks.js` derives current desktop/mobile primary operational nav links from current-live navigation metadata.
- `src/lib/commandPalette/currentCommandRegistry.js` describes current live command palette entries, order-search fallback, command routes, permission gates, and command notes.
- `src/lib/commandPalette/currentCommandPaletteCommands.js` derives active command palette commands and order-search fallback behavior from current-live command metadata.
- `src/lib/dashboard/currentDashboardRegistry.js` describes current `DashboardGate`, Staff/default order dashboard concepts, embedded order dashboard sections, and assignment-native dashboard concepts.
- `src/lib/dashboard/currentDashboardResolution.js` resolves active `DashboardGate` branch selection from current capability inputs and current-live dashboard metadata.

Completed live-vs-shadow parity diagnostics:

- `src/lib/navigation/navigationParityDiagnostics.js` compares current live navigation concepts against selected shadow navigation mode composition.
- `src/lib/commandPalette/commandPaletteParityDiagnostics.js` compares current live command concepts against selected shadow command palette composition.
- `src/lib/dashboard/dashboardParityDiagnostics.js` compares current live dashboard concepts against selected shadow dashboard composition.

Completed first live registry-backed route reference:

- Phase 9H22 migrated the Product Metadata Diagnostics route reference through `src/routes/diagnosticRoutes.js`, deriving the route path and required permission from `currentNavigationRegistry`.
- The existing `/settings/product-metadata-diagnostics` path is preserved.
- The existing `settings.view` permission gate is preserved.
- Phase 9H24 migrated the Notification Settings route reference through the same current-live route metadata helper.
- The existing `/settings/notifications` path is preserved.
- The existing `notifications.preferences.manage_own` permission gate is preserved.
- The route binding uses current-live registry metadata only. It does not use product-mode metadata, shadow navigation metadata, module composition, package metadata, company settings, or module settings as runtime authority.
- No primary operational `TopNav`, mobile navigation, `CommandPalette`, dashboard, route visibility, permission seed, or backend behavior changed.

Completed low-risk settings/admin utility link migration:

- Phase 9H25 added `src/lib/navigation/currentSettingsUtilityLinks.js` as the current-live settings/admin utility link helper.
- The avatar `Account settings` link now reads its label and path from current-live registry metadata.
- The Settings page `Notification Settings →` link now reads its label and path from current-live registry metadata.
- Product Metadata Diagnostics remains hidden and diagnostic-only.
- Current visible labels, order, paths, and route gates are preserved.
- The helper uses `currentNavigationRegistry` only. It does not use product-mode metadata, shadow navigation metadata, module composition, package metadata, company settings, or module settings as runtime authority.

Completed primary TopNav behavior audit:

- Phase 9H27 added `docs/FALCON_TOPNAV_PRIMARY_NAV_AUDIT.md` as the pre-extraction audit for primary operational nav.
- The audit documents current Dashboard, Orders, Calendar, Clients, Relationships, Assignments, Users, Activity, Settings, mobile nav, and command palette relationships.
- The audit records permission-only authority, hidden-link behavior during permission loading, dynamic Clients route behavior, assignment visibility behavior, duplicated desktop/mobile rendering, exact active-state semantics, and primary migration risks.
- The audit defines the next safe extraction sequence: helper-only extraction, parity tests, desktop rendering switch, mobile rendering switch, and diagnostics-only live-vs-shadow comparison.
- No primary operational nav, mobile nav, `CommandPalette`, dashboard, route visibility, permission seed, backend behavior, product-mode authority, or module/company setting behavior changed.

Completed primary TopNav registry helper migration:

- Phase 9H28 added `src/lib/navigation/currentPrimaryNavLinks.js` as the current-live primary nav helper.
- The helper uses `currentNavigationRegistry` metadata only and does not import product-mode metadata, shadow navigation metadata, module composition, package metadata, company settings, or module settings.
- Phase 9H29 switched desktop primary `TopNav` rendering to `getCurrentPrimaryNavLinks()`.
- Phase 9H30 switched mobile primary `TopNav` rendering to `getCurrentPrimaryNavLinks()`.
- Desktop and mobile primary nav preserve the current order: Orders, Assignments, Relationships, Calendar, Clients, Users.
- Current labels, paths, permission hiding, Clients dynamic routing, and active-state behavior are preserved.
- Mobile close-on-navigation behavior is preserved.
- Settings/account utility behavior remains separate from primary nav.
- `CommandPalette`, dashboards, route authority, permissions, seeds, migrations, company settings, module settings, billing, onboarding, and backend behavior remain unchanged.

Completed active CommandPalette migration:

- Phase 9H32 added `docs/FALCON_ACTIVE_COMMAND_PALETTE_MIGRATION_PLAN.md`.
- The plan documents current hardcoded command construction, permission gates, search behavior, order-search fallback, route behavior, loading/error fallback behavior, labels/copy, and relationship to `TopNav`/navigation registry.
- The plan defines a behavior-preserving migration sequence: helper-only extraction, parity tests against `currentCommandRegistry`, active `CommandPalette` helper switch, diagnostics-only current-vs-shadow comparison, and future mode-aware commands only after company/module settings and routes exist.
- The plan locks risks, required tests, and stop conditions for command migration.
- Phase 9H33 added `src/lib/commandPalette/currentCommandPaletteCommands.js` with `getCurrentCommandPaletteCommands()` and `getCurrentOrderSearchFallback()`.
- Phase 9H34 switched active `CommandPalette` command construction to `getCurrentCommandPaletteCommands()` and order-search fallback to `getCurrentOrderSearchFallback()`.
- Current command labels, ordering, routes, permission gates, loading/error fallback behavior, Clients dynamic route behavior, label search behavior, and order-search fallback behavior are preserved.
- Routes, navigation, dashboards, permissions, seeds, migrations, company settings, module settings, billing, onboarding, and backend behavior remain unchanged.

Completed active dashboard migration planning:

- Phase 9H36 added `docs/FALCON_ACTIVE_DASHBOARD_MIGRATION_PLAN.md`.
- The plan documents current `DashboardGate` behavior, Staff/default order dashboard behavior, assignment-only dashboard routing, owner sent-assignment widgets, role/permission/lens assumptions, current data hooks and RPC boundaries, and dashboard links/actions.
- The plan defines a behavior-preserving sequence: helper-only extraction, parity tests against `currentDashboardRegistry`, diagnostics-only current-vs-shadow comparison, one optional low-risk dashboard metadata reference, and only later `DashboardGate` shell resolution.
- The plan locks risks, required tests, and stop conditions for dashboard migration.

Completed active DashboardGate migration:

- Phase 9H37 added `src/lib/dashboard/currentDashboardResolution.js`.
- The helper resolves current dashboard state from current capability inputs and `currentDashboardRegistry` metadata.
- Phase 9H38 switched active `DashboardGate` branch selection to the current-live dashboard resolution helper.
- Loading behavior remains unchanged.
- Staff/default order dashboard priority remains unchanged.
- Assignment-only dashboard behavior remains unchanged.
- Mixed order/assignment users still receive the order dashboard first.
- Users with no dashboard capability still receive the same unavailable fallback.
- No Vendor Portal or Client Portal future dashboard shells are live.
- Phase 9H39 locked the dashboard migration docs before any further dashboard shell work.
- Active `DashboardPage`, `AssignmentDashboardPage`, dashboard widgets, data hooks, RPC boundaries, routes, navigation, command palette behavior, permissions, seeds, migrations, company settings, module settings, billing, onboarding, and backend behavior remain unchanged.

Phase 9H40 consolidation lock:

- The Phase 9H runtime metadata foundation is complete: product mode constants/metadata, module registry/categories/helpers, shadow navigation/route/command/dashboard/empty-state/upgrade diagnostics, cross-registry integrity guard, and the protected Product Metadata Diagnostics page are all documented as inert and non-authoritative.
- Current-live registries/helpers are complete for the migrated live surfaces: `currentNavigationRegistry`, `currentSettingsUtilityLinks`, `currentPrimaryNavLinks`, `currentCommandRegistry`, `currentCommandPaletteCommands`, `currentDashboardRegistry`, and `currentDashboardResolution`.
- Active migrations are complete for Product Metadata Diagnostics route metadata, Notification Settings route metadata, settings/admin utility links, desktop primary `TopNav`, mobile primary `TopNav`, active `CommandPalette` command construction, and `DashboardGate` dashboard resolution.
- Active app behavior is preserved. Current-live registries/helpers describe and feed only the explicitly migrated current-live references; they do not introduce product-mode/shadow authority or mode-aware behavior.
- Future product-mode composition remains diagnostic/non-authoritative until explicit company/module settings, route/data contracts, package/onboarding semantics, and authorization plans exist.

Product Metadata Diagnostics page coverage:

- Product modes.
- Module registry summary.
- Selected mode composition.
- Shadow navigation diagnostics.
- Live-vs-shadow navigation parity diagnostics.
- Shadow route diagnostics.
- Shadow command palette diagnostics.
- Live-vs-shadow command palette parity diagnostics.
- Shadow dashboard diagnostics.
- Live-vs-shadow dashboard parity diagnostics.
- Shadow empty-state diagnostics.
- Shadow upgrade-prompt diagnostics.

Current safety boundary:

- Shadow composition imports are allowed only from test files and the protected diagnostics page.
- Live-vs-shadow parity imports are allowed only from test files and the protected diagnostics page.
- The diagnostics page is protected by the existing `settings.view` permission gate.
- The diagnostics page is read-only, diagnostic/non-authoritative, local-state-only, and performs no writes.
- The diagnostics page does not control runtime routes, navigation, dashboards, command palette behavior, permissions, billing, onboarding, company settings, or module enablement.
- Primary operational `TopNav` rendering now uses the current-live primary nav helper while preserving visible behavior.
- Mobile primary navigation now uses the same current-live primary nav helper while preserving visible behavior.
- `CommandPalette` now uses current-live command helpers while preserving visible behavior.
- `DashboardGate` now uses current-live dashboard resolution while preserving visible behavior.
- Dashboard pages, dashboard widgets, dashboard data hooks, and dashboard RPC boundaries remain unchanged.
- Active route authority remains permission-based.
- No billing, onboarding, company settings, module settings, permission seed, database, RLS, or RPC behavior changed.
- No Vendor or Client future concepts were introduced into live settings/admin utility links.
- Permission domains in the metadata are diagnostic only and do not authorize visibility or actions.
- Upgrade/billing metadata is diagnostic only and does not create billing authority, package authority, or entitlement enforcement.
- Product-mode and module metadata do not enforce company/module settings.
- Current-live registries are descriptive only. They do not become metadata authority, permission authority, route authority, company/module setting authority, or product-mode authority.
- `currentNavigationRegistry` now safely describes low-risk settings/admin route and utility link references, but route authority remains permission-based through the existing route guard.
- Product-mode/shadow metadata remains diagnostic only and is not imported into active route authority.
- No Vendor Portal or Client Portal future live surfaces are exposed by Phase 9H.
- No company/module settings, billing enforcement, onboarding enforcement, database migrations, permission seed changes, RLS changes, or RPC authority changes were introduced by Phase 9H.

Validation baseline:

- Product mode metadata tests pass.
- Module registry and module helper tests pass.
- Shadow navigation, command palette, dashboard, empty-state, and upgrade-prompt tests pass.
- Shadow route/permission mapping diagnostics tests pass.
- Cross-registry shadow composition integrity guard passes.
- Product metadata diagnostics page render smoke test passes.
- Product Metadata Diagnostics route registry binding test passes.
- Notification Settings route registry binding test passes.
- Current settings utility link tests pass.
- Current primary nav helper tests pass.
- TopNav desktop and mobile primary nav rendering tests pass.
- Current CommandPalette helper tests pass.
- Active CommandPalette rendering tests pass.
- Current DashboardGate resolution helper tests pass.
- Active DashboardGate rendering tests pass.
- Current live navigation registry and navigation parity diagnostics tests pass.
- Current live command palette registry and command parity diagnostics tests pass.
- Current live dashboard registry and dashboard parity diagnostics tests pass.
- Navigation, command palette, and dashboard parity audits exist before active nav, command, or dashboard migration.
- Active navigation migration planning exists before any live registry rendering changes.
- Active command palette migration planning, helper extraction, and helper-backed rendering are complete before dashboard migration planning.
- Active dashboard migration planning, helper extraction, and helper-backed `DashboardGate` resolution are complete before any further dashboard shell work.
- TopNav primary navigation behavior audit exists in `docs/FALCON_TOPNAV_PRIMARY_NAV_AUDIT.md` before primary operational nav helper extraction or rendering migration.
- `npm run lint` passes with the existing warning profile.
- The active CommandPalette helper migration reduced the current lint warning count from 159 to 158 by removing the stale React default import in the touched palette file.
- `npm run build` passes with the existing Tailwind ambiguity and chunk-size warnings.
- `git diff --check` passes.
- Static scans confirm shadow composition imports are limited to tests and `/settings/product-metadata-diagnostics`.
- Static scans confirm live-vs-shadow parity imports are limited to tests and `/settings/product-metadata-diagnostics`.
- Static scans confirm no product-mode/shadow metadata imports in active command, navigation, route, or dashboard authority surfaces.
- Phase 9H40 consolidation docs are locked before any further live registry migration or product-mode runtime implementation.

Migration readiness checklist:

Before any active navigation, route, command palette, or dashboard migration begins:

- The current navigation parity audit must stay current with `TopNav`, mobile nav, command palette, dashboard links, assignment links, relationship links, route authority, and diagnostics route behavior.
- The active navigation migration plan must be followed before extracting or rendering live nav from a registry.
- The current command palette parity audit must stay current with active commands, command gates, route behavior, naming/copy, settings/admin exposure, assignment links, and relationship links.
- The active command palette migration plan remains the boundary for any further command work now that extraction and helper-backed rendering are complete.
- The current dashboard parity audit must stay current with `DashboardGate`, Staff/default dashboard behavior, assignment-native dashboard behavior, dashboard links/actions, role/permission lenses, and shadow dashboard expectations.
- The active dashboard migration plan remains the boundary now that helper extraction and helper-backed `DashboardGate` resolution are complete.
- Diagnostics output must be reviewed manually across Staff Appraisal, AMC Operations, Vendor Portal, Client Portal, and Hybrid/Ecosystem modes.
- Staff current navigation and dashboard parity must be understood before replacing active behavior.
- Assignment-only dashboard safety must remain intact before any dashboard composition work.
- Vendor and Client hidden-surface guardrails must still pass.
- Hybrid lane metadata must be confirmed so internal, network, packet, and client concepts remain separated.
- Command palette behavior is mapped, tested, and helper-backed; further command registration changes must preserve the H35 safety boundary.
- Order-search fallback, command labels, route paths, permission loading/error fallback, and hidden-future-command behavior must be preserved during any active command migration.
- Dashboard behavior is mapped, tested, and helper-backed for `DashboardGate`; further dashboard shell or widget registration changes must preserve the H39 safety boundary.
- Assignment-only dashboard safety and current data/RPC boundaries must remain intact during any active dashboard migration.
- Route exposure must be mapped before active route authority or route visibility changes.
- Permission keys and permission domains must remain diagnostic metadata until an explicit authorization plan exists.
- No runtime composition should be wired until a fallback plan exists for reverting to current Staff Appraisal behavior.

Before primary operational nav helper extraction:

- `currentNavigationRegistry` must cover each current primary nav entry with stable labels, paths, surfaces, active-route behavior, and permission metadata.
- `TopNav` behavior is documented in `docs/FALCON_TOPNAV_PRIMARY_NAV_AUDIT.md`, including loading and fallback semantics.
- Permission loading/error behavior must be understood before replacing hardcoded rendering.
- Mobile nav relationship to primary nav must be explicit; mobile nav should not be migrated accidentally as part of desktop primary nav.
- Clients dynamic route behavior must remain preserved: users with `clients.read.all` route to `/clients`, while assigned-only users route to `/clients/cards`.
- No mode-aware behavior, Vendor/Client future concepts, company/module settings, or product-mode authority may be introduced.
- Rollback must be clear before registry-backed primary nav rendering ships.

Primary operational nav helper extraction and rendering status:

- Helper-only extraction is complete.
- Desktop rendering from the helper is complete.
- Mobile rendering from the helper is complete.
- Current `TopNav` safety boundary is locked in `docs/FALCON_TOPNAV_PRIMARY_NAV_AUDIT.md`.

Current readiness state:

- Staff/default is closest to parity across navigation, command palette, and dashboard concepts.
- AMC is partial/future: assignment, relationship, order, calendar, review-adjacent, and client foundations exist, but AMC-native lanes, labels, intake queues, command center, and SLA dashboards are not live.
- Vendor is future shell/data-contract dependent: assignment packet foundations exist, but Vendor Portal shell, vendor-native copy, profile/availability surfaces, packet calendar semantics, and vendor workspace routes remain future.
- Client is future shell/data-contract dependent: request/status/document/message dashboard and command concepts are shadow-only until client-safe routes and projections exist.
- Hybrid lane separation is future: current live surfaces are not lane-aware, and mixed users still follow current permission precedence rather than a composed ecosystem dashboard/nav model.
- The first active migration step was intentionally tiny: one route-only Product Metadata Diagnostics reference now reads path and permission from current-live metadata while preserving visible behavior.
- Low-risk settings/admin route and utility link references now read from current-live metadata while preserving visible behavior.
- Primary operational `TopNav` helper extraction and desktop/mobile helper-backed rendering are complete with behavior preserved. Active `CommandPalette` helper extraction and helper-backed rendering are complete with behavior preserved. Active dashboard helper extraction and helper-backed `DashboardGate` resolution are complete with behavior preserved.

Next allowed implementation paths:

- Pause Phase 9H and begin a fresh phase/thread from this consolidation baseline.
- Start H41 route metadata broader extraction as a tiny behavior-preserving live registry migration.
- Start H41 current dashboard widget registry cleanup as a tiny behavior-preserving metadata cleanup.
- Continue onboarding/package planning later, after route/data contracts and product-mode rollout semantics are clearer.
- Defer database-backed company module settings, package enforcement, billing enforcement, onboarding enforcement, and tenant-specific module runtime until the metadata runtime has been proven through diagnostics and explicit migration plans.

## Core Implementation Doctrine

- Start with constants/metadata only.
- Keep existing routes, navigation, dashboard behavior, and command palette behavior stable during the first implementation slices.
- Modules determine product surface.
- Permissions determine action authority.
- Visibility still comes from company membership plus readable order, readable client, assignment packet, relationship lifecycle projection, or portal scope.
- Relationship state alone must not grant operational visibility.
- Hidden modules should not appear as locked or disabled clutter.
- Vendor Portal and Client Portal surfaces must not reuse Staff/Admin cockpit language.
- Hybrid/Ecosystem surfaces must separate internal operations from network work into clear lanes.
- Mode-specific dashboard/nav implementation should follow `docs/FALCON_MODE_NAV_DASHBOARD_BLUEPRINT.md` before wiring active shells.
- Empty-state and upgrade-prompt implementation should follow `docs/FALCON_MODE_EMPTY_STATES_AND_UPGRADES.md` before wiring visible prompts.
- Surface copy should follow `docs/FALCON_MODE_LANGUAGE_GUIDE.md`.
- Active implementation should pass the UX guardrails and anti-pattern checklist in `docs/FALCON_PRODUCT_MODE_GUARDRAILS.md`.
- AMC-specific implementation should follow the Continental AMC operational blueprint before wiring active AMC dashboards, queues, vendor panel behavior, client/lender surfaces, assignment packet behavior, or SLA escalation behavior.
- AMC queue/dashboard implementation should follow `docs/FALCON_AMC_QUEUE_WORKFLOW_TAXONOMY.md` before adding queue IDs, queue projections, workflow-stage projections, SLA escalation rules, or queue-notification relationships.
- AMC vendor panel and assignment routing implementation should follow `docs/FALCON_AMC_VENDOR_PANEL_DOCTRINE.md` before adding panel states, assignment eligibility checks, vendor profile surfaces, routing suggestions, vendor scoring, or auto-routing behavior.
- AMC client/lender implementation should follow `docs/FALCON_AMC_CLIENT_LENDER_DOCTRINE.md` before adding client portal intake, client-facing status projections, document/report delivery, client communication, lender integrations, or billing enforcement.
- AMC notification, activity, and escalation implementation should follow `docs/FALCON_AMC_NOTIFICATION_ACTIVITY_ESCALATION_DOCTRINE.md` before adding notification event families, activity projections, escalation thresholds, communication surfaces, notification preferences, or automation.
- Vendor Portal implementation should follow `docs/FALCON_VENDOR_PORTAL_BLUEPRINT.md` before wiring vendor dashboards, navigation, packet copy, packet messages, vendor notifications, profile/availability surfaces, completed-work history, or Staff Appraisal upgrade prompts.
- Vendor packet lifecycle implementation should follow `docs/FALCON_VENDOR_PACKET_LIFECYCLE_TAXONOMY.md` before adding packet state constants, vendor-safe queues, packet action handlers, packet activity projections, document/report boundaries, or dashboard queue mappings.
- Vendor profile and availability implementation should follow `docs/FALCON_VENDOR_PROFILE_AVAILABILITY_UPGRADE_DOCTRINE.md` before adding profile fields, readiness states, availability/capacity signals, compliance/payment surfaces, vendor profile permissions, or Staff Appraisal upgrade prompts.
- Client Portal implementation should follow `docs/FALCON_CLIENT_PORTAL_BLUEPRINT.md` before wiring client dashboards, navigation, request submission, client-facing status projections, document/report access, client messages, client notifications, historical requests, billing prompts, lender integrations, or analytics/reporting upgrades.
- Product packaging, onboarding, trial/demo, upgrade, and billing-related implementation should follow `docs/FALCON_PRODUCT_PACKAGING_AND_ONBOARDING_DOCTRINE.md` before adding package constants, module bundle resolvers, onboarding flows, demo/sample data, package upgrade prompts, billing surfaces, payment provider work, package enforcement, or tenant module settings.
- Do not build billing before packages/modules are stable.
- Do not build onboarding before mode composition is stable.
- Do not add tenant-specific runtime enforcement until module docs, company settings, and rollout semantics are ready.

## Slice Summary

| Slice | Name | Risk | Runtime Behavior Change |
|---|---|---|---|
| 1 | Module registry runtime constants | Low | None |
| 2 | Product mode constants | Low | None |
| 3 | Enabled-module resolver | Low/Medium | None at first; compatibility output only |
| 4 | Permission/module compatibility helper | Medium | None at first; diagnostics only |
| 5 | Navigation composition registry | Medium | None at first; shadow registry |
| 6 | Command palette composition registry | Medium | None at first; shadow registry |
| 7 | Dashboard shell resolver | Medium/High | Deferred until mode shells are ready |
| 8 | Mode-native empty states | Medium | Low once wired; copy/surface changes only |
| 9 | Contextual upgrade prompt registry | Medium | Low once wired; sparse prompts only |
| 10 | Onboarding/package resolver | High | Deferred; setup/package semantics |
| 11 | Billing/package mapping later | High | Deferred; money/package authority |
| 12 | Tenant/company module settings later | High | Deferred; company-specific module state |

## Slice 1: Module Registry Runtime Constants

Goal:

- Introduce code-level module IDs and metadata that mirror `docs/FALCON_MODULE_REGISTRY.md`.
- Keep the registry inert and read-only.

Files likely affected:

- Future `src/lib/product/modules.js` or `src/lib/product/modules.ts`.
- Future unit tests for registry shape.
- Documentation references only if naming changes.

Backend impact:

- None.

Frontend impact:

- Constants only.
- No route, nav, dashboard, command palette, or permission behavior changes.

Migration impact:

- None.

Risk level:

- Low.

Validation checklist:

- Module IDs match the canonical docs.
- Categories match the canonical docs.
- Dependency arrays are metadata only.
- No imports from active navigation, routing, dashboard, or permission enforcement paths unless strictly type/metadata safe.
- `npm run lint`
- `npm run build`
- `git diff --check`

Stop conditions:

- A module ID diverges from the docs.
- Runtime behavior changes.
- A module registry import starts hiding/showing active app surfaces.

Explicitly not included:

- Company module settings.
- Billing packages.
- Route gating.
- Navigation composition.
- Dashboard composition.
- Permission seed changes.
- Database migrations.

## Slice 2: Product Mode Constants

Goal:

- Introduce product mode IDs, labels, descriptions, and default module bundles as metadata.
- Preserve Staff Appraisal, AMC Operations, Vendor Portal, Client Portal, and Hybrid/Ecosystem as canonical mode IDs.

Files likely affected:

- Future `src/lib/product/productModes.js` or `src/lib/product/productModes.ts`.
- Future tests for mode/module consistency.

Backend impact:

- None.

Frontend impact:

- Constants only.
- No product-mode switching UI.
- No route/nav/dashboard changes.

Migration impact:

- None.

Risk level:

- Low.

Validation checklist:

- Mode IDs match docs.
- Default module bundles match `docs/FALCON_PRODUCT_MODE_COMPOSITION.md`.
- Hidden modules are represented as metadata, not rendered UI.
- Optional/add-on modules are metadata only.
- `npm run lint`
- `npm run build`
- `git diff --check`

Stop conditions:

- Existing users receive a different visible app surface.
- Mode constants imply tenant enforcement or package access before settings exist.
- Vendor or Client mode metadata inherits Staff/Admin cockpit labels.

Explicitly not included:

- Organization switching.
- Onboarding.
- Billing.
- Tenant/company settings.
- Route changes.
- Database storage for product mode.

## Slice 3: Enabled-Module Resolver

Goal:

- Add a compatibility resolver that returns enabled modules for the current compatibility/default mode.
- Start with deterministic local metadata only.
- Prefer a single default output that preserves today's active app behavior.

Files likely affected:

- Future `src/lib/product/resolveEnabledModules.js`.
- Future tests for default-mode output.
- Existing docs if compatibility assumptions change.

Backend impact:

- None initially.

Frontend impact:

- Resolver can be imported by diagnostics or tests.
- No active route/nav/dashboard behavior changes in the first slice.

Migration impact:

- None.

Risk level:

- Low/Medium.

Validation checklist:

- Default resolver output preserves the currently expected module set.
- Disabled/hidden module metadata does not render locked UI.
- Resolver has no direct dependency on billing, onboarding, or company settings.
- Relationship state is not used to enable operational visibility.
- `npm run lint`
- `npm run build`
- `git diff --check`

Stop conditions:

- Resolver changes visible navigation or dashboard output before composition is ready.
- Resolver uses relationship records as visibility grants.
- Resolver reads mutable tenant settings before company module settings are designed.

Explicitly not included:

- Tenant-specific module enforcement.
- Company settings UI.
- Billing package resolver.
- Onboarding gates.
- RLS or RPC changes.

## Slice 4: Permission/Module Compatibility Helper

Goal:

- Add helper functions that answer whether a module surface can be considered available after combining enabled modules and existing permission checks.
- Keep helpers compatible with the current permission system.

Files likely affected:

- Future `src/lib/product/modulePermissions.js`.
- Existing permission hooks only if a read-only adapter is needed.
- Future tests for module-plus-permission decisions.

Backend impact:

- None.

Frontend impact:

- Helper-only at first.
- No active route/nav/dashboard/command changes until composition registries are wired deliberately.

Migration impact:

- None.

Risk level:

- Medium.

Validation checklist:

- Route/nav permission and action/workflow permission remain separate.
- Permissions do not create visibility alone.
- Helpers never bypass backend RLS/RPC checks.
- Dangerous permissions remain explicit.
- `npm run lint`
- `npm run build`
- `git diff --check`

Stop conditions:

- Helper grants row visibility from permissions alone.
- Helper treats role preset names as hardcoded authority.
- Helper collapses route access and workflow/action authority into one broad decision.

Explicitly not included:

- Permission seed changes.
- Backend helper changes.
- RLS changes.
- Workflow authorization changes.
- Button/action rewiring.

## Slice 5: Navigation Composition Registry

Goal:

- Create a shadow registry for module-owned navigation entries.
- Record lane, label, route, required modules, required permissions, mode support, and hidden-mode rules.
- Keep existing navigation components stable until a later wiring slice.

Files likely affected:

- Future `src/lib/product/navigationRegistry.js`.
- Future tests for nav registry shape and hidden module behavior.
- Later, `TopNav` and mobile nav only after explicit wiring.

Backend impact:

- None.

Frontend impact:

- Shadow registry only in the first slice.
- Later wiring should be incremental and snapshot-tested against current nav behavior.

Migration impact:

- None.

Risk level:

- Medium.

Validation checklist:

- Hidden modules do not produce disabled nav entries.
- Product mode owns lane structure.
- Route/nav permissions are represented separately from action permissions.
- Vendor and Client modes do not include internal Staff/AMC lanes by default.
- `npm run lint`
- `npm run build`
- `git diff --check`

Stop conditions:

- Existing navigation changes before parity tests exist.
- Locked-feature nav clutter appears.
- Assignment-only users see canonical order nav through registry defaults.

Explicitly not included:

- Route config changes.
- Active nav rendering changes.
- Upgrade prompt rendering.
- Billing or package gates.
- Tenant module settings.

## Slice 6: Command Palette Composition Registry

Goal:

- Create a shadow registry for module-owned command palette entries.
- Record command labels, actions/routes, required modules, required permissions, mode support, scope requirements, and dangerous-action flags.

Files likely affected:

- Future `src/lib/product/commandRegistry.js`.
- Future tests for command visibility rules.
- Later, `src/components/nav/CommandPalette.jsx` only after explicit wiring.

Backend impact:

- None.

Frontend impact:

- Shadow registry only in the first slice.
- Later wiring should preserve current command behavior for existing Staff/Appraisal-compatible users.

Migration impact:

- None.

Risk level:

- Medium.

Validation checklist:

- Command entries derive from enabled modules plus permissions.
- Assignment-only users do not see canonical order commands.
- Client Portal users do not see internal workflow, review, assignment, or vendor-management commands.
- Dangerous commands remain explicit and rare.
- `npm run lint`
- `npm run build`
- `git diff --check`

Stop conditions:

- Command palette exposes hidden module concepts.
- Command palette introduces action shortcuts that bypass existing guarded UI/RPC flows.
- Dangerous commands become global convenience commands.

Explicitly not included:

- Active command palette rewiring.
- Workflow action changes.
- Backend RPC changes.
- Permission seed changes.
- Relationship visibility changes.

## Slice 7: Dashboard Shell Resolver

Goal:

- Define how Falcon selects a dashboard shell by product mode and enabled modules.
- Keep the first implementation as a resolver and test fixture until mode-native dashboard shells are ready.

Files likely affected:

- Future `src/lib/product/dashboardResolver.js`.
- Future dashboard shell metadata.
- Later, `src/features/dashboard/DashboardGate.jsx` and dashboard pages only after explicit wiring.

Backend impact:

- None initially.

Frontend impact:

- Resolver-only at first.
- Later wiring may change dashboard shell selection and therefore needs focused visual/manual validation.

Migration impact:

- None.

Risk level:

- Medium/High.

Validation checklist:

- Existing order-capable users keep current dashboard behavior until a deliberate shell rollout.
- Vendor dashboard language is assignment-packet native.
- Client dashboard language is request/status/report native.
- Hybrid dashboard separates internal operations from network work.
- Dashboard widgets come only from enabled modules and readable data scope.
- `npm run lint`
- `npm run build`
- `git diff --check`

Stop conditions:

- Vendor or Client mode falls through to Staff/Admin order cockpit language.
- Assignment-only users see canonical order dashboard data.
- Dashboard shell selection changes current users before rollout criteria are defined.

Explicitly not included:

- New dashboard UI implementation.
- Dashboard data RPC changes.
- Calendar/order/client visibility changes.
- Analytics widgets.
- Billing/onboarding prompts.

## Slice 8: Mode-Native Empty States

Goal:

- Add metadata and copy patterns for mode-native empty states.
- Ensure empty states explain setup, next action, or scoped absence without implying a broken account.

Files likely affected:

- Future `src/lib/product/emptyStates.js`.
- Later, list/dashboard/detail components where empty states currently use generic copy.
- Documentation for copy standards.

Backend impact:

- None.

Frontend impact:

- Metadata first.
- Later wiring changes copy and call-to-action behavior only.

Migration impact:

- None.

Risk level:

- Medium.

Validation checklist:

- Vendor empty states use assignment packet language.
- Client empty states use request, status, document, and report language.
- Staff/AMC empty states use their own operational vocabulary.
- Empty states do not advertise hidden modules as missing features.
- `npm run lint`
- `npm run build`
- `git diff --check`

Stop conditions:

- Empty states imply the account is incomplete because hidden modules are unavailable.
- Empty states route users into disabled or unrelated modules.
- Empty states expose internal workflow language to client or vendor users.

Explicitly not included:

- Onboarding flow.
- Billing prompts.
- New route surfaces.
- Data model changes.

## Slice 9: Contextual Upgrade Prompt Registry

Goal:

- Add a sparse registry for contextual upgrade prompts tied to enabled workflow context.
- Prevent locked-feature nav clutter and unavailable-module graveyards.

Files likely affected:

- Future `src/lib/product/upgradePrompts.js`.
- Later, carefully selected surfaces where upgrade prompts are appropriate.

Backend impact:

- None initially.

Frontend impact:

- Metadata first.
- Later wiring should be sparse and surface-specific.

Migration impact:

- None.

Risk level:

- Medium.

Validation checklist:

- Prompts appear only from related enabled-module context.
- Prompts do not interrupt core work.
- Prompts do not replace setup/empty-state guidance.
- Hidden modules do not appear as persistent locked nav.
- `npm run lint`
- `npm run build`
- `git diff --check`

Stop conditions:

- Upgrade prompts appear globally.
- Prompt registry becomes a product tour of unavailable modules.
- Vendor/Client users see internal Staff/AMC upsell clutter.

Explicitly not included:

- Billing checkout.
- Package enforcement.
- Subscription state.
- Sales/contact workflow.
- Tenant settings.

## Slice 10: Onboarding/Package Resolver

Goal:

- Define how onboarding state and package metadata should eventually influence setup steps and product-mode completion.
- Defer implementation until mode composition and module bundles are stable.

Files likely affected:

- Future onboarding/package metadata files.
- Future onboarding UI components.
- Future company setup RPC wrappers if backend state is needed.

Backend impact:

- Deferred.
- May eventually need company setup/package read projections.

Frontend impact:

- Deferred.
- May eventually influence setup checklists and mode-native first-run states.

Migration impact:

- Deferred.
- No schema until onboarding state and package semantics are documented.

Risk level:

- High.

Validation checklist:

- Onboarding does not block existing users unexpectedly.
- Setup steps are mode-native.
- Package metadata does not imply billing authority.
- Hidden modules remain hidden unless setup requires a contextual explanation.
- `npm run lint`
- `npm run build`
- `git diff --check`
- Manual first-run checks once UI exists.

Stop conditions:

- Onboarding gates core app access before rollout policy exists.
- Onboarding assumes billing/package enforcement.
- Onboarding widens relationship, order, client, or assignment visibility.

Explicitly not included:

- Billing.
- Subscription enforcement.
- Tenant module settings.
- Organization switching.
- Database migrations in the planning slice.

## Slice 11: Billing/Package Mapping Later

Goal:

- Map product packages to module bundles only after modules, modes, upgrade prompts, and onboarding semantics are stable.

Files likely affected:

- Future billing/package metadata.
- Future billing UI.
- Future Edge/server billing integration code.
- Future package entitlement resolver.

Backend impact:

- Deferred.
- May eventually require package/subscription storage or integration with a billing provider.

Frontend impact:

- Deferred.
- May eventually affect package management and upgrade flows.

Migration impact:

- Deferred.
- No database migration until billing/package authority is explicitly designed.

Risk level:

- High.

Validation checklist:

- Package-to-module mapping matches canonical module bundles.
- Billing does not define operational visibility.
- Subscription state does not bypass permission or row-scope checks.
- Owner-sensitive billing permissions are explicit.
- Payment/provider failure modes are safe.

Stop conditions:

- Billing starts driving product behavior before package/module mapping is stable.
- Billing state grants order/client/assignment visibility.
- Non-owner users can alter subscription, payment methods, or package authority without explicit permissions.

Explicitly not included:

- Immediate billing implementation.
- Checkout/session logic.
- Payment method management.
- Invoice UI.
- Tenant enforcement.

## Slice 12: Tenant/Company Module Settings Later

Goal:

- Persist company-specific enabled modules and product mode only after module docs, package mapping, onboarding semantics, and enforcement strategy are ready.

Files likely affected:

- Future company module settings migrations.
- Future tenant admin RPCs.
- Future company settings UI.
- Future active-company/module resolver integration.

Backend impact:

- Deferred.
- Eventually high impact because company settings may affect visible surfaces.

Frontend impact:

- Deferred.
- Eventually high impact because routes/nav/dashboards may derive from company module settings.

Migration impact:

- Deferred.
- Requires careful additive schema, backfills, default compatibility behavior, RLS/RPC design, and rollout checks.

Risk level:

- High.

Validation checklist:

- Existing companies retain stable default behavior.
- Module settings are additive and compatibility-safe.
- Tenant-specific settings do not widen relationship visibility.
- Hidden modules do not render locked clutter.
- Backend enforcement remains separate from UI composition until explicitly designed.
- Rollback/disable behavior is documented before launch.

Stop conditions:

- Company settings can strand users without a stable fallback.
- Settings hide core surfaces before support/onboarding semantics exist.
- Tenant-specific module state is treated as authorization without backend enforcement design.
- Relationship existence is used as module or visibility authority.

Explicitly not included:

- Immediate database migration.
- Company settings UI.
- Organization switching changes.
- Billing package enforcement.
- Tenant-specific RLS changes.

## Recommended Build Order

1. Ship module registry constants.
2. Ship product mode constants.
3. Ship enabled-module resolver in compatibility/default mode.
4. Ship permission/module compatibility helpers as diagnostics.
5. Ship shadow navigation registry.
6. Ship shadow command palette registry.
7. Add dashboard shell resolver behind stable current behavior.
8. Add mode-native empty-state metadata.
9. Add sparse upgrade prompt metadata.
10. Only then evaluate onboarding/package resolver.
11. Only after package semantics are stable, design billing/package mapping.
12. Only after package and onboarding semantics are stable, design tenant/company module settings.

## Global Stop Conditions

- Existing routes, navigation, dashboard, or command palette behavior changes during metadata-only slices.
- Hidden modules render as disabled or locked clutter.
- Relationship state grants operational visibility.
- Vendor or Client Portal language falls back to Staff/Admin cockpit terminology.
- Billing or onboarding begins before module/package semantics are stable.
- Tenant-specific runtime enforcement begins before company module settings and rollout semantics are designed.
- Permission helpers grant visibility without company membership and readable row/packet/portal scope.

## Validation Baseline

Every implementation slice should run:

- `npm run lint`
- `npm run build`
- `git diff --check`

Slices that later touch active navigation, command palette, dashboard, onboarding, or package behavior should also add focused unit tests and manual browser checks for Staff Appraisal, AMC Operations, Vendor Portal, Client Portal, and Hybrid/Ecosystem expectations before rollout.
