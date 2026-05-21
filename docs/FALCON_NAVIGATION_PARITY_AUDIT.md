# Falcon Navigation Parity Audit

## Purpose

This audit compares Falcon's current active navigation and route surfaces with the Phase 9H shadow product-mode navigation diagnostics.

It is a documentation checkpoint before any live navigation, route, command palette, or dashboard migration begins.

This audit does not implement code, change routes, change navigation, change dashboard behavior, change command palette behavior, add migrations, or change permissions/seeds.

The safe future live navigation migration plan is defined in `docs/FALCON_ACTIVE_NAVIGATION_MIGRATION_PLAN.md`.

## Phase 9H21 Diagnostics Lock

The navigation diagnostics layer is now code-backed and displayed in the protected Product Metadata Diagnostics page.

Completed current-live registry:

- `src/lib/navigation/currentNavigationRegistry.js`

Completed parity diagnostics:

- `src/lib/navigation/navigationParityDiagnostics.js`

Diagnostics page coverage:

- The page displays shadow navigation diagnostics and live-vs-shadow navigation parity for the selected product mode.
- The page also displays product modes, module registry metadata, shadow route, command palette, dashboard, empty-state, and upgrade diagnostics, plus command/dashboard parity sections.

Safety boundary:

- Active `TopNav` and mobile navigation remain unchanged.
- Active route authority remains unchanged.
- Active `CommandPalette` and `DashboardGate` remain unchanged.
- Permissions, seeds, migrations, company/module settings, billing, onboarding, and package behavior remain unchanged.
- The current-live navigation registry is descriptive only and is not imported by active navigation rendering.
- Shadow navigation metadata and parity output are diagnostic/non-authoritative and do not authorize access.

Migration readiness:

- Staff/default navigation is closest to parity and is the only appropriate starting point.
- AMC remains partial/future and needs AMC-native lanes and labels before active mode-aware nav.
- Vendor and Client remain future shell/data-contract dependent.
- Hybrid lane separation remains future.
- The next active slice should be a tiny low-risk nav section, not a full `TopNav` rewrite.

## Phase 9H23 Diagnostic Route Registry Lock

Phase 9H22 completed the first live route reference that reads from the current-live navigation registry.

Completed H22 migration:

- The Product Metadata Diagnostics route now derives path and required permission from `currentNavigationRegistry` through `src/routes/diagnosticRoutes.js`.
- The existing `/settings/product-metadata-diagnostics` path is preserved.
- The existing `settings.view` gate is preserved.
- No product-mode metadata, shadow navigation metadata, module composition, company settings, or module settings are runtime authority for this route.
- Active `TopNav`, mobile navigation, `CommandPalette`, `DashboardGate`, dashboard components, permissions, seeds, migrations, and visible settings links remain unchanged.

Current safety state:

- `currentNavigationRegistry` can safely describe one live route reference.
- Active route authority remains permission-based.
- The registry is current-live metadata, not product-mode runtime authority.
- Product-mode and shadow metadata remain diagnostic only.

Historical low-risk migration plan, now completed through H24/H25:

- Prefer Notification Settings route/link metadata next.
- Notification Settings was settings-scoped, already permission-gated, and lower risk than primary navigation.
- The settings/admin utility link group was migrated only where visible behavior already existed.
- Diagnostics remains hidden/diagnostic-only; no visible diagnostics link was added.

Required guardrails:

- Preserve paths.
- Preserve permission gates.
- Preserve visible labels.
- Do not migrate primary `TopNav` items yet.
- Do not migrate mobile navigation yet.
- Do not migrate `CommandPalette` yet.
- Do not introduce Vendor or Client concepts.
- Do not add mode-aware behavior.

## Phase 9H26 Settings Utility Registry Lock

Phase 9H25 completed the settings/admin utility link registry migration.

Completed H25 migration:

- The avatar `Account settings` link now uses registry-backed metadata for its current label and path.
- The Settings page `Notification Settings →` link now uses registry-backed metadata for its current label and path.
- Product Metadata Diagnostics remains hidden and diagnostic-only.
- Current visible labels, order, routes, and gates are preserved.

Safety boundary:

- Primary operational `TopNav` navigation remains unchanged.
- Mobile navigation remains unchanged.
- Active `CommandPalette` remains unchanged.
- Active dashboards remain unchanged.
- Product-mode and shadow metadata remain diagnostic only and do not authorize live navigation.
- Vendor and Client future concepts were not introduced.
- Module/company setting enforcement remains deferred.

Validation baseline:

