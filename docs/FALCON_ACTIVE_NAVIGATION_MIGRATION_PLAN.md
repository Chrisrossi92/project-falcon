# Falcon Active Navigation Migration Plan

## Purpose

This document defines the safe implementation plan for migrating Falcon's live navigation toward module/product-mode metadata.

It is planning documentation only. It does not change `TopNav`, mobile navigation, routes, command palette behavior, dashboards, permissions, seeds, migrations, billing, onboarding, company settings, or runtime product behavior.

The goal is to create a path from the current hardcoded, permission-driven navigation to a registry-backed navigation model without changing current Staff/default behavior or exposing future mode concepts prematurely.

## Phase 9H21 Live Surface Diagnostics Lock

The live-surface diagnostics layer is complete before active migration begins.

Completed current-live registries:

- `src/lib/navigation/currentNavigationRegistry.js`
- `src/lib/commandPalette/currentCommandRegistry.js`
- `src/lib/dashboard/currentDashboardRegistry.js`

Completed live-vs-shadow parity helpers:

- `src/lib/navigation/navigationParityDiagnostics.js`
- `src/lib/commandPalette/commandPaletteParityDiagnostics.js`
- `src/lib/dashboard/dashboardParityDiagnostics.js`

Protected diagnostics page coverage:

- Product modes.
- Module registry.
- Shadow nav, routes, command palette, dashboard, empty-state, and upgrade-prompt diagnostics.
- Live-vs-shadow navigation parity.
- Live-vs-shadow command palette parity.
- Live-vs-shadow dashboard parity.

Current safety boundary:

- Active `TopNav` remains unchanged.
- Active `CommandPalette` remains unchanged.
- Active `DashboardGate` and dashboard components remain unchanged.
- Routes and route authority remain unchanged except the existing protected diagnostics route.
- Permissions, seeds, migrations, company settings, module settings, billing, onboarding, and package behavior remain unchanged.
- Shadow metadata and current-live registries remain diagnostic/non-authoritative.
- Permission metadata remains descriptive only; active route guards, action guards, and backend visibility rules remain authority.

Readiness state:

- Staff/default is closest to parity and is the only reasonable starting point for active rendering migration.
- AMC is partial/future and still needs AMC-native lanes, copy, queue contracts, dashboard shell, and command-center semantics.
- Vendor and Client surfaces remain shell/data-contract dependent and must not appear in live nav before real routes and safe projections exist.
- Hybrid lane separation remains future; current live surfaces are not lane-aware.
- Active migration should start only with a tiny low-risk nav section.

## Phase 9H23 Diagnostic Route Registry Lock

Phase 9H22 completed the first live registry-backed route reference before any broader navigation migration.

Completed H22 migration:

- The Product Metadata Diagnostics route derives its path and required permission from `currentNavigationRegistry` through `src/routes/diagnosticRoutes.js`.
- The existing `/settings/product-metadata-diagnostics` path is preserved.
- The existing `settings.view` gate is preserved.
- The route remains protected by active route authority, not by product-mode or shadow metadata.
- Active `TopNav`, mobile navigation, `CommandPalette`, `DashboardGate`, dashboard components, permissions, seeds, migrations, company settings, and module settings remain unchanged.

Current safety state:

- `currentNavigationRegistry` can safely describe one live route reference.
- Route authority remains permission-based through the existing route guard.
- The registry is current-live metadata. It is not product-mode runtime authority.
- Product-mode and shadow metadata remain diagnostic only.

Historical next low-risk candidate, now completed through H24/H25:

- Prefer Notification Settings route/link metadata next.
- Notification Settings was settings-scoped, already permission-gated, and lower risk than primary navigation.
- The settings/admin utility link group was migrated only where visible behavior already existed.
- Diagnostics remains hidden/diagnostic-only; no visible diagnostics link was added.

Required guardrails for the next slice:

- Preserve the existing path.
- Preserve the existing permission gate.
- Preserve visible labels.
- Do not migrate primary `TopNav` items yet.
- Do not migrate mobile navigation yet.
- Do not migrate `CommandPalette` yet.
- Do not introduce Vendor or Client concepts.
- Do not add mode-aware behavior.

## Phase 9H26 Settings Utility Registry Lock

Phase 9H25 completed the low-risk settings/admin utility link registry migration.

Completed H25 migration:

