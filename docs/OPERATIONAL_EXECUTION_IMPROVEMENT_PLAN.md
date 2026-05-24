# Operational Execution Improvement Plan

## Purpose

Operational Execution Phase 1A audits Falcon's daily work surfaces after the role-aware shell,
navigation, dashboard, workbench preview, and command palette priority milestones.

This phase is documentation and audit only. It makes no runtime behavior, route, permission,
backend, Supabase, query, workflow, lifecycle, Smart Actions, notification delivery, automation,
mobile/PWA/native, shell switching, or Client Portal implementation change.

The goal is to identify the highest-value operational execution improvements: what a user should
do next, what is waiting on them, what is due soon, what needs review or revision, what files are
missing, where status/appointment updates happen, and how owners/admins see stuck or silent work.

## Sources Inspected

Runtime sources inspected:

- `src/features/dashboard/DashboardPage.jsx`;
- `src/features/dashboard/AssignmentDashboardPage.jsx`;
- `src/features/dashboard/workbenches/AppraiserWorkbenchPreview.jsx`;
- `src/features/dashboard/workbenches/ReviewerWorkbenchPreview.jsx`;
- `src/pages/orders/Orders.jsx`;
- `src/features/orders/UnifiedOrdersTable.jsx`;
- `src/features/orders/smartActions.js`;
- `src/features/orders/components/SmartActionsControl.jsx`;
- `src/components/orders/drawer/OrderDrawerContent.jsx`;
- `src/pages/orders/OrderDetail.jsx`;
- `src/components/activity/ActivityLog.jsx`;
- `src/pages/Calendar.jsx`;
- `src/features/assignments/AssignmentsPage.jsx`;
- `src/features/assignments/AssignmentDetail.jsx`;
- `src/features/assignments/components/AssignedWorkDashboard.jsx`;
- `src/components/notifications/NotificationBell.jsx`;
- `src/pages/admin/OwnerSetup.jsx`.

Supporting docs inspected:

- `docs/FALCON_ROLE_CENTRIC_OPERATIONAL_SHELL_ARCHITECTURE.md`;
- `docs/OPERATIONAL_DASHBOARD_POLISH_STRATEGY.md`;
- `docs/ORDERS_WORKSPACE_POLISH_STRATEGY.md`;
- `docs/ASSIGNMENTS_WORKSPACE_POLISH_STRATEGY.md`;
- `docs/CALENDAR_WORKSPACE_POLISH_STRATEGY.md`;
- `docs/OPERATIONAL_QUEUE_MODEL.md`;
- `docs/WORKLOAD_VISIBILITY_PLAN.md`;
- `docs/DOCUMENT_EXPERIENCE_PLAN.md`;
- `docs/OPERATIONAL_TIMELINE_PLAN.md`;
- `docs/NEXT_PHASE_EXECUTION_PLAN.md`;
- `docs/IMPLEMENTATION_ROADMAP.md`.

## Current Operational Execution Baseline

Falcon now has role-aware presentation foundations:

- `DashboardGate` still selects order-capable versus assignment dashboard surfaces from current
  permission-derived dashboard posture.
- Shell profile exposure is passive and feeds presentation only.
- Owner/admin operations and assignment-recipient dashboard copy are shell-aware.
- Appraiser and reviewer secondary workbench previews are mounted inside the shared dashboard from
  existing dashboard rows only.
- Desktop navigation groups visible permission-filtered links by shell profile.
- Mobile navigation reorders already visible links by shell priority without adding group labels.
- Command palette default order is shell-prioritized from already visible commands, while active
  search behavior remains unchanged.

Operational work surfaces already present:

- Dashboard calendar, active order worklist, status rail, KPI cards, workload visibility, setup
  prompt, and readiness support.
- Orders workspace with URL-backed filters, active chips, saved views, queue-derived filters,
  `UnifiedOrdersTable`, drawer expansion, and governed Smart Actions.
- Order Detail with operational overview, site visit picker, files card, activity log, owner-side
  assignment panel, lifecycle notices, print packet, and lifecycle/archive controls.
- Activity timeline with participant/system filtering and note composer.
- Files card with upload, download through signed URL helper, category grouping, archive state, and
  upload status.