- `currentSettingsUtilityLinks` tests.
- `currentNavigationRegistry` tests.
- Diagnostic route tests.
- Lint, build, and `git diff --check`.
- Static import scan confirming no product-mode/shadow metadata imports in active nav authority.

Primary nav readiness checklist:

- Current live registry covers primary nav entries.
- `TopNav` behavior and loading/fallback semantics are documented.
- Permission loading/error behavior is understood.
- Mobile nav relationship to primary nav is understood.
- Clients dynamic route behavior is preserved.
- No mode-aware behavior is introduced.
- Rollback path is clear.

Next allowed slice:

- Prefer Phase 9H27 TopNav primary nav behavior audit/planning.
- Alternative: extract current primary nav entries into a registry-backed helper without rendering changes.

## Phase 9H27 TopNav Primary Navigation Audit

Phase 9H27 completed the documentation audit for current primary `TopNav` behavior before helper extraction or registry-backed rendering.

Completed H27 audit:

- `docs/FALCON_TOPNAV_PRIMARY_NAV_AUDIT.md` documents current Dashboard, Orders, Calendar, Clients, Relationships, Assignments, Users, Activity, Settings, mobile nav, and command palette relationships.
- Current `TopNav` authority is permission-only; no legacy role fallback remains in active TopNav rendering.
- Permissioned links are hidden until active permission hooks report `allowed`; Orders and Calendar remain always visible in TopNav.
- Clients retain dynamic routing: `/clients` for `clients.read.all`, `/clients/cards` for assigned-only client access.
- Assignment nav remains assignment-permission-driven and does not grant canonical order visibility.
- Desktop and mobile nav are duplicated hardcoded JSX blocks today, with separate drift risk.
- Active state remains exact-path based through `NavLink end`.

Safety boundary:

- No code changed.
- Primary operational nav remains unchanged.
- Mobile nav remains unchanged.
- `CommandPalette` remains unchanged.
- Dashboards remain unchanged.
- Product-mode and shadow metadata remain diagnostic only.
- No Vendor/Client concepts, mode-aware behavior, module setting enforcement, or company setting enforcement were introduced.

Next allowed slice:

- Prefer Phase 9H28 extraction of current primary nav entries into a current-live helper with no rendering changes.

## Phase 9H31 TopNav Primary Registry Migration Lock

Phase 9H28 through Phase 9H30 completed the behavior-preserving current-live helper migration for primary `TopNav` rendering.

Completed migration:

- `src/lib/navigation/currentPrimaryNavLinks.js` now returns current primary operational nav entries from `currentNavigationRegistry` metadata.
- Desktop primary `TopNav` renders from `getCurrentPrimaryNavLinks()`.
- Mobile primary `TopNav` renders from `getCurrentPrimaryNavLinks()`.
- Current order is preserved: Orders, Assignments, Relationships, Calendar, Clients, Users.
- Current labels, paths, permission hiding, and exact active-state rendering through `NavItem` are preserved.
- Clients dynamic route behavior is preserved: `/clients` for `clients.read.all`, `/clients/cards` for assigned-only access.
- Mobile close-on-navigation behavior is preserved.
- Settings/account utility behavior remains separate from primary nav.

Safety boundary:

- No product-mode or shadow metadata is live authority.
- No mode-aware nav was introduced.
- No Vendor Portal or Client Portal future concepts were introduced.
- `CommandPalette` remains unchanged and independently implemented.
- Dashboard behavior remains unchanged.
- Route authority, permissions, seeds, migrations, company settings, module settings, and backend behavior remain unchanged.

Validation baseline:

- `src/lib/navigation/__tests__/currentPrimaryNavLinks.test.js`
- `src/components/shell/__tests__/TopNav.test.jsx`
- `npm run lint`
- `npm run build`
- `git diff --check`
- Static scans confirming no product-mode/shadow metadata imports in `TopNav` or active nav authority surfaces.

Next allowed slice:

- Prefer Phase 9H32 current `CommandPalette` registry extraction, or Phase 9H32 command palette migration plan/audit update before extraction.

## Current Active Navigation Surfaces

### TopNav

`src/components/shell/TopNav.jsx` is the current primary navigation surface.

Desktop navigation currently exposes:

- Orders: always rendered as a top-level nav item.
- Assignments: rendered when the user has `order_company_assignments.read_assigned` or `order_company_assignments.read_owner`.
- Relationships: rendered when the user has `relationships.read`.
- Calendar: always rendered as a top-level nav item.
- Clients: rendered when the user has `clients.read.all` or `clients.read.assigned`.
- Users: rendered when the user has `users.read`.

