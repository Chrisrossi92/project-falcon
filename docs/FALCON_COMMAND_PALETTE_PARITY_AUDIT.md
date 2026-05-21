# Falcon Command Palette Parity Audit

## Purpose

This audit compares Falcon's current active command palette behavior with the inert shadow command composition diagnostics.

It is documentation only. It does not change `CommandPalette`, routes, navigation, dashboards, permissions, seeds, migrations, billing, onboarding, company settings, or runtime product behavior.

The shadow command metadata remains diagnostic and non-authoritative. Active route guards and backend visibility rules remain the authority for access.

Live navigation migration must follow `docs/FALCON_ACTIVE_NAVIGATION_MIGRATION_PLAN.md` so command palette links do not drift from active nav or route authority.

Active command palette migration now follows `docs/FALCON_ACTIVE_COMMAND_PALETTE_MIGRATION_PLAN.md`: current command construction and order-search fallback are wired through current-live helpers, while future mode-aware command composition remains deferred.

## Phase 9H21 Diagnostics Lock

The command palette diagnostics layer is now code-backed and displayed in the protected Product Metadata Diagnostics page.

Completed current-live registry:

- `src/lib/commandPalette/currentCommandRegistry.js`

Completed parity diagnostics:

- `src/lib/commandPalette/commandPaletteParityDiagnostics.js`

Diagnostics page coverage:

- The page displays shadow command palette diagnostics and live-vs-shadow command palette parity for the selected product mode.
- The page also displays product modes, module registry metadata, shadow navigation, routes, dashboard, empty-state, and upgrade diagnostics, plus navigation/dashboard parity sections.

Safety boundary:

- At the Phase 9H21 diagnostics lock, active `CommandPalette` remained unchanged. Since Phase 9H34, it uses current-live command helpers only.
- Active `TopNav`, mobile navigation, `DashboardGate`, and dashboard components remain unchanged.
- Routes and route authority remain unchanged.
- Permissions, seeds, migrations, company/module settings, billing, onboarding, and package behavior remain unchanged.
- The current-live command registry is descriptive current-behavior metadata only; active command visibility still comes from permission inputs, not registry authority.
- Shadow command metadata and parity output are diagnostic/non-authoritative and do not authorize access.

Migration readiness:

- Staff/default command behavior is closest to parity.
- AMC has partial overlap but still needs AMC-native intake, assignment, relationship, review/QC, and command-center command semantics.
- Vendor and Client commands remain future shell/data-contract dependent and must not reuse internal Staff commands.
- Hybrid command grouping and lane separation remain future.
- CommandPalette registry migration should begin only with helper-only current-live extraction and parity tests.
- Product-mode and shadow command metadata must remain diagnostic only.

## Phase 9H32 Active CommandPalette Migration Plan

Phase 9H32 added `docs/FALCON_ACTIVE_COMMAND_PALETTE_MIGRATION_PLAN.md` as the safety plan for migrating active command construction toward current-live helpers.

The plan locks:

- Current hardcoded command construction and permission gates must be preserved before extraction.
- Current search behavior and order-search fallback must be preserved.
- Current loading/error fallback behavior must be preserved.
- The current-live command registry describes behavior but does not authorize visibility.
- Permission hooks, route guards, and backend visibility remain authority.
- No Vendor Portal or Client Portal future commands may appear before real routes and safe data contracts exist.
- No mode-aware command composition is allowed yet.
- `TopNav`, mobile nav, dashboards, routes, permissions, seeds, migrations, company settings, and module settings remain unchanged.

Recommended next implementation slice:

- Extract current command construction into a current-live helper only, with no rendering changes.
- Add parity tests before switching active `CommandPalette` construction.

## Phase 9H35 CommandPalette Registry Migration Lock

Phase 9H33 and Phase 9H34 completed the behavior-preserving command migration:

- `src/lib/commandPalette/currentCommandPaletteCommands.js` now provides `getCurrentCommandPaletteCommands()` and `getCurrentOrderSearchFallback()`.
- Active `CommandPalette` uses `getCurrentCommandPaletteCommands()` for command construction.
- Active order-search fallback uses `getCurrentOrderSearchFallback()`.
- Current labels, ordering, routes, gates, loading/error fallback behavior, dynamic Clients route behavior, label search behavior, and `/orders?q=<query>` fallback behavior are preserved.

Safety boundary:

- Product-mode and shadow command metadata remain diagnostic/non-authoritative.
- No Vendor Portal or Client Portal future commands are live.
- No mode-aware command composition is active.
- Permissions remain command visibility authority.
- Route guards and backend visibility remain access authority.
- No route, navigation, dashboard, seed, migration, permission, company setting, module setting, billing, onboarding, or backend behavior changed.

Validation lock:

- `currentCommandPaletteCommands` tests pass.
- `CommandPalette` tests pass.
- `npm run lint`, `npm run build`, and `git diff --check` pass.
- Static import scans confirm no product-mode/shadow metadata imports in active command, navigation, or route authority surfaces.
- The lint warning count moved from 159 to 158 after the active palette import cleanup.

Next allowed options:

- Phase 9H36 dashboard migration planning.
- Phase 9H36 current dashboard helper extraction planning/audit.

## Current Active Command Palette

The active command palette lives in `src/components/nav/CommandPalette.jsx`. It is a flat, permission-filtered accelerator that navigates to existing routes. Current command construction now comes from `getCurrentCommandPaletteCommands()`, and the current order-search fallback comes from `getCurrentOrderSearchFallback()`.

Current commands:

| Command | Route behavior | Active command gate | Notes |
| --- | --- | --- | --- |
| Go to Orders | `/orders` | `navigation.orders.view` | Also enables the free-text fallback to `/orders?q=...`. |
| Go to Assignments | `/assignments` | `order_company_assignments.read_assigned` or `order_company_assignments.read_owner` | Added only when assignment permissions are present. |
| Go to Relationships | `/relationships` | `relationships.read` | Added only when relationship read permission is present. |
| Go to Calendar | `/calendar` | No command-level gate | Route authority still requires order/navigation permissions. |
| Go to Clients | `clientsPath`, currently an active clients route supplied by the caller | `navigation.clients.view` | Staff/internal language; target path can differ from the visible client route pattern. |
| Go to Users | `/users` | `users.read` or `navigation.users.view` | Internal team/admin concept. |
| Open Settings | `/settings` | `settings.view` or `navigation.settings.view` | Settings/admin exposure only. |
| Notification Settings | `/settings/notifications` | `notifications.preferences.manage_own` | Personal settings surface. |

Current grouping behavior:

- Commands are presented as one flat list.
- There are no mode lanes, sections, or separate Staff/Network/Packet/Client groupings.
- Filtering matches command labels only.
- Keyboard selection navigates to the selected command route.
- When no label matches and the user can search orders, pressing Enter navigates to `/orders?q=<query>`.

Current permission and fallback behavior:

- `useEffectivePermissions()` decides command visibility through the current-live helper inputs.
- If permissions are loading or the resolver errors, the palette preserves existing legacy fallback command visibility.
- Route guards remain the effective access boundary even when a command is visible during fallback.
- Assignment and relationship commands do not appear unless their explicit permissions are present outside fallback mode.

Current settings/admin exposure:

- Settings and Notification Settings are command-accessible when their permissions are present.
- The developer diagnostics route `/settings/product-metadata-diagnostics` is not exposed in the command palette.
- There is no command for product mode metadata, module settings, billing, onboarding, or package configuration.

Current assignment/relationship exposure:

- Assignment and relationship route links are permission-gated and route to assignment/relationship surfaces, not canonical order detail.
- Assignment commands use generic "Assignments" copy rather than Vendor packet-specific language.
- Relationship commands use generic "Relationships" copy and do not imply order, client, assignment, activity, notification, or team visibility.

## Current Risks