- Calendar workspace with role-aware lenses, month/two-week board, and selected-day rail.
- Assignment dashboard and Received Work surfaces for offers, active work, submitted work, owner
  review, and owner-side sent assignments.
- Notification center with unread count, type badges, mark-read/dismiss actions, and order or
  assignment navigation.

## Top Friction Points

### 1. Next Action Is Split Across Surfaces

The table, drawer, full detail page, Smart Actions dropdown, activity notes, files card, site visit
picker, and assignment panels all contain operational clues. No single order-level summary states
the next expected action in plain language.

Impact:

- owner/admin users must infer whether an order is stuck, unassigned, waiting for review, waiting
  on revisions, or missing appointment/document context;
- appraisers see assigned work but still need to open rows/details to understand whether due date,
  site visit, file, note, or submit-to-review work is next;
- reviewers see review queue context but still need to inspect row status, files/activity, and
  action availability before deciding;
- mobile users have to scan dense table/detail surfaces to find the immediate next step.

### 2. Due Pressure Exists But Is Not Consistently Actionable

Dashboard KPI cards, status rail, calendar lenses, workbench previews, and Orders filters expose
due pressure. The next step attached to due pressure is not consistently shown beside the affected
order or role.

Examples:

- overdue/due-soon counts link to Orders filters, but the row-level reason for pressure can still
  require scanning due fields;
- review due, final due, and site visit dates are distributed across status cells, detail summary,
  calendar, and drawer;
- assignment due/expiration/review dates are strong in Received Work, but internal order due action
  language is less direct.

### 3. Review And Revision Work Needs Better Context

Smart Actions expose `Request Revisions`, `Clear Review`, `Send to Review`, and `Resubmit to
Review` from existing workflow permissions. The surrounding context does not yet summarize the
latest revision note, resubmission reason, review age, revision loop count, or file readiness.

Impact:

- reviewers can decide the action but must dig through activity/files to understand why;
- appraisers can resubmit but may not see the revision reason surfaced beside the action;
- owners/admins can see review/revision queues, but not silence/staleness around review loops.

### 4. File Readiness Is Present But Not Operationalized

Order Detail has a governed Files card with upload/download/archive and category grouping. The
system does not yet present a lightweight file readiness summary for common work states.

Examples:

- no expected-document checklist exists;
- missing final report, engagement, source documents, or review-revision attachments are not
  summarized as operational blockers;
- appraiser/reviewer workbench previews explicitly note that files remain order-scoped and are not
  loaded there.

This is a high-value area, but richer file readiness may require clearer document expectations
before it becomes authoritative.

### 5. Appointment And Status Updates Are Possible But Scattered

Site visit updates appear in Order Detail through `SiteVisitPicker`, and table compatibility paths
exist through `UnifiedOrdersTable`. The current UX does not make "set appointment", "confirm site
visit", or "work is on track" a single role-native execution path.

Impact:

- appraisers may not know whether updating the site visit is enough to signal progress;
- owner/admin users cannot easily distinguish active but silent work from work that is truly
  stalled;
- future communication automation would lack reliable suppression signals if operational
  confirmation stays implicit.

### 6. Owner/Admin Stuck-Work Visibility Is Still Mostly Derived

Dashboard workload visibility identifies unassigned active work, revision follow-up, review queue,
and workload summaries from active rows. It does not yet surface silence, aging, missing next owner,
missing appointment, missing file, or no recent activity as first-class operational exceptions.

Impact:

- owners/admins can see inventory and workload, but not all stuck-work reasons;
- alerting and notifications risk becoming either noisy or incomplete without a clear stuck-work
  doctrine.

### 7. Mobile Execution Is Still Dense

Mobile navigation now prioritizes role-relevant links, but the primary operational surfaces remain
desktop-oriented:

- Orders table and drawer still require dense scanning;
- Order Detail has many panels and controls;
- activity and file interactions are workable but not optimized as quick execution lanes;
- assignment recipient rows are compact and action-first, making Received Work the strongest
  current mobile execution candidate.

### 8. Notifications Are Useful But Not Role-Attention Tuned Yet

Notification center displays typed notifications and navigates to orders or assignments. It does
not yet prioritize by shell, separate owner/admin supervision from direct work, or suppress low
signal events based on current status/appointment/file freshness.