The brand links to `/dashboard`.

Dashboard is not a desktop primary nav item.

The avatar menu links to `/settings` through "Account settings".

Settings is not shown in desktop primary navigation. It is reachable from the avatar menu and mobile navigation.

Activity is not shown in desktop primary navigation.

Clients uses dynamic route behavior: `clients.read.all` routes to `/clients`, while assigned-only access routes to `/clients/cards`.

TopNav primary operational navigation currently resolves permission booleans through active permission hooks, then renders primary links through `getCurrentPrimaryNavLinks()`. No legacy role fallback remains in active TopNav rendering. Permissioned links are hidden until their permission hooks report `allowed`; Orders and Calendar are always rendered. The avatar `Account settings` utility link reads current label/path metadata from `currentSettingsUtilityLinks`, which is backed by `currentNavigationRegistry`. TopNav does not use product-mode metadata, module registry metadata, shadow navigation diagnostics, or company module settings.

### Mobile Nav

The mobile nav is defined inside `TopNav`.

It mirrors the primary operational links:

- Orders.
- Assignments when assignment read permission exists.
- Relationships when relationship read permission exists.
- Calendar.
- Clients when client read permission exists.
- Users when user read permission exists.
- Settings when `settings.view` exists.

The mobile primary nav is permission-driven through the same current-live helper as desktop primary nav. It is not module-driven or mode-aware.

Activity is not shown in mobile nav. Mobile Settings appears after a separator and remains gated by `settings.view`.

### Command Palette

`src/components/nav/CommandPalette.jsx` is the active command palette.

It currently contains hardcoded commands for:

- Go to Orders.
- Go to Assignments when assignment read permission exists.
- Go to Relationships when relationship read permission exists.
- Go to Calendar.
- Go to Clients.
- Go to Users.
- Open Settings.
- Notification Settings.

The palette filters entries by permission metadata from active permission hooks. It does not use product-mode metadata or the shadow command composition diagnostics.

The command palette still includes order-search fallback behavior when no filtered command matches and the user has order navigation permission.

### Settings And Admin Links

`/settings` currently links to `/settings/notifications`.

The Phase 9H10 developer diagnostics route exists at `/settings/product-metadata-diagnostics`, protected by `settings.view`, but it is route-only. As of Phase 9H22, the active route reference derives this path and gate from `currentNavigationRegistry`. It is still not linked from TopNav, mobile nav, command palette, or the Settings page.

Team Access is exposed through `/users` when `users.read` exists. The current label is `Users`, while product-mode planning generally uses `Team Access` for the module concept.

### Dashboard Links

`/dashboard` is routed through `DashboardGate`.

Current dashboard behavior:

- Users with order dashboard permissions receive the existing order dashboard.
- Assignment-only users receive `AssignmentDashboardPage`.
- Users without either dashboard capability receive a stable unavailable state.

Assignment dashboard rows link only to `/assignments/:assignmentId`.

Owner assignment packet surfaces may link back to owner orders when the current user is on the owner-side packet context.

Dashboard behavior is permission-driven, not product-mode/module-driven.

### Assignment Links

Assignment surfaces link to:

- `/assignments`.
- `/assignments/:assignmentId`.
- Owner packet context may link to `/orders/:orderId`.

Assigned-company assignment links stay packet-native and do not link to `/orders`.

### Relationship Links

Relationship surfaces link to:

- `/relationships`.
- `/relationships/:relationshipId`.

Relationship route and nav visibility require `relationships.read`.

Relationship existence does not grant order, client, assignment, activity, notification, calendar, queue, workflow, or team visibility.

## Current Route Authority

`src/routes/index.jsx` remains the active route authority.

Public routes:

- `/login`.
- `/accept-invite/:invitationId`.

Authenticated-only routes:

- `/dashboard`, with final dashboard selection delegated to `DashboardGate`.

Permission-gated operational routes:

- `/orders`: `orders.read.all` or `orders.read.assigned`.
- `/orders/new`: `orders.create`.
- `/orders/:id`: `orders.read.all` or `orders.read.assigned`.
- `/orders/:id/edit`: `orders.update.all`.
- `/calendar`: `navigation.orders.view`, `orders.read.all`, or `orders.read.assigned`.
- `/activity`: `activity.read.all` or `activity.read.assigned`.
- `/clients`: `clients.read.all`.
- `/clients/new`: `clients.create`.
- `/clients/profile/:clientId`: `clients.read.all`.
- `/clients/edit/:clientId`: `clients.update.all`.
- `/clients/cards`: `clients.read.all` or `clients.read.assigned`.
- `/clients/:id`: `clients.read.all` or `clients.read.assigned`.

