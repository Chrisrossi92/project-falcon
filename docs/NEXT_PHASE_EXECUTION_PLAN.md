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
