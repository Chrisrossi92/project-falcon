# Next Phase Execution Plan

## Purpose

This plan starts from `governance-baseline-v1` and turns the governance retrospective into an
execution shape for the next phase of Falcon work.

This is a planning document. It makes no runtime behavior, permission, RLS, RPC, route, UI,
workflow, lifecycle, assignment, activity, notification, or feature changes.

Baseline references:

- Git tag: `governance-baseline-v1`
- `docs/STAGING_BASELINE_SNAPSHOT.md`
- `docs/OPERATIONAL_GOVERNANCE_SNAPSHOT.md`
- `docs/GOVERNANCE_RETROSPECTIVE_AND_NEXT_PHASE.md`
- `docs/ORDER_DETAIL_PRINT_PACKET_PLAN.md`
- `docs/DOCUMENT_EXPERIENCE_PLAN.md`
- `docs/HISTORICAL_ADMIN_READBACK_PLAN.md`
- `docs/DASHBOARD_ANALYTICS_PLAN.md`
- `docs/WORKLOAD_VISIBILITY_PLAN.md`
- `docs/SAVED_VIEWS_PLAN.md`
- `docs/OPERATIONAL_TIMELINE_PLAN.md`
- `docs/PRODUCTION_READINESS_AUDIT.md`
- `docs/ADMIN_ONBOARDING_PLAN.md`

## Executive Direction

Falcon should resume **selective product expansion on governed, low-risk surfaces** while keeping
two narrower tracks active:

1. targeted backend ownership migrations where frontend orchestration is the main remaining risk;
2. production cutover readiness for broader customer rollout.

The first next slice should be a safe read-only or product-facing surface, not another heavy
mutation sprint. The chosen first candidate is **read-only Order Detail Print Packets** because it
is operationally useful, aligned with preserved-history doctrine, and does not require new mutation
authority. Slices 1A through 1G now define, implement, polish, review, and close out the governed
print packet foundation in `docs/ORDER_DETAIL_PRINT_PACKET_PLAN.md`.

The first historical/admin readback MVP is also complete. Historical/Admin Readback Slices 1A
through 1F now plan, implement, polish, and close out the initial read-only `Historical Orders`
surface in `docs/HISTORICAL_ADMIN_READBACK_PLAN.md`.

## Track 1: Safe Product Expansion

### Purpose

Restart visible product progress on top of the stabilized governance layer without opening new
write paths or lifecycle behavior.

### Candidate Work Items

- Read-only Order Detail Print Packets:
  - `Order Summary`;
  - `Order Audit`;
  - reuse already authorized order/activity data where practical.
- Order Detail layout and information architecture improvements.
- Governed document/files experience improvements:
  - clearer Order Detail Files card metadata;
  - document category/type grouping;
  - uploaded-by/uploaded-at/file-size visibility;
  - secure preview planning only after separate design.
- Activity timeline read UX:
  - grouping;
  - filtering;
  - clearer human-note versus system-event rendering.
- Assignment packet read/detail UX improvements that keep mutations on existing
  `rpc_order_company_assignment_*` paths.
- Notification center read UX and preference UX, limited to existing read/mark/preference RPCs.
- Historical/Admin readback planning and future read-only list/detail UX:
  - archived order visibility;
  - cancelled/voided order visibility;
  - explicit historical filters;
  - preserved-history Order Detail readback.
- Governed dashboard KPI planning and lightweight operational KPI cards:
  - active order count;
  - overdue orders;
  - in-review backlog;
  - appraiser/reviewer workload summaries;
  - historical metrics only when explicitly labeled and sourced.
- Governed workload visibility planning and future compact workload surfaces:
  - appraiser workload awareness;
  - reviewer workload awareness;
  - operational bottleneck visibility;
  - overdue concentration visibility;
  - assignment distribution visibility.
- Governed Orders filtering/search UX:
  - active filter chips;
  - clearer URL persistence;
  - unified reset;
  - saved query patterns only after the active filter model is stable.
- Governed operational timeline UX:
  - Order Detail history grouping;
  - lifecycle/workflow/assignment/document/note event categories;
  - safe payload display;
  - richer read context without mutation behavior.

### Guardrails

- No new lifecycle mutation, restore, reopen, unarchive, or hard delete behavior.
- No bulk lifecycle actions or table-row lifecycle menus.
- No new frontend-authored authoritative system activity.
- No new notification fanout for lifecycle, document, team, relationship, or assignment events.
- No direct table mutation helpers.
- Historical/admin readback runtime work must use explicit low-level opt-in flags and source-scan
  whitelists.

### Recommended First Slice

Completed in Slices 1A through 1G: build the first read-only Order Detail Print Packets foundation:

- define the packet contract, sections, and future modes;
- use current permission/read surfaces and already loaded Order Detail/Files card data;
- avoid new backend APIs, RPCs, routes, database tables, and PDF generation;
- exclude mutation controls;
- add focused UI/test coverage around rendering, browser print, lifecycle notices, document category
  counts, and no mutation or signed URL side effects.

The completed foundation is a browser print stylesheet with a dedicated read-only preview component
inside Order Detail. It includes print isolation, lifecycle notices, and document category counts,
while excluding signed URLs, downloads, file contents, mutations, new backend/API/RPC work, and new
routes. Dedicated print routes, PDF export, richer activity summaries, sanitized document metadata
rows, and client-safe/external packet variants remain deferred future enhancements.

### Planned Document Experience Improvements

Document Experience Slice 1A plans the next governed document/files experience improvements in
`docs/DOCUMENT_EXPERIENCE_PLAN.md` without runtime changes.

The planned purpose is to make Order Detail files easier to understand and manage, improve
attachment/document visibility, support appraisal workflow context, and preserve secure document
governance. The current completed foundation already includes the private bucket, document metadata
model, signed download path, upload prepare/finalize flow, backend-owned archive, backend document
activity logging, drag/drop upload UI, Files card inside Order Detail, and Print Packet document
category counts.

Candidate improvements include document category/type display polish, metadata rows, uploaded-by
and uploaded-at display, file size display, grouped document sections, document status chips, safer
file preview planning, missing expected document checklist planning, and packet/report-ready
document summaries.

The recommended first implementation is read-only metadata display polish in the existing Order
Detail Files card, using already available metadata where possible and grouping by category/type
only if that metadata is already available. Secure previews, document checklists, AI extraction,
packet export attachments, client-safe file sharing, and retention rules remain deferred.

The guardrails remain no raw storage paths, signed downloads only through approved paths, archive
owned by backend RPCs, no public file URLs, no automatic AI extraction, no content preview without
separate design, no new mutation paths without backend RPC ownership, no storage policy changes,
and no signed URL changes.

### Completed Files Card Metadata Polish

Document Experience Slices 1A through 1D plan, audit, implement, and close out the initial governed
Order Detail Files card metadata polish in `docs/DOCUMENT_EXPERIENCE_PLAN.md`.

The completed foundation keeps the existing document governance intact while making the Files card
easier to scan:

- grouped rows by already available category/type metadata;
- safe metadata display only;
- display name from existing title/file name fields;
- uploaded date from existing created timestamp metadata;
- formatted file size when available;
- archived state when already returned;
- signed-download action labeled `Download`;
- existing archive behavior preserved on the approved backend-owned archive path;
- clearer empty state for orders with no uploaded files.

Locked guardrails remain no raw storage paths, no bucket/object keys, no signed URL internals, no
file contents or previews, no backend/API/RPC/storage policy changes, no upload flow changes, and
no mutation expansion.

Deferred document experience work remains secure previews, document checklist, AI extraction/review
panel, packet export attachments, client-safe file sharing, document retention rules, and richer
document metadata normalization.

### Completed Historical Readback MVP

Historical/Admin Readback Slices 1A through 1F complete the initial governed `Historical Orders`
readback surface:

- dedicated `/orders/historical` route;
- explicit `listHistoricalOrders(...)` query helper;
- read-only list of archived, cancelled, and voided records;
- archived/cancelled/voided state labels;
- frontend-only state filters;
- links to preserved-history Order Detail readback;
- conservative secondary entry point from the active Orders page;
- no mutations, actions, restore, reopen, unarchive, hard delete, backend API/RPC/RLS changes, or
  active-list behavior changes.

Deferred historical enhancements remain server-side filtering/search, historical counts or KPIs,
richer lifecycle timeline views, admin-only permission tightening if needed, restore/reopen/
unarchive doctrine before any implementation, exports/reporting, and client-safe history views.

### Completed Dashboard Analytics KPI Foundation

Dashboard Analytics Slices 1A through 1G complete the initial governed dashboard KPI foundation in
`docs/DASHBOARD_ANALYTICS_PLAN.md`.

The completed foundation is a lightweight active operational KPI row with:

- `Active Orders` -> `/orders`;
- `In Review` -> `/orders?status=in_review`;
- `Needs Revisions` -> `/orders?status=needs_revisions`;
- `Overdue Orders` -> `/orders?due=overdue`.

The cards remain read-only, reuse existing order/dashboard read paths, respect current company
scope, RLS, and permission boundaries, keep active metrics confined to active operational rows, and
avoid hidden archived/cancelled/voided leakage. No backend analytics pipeline, dashboard-specific
RPC, mutation behavior, workflow/lifecycle behavior, charting, historical metric, cross-company
aggregate, export, or scheduled reporting was added.

Deferred dashboard analytics work remains workload cards, reviewer/appraiser queues, trend charts,
historical metrics, lifecycle analytics, server-side analytics views if needed, and
exports/reporting.

### Completed Workload Visibility Foundation

Workload Visibility Slices 1A through 1E complete the initial governed workload dashboard section in
`docs/WORKLOAD_VISIBILITY_PLAN.md`.

The completed foundation is a read-only dashboard section derived from existing active dashboard
order rows only. It provides:

- appraiser workload awareness through `Assigned Work`;
- review queue visibility through `Review Queue`;
- unassigned active order visibility through `Unassigned Active`;
- revision follow-up visibility through `Revision Follow-Up`;
- safe drill links where existing Orders filters support them, including reviewer-specific review
  queue links after Operational UX Slice A2.

The section remains active operational visibility only. It respects company scope, RLS, and
existing order read permissions; excludes archived, completed, cancelled, and voided rows from the
workload derivation; avoids hidden historical leakage; and avoids ranking, scoring, productivity,
compensation, punitive, or performance-review semantics. No mutation behavior, workflow/lifecycle
behavior, assignment mutation behavior, backend analytics pipeline, new RPC/view, charting,
historical metric, export, or report was added.

Completed workload drill links now include:

- reviewer rows -> `/orders?status=in_review&reviewerId=<id>`;
- appraiser rows -> `/orders?appraiserId=<id>`;
- revision follow-up appraiser rows -> `/orders?status=needs_revisions&appraiserId=<id>`;
- review queue -> `/orders?status=in_review`;
- revision follow-up -> `/orders?status=needs_revisions`;
- unassigned active -> `/orders?queue=unassigned_orders`.

Deferred workload work remains optional reviewer filter control UX, overdue-by-assignee, workload
aging buckets, charts/trends, staffing/forecasting support, and server-side analytics views or RPCs
only if active-row frontend aggregation becomes insufficient.

### Completed Operational Dashboard Polish Foundation

Operational Dashboard Slices 10K1 through 10K11 complete the current Staff/default operational
dashboard polish foundation in `docs/OPERATIONAL_DASHBOARD_POLISH_STRATEGY.md`.

The locked foundation is:

- unified `Operations Dashboard` header;
- compact current company, work-view, and active-order context from existing dashboard/app context;
- setup/readiness separated as a read-only `Setup Guidance` prompt;
- Calendar remains first as the primary operational context;
- Orders remains the primary work surface;
- deterministic Status rail remains simple and derived from already loaded dashboard rows;
- KPI cards, workload visibility, and read-only operational readiness live in secondary
  `Operational Support`;
- no fake analytics, fake KPIs, predictive scoring, hidden priority model, or unsupported pressure
  language.

Guardrails:

- no backend changes;
- no new queries;
- no analytics redesign;
- no dashboard authority changes;
- no product-mode authority;
- no hidden mutation behavior;
- no cross-company aggregates;
- no dashboard-level mutation controls outside existing table/drawer smart-action paths;
- existing `DashboardGate`, route guards, permissions, order projections, calendar panel, Orders
  table, and canonical workflow paths remain authoritative.

Deferred dashboard work:

- richer owner analytics/reporting page;
- true server-side analytics if needed;
- configurable dashboard widgets;
- dashboard personalization;
- mode-specific dashboards later;
- calendar scheduling intelligence later;
- workload trends, aging buckets, staffing/forecasting, review-cycle analytics, and exports;
- production/deployment verification remains separate from dashboard polish.

### Planned Orders Workspace Polish

Orders Workspace Polish Slice 1A creates the governed strategy in
`docs/ORDERS_WORKSPACE_POLISH_STRATEGY.md`.

The planned purpose is to make the active Orders page feel like Falcon's primary operational
inventory now that the dashboard polish foundation is locked. The current foundation already has
the active Orders page, explicit Historical Orders secondary surface, URL-backed filters, active
filter chips, Saved Views, deterministic queue filtering, reviewer/appraiser/client/status/due
filters, `UnifiedOrdersTable`, governed Smart Actions, lifecycle actions kept out of the table, and
archived/cancelled/voided rows excluded by default.

Recommended first implementation:

- frontend-only header/filter layout polish;
- preserve all current data/query/action behavior;
- no table column redesign yet;
- clarify active versus historical orders;
- improve saved-view and active-filter-chip placement;
- add table support copy and empty-state polish from existing filter state only;
- improve mobile stacking without changing filter semantics.

Guardrails:

- no backend changes;
- no query behavior changes;
- no new filters unless separately designed;
- no historical leakage into active lists;
- no lifecycle actions in the table;
- no mutation behavior changes;
- no Smart Actions behavior changes;
- no saved view behavior changes;
- archived/cancelled/voided records stay out of active Orders by default.

Deferred Orders workspace work remains table column density redesign, bulk actions, advanced saved
views, owner analytics/reporting, historical admin search, server-side queue filtering,
configurable table views, shared/team saved views, and table personalization.

### Planned Standalone Calendar Workspace Polish

Standalone Calendar Workspace Polish Slice 1A creates the governed strategy in
`docs/CALENDAR_WORKSPACE_POLISH_STRATEGY.md`.

The planned purpose is to make `/calendar` feel like a true scheduling and coordination workspace
now that the operational dashboard and Orders workspace polish foundations are locked. The current
foundation already has active-order-derived calendar data, role-scoped loading from
`v_orders_active_frontend_v4`, two-week and month views, Lens filtering, weekend visibility,
selected-day support rail, grouped Site / Review / Final event context, and order navigation from
calendar events.

