# Falcon Experience Framework Audit

## Purpose

This audit compares current Falcon surfaces against
`docs/architecture/FALCON_EXPERIENCE_FRAMEWORK.md`, with emphasis on loading, state, motion, and
shell consistency across Internal Operations, Falcon AMC, Client Portal, and Vendor Workspace.

This is documentation and audit only. It does not change runtime behavior, UI implementation,
routes, permissions, schemas, RPCs, workflows, data fetching, component behavior, tests, emails,
notifications, Supabase logic, or deployments.

Companion audit: `docs/architecture/FALCON_PORTAL_SHELL_UNIFICATION_AUDIT.md` focuses specifically
on Client Portal and Vendor Workspace shell alignment with Falcon's premium operating-system
language.

## Evidence Reviewed

Primary files inspected:

- `src/components/state/FalconStatePrimitives.jsx`
- `src/components/motion/FalconMotionPrimitives.jsx`
- `src/lib/motion/falconMotion.js`
- `src/components/interaction/FalconInteractiveSurface.jsx`
- `src/lib/ui/falconInteractions.js`
- `src/layout/Layout.jsx`
- `src/components/shell/TopNav.jsx`
- `src/layout/ClientPortalLayout.jsx`
- `src/layout/VendorWorkspaceLayout.jsx`
- `src/routes/index.jsx`
- `src/routes/ClientPortalRouteGuard.jsx`
- `src/routes/VendorWorkspaceRouteGuard.jsx`
- `src/features/dashboard/DashboardPage.jsx`
- `src/features/dashboard/DashboardGate.jsx`
- `src/features/dashboard/AssignmentDashboardPage.jsx`
- `src/pages/orders/Orders.jsx`
- `src/features/orders/UnifiedOrdersTable.jsx`
- `src/pages/orders/OrderDetail.jsx`
- `src/pages/Calendar.jsx`
- `src/components/orders/drawer/OrderDrawerContent.jsx`
- `src/components/dashboard/WorkspaceDashboard.jsx`
- `src/features/clientPortal/ClientPortalDashboard.jsx`
- `src/features/clientPortal/ClientPortalOrdersPage.jsx`
- `src/features/clientPortal/ClientPortalOrderDetailPage.jsx`
- `src/features/clientPortal/ClientPortalNewOrderPage.jsx`
- `src/features/vendorWorkspace/VendorWorkspaceDashboard.jsx`
- `src/features/vendorWorkspace/VendorAvailableWorkPage.jsx`
- `src/features/vendorWorkspace/VendorAvailableWorkDetailPage.jsx`
- `src/features/vendorWorkspace/VendorAssignedOrdersPage.jsx`
- `src/features/vendorWorkspace/VendorAssignedOrderDetailPage.jsx`
- `src/features/vendorWorkspace/VendorPaymentsPage.jsx`
- `src/features/vendorWorkspace/VendorCredentialsPage.jsx`
- `src/features/vendorWorkspace/VendorProfilePage.jsx`
- `src/lib/navigation/workspaceNavigationDefinitions.js`
- `src/lib/navigation/currentNavigationRegistry.js`
- `src/components/nav/CommandPalette.jsx`
- `src/lib/commandPalette/currentCommandPaletteCommands.js`
- `src/lib/commandPalette/currentCommandRegistry.js`

## 1. Executive Summary

Current maturity: **mostly cohesive internal app, not yet a unified operating system**.

Internal Dashboard, Orders, Order Detail, and Calendar have the strongest alignment with the
Experience Framework. They use shared motion primitives, shared state primitives, shared
interaction helpers, and the premium internal shell in visible places.

Falcon AMC is partly cohesive because AMC Dashboard and AMC order routes use the same internal
shell, workspace mode, and Orders/Order Detail surfaces. However, several AMC workflow and
assignment-adjacent states still depend on local primitives such as `AssignmentState` and local
loading blocks.

Client Portal and Vendor Workspace feel like Falcon-branded workspaces, but not yet first-class
views in one operating system. Their shells duplicate large portions of the internal shell language
instead of consuming the shared shell/navigation model. Their state patterns are generally safe and
contextual, but they are mostly local and inconsistent with the shared Falcon state primitives.

The strongest current foundation is that Falcon already has the right primitives:

- shared state primitives under `src/components/state/`;
- shared motion primitives under `src/components/motion/`;
- shared interaction helpers under `src/lib/ui/falconInteractions.js`;
- a mature internal shell in `src/components/shell/TopNav.jsx`;
- command/navigation registries under `src/lib/navigation/` and `src/lib/commandPalette/`.