- The avatar `Account settings` link now reads label and path from `currentNavigationRegistry` through `src/lib/navigation/currentSettingsUtilityLinks.js`.
- The Settings page `Notification Settings →` link now reads label and path from the same current-live helper.
- Product Metadata Diagnostics remains hidden and diagnostic-only.
- Current labels, ordering, routes, and gates are preserved.
- Active primary operational navigation remains unchanged.
- Mobile navigation remains unchanged.
- `CommandPalette` remains unchanged.
- `DashboardGate` and dashboard components remain unchanged.
- Product-mode and shadow metadata remain diagnostic only and are not live authority.
- Vendor and Client future concepts remain absent from active settings/admin utility links.
- Company/module settings, package enforcement, billing, onboarding, permissions, seeds, and migrations remain unchanged.

Validation baseline:

- `src/lib/navigation/__tests__/currentSettingsUtilityLinks.test.js`
- `src/lib/navigation/__tests__/currentNavigationRegistry.test.js`
- `src/routes/__tests__/diagnosticRoutes.test.js`
- `npm run lint`
- `npm run build`
- `git diff --check`
- Static import scan proving no product-mode/shadow metadata imports in active nav authority surfaces.

Primary nav readiness checklist:

- `currentNavigationRegistry` covers current primary nav entries with stable labels, routes, surfaces, active-route behavior, and permission metadata.
- Current `TopNav` rendering behavior is documented before any primary rendering migration.
- Permission loading and error fallback behavior is understood before removing hardcoded primary nav branches.
- Mobile nav relationship to desktop primary nav is explicit and must not change accidentally.
- Clients dynamic route behavior remains preserved: `clients.read.all` routes to `/clients`, assigned-only access routes to `/clients/cards`.
- No mode-aware behavior, Vendor/Client concepts, company/module setting enforcement, or product-mode authority is introduced.
- Rollback path is clear before registry-backed primary nav rendering ships.

Next allowed slice:

- Prefer Phase 9H27 TopNav primary nav behavior audit/planning.
- Alternative Phase 9H27 path: extract current primary nav entries into a registry-backed helper without rendering changes.

## Phase 9H27 TopNav Primary Navigation Behavior Audit

Phase 9H27 completed the primary `TopNav` behavior audit before any primary operational nav helper extraction or registry-backed rendering.

Completed H27 audit:

- `docs/FALCON_TOPNAV_PRIMARY_NAV_AUDIT.md` records current desktop and mobile `TopNav` behavior for Dashboard, Orders, Calendar, Clients, Relationships, Assignments, Users, Activity, and Settings.
- The audit records current permission hook authority, permission-only behavior, loading/fallback semantics, hidden-versus-disabled behavior, dynamic Clients route behavior, assignment visibility behavior, and command palette/dashboard relationships.
- The audit documents current hardcoded rendering patterns, duplicated desktop/mobile JSX, ordering assumptions, icon handling, exact active-state behavior, and drift risks.
- The audit defines the recommended extraction sequence: current-live helper only, parity tests, desktop helper rendering, mobile helper rendering, and diagnostics-only live-vs-shadow comparison.

Safety boundary:

- Primary operational nav remains unchanged.
- Mobile nav remains unchanged.
- `CommandPalette` remains unchanged.
- Dashboards remain unchanged.
- No product-mode or shadow metadata is live authority.
- No Vendor or Client future concepts are introduced.
- No module/company setting enforcement is introduced.

Next allowed slice:

- Prefer Phase 9H28: extract current primary nav entries into a current-live registry-backed helper without rendering changes.
- Keep desktop rendering, mobile rendering, `CommandPalette`, dashboards, routes, permissions, seeds, and migrations unchanged.

## Phase 9H31 TopNav Primary Registry Migration Lock

Phase 9H28 through Phase 9H30 completed the current-live primary `TopNav` registry migration.

Completed migration:

- Phase 9H28 added `src/lib/navigation/currentPrimaryNavLinks.js` as the current-live helper for primary operational nav entries.
- The helper derives labels, route paths, ordering, and descriptive metadata from `currentNavigationRegistry`.
- Phase 9H29 switched desktop primary `TopNav` rendering to `getCurrentPrimaryNavLinks()`.
- Phase 9H30 switched mobile primary `TopNav` rendering to `getCurrentPrimaryNavLinks()`.
- Desktop and mobile primary nav order remains Orders, Assignments, Relationships, Calendar, Clients, Users.
- Orders and Calendar remain always included.
- Permissioned links remain hidden unless active permission hooks report `allowed`.
- Clients dynamic routing is preserved: full client read routes to `/clients`, assigned-only client access routes to `/clients/cards`.
- Mobile close-on-navigation behavior is preserved.
- Settings/account utility behavior remains separate from primary nav and continues through the settings utility helper.