Recommended first implementation:

- frontend-only route-shell and control layout polish;
- preserve all current data/query/event/filter behavior;
- keep Calendar as a scheduling workspace, not an analytics surface;
- clarify dashboard versus standalone calendar hierarchy;
- improve header, context row, filter grouping, legend/rail placement, loading/error states, and
  mobile stacking;
- avoid new views, lenses, data sources, scheduling mutations, or workflow behavior.

Guardrails:

- no backend changes;
- no Supabase changes;
- no query semantics changes;
- no new calendar data source;
- no scheduling mutation, drag/drop, workflow, lifecycle, or permission behavior changes;
- no archived/cancelled/voided leakage into active calendar surfaces;
- no fake analytics, fake KPIs, predictive scoring, unsupported risk language, or cross-company
  aggregates.

Deferred Calendar workspace work remains shared dashboard/standalone calendar shell extraction,
backend calendar event source unification, company timezone/working-hours policy, calendar saved
views, standalone week/day parity, drag/drop scheduling, appointment rescheduling permissions,
conflict detection, workload/capacity modeling, predictive scheduling risk, unassigned/at-risk
lenses, external calendar sync, and calendar-specific production smoke.

Calendar Workspace Polish Slice 1B is now complete as the first frontend-only route-shell polish.
`/calendar` renders a `Calendar Workspace` header, compact company/work-view/loaded-order context,
a `Scheduling Controls` section around the existing view/range/weekend/Lens controls, a read-only
current-view summary, supporting legend placement, and calmer loading/error states. The existing
active-order read path, role-scoped filtering, event normalization, Lens filtering, selected-day
behavior, event click behavior, Order Detail navigation, shared dashboard calendar behavior,
permissions, workflow/lifecycle behavior, and scheduling semantics are preserved.

Calendar Workspace Polish Slice 1C is now complete as frontend-only calendar body and selected-day
rail polish. `/calendar` now frames the primary calendar grid as `Schedule Board`, adds view-derived
support copy and a board mode badge, protects the calendar grid with small-screen horizontal
overflow, and refines the selected-day rail with `Selected Day` hierarchy, total badge, accessible
event counts, a calm no-events state, and accessible order-opening labels. Shared dashboard
calendar components, event/query semantics, role scoping, date selection, order navigation,
workflow/lifecycle behavior, permissions, scheduling mutations, backend behavior, and Supabase
behavior are unchanged.

Calendar Workspace Polish Slice 1D closes the first standalone Calendar Workspace polish
foundation. The locked foundation includes `Calendar Workspace` header hierarchy, compact
company/work-view/active-order context, grouped `Scheduling Controls`, current view/Lens/selected
day summary, `Schedule Board` body framing, selected-day rail hierarchy, accessible count/region
labels, calmer loading/error/empty states, and responsive grid/rail stacking. Guardrails remain no
backend changes, no Supabase changes, no event/query semantics changes, no scheduling mutations, no
permission/workflow/lifecycle changes, no shared dashboard behavior changes, no fake analytics, no
predictive scoring, no new calendar features, and no active-calendar leakage of archived/cancelled/
voided records.

### Planned Clients Workspace Polish

Clients Workspace Polish Slice 1A creates the governed strategy in
`docs/CLIENTS_WORKSPACE_POLISH_STRATEGY.md`.

The planned purpose is to make the standalone Clients workspace feel like an operational
relationship workspace now that Dashboard, Orders, and Calendar first-pass polish foundations are
locked. The current foundation already has `/clients` for full client readers, `/clients/cards` for
assigned-client routing, guarded client create/edit/detail routes, RPC-backed client management
list/detail/create/update wrappers, category/search/sort controls, client cards, and related order
readback on Client Detail.

Recommended first implementation:

- frontend-only `ClientsIndex` header/control layout polish;
- preserve all current client data/query/action behavior;
- keep Clients as internal relationship management, not a Client Portal or CRM expansion;
- clarify full versus assigned client work-view context where possible from existing state;
- improve search/category/sort grouping, loading/error/empty states, and mobile stacking;
- avoid detail-page redesign, new filters, saved views, relationship model work, or data-model
  changes in the first runtime pass.

Guardrails:

- no backend changes;
- no Supabase changes;
- no query behavior changes;
- no client data model changes;
- no relationship/company-scoping changes;
- no permission/workflow/lifecycle changes;
- no order visibility changes from client surfaces;
- no fake analytics, predictive scoring, CRM pipeline, Client Portal activation, or new mutation
  paths.

Deferred Clients workspace work remains client detail layout polish, form shell polish, card/table
view redesign, URL-backed client filters, saved client views, client duplicate/canonicalization
model, company-scoped contacts model, client archive/restore doctrine, client relationship graph
expansion, Client Portal surfaces, client analytics/reporting, server-side search/pagination,
CRM segmentation/scoring, bulk actions, and imports/exports.

Clients Workspace Polish Slice 1B is complete as the first frontend-only runtime polish pass.
`ClientsIndex` now has a `Clients Workspace` relationship-management header, compact read-only
context, grouped `Relationship Controls`, a clearer `Client Directory` body, and calmer loading/
error/empty states. Tests cover the hierarchy, create-link permission visibility, preserved
search/category/sort arguments, normalized card data, and empty state. The slice changed no backend
behavior, Supabase behavior, routes, permissions, RLS/RPCs, client model/API/RPC behavior, query
semantics, relationship/company-scoping behavior, order visibility, workflow/lifecycle behavior,
Client Portal behavior, CRM expansion, fake analytics, predictive scoring, card navigation, or
mutation paths.

Clients Workspace Polish Slice 1C is complete as frontend-only client card/directory presentation
polish. `ClientCard` now has a cleaner relationship-card hierarchy, compact order count, clearer
contact presentation, read-only metric tiles, category/status badges, and a stronger detail link.
Tests cover identity, contact, metrics, status, detail navigation, phone navigation,
permission-derived helper copy, missing-data placeholders, and absence of new button actions. The
slice changed no backend behavior, Supabase behavior, routes, permissions, company scoping,
RLS/RPCs, client model/API/RPC behavior, query/filter/sort semantics, Client Portal behavior, CRM
feature behavior, new client actions, card navigation, or mutation paths.

Clients Workspace Polish Slice 1D is complete as frontend-only client detail/profile presentation
polish. `ClientDetail` now has a cleaner `Relationship Detail` header, read-only context tiles,
clearer edit/back hierarchy, grouped contact fields, a scoped `Related Orders` section, and
`Visible Order Context` language instead of analytics-heavy KPI framing. The legacy
`ClientProfile` route received a light read-only shell polish. Tests cover the polished detail
hierarchy, existing client-detail wrapper call, existing related-order view/query/scoping behavior,
permission-gated edit form visibility, and absence of edit controls without update permission. The
slice changed no backend behavior, Supabase behavior, routes, permissions, company scoping,
RLS/RPCs, client model/API/RPC behavior, displayed data, query semantics, edit submission behavior,
Client Portal behavior, CRM feature behavior, new actions, new mutations, or order visibility
behavior.

Clients Workspace Polish Slice 1E is complete as the first-pass consistency, accessibility, and
responsive cleanup checkpoint. Client cards and the relationship-card grid now have safer
accessible labels, decorative separators are hidden from assistive technology, Client Detail
normalizes `AMC` category copy and uses clearer `Active orders` context labeling, and the legacy
Client Profile order history grid has horizontal overflow protection for small screens. The first
Clients Workspace polish foundation is now locked across strategy, workspace header/control
hierarchy, card/directory presentation, detail/profile presentation, and consistency/accessibility/
responsive cleanup. No backend behavior, Supabase behavior, routes, permissions, company scoping,
RLS/RPCs, client model/API/RPC behavior, displayed data, query/filter/sort semantics, edit
submission behavior, Client Portal behavior, CRM feature behavior, new actions, new mutations,
order visibility behavior, fake analytics, or predictive scoring changed.

### Planned Assignments Workspace Polish

Assignments Workspace Polish Slice 1A creates the governed strategy in
`docs/ASSIGNMENTS_WORKSPACE_POLISH_STRATEGY.md`.

The planned purpose is to make the standalone `/assignments` workspace feel like a clear packet
coordination surface now that Dashboard, Orders, Calendar, and Clients first-pass polish
foundations are locked. The current foundation already has `/assignments` and
`/assignments/:assignmentId` routes guarded by assignment packet read permissions, assigned-company
and owner-company lanes, assignment status filters, packet detail resolution without canonical
order fallback, backend-owned `rpc_order_company_assignment_*` lifecycle wrappers,
assignment-scoped activity, assignment dashboard widgets, and owner-side Order Detail assignment
panels.

Recommended first implementation:

- frontend-only shell polish for `AssignmentsPage` and lane headers;
- preserve all current assignment list/detail/action behavior;
- frame the workspace as packet coordination, not canonical order operations or dispatch;
- clarify received work versus sent assignments;
- add compact read-only context from existing lane availability only;
- improve status/filter/control grouping, loading/error/empty states, and mobile wrapping;
- avoid packet detail redesign until the list shell hierarchy is stable.

Guardrails:

- no backend changes;
- no Supabase changes;
- no assignment query semantics changes;
- no assignment workflow or state-machine changes;
- no permission or company-scoping changes;
- no Smart Action behavior changes;
- no canonical order/client/relationship visibility broadening;
- no staffing, dispatch, auto-routing, vendor scoring, ranking, capacity, fake analytics,
  predictive scoring, or queue semantic changes;
- no new assignment lifecycle actions, bulk actions, direct table writes, or frontend-authored
  assignment activity/notification fanout;
- no Vendor Portal or Client Portal product shell activation.

Deferred Assignments workspace work remains packet detail hierarchy polish, assignment activity
timeline readability, assignment JSON section readability, saved assignment views, assignment
history/admin readback, assignment search/pagination, packet messaging, server-side assignment
analytics if needed, staffing/dispatch recommendations, vendor eligibility/scoring, capacity
forecasting, Vendor Portal activation, and AMC-native assignment queue command-center behavior.

Assignments Workspace Polish Slice 1B is complete as the first frontend-only runtime polish pass.
`AssignmentsPage` now frames `/assignments` as `Assignments Workspace` under `Packet Coordination`,
adds compact read-only context for visible work lanes, packet-scoped access, and packet-only
navigation, and preserves the existing permission gate. The assigned-company lane is now presented
as `Received Work`; the owner-company lane is now presented as `Sent Assignments`; both lanes have
clearer packet-scope support copy, polished header spacing, labeled status filters, and calmer
loading/empty copy. Tests cover the hierarchy, lane labels, preserved list RPC calls, preserved
status filter arguments, packet navigation links, and denied access state. The slice changed no
backend behavior, Supabase behavior, routes, permissions, company scoping, RLS/RPCs, assignment
query semantics, assignment workflow/state-machine behavior, Smart Actions, staffing/dispatch
logic, queue semantics, canonical order/client/relationship visibility, fake analytics, predictive
scoring, dashboard assignment behavior, Order Detail assignment behavior, or mutation paths.

Assignments Workspace Polish Slice 1C is complete as frontend-only packet card/list presentation
polish. Received Work rows now have clearer `Received Packet` hierarchy, order-number identity,
status/attention badges, labeled owner/type/location metadata, instruction preview treatment,
due/expiration dates, and an explicit `Open packet` affordance. Sent Assignments rows now have
clearer `Sent Packet` hierarchy, assigned-company identity, status/attention badges, labeled
type/relationship metadata, instruction preview treatment, due/updated dates, and the same explicit
packet-opening affordance. Tests cover the card labels, accessible packet links, displayed
metadata, instruction previews, and unchanged list/filter RPC behavior. The slice changed no
backend behavior, Supabase behavior, routes, permissions, company scoping, RLS/RPCs, assignment
query semantics, assignment workflow/state-machine behavior, Smart Actions, staffing/dispatch
logic, queue semantics, canonical order/client/relationship visibility, fake analytics, predictive
scoring, new packet actions, dashboard assignment behavior, Order Detail assignment behavior, or
mutation paths.

Assignments Workspace Polish Slice 1D is complete as frontend-only packet detail presentation
polish. `AssignmentPrimitives` now provides a shared `PacketHeader`, wraps field grids as
`Packet Context`, and provides a shared instruction display treatment. `AssignedOfferPacket`,
`AssignedWorkPacket`, and `OwnerAssignmentPacket` now use the same packet detail hierarchy for
eyebrow, title, subtitle, status, packet meta chips, and action placement. Owner packet `Open
Order` remains an owner-side secondary action with a descriptive accessible label, and the detail
back link now reads `Back to Assignments Workspace`. Tests cover assigned offer hierarchy, assigned
work hierarchy, owner order navigation, packet context rendering, instruction rendering, and
activity timeline preservation. The slice changed no backend behavior, Supabase behavior, routes,
permissions, company scoping, RLS/RPCs, packet resolution order, assignment query semantics,
assignment workflow/state-machine behavior, Smart Actions, staffing/dispatch logic, queue
semantics, canonical order/client/relationship visibility, fake analytics, predictive scoring, new
packet actions, dashboard assignment behavior, Order Detail assignment behavior, or mutation paths.

Assignments Workspace Polish Slice 1E is complete as the first-pass consistency, accessibility, and
responsive cleanup checkpoint. Received Work and Sent Assignments lane sections now expose
accessible region labels, shared packet detail headers expose accessible detail-region labels, and
packet action areas expose an accessible `Packet actions` region label. Tests lock the lane region
labels plus packet detail/action labels. The first Assignments Workspace polish foundation is now
locked across strategy, packet-coordination shell hierarchy, Received Work and Sent Assignments
lane polish, packet card/list presentation, packet detail header/context/instruction presentation,
and consistency/accessibility cleanup. No backend behavior, Supabase behavior, routes, permissions,
company scoping, RLS/RPCs, packet resolution order, assignment query semantics, assignment
workflow/state-machine behavior, Smart Actions, staffing/dispatch logic, queue semantics,
canonical order/client/relationship visibility, fake analytics, predictive scoring, new packet
actions, dashboard assignment behavior, Order Detail assignment behavior, or mutation paths
changed.

### Completed Falcon Design System Foundation Phase 1A

Falcon Design System Foundation Phase 1A is complete as docs-only codification in
`docs/FALCON_DESIGN_SYSTEM_FOUNDATION.md`.