The main gap is adoption and unification, not absence of infrastructure.

## 2. Loading Patterns

### Strong Patterns

- `src/components/state/FalconStatePrimitives.jsx` provides `FalconSkeleton`,
  `FalconLoadingState`, `FalconEmptyState`, `FalconErrorState`, `FalconUpdatingIndicator`, and
  `FalconSuccessState`.
- `src/pages/Calendar.jsx` uses `FalconLoadingState`, contextual title copy
  `Loading active schedule`, and `FalconSkeleton` placeholders.
- `src/features/orders/UnifiedOrdersTable.jsx` uses `FalconLoadingState` with table-row skeletons
  for `Loading orders`.
- `src/components/orders/drawer/OrderDrawerContent.jsx` uses shared loading, skeleton, empty, and
  error states.
- `src/pages/orders/OrderDetail.jsx` uses `FalconLoadingState`, `FalconSkeleton`,
  `FalconErrorState`, `FalconEmptyState`, `FalconUpdatingIndicator`, and `FalconSuccessState`
  across the main order detail and file workflow surfaces.
- Vendor Workspace list/detail pages generally preserve layout with local skeleton-shaped blocks
  rather than spinners.

### Inconsistent Patterns

- Generic loading copy still appears in premium surfaces. `OrderDetailLoadingState` uses
  `title="Loading order"` with `description="Loading..."`, which conflicts with the framework's
  preference for contextual copy.
- Several internal and portal surfaces use plain local text:
  - `ClientPortalOrderDetailPage`: `Loading order...`;
  - `ClientPortalOrdersPage`: `Loading orders...`;
  - `ClientPortalDashboard`: `Loading orders...`, `Loading due dates...`, `Loading documents...`,
    `Loading activity...`;
  - `ClientPortalPendingRequests`: `Loading pending requests...`;
  - `EditOrder`: `Loading order details...`;
  - `Activity`: `Loading activity history...`;
  - `HistoricalOrders`: `Loading historical orders...`.
- Route guards use standalone full-screen loading blocks:
  - `ClientPortalRouteGuard`: `Checking your client portal...`;
  - `VendorWorkspaceRouteGuard`: `Checking your vendor workspace...`;
  - `V1HiddenSurfaceRouteGuard`: spinner-based route loading.
- `DashboardGate` and `AssignmentDashboardPage` use assignment-specific `LoadingState`, not the
  shared Falcon state primitives.
- Client Portal summary cards use the literal value `Loading` in metric cards rather than skeletons
  or staged loading.
- Vendor Workspace loading components are mostly local hand-built skeleton blocks, not
  `FalconSkeleton`.

### Spinners

Spinner use appears limited but not eliminated:

- `V1HiddenSurfaceRouteGuard` uses `animate-spin`.
- Some older or archived surfaces also contain spinner patterns, but active premium surfaces mostly
  avoid spinners.

### Delayed Or Progressive Loading

No audited surface shows a consistent staged delay model for fast, normal, longer, and slow loads.
The current behavior is mostly binary: show local loading UI while `loading` is true, then show
content, empty, or error.

There is no clear shared top/content progress indicator pattern for longer loads.

### Error Handling And Retry

Vendor Workspace has the strongest retry behavior. Most vendor pages define local `ErrorState`
components with a `Retry` button that increments a reload key.

Orders and Order Detail use shared error states, but retry behavior is inconsistent. Some errors
state the problem without a visible retry action.

Client Portal errors are safe and calm, but many are static messages without retry. This may be
acceptable for access/availability states, but data-refresh failures should eventually use a shared
recoverable pattern.

### Timeout Messaging

No explicit timeout messaging pattern was found. Slow-load copy is contextual in some places, but
there is no audited timeout threshold or slow-load escalation behavior.

### Contextual Versus Generic Copy

Contextual loading copy exists:

- `Loading active schedule`
- `Loading orders`
- `Loading files`
- `Loading eligible vendors`
- `Checking your client portal`
- `Checking your vendor workspace`
- `Loading assigned orders`
- `Loading available work`
- `Loading payments`

Generic copy still exists:

- `Loading...`
- metric value `Loading`
- local plain text loading lines with no state shell.

## 3. State Quality

### Reusable Support

Reusable support exists and is well-shaped:

- `FalconLoadingState` for section-level loading;
- `FalconSkeleton` for layout-preserving placeholders;
- `FalconEmptyState` for task-oriented empty states;
- `FalconErrorState` for recoverable failures;
- `FalconUpdatingIndicator` for inline updating;
- `FalconSuccessState` for subtle confirmations.