Safety boundary:

- `TopNav` primary nav uses current-live registry metadata only through the helper.
- No product-mode or shadow metadata is live authority.
- No mode-aware navigation was introduced.
- No Vendor Portal or Client Portal future concepts were introduced into live primary nav.
- `CommandPalette` remains unchanged and is not migrated.
- Dashboards remain unchanged and are not migrated.
- Route authority remains permission-based through the existing route guard.
- Permissions, seeds, migrations, company settings, module settings, billing, onboarding, and backend behavior remain unchanged.

Validation baseline:

- `src/lib/navigation/__tests__/currentPrimaryNavLinks.test.js`
- `src/components/shell/__tests__/TopNav.test.jsx`
- `npm run lint`
- `npm run build`
- `git diff --check`
- Static scans confirming no product-mode/shadow metadata imports in `TopNav` or active nav authority surfaces.

Next allowed slice:

- Prefer Phase 9H32 current `CommandPalette` registry extraction, or Phase 9H32 command palette migration plan/audit update before extraction.
- Keep dashboard migration deferred until after command palette planning or extraction is explicitly locked.

## Phase 9H40 Runtime Metadata Consolidation Lock

Phase 9H is now consolidated as a complete runtime metadata and current-live registry migration foundation.

Completed Phase 9H navigation-related foundation:

- Product mode constants/metadata, module registry/categories/helpers, shadow navigation diagnostics, shadow route diagnostics, cross-registry integrity guard, and the protected Product Metadata Diagnostics page are complete and remain diagnostic/non-authoritative.
- `currentNavigationRegistry` describes current live navigation and route-adjacent metadata.
- `currentSettingsUtilityLinks` drives the migrated settings/admin utility links.
- `currentPrimaryNavLinks` drives the migrated desktop and mobile primary `TopNav` entries.
- Product Metadata Diagnostics route metadata and Notification Settings route metadata now use current-live route metadata while preserving existing paths and permission gates.
- Settings/admin utility links, desktop primary `TopNav`, and mobile primary `TopNav` now use current-live helpers while preserving labels, order, routes, permission hiding, Clients dynamic routing, active-state behavior, and mobile close behavior.

Safety boundary:

- No product-mode/shadow metadata authority was introduced.
- No mode-aware runtime navigation behavior was introduced.
- No Vendor Portal or Client Portal future live navigation surface was exposed.
- Route/action permissions remain authority.
- No company/module settings, billing/onboarding enforcement, migrations, permission/seed changes, RLS changes, or RPC authority changes were introduced.

Phase 9H validation baseline:

- Metadata, shadow diagnostics, navigation parity diagnostics, route registry binding, settings utility link, primary nav helper, and desktop/mobile `TopNav` tests pass.
- Lint, build, and `git diff --check` pass.
- Static import scans confirm product-mode/shadow metadata is not imported into active navigation, route, command, or dashboard authority surfaces.

Next allowed options:

- Pause Phase 9H and begin a fresh phase/thread from the H40 consolidation baseline.
- Start H41 route metadata broader extraction as a tiny behavior-preserving live registry migration.
- Start H41 current dashboard widget registry cleanup as a separate dashboard slice.
- Defer company module settings, billing/package enforcement, onboarding enforcement, and database-backed runtime composition.

## Migration Philosophy

- Preserve Staff/default behavior first.
- Metadata can inform navigation composition but must not authorize access.
- Existing permission checks remain route and action authority.
- Backend visibility rules remain data authority.
- Module metadata shapes surface composition only.
- Product-mode metadata can describe intended surfaces, labels, and lanes, but must not decide who can see data.
- No Vendor or Client concepts should appear in live navigation before real Vendor/Client routes and data contracts exist.
- No company/module setting enforcement should be introduced in this migration.
- No billing, onboarding, package, or entitlement behavior should be inferred from module metadata.
- Hidden modules should stay hidden, not become disabled or locked navigation clutter.
- Relationship state alone still grants no operational visibility.
- Assignment packet access remains distinct from canonical order access.

## Recommended Migration Stages

### Stage 1: Extract Current Live Nav Registry

