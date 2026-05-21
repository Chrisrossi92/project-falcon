# Falcon Active Command Palette Migration Plan

## Purpose

This document defines the safe implementation plan and completed migration lock for moving Falcon's active `CommandPalette` to current-live command helpers while preserving current behavior.

It is documentation only. It records the completed helper extraction and active helper-backed migration; it does not change routes, navigation, dashboards, permissions, seeds, migrations, billing, onboarding, company settings, module settings, product-mode runtime behavior, or backend visibility.

The goal is to keep command construction on current-live registry-backed helpers without changing Staff/default behavior, weakening permission authority, or exposing future Vendor/Client concepts before real routes and data contracts exist.

## Phase 9H35 Doc Lock

Phase 9H33 and Phase 9H34 completed the behavior-preserving active CommandPalette registry migration:

- `src/lib/commandPalette/currentCommandPaletteCommands.js` now exposes `getCurrentCommandPaletteCommands()` and `getCurrentOrderSearchFallback()`.
- Active `src/components/nav/CommandPalette.jsx` now uses `getCurrentCommandPaletteCommands()` for current command construction.
- The order-search fallback now uses `getCurrentOrderSearchFallback()`.
- Current command labels, ordering, routes, permission gates, loading/error fallback behavior, `clientsPath` dynamic Clients route behavior, label search behavior, and `/orders?q=<query>` order-search fallback are preserved.

Current safety boundary:

- No product-mode or shadow metadata is active command authority.
- No Vendor Portal or Client Portal future commands are live.
- No mode-aware command composition is active.
- No route, navigation, dashboard, permission, seed, migration, company setting, module setting, billing, onboarding, or backend authority changed.
- Permission hooks remain the active command visibility authority.
- Route guards and backend visibility remain access authority.

Validation baseline:

- `currentCommandPaletteCommands` tests cover helper output, permission gates, loading/error fallback, dynamic Clients path behavior, order-search fallback metadata, future portal exclusion, and missing permission safety.
- `CommandPalette` tests cover rendered command order/labels, permission hiding, loading fallback, dynamic Clients route behavior, label search, order-search fallback navigation, and no future Vendor/Client command leakage.
- `npm run lint` passes with the existing warning profile; the warning count moved from 159 to 158 after removing the stale React default import from the touched palette file.
- `npm run build` passes with the existing Tailwind ambiguity and chunk-size warnings.
- `git diff --check` passes.
- Static import scans confirm no product-mode/shadow metadata imports in active command, navigation, or route authority surfaces.

Next allowed options:

- Phase 9H36 dashboard migration planning was the next completed boundary after the H35 command lock.
- Phase 9H40 now supersedes this local next-step note as the overall Phase 9H consolidation lock.

## Phase 9H40 Runtime Metadata Consolidation Lock

Phase 9H is now consolidated as a complete runtime metadata and current-live registry migration foundation.

Completed Phase 9H command-related foundation:

- Product mode constants/metadata, module registry/categories/helpers, shadow command diagnostics, cross-registry integrity guard, and the protected Product Metadata Diagnostics page are complete and remain diagnostic/non-authoritative.
- `currentCommandRegistry` describes current live command palette behavior.
- `currentCommandPaletteCommands` drives active command construction and order-search fallback behavior from current-live command metadata.
- Active `CommandPalette` command construction now uses `getCurrentCommandPaletteCommands()`.
- Active order-search fallback now uses `getCurrentOrderSearchFallback()`.
- Current command labels, ordering, routes, permission gates, loading/error fallback behavior, Clients dynamic route behavior, label search behavior, and `/orders?q=<query>` fallback behavior are preserved.

Safety boundary:

- No product-mode/shadow command authority was introduced.
- No mode-aware command composition was introduced.
- No Vendor Portal or Client Portal future commands are live.
- Route/action permissions remain authority.
- No route/nav/dashboard authority changes, company/module settings, billing/onboarding enforcement, migrations, permission/seed changes, RLS changes, or RPC authority changes were introduced.

Phase 9H validation baseline:

- Metadata, shadow diagnostics, command parity diagnostics, current command helper, and active `CommandPalette` tests pass.
- Lint, build, and `git diff --check` pass.
- Static import scans confirm product-mode/shadow metadata is not imported into active command, navigation, route, or dashboard authority surfaces.

Next allowed options:

- Pause Phase 9H and begin a fresh phase/thread from the H40 consolidation baseline.
- Start H41 route metadata broader extraction as a tiny behavior-preserving live registry migration.
- Start H41 current dashboard widget registry cleanup as a separate dashboard slice.
- Defer company module settings, billing/package enforcement, onboarding enforcement, and database-backed runtime composition.