These primitives also respect reduced-motion behavior through the motion token layer.

### Strong Adoption

Strong adoption appears in:

- Orders list and saved-view panel;
- Unified Orders table;
- Order drawer content;
- Order Detail page and files card;
- Calendar loading/error state;
- Dashboard count skeleton and motion wrapper usage.

### Ad Hoc Or Local State Families

State patterns remain local in several areas:

- `src/features/assignments/AssignmentPrimitives.jsx` defines `AssignmentState`,
  `LoadingState`, `EmptyState`, and `ErrorState`.
- `src/components/dashboard/WorkspaceDashboard.jsx` defines `WorkspaceEmptyState` and local
  dashboard layout primitives used by Client Portal and Vendor Workspace.
- Vendor Workspace pages define repeated local `LoadingState`, `ErrorState`, `EmptyState`, and
  `UnavailableState` components.
- Client Portal pages use plain text blocks and local amber warning panels rather than shared state
  primitives.
- Route guards define local full-screen loading and denied states.

### Quality Assessment

Internal premium surfaces are state-mature but still have copy cleanup and retry consistency gaps.
Vendor Workspace is behaviorally mature for retry and access-safe messaging, but implementation is
ad hoc and repeated. Client Portal is safe and understandable, but visually and structurally less
aligned with the shared state system.

## 4. Motion And Interaction

### Strong Patterns

- `src/lib/motion/falconMotion.js` defines shared duration, easing, distance, scale, opacity, and
  reduced-motion tokens.
- `src/components/motion/FalconMotionPrimitives.jsx` defines reusable page, card, list, list item,
  fade, and collapse primitives.
- `src/lib/ui/falconInteractions.js` defines reusable hover, press, selected, disabled,
  focus-visible, row, card, quiet secondary, and destructive action recipes.
- `src/components/interaction/FalconInteractiveSurface.jsx` exposes a reusable interactive surface.
- `DashboardPage`, `Orders`, `OrderDetail`, `OrdersFilters`, `OrdersTableRow`,
  `UnifiedOrdersTable`, and `OrderDrawerContent` show real adoption of these primitives or helpers.

### Inconsistent Patterns

- Dashboard and Orders use shared motion and interaction helpers, while Client Portal and Vendor
  Workspace mostly use local Tailwind `transition`, `hover:*`, and static cards.
- Vendor Workspace skeletons and state transitions are static local blocks. They are calm, but not
  token-driven.
- Client Portal hover styles use a different stone/slate card language and local transitions,
  which makes the portal feel adjacent to Falcon rather than integrated into the same shell system.
- Dialog/drawer behavior is not centralized. Order Detail and order table workflows use local
  dialogs/drawers, while invite and assignment surfaces have their own dialog patterns.

### Page Feel

Internal premium pages feel calm and consistent. The page entrance is subtle where
`FalconPageMotion` is used.

Portal and vendor pages feel calm, but more static and less refined. The issue is not missing
animation; it is that their state, hover, shell, and page rhythms do not consistently derive from
the shared Falcon primitives.

### Motion Risk

Future work should not add flashy animation. The immediate opportunity is boring consistency:
apply the existing tokens and primitives to repeated loading/state/hover patterns without changing
workflows.

## 5. Shell Consistency

### Internal Shell

`src/layout/Layout.jsx` and `src/components/shell/TopNav.jsx` define the most mature Falcon shell.
Strengths:

- persistent Falcon brand;
- operations mode context;
- workspace identity through `CompanyIdentity`, `WorkspaceBadge`, and workspace cues;
- desktop rail navigation;
- mobile navigation;
- notification bell;
- avatar/account menu;
- command palette trigger;
- permission-aware navigation;
- AMC mode support through the same shell.

This shell is the closest current implementation of Falcon as an operating system.

### AMC Shell And Workspace Identity

AMC Dashboard and AMC order routes use the internal shell through `Layout`, `TopNav`, and
`WorkspaceRouteGuard`. AMC therefore benefits from the same premium shell language as Internal
Operations.

Remaining gap: some AMC workflow pages and assignment-related states still use local primitives
that do not fully match the shared state system.

### Client Portal Shell

`src/layout/ClientPortalLayout.jsx` visually echoes the Falcon shell with brand, rail navigation,
mobile nav, framed content, and workspace copy. However, it is separate from `TopNav` and the
current navigation registry.

