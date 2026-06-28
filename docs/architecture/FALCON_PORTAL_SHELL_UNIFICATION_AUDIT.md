# Falcon Portal Shell Unification Audit

## Purpose

This audit compares the current Client Portal and Vendor Workspace shells against Falcon's
internal premium shell and the shared standards in
`docs/architecture/FALCON_EXPERIENCE_FRAMEWORK.md`.

This is documentation and audit only. It does not change runtime behavior, UI implementation,
routes, permissions, schemas, RPCs, workflows, navigation behavior, data fetching, tests, emails,
Supabase logic, or deployments.

## Evidence Reviewed

Primary files inspected:

- `src/layout/Layout.jsx`
- `src/components/shell/TopNav.jsx`
- `src/layout/ClientPortalLayout.jsx`
- `src/layout/VendorWorkspaceLayout.jsx`
- `src/routes/ClientPortalRouteGuard.jsx`
- `src/routes/VendorWorkspaceRouteGuard.jsx`
- `src/lib/navigation/workspaceNavigationDefinitions.js`
- `src/components/dashboard/WorkspaceDashboard.jsx`
- `src/components/state/FalconStatePrimitives.jsx`
- `src/features/clientPortal/ClientPortalDashboard.jsx`
- `src/features/clientPortal/ClientPortalOrdersPage.jsx`
- `src/features/clientPortal/ClientPortalOrderDetailPage.jsx`
- `src/features/clientPortal/ClientPortalNewOrderPage.jsx`
- `src/features/vendorWorkspace/VendorWorkspaceDashboard.jsx`
- `src/features/vendorWorkspace/VendorAvailableWorkPage.jsx`
- `src/features/vendorWorkspace/VendorAvailableWorkDetailPage.jsx`
- `src/features/vendorWorkspace/VendorAssignedOrdersPage.jsx`
- `src/features/vendorWorkspace/VendorAssignedOrderDetailPage.jsx`

## 1. Executive Summary

The portals are partially unified with Falcon, but they do not yet feel like fully integrated
workspaces inside one operating system.

The Client Portal and Vendor Workspace both use Falcon's dark rail, framed content shell, Falcon
wordmark, workspace label, and calm card language. That keeps them from feeling like completely
separate products. The internal shell, however, has the stronger operating-system layer: grouped
navigation, workspace identity, company identity, command access, notifications, account controls,
permission-aware navigation, and a mature content rhythm.

The Vendor Workspace is closer to Falcon's premium shell today. It has broader workflow coverage,
more intentional vendor-facing states, retry behavior on core work lists, and the first shared
state primitive adoption on `VendorAvailableWorkPage`. The Client Portal has clear client-safe
copy and request/report workflows, but more pages still rely on plain loading text and local state
blocks.

The biggest source of divergence is not the color palette. It is duplicated shell and navigation
logic. `ClientPortalLayout.jsx` and `VendorWorkspaceLayout.jsx` manually recreate shell structure,
workspace identity, mobile navigation, and account affordances instead of consuming a shared
Falcon shell foundation. Page headers, cards, and loading/error/empty states are also implemented
locally across portal surfaces.

## 2. Internal Shell Baseline

The internal Falcon shell currently does several things well:

- Workspace identity: `Layout.jsx` and `TopNav.jsx` present Falcon as the host system while
  allowing the current operations mode and company context to shape what the user sees.
- Navigation hierarchy: `TopNav.jsx` uses grouped rail sections, permission-aware links,
  mobile navigation, command palette entry, notifications, and avatar/account controls.
- Content rhythm: `Layout.jsx` establishes a dark application frame, constrained page width,
  rounded inner content panel, and predictable vertical spacing.
- Page header treatment: premium internal surfaces use strong page intros, compact labels,
  operationally specific subtitles, and clear primary actions.
- Card and surface language: internal pages use restrained borders, white/slate surfaces, shadow
  discipline, and reusable section/card patterns rather than decorative containers.
- State patterns: the framework primitives in `src/components/state/FalconStatePrimitives.jsx`
  provide reusable loading, skeleton, empty, error, updating, and success language.

AMC surfaces inherit the internal shell path rather than using a separate portal layout. That makes
AMC feel more naturally connected to Internal Operations, even when navigation and permissions
change by workspace mode.

## 3. Client Portal Findings

### Shell and Header

`ClientPortalLayout.jsx` uses the Falcon wordmark, a dark rail, a workspace identity panel, and the
same framed content shell language as the internal layout. This creates basic Falcon continuity.

The shell is still separate from `TopNav.jsx`. It has its own manual `navItems`, its own mobile
navigation, and a simplified account area that shows email plus sign out. It does not include the
internal shell's company identity, command palette trigger, notifications, avatar menu, or grouped
navigation registry.

### Navigation

Client Portal navigation is manually defined in `ClientPortalLayout.jsx`:

- Dashboard
- Current Orders
- Historical Orders
- Documents
- Request Appraisal
- Profile