This should remain planning until status-confirmation and stuck-work signals are clearer.

## Role-Specific Findings

### Owner / Admin

Works today:

- Operations Dashboard, active worklist, KPI cards, workload visibility, readiness support, Team
  Access, Orders filters, Historical Orders, Order Detail lifecycle controls, assignment panels.

Friction:

- operational exceptions are spread across dashboard, filters, table rows, drawer, full detail,
  activity, files, and assignment panels;
- unassigned and review/revision queues are visible, but silent/stuck work is not explicit;
- lifecycle/archive actions are protected, but daily next-action triage could be clearer;
- owner-visible notification volume needs exception-focused rules before automation.

High-value direction:

- order-level attention summary and owner/admin stuck-work cards derived from existing rows and
  already loaded detail fields first.

### Staff Appraiser

Works today:

- shell profile can show `My Work` secondary preview;
- dashboard and table can scope appraiser rows;
- Smart Actions can show Send/Resubmit to Review where governed;
- Order Detail exposes site visit, files, activity, and notes.

Friction:

- `My Work` preview summarizes row counts but has no row-level next action;
- revision reason/latest reviewer note is not surfaced in the workbench preview;
- file readiness and appointment/status confirmation are not unified;
- mobile appraiser work still requires opening dense table/detail surfaces.

High-value direction:

- appraiser-facing order attention summary: due pressure, revision requested, site visit missing,
  file summary, and submit/resubmit availability.

### Reviewer

Works today:

- shell profile can show `Review Queue` secondary preview;
- table supports reviewer queue mode;
- Smart Actions expose Request Revisions and Clear Review where governed;
- activity and files are available in order context.

Friction:

- review queue lacks latest submission/resubmission context, file readiness, revision loop count,
  and review age;
- decision buttons can appear without enough nearby decision context;
- complex review remains desktop-preferred, but triage could be clearer on mobile.

High-value direction:

- reviewer attention summary beside review rows/details, using already available status/due data
  first and deferring deeper revision/file contracts.

### Assignment / Vendor Recipient

Works today:

- assignment dashboard and Received Work language are the strongest current role-native execution
  path;
- offers, active work, due soon, overdue, submitted, expiration, owner review, and assignment
  instructions are surfaced in assignment-native language;
- assignment detail preserves packet-scoped visibility.

Friction:

- received-work dashboard has good metrics, but active assignment next action could be clearer at
  the row/detail level;
- correction request/owner review context depends on assignment packet fields and activity;
- mobile offer response and submission status are high-value but still web-surface dependent.

High-value direction:

- received-work next-action row copy and detail attention summary, without changing assignment
  lifecycle RPCs.

## Ranked Runtime Candidates

| Rank | Candidate slice | User value | Implementation risk | Backend dependency | Mobile value | Role impact |
|---|---|---|---|---|---|---|
| 1 | Order Detail Attention Summary Panel | High | Low | None if derived from loaded order/files/activity status only | Medium | Owner/admin, appraiser, reviewer |
| 2 | Orders Row Next-Step Support Copy | High | Low/Medium | None if derived from current row fields and Smart Action visibility | High | Owner/admin, appraiser, reviewer |
| 3 | Appraiser/Reviewer Workbench Preview Row Cards | High | Medium | None for first pass using dashboard rows; higher later | High | Appraiser, reviewer |
| 4 | Received Work Next-Action Row Copy | Medium/High | Low | None if derived from current assignment packet fields | High | Assignment/vendor recipient |
| 5 | Due Pressure Explanation Chips | Medium/High | Low | None if derived from existing due fields | High | All internal roles, assignment recipients |
| 6 | File Readiness Summary, Read-Only | High | Medium | Low for category counts, higher for expected checklist | Medium | Appraiser, reviewer, owner/admin |
| 7 | Review/Revision Context Summary | High | Medium/High | Likely needs stronger activity/revision contracts for reliable detail | Medium | Appraiser, reviewer, owner/admin |
| 8 | Stuck/Silent Work Owner Queue | High | Medium/High | Likely needs activity aging and status freshness rules | Medium | Owner/admin |
| 9 | Mobile Quick Execution Panels | High | Medium/High | Depends on selected workflow/read contracts | Very high | All roles |
| 10 | Role-Aware Notification Prioritization | Medium/High | High | Needs event taxonomy, suppression signals, preferences | High | All roles |