Status: complete as `src/lib/navigation/currentNavigationRegistry.js`.

Create a stable source registry that mirrors current live navigation exactly.

Requirements:

- No product-mode filtering.
- No label changes.
- No route changes.
- No permission changes.
- No active route authority changes.
- No new Vendor, Client, AMC, or Hybrid concepts.
- Preserve current desktop and mobile nav differences.
- Preserve current avatar/settings behavior.
- Preserve current assignment and relationship visibility gates.

The initial registry should model what exists today, not what the shadow registry expects later.

Recommended registry fields:

- Stable nav item ID.
- Current label.
- Current route.
- Current nav surface: desktop, mobile, avatar, or route-only.
- Current permission gate or permission predicate.
- Current active-route matching behavior if applicable.
- Current feature owner or source component.
- Notes for known copy/module mismatches, such as `Users` versus future `Team Access`.

### Stage 2: Add Live Registry Parity Tests

Status: complete for the current registry extraction baseline.

Before any component renders from the registry, add tests that prove the extracted registry matches current expectations.

Required parity coverage:

- Staff/default desktop nav item list.
- Staff/default mobile nav item list.
- Assignment nav appears only for assignment read permissions.
- Relationship nav appears only for `relationships.read`.
- Clients nav matches current client read behavior.
- Users nav matches current `users.read` behavior.
- Settings remains avatar/mobile behavior, not a new desktop primary item unless explicitly migrated later.
- Diagnostics remains route-only unless a later explicit slice changes that.

This stage should still have no active UI changes.

### Stage 3: Add Diagnostics Comparison

Status: complete for navigation, command palette, and dashboard parity diagnostics inside Product Metadata Diagnostics.

Expose a read-only comparison between the extracted live nav registry and the existing shadow navigation registry.

Requirements:

- Diagnostics page only.
- Local state only.
- No writes.
- No active `TopNav` rendering changes.
- No route authority changes.
- No command palette changes.
- No dashboard changes.
- Clearly label live registry as current behavior and shadow registry as future/non-authoritative.

The comparison should help reviewers see where Staff/default, AMC, Vendor, Client, and Hybrid expectations diverge without changing runtime behavior.

### Stage 4: Migrate One Low-Risk Nav Section

Status: complete for the low-risk settings/admin utility path. Phase 9H22 migrated the diagnostics route reference, Phase 9H24 migrated the Notification Settings route reference, and Phase 9H25 migrated the avatar/settings utility link group while preserving visible behavior.

Render one low-risk live navigation section from the extracted registry.

Preferred first candidates:

- Static utility links with stable route authority.
- Settings/avatar links.
- Route-only diagnostic links only if explicitly approved and still gated by `settings.view`.
- Notification Settings route/link metadata, preserving its existing route, label, and permission gate.

Avoid first:

- Primary operational nav.
- Assignment nav.
- Relationship nav.
- Clients nav.
- Orders nav.
- Mobile nav if desktop parity has not been proven.
- Any Vendor, Client, AMC, or Hybrid-specific item.

Requirements:

- Preserve identical labels, routes, gates, and ordering.
- Keep rollback simple: the component can fall back to the previous hardcoded list.
- Add focused render tests for the migrated section.
- Confirm command palette and dashboard links do not drift.

### Stage 5: Migrate Primary Staff / Default Nav

Status: behavior audit complete in `docs/FALCON_TOPNAV_PRIMARY_NAV_AUDIT.md`; rendering remains deferred until current-live helper extraction and parity tests are complete.

Only after Stage 1 through Stage 4 pass, migrate the primary Staff/default navigation to registry-driven rendering.

Requirements:

- Staff/default desktop nav parity tests pass.
- Staff/default mobile nav parity tests pass.
- Permission gate preservation tests pass.
- Loading and permission-error behavior is documented and preserved.
- Clients dynamic route behavior is preserved.
- Rollback path is clear.
- No Vendor/Client/AMC/Hybrid live labels are introduced.
- Existing route authority remains unchanged.
- Existing assignment and relationship safety remains unchanged.
- Existing dashboard and command palette behavior remains unchanged.
- TopNav still does not use shadow metadata as permission authority.

This stage should be Staff/default registry-driven, not product-mode-driven.

### Stage 6: Future Mode-Aware Nav

Status: deferred beyond Staff/default registry migration.

Mode-aware live navigation should remain deferred until the product foundations exist.