Assignment routes:

- `/assignments`: `order_company_assignments.read_assigned` or `order_company_assignments.read_owner`.
- `/assignments/:assignmentId`: `order_company_assignments.read_assigned` or `order_company_assignments.read_owner`.

Relationship routes:

- `/relationships`: `relationships.read`.
- `/relationships/:relationshipId`: `relationships.read`.

Settings routes:

- `/settings`: `settings.view`.
- `/settings/notifications`: `notifications.preferences.manage_own`.
- `/settings/product-metadata-diagnostics`: `settings.view`.

User/team routes:

- `/users`: `users.read`.
- `/users/:userId`, `/users/new`, and `/users/view/:userId` redirect to safer current routes.

The active route table is permission-driven. It is not product-mode-driven and does not call shadow route or shadow navigation composition.

## Shadow Navigation Expectations

Shadow navigation is diagnostic metadata only. It is not active navigation authority.

### Staff Appraisal

Shadow expected labels:

- Dashboard.
- Orders.
- Calendar.
- Clients.
- Team Access.
- Reports / Analytics.
- Settings.

Shadow visible modules:

- Dashboard.
- Notifications.
- Activity.
- Settings.
- Orders.
- Clients.
- Team Access.
- Reviews.
- Calendar.

Current parity:

- Strong parity for Orders, Calendar, Clients, Settings, Dashboard, Notifications, Activity, and Team Access capability.
- Partial naming gap: current nav says `Users`; shadow/module language says `Team Access`.
- Review is not a dedicated active nav surface; review behavior is still embedded in order workflow and dashboard/action surfaces.
- Reports / Analytics is not live in current nav.
- Staff/default nav should remain stable until parity is explicitly tested.

### AMC Operations

Shadow expected labels:

- AMC Dashboard.
- Orders / Intake.
- Assignments.
- Vendor Panel.
- Clients / Lenders.
- Reviews / QC.
- Calendar / SLA.
- Analytics.
- Integrations.
- Settings.

Shadow visible modules:

- Dashboard.
- Notifications.
- Activity.
- Settings.
- Orders.
- Clients.
- Assignments.
- Relationships.
- Reviews.
- Calendar.
- AMC Operations.

Current parity:

- Partial parity exists through Orders, Assignments, Relationships, Clients, Calendar, Dashboard, Notifications, Activity, and Settings.
- Missing AMC-native surfaces include AMC Dashboard, Orders / Intake naming, Vendor Panel, Clients / Lenders naming, Reviews / QC, Calendar / SLA, Analytics, and Integrations.
- Current assignment and relationship surfaces are real and safe, but they are not yet composed as an AMC Operations navigation lane.
- Current language remains Staff/default-oriented in several places.

### Vendor Portal

Shadow expected labels:

- My Assignments.
- Due Soon.
- Revisions.
- Messages / Updates.
- Completed Work.
- Profile / Availability.
- Settings.

Shadow visible modules:

- Dashboard.
- Notifications.
- Activity.
- Settings.
- Assignments.
- Vendor Portal.
- Calendar.

Current parity:

- Assignment-only dashboard routing and packet links provide an active foundation.
- `/assignments` and `/assignments/:assignmentId` are the closest active equivalents.
- Missing Vendor-native navigation includes My Assignments naming, Due Soon, Revisions, Messages / Updates, Completed Work, and Profile / Availability.
- Current TopNav still always renders Orders and Calendar, so it is not yet safe as a Vendor Portal nav shell.
- Vendor Portal live nav must not be exposed until real portal routes and route guards exist.

### Client Portal

Shadow expected labels:

- Submit Request.
- My Requests.
- Status Updates.
- Documents / Reports.
- Messages / Updates.
- Organization Users.
- Billing.
- Settings.

Shadow visible modules:

- Dashboard.
- Notifications.
- Activity.
- Settings.
- Client Portal.
- Reports.
- Orders.

Current parity:

- Current active routes do not provide a client portal shell.
- Current order/client/dashboard surfaces are internal operational surfaces, not client-facing request/status/document views.
- `/settings` and notification preferences are general account surfaces only.
- No live client nav should be composed from the shadow model until real client portal routes, projections, copy, and visibility boundaries exist.

### Hybrid / Ecosystem

Shadow expected labels:

- Internal Operations.
- Network Work.
- Sent Assignments.
- Relationships.
- Clients / Portals.
- Intelligence.
- Administration.