## Recommended First Runtime Slice

Proceed with **Operational Execution Phase 1B: Order Detail Attention Summary Panel**.

Scope:

- add a frontend-only read-only attention summary to the existing Order Detail surface;
- derive summary items only from already loaded order fields and existing document count metadata
  already available in `OrderDetail`;
- show plain operational statuses such as due pressure, review/revision state, site visit state,
  appraiser/reviewer assignment presence, file count/category count, and available current status;
- keep it presentation-only and non-authoritative;
- place it near the existing operational overview so desktop and mobile users see context before
  scanning files/activity;
- add focused presentation tests if practical.

Rationale:

- high value across owner/admin, appraiser, and reviewer roles;
- no backend/query/workflow dependency for the first pass;
- improves mobile readability without requiring a mobile app, PWA, new route, or new workflow;
- does not move Smart Actions or lifecycle controls;
- creates a reusable attention-summary pattern before adding table row next-step copy or workbench
  cards.

Explicitly out of scope for Phase 1B:

- no backend, Supabase, query, RPC, migration, RLS, or workflow change;
- no new Smart Actions or lifecycle actions;
- no movement of existing action controls;
- no status-confirmation engine;
- no notification automation;
- no document expected-checklist authority;
- no activity/revision summarization beyond already visible order fields and current document
  counts;
- no mobile/PWA/native implementation;
- no shell switching or Client Portal behavior.

## Deferred Runtime Candidates

After Phase 1B proves the attention-summary pattern:

1. **Phase 1C: Orders Row Next-Step Support Copy**
   - derive row-level support copy from status, due fields, assignment/reviewer presence, and Smart
     Action visibility;
   - do not change table columns or actions in the first pass.

2. **Phase 1D: Appraiser/Reviewer Workbench Row Cards**
   - turn secondary workbench previews from counts into small row cards using existing dashboard
     rows;
   - no new hooks or workflow actions.

3. **Phase 1E: Received Work Next-Action Copy**
   - add assignment-recipient row/detail next-action language from existing assignment status,
     due/expiration/review dates, and lifecycle action availability.

4. **Phase 1F: File Readiness Summary Planning**
   - audit category counts and expected-document assumptions before adding checklist language.

5. **Phase 1G: Stuck/Silent Work Doctrine**
   - define aging, silence, missing appointment, missing owner, missing file, and no recent
     activity rules before owner/admin exception queues or notification automation.

## Guardrails

Operational execution improvements must preserve:

- route guards and permission checks as authority;
- existing dashboard branch selection;
- existing query/filter behavior;
- Smart Actions and workflow RPC boundaries;
- lifecycle action boundaries;
- assignment packet isolation;
- document signed-download and archive governance;
- activity logging authority;
- notification delivery authority;
- mobile-safe responsive behavior without adding a mobile app or PWA surface;
- Client Portal as future-only until portal authority exists.

Operational execution improvements must avoid:

- backend/Supabase/query/workflow changes in presentation slices;
- creating fake blockers, fake priority scores, or unsupported readiness claims;
- moving lifecycle actions into row/table surfaces;
- hiding permissioned admin links or actions as if presentation were authority;
- exposing assignment packet internals to recipients where work-native language is enough;
- adding notification/email/status automation before suppression signals and owner/admin controls
  are designed.

## Phase 1A Conclusions

- Role-aware shells now make it easier to reach the right surface; the next value is making each
  surface state the next operational action more clearly.
- The highest-impact safe runtime work is an Order Detail attention summary derived from already
  loaded data.
- Row-level next-step copy, workbench row cards, received-work action copy, file readiness,
  stuck-work queues, and notification automation should follow only after the attention summary
  pattern proves useful and non-authoritative.

## Operational Execution Phase 1B Order Detail Attention Summary Panel

Phase 1B implements the first runtime operational execution improvement: a read-only attention
summary for Order Detail surfaces.

Runtime files added:

- `src/features/orders/attention/deriveOrderAttentionSummary.js`;
- `src/features/orders/attention/OrderAttentionSummaryPanel.jsx`.

Runtime files updated:

- `src/pages/orders/OrderDetail.jsx`;
- `src/components/orders/drawer/OrderDrawerContent.jsx`.

Focused tests added or updated:

- `src/features/orders/attention/__tests__/deriveOrderAttentionSummary.test.js`;
- `src/features/orders/attention/__tests__/OrderAttentionSummaryPanel.test.jsx`;
- `src/pages/orders/__tests__/OrderDetail.test.jsx`;
- `src/components/orders/drawer/__tests__/OrderDrawerContent.presentation.test.jsx`.

Phase 1B signals derive only from already loaded frontend context:

- due soon and overdue final due dates;
- review pending or review overdue state from loaded status/review due fields;
- open revisions from loaded order status;
- missing loaded site visit/appointment date;
- loaded document count and active file presence when Order Detail's existing Files card has
  returned document metadata;
- active assignment status when already present on the loaded order row;
- stale or recent loaded update context from existing timestamp fields;
- conservative fallback copy when loaded context does not show immediate attention needs.

Order Detail behavior:

- full Order Detail renders the panel after the existing operational overview;
- full Order Detail passes document metadata only after the existing Files card has loaded;
- the inline order drawer renders the same panel in compact form using the loaded order row only;
- the panel renders no buttons, links, workflow controls, lifecycle controls, or mutation
  affordances.

Phase 1B preserves:

- existing Order Detail route behavior;
- inline drawer open/close behavior;
- existing order, document, and activity loading paths;
- existing Smart Actions behavior and placement;
- lifecycle/archive/cancel/void boundaries;
- document upload/download/archive behavior;
- activity composer and timeline behavior;
- assignment panel behavior;
- route guards and permission checks;
- backend, Supabase, query, RPC, workflow, RLS, notification, automation, mobile/PWA/native, shell
  switching, DashboardGate, navigation, command palette, Client Portal, branding, and production
  data behavior.

### Phase 1B Conclusions

- Falcon now has a first non-authoritative operational attention pattern on Order Detail surfaces.
- The summary reduces scanning cost without claiming authoritative risk scoring or creating new
  workflow state.
- The next safest execution slice is row-level next-step support copy or workbench row cards, but
  both should reuse the same conservative derivation doctrine.

## Operational Execution Phase 1C Orders Row Next-Step Support Copy

Phase 1C implements lightweight read-only next-step support copy in Orders table rows.

Runtime files added:

- `src/features/orders/attention/deriveOrderRowNextStep.js`;
- `src/features/orders/attention/OrderRowNextStep.jsx`.

Runtime files updated:

- `src/components/orders/table/OrdersTableRow.jsx`.

Focused tests added or updated:

- `src/features/orders/attention/__tests__/deriveOrderRowNextStep.test.js`;
- `src/features/orders/attention/__tests__/OrderRowNextStep.test.jsx`;
- `src/features/orders/__tests__/UnifiedOrdersTable.presentation.test.jsx`.

Phase 1C derives one conservative row-level support signal from already loaded row data:

- final due overdue;
- final due soon;
- open revisions;
- review pending or review overdue;
- missing loaded appointment/site visit date;
- missing supporting files only when a row already includes an explicit loaded file/document count
  of zero;
- stale loaded update from existing timestamp fields.

Phase 1C intentionally does not show fallback/on-track copy in every row. If the loaded row does
not contain enough evidence for a conservative support signal, the row renders no next-step chip.

Phase 1C preserves:

- `UnifiedOrdersTable` query behavior;
- Orders filters, saved views, pagination, queue filters, and rowsOverride behavior;
- existing table columns and Smart Actions;
- workflow/lifecycle action behavior and placement;
- inline drawer open/close behavior;
- route guards and permission checks;
- backend, Supabase, query, RPC, workflow, RLS, notification, automation, mobile/PWA/native, shell
  switching, DashboardGate, navigation, command palette, Client Portal, branding, and production
  data behavior.

### Phase 1C Conclusions

- Orders rows now have a small presentation-only support chip when existing row data clearly
  indicates due, review, revision, appointment, file, or stale-update attention.
- The chip is not a workflow action, not a lifecycle control, and not an authority signal.
- The next safest execution slice is an appraiser/reviewer workbench row-card plan or a received
  work next-action copy plan, using the same "visible data only" doctrine.