## Current CommandPalette Behavior

The active command palette lives in `src/components/nav/CommandPalette.jsx`.

Current construction:

- Commands are constructed through `getCurrentCommandPaletteCommands()` using current-live registry entries and existing permission inputs.
- The palette is a flat list, not grouped by lane, product mode, or module.
- Labels and routes are Staff/default operational language.
- `clientsPath` is passed in from `TopNav` so the Clients command follows the same dynamic route as active navigation.
- `currentCommandRegistry` describes current command behavior, and the active helper reads current-live registry metadata only.

Current commands:

- `Go to Orders` routes to `/orders`.
- `Go to Assignments` routes to `/assignments` when assignment read permission exists.
- `Go to Relationships` routes to `/relationships` when relationship read permission exists.
- `Go to Calendar` routes to `/calendar`.
- `Go to Clients` routes to the supplied `clientsPath`.
- `Go to Users` routes to `/users` when user/navigation permission exists.
- `Open Settings` routes to `/settings` when settings/navigation permission exists.
- `Notification Settings` routes to `/settings/notifications` when own notification preference permission exists.

Current permission gates:

- `useEffectivePermissions()` is the active permission source for command visibility.
- Orders uses `navigation.orders.view`.
- Assignments uses either `order_company_assignments.read_assigned` or `order_company_assignments.read_owner`.
- Relationships uses `relationships.read`.
- Clients uses `navigation.clients.view`.
- Users uses `users.read` or `navigation.users.view`.
- Settings uses `settings.view` or `navigation.settings.view`.
- Notification Settings uses `notifications.preferences.manage_own`.
- Calendar has no command-level gate, but route authority remains protected elsewhere.

Current loading and error behavior:

- While permissions are loading, the palette preserves the existing legacy fallback command visibility.
- If the permission resolver errors, the palette preserves the existing legacy fallback command visibility.
- Route guards remain the effective access boundary when fallback visibility temporarily shows commands.
- This loading/error behavior is current behavior and must not be changed during registry extraction.

Current search behavior:

- Search filters command labels.
- Search does not search route paths, module IDs, product modes, permission keys, or hidden shadow metadata.
- Keyboard selection navigates to the selected command route.
- The palette does not expose Product Metadata Diagnostics, module settings, billing, onboarding, package configuration, or company settings commands.

Current order-search fallback behavior:

- When no command label matches and order navigation/search is allowed, pressing Enter navigates to `/orders?q=<query>`.
- The fallback is Staff/default internal order search behavior.
- The fallback must remain exact during current-live extraction.
- The fallback must not become Vendor packet search, Client request search, or mode-aware search until those routes and data contracts exist.

Current route behavior:

- Commands navigate to existing routes only.
- Route authority remains in active route guards and backend visibility rules.
- Command visibility is not a replacement for route authorization.
- Assignment commands route to assignment packet surfaces, not canonical order detail.
- Relationship commands route to relationship management surfaces and grant no operational data visibility by themselves.

Current grouping, labels, and copy:

- Commands are a flat list with simple action labels.
- There are no Staff, AMC, Vendor, Client, Hybrid, internal, network, packet, or client-facing lanes.
- Labels remain current Staff/default copy and must not be renamed during registry extraction.
- `Users` remains the active label even though product-mode planning may refer to `Team Access`.

Relationship to TopNav and navigation registry:

- `TopNav` now renders desktop and mobile primary nav from `getCurrentPrimaryNavLinks()`.
- `TopNav` still owns the dynamic `clientsPath` value passed to `CommandPalette`.
- CommandPalette migration must not drift from active route paths or the current Clients dynamic route behavior.
- The current-live command registry may describe command behavior, but it must not import product-mode or shadow metadata into active command authority.

## Migration Philosophy

- Preserve current Staff/default behavior first.
- The current-live command registry describes current behavior; it is not product-mode authority.
- Active permission hooks remain the visibility authority for commands.
- Active route guards and backend visibility rules remain the access authority.
- No Vendor Portal or Client Portal future commands should appear until real routes and safe data contracts exist.
- No mode-aware command composition should be introduced yet.
- No disabled, locked, upsell, hidden-mode, or future-mode commands should be rendered.
- Command search must not expose hidden internal concepts to future portal users.
- Dashboard and navigation migration must remain separate; command extraction should not change `TopNav`, `DashboardGate`, routes, or active dashboard behavior.

## Recommended Stages