This matches client portal intent, but it is not connected to the shared workspace navigation
definitions. `workspaceNavigationDefinitions.js` still marks `CLIENT_WORKSPACE` as a future
placeholder, while live Client Portal routes already exist. That is a planning mismatch to address
before broader shell unification.

### Page Structure

`ClientPortalDashboard.jsx` uses shared dashboard helpers from
`src/components/dashboard/WorkspaceDashboard.jsx`, which gives it a stronger Falcon rhythm than
older standalone portal pages. `ClientPortalOrdersPage.jsx`,
`ClientPortalOrderDetailPage.jsx`, and `ClientPortalNewOrderPage.jsx` rely more heavily on local
headers, local sections, and local card components.

Order detail and request pages are workflow-appropriate, but their page headers do not yet share a
single portal page intro primitive. The result is acceptable but visibly page-by-page.

### Typography, Spacing, and Cards

Typography is broadly aligned with Falcon: compact labels, semibold titles, slate text, and
reserved copy. Spacing and cards are close, but implementation varies between `stone` and `slate`
border systems, local `SummaryCard` components, local `FormSection` components, and shared
dashboard sections.

This is a good candidate for a shared portal page container, page intro, and section rhythm rather
than a large visual rewrite.

### State Handling

Client Portal state handling is the largest quality gap:

- `ClientPortalDashboard.jsx` uses summary values such as `Loading` and plain copy like
  `Loading orders...`, `Loading due dates...`, `Loading documents...`, and `Loading activity...`.
- `ClientPortalOrdersPage.jsx` uses plain `Loading orders...` and a basic empty message.
- `ClientPortalOrderDetailPage.jsx` uses plain `Loading order...` and a local amber unavailable
  state.
- `ClientPortalNewOrderPage.jsx` has a useful success state after submission, but it is local to
  the form.

The copy is mostly contextual, which is good. The presentation is not yet aligned with the shared
skeleton and state primitive language.

### Workflow-Specific Constraints

Client Portal unification must preserve:

- client-only route access and invitation/account behavior;
- client-safe order visibility;
- order request submission behavior;
- report availability and download behavior;
- final report signed URL preparation;
- hiding internal notes, raw storage paths, bucket names, packet internals, and staff-only data.

## 4. Vendor Workspace Findings

### Shell and Header

`VendorWorkspaceLayout.jsx` mirrors the portal shell approach: Falcon wordmark, dark rail, workspace
identity panel, framed content area, mobile horizontal nav, email display, and sign out.

Like the Client Portal shell, it is separate from `TopNav.jsx`. It does not use the grouped
navigation registry, command palette, notifications, avatar menu, or shared account controls.
This separation is useful for permission safety today, but it creates duplicated shell behavior.

### Navigation

Vendor Workspace navigation is manually defined in `VendorWorkspaceLayout.jsx`:

- Dashboard
- Current Assignments
- Historical Assignments
- Documents
- Credentials
- Coverage/Profile

Current vendor routes also include available work, bid history, and payments. Those appear through
dashboard cards and route links, but not all are present in the side navigation. In parallel,
`workspaceNavigationDefinitions.js` marks `VENDOR_WORKSPACE` as a future placeholder even though
live vendor workspace routes exist. That placeholder status should be resolved before any attempt
to route vendor navigation through shared definitions.

### Page Structure

`VendorWorkspaceDashboard.jsx` uses the shared dashboard helpers and has a strong workspace
overview. `VendorAvailableWorkPage.jsx` is now the strongest state-quality pilot because it uses
`FalconLoadingState`, `FalconSkeleton`, `FalconEmptyState`, and `FalconErrorState`.

Other vendor pages still use local state and section patterns:

- `VendorAssignedOrdersPage.jsx` has local skeleton cards, local error state, local empty state,
  and local summary cards.
- `VendorAvailableWorkDetailPage.jsx` has local loading and unavailable states around bid
  workflows.
- `VendorAssignedOrderDetailPage.jsx` has local loading/unavailable states around start work,
  document access, report upload, submission, and revision flows.

The vendor workspace has solid workflow structure, but its presentation primitives are uneven.

### Typography, Spacing, and Cards

Vendor pages are generally closer to the current internal premium style than the Client Portal.
They use slate surfaces, compact labels, two-column operational grids, and clear status pills.
The main issue is repeat implementation rather than poor visual direction.

### State Handling

Vendor state handling is mixed:

- `VendorAvailableWorkPage.jsx` now follows the Experience Framework pilot pattern.
- `VendorWorkspaceDashboard.jsx` has local skeletons and a retryable error state.
- `VendorAssignedOrdersPage.jsx` has local skeletons, retryable error state, and intentional empty
  copy.
- Detail pages use local unavailable states with back/retry actions.

Retry behavior is stronger here than in the Client Portal, but the presentation should move toward
shared state primitives over time.

### Workflow-Specific Constraints

Vendor Workspace unification must preserve:

- vendor route guard bootstrap and active company behavior;
- `vendor_workspace.view` permission enforcement;
- vendor diagnostics behavior where it exists;
- available work visibility and `work_key` route semantics;
- bid submit, pass/decline, and bid history behavior;
- assignment accept/start/submission/resubmission behavior;
- document download and upload URL behavior;
- invoice/payment workflows;
- isolation between vendor companies.

## 5. Shared Shell Opportunities

The safest opportunities are presentation primitives that do not own permissions, routing, data
loading, or workflow behavior:

- Shared page container: a small primitive for portal content max width, gap rhythm, and framed
  page spacing.
- Shared workspace header: label, title, subtitle, optional actions, and optional status badges.
- Shared workspace identity badge: a reusable identity block for "Client Portal" and
  "Vendor Workspace" that preserves distinct permission context.
- Shared content section rhythm: one section/card shell pattern for portal dashboards, lists, and
  details.
- Shared loading/state primitives: continue adopting `FalconLoadingState`, `FalconSkeleton`,
  `FalconEmptyState`, `FalconErrorState`, `FalconUpdatingIndicator`, and `FalconSuccessState`.
- Shared card/surface classes: a small utility or component pattern for slate/white operational
  cards.
- Shared portal navigation wrapper: shared nav item rendering and mobile behavior while each portal
  keeps its own allowed route list.

Do not start with a giant shell rewrite. A shared shell foundation should be passive, accept
portal-provided navigation and account content, and avoid owning auth, route guards, data fetching,
or permission decisions.

## 6. Permission and Workflow Boundaries

Shell unification must not change these boundaries:

- Client access: `ClientPortalRouteGuard.jsx` remains the gate for client portal entry. Client
  routes must not gain internal or vendor navigation.
- Vendor access: `VendorWorkspaceRouteGuard.jsx` remains the gate for vendor entry and bootstrap.
  Vendor routes must not gain client or internal navigation.
- AMC/internal access: `Layout.jsx`, `TopNav.jsx`, operations mode handling, and internal guards
  remain the authority for internal and AMC shell access.
- Order visibility: client and vendor pages must keep their current read models and must not expose
  internal order data, hidden workflow fields, or unrelated company records.
- Report downloads: report/document download flows must preserve existing signed URL preparation
  and must not expose raw storage paths, bucket names, or internal file metadata.
- Bid and assignment flows: available work, bid submission, pass/decline, assignment start,
  report upload, report submission, resubmission, and invoice/payment states must remain
  behaviorally unchanged.
- Auth/session handling: sign out, redirects, invitation flows, active company resolution, and
  permission reload behavior must stay under existing route and session logic.

## 7. Recommended Implementation Sequence

1. Shared shell primitives/foundation

   Create passive portal presentation primitives for page container, page header, section rhythm,
   and navigation item rendering. These primitives should receive children and labels; they should
   not own route guards, permissions, fetches, or workflow actions.

2. Vendor Workspace adoption

   Adopt the primitives first in Vendor Workspace because it already has the strongest workflow
   coverage, retry behavior, and the `VendorAvailableWorkPage` state primitive pilot. Start with a
   low-risk surface before touching detail/submission flows.

3. Client Portal adoption

   Bring Client Portal pages onto the same shell/page primitives after the vendor pattern proves
   stable. Prioritize dashboard and orders list before report download or appraisal request flows.

4. Cross-portal QA

   Verify desktop, mobile, loading, empty, error, denied, and signed-in states for client and vendor
   accounts. Confirm portals do not inherit internal nav or internal-only actions.

5. Browser approval

   Perform visual approval in browser for representative client and vendor accounts. Approval
   should cover shell identity, navigation, page headers, content rhythm, state behavior, and
   workflow entry points.

This order keeps shell unification grounded in shared primitives while preserving route, workflow,
and permission boundaries.

## 8. First Implementation Slice Recommendation

The safest first code slice after this audit is:

Create a small shared portal page container/header primitive and apply it to one Vendor Workspace
surface, preferably `VendorAvailableWorkPage`.

Scope:

- Add a passive presentation primitive such as a portal page frame/header.
- Replace only the local page intro/container markup on `VendorAvailableWorkPage`.
- Preserve the existing route, route guard, fetch, retry, empty/error/loading behavior, work card
  rendering, bid visibility, and navigation links.
- Do not touch vendor detail pages, submission flows, downloads, permissions, RPCs, or route
  definitions in the same slice.

This is narrow because `VendorAvailableWorkPage` already adopted shared loading/state primitives
and does not contain report upload, assignment start, invoice, or signed download behavior. It can
prove the shell/page header primitive without changing vendor workflow behavior.

## Audit Conclusion

Falcon's portals are visually adjacent to the internal app, but shell unification is not complete.
The platform should move from duplicated portal shells toward shared, passive presentation
primitives that preserve each workspace's permission model. Vendor Workspace should lead adoption,
Client Portal should follow after the pattern is proven, and all portal work should remain
explicitly bounded away from workflow, auth, RPC, and visibility changes.