The foundation records the reusable operational design language now shared by the polished
Dashboard, Orders, Calendar, Clients, and Assignments workspaces:

- workspace-first hierarchy;
- compact workspace headers;
- read-only context strips;
- primary work surfaces before support content;
- section shells and card standards;
- spacing cadence and typography rhythm;
- deterministic color, badge, and action hierarchy;
- control grouping;
- empty/loading/error state tone;
- responsive stacking;
- accessibility expectations;
- soft reactive motion guidance.

The document separates current standards from future implementation phases and deferred
experiments. It does not introduce runtime components, component rewrites, Tailwind/global theme
changes, backend behavior, Supabase behavior, query behavior, permissions, product-mode authority,
feature expansion, dark-mode overhaul, animation library integration, or design-system abstraction
implementation.

Recommended next design-system work, when needed:

- inventory duplicated shell/card/context patterns before extracting any primitive;
- define a Tailwind class recipe map before global token changes;
- extract one passive presentation primitive at a time behind tests;
- keep route, permission, query, data, workflow, lifecycle, and mutation authority unchanged.

### Completed Falcon Design System Foundation Phase 1B

Falcon Design System Foundation Phase 1B is complete as docs-only primitive extraction inventory in
`docs/FALCON_DESIGN_SYSTEM_FOUNDATION.md`.

The inventory finds repeated, now-stable patterns across Dashboard, Orders, Calendar, Clients, and
Assignments:

- workspace headers;
- context strips and context tiles;
- section shells;
- card shells;
- loading, empty, and error state blocks;
- control group wrappers;
- action regions;
- badge/status treatments;
- soft interaction and motion recipes.

Candidates are ranked by safety, reuse value, and implementation risk. The safest first runtime
implementation slice is a passive `StateBlock` / `LoadingState` / `EmptyState` / `ErrorState`
primitive family, migrated into one low-risk surface first and covered with focused presentation
tests. The recommended second slice is a passive `ContextTile` extraction.

Deferred extraction candidates remain `WorkspaceHeader`, `WorkspaceContextStrip`,
`WorkspaceSection`, `ActionButton`, `StatusBadge`, `CardShell`, `SupportRail`, global motion
tokens, Tailwind theme token changes, and whole-page `WorkspaceShell` abstraction.

Phase 1B added no runtime code, component rewrites, Tailwind/global theme changes, backend
behavior, Supabase behavior, query behavior, routes, permissions, workflow/lifecycle/mutation
behavior, visual redesign, or animation library integration.

### Completed Falcon Design System Foundation Phase 1C

Falcon Design System Foundation Phase 1C is complete as the first safe runtime primitive
extraction.

Implemented:

- `src/components/workspace/WorkspaceState.jsx`;
- `WorkspaceState`;
- `WorkspaceLoadingState`;
- `WorkspaceErrorState`;
- `WorkspaceEmptyState`.

Initial migrated surfaces:

- Calendar route loading and error states;
- Clients directory loading, error, and empty states;
- Client Detail loading, error, and not-found states.

The migration preserves existing copy, `role="status"` loading semantics, `role="alert"` error
semantics, non-alerting empty states, visual intent, layout intent, route behavior, query behavior,
permission behavior, data loading behavior, workflow/lifecycle behavior, and mutation behavior.

Assignment packet states remain on `AssignmentState` because they carry packet-specific safety
language and action behavior. Orders table state blocks remain local because table skeleton
loading, queue empty copy, pagination context, and table chrome are more surface-specific.

The next recommended design-system primitive slice is passive context-tile extraction, with layout
wrappers still owned by each workspace and all values caller-derived/read-only.

Phase 1C added no backend behavior, Supabase behavior, query/filter behavior, workflow/lifecycle
behavior, permission behavior, visual redesign, Tailwind/global theme rewrite, motion system,
broad workspace-shell extraction, or large refactor.

### Completed Falcon Design System Foundation Phase 1D

Falcon Design System Foundation Phase 1D is complete as the second safe runtime primitive
extraction.

Implemented:

- `src/components/workspace/WorkspaceContext.jsx`;
- `WorkspaceContextStrip`;
- `WorkspaceContextTile`.

Initial migrated surfaces:

- Calendar workspace header context;
- Clients workspace header context;
- Client Detail header context;
- Assignments workspace context strip and tiles.

The migration preserves existing context labels, values, aria labels, responsive layout ownership,
caller-derived data, and read-only/non-interactive behavior. The primitive owns only label/value
presentation and optional wrapper semantics; it does not compute company, permission, filter,
packet, order, status, count, or query state.

Orders workspace context remains local because it is filter-aware and chip-based. Dashboard header
context remains local because the dark active-count tile needs a separate count-tile or header
extraction design.

The next possible design-system primitive slice is a narrow `WorkspaceSection` wrapper if headings,
ARIA, and layout remain caller-controlled. Workspace headers, action buttons, status badges, card
shells, support rails, motion tokens, Tailwind theme changes, and whole-page workspace shells
remain deferred.

Phase 1D added no backend behavior, Supabase behavior, query/filter behavior, workflow/lifecycle
behavior, permission behavior, visual redesign, Tailwind/global theme rewrite, motion system,
workspace header extraction, interactive filter/control extraction, or broad refactor.

### Completed Falcon Design System Foundation Phase 1E

Falcon Design System Foundation Phase 1E is complete as the third safe runtime primitive
extraction.

Implemented:

- `src/components/workspace/WorkspaceSection.jsx`;
- `WorkspaceSection`;
- `WorkspaceSectionMeta`.

Initial migrated surfaces:

- Calendar `Schedule Board`;
- Clients `Client Directory`;
- Client Detail `Client Contact`;
- Client Detail `Related Orders`;
- Client Detail `Visible Order Context`;
- Client Detail `Relationship Notes`.

The migration preserves existing section titles, support copy, read-only meta text, heading IDs,
`aria-labelledby` relationships, spacing intent, responsive alignment, data sources, forms, tables,
and route behavior. The primitive owns only passive section framing; it does not own controls,
actions, badges, cards, list rendering, table behavior, query state, or mutation state.

Orders table chrome remains local because it is a primary worklist with table-specific density,
filtering, and Smart Action behavior. Dashboard support areas remain local because dashboard
widget/KPI semantics need separate design. Assignment lane wrappers remain local because their
headers contain status filters and refresh actions. Clients `Relationship Controls` remains local
because it combines an action, search, sort, and filter controls.

The next possible design-system primitive slice should stay narrow: either a read-only card shell
for stable non-clickable metric/detail cards or a status/badge inventory before any runtime badge
extraction. Whole-page workspace shells, interactive action regions, Orders table chrome,
assignment packet lanes, global motion tokens, and Tailwind theme changes remain deferred.

Phase 1E added no backend behavior, Supabase behavior, query/filter behavior, workflow/lifecycle
behavior, permission behavior, visual redesign, Tailwind/global theme rewrite, motion system,
card-shell extraction, workspace header extraction, interactive control extraction, or broad
refactor.

### Completed Falcon Interaction And Motion Foundation Phase 1A

Falcon Interaction and Motion Foundation Phase 1A is complete as docs-only codification in
`docs/FALCON_INTERACTION_AND_MOTION_FOUNDATION.md`.

The foundation records:

- Falcon's operational interaction philosophy;
- the current Tailwind-native interaction patterns already present across polished workspaces;
- soft operational responsiveness principles;
- hover, press/release, card elevation, modal/drawer, toast, loading, state-change, section
  expansion/collapse, focus, and reduced-motion standards;
- documentation-level motion token guidance for duration, easing, elevation, opacity, and spatial
  movement;
- safe future implementation categories;
- deferred experimental ideas.

Current standards remain intentionally restrained: motion is feedback rather than decoration,
hover/focus states use small background, border, text, ring, shadow, or tiny translate changes,
loading states are text-first and layout-stable, toasts are short operational acknowledgments, and
motion never creates product authority, data access, lifecycle behavior, workflow behavior, or
analytics meaning.

Future implementation should start with interaction inventory/class recipe cleanup or shared
button/action primitive planning. Animation libraries, spring physics, route transitions,
drag-and-drop scheduling, animated analytics, global theme rewrites, dark-mode motion variants, and
personalized density/motion preferences remain deferred.

Phase 1A added no runtime code, component rewrites, animation library integration,
Tailwind/global theme changes, backend behavior, Supabase behavior, query behavior, permissions,
workflow/lifecycle behavior, feature expansion, branding overhaul, or visual redesign.

### Completed Falcon Interaction And Motion Foundation Phase 1B

Falcon Interaction and Motion Foundation Phase 1B is complete as the first restrained runtime
interaction refinement.

Implemented:

- `src/components/feedback/FalconToaster.jsx`;
- centralized `react-hot-toast` presentation options through `FalconToaster`;
- refined local `ToastProvider` acknowledgment shell in `src/lib/hooks/useToast.jsx`;
- focused tests for global toast options and local provider behavior.

The slice establishes Falcon's first runtime motion cadence through passive acknowledgments only:
soft Tailwind-native entrance motion, `motion-reduce:animate-none`, restrained elevation, compact
spacing, tone-specific borders/accent rail, clearer success/error emphasis, polite status semantics
for passive acknowledgments, and alert semantics for errors.

Existing direct `react-hot-toast` call sites and `useToast()` call sites remain unchanged. Existing
toast message copy, trigger points, mutation flows, stack order, local default `3500ms` dismissal
timing, notification logic, route behavior, query behavior, and workflow/lifecycle behavior are
preserved.

Deferred interaction work remains drawer/modal transitions, card hover token extraction, button
press transforms, global Tailwind motion tokens, route transitions, notification logic rewrites,
toast trigger/message normalization, and any animation library integration.

Phase 1B added no backend behavior, Supabase behavior, query behavior, workflow/lifecycle behavior,
permission behavior, feature expansion, global redesign, heavy motion, playful animation,
notification fanout rewrite, or broad component-system rewrite.

### Completed Falcon Interaction And Motion Foundation Phase 1C

Falcon Interaction and Motion Foundation Phase 1C is complete as a restrained primitive-level
tactile feedback slice.

Implemented:

- shared transition cadence in `WorkspaceContextTile`;
- shared transition cadence in `WorkspaceSection`;
- opt-in `interactive` tactile treatment for context tiles and sections;
- color-transition cadence in `WorkspaceState`;
- focused primitive tests for passive defaults, opt-in interactive classes, reduced-motion handling,
  and state semantics.

The implementation keeps current surfaces passive by default. Hover lift, hover shadow, stronger
border, and focus-within ring treatment are available only when a caller explicitly passes
`interactive`. Current Calendar, Clients, Client Detail, and Assignments usages were not migrated to
interactive treatment, so visible behavior remains stable.

`WorkspaceState` receives only restrained color-transition treatment for mounted state changes. It
does not receive hover, lift, click affordance, or spatial motion.

Deferred interaction work remains `WorkspaceContextStrip` motion, card-shell extraction, shared
button/action press treatment, drawer/modal transitions, global motion tokens, Tailwind theme
changes, and current-surface interactive migrations.

Phase 1C added no backend behavior, Supabase behavior, query behavior, workflow/lifecycle behavior,
permission behavior, feature expansion, global redesign, animation library integration, Tailwind
theme rewrite, heavy motion, playful animation, or broad component-system rewrite.

### Completed Orders Filtering/Search Audit

Operational UX Slice B1 inventories the active Orders filtering/search surface in
`docs/OPERATIONS_FILTERING_AUDIT.md`.

Current fully wired active Orders filters include `status`, `q` search, `clientId`, `appraiserId`,
`reviewerId`, `due=overdue`, page, and page size. `queue` is a frontend-only operational filter
over governed active rows. `priority`, `due=this_week`, and `due=next_week` are partial/
transitional because visible controls or legacy helpers exist without complete current active-table
predicate support in `fetchOrdersWithFilters(...)`.

Recommended first UX improvements are visible active-filter chips, a unified `Clear filters`
affordance, and reconciliation of visible controls with implemented predicates before adding saved
query patterns. The audit makes no runtime change and keeps historical/admin readback flags out of
active Orders defaults.

### Planned Active Filter Visibility Foundation

Operational UX Slice B2 plans the first governed active-filter visibility system for Orders in
`docs/OPERATIONS_FILTERING_AUDIT.md` without runtime changes.

The planned UX is a compact chip/token row above the Orders table, generated only from URL/query
state for active filters such as `status`, `q`, `clientId`, `appraiserId`, `reviewerId`, `due`, and
`queue`. Chips should make operational drill links understandable after landing, including
reviewer workload links like `/orders?status=in_review&reviewerId=<id>` and revision follow-up
links like `/orders?status=needs_revisions&appraiserId=<id>`. Removable chips should clear only
their own query parameter and reset `page` to `0`; an explicit `Clear filters` affordance should
clear active URL-backed filters without introducing saved views.

The guardrails remain active Orders only, no local-only hidden filter state, no historical/admin
leakage into active defaults, no mutation behavior, no workflow/lifecycle/assignment behavior, no
new backend analytics pipeline, and no new RPC/view. Transitional risks to resolve before
implementation are `queue` being frontend-only, `due=this_week` / `due=next_week` being visible but
not fully implemented in the audited active read helper, and `priority` having visible-control
support without current active-table predicate support.

### Completed Active Filter Chip Foundation

Operational UX Slices B3 and B4 implement and close out the first governed Orders active-filter
chip foundation in `docs/OPERATIONS_FILTERING_AUDIT.md`.

The completed foundation renders compact chips from existing URL/query-backed Orders filter state
only. Supported chips are `status`, `q`, `clientId`, `appraiserId`, `reviewerId`, `due`, and
`queue`. Chip removal updates the existing Orders URL/filter state and resets page position through
the current filter-change path. `Clear Filters` resets the supported active filter set while
preserving page size. Queue chips are labeled as derived operational filters, transitional due
values are labeled transitional, and historical/admin opt-in flags plus hidden/internal filters are
not surfaced.

Deferred filter UX work remains reconciling `due=this_week` and `due=next_week`, deciding whether
`priority` should become a governed active filter, adding richer assignee/client chip labels where
safe, and separately designing saved views, filter presets, and historical/admin filter chips.

### Completed Saved Views Foundation

Saved Views Slices 1A through 1H complete the first governed Saved Views foundation in
`docs/SAVED_VIEWS_PLAN.md`.

The completed foundation lets users save and return to common active Orders queues while preserving
the governed Orders URL/query model. It includes backend user/company-scoped persistence in
`public.order_saved_views`, RPC-owned saved-view CRUD, strict backend filter allowlist validation,
frontend RPC wrappers, direct frontend table access source-scan blocking, and a compact secondary
Orders-page `Saved Views` UI.