Shadow visible modules:

- Dashboard.
- Notifications.
- Activity.
- Settings.

Current parity:

- Current app can show internal orders, assignments, relationships, clients, users, and settings together when permissions allow.
- Current nav does not separate lanes. It is a flat operational nav.
- Hybrid lane metadata is diagnostic only and needs a later lane parity audit before any live migration.
- Hybrid migration must preserve mental separation between internal operations, network work, client/portal concepts, intelligence, and administration.

## Gaps

Current Staff-compatible surfaces:

- Orders, Calendar, Clients, Dashboard, Activity, Notifications, Settings, Users/Team Access, assignment packet management, and relationships all have active foundations.
- Staff/default behavior is the safest baseline and should remain stable first.

Missing AMC surfaces:

- AMC Dashboard.
- Orders / Intake naming and queue framing.
- Vendor Panel.
- Clients / Lenders language.
- Reviews / QC lane.
- Calendar / SLA framing.
- Analytics and Integrations surfaces.
- AMC-specific lane grouping.

Missing Vendor surfaces:

- Vendor-native navigation shell.
- My Assignments label.
- Due Soon / Revisions / Completed Work packet lenses.
- Messages / Updates.
- Profile / Availability.
- Vendor-specific dashboard/nav copy.
- A live nav shell that does not expose Orders by default.

Missing Client surfaces:

- Client request submission.
- My Requests.
- Status Updates.
- Documents / Reports.
- Messages / Updates.
- Organization Users.
- Billing visibility.
- Client-safe dashboard and route projections.

Hybrid lane gaps:

- Current nav is flat rather than lane-based.
- No live distinction between internal operations, network work, sent assignments, client/portal surfaces, intelligence, and administration.
- Current permission visibility can combine surfaces, but it does not communicate Hybrid lane boundaries.

Route/nav names that conflict with or lag the language guide:

- `Users` should eventually become `Team Access` where it is company access management rather than generic user administration.
- `Clients` may need `Clients / Lenders` in AMC mode.
- `Orders` may need `Orders / Intake` in AMC mode and must not appear as canonical internal orders in Vendor/Client portal shells.
- `Calendar` may need `Calendar / SLA` in AMC mode and packet-deadline language in Vendor mode.
- `Assignments` may need `My Assignments`, `Sent Assignments`, or lane-specific labels depending on mode.

Surfaces that are permission-driven but not module-driven:

- TopNav.
- Mobile nav.
- Command palette.
- Route table.
- DashboardGate.
- Settings links.
- Assignment and relationship in-surface links.

Surfaces that should remain hardcoded for now:

- Existing Staff/default TopNav and mobile nav.
- Active route config in `src/routes/index.jsx`.
- `DashboardGate`.
- Assignment packet links.
- Relationship list/detail links.
- Settings and Notification Settings links.
- Product metadata diagnostics route.

## Migration Recommendations

Recommended safe order:

1. Keep Staff/default nav stable first.
2. Keep metadata in diagnostics and parity audit mode before active use.
3. Add a read-only composed navigation preview later, separate from active `TopNav`.
4. Build a shadow-vs-current Staff nav parity test/audit before replacing any live item.
5. Migrate one low-risk nav section at a time, starting with label/visibility parity that does not alter route authority.
6. Keep route authority in `src/routes/index.jsx` until route composition has its own fallback and test plan.
7. Do not expose Vendor or Client live nav until real portal routes, copy, dashboard shells, and visibility projections exist.
8. Do not use package, billing, onboarding, or company-module settings as runtime gates yet.

Candidate next audits:

- Staff shadow-vs-current nav parity audit.
- Command palette parity audit.
- Dashboard shell migration plan.
- Mode-safe route exposure audit after portal route plans exist.

## Guardrails

- Do not treat shadow navigation as authority yet.
- Do not remove existing working nav during metadata migration.
- Do not expose Vendor or Client concepts in live nav prematurely.
- Do not expose hidden modules as locked clutter.
- Do not widen access through nav composition.
- Do not let permission metadata authorize visibility.
- Do not let relationship state alone grant operational visibility.
- Do not let nav composition bypass `ProtectedRoute`, RLS, readable order/client predicates, assignment packet access, or portal-safe projections.
- Do not collapse Hybrid lanes into one universal nav.

## Validation Baseline

This audit should be kept current with:

- `npm run lint`.
- `npm run build`.
- `git diff --check`.
- Static scans proving shadow composition remains limited to tests and `/settings/product-metadata-diagnostics`.
- Existing shadow navigation and cross-registry integrity tests.
