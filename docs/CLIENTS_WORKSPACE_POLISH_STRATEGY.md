# Clients Workspace Polish Strategy

## Purpose

Clients Workspace Polish Slice 1A plans the next governed polish pass for Falcon's standalone
Clients workspace so it matches the current Dashboard, Orders, and Calendar workspace hierarchy
standards.

This is documentation-only plus read-only inspection. It does not change runtime code, backend
behavior, Supabase behavior, routes, permissions, RLS/RPCs, client data model, relationship or
company-scoping behavior, order visibility, workflow/lifecycle behavior, or mutation behavior.

## Sources Inspected

Runtime:

- `src/routes/index.jsx`
- `src/pages/clients/ClientsDashboard.jsx`
- `src/pages/clients/ClientsIndex.jsx`
- `src/pages/clients/ClientDetail.jsx`
- `src/pages/clients/ClientProfile.jsx`
- `src/pages/clients/NewClient.jsx`
- `src/pages/clients/EditClient.jsx`
- `src/components/clients/ClientCard.jsx`
- `src/components/clients/ClientForm.jsx`
- `src/features/clients/clientManagementApi.js`
- `src/lib/services/clientsService.js`
- `src/lib/navigation/currentPrimaryNavLinks.js`
- `src/components/shell/TopNav.jsx`
- `src/components/nav/CommandPalette.jsx`

Docs:

- `docs/OPERATIONAL_DASHBOARD_POLISH_STRATEGY.md`
- `docs/ORDERS_WORKSPACE_POLISH_STRATEGY.md`
- `docs/CALENDAR_WORKSPACE_POLISH_STRATEGY.md`
- `docs/HISTORICAL_ADMIN_READBACK_PLAN.md`
- `docs/OPERATIONAL_GOVERNANCE_SNAPSHOT.md`
- `docs/NEXT_PHASE_EXECUTION_PLAN.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

## Current Clients Workspace Foundation

Routes and access:

- `/clients` renders `ClientsDashboard`, which delegates to `ClientsIndex`.
- `/clients` is guarded by `clients.read.all`.
- `/clients/cards` renders `ClientsIndex` for users with either `clients.read.all` or
  `clients.read.assigned`.
- TopNav and CommandPalette dynamically route full client readers to `/clients` and assigned-only
  readers to `/clients/cards`.
- `/clients/:id` renders `ClientDetail` for users with either full or assigned client read access.
- `/clients/new` is guarded by `clients.create`.
- `/clients/edit/:clientId` is guarded by `clients.update.all`.
- `/clients/profile/:clientId` remains a legacy profile route guarded by `clients.read.all`.

List workspace:

- `ClientsIndex` loads rows through `listClientManagementClients(...)`.
- The list uses `rpc_client_management_list` through `src/features/clients/clientManagementApi.js`.
- Current controls are:
  - search;
  - category chips for All, AMCs, Lenders, and Direct Clients;
  - sort by total orders or name;
  - optional `+ New Client` action when `clients.create` is available.
- Client cards show:
  - name;
  - category;
  - primary contact and phone;
  - total orders;
  - average fee;
  - last order date;
  - status;
  - link to client detail.

Detail workspace:

- `ClientDetail` loads the client through `rpc_client_management_detail`.
- Related orders are read from `v_orders_frontend_v4` and scoped by current app context:
  - owner/admin can see the client order set available through the view;
  - reviewer users are filtered by `reviewer_id`;
  - appraiser users are filtered by `appraiser_id`.
- Detail shows:
  - client name, status, category, and managing AMC relationship when present;
  - inline edit toggle when `clients.update.all` is available;
  - primary contact, phone, email, and notes;
  - active and completed related order lists;
  - client/order summary KPIs derived from already loaded detail/order data;
  - relationship notes placeholder text.
- `ClientForm` uses schema-aligned primary contact fields and company-scoped client management RPCs
  for create/update wrappers.

Legacy/compatibility surfaces:

- `ClientProfile` remains present and reads client detail plus `listClientOrders(...)`.
- `clientsService.js` is explicitly marked as a legacy compatibility service except for active
  compatibility helpers such as related orders and name availability.
- New client management call sites should use `src/features/clients/clientManagementApi.js`.

## Current Operational Weaknesses

The Clients workspace is functional, but it predates the newer Dashboard, Orders, and Calendar
workspace polish.

Observed weaknesses:

- The list header simply says `Clients`, without a clear workspace hierarchy or active operational
  framing.
- Sort, category filters, search, and creation action compete visually in a simple toolbar layout.
- Assigned-only `/clients/cards` and full `/clients` share the same screen without clear work-view
  context.
- Category chips are useful but not framed as client relationship filters.
- Search and sort feel like raw controls rather than a coordinated client relationship workspace.
- Client cards present useful data, but the hierarchy mixes contact, metrics, status, and guidance
  copy without a stronger scan pattern.
- Empty, loading, and error states are terse compared with the newer Orders and Calendar surfaces.
- The detail page has useful operational information, but it mixes client profile, edit state,
  orders, derived client KPIs, and future placeholder copy without a clear primary/secondary
  layout.
- `Client KPIs` language can imply an analytics surface even though values are derived from the
  currently loaded accessible order rows.
- Legacy `/clients/profile/:clientId` remains available and should not be expanded during polish.
- The current category model includes client, lender, and AMC labels, but broader CRM,
  relationship, duplicate merge, and company-scoping behavior remain out of scope for presentation
  polish.

## Target Clients Workspace Experience

The Clients workspace should answer:

- Which client relationships are active and important?
- How do I find a client quickly?
- Which clients are direct clients, lenders, or AMCs?
- What is the current client contact and related order context?
- Which client should I open next for order coordination?

Target hierarchy:

1. Clients workspace header with calm relationship-management framing.
2. Compact context row from existing permission/path/filter state only.
3. Search, category, and sort controls grouped as client relationship controls.
4. Client cards/list as the primary workspace body.
5. Detail page with client identity/contact and related orders as primary content.
6. Derived order/client summaries kept secondary and clearly labeled as current visible order
   context.

The page should feel like an operational relationship workspace, not a full CRM or analytics
dashboard.

## Candidate Polish

### Stronger List Header

Candidate direction:

- Reframe the list around `Clients Workspace` or `Client Relationships`.
- Add concise copy that explains this surface is for client/lender/AMC relationship lookup and
  order coordination.
- Keep `New Client` as the only primary action when permitted.
- Add current work-view context for full versus assigned-only readers using existing route or
  permission state only.

Avoid:

- New counts that require new queries.
- New relationship/CRM claims not backed by current data.
- Client Portal language; this is internal client management, not external client access.

### Client Relationship Controls

Candidate direction:

- Group search, category chips, and sort into one clear control area.
- Keep category filters visible and plain-language.
- Improve labels and accessible grouping where safe.
- Preserve current search/category/sort behavior exactly.

Avoid:

- Adding new filters in the first polish pass.
- URL persistence or saved views without separate design.
- Changing RPC payloads, sort semantics, or category values.

### Client Cards / Inventory Body

Candidate direction:

- Make cards easier to scan:
  - client identity;
  - category/status;
  - primary contact;
  - visible order context;
  - open detail action.
- Keep metrics clearly derived from existing row values.
- Improve loading/error/empty states.

Avoid:

- Table/card redesign that changes data meaning.
- New analytics or ranking claims.
- CRM pipeline, scoring, priority, churn risk, or predictive fields.

### Client Detail Hierarchy

Candidate direction:

- Treat client identity/contact and related orders as primary.
- Keep edit behavior in place but visually secondary.
- Reword derived summary sections away from analytics-heavy language when needed.
- Keep related orders scoped to existing readable order visibility.

Avoid:

- New backend reads.
- Relationship graph expansion.
- Client merge/duplicate behavior.
- Lifecycle or order workflow actions from client detail.

### Forms

Candidate direction:

- Keep `ClientForm` fields and RPC submit behavior unchanged.
- Later polish can align form shell/header/section grouping with Owner Setup and Order forms.

Avoid:

- Adding fields not backed by the current client model.
- Changing duplicate-name behavior.
- Adding company-scoped contact models before backend design.

## Governance Rules

- No runtime changes in Slice 1A.
- No backend changes.
- No Supabase changes.
- No query behavior changes.
- No client data model changes.
- No relationship/company-scoping changes.
- No permission, route-guard, workflow, or lifecycle changes.
- No order visibility changes from client surfaces.
- No client merge, duplicate canonicalization, or CRM pipeline behavior.
- No fake analytics, predictive scoring, priority scoring, or risk language.
- No Client Portal/external-client feature expansion.
- No new mutation paths.

## First Runtime Implementation

Clients Workspace Polish Slice 1B is the first runtime pass:

- polish the `ClientsIndex` header and page spacing;
- frame the surface as `Clients Workspace` under internal relationship management;
- group search/category/sort controls into a clearer relationship-control surface;
- add compact read-only context from existing filter/result state;
- improve loading/error/empty state presentation;
- preserve `listClientManagementClients(...)`, current RPC arguments, category chips, search, sort,
  create link visibility, and card navigation exactly.

No detail-page redesign, form behavior, relationship behavior, query semantics, or data model work
belongs in this first runtime pass.

## Deferred Work

- Client detail layout polish after list polish is stable.
- New/Edit Client form shell polish.
- Client card density or table/list toggle redesign.
- URL-backed client filters.
- Saved client views.
- Client duplicate/canonicalization model.
- Company-scoped client contacts model.
- Client archive/restore doctrine and UI, if productized later.
- Client relationship graph / managing AMC model expansion.
- Client Portal/external request/status/document surfaces.
- Client analytics/reporting page.
- Server-side client search, pagination, and sorting improvements if needed.
- CRM pipeline, segmentation, scoring, priority, or predictive risk.
- Bulk client actions.
- Imports/exports.

## Slice 1A Closeout

Clients Workspace Polish Slice 1A is complete as documentation plus read-only inspection. The new
strategy records the current Clients routes, permission gates, list/detail/form/API architecture,
operational weaknesses, target hierarchy, first safe frontend-only polish path, governance rules,
and deferred work.

No runtime files, backend behavior, Supabase behavior, routes, permissions, RLS/RPCs, client data
model, relationship/company-scoping behavior, order visibility, workflow/lifecycle behavior,
analytics behavior, or mutation paths changed.

## Slice 1B Closeout

Clients Workspace Polish Slice 1B is complete as frontend-only workspace hierarchy and header
polish. `src/pages/clients/ClientsIndex.jsx` now frames `/clients` and `/clients/cards` as
`Clients Workspace` under relationship management, adds compact read-only context for current work
view, active category filter, and result count, groups search, category filters, sort, and the
permission-gated `New Client` link under `Relationship Controls`, and wraps the card grid in a
clear `Client Directory` section with calmer loading, error, and empty states.

Focused tests in `src/pages/clients/__tests__/ClientsIndex.test.jsx` cover the polished hierarchy,
create-link permission visibility, preserved search/category/sort API arguments, normalized card
data passed to `ClientCard`, and the empty state.

No backend behavior, Supabase behavior, routes, permissions, RLS/RPCs, client model/API/RPC
behavior, query semantics, relationship/company-scoping behavior, order visibility, workflow/
lifecycle behavior, Client Portal behavior, CRM feature behavior, fake analytics, predictive
scoring, card navigation, or mutation paths changed.

## Slice 1C Closeout

Clients Workspace Polish Slice 1C is complete as frontend-only client card and directory
presentation polish. `src/components/clients/ClientCard.jsx` now uses a cleaner relationship-card
hierarchy with stronger client identity, category/status badges, compact order count, clearer
contact presentation, three read-only metric tiles, and a more explicit detail link. The card still
renders the same client and metric fields, still links to `/clients/:id`, still preserves the
phone `tel:` link, and still derives helper copy from `clients.update.all`.

Focused tests in `src/components/clients/__tests__/ClientCard.test.jsx` cover rendered identity,
contact, metrics, status, detail navigation, phone navigation, permission-derived helper copy, no
new button actions, and missing-data placeholders. The existing `ClientsIndex` tests continue to
cover card data passed from the directory.

No backend behavior, Supabase behavior, routes, permissions, company scoping, RLS/RPCs, client
model/API/RPC behavior, query/filter/sort semantics, Client Portal behavior, CRM feature behavior,
new client actions, card navigation, or mutation paths changed.

## Slice 1D Closeout

Clients Workspace Polish Slice 1D is complete as frontend-only client detail/profile presentation
polish. `src/pages/clients/ClientDetail.jsx` now uses a cleaner `Relationship Detail` header,
read-only context tiles, clearer edit/back action hierarchy, a grouped `Client Contact` section,
a `Related Orders` section that preserves current visible-order scope, and a renamed `Visible
Order Context` rail instead of analytics-heavy KPI language. The existing edit form remains
permission-gated by `clients.update.all`, and related order links still route to Order Detail.

The legacy `src/pages/clients/ClientProfile.jsx` route received a light read-only shell polish with
`Legacy Client Profile` framing, safer error styling, and a clearer `Previous Orders` section while
preserving its compatibility read paths.

Focused tests in `src/pages/clients/__tests__/ClientDetail.test.jsx` cover the polished detail
hierarchy, existing client-detail wrapper call, existing related-order view/query/scoping behavior,
edit-form visibility through the existing permission hook, and absence of edit controls without
update permission.

No backend behavior, Supabase behavior, routes, permissions, company scoping, RLS/RPCs, client
model/API/RPC behavior, displayed client/order data, query semantics, edit submission behavior,
Client Portal behavior, CRM feature behavior, new actions, new mutations, or order visibility
behavior changed.

## Slice 1E Closeout

Clients Workspace Polish Slice 1E is complete as the first-pass consistency, accessibility, and
responsive cleanup checkpoint. The touched Clients workspace surfaces now include safer accessible
labels for individual client cards and the relationship-card grid, hidden decorative separators
from assistive technology, normalized `AMC` category display on Client Detail, clearer `Active
orders` context labeling, and horizontal overflow protection for the legacy Client Profile order
history grid.

The completed first Clients Workspace polish foundation now covers strategy, workspace
header/control hierarchy, client card/directory presentation, client detail/profile presentation,
and consistency/accessibility/responsive cleanup.

No backend behavior, Supabase behavior, routes, permissions, company scoping, RLS/RPCs, client
model/API/RPC behavior, displayed client/order data, query/filter/sort semantics, edit submission
behavior, Client Portal behavior, CRM feature behavior, new client actions, new mutations, order
visibility behavior, fake analytics, or predictive scoring changed.