The active UI supports:

- list saved views;
- apply a saved view through Orders URL/query state only;
- save the current allowlisted filter state as a named view;
- delete a saved view.

Saved payloads are limited to `status`, `q`, `clientId`, `appraiserId`, `reviewerId`, `due`,
`queue`, and `pageSize`. `page`, hidden/internal filters, mutation state, raw query fragments,
unknown keys, and historical/admin flags are excluded or rejected. Unsupported returned filter keys
are rejected without changing current Orders filters.

The locked guardrails are read-only navigation presets only, no bypass of RLS/permissions/current
company scope/active-list exclusions, URL/query state remains canonical, backend validation remains
authoritative, no hidden filters, no localStorage fallback, no order mutation behavior, no activity
write, no notification fanout, and no historical/admin presets.

Deferred saved-view work remains rename/edit, personal default view, team/shared views,
admin/global presets, historical/admin saved views, dashboard-linked saved views, ordering/pinning,
and alerting/subscriptions.

### Completed Operational Timeline Foundation

Operational Timeline Slices 1A through 1F plan, implement, and close out the first governed
Order Detail operational timeline foundation in `docs/OPERATIONAL_TIMELINE_PLAN.md`.

The completed foundation improves the existing Order Detail activity timeline while preserving
audit integrity and backend activity authority. It locks governed category mapping for
`Lifecycle`, `Workflow`, `Assignment`, `Documents`, `Notes`, `System`, and conservative `Unknown`
rows; category chips and category-specific styling; safe event labels and detail snippets; unknown
event preservation; date/day grouping under `Today`, `Yesterday`, and older calendar dates; and
deterministic ordering inside each group.

The locked guardrails are read-only presentation only, existing loaded activity data only, backend
activity remains the source of truth, frontend code only formats/presents activity, no
filters/hiding yet, no raw payload expansion, no timeline actions or mutations, no activity
ownership change, and no backend/API/RPC/view/migration changes.

Deferred timeline work remains event-type filters, richer timeline lanes, a dedicated timeline read
model if needed, printable timeline inclusion, exportable audit trails, and an admin audit console.

### Planned Admin Onboarding / Company Setup UX

Admin Onboarding Slice 1A plans the first governed admin/company onboarding and setup UX
improvements in `docs/ADMIN_ONBOARDING_PLAN.md` without runtime changes.

The planned purpose is to make first-owner setup smoother, make company and user onboarding easier,
reduce manual configuration uncertainty, clarify operational readiness, and keep permission/role
setup safe. The current foundation already includes company-scoped memberships, Team Access,
permissions, owner/admin hierarchy, invitation infrastructure, current company context, and
production/bootstrap onboarding documentation.

Candidate surfaces include a first-login owner checklist, company setup checklist, invite-team flow
polish, missing configuration indicators, role/permission summaries, onboarding progress states,
and operational readiness checks.

The recommended first implementation is a lightweight owner/admin onboarding/readiness checklist
using read-only indicators and links to existing governed surfaces. No guided wizard, multi-step
setup flow, setup automation, permission redesign, or mutation shortcut should be added in the
first pass.

Admin Onboarding Slice 1B narrows that first implementation target to an operational readiness
checklist card. Candidate checks are owner account exists, company profile configured, at least one
appraiser/reviewer/admin added, Team Access reachable, permission seeds verified,
storage/document system configured, order workflow operational, dashboard metrics operational,
Saved Views available, Historical Orders accessible, and Print Packet operational.

The MVP remains read-only and non-blocking: informational and warning/attention states only, no
automated enforcement, no hidden setup actions, no backend onboarding automation, and no permission
changes. Future extensions include onboarding completion percentage, guided setup flows,
role-specific onboarding, client onboarding readiness, and AMC/vendor onboarding readiness.

Admin Onboarding Slices 1C through 1E audit, implement, and close out the first Operational
Readiness card foundation. The completed foundation is an owner/admin-only dashboard card that uses
existing governed read state only and shows current company context, owner/admin access, Team
Access, additional-member state, dashboard KPIs, Historical Orders, Saved Views, and Print Packet
readiness. It is read-only/advisory, keeps unknown and optional states neutral, has no score or
gamified completion state, has no wizard or automation, has no mutation buttons, and adds no
backend, permission, RLS, storage, Edge Function, Supabase, or Vercel changes.

Deferred admin onboarding work remains guided onboarding wizard, company setup checklist
automation, role-specific onboarding, storage/permission/backend validation signals, client/AMC/
vendor onboarding, setup completion tracking, onboarding emails, setup templates, billing, and
subscription setup.

Admin Onboarding Slice 2A plans the next Team Access onboarding/admin UX improvements without
runtime changes. The current foundation already includes company member listing, governed
role/status APIs, invitation RPC/Edge infrastructure, owner/admin hierarchy, permission-based route
access, and the company-scoped membership model. The recommended first implementation is
read-only/status clarity polish: clearer member status chips, active versus invited grouping,
plain-language role summaries, pending-invite next-step copy, owner/admin help text, and safer
empty states. Invite behavior, role editing behavior, permissions, backend APIs/RPCs, and company
scope remain unchanged.

Deferred Team Access onboarding work remains guided invite wizard, role templates, bulk invites,
onboarding email polish, permission diff views, audit trail for access changes, role-specific
onboarding paths, and access review exports.

Admin Onboarding Slices 2B through 2D audit, implement, and close out the first Team Access
readability polish foundation. The locked foundation keeps Team Access on existing governed member
and invitation data, groups active members under `Active Team Members`, groups non-active rows
under `Inactive / Invited Members` when inactive rows are shown, emphasizes Owner/Admin state from
existing safe fields, shows role primary markers separately, adds compact access summaries, improves
empty states, and clarifies Pending Invitations status help/copy. Guardrails remain unchanged: no
permission changes, no role editing behavior changes, no invite flow changes, no hidden escalation,
no frontend-invented permissions, company scope remains authoritative, and existing RPC/Edge paths
remain the only approved member/role/invitation mutation paths.

Deferred Team Access onboarding work after closeout remains guided invite wizard, role templates,
bulk invites, onboarding email polish, permission diff views, audit trail for access changes,
role-specific onboarding paths, access review exports, and deeper setup checklist automation.

Admin Onboarding Slice 3A plans safer invite-flow UX improvements before implementation. The
current invite foundation remains Edge/RPC mediated through Team Access: send and resend use
existing invitation Edge Functions, invitation list/cancel use governed RPCs, acceptance remains
backend-governed, statuses distinguish prepared/sent/auth-failed/accepted/cancelled/expired, and
role assignment uses assignable role presets plus primary-role selection. The recommended first
implementation is read-only/status/help-text polish only: clearer invite status chips, expiration
and sent messaging from existing fields, success confirmation copy that explains access starts only
after acceptance, role/primary-role help text, clearer pending-member messaging, empty-state
onboarding hints, and `what happens next` copy. Invite workflow redesign, automated onboarding
emails, bulk invites, backend/API changes, permission changes, RLS changes, and acceptance behavior
changes remain out of scope.

Deferred invite-flow work remains invite resend flow redesign, invite expiration management,
onboarding email templates, guided onboarding wizard, role templates, bulk/team onboarding, and
invite audit trail UI.

Admin Onboarding Slices 3B through 3D audit, implement, and close out the first invitation
readability polish foundation. The locked foundation keeps invitations on existing governed
invitation/member state, uses clearer invitation status chips, treats sent invitations as awaiting
acceptance, distinguishes invited people from active team members, clarifies that role presets
apply only after acceptance, improves timestamp context labels, adds invite modal guidance, and
uses success messaging that says access starts after recipient acceptance. Guardrails remain
unchanged: no invite workflow changes, no resend behavior changes, no expiration handling changes,
no permission/RLS changes, no hidden activation or escalation, and backend invitation ownership
remains authoritative for list, send, resend, cancel, and acceptance behavior.

Deferred invite-flow work after closeout remains resend flow redesign, expiration management,
onboarding email templates, invite audit trail UI, bulk invites, role templates, guided onboarding
wizard, and any future delivery diagnostics or resend history.

Guardrails require onboarding to respect company scope/RLS, avoid hidden permission escalation,
keep owner/admin authority backend authoritative, keep setup helpers advisory/read-only where
possible, and avoid any mutation shortcut that bypasses RPC/Edge ownership.

## Track 2: Targeted Backend Ownership Migrations

### Purpose

Reduce the highest-value transitional governance seams without reopening broad stabilization work.
These migrations should be small, replacing one frontend-owned side effect at a time.

### Candidate Work Items

- Source-scan hardening for low-level activity/notification helper reachability.
- Backend workflow notification design:
  - `order.sent_to_review`;
  - `order.sent_back_to_appraiser`;
  - `order.review_cleared`;
  - `order.ready_for_client`;
  - `order.completed`;
  - decide `request_final_approval`.
- Backend-owned review/revision note orchestration if atomic notes are required.
- Reviewer assignment notification doctrine.
- Participant assignment RPC unification:
  - appraiser;
  - reviewer;
  - `assigned_to` compatibility retirement.
- Lifecycle notification doctrine for archive/cancel/void.
- Document notification doctrine for upload/archive.
- Generic activity/notification helper quarantine.

### Guardrails

- Backend fanout must replace matching frontend fanout in the same slice.
- Each migration should prove one notification row per intended recipient and no duplicate email
  queue trigger effects.
- Payloads must be safe, minimal, and source-traceable.
- Actor attribution must come from backend app user/company context.
- Do not migrate all side effects at once; work event-family by event-family.
- Do not add new product behavior while changing ownership unless the behavior is explicitly in the
  slice scope.

### Recommended First Slice

Do a narrow source-scan hardening slice before the first backend fanout migration:

- block active imports/usages of low-level activity/notification compatibility helpers where they
  are not explicitly approved;
- keep current approved paths working;
- add tests around the scan behavior.

This reduces regression risk before product work starts creating more read surfaces.

## Track 3: Production Cutover Readiness

### Purpose

Prepare Falcon for broader customer rollout by validating the modern company-scoped architecture,
data migration posture, deployment safety, and rollback plan.

### Candidate Work Items

- Confirm final production target project, secrets, CORS origins, Edge Function deployment, and
  storage posture.
- Rehearse migration with production-like data:
  - table counts;
  - company row;
  - memberships;
  - order/client ownership;
  - activity/notification ownership;
  - assignment packet isolation.
- Verify Team Access owner invariants, invite lifecycle, deactivate/reactivate, and role grants.
- Keep Order Documents blocked from legacy production until company-scoped staging/final production
  validates the full storage/RPC flow.
- Define post-cutover smoke checks, monitoring, rollback, and reconciliation rules.
- Preserve the legacy hosted project as archive/source until retention and reconciliation policy is
  explicit.

### Guardrails

- Do not push modern governance migrations directly into legacy production as a first move.
- Do not deploy Order Documents to legacy production.
- Do not promote a temporary staging project as final production without an explicit naming, secret,
  and cutover decision.
- No production mutation without a current backup and rollback path.
- No deleting the legacy project immediately after cutover.

### Recommended First Slice

Completed Production Readiness Slice 1A: run a production readiness checkpoint in
`docs/PRODUCTION_READINESS_AUDIT.md` before making infrastructure or runtime changes.

The audit confirms the current environment posture:

- modern staging Supabase project `voompccpkjfcsmehdoqu` is the reference company-scoped
  validation target;
- legacy hosted project `okwqhkrsjgxrhyisaovc` remains the old non-company production/archive
  source;
- modern features should not be retrofitted into the legacy schema;
- final production should cut over to a clean production project based on the modern staging
  architecture after replay, bootstrap, parity, and smoke validation.

The first recommended production-readiness track is now:

- migration replay/bootstrap checklist;
- environment parity checklist;
- seed/permission verification checklist;
- storage/function deployment checklist.

Current blockers before production cutover are clean final target decision, migration replay/dry-run
confidence, production-data count reconciliation, auth/user/company/membership/role mapping,
permission/grant/RLS verification, private storage/document function smoke tests, and restorable
backup/recovery posture.

### Falcon Role-Centric Operational Shell Architecture Phase 1A

Completed docs-first role-centric operational shell architecture in
`docs/FALCON_ROLE_CENTRIC_OPERATIONAL_SHELL_ARCHITECTURE.md`.

Phase 1A defines Falcon's next major product direction: a single governed platform with multiple
role-native operational shells. The plan keeps permission authority, route guards, RLS/RPCs, object
visibility, workflow actions, and backend contracts separate from UX visibility and shell
prioritization.

Primary personas documented:

- Owner/Admin;
- Staff Appraiser;
- Reviewer;
- Assignment/Vendor Recipient;
- future Client Portal user at high level only.

For each persona, the plan records primary goals, daily workflow, stress points, operational
priorities, information needed, information to hide/de-emphasize, preferred terminology, action
hierarchy, dashboard/workspace priority, ideal shell/navigation structure, alerting style,
onboarding expectations, and owner visibility/control expectations.

Key doctrine:

- roles and permissions remain authority; shell visibility is presentation and prioritization;
- Falcon should not feel like one large admin panel with hidden menu items;
- `packet` remains useful internally and for assignment-scoped owner/admin contexts, but should not
  become universal user-facing language;
- assignment/vendor recipients should see work-native language such as `Received Work`, `Work
  Request`, `Offer`, and `Assignment`;
- future Client Portal users should see request/status/document/report language, not internal
  order, review, assignment, or packet mechanics;
- owner/admin visibility must not become owner/admin alert overload.

No runtime behavior, route/permission behavior, shell implementation, backend/Supabase/query/
workflow behavior, role-authority model, dashboard rewrite, Client Portal implementation, branding,
or production data changed.

Recommended next role-centric slice:

- **Falcon Role-Centric Operational Shell Architecture Phase 1B: Current Shell And Navigation Role
  Audit**.

### Falcon Role-Centric Operational Shell Architecture Phase 1B

Completed docs-only current shell and navigation role audit in
`docs/FALCON_ROLE_CENTRIC_OPERATIONAL_SHELL_ARCHITECTURE.md`.

Phase 1B inspected active route guards, current navigation registry, primary nav resolver, command
palette registry/resolver, dashboard resolution, dashboard pages, workspace headings, assignment
states, and role wrapper pages. It produced a role gap matrix for:

- Owner/Admin;
- Staff Appraiser;
- Reviewer;
- Assignment/Vendor Recipient;
- future Client Portal.

Key audit findings:

- current authority foundations are strong: route guards, permission-based dashboard resolution,
  and assignment-only dashboard separation are already in place;
- the current shell is still mostly surface-centric: Dashboard, Orders, Calendar, Clients,
  Assignments, Users, and Settings;
- Owner/Admin is closest to the current broad shell, but daily operations and administrative setup
  still need clearer separation;
- Appraiser and Reviewer need role-native workbench planning before any dashboard rewrite;
- Assignment/Vendor Recipient has the strongest current authority isolation, but recipient-facing
  copy still overuses `packet`;
- future Client Portal remains unimplemented and must not reuse the internal Clients workspace as a
  trimmed portal;
- `Users` should trend toward `Team Access` in owner/admin-facing shell language;
- command palette labels should evolve from generic `Go to...` commands toward role-native
  operational actions.

No runtime behavior, route/permission behavior, navigation, dashboard, command palette behavior,
backend/Supabase/query/workflow behavior, role-authority model, shell implementation, Client
Portal implementation, branding, or production data changed.

Recommended next role-centric slice:

- **Falcon Role-Centric Operational Shell Architecture Phase 1C: Shell Profile And Navigation
  Vocabulary Plan**.

### Falcon Role-Centric Operational Shell Architecture Phase 1C

Completed docs-only shell profile and navigation vocabulary planning in
`docs/FALCON_ROLE_CENTRIC_OPERATIONAL_SHELL_ARCHITECTURE.md`.

Phase 1C defines future shell vocabulary, role-native navigation framing, dashboard/workbench
naming, quick-action wording, command palette direction, empty-state tone, notification tone,
information-density guidance, and mobile-execution implications before any runtime shell work.

Preferred future shell frames:

- Owner/Admin: `Operations Shell`, with `Operations Dashboard`, `Active Orders`, `Review Queue`,
  `Sent Assignments`, `Team Access`, and `Owner Setup`;
- Staff Appraiser: `My Work Shell`, with `My Work`, `My Assigned Orders`, `Needs Revisions`, `Due
  Soon`, `Site Visits`, `Report Work`, `Files`, and `Notes`;
- Reviewer: `Review Workbench Shell`, with `Review Queue`, `In Review`, `Submitted Work`, `Needs
  Revisions`, `Revision History`, and `Review Notes`;
- Assignment/Vendor Recipient: `Received Work Shell`, with `Received Work`, `Work Requests`,
  `Offers`, `Active Work`, `Submitted Work`, `Owner Review`, and `Completed Work`;
- Future Client Portal: `Client Requests Shell`, with `Requests`, `Action Needed`, `Documents`,
  `Reports`, `Messages`, and `Completed Requests`.

Key terminology decisions:

- `Orders` remains appropriate for owner/admin and broad internal order inventory, but should not
  be Falcon's universal first-screen noun;
- `My Work` should frame assigned internal appraiser execution;
- `Review Queue` should frame reviewer decision work;
- assignment/vendor recipient surfaces should lead with `Received Work`, `Work Request`, `Offer`,
  `Active Work`, and `Submit Work`;
- `packet` remains valid internally and in selective owner/admin assignment-scoped contexts, but
  should not be the primary recipient-facing noun;
- future Client Portal language must stay request/status/document/report native and must not reuse
  internal Clients Workspace, Orders, Review Queue, vendor assignment, or packet language.

Phase 1C also records that command palette labels should move from generic `Go to...` destinations
toward role-native commands such as `Open My Work`, `Open Review Queue`, `Open Received Work`,
`Open Offers`, `Open Team Access`, and `Open Action Needed`.

No runtime behavior, route/permission behavior, navigation implementation, dashboard rewrite,
command palette behavior, backend/Supabase/query/workflow behavior, role-authority model, shell
switching, Client Portal implementation, branding, or production data changed.

Recommended next role-centric slice:

- **Falcon Role-Centric Operational Shell Architecture Phase 1D: Shell Resolution And Migration
  Slice Plan**.

### Falcon Role-Centric Operational Shell Architecture Phase 1D

Completed docs-only shell resolution and migration slice planning in
`docs/FALCON_ROLE_CENTRIC_OPERATIONAL_SHELL_ARCHITECTURE.md`.

Phase 1D defines how Falcon should migrate from the current broad, surface-centric shell toward
role-native shells without changing runtime behavior yet. It records shell resolution inputs,
profile records, primary-shell selection rules, ambiguous-access fallback behavior, navigation
migration sequencing, dashboard/workbench migration sequencing, terminology migration sequencing,
command palette and quick-action migration sequencing, product-mode/module availability rules, and
the safest first runtime slice.

Key shell resolution decisions:

- shell resolution must run after authentication, current-company resolution, permissions,
  route guards, RLS/RPCs, and object visibility;
- shell profiles choose presentation and priority only, never access authority;
- owner/admin users who also perform appraiser or reviewer production work should default to
  `operations`;
- owner/admin production workers may later switch into `my_work` or `review_queue`, but shell
  switching remains presentation-only and deferred;
- assignment-only users should bypass Operations and default to `received_work`;
- reviewer/appraiser hybrid users should not get a combined workbench by default; use a
  deterministic default and expose the other workbench secondarily;
- users with insufficient or ambiguous access should receive non-leaky fallback states such as
  `unavailable`, `company_required`, `membership_inactive`, `profile_ambiguous`, or
  `module_unavailable`.

Migration order:

- first design and test a pure shell-profile resolver;
- then add passive profile metadata with no UI behavior change;
- then migrate safe labels such as `Users` to `Team Access`, owner setup clarification, and
  recipient-facing packet-density reductions where context is clear;
- then make command metadata and ordering profile-aware;
- then migrate dashboard/workbench headings and empty states;
- only later introduce profile-aware navigation, workbench extraction, owner/admin Operations
  grouping, and optional shell switching.

The safest first runtime slice is **Shell Resolution Phase R1: Pure Resolver And Tests**. R1 should
add a side-effect-free resolver and fixture coverage for owner/admin, appraiser, reviewer,
appraiser/reviewer hybrid, owner/admin plus production work, assignment-only, insufficient access,
and future-client blocked cases. R1 should not connect to live navigation, dashboard rendering,
routes, data queries, command palette, permissions, backend behavior, shell switching, or Client
Portal.

No runtime behavior, route/permission behavior, navigation implementation, dashboard rewrite,
command palette behavior, backend/Supabase/query/workflow behavior, role-authority model, shell
switching, Client Portal implementation, branding, or production data changed.

Recommended next role-centric slice:

- **Falcon Role-Centric Operational Shell Architecture Phase R1: Pure Shell Profile Resolver And
  Test Plan**.

### Falcon Role-Centric Operational Shell Architecture Phase R1

Completed the first runtime foundation for role-centric shells as a pure resolver and focused unit
tests.

Runtime files added:

- `src/lib/shell/resolveShellProfile.js`;
- `src/lib/shell/__tests__/resolveShellProfile.test.js`.

The resolver returns stable presentation profile ids:

- `operations`;
- `my_work`;
- `review_queue`;
- `received_work`;
- `requests`;
- `unavailable`;
- `company_required`;
- `membership_inactive`;
- `profile_ambiguous`;
- `module_unavailable`.

R1 preserves the Phase 1D authority boundary. The resolver accepts plain data only, normalizes
permissions and role labels, and returns presentation metadata with `metadataAuthority:
presentation_only`. It does not grant access, replace permission checks, inspect routes or objects,
call backend services, or connect to live UI.

Focused tests cover no session, missing current company, inactive membership, owner/admin,
owner/admin plus appraiser/reviewer production work, assignment-only, mixed internal order plus
assignment access, appraiser-only, reviewer-only, appraiser/reviewer hybrid default,
appraiser/reviewer hybrid with review work waiting, explicit future requests enablement, disabled
future requests module fallback, explicit profile ambiguity, normalized capabilities, and
deterministic side-effect-free output.

No `DashboardGate` behavior, navigation, routes, permissions, command palette behavior,
backend/Supabase/query/workflow behavior, shell switching, Client Portal implementation, branding,
or production data changed.

Recommended next role-centric slice:

- **Falcon Role-Centric Operational Shell Architecture Phase R2: Passive Shell Profile Metadata
  Audit**.

### Falcon Role-Centric Operational Shell Architecture Phase R2

Completed passive shell profile metadata for every R1 shell profile id.

Runtime files added:

- `src/lib/shell/shellProfiles.js`;
- `src/lib/shell/__tests__/shellProfiles.test.js`.

The metadata registry describes presentation-only shell vocabulary for:

- `operations`;
- `my_work`;
- `review_queue`;
- `received_work`;
- `requests`;
- `unavailable`;
- `company_required`;
- `membership_inactive`;
- `profile_ambiguous`;
- `module_unavailable`.

Each metadata record includes display label, short label, primary daily question, default workspace
label, navigation vocabulary notes, dashboard/workbench title, empty-state tone, notification tone,
preferred action language, status, priority, and `metadataAuthority: presentation_only`.

R2 marks `operations`, `my_work`, `review_queue`, and `received_work` as active profiles,
`requests` as future-only, and the unavailable/company/membership/ambiguous/module states as
fallback profiles. The metadata intentionally contains no route paths, route authority, permission
keys, component hints, query contracts, backend behavior, module enablement behavior, Client Portal
activation, or live UI wiring.

Focused tests cover complete id coverage, stable metadata order, required fields,
presentation-only authority, active profile labels, future requests metadata, fallback metadata,
unknown-profile lookup behavior, frozen entries/nested arrays, and absence of route/permission/
component authority fields.

No `DashboardGate` behavior, navigation, routes, permissions, command palette behavior,
backend/Supabase/query/workflow behavior, shell switching, Client Portal implementation, branding,
or production data changed.

Recommended next role-centric slice:

- **Falcon Role-Centric Operational Shell Architecture Phase R3: Safe Label Migration Plan**.

### Falcon Role-Centric Operational Shell Architecture Phase R3

Completed docs-only safe label migration planning in
`docs/FALCON_ROLE_CENTRIC_OPERATIONAL_SHELL_ARCHITECTURE.md`.

Phase R3 inspected current live label surfaces across the navigation registry, primary TopNav
helper, desktop/mobile TopNav rendering, command palette registry/helper/component, DashboardGate,
current dashboard resolution, DashboardPage headings, AssignmentDashboardPage, Assignments
workspace, assignment primitives/detail/inbox copy, UsersIndex, and OwnerSetup.

The migration matrix classifies current copy by safety level:

- safe before shell wiring;
- conditional before shell wiring;
- wait for shell wiring;
- internal only.

The safest live label migration is `Users` to `Team Access` because `/users` already hosts guarded
Team Access invitation/member management and existing Owner Setup copy already points to `Open
Team Access`. The matching command label can move from `Go to Users` to `Open Team Access`, and
the broad command placeholder can replace `Users` with `Team Access` without changing command
availability, ordering, route paths, route guards, or permissions.

Assignment packet wording should only change before shell wiring in clearly recipient-facing
contexts, such as the received-work lane. Packet precision should remain in route metadata,
safety tests, architecture docs, owner/admin assignment oversight, and developer-facing isolation
notes.

Labels that must wait for live shell-profile consumption include global `Dashboard`,
`Operations Dashboard`, `Orders`, `Assignments`, role-specific command ordering, command search
fallbacks, brand-level shell language, assignment detail packet/action titles, and any future
`Requests` labels before Client Portal authority exists.

No runtime UI copy, navigation, command palette behavior, DashboardGate behavior, routes,
permissions, backend/Supabase/query/workflow behavior, shell switching, Client Portal
implementation, branding, or production data changed.

Recommended next role-centric slice:

- **Falcon Role-Centric Operational Shell Architecture Phase R3A: Team Access Label Alignment**.

### Falcon Role-Centric Operational Shell Architecture Phase R3A

Completed the first safe runtime role-language migration for the existing guarded Team Access
surface.

Runtime files updated:

- `src/lib/navigation/currentNavigationRegistry.js`;
- `src/lib/commandPalette/currentCommandRegistry.js`;
- `src/components/nav/CommandPalette.jsx`.

Focused tests updated:

- `src/lib/navigation/__tests__/currentPrimaryNavLinks.test.js`;
- `src/lib/commandPalette/__tests__/currentCommandPaletteCommands.test.js`;
- `src/components/shell/__tests__/TopNav.test.jsx`;
- `src/components/nav/__tests__/CommandPalette.test.jsx`.

Visible wording changed:

- navigation label `Users` -> `Team Access`;
- command label `Go to Users` -> `Open Team Access`;
- command palette placeholder `Users` -> `Team Access`.

Preserved boundaries:

- `/users` route path;
- `users` route/nav/command ids;
- `users.read` and `navigation.users.view` permission keys;
- route guards, command availability, command ordering, primary nav order, desktop/mobile nav
  behavior, command filtering, keyboard hints, and order-search fallback;
- `UsersIndex` internals and Owner Setup bridge behavior;
- backend/Supabase/query/workflow behavior, RLS/RPCs, shell switching, Client Portal, branding,
  and production data.

No Dashboard, Orders, Assignments, shell heading, role-native dashboard title, assignment packet,
Client Portal, route, permission, backend, Supabase, query, workflow, or shell-profile runtime
logic changed.

Recommended next role-centric slice:

- **Falcon Role-Centric Operational Shell Architecture Phase R3B: Owner Setup And Settings Label
  Alignment**.

### Falcon Role-Centric Operational Shell Architecture Phase R3B

Completed the next safe runtime owner/admin setup and settings terminology alignment.

Runtime files updated:

- `src/lib/navigation/currentNavigationRegistry.js`;
- `src/lib/commandPalette/currentCommandRegistry.js`;
- `src/pages/Settings.jsx`;
- `src/pages/admin/OwnerSetup.jsx`;
- `src/features/dashboard/DashboardPage.jsx`.

Focused tests updated:

- `src/lib/navigation/__tests__/currentNavigationRegistry.test.js`;
- `src/lib/commandPalette/__tests__/currentCommandPaletteCommands.test.js`;
- `src/components/nav/__tests__/CommandPalette.test.jsx`;
- `src/pages/admin/__tests__/OwnerSetup.test.jsx`;
- `src/features/dashboard/__tests__/OwnerSetupDashboardPrompt.test.jsx`.

Visible wording changed:

- `Open Settings` -> `Open Account Settings` in command-facing copy;
- `Notification Settings` -> `Open Notification Settings` in command-facing copy;
- `/settings` page heading `Settings` -> `Account Settings`;
- Owner Setup guidance now emphasizes company setup and operational readiness;
- generic setup labels now use `Company Setup`, `Operational Setup`, `Workspace Defaults`,
  `Workflow Settings`, `Team Access`, `Company Notification Settings`, and `Operational Readiness
  Checklist`;