Gaps:

- no command palette trigger;
- no notification/account menu parity beyond email and sign out;
- manually maintained nav items;
- duplicated shell frame classes;
- separate footer copy;
- separate client-only layout states and route-guard loading blocks;
- less consistent use of shared state primitives inside page content.

The result is Falcon-branded, but it can still feel like a separate portal product.

### Vendor Workspace Shell

`src/layout/VendorWorkspaceLayout.jsx` also echoes the Falcon shell with brand, rail navigation,
mobile nav, framed content, and workspace copy. It is stronger than Client Portal in workflow-state
coverage and retry behavior, but it is still separate from `TopNav`.

Gaps:

- no command palette trigger;
- no notification bell;
- no shared avatar menu;
- manually maintained nav items;
- duplicated shell frame classes;
- workspace navigation definitions still classify Vendor Workspace as future placeholder even
  though active routes exist in `src/routes/index.jsx`;
- local state patterns repeat across vendor pages.

The result feels like a Falcon-branded vendor app, not yet a fully integrated Falcon workspace.

## 6. Portal Unification Readiness

Portal unification is ready for a design-system implementation slice, but it must be staged.

Likely files/components to inspect first:

- `src/layout/ClientPortalLayout.jsx`
- `src/layout/VendorWorkspaceLayout.jsx`
- `src/components/shell/TopNav.jsx`
- `src/lib/navigation/workspaceNavigationDefinitions.js`
- `src/lib/navigation/currentNavigationRegistry.js`
- `src/lib/navigation/currentShellNavigationSections.js`
- `src/lib/navigation/currentShellMobileNavigationLinks.js`
- `src/lib/shell/resolveShellProfile.js`
- `src/lib/shell/useShellProfile.js`
- `src/lib/workspace/workspaceIdentity.js`
- `src/routes/ClientPortalRouteGuard.jsx`
- `src/routes/VendorWorkspaceRouteGuard.jsx`
- `src/features/clientPortal/*`
- `src/features/vendorWorkspace/*`
- `src/components/dashboard/WorkspaceDashboard.jsx`
- `src/components/state/FalconStatePrimitives.jsx`
- `src/components/motion/FalconMotionPrimitives.jsx`
- `src/lib/ui/falconInteractions.js`

Likely risk areas:

- client-only users are redirected away from the internal layout in `Layout.jsx`;
- vendor workspace bootstraps active company context before rendering workspace pages;
- route guards are access boundaries and must not be weakened;
- existing client/vendor navigation is intentionally permission-scoped and workflow-scoped;
- portal pages must continue hiding internal notes, raw ids, storage paths, bucket names, and
  unrelated account details;
- Vendor Workspace diagnostics currently expose operational support detail inside an access-denied
  path and need careful handling before any shell unification;
- workspace navigation definitions list client/vendor workspaces as future placeholders while
  active layouts/routes already exist;
- command palette visibility must not accidentally expose internal routes to portal-only users.

Permissions and workflow boundaries that must not change:

- Client Portal must preserve `ClientPortalRouteGuard` access behavior and client-safe read models.
- Vendor Workspace must preserve `VendorWorkspaceRouteGuard`, bootstrap behavior, vendor-company
  isolation, and assignment/document access rules.
- Portal shell work must not add access to internal Orders, clients, vendors, users, assignments,
  activity, notifications, documents, or settings outside existing permission gates.
- Vendor and client document flows must keep signed URL, storage path, bucket, and metadata safety
  unchanged.
- AMC/Internal workspace switching must not be reused for portal users unless a separate design and
  permission model approves it.

Readiness assessment:

- **Client Portal**: visually close enough to migrate shell chrome and state primitives in a
  low-risk sequence, but needs careful command/navigation gating.
- **Vendor Workspace**: functionally richer and better suited for state primitive adoption first;
  shell unification should wait until vendor navigation definitions and command visibility are
  reconciled.

## 7. Global Search / Command Center Readiness

Global search should not start as a new UI flourish. Falcon already has a command palette, but it
is currently route-command focused rather than object-search focused.

Current foundations:

- `src/components/nav/CommandPalette.jsx` opens from the internal shell and supports command
  filtering.
- `src/lib/commandPalette/currentCommandRegistry.js` defines current commands for Orders,
  Assignments, Relationships, Calendar, Clients, Users, Settings, and Notification Settings.
- `src/lib/commandPalette/currentCommandPaletteCommands.js` includes a fallback order search route
  to `/orders?q=...`.