### Stage 1: Extract Current-Live Helper Only

Status: complete in Phase 9H33.

- Current command construction was extracted into `getCurrentCommandPaletteCommands()`.
- Current order-search fallback metadata was extracted into `getCurrentOrderSearchFallback()`.
- Helper output preserves command labels, order, routes, permission predicates, loading/error fallback behavior, search assumptions, order-search fallback metadata, and caller-supplied `clientsPath`.
- The helper does not import product-mode metadata, shadow command metadata, module composition, package metadata, company settings, or module settings.

### Stage 2: Add Parity Tests

Status: complete in Phase 9H33.

- Helper tests verify command order and labels.
- Helper tests verify permission gates.
- Helper tests verify route/path preservation, including caller-supplied Clients route behavior.
- Helper tests verify loading/error fallback behavior.
- Helper tests verify no Vendor Portal, Client Portal, Product Metadata Diagnostics, module settings, billing, onboarding, or package commands appear.
- Helper tests verify the helper uses current-live registry metadata only.

### Stage 3: Switch CommandPalette To Helper

Status: complete in Phase 9H34.

- Active command construction now calls `getCurrentCommandPaletteCommands()`.
- Active order-search fallback now calls `getCurrentOrderSearchFallback()`.
- The visible palette, keyboard behavior, search filtering, and order-search fallback remain unchanged.
- Permission loading/error fallback remains preserved.
- Route guards remain authority; no route authority changed.
- `TopNav`, mobile nav, dashboard behavior, routes, permissions, seeds, and migrations were not changed.

### Stage 4: Keep Diagnostics Comparison Separate

- Continue displaying current-vs-shadow command parity in Product Metadata Diagnostics only.
- Diagnostics may compare active current-live command metadata against shadow command composition.
- Diagnostics must not affect runtime command rendering, route access, permission checks, or search behavior.

### Stage 5: Future Mode-Aware Commands

- Mode-aware command composition remains deferred.
- Future mode-aware commands require company/module settings, route availability, safe data contracts, mode-native labels, and explicit migration planning.
- Vendor Portal commands must use assignment packet/workspace concepts only after portal routes exist.
- Client Portal commands must use request/status/document/message concepts only after client-safe routes and projections exist.
- Hybrid commands must be lane-aware before exposing internal, network, packet, and client-facing concepts together.

## Risks

- Hidden concepts could be exposed through command search if future-mode or shadow command metadata enters active construction.
- Order-search fallback could break if helper extraction treats fallback as just another command instead of current special behavior.
- Permission loading flicker could change if unresolved permissions are treated as denied instead of preserving current fallback behavior.
- Route drift could occur if command paths stop matching active nav paths, especially the dynamic Clients route.
- Vendor/Client concepts could be exposed prematurely if shadow-only command entries are merged into current-live helper output.
- Hybrid lane confusion could increase later if flat commands are treated as mode-ready.
- Calendar command visibility could drift if a new command-level gate is added before route behavior is reviewed.
- Assignment commands could imply canonical order access if labels, paths, or search keywords are broadened.
- Relationship commands could imply operational visibility if relationship lifecycle access is mistaken for order/client visibility.

## Required Tests

- Command order and labels match current behavior.
- Permission gating matches current behavior for Orders, Assignments, Relationships, Clients, Users, Settings, and Notification Settings.
- Search filters command labels as before.
- Keyboard selection navigates to selected command routes as before.
- Order-search fallback routes to `/orders?q=<query>` under the same conditions as before.
- Clients command preserves the caller-supplied dynamic route path.
- Loading/error behavior preserves the current fallback command visibility.
- No Product Metadata Diagnostics command appears.
- No future Vendor Portal or Client Portal command appears.
- No product-mode or shadow metadata becomes active authority.
- Route/path preservation is verified for every current command.

## Stop Conditions

Stop the migration if any of the following happen:

- Any current command disappears unexpectedly.
- Command order, label, copy, or route path changes without explicit approval.
- Order-search fallback breaks or changes route/query behavior.
- Permission behavior changes.
- Permission loading/error fallback behavior changes.
- A future Vendor Portal or Client Portal command appears in live output.
- Product-mode or shadow metadata becomes active command authority.
- Command extraction changes `TopNav`, mobile nav, dashboards, route authority, permissions, seeds, migrations, or backend visibility.

## Next Recommended Slice

The command helper extraction and active helper switch are complete. The next safe implementation options are:

- Phase 9H36 dashboard migration planning.
- Phase 9H36 current dashboard helper extraction planning/audit.