- the dashboard setup prompt now says `Owner Setup Guidance`, `Review operational setup
  readiness`, and `Review Owner Setup`.

Preserved boundaries:

- `/settings`, `/settings/notifications`, `/settings/owner-setup`, and `/users` route paths;
- existing route/nav/command ids and permission keys;
- settings utility link order, mobile nav placement, command availability, command ordering,
  keyboard hints, filtering, and order-search fallback;
- Owner Setup advisory/read-only setup context behavior and narrow guarded company-profile save
  path;
- DashboardGate behavior, route guards, permissions, backend/Supabase/query/workflow behavior,
  RLS/RPCs, shell switching, Client Portal, branding, and production data.

No Dashboard, Orders, Assignments, workbench heading, My Work, Review Queue, assignment packet,
Client Portal, route, permission, backend, Supabase, query, workflow, or shell-profile runtime
logic changed.

Recommended next role-centric slice:

- **Falcon Role-Centric Operational Shell Architecture Phase R3C: Assignment Recipient Copy Audit
  And Packet Density Reduction**.

### Falcon Role-Centric Operational Shell Architecture Phase R3C

Completed the next safe runtime assignment-recipient copy alignment for clearly received-work and
assigned-company-facing surfaces.

Runtime files updated:

- `src/features/assignments/AssignmentsPage.jsx`;
- `src/features/assignments/AssignedAssignmentInbox.jsx`;
- `src/features/assignments/AssignedOfferPacket.jsx`;
- `src/features/assignments/AssignedWorkPacket.jsx`;
- `src/features/assignments/AssignmentDetail.jsx`;
- `src/features/assignments/AssignmentPrimitives.jsx`;
- `src/features/assignments/components/AssignedWorkDashboard.jsx`;
- `src/features/dashboard/AssignmentDashboardPage.jsx`.

Focused tests updated:

- `src/features/assignments/__tests__/AssignmentsPage.test.jsx`;
- `src/features/assignments/__tests__/AssignmentPacketPresentation.test.jsx`.

Visible wording changed:

- received-work lane copy now says `Work requests assigned to your company`, `Work Request`,
  `Open work request`, and `received work`;
- assigned-only workspace context now says `Assignment-scoped` and `Open received work only`;
- assigned offer detail now says `Work Request`, `Work Request Actions`, and `Work Request
  Details`;
- assigned active-work detail now says `Active Work`, `Assignment Actions`, and `Assignment
  Details`;
- assignment recipient dashboard rows now say `Open Assignment` and `Received assignment work`;
- generic recipient-facing assignment loading, unavailable, terminal, and error support copy now
  avoids unnecessary `packet` wording.

Preserved boundaries:

- `/assignments` and `/assignments/:assignmentId` route paths;
- assignment route ids, component/file/internal names, permission keys, route guards, list/detail
  API calls, packet resolution order, lifecycle actions, and dashboard data sources;
- owner/admin sent-assignment and order assignment panel packet language;
- owner assignment detail labels such as `Owner Packet`, `Packet Actions`, and `Packet Context`;
- internal architecture, diagnostics, tests, and docs that use packet language to explain scoped
  assignment visibility;
- command and navigation structure/order, DashboardGate behavior, backend/Supabase/query/workflow
  behavior, RLS/RPCs, shell switching, profile-aware runtime logic, Client Portal, branding, and
  production data.

No global `Assignments` navigation/command label, Dashboard, Orders, My Work, Review Queue,
shell-level workbench heading, route, permission, backend, Supabase, query, workflow, or Client
Portal behavior changed.

Recommended next role-centric slice:

- **Falcon Role-Centric Operational Shell Architecture Phase R4: Passive Shell Profile Exposure**.

### Falcon Role-Centric Operational Shell Architecture Phase R4

Completed the first passive runtime shell profile exposure layer.

Runtime files added:

- `src/lib/shell/shellProfileExposure.js`;
- `src/lib/shell/useShellProfile.js`.

Focused tests added:

- `src/lib/shell/__tests__/shellProfileExposure.test.js`;
- `src/lib/shell/__tests__/useShellProfile.test.jsx`.

R4 exposes shell profile information without using it to alter live behavior:

- `buildShellProfileInput(...)` maps existing session/current-user context/permission state into
  the R1 resolver input shape;
- `resolveShellProfileExposure(...)` returns the resolved profile id, metadata, resolution reason,
  resolver output, capabilities, and `metadataAuthority: presentation_only`;
- `getShellProfileExposure(...)` provides a pure helper for diagnostics and tests;
- `useShellProfile(...)` observes the existing session, current-user app context, and effective
  permission hooks and returns the same passive metadata plus loading/error state.

Preserved boundaries:

- no route/path changes;
- no permission or route guard changes;
- no backend/Supabase/query/workflow/RLS/RPC changes;
- no DashboardGate decision changes;
- no navigation filtering, grouping, ordering, or label changes;
- no command palette ordering, search, route, or fallback behavior changes;
- no dashboard/workbench heading changes;
- no assignment lifecycle, packet resolution, or object visibility changes;
- no shell switching, product-mode authority change, Client Portal implementation, branding, or
  production data change.

Recommended next role-centric slice:

- **Falcon Role-Centric Operational Shell Architecture Phase R5: DashboardGate Presentation
  Readiness Plan**.

### Falcon Role-Centric Operational Shell Architecture Phase R5

Completed docs-only DashboardGate presentation readiness planning for passive shell profile
exposure.

R5 inspected current dashboard behavior in:

- `src/features/dashboard/DashboardGate.jsx`;
- `src/lib/dashboard/currentDashboardResolution.js`;
- `src/features/dashboard/DashboardPage.jsx`;
- `src/features/dashboard/AssignmentDashboardPage.jsx`;
- `src/features/assignments/components/AssignedWorkDashboard.jsx`;
- `src/features/assignments/components/OwnerSentAssignmentsDashboard.jsx`;
- `src/pages/appraisers/AppraiserDashboard.jsx`;
- `src/pages/reviewers/ReviewerDashboard.jsx`;
- `src/features/dashboard/__tests__/DashboardGate.test.jsx`.

Current findings:

- `DashboardGate` remains permission-derived through `useEffectivePermissions()` and
  `resolveCurrentDashboard(...)`;
- current precedence is loading, order dashboard, assignment dashboard, then unavailable fallback;
- order-capable and mixed order/assignment users render `DashboardPage`;
- assignment-only users render `AssignmentDashboardPage`;
- appraiser and reviewer route wrappers still render the shared `DashboardPage`;
- assignment dashboard widgets preserve assignment-native data paths and no order dashboard
  fallback.

R5 plan:

- `DashboardGate` should remain the dashboard selector;
- shell profile exposure may later be observed only after or alongside current dashboard
  resolution;
- the first runtime use should pass shell metadata downward as optional presentation metadata to
  the already selected dashboard component;
- shell profile id must not decide whether a user receives `DashboardPage`,
  `AssignmentDashboardPage`, or the unavailable fallback.

Safe later presentation-only uses:

- dashboard heading support copy;
- subheading/support copy;
- empty-state tone;
- unavailable-state tone;
- `Work View` context chip wording;
- role-native intro copy;
- assignment dashboard eyebrow/title/subtitle copy after the assignment branch is already selected.

Unsafe changes that must wait:

- selecting different dashboard components from shell profile id;
- replacing dashboard resolution authority with shell profile resolution;
- route redirects or route guard changes;
- navigation filtering/grouping;
- command palette ordering/search/fallback changes;
- dashboard query/RPC/data-source changes;
- workflow/action availability changes;
- shell switching;
- Client Portal dashboard behavior;
- product-mode/module authority.

Recommended first runtime slice:

- **R5A DashboardGate Passive Shell Metadata Prop**.

R5A should import `useShellProfile()` in `DashboardGate`, call it only as a passive observer, keep
the existing `resolveCurrentDashboard(...)` inputs and branch order, pass shell exposure metadata
as an optional prop to the already selected dashboard component, and add tests proving order,
assignment-only, mixed, loading, and unavailable branches are unchanged. R5A should not change
rendered copy, branch selection, routes, permissions, data hooks, queries, workflow behavior,
navigation, command palette behavior, shell switching, or Client Portal implementation.

Preserved boundaries:

- no runtime code changed in R5;
- no hook wiring;
- no DashboardGate change;
- no route/path change;
- no permission or route guard change;
- no backend/Supabase/query/workflow/RLS/RPC change;
- no navigation or command palette change;
- no dashboard rewrite;
- no shell switcher;
- no Client Portal implementation.

### Falcon Role-Centric Operational Shell Architecture Phase R5A

Completed the first passive runtime connection between shell profile exposure and dashboard
presentation metadata.

R5A updated:

- `src/features/dashboard/DashboardGate.jsx`;
- `src/features/dashboard/DashboardPage.jsx`;
- `src/features/dashboard/AssignmentDashboardPage.jsx`;
- `src/features/dashboard/__tests__/DashboardGate.test.jsx`.

R5A behavior:

- `DashboardGate` now observes `useShellProfile()` as passive presentation metadata;
- the existing `resolveCurrentDashboard(...)` inputs remain loading, error, and permission keys;
- the existing branch order remains loading, order dashboard, assignment dashboard, and
  unavailable fallback;
- the selected `DashboardPage` or `AssignmentDashboardPage` receives the optional
  `shellProfilePresentation` prop;
- both dashboard components accept and ignore the prop.

R5A deliberately does not pass shell metadata to loading or unavailable fallback states and does
not change any visible dashboard copy.

Focused tests prove:

- order-capable users still render the existing order dashboard;
- assignment-only users still render the existing assignment dashboard;
- mixed order/assignment users still prioritize the order dashboard;
- loading and unavailable fallback behavior remain unchanged;
- mismatched shell profile ids cannot select a different dashboard branch;
- shell metadata reaches only the already selected dashboard component as inert presentation data.

Preserved boundaries:

- no route/path change;
- no permission or route guard change;
- no `resolveCurrentDashboard(...)` behavior change;
- no dashboard heading, subtitle, support copy, or empty-state copy change;
- no dashboard data hook, query, RPC, assignment widget, or object visibility change;
- no backend/Supabase/query/workflow/RLS/RPC change;
- no navigation or command palette change;
- no shell switching, product-mode authority change, Client Portal implementation, branding, or
  production data change.

### Falcon Role-Centric Operational Shell Architecture Phase R6A

Completed the first visible shell-aware dashboard presentation change in the isolated assignment
dashboard branch.

R6A updated:

- `src/features/dashboard/AssignmentDashboardPage.jsx`;
- `src/features/dashboard/__tests__/AssignmentDashboardPage.test.jsx`.

R6A behavior:

- `AssignmentDashboardPage` reads `shellProfilePresentation` only for presentation copy;
- when the passive shell profile is `received_work`, the dashboard heading is `Received Work`;
- received-work support copy focuses on assigned work requests, due dates, assignment status, and
  owner review after submission;
- received-work dashboard copy avoids universal `packet` terminology;
- non-received assignment dashboard contexts keep the existing `Assignment Dashboard` frame.

Focused tests prove:

- received-work shell presentation renders the new heading and support copy;
- received-work dashboard support copy does not introduce packet wording;
- generic non-received assignment presentation is unchanged;
- assigned-work and owner-sent assignment widgets still render from the same permission checks;
- loading behavior remains unchanged;
- `DashboardGate` tests still prove assignment-only, order-capable, mixed, loading, and fallback
  dashboard selection remains permission-derived and unchanged.

Preserved boundaries:

- no `DashboardGate` branch selection change;
- no route/path change;
- no permission or route guard change;
- no dashboard data hook, query, RPC, assignment widget, or object visibility change;
- no assignment list/detail/workflow/lifecycle behavior change;
- no order-capable dashboard change;
- no backend/Supabase/query/workflow/RLS/RPC change;
- no navigation or command palette change;
- no shell switching, product-mode authority change, Client Portal implementation, branding, or
  production data change.

Recommended next role-centric slice:

- **Falcon Role-Centric Operational Shell Architecture Phase R6B: Owner/Admin Operations Dashboard
  Presentation**.

### Falcon Role-Centric Operational Shell Architecture Phase R6B

Completed shell-aware presentation copy for the owner/admin order-capable dashboard.

R6B updated:

- `src/features/dashboard/DashboardPage.jsx`;
- `src/features/dashboard/__tests__/DashboardPage.test.jsx`.

R6B behavior:

- `DashboardPage` reads `shellProfilePresentation` only for presentation copy;
- when the passive shell profile is `operations`, the dashboard keeps the `Operations Dashboard`
  heading;
- operations support copy now says `Track active work, review handoffs, due pressure, and
  operational readiness.`;
- non-operations dashboard contexts keep the existing role-derived support copy;
- setup/readiness remains secondary inside the existing operational support area.

Focused tests prove:

- operations shell presentation renders the owner/admin-native support copy;
- non-operations dashboard presentation preserves the previous owner/admin fallback copy;
- existing dashboard sections, widgets, links, filtering, table props, and readiness surfaces still
  render from the same summary data and permission checks;
- `DashboardGate` tests still prove assignment-only, order-capable, mixed, loading, and fallback
  dashboard selection remains permission-derived and unchanged;
- `AssignmentDashboardPage` tests still prove R6A received-work presentation remains isolated.

Preserved boundaries:

- no `DashboardGate` branch selection change;
- no `resolveCurrentDashboard(...)` change;
- no route/path change;
- no permission or route guard change;
- no dashboard data hook, query, RPC, widget, filter, table, link, or object visibility change;
- no assignment dashboard change;
- no backend/Supabase/query/workflow/RLS/RPC change;
- no navigation or command palette change;
- no shell switching, product-mode authority change, Client Portal implementation, branding, or
  production data change.

Recommended next role-centric slice:

- **Falcon Role-Centric Operational Shell Architecture Phase R6C: Appraiser And Reviewer Workbench
  Presentation Plan**.

### Falcon Role-Centric Operational Shell Architecture Phase R6C

Completed a documentation-only plan for appraiser and reviewer dashboard/workbench presentation
before any runtime copy or layout changes.

R6C inspected:

- `src/features/dashboard/DashboardPage.jsx`;
- `src/features/dashboard/__tests__/DashboardPage.test.jsx`;
- `src/features/dashboard/DashboardGate.jsx`;
- `src/lib/dashboard/currentDashboardResolution.js`;
- `src/lib/shell/shellProfiles.js`;
- `src/lib/shell/resolveShellProfile.js`;
- `src/pages/appraisers/AppraiserDashboard.jsx`;
- `src/pages/reviewers/ReviewerDashboard.jsx`.