- `src/lib/navigation/currentNavigationRegistry.js` documents route and command metadata.
- Orders already have searchable/filterable UI through `OrdersFilters` and `UnifiedOrdersTable`.
- Client, vendor, relationship, assignment, activity, status, and document-related data structures
  are present across the codebase, but not unified under a shared search read model.

Likely future search targets:

- **Orders**: strongest first target. Existing order routes, order filters, order detail pages, and
  order search fallback exist.
- **Clients**: likely second target. Client routes and client-safe portal read models exist, but
  internal/client visibility must stay scoped.
- **Vendors/appraisers**: useful for AMC, but must respect AMC/internal workspace context and
  vendor visibility rules.
- **Properties**: likely derived from orders and client portal order read models, not a separate
  first search domain.
- **Contacts**: useful later, but higher risk because contact visibility differs across client,
  vendor, and internal contexts.
- **Activity**: useful later for operational audit and timeline lookup, but payload safety and
  internal-note boundaries make it a poor first slice.
- **Statuses**: useful as command/filter shortcuts, not as standalone search results.

Likely first useful scope:

1. Internal/AMC command center extension for order search only.
2. Results limited to order number, client-safe/internal-safe title, property summary, status, due
   date, and route.
3. Permission-scoped to the same order visibility currently used by Orders.
4. No write commands, no lifecycle actions, no workflow transitions, and no destructive shortcuts.

Portal search should be deferred until the portal shell unification model is settled.

## 8. Recommended Implementation Sequence

### Phase 1: Shared Loading And State Primitive Adoption

Target: standardize state primitives without changing data flow or workflows.

Recommended first files:

- `src/features/vendorWorkspace/VendorAvailableWorkPage.jsx`
- `src/features/vendorWorkspace/VendorAssignedOrdersPage.jsx`
- `src/features/vendorWorkspace/VendorPaymentsPage.jsx`
- `src/features/clientPortal/ClientPortalOrdersPage.jsx`
- `src/features/clientPortal/ClientPortalOrderDetailPage.jsx`
- `src/routes/ClientPortalRouteGuard.jsx`
- `src/routes/VendorWorkspaceRouteGuard.jsx`

Scope:

- replace local skeleton blocks with `FalconSkeleton` where the content shape is already known;
- replace repeated local error/empty shells with `FalconErrorState` and `FalconEmptyState`;
- preserve current copy, retry behavior, route guards, and access boundaries;
- clean generic `Loading...` copy where the product meaning is obvious.

Do not alter data fetching, route guards, permissions, RPC calls, or workflow behavior.

### Phase 2: One Low-Risk Adoption Target

Recommended first adoption target: **Vendor Available Work list**.

Why:

- it has a simple list loading state;
- it already has contextual copy and retry behavior;
- it is vendor-facing but not a write-heavy detail workflow;
- it has a clear local `LoadingState`, `ErrorState`, and `EmptyState`;
- the change can be presentation-only if carefully scoped.

Alternative low-risk target: **Client Portal Orders list**, but it has less retry behavior today and
may require a product decision about whether to introduce retry.

### Phase 3: Portal Shell Unification

Target: make Client Portal and Vendor Workspace feel like Falcon workspaces rather than separate
products.

Recommended order:

1. Extract or document shared shell frame primitives from `Layout`, `ClientPortalLayout`, and
   `VendorWorkspaceLayout`.
2. Reconcile `workspaceNavigationDefinitions.js` with active client/vendor routes without exposing
   internal navigation.
3. Introduce a portal-safe shell profile model that can reuse Falcon brand, account, notification,
   and navigation rhythms.
4. Keep Client Portal and Vendor Workspace route guards unchanged.
5. Keep command palette hidden from portals until a portal-safe command model exists.

### Phase 4: Future Command Center

Target: evolve command palette from route launcher to useful operational command center.

Recommended order:

1. Define an order-search result contract and permission model.
2. Extend the command palette to show order results when the user types a query.
3. Scope initial result fields to safe order metadata only.
4. Add clients/vendors/appraisers only after workspace-specific visibility and labels are defined.
5. Add activity/status shortcuts only after payload safety and command semantics are documented.

Do not add mutation commands, destructive actions, status transitions, assignment actions, or
document actions in the first command-center slice.

## Audit Conclusion

Falcon has the right foundations for a unified experience system, but adoption is uneven. The
internal premium surfaces now model the desired direction. The next work should avoid random page
polish and instead standardize shared loading/state primitives first, then unify portal shell
language, then mature the command palette into a scoped operational command center.