- Staff-centric language leaks into any future non-Staff mode if reused unchanged: Orders, Clients, Users, and order search all assume an internal operations workspace.
- Internal workflow concepts can be discovered through command search if the palette is reused before mode-native command filtering exists.
- The permission loading/error fallback can show commands before permission filtering settles; route guards still protect access, but the visible command labels can leak concepts.
- Calendar has no command-level permission gate even though the route is protected.
- Client command visibility uses `navigation.clients.view`, while related route authority also depends on client read permissions. That mismatch must be understood before composition.
- The free-text order search fallback is Staff-compatible but unsafe for Vendor Portal and Client Portal unless replaced with packet/request-native search behavior.
- Flat grouping gives Hybrid/Ecosystem users no mental separation between internal operations, network relationships, assignment packets, and client-facing work.
- Current command metadata is permission-driven but not module-driven, so it cannot distinguish Staff Appraisal, AMC Operations, Vendor Portal, Client Portal, or Hybrid intent.
- Future Vendor and Client portals would be harmed by exposing canonical Orders, Clients, Users, Relationships, or internal Settings concepts as generic global commands.

## Shadow Command Expectations

The shadow command diagnostics are generated from metadata only. They do not drive the active palette.

### Staff Appraisal

Shadow commands:

- Open Dashboard
- Open Notifications
- Open Activity
- Open Settings
- Open Orders
- Search Orders
- Open Clients
- Open Team Access
- Open Review Queue
- Open Calendar

Parity assessment:

- Staff is closest to the active command palette.
- Active commands cover Orders, Clients, Users/Team-like access, Calendar, Settings, and Notification Settings.
- Active commands do not expose Dashboard, Activity, Team Access by that name, Review Queue, or a metadata-native notification command.
- Active "Go to Users" should be reconciled with future "Open Team Access" language before any metadata-driven Staff command migration.

### AMC Operations

Shadow commands:

- Open Dashboard
- Open Notifications
- Open Activity
- Open Settings
- Open AMC Intake Queue
- Search AMC Orders
- Open Clients
- Open Assignment Packets
- Open Relationships
- Open Review Queue
- Open Calendar
- Open AMC Command Center

Parity assessment:

- Active commands partially cover clients, assignments, relationships, calendar, and settings.
- Active Orders/Search Orders copy is not AMC-native intake/operations language.
- There is no active AMC Command Center command or AMC-native intake queue command.
- Assignment commands exist but are generic and should not become AMC package authority.

### Vendor Portal

Shadow commands:

- Open Dashboard
- Open Notifications
- Open Activity
- Open Settings
- Open Assignment Packets
- Open Vendor Workspace
- Open Calendar

Parity assessment:

- Active assignment commands can reach assignment surfaces for permitted users, but the label is not Vendor-native.
- Active Orders, Clients, Users, Relationships, and order search are not Vendor-safe as live commands.
- Vendor Calendar expectations need packet-aware semantics before live exposure in a portal shell.
- There is no active Vendor Workspace route or command.

### Client Portal

Shadow commands:

- Open Dashboard
- Open Notifications
- Open Activity
- Open Settings
- Submit Request
- Open Messages and Updates
- Open Documents and Reports
- Open My Requests
- Search Request Status

Parity assessment:

- Active commands do not provide Client Portal request/status/document/message concepts.
- Active Orders, Clients, Users, Assignments, Relationships, and order search are not Client-safe as live commands.
- Client Portal commands should wait for real portal routes and client-scoped visibility projections.

### Hybrid / Ecosystem

Shadow commands:

- Open Dashboard
- Open Notifications
- Open Activity
- Open Settings

Parity assessment:

- Hybrid shadow command output intentionally stays conservative while lane composition remains unresolved.
- Active commands are not lane-aware and should not be treated as Hybrid-ready.
- Future Hybrid command migration must separate owned-order commands, packet commands, relationship commands, and client-facing commands.

## Gaps

Commands that should remain Staff-only unless explicitly reworked:

- Go to Orders.
- Press Enter to search Orders.
- Go to Clients as an internal CRM surface.
- Go to Users as an internal team/admin surface.
- Review/workflow commands once added.

Commands that should become AMC-native later:

- Open AMC Intake Queue.
- Search AMC Orders.
- Open Assignment Packets.
- Open Relationships.
- Open AMC Command Center.
- Open Review Queue with AMC-appropriate quality-control language where needed.
- Client/lender commands only after AMC client surfaces exist.

Vendor-safe command concepts:

- Open Assignment Packets.
- Open Vendor Workspace.
- Open packet deadlines or required actions after packet routes exist.
- Open Vendor Settings/Profile after vendor profile surfaces exist.
- No canonical order list, internal client CRM, internal team access, relationship management, or internal review commands.

Client-safe command concepts:

- Submit Request.
- Open My Requests.
- Search Request Status.
- Open Messages and Updates.
- Open Documents and Reports.
- Open Client Settings after account/settings surfaces exist.
- No internal orders table, assignments, relationships, vendors, team access, reviewer/appraiser workflow, or AMC operational queues.

Hybrid lane gaps:

- Active commands lack lane labels and lane grouping.
- Owned-order commands, packet commands, relationship commands, and client-facing commands need separate labels and route scopes.
- Relationship commands must not imply order or client visibility.
- Assignment packet commands must not become canonical order access.

Current commands that expose internal operational concepts:

- Go to Orders.
- Go to Clients.
- Go to Users.
- Go to Assignments, if shown outside assignment-native contexts.
- Go to Relationships, if shown outside relationship-management contexts.
- Press Enter to search Orders for arbitrary text.

Surfaces that should remain hardcoded for now:

- Existing Staff/default command behavior.
- Current assignment and relationship command gates.
- Current settings and notification settings commands.
- Current route authority in `src/routes/index.jsx`.
- The absence of a diagnostics command entry.

## Migration Recommendations

Safe future migration order:

1. Preserve current Staff/default command behavior first.
2. Keep shadow command composition in diagnostics and tests only.
3. Add a shadow-vs-current comparison mode or audit fixture before using metadata to render live commands.
4. Migrate low-risk system commands first, such as Settings or Notifications, only after command labels, routes, and permission gates are proven identical.
5. Align command-level gates with route gates before metadata controls visibility.
6. Migrate one low-risk command group at a time with route fallback to the current hardcoded list.
7. Avoid Vendor and Client command exposure until real portal routes, route authority, and safe portal vocabulary exist.
8. Do not introduce AMC-native command labels until AMC route/dashboard surfaces can support them without placeholder clutter.
9. Preserve assignment-only safety so packet users never receive canonical order/admin commands through search.
10. Keep package, billing, onboarding, and company/module settings out of command authority.

## Guardrails

- Do not treat shadow command metadata as authority.
- Do not expose hidden or internal concepts through command search.
- Do not expose Vendor packet concepts to Client users.
- Do not expose Client concepts to Vendors unnecessarily.
- Do not expose canonical order, client CRM, team/admin, or internal workflow commands to assignment-only users.
- Do not use command composition to widen access beyond active route guards and backend visibility.
- Do not turn hidden modules into locked command clutter.
- Do not add commands for routes that do not exist.
- Do not add Vendor/Client live commands before real portal route shells exist.
- Do not break current Staff operational speed while migrating.

## Validation Baseline

After Phase 9H35:

- This audit is reviewed against the current helper-backed `CommandPalette`.
- `currentCommandPaletteCommands` tests cover helper output, permission gates, dynamic Clients path, loading/error fallback, order-search fallback, future portal exclusion, and missing permission safety.
- `CommandPalette` tests cover rendered command order/labels, permission hiding, loading fallback, dynamic Clients route behavior, search behavior, order-search fallback navigation, and no future Vendor/Client command leakage.
- Shadow command diagnostics must be reviewed manually for Staff, AMC, Vendor, Client, and Hybrid modes.
- Vendor/Client hidden-surface guardrails must still pass.
- Route exposure must be mapped for every command route.
- Command permission metadata must remain non-authoritative until explicit authorization wiring exists.
- `npm run lint`, `npm run build`, and `git diff --check` should pass before and after any future command wiring slice.
- Static import scans must continue to confirm no product-mode/shadow metadata imports in active command, navigation, or route authority surfaces.