Prerequisites:

- Company/module settings exist and have clear semantics.
- Product mode resolution exists.
- Portal route shells exist for Vendor and Client.
- Vendor and Client data contracts exist.
- AMC queue and dashboard contracts are implementation-ready.
- Hybrid lane behavior and mixed-user precedence are explicitly designed.
- Permission, route, and backend visibility boundaries are mapped for every mode-specific nav item.
- A fallback plan exists for reverting to Staff/default navigation.

Mode-aware navigation must be introduced as its own explicit migration slice.

## Risk Analysis

Breaking current Staff nav:

- Current operational users depend on fast access to Orders, Calendar, Clients, Users, Assignments, and Relationships.
- Any registry migration must preserve labels, order, gates, active states, and mobile behavior until explicitly changed.

Leaking Vendor/Client concepts:

- Shadow metadata includes future Vendor and Client surfaces that do not have safe live route shells yet.
- Live nav must not expose My Assignments, Client Requests, Documents, Vendor Workspace, or similar concepts until routes and data contracts exist.

Permission versus module confusion:

- Module metadata says what a mode may include.
- Permissions say whether a user can access a route or action.
- A module being present must not imply permission or data visibility.

Command palette drift:

- Nav changes can create mismatch with `CommandPalette` links, labels, and permission assumptions.
- Command parity must be reviewed after each navigation registry stage.

Dashboard link drift:

- The brand dashboard link, dashboard rows, and assignment dashboard links must remain consistent with route authority.
- Navigation composition must not reroute assignment-only users into canonical order dashboards.

Mobile nav mismatch:

- Desktop and mobile nav are both defined in `TopNav` today, but they do not expose every surface identically.
- Registry extraction must preserve current mobile behavior rather than assuming desktop parity.

Hidden-module clutter:

- Future modules should not appear as disabled, locked, upsell, or placeholder nav items during this migration.
- Missing mode surfaces should remain absent until they are real product surfaces.

## Required Tests Before Implementation

Current nav registry parity:

- Registry exports the current desktop nav shape.
- Registry exports the current mobile nav shape.
- Registry preserves current avatar/settings behavior.
- Registry excludes diagnostics from normal nav unless explicitly requested in a later slice.

Permission gate preservation:

- Orders nav retains current permission/visibility behavior.
- Assignments nav requires assigned or owner assignment read permission.
- Relationships nav requires `relationships.read`.
- Clients nav follows current client read assumptions.
- Users nav requires `users.read`.
- Settings nav remains gated by `settings.view` where currently exposed.

Mobile nav parity:

- Mobile nav item order remains unchanged.
- Mobile Settings remains gated.
- Assignment and relationship mobile entries match current permission behavior.

No Vendor/Client leakage:

- Staff/default live registry contains no Vendor Portal or Client Portal-only labels.
- Assignment-only users do not receive canonical order nav through registry composition.
- Client-safe and Vendor-safe concepts remain absent from live nav until portal route slices exist.

No route exposure widening:

- Registry rendering does not create links to routes that are not already reachable through current navigation.
- Existing route guards remain unchanged.
- Route-only diagnostics remain protected by `settings.view`.

No diagnostics authority:

- Diagnostics comparison cannot affect live `TopNav`.
- Shadow navigation metadata is not imported into active nav components.
- Permission domains in metadata remain non-authoritative.

## Stop Conditions

Stop the migration if any of the following happen:

- Current Staff/default nav regresses.
- Desktop and mobile nav diverge from the extracted parity expectations unintentionally.
- Route visibility is broadened.
- Shadow metadata is used as permission authority.
- Vendor or Client concepts appear in live nav prematurely.
- Hidden modules appear as disabled, locked, placeholder, or upsell clutter.
- Assignment-only users can navigate to canonical order surfaces through live nav.
- A route is changed without an explicit migration slice.
- Command palette links drift from active nav without an explicit command migration.
- Dashboard links or `DashboardGate` behavior drift without an explicit dashboard migration.
- Company/module setting enforcement is introduced.
- Billing, package, onboarding, or entitlement behavior is inferred from module metadata.

## Validation Baseline

Every implementation slice derived from this plan should run:

- Focused navigation registry parity tests.
- Focused route/link render tests for the migrated section.
- Existing shadow composition tests.
- Static import scans proving active nav is not importing shadow composition as authority.
- `npm run lint`.
- `npm run build`.
- `git diff --check`.