R6C findings:

- appraiser and reviewer pages still render the shared order-capable `DashboardPage`;
- `DashboardPage` receives `shellProfilePresentation`, but currently uses it only for the
  `operations` presentation branch;
- reviewer and appraiser support copy remains role-derived;
- current section labels already include `My Review Work` and `My Assignments`;
- the shared dashboard still includes calendar, order table, status filters, KPI cards, workload,
  operational support, and readiness/setup surfaces where existing permissions allow.

R6C decisions:

- do not show `My Work` as the shared `DashboardPage` heading for appraiser-only users yet;
- do not show `Review Queue` as the shared `DashboardPage` heading for reviewer-only users yet;
- those headings would overpromise while the page remains a shared order-capable dashboard instead
  of a dedicated appraiser or reviewer workbench;
- future support-copy-only, section-label-only, or scoped empty-state refinements may be safe after
  passive tests prove no dashboard selection, data, widget, route, permission, navigation, or
  command behavior changed;
- heading-level `My Work` and `Review Queue` presentation should wait for a dedicated workbench
  boundary or stronger shared-dashboard framing decision.

Hybrid behavior remains:

- owner/admin plus appraiser or reviewer responsibility defaults to `operations`;
- appraiser plus reviewer users default deterministically to `my_work` unless explicit review work
  waiting selects `review_queue`;
- any future shell switcher must remain presentation-only and must not grant route, permission,
  object, query, workflow, or action authority.

Preserved boundaries:

- no runtime code changes;
- no dashboard copy changes;
- no `DashboardGate` branch selection change;
- no `resolveCurrentDashboard(...)` change;
- no route/path change;
- no permission or route guard change;
- no dashboard data hook, query, RPC, widget, filter, table, link, or object visibility change;
- no Orders table, KPI/workload, Calendar panel, setup, or readiness behavior change;
- no backend/Supabase/query/workflow/RLS/RPC change;
- no navigation or command palette change;
- no shell switching, product-mode authority change, Client Portal implementation, branding, or
  production data change.

Recommended next role-centric slice:

- **Falcon Role-Centric Operational Shell Architecture Phase R6D: DashboardPage
  Appraiser/Reviewer Passive Presentation Tests**.

### Falcon Role-Centric Operational Shell Architecture Phase R6D

Completed passive test coverage for appraiser and reviewer shell presentation metadata on the
shared order-capable `DashboardPage`.

R6D updated:

- `src/features/dashboard/__tests__/DashboardPage.test.jsx`.

R6D test fixtures:

- `my_work` shell presentation metadata with `dashboardTitle: "My Work"`;
- `review_queue` shell presentation metadata with `dashboardTitle: "Review Queue"`.

Focused tests prove:

- R6B `operations` shell presentation still renders owner/admin-native support copy;
- `my_work` metadata does not change the shared `DashboardPage` heading to `My Work`;
- `review_queue` metadata does not change the shared `DashboardPage` heading to `Review Queue`;
- appraiser support copy remains `Calendar context, assigned orders, and revision follow-up.`;
- reviewer support copy remains `Calendar context and review work assigned to your queue.`;
- existing appraiser/reviewer role labels and worklist labels remain visible;
- calendar and order table props still come from the same dashboard summary data and role-derived
  table modes.

R6D keeps appraiser/reviewer visible copy deferred:

- no visible dashboard copy changed;
- no dedicated appraiser or reviewer workbench component was introduced;
- heading-level `My Work` and `Review Queue` presentation remains blocked until a separately
  approved workbench or scoped-copy slice.

Preserved boundaries:

- no production runtime source change;
- no visible dashboard copy change;
- no `DashboardGate` branch selection change;
- no `resolveCurrentDashboard(...)` change;
- no route/path change;
- no permission or route guard change;
- no dashboard data hook, query, RPC, widget, filter, table, link, or object visibility change;
- no Orders table, KPI/workload, Calendar panel, setup, or readiness behavior change;
- no backend/Supabase/query/workflow/RLS/RPC change;
- no navigation or command palette change;
- no shell switching, product-mode authority change, Client Portal implementation, branding, or
  production data change.

Recommended next role-centric slice:

- **Falcon Role-Centric Operational Shell Architecture Phase R6E: Appraiser/Reviewer Scoped
  Dashboard Copy Plan**.

### Falcon Role-Centric Operational Shell Architecture Phase R6E

Completed a documentation-only plan for the first actual appraiser/reviewer workbench surface
migration.

R6E inspected:

- `src/features/dashboard/DashboardPage.jsx`;
- `src/features/dashboard/__tests__/DashboardPage.test.jsx`;
- `src/features/dashboard/DashboardGate.jsx`;
- `src/pages/orders/Orders.jsx`;
- `src/features/orders/UnifiedOrdersTable.jsx`;
- `src/components/dashboard/DashboardCalendarPanel.jsx`.

Workbench design decision:

- do not rename shared `DashboardPage` to `My Work` or `Review Queue`;
- do not start with route-level alternate views or shell switching;
- create passive, unmounted appraiser/reviewer workbench component boundaries first;
- use existing dashboard row data and props before introducing new queries;
- decide later whether proven components should mount as scoped panels inside `DashboardPage` or
  become selected dashboard presentation components in a separately approved slice.

Safe reusable data and surfaces:

- dashboard summary rows;
- status counts and status-derived filters;
- due and overdue fields already present on order rows;
- `DashboardCalendarPanel` fed by existing order rows;
- `UnifiedOrdersTable` with existing dashboard-scoped rows;
- reviewer queue mode and reviewer id support;
- role-derived appraiser table behavior;
- workload cards for assigned work, review queue, unassigned active work, and revision follow-up;
- Orders route filters for status, appraiser id, reviewer id, due window, queue id, and search.

Deferred backend/query/workflow needs:

- explicit appraiser assigned-work query if dashboard rows are not enough;
- explicit reviewer assignment/review queue query if dashboard rows are not enough;
- revision request detail, latest reviewer/appraiser notes, and revision-loop counts;
- file checklist, document/report readiness, and safe preview/download context;
- notes/activity feeds scoped to assigned or review work;
- report-progress state if separate from order status;
- governed submit/resubmit, request-revisions, clear-review, and ready-for-client action
  availability inside workbench components;
- mobile-safe upload, note, and workflow action flows.

Preserved boundaries:

- docs/planning only;
- no runtime code changes;
- no dashboard copy changes;
- no `DashboardGate` branch selection change;
- no route/path change;
- no permission or route guard change;
- no backend/Supabase/query/workflow/RLS/RPC change;
- no dashboard data hook, widget, table, KPI/workload, or Calendar panel behavior change;
- no navigation or command palette change;
- no shell switching, product-mode authority change, Client Portal implementation, branding, or
  production data change.

Recommended next role-centric slice:

- **Falcon Role-Centric Operational Shell Architecture Phase R6F: Passive Workbench Component
  Skeletons**.

### Falcon Role-Centric Operational Shell Architecture Phase R6F

Completed passive appraiser and reviewer workbench component skeletons without mounting them in
live UI.

R6F added:

- `src/features/dashboard/workbenches/AppraiserWorkbenchPreview.jsx`;
- `src/features/dashboard/workbenches/ReviewerWorkbenchPreview.jsx`;
- `src/features/dashboard/workbenches/__tests__/WorkbenchPreviews.test.jsx`.

Skeleton component contract:

- components accept plain props only: `rows`, `loading`, and a role label;
- components derive lightweight counts from supplied order rows;
- components render role-native headings, support copy, sections, and empty states;
- components do not fetch data, call hooks, import Supabase/API/router helpers, import
  `DashboardGate`, import dashboard data hooks, or trigger workflow actions;
- components are not imported or mounted by live dashboard, route, navigation, command palette, or
  workflow surfaces.

Appraiser skeleton:

- heading: `My Work`;
- sections: `Assigned Work`, `Needs Revisions`, `Due Soon`, `Site Visit / Calendar Context`, and
  `Recent Notes / Files`;
- copy focuses on assigned orders, revision requests, due dates, site visit context, files, notes,
  and submit/resubmit readiness.

Reviewer skeleton:

- heading: `Review Queue`;
- sections: `In Review`, `Resubmitted Work`, `Due Soon / Overdue Review`,
  `Revision Follow-Up`, and `Review Notes / Files`;
- copy focuses on submitted work, resubmissions, revision loops, due pressure, report/file context,
  and review-note readiness.

Focused tests prove:

- headings and role-native support copy render;
- row-derived summary sections render from props;
- empty states are role-native;
- no action buttons are rendered;
- static source scans reject Supabase/API/router/DashboardGate/DashboardPage/data-hook/permission
  hook/workflow action references.

Preserved boundaries:

- no live UI mount;
- no `DashboardPage` integration;
- no `DashboardGate` change;
- no route/path change;
- no permission or route guard change;
- no backend/Supabase/query/workflow/RLS/RPC change;
- no dashboard data/widget/table/KPI/workload/Calendar behavior change;
- no navigation or command palette change;
- no shell switching, product-mode authority change, Client Portal implementation, branding, or
  production data change.

Recommended next role-centric slice:

- **Falcon Role-Centric Operational Shell Architecture Phase R6G: Workbench Mount Readiness
  Plan**.

### Falcon Role-Centric Operational Shell Architecture Phase R6G

Completed a documentation-only mount readiness plan for the R6F appraiser and reviewer workbench
previews.

R6G inspected:

- `src/features/dashboard/workbenches/AppraiserWorkbenchPreview.jsx`;
- `src/features/dashboard/workbenches/ReviewerWorkbenchPreview.jsx`;
- `src/features/dashboard/workbenches/__tests__/WorkbenchPreviews.test.jsx`;
- `src/features/dashboard/DashboardPage.jsx`.

Mount readiness decision:

- the R6F previews are ready for a limited secondary-panel mount, not a page-level workbench
  replacement;
- the shared `DashboardPage` heading should remain `Operations Dashboard`;
- the first visible appraiser/reviewer workbench surface should be a scoped secondary panel after
  the existing table/status area and before `Operational Support`;
- owner/admin hybrids should not receive the panel by default because they resolve to
  `operations`;
- route-level alternate views, shell switching, and dedicated dashboard branch selection remain
  deferred.

Required conditions before mounting:

- `DashboardGate` must still select `DashboardPage` through existing permission-derived logic;
- profile id must be `my_work` or `review_queue`;
- `isAdmin` must be false;
- `ordersRows` and `loading` must come from the existing dashboard summary state;
- no new query, hook, Supabase/API/RPC dependency, workflow action, route, nav, command, table
  filter, status filter, calendar input, KPI, workload, or readiness behavior may change;
- empty states must say no rows are represented, not imply hidden records do not exist;
- tests must prove dashboard heading, branch selection, table props, calendar props, and existing
  dashboard behavior remain unchanged.

Recommended later mount props:

- `rows={ordersRows || []}`;
- `loading={loading}`;
- `appraiserLabel={roleLabel}` for `my_work`;
- `reviewerLabel={roleLabel}` for `review_queue`.

Blocked changes:

- replacing `DashboardPage` heading with `My Work` or `Review Queue`;
- selecting dashboard components from shell profile id;
- changing `DashboardGate`, `resolveCurrentDashboard(...)`, routes, guards, permissions, queries,
  workflow behavior, nav, commands, shell switching, or Client Portal behavior;
- adding submit/resubmit/request-revisions/clear-review/ready-for-client buttons;
- adding files, notes, report previews, revision history, or activity feeds before explicit data
  contracts exist.

Recommended next role-centric slice:

- **Falcon Role-Centric Operational Shell Architecture Phase R6H: DashboardPage Secondary
  Workbench Preview Mount**.

### Falcon Role-Centric Operational Shell Architecture Phase R6H

Completed the first live secondary appraiser/reviewer workbench preview mount inside the existing
shared `DashboardPage`.

R6H updated:

- `src/features/dashboard/DashboardPage.jsx`;
- `src/features/dashboard/__tests__/DashboardPage.test.jsx`.

Mount behavior added:

- `DashboardPage` now imports the passive R6F appraiser and reviewer workbench preview
  components;
- `DashboardPage` derives the passive profile id from the existing `shellProfilePresentation`
  prop;
- non-admin `my_work` dashboard contexts render `AppraiserWorkbenchPreview`;
- non-admin `review_queue` dashboard contexts render `ReviewerWorkbenchPreview`;
- the selected preview mounts after the existing table/status area and before `Operational
  Support`;
- each preview receives only existing dashboard props: existing order rows, existing loading state,
  and the existing role label.

Owner/admin hybrid exclusion:

- owner/admin operations users do not render either preview panel;
- owner/admin plus appraiser/reviewer users remain excluded when `isAdmin` is true;
- the shared dashboard heading remains `Operations Dashboard`.

Preserved boundaries:

- no `DashboardGate` change;
- no dashboard branch selection change;
- no route/path change;
- no permission or route guard change;
- no backend/Supabase/query/workflow/RLS/RPC change;
- no new hooks, queries, API calls, workflow buttons, links, or callbacks;
- no dashboard table, status filter, calendar, KPI, workload, owner setup, or readiness behavior
  change;
- no navigation or command palette change;
- no shell switching, Client Portal implementation, branding, or production data change.

Focused tests prove:

- non-admin `my_work` renders the `My Work` preview while keeping `Operations Dashboard`;
- non-admin `review_queue` renders the `Review Queue` preview while keeping
  `Operations Dashboard`;
- owner/admin and owner/admin hybrid contexts do not render the preview panels;
- calendar and Orders table props still come from existing dashboard summary rows and
  role-derived table modes;
- preview panels render no action buttons.

Recommended next role-centric slice:

- **Falcon Role-Centric Operational Shell Architecture Phase R6I: Workbench Preview Data
  Sufficiency And Copy Audit**.
### Falcon Role-Centric Operational Shell Architecture Phase R7A

Completed documentation-only profile-aware navigation grouping planning before any runtime
navigation changes.

R7A inspected:

- `src/lib/navigation/currentNavigationRegistry.js`;
- `src/lib/navigation/currentPrimaryNavLinks.js`;
- `src/components/shell/TopNav.jsx`;
- `src/lib/commandPalette/currentCommandRegistry.js`;
- `src/lib/commandPalette/currentCommandPaletteCommands.js`;
- `src/components/nav/CommandPalette.jsx`;
- `src/routes/index.jsx`;
- `src/lib/shell/resolveShellProfile.js`;
- `src/lib/shell/shellProfiles.js`;
- `src/features/dashboard/DashboardGate.jsx`.

Current navigation reality:

- primary desktop/mobile nav still comes from `getCurrentPrimaryNavLinks(...)`;
- current primary nav order remains `Orders`, `Assignments`, `Relationships`, `Calendar`,
  `Clients`, and `Team Access`;
- mobile nav mirrors primary links and adds `Settings` when settings access is allowed;
- command palette uses a separate permission-filtered registry and remains broader than primary
  nav;
- `DashboardGate` remains permission-derived and only passes shell metadata as presentation data;
- route guards remain the authority for `/orders`, `/calendar`, `/assignments`, `/relationships`,
  `/clients`, `/users`, and settings routes.

Navigation grouping doctrine:

- grouping is presentation and discoverability only;
- showing a nav item cannot grant access;
- hiding or de-emphasizing a nav item cannot deny access;
- shell profile id may affect grouping/order/labels only after permission visibility has already
  determined available surfaces;
- route guards, permissions, RLS/RPCs, object visibility, and workflow contracts remain canonical.

Profile grouping decisions:

- `operations`: keep broad owner/admin nav, grouped into Operations, Management, and Setup /
  Support instead of one flat route list;
- `my_work`: emphasize My Work, assigned order work, revision/due lanes, and Calendar, while
  deferring global `Orders` to `My Orders` renames until shell-aware nav is live;
- `review_queue`: emphasize Review Queue, in-review/resubmitted/revision lanes, and review
  Calendar without creating a new review route or dashboard branch yet;
- `received_work`: emphasize Received Work / Assignments, Offers, Active Work, and Submitted Work
  for assignment-only users, while preserving owner/admin assignment packet precision elsewhere;
- `requests`: keep Client Requests navigation future-only until Client Portal authority, routes,
  data projections, and client-safe status language exist;
- fallback profiles: render only minimal company/account recovery affordances where safe and avoid
  operational work claims.

Mobile grouping direction:

- mobile should collapse by shell priority rather than list every authorized desktop surface;
- owner/admin mobile should prioritize exception triage and daily operations;
- appraiser mobile should prioritize assigned work, due/revision pressure, and calendar context;
- reviewer mobile should prioritize review decisions and review due pressure;
- assignment-recipient mobile should prioritize Received Work, Offers, Active Work, and Submitted
  Work;
- future client mobile should prioritize Requests, Action Needed, Documents, Reports, and Messages.

Command palette relationship:

- commands should remain permission-derived and broader than primary navigation;
- later shell metadata may affect command grouping, order, aliases, and placeholder copy;
- order-search fallback should remain unchanged until a separate command-palette slice designs
  profile-aware search fallback behavior.

Recommended next runtime slice:

- **Falcon Role-Centric Operational Shell Architecture Phase R7B: Passive Navigation Group
  Metadata And Tests**.

R7B should add inert profile-aware navigation grouping metadata for existing live nav ids, with
tests proving metadata references known nav entries and is `presentation_only`. It should also
prove current primary nav links, labels, order, mobile settings behavior, command palette labels/
order, and route paths remain unchanged. R7B should not call `useShellProfile()` from `TopNav`,
render grouped navigation, rename global nav labels, change command palette behavior, change
routes/guards/permissions, change `DashboardGate`, change dashboards, add shell switching, or
implement Client Portal behavior.

### Falcon Role-Centric Operational Shell Architecture Phase R7B

Completed passive profile-aware navigation grouping metadata and tests.

R7B added:

- `src/lib/navigation/shellNavigationGroups.js`;
- `src/lib/navigation/__tests__/shellNavigationGroups.test.js`.

The new metadata registry:

- is keyed by shell profile id;
- is frozen/read-only;
- uses `metadataAuthority: presentation_only`;
- references existing current live navigation ids only;
- includes group ids, group labels, ordered existing nav ids, notes, deemphasized ids, and
  future/fallback status;
- exports `getShellNavigationGroups(...)`, `shellNavigationGroupsByProfileId`, and stable profile
  id ordering for tests and future passive consumers.

Grouping coverage:

- `operations`: `Operations`, `Management`, and `Setup / Support`;
- `my_work`: `Work` and `Support`, with admin/setup surfaces deemphasized as metadata only;
- `review_queue`: `Review Work` and `Support`, without creating a Review Queue route;
- `received_work`: `Received Work` and `Account`, without granting canonical order/client/team
  access;
- `requests`: future-only metadata with no live Client Portal route assumptions;
- fallback profiles: minimal workspace/account recovery grouping using existing `dashboard` and
  `settings` ids.

Focused tests prove:

- every shell profile metadata id has exactly one navigation grouping record;
- every referenced nav id exists in the current live navigation registry;
- metadata records do not contain permission keys, route guards, visibility gates, or permission
  decision inputs;
- future `requests` metadata does not invent Client Portal, Documents, Reports, Messages, or
  Requests route ids;
- current primary nav ids, labels, order, and route paths remain unchanged;
- existing `Orders`, `Assignments`, `Team Access`, and `Owner Setup` labels/paths remain unchanged;
- all metadata entries, groups, and arrays are frozen/read-only.

R7B preserves:

- `currentNavigationRegistry` behavior;
- `getCurrentPrimaryNavLinks(...)` output;
- `TopNav` desktop and mobile rendering;
- mobile Settings behavior;
- command palette registry, helper, rendering, labels, ordering, and order-search fallback;
- all route paths, route guards, permission keys, permission checks, `DashboardGate`, dashboards,
  backend/Supabase/query/workflow behavior, RLS/RPCs, shell switching, Client Portal behavior,
  branding, and production data.

Recommended next role-centric slice:

- **Falcon Role-Centric Operational Shell Architecture Phase R7C: Navigation Grouping Render
  Readiness Plan**.

R7C should plan how `TopNav` could safely consume the passive grouping metadata later. It should
not render grouped navigation, call `useShellProfile()` from `TopNav`, change current nav labels/
order, change mobile nav behavior, change command palette behavior, alter routes, permissions,
guards, DashboardGate, dashboards, backend/Supabase/query/workflow behavior, add shell switching,
or implement Client Portal.

### Falcon Role-Centric Operational Shell Architecture Phase R7C

Completed documentation-only navigation grouping render readiness planning.

R7C inspected:

- `src/components/shell/TopNav.jsx`;
- `src/lib/navigation/currentPrimaryNavLinks.js`;
- `src/lib/navigation/shellNavigationGroups.js`.

Current render findings:

- `TopNav` currently derives permission booleans, calls `getCurrentPrimaryNavLinks(...)`, and maps
  the returned links directly in desktop and mobile nav;
- mobile nav uses the same primary links and adds `Settings` separately when allowed;
- `TopNav` does not call `useShellProfile()` and does not import `shellNavigationGroups`;
- command palette rendering remains independent from nav rendering;
- `getCurrentPrimaryNavLinks(...)` remains the permission-filtered source of visible nav links.

Render decision:

- the first live render should be **desktop-only group labels/separators over already visible
  links**;
- grouping must be applied after existing permission-filtered nav link derivation;
- grouping must intersect passive metadata with the current visible link ids;
- empty groups should not render;
- unknown and fallback profiles should fall back to the current flat nav;
- mobile grouping should wait for a separate mobile-specific slice;
- `deemphasizedNavEntryIds` should remain metadata only in the first render slice.

Allowed future grouping changes:

- visual grouping around already visible links;
- section labels for non-empty groups;
- ordering of currently visible links;
- visual emphasis or de-emphasis after separate approval.

Blocked changes:

- changing route access;
- changing permission filtering;
- adding or removing visible links;
- changing URL paths or nav labels;
- changing command palette availability, labels, order, filtering, or order-search fallback;
- changing DashboardGate, dashboard selection, backend/Supabase/query/workflow behavior, shell
  switching, or Client Portal behavior.

Recommended next runtime slice:

- **Falcon Role-Centric Operational Shell Architecture Phase R7D: Desktop Navigation Group Labels
  From Visible Links**.

R7D should call passive shell profile exposure in `TopNav` only as presentation metadata, keep
`getCurrentPrimaryNavLinks(...)` as the source of visible links, derive desktop groups by
intersecting visible links with `getShellNavigationGroups(profileId)`, and render group labels only
for non-empty desktop groups. It should keep mobile nav flat and unchanged, keep command palette
unchanged, and add tests proving the visible link id set, labels, paths, active/click behavior,
routes, permissions, guards, DashboardGate, dashboards, backend/Supabase/query/workflow behavior,
shell switching, and Client Portal behavior remain unchanged.

### Falcon Role-Centric Operational Shell Architecture Phase R7D

Implemented desktop-only navigation group labels from already visible permission-filtered links.

Runtime files added:

- `src/lib/navigation/currentShellNavigationSections.js`.

Runtime files updated:

- `src/components/shell/TopNav.jsx`.

Focused tests added or updated:

- `src/lib/navigation/__tests__/currentShellNavigationSections.test.js`;
- `src/components/shell/__tests__/TopNav.test.jsx`.

R7D behavior:

- `TopNav` observes `useShellProfile()` only as presentation metadata;
- desktop nav groups visible links through `getCurrentShellNavigationSections(...)`;
- grouping is applied after `getCurrentPrimaryNavLinks(...)`;
- active profile groups render labels only when they contain visible links;
- fallback, future, and unknown profiles keep flat desktop nav;
- metadata-only ids do not create links;
- ungrouped visible links stay reachable in `More`;
- mobile nav remains flat and unchanged;
- command palette remains unchanged.

Preserved guardrails:

- no route/path changes;
- no permission/guard changes;
- no visible link removal or synthetic inaccessible links;
- no nav label changes;
- no mobile nav behavior changes;
- no command palette changes;
- no DashboardGate, dashboard/data, backend/Supabase/query/workflow, shell switching, or Client
  Portal changes.

Recommended next role-centric slice:

- **Falcon Role-Centric Operational Shell Architecture Phase R7E: Mobile Navigation Grouping
  Readiness Plan**.

R7E should evaluate whether mobile nav should adopt grouping, priority ordering, or remain flat
for usability before any mobile runtime change.


### Falcon Role-Centric Operational Shell Architecture Phase R7E

Completed documentation-only mobile navigation grouping readiness planning after desktop
profile-aware grouping. R7E inspected `TopNav`, current primary nav link derivation, desktop shell
navigation section derivation, and passive shell navigation grouping metadata. Current mobile nav
still maps the already permission-filtered `primaryNavLinks` flat, closes the drawer on link
selection, and renders `Settings` separately after a divider when settings access is allowed.
Desktop R7D grouping remains separate and mission-control oriented, while mobile should follow the
Mobile = Operational Execution doctrine by favoring direct access over extra section chrome.

Render decision:

- do not render mobile group labels as the first mobile slice;
- do not add mobile accordions;
- do not introduce quick actions from navigation metadata;
- do not rename global mobile nav labels yet;
- keep fallback, unknown, and future profiles on the current flat mobile order;
- use profile-aware priority ordering as the safest first mobile runtime direction.

Recommended next runtime slice:

- **Falcon Role-Centric Operational Shell Architecture Phase R7F: Mobile Navigation Priority
  Ordering From Visible Links**.

R7F should add a pure helper that accepts already visible mobile links and a shell profile id,
returns the same links in profile-prioritized order for active profiles, appends ungrouped visible
links in their existing relative order, and preserves fallback/unknown/future profiles in current
flat order. It should apply only to the mobile drawer, keep mobile `Settings` placement unchanged,
keep desktop grouping unchanged, keep command palette behavior unchanged, and prove the mobile
visible link id set, labels, paths, drawer close behavior, routes, permissions, guards,
DashboardGate, dashboards, backend/Supabase/query/workflow behavior, shell switching, and Client
Portal behavior remain unchanged.

### Falcon Role-Centric Operational Shell Architecture Phase R7F

Implemented mobile navigation priority ordering from already visible permission-filtered links.

Runtime files added:

- `src/lib/navigation/currentShellMobileNavigationLinks.js`.

Runtime files updated:

- `src/components/shell/TopNav.jsx`.

Focused tests added or updated:

- `src/lib/navigation/__tests__/currentShellMobileNavigationLinks.test.js`;
- `src/components/shell/__tests__/TopNav.test.jsx`.

R7F behavior:

- mobile nav remains a flat list with no group labels or accordions;
- `TopNav` keeps `getCurrentPrimaryNavLinks(...)` as the source of visible links;
- active shell profiles reorder only those visible links through
  `getCurrentShellMobileNavigationLinks(...)`;
- metadata-only nav ids do not create links;
- ungrouped visible links remain available in current relative order;
- fallback, future, and unknown profiles keep the current flat mobile order;
- mobile `Settings` remains after the existing divider when settings access is allowed;
- desktop R7D grouping remains unchanged;
- command palette behavior remains unchanged.

Preserved guardrails:

- no route/path changes;
- no permission/guard changes;
- no visible link removal or synthetic inaccessible links;
- no nav label changes;
- no mobile group labels, accordions, hidden links, or de-emphasis behavior;
- no command palette changes;
- no DashboardGate, dashboard/data, backend/Supabase/query/workflow, shell switching, or Client
  Portal changes.

Recommended next role-centric slice:

- **Falcon Role-Centric Operational Shell Architecture Phase R7G: Mobile Navigation Copy And
  Density Audit**.

R7G should audit whether mobile nav labels, spacing, and Settings/support placement remain clear
after profile-priority ordering before any additional mobile runtime changes.


## Recommended Ordering

1. Completed: start Track 1 with read-only Order Detail Print Packets.
2. Completed: implement and close out the initial read-only Historical Orders readback surface.
3. Completed: implement and close out the initial governed Dashboard KPI foundation.
4. Completed: implement and close out the initial governed Workload Visibility foundation.
5. Completed: run Track 3's production readiness checkpoint.
6. Before adding new side-effecting features, run Track 2's source-scan hardening slice.
7. Continue Track 1 with Order Detail/activity read UX improvements.
8. Design the first Track 2 backend workflow notification migration, but implement only after the
   no-duplicate replacement plan is clear.
9. Resolve client archive semantics before broad client/AMC expansion.
10. Continue production cutover rehearsals until broader customer rollout is unblocked.

## Explicit Non-Goals For The First Slice

- No new mutation RPCs.
- No lifecycle behavior changes.
- No assignment behavior changes.
- No notification fanout redesign.
- No History/Admin runtime readback surface in the planning slice.
- No direct production migration.
