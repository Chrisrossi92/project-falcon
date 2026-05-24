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

## Operational Execution Phase 1D File Readiness Summary

Phase 1D implements a lightweight read-only File Readiness Summary derived from already loaded
document metadata and existing order context.

Runtime files added:

- `src/features/orders/readiness/deriveFileReadinessSummary.js`;
- `src/features/orders/readiness/FileReadinessSummary.jsx`.

Runtime files updated:

- `src/pages/orders/OrderDetail.jsx`;
- `src/components/orders/drawer/OrderDrawerContent.jsx`.

Focused tests added or updated:

- `src/features/orders/readiness/__tests__/deriveFileReadinessSummary.test.js`;
- `src/features/orders/readiness/__tests__/FileReadinessSummary.test.jsx`;
- `src/pages/orders/__tests__/OrderDetail.test.jsx`;
- `src/components/orders/drawer/__tests__/OrderDrawerContent.presentation.test.jsx`.

Phase 1D derives conservative file-readiness presentation from loaded metadata:

- no supporting files loaded;
- limited supporting files uploaded so far;
- multiple supporting documents available;
- recent document uploads detected;
- documents available for review when the loaded order status is in review;
- simple document category mix summary when categories are loaded.

Phase 1D intentionally avoids:

- required-document enforcement;
- completion percentages or scoring;
- claims that a file set is complete;
- new document queries or background checks;
- upload/download/archive behavior changes.

Phase 1D preserves:

- existing Order Detail document loading;
- existing document upload, download, archive, and error behavior;
- existing inline drawer fetch behavior;
- Smart Actions and lifecycle controls;
- route guards and permission checks;
- backend, Supabase, query, RPC, workflow, RLS, notification, automation, mobile/PWA/native, shell
  switching, DashboardGate, navigation, command palette, Client Portal, branding, and production
  data behavior.

### Phase 1D Conclusions

- Order Detail now gives users a compact, non-authoritative read on file readiness beside the
  existing Files area.
- Inline drawer rows can show file readiness only when the already fetched row includes explicit
  document/file count metadata.
- The next safest execution slice remains a workbench row-card readiness plan or received-work
  next-action copy audit using already loaded data only.

## Operational Execution Phase 1E Review / Revision Context Summary

Phase 1E implements a lightweight read-only Review / Revision Context Summary derived from already
loaded order status, review timestamps, optional activity rows, and document metadata.

Runtime files added:

- `src/features/orders/review/deriveReviewContextSummary.js`;
- `src/features/orders/review/ReviewContextSummary.jsx`.

Runtime files updated:

- `src/pages/orders/OrderDetail.jsx`;
- `src/components/orders/drawer/OrderDrawerContent.jsx`.

Focused tests added or updated:

- `src/features/orders/review/__tests__/deriveReviewContextSummary.test.js`;
- `src/features/orders/review/__tests__/ReviewContextSummary.test.jsx`;
- `src/pages/orders/__tests__/OrderDetail.test.jsx`;
- `src/components/orders/drawer/__tests__/OrderDrawerContent.presentation.test.jsx`.

Phase 1E derives conservative review/revision context:

- review pending from loaded in-review status;
- revisions open from loaded needs-revisions status;
- recent resubmission when supplied activity rows indicate resubmission;
- stale review activity from loaded review timestamps;
- recent review notes when supplied activity rows indicate review notes;
- loaded revision-loop and document-count detail chips when safe.

Phase 1E intentionally does not expose reviewer workflow enforcement:

- no request-revisions, clear-review, ready-for-client, or resubmit action changes;
- no authoritative review-state model;
- no new activity, document, or review queries;
- no risk score, SLA scoring, or blame language.

Phase 1E preserves:

- existing ActivityLog loading and composer behavior;
- existing Order Detail and inline drawer data loading;
- Smart Actions and lifecycle controls;
- route guards and permission checks;
- backend, Supabase, query, RPC, workflow, RLS, notification, automation, mobile/PWA/native, shell
  switching, DashboardGate, navigation, command palette, Client Portal, branding, and production
  data behavior.

### Phase 1E Conclusions

- Order Detail and the inline drawer now have a compact, non-authoritative review/revision context
  summary where loaded order data supports it.
- The live mounts use already available order/document context; the pure helper also supports
  activity rows when a future surface already has them in props.
- The next safest execution slice is a workbench row-card readiness plan using existing dashboard
  rows only.

## Operational Execution Phase 1F Appointment And Status Signal Planning

Phase 1F defines the future operational status-signal model before any runtime workflow,
automation, notification, lifecycle, Smart Action, backend, query, permission, mobile, or Client
Portal implementation.

This phase inspected the current execution context:

- canonical order lifecycle statuses in `src/lib/constants/orderStatus.js`;
- governed workflow transitions in `src/lib/workflow/orderWorkflow.js`;
- site visit, review due, final due, updated, document, lifecycle, and Activity surfaces in
  `src/pages/orders/OrderDetail.jsx`;
- Orders table Smart Action and site-visit handling in `src/features/orders/UnifiedOrdersTable.jsx`;
- existing derived summaries in `src/features/orders/attention`,
  `src/features/orders/readiness`, and `src/features/orders/review`;
- assignment packet status, due, expiration, submitted, and owner-review signals in
  `src/features/assignments`.

### Signal Doctrine

Operational status signals are interpretation and attention aids. They are not lifecycle states,
permission authority, assignment authority, workflow authority, or notification authority.

Rules:

- derive signals from already authoritative facts where possible;
- keep lifecycle status changes inside existing governed workflow paths;
- do not use a signal to grant route, object, file, assignment, or action access;
- do not use a signal as proof that required work is complete unless a future authoritative
  contract records that fact;
- distinguish "loaded data suggests" from "the system knows";
- prefer conservative wording such as `may need attention`, `appears active`, `no recent update
  loaded`, and `waiting in review`;
- suppress future reminder pressure only when the suppressing evidence is auditable and tied to the
  responsible object.

### Proposed Signal Categories

| Signal | First source | Category | Primary audience | Notes |
|---|---|---|---|---|
| `appointment_not_scheduled` | missing loaded `site_visit_at`/appointment date on active order | Derived-only first | Appraiser, owner/admin | Advisory only. Missing loaded date does not prove no appointment exists outside Falcon. |
| `appointment_scheduled` | loaded appointment/site visit date | Derived-only first | Appraiser, owner/admin | Safe as read-only context and future reminder suppression evidence. |
| `inspection_complete` | future explicit confirmation or workflow event | Explicit input required | Appraiser, owner/admin | Unsafe to infer from appointment date alone. |
| `report_on_track` | recent note/activity, files present, due not urgent, no blocking status | Derived-only weak signal first | Appraiser, owner/admin | Must remain phrased as `appears on track`; should not suppress reminders without audit rules. |
| `waiting_on_borrower_or_client` | future explicit user status signal or client-safe request state | Explicit input required | Appraiser, owner/admin, future client-safe projection | Unsafe to infer from silence. |
| `waiting_on_reviewer` | in-review status, reviewer assignment, review due/activity timestamps | Derived-only first | Reviewer, owner/admin, appraiser context | Safe as `waiting in review`; not proof of reviewer fault. |
| `waiting_on_appraiser` | needs-revisions status or appraiser-assigned active order | Derived-only first | Appraiser, reviewer, owner/admin | Safe when lifecycle status already indicates revisions. |
| `extension_may_be_needed` | overdue/due-soon plus stale or blocking signal | Derived-only advisory first, explicit later | Owner/admin, appraiser | Should not auto-change due dates. |
| `stale_no_update` | loaded `last_activity_at`/`updated_at` age | Derived-only first | Owner/admin, appraiser/reviewer where scoped | Use `no recent loaded update`, not `no one worked`. |
| `overdue_no_recent_signal` | due date past plus stale update/activity | Derived-only first | Owner/admin, responsible role | High owner/admin attention signal; not an escalation engine yet. |
| `active_review_revision_loop` | in-review/needs-revisions status plus loaded revision activity | Derived-only first | Reviewer, appraiser, owner/admin | Needs stronger activity contracts before loop counts become authoritative. |
| `awaiting_assignment_response` | assignment status `offered` and expiration/due context | Derived-only first | Assignment recipient, owner/admin | Packet-scoped; no canonical order visibility expansion. |
| `awaiting_assignment_submission` | assignment status `accepted`/`in_progress` and due context | Derived-only first | Assignment recipient, owner/admin | Advisory until vendor status updates exist. |
| `awaiting_owner_assignment_review` | assignment status `submitted` | Derived-only first | Owner/admin, assignment recipient | Safe as owner-review context inside assignment-scoped surfaces. |

### Derived-Only Signals Safe First

These signals can safely begin as read-only helpers because current loaded data already supports
conservative wording:

- appointment not scheduled;
- appointment scheduled;
- waiting in review;
- revisions open / waiting on appraiser follow-up;
- due soon or overdue;
- stale/no loaded update;
- overdue with no recent loaded update;
- limited/no supporting files loaded;
- files available for review;
- assignment offer awaiting response;
- assignment submitted awaiting owner review.

Derived-only signals may affect presentation priority later, but they should not trigger workflow,
email, push, escalation, or reminder suppression until audit, ownership, rate-limit, and owner/admin
configuration rules exist.

### Signals Requiring Explicit User Input

These should not be inferred from current timestamps or lifecycle status alone:

- inspection complete;
- borrower/client contacted;
- waiting on borrower;
- waiting on client documents;
- report writing on track;
- extension requested;
- extension approved;
- reviewer intentionally holding review;
- appraiser intentionally holding revision response;
- assignment/vendor actively working but not ready to submit.

Future input surfaces should be quick, role-scoped, and auditable. The first version should record
status-signal events, not mutate canonical lifecycle status unless the user chooses a governed
workflow action.

### Future Automation Relationship

Operational signals may eventually drive reminder suppression or escalation, but only after an
automation contract exists.

Signals that may suppress reminder pressure later:

- appointment scheduled after an appointment reminder;
- recent appraiser note or explicit `work on track` confirmation;
- submit/resubmit to review;
- reviewer note, request revisions, or clear review;
- document upload for a document-readiness reminder;
- assignment accept/decline/submit;
- owner/admin manual acknowledgement or exclusion.

Signals that may increase owner/admin attention later:

- overdue with no recent loaded update;
- due soon with appointment not scheduled;
- needs revisions with no recent appraiser response;
- in review with stale review activity;
- assignment offer expiring soon without response;
- submitted assignment awaiting owner review past review due;
- repeated revision-loop evidence after stronger activity contracts exist.

Anti-spam rules:

- never alert every owner/admin for every visible event;
- suppress duplicate reminders across email, in-app, and future push for the same object/event;
- require quiet hours, rate limits, and owner/admin thresholds before escalation;
- require object visibility and responsibility checks before recipient selection;
- expose why a reminder was sent, skipped, suppressed, or escalated.

### Role And Visibility Guidance

Appraisers should eventually be able to set quick operational signals such as appointment
scheduled, inspection complete, waiting on borrower/client, work on track, extension may be needed,
and revision response in progress. These inputs should sit near Order Detail, mobile assigned-work
cards, or a future appraiser workbench, but must not bypass submit/resubmit workflow actions.

Reviewers should see waiting-in-review, stale review activity, resubmission, revision loop, file
readiness, and due pressure signals. Future reviewer quick inputs should focus on review note
added, review actively in progress, request revisions, and clear review. Only governed review
workflow actions should change lifecycle status.

Owner/admin users should see the broadest signal set: overdue/silent work, missing appointment,
stale review/revision loops, unassigned work, assignment response state, and submitted assignment
owner-review state. Owner/admin signals should be exception-oriented and digest-friendly rather
than a feed of all visible events.

Assignment recipients should see only assignment-scoped signals: offer awaiting response, offer
expiring, active work due soon, submitted awaiting owner review, correction requested where the
assignment contract supports it, and completed/terminal state. These signals must not imply
canonical order/client access.

Future client portal users should see only client-safe projections: action needed, document
requested, request in progress, report available, message received, or completed request. Internal
review, appraiser, vendor, packet, and workflow signals should stay hidden unless explicitly
designed as client-safe status milestones.

### Mobile Execution Implications

Mobile should prioritize quick operational confirmation rather than dense status editing.

Future mobile-safe placements:

- appraiser assigned-work card: appointment scheduled, inspection complete, work on track, needs
  help/extension;
- reviewer queue card: review active, request revisions, clear review where safe;
- owner/admin exception card: acknowledge, open order, reassign, or defer follow-up;
- assignment recipient card: accept/decline offer, active work update, submit work.

Mobile quick signals should be thumb-safe, explicit, reversible where possible, and clear about
whether they are a note/status signal or a lifecycle workflow action.

### Unsafe Without Backend Authority

These must wait for backend/RPC, audit, permission, and data contracts:

- authoritative `inspection complete` state;
- authoritative `work on track` status used for suppression;
- client-safe request status projection;
- automation send/suppress/escalation state;
- owner/admin configurable reminder rules;
- status-signal event tables;
- quick-action links from email or push;
- notification delivery triggered by signals;
- SLA or risk scoring;
- required-document completion enforcement.

### Phase 1F Conclusions

- Falcon should add an operational signal layer, but keep it separate from lifecycle status.
- The first safe signal layer is derived-only and read-only, using existing appointment, due,
  update, review, file, and assignment facts.
- Explicit user input is required before Falcon can know why work is waiting, whether inspection is
  complete, whether a borrower/client is blocking progress, or whether reminder pressure should be
  suppressed.
- Future automation should consume auditable status-signal evidence, not infer intent from silence.
- The safest first runtime slice is a pure operational status-signal resolver with tests and no UI
  mount.

## Recommended Next Slice

Proceed with **Operational Execution Phase 1G: Passive Operational Status Signal Resolver And
Tests**.

Phase 1G should add a pure helper that derives presentation-only operational signals from supplied
order, document, activity, and assignment-like props. It should not mount UI, add queries, change
workflow or Smart Actions, trigger automation/notifications, alter permissions/routes/navigation,
or implement mobile/PWA/native or Client Portal behavior.

## Operational Execution Phase 1G Passive Operational Status Signal Resolver And Tests

Phase 1G adds the first passive operational status-signal runtime foundation as a pure,
presentation-only resolver plus focused tests.

Runtime files added:

- `src/features/orders/signals/deriveOperationalStatusSignals.js`;
- `src/features/orders/signals/__tests__/deriveOperationalStatusSignals.test.js`.

Phase 1G behavior:

- accepts plain loaded order, activity, document, document-count, assignment, and assignment-list
  metadata;
- returns stable derived signal records with `id`, `severity`, `label`, `message`, `source`, and
  `sourceHints`;
- remains deterministic and side-effect free;
- does not mount UI or connect to live dashboard, Orders table, Order Detail, drawer, navigation,
  command palette, workflow, automation, notifications, or backend behavior.

Supported derived signal ids:

- `appointment_not_scheduled`;
- `appointment_scheduled`;
- `review_pending`;
- `revisions_open`;
- `due_soon`;
- `overdue`;
- `stale_update`;
- `overdue_no_recent_update`;
- `limited_files`;
- `files_ready_for_review`;
- `assignment_offer_waiting`;
- `assignment_review_pending`.

Explicit-intent signals intentionally not inferred:

- `inspection_complete`;
- `report_on_track`;
- `waiting_on_borrower`;
- `waiting_on_client_documents`;
- `extension_requested`;
- `reviewer_holding_review`;
- similar borrower/client, extension, hold, or active-work intent states.

Phase 1G preserves:

- no backend, Supabase, query, RPC, workflow, RLS, permission, route, navigation, command palette,
  DashboardGate, Smart Action, lifecycle, automation, notification delivery, UI mount,
  mobile/PWA/native, shell switching, Client Portal, branding, or production data change;
- no new activity, document, assignment, review, or order query;
- no reminder suppression or escalation behavior.

### Phase 1G Conclusions

- Falcon now has a tested pure helper for conservative operational status signals.
- The resolver can support future UI surfaces, but it is not connected to live runtime behavior.
- Explicit user-intent states remain blocked until auditable input and authority contracts exist.
- The next safest slice is a mount-readiness plan that decides where, if anywhere, these signals
  should appear first without changing workflow or automation behavior.

## Recommended Next Slice

Proceed with **Operational Execution Phase 1H: Operational Signal Mount Readiness Plan**.

Phase 1H should decide whether the passive operational status signals should first appear in Order
Detail, the inline drawer, Orders rows, or appraiser/reviewer workbench row cards. It should remain
documentation-only and should not mount UI, add queries, change workflow or Smart Actions, trigger
automation/notifications, alter permissions/routes/navigation, or implement mobile/PWA/native or
Client Portal behavior.

## Operational Execution Phase 1H Operational Signal Surface Mount Planning

Phase 1H plans how the passive operational status-signal resolver can safely surface in UI without
becoming workflow, automation, notification, or lifecycle authority.

This phase inspected current mounted execution surfaces:

- `OrderAttentionSummaryPanel` in full Order Detail and inline Order Drawer;
- `OrderRowNextStep` in Orders table rows;
- `FileReadinessSummary` in Order Detail Files and inline Order Drawer;
- `ReviewContextSummary` near Order Detail Activity and inline Order Drawer;
- `OrderDetail` schedule, files, activity, Smart Actions, lifecycle, assignment, and notes
  placement;
- `OrderDrawerContent` summary stack and inline activity/contact/map sections;
- `OrdersTableRow` row body and existing next-step chip.

### Mount Strategy Decision

Do not add a separate fourth `Status Signals` panel as the first runtime mount.

Recommended first mount path:

- adapt `OrderAttentionSummaryPanel` to consume `deriveOperationalStatusSignals(...)` behind its
  existing read-only panel boundary;
- keep the existing `Attention Summary` heading, `Derived` badge, and read-only framing;
- dedupe or replace overlapping attention signals rather than stacking duplicate due/review/file
  messages from multiple helpers;
- keep File Readiness and Review Context as specialized summaries for richer detail, not as
  competing authority;
- keep Orders row `OrderRowNextStep` unchanged until a separate row-level rationalization slice.

Reasoning:

- Attention Summary is already the broad operational interpretation surface;
- the resolver returns multiple signals and matches the existing panel shape;
- mounting there avoids creating another visual layer in Order Detail and the drawer;
- it keeps the first mount reversible and testable;
- users already understand the panel as derived, read-only context.

### Strategies Considered

| Strategy | Decision | Reason |
|---|---|---|
| Mount inside `OrderAttentionSummaryPanel` | Recommended first | Reuses the existing broad read-only summary surface and avoids adding clutter. |
| Add a separate `Status Signals` panel | Defer | Would duplicate Attention Summary and make the drawer/detail stack feel noisy. |
| Add chips beside File/Review summaries | Defer | Specialized summaries already own file/review detail; generic chips risk repetition. |
| Replace row-level next-step copy immediately | Defer | Row-level copy is intentionally single-signal and compact; the new resolver returns multiple signals. |
| Keep resolver unmounted | Acceptable fallback | If duplication cannot be controlled cleanly, keep the resolver passive until a consolidated summary component exists. |

### Signals Safe To Show First

Safe first UI signals in `Attention Summary`:

- `appointment_not_scheduled`;
- `appointment_scheduled`;
- `review_pending`;
- `revisions_open`;
- `due_soon`;
- `overdue`;
- `stale_update`;
- `overdue_no_recent_update`;
- `limited_files`;
- `files_ready_for_review`;
- `assignment_offer_waiting`;
- `assignment_review_pending`.

Recommended first visible subset:

- due and overdue signals;
- overdue with no recent update;
- stale update;
- appointment not scheduled / scheduled;
- review pending;
- revisions open;
- assignment offer waiting;
- assignment review pending.

File signals can appear later or remain in `FileReadinessSummary` to avoid duplicate file messaging.
`files_ready_for_review` is useful, but should be shown only if duplicate file readiness copy is
suppressed or clearly secondary.

### Signals To Keep Internal Or Future-Only

Do not show or infer these in UI until explicit input and authority contracts exist:

- inspection complete;
- report on track;
- waiting on borrower;
- waiting on client documents;
- extension requested;
- reviewer holding review;
- appraiser holding revision response;
- assignment/vendor actively working but not ready to submit;
- any automation send/suppress/escalation state;
- any SLA/risk score or required-document completion claim.

### Wording And Severity Rules

Wording rules:

- use `loaded`, `appears`, `may need`, and `pending` language where evidence is derived;
- do not say a person failed to act;
- do not say a document set is complete;
- do not say an appointment does not exist outside Falcon;
- do not imply reminder suppression, escalation, or workflow state;
- label all mounted signals as `Derived`.

Severity mapping:

- `critical`: overdue and overdue with no recent update;
- `attention`: due soon, stale update, review pending, revisions open, appointment not scheduled,
  assignment response pending, assignment review pending, limited files;
- `ready`: appointment scheduled and files ready for review;
- `info`: reserved for future neutral context.

Escalation rule:

- severity is visual priority only. It must not trigger automation, notifications, workflow
  changes, route access, or Smart Action availability.

### Data And Duplication Rules

The first runtime mount should pass only already loaded props:

- `order`;
- `documents` only when the current surface already has them loaded;
- `documentCount` only when already present on the row;
- `activities` only when a future surface already has them in props;
- `assignment` / `assignments` only when already present in props.

Duplication rules:

- if `OrderAttentionSummaryPanel` uses the new resolver, it should not also render duplicate
  `deriveOrderAttentionSummary(...)` output for the same signal ids;
- file readiness detail should remain in `FileReadinessSummary`;
- review/revision detail should remain in `ReviewContextSummary`;
- row-level `OrderRowNextStep` should remain single-signal until separately migrated.

### First Safe Runtime Mount Slice

The safest first runtime mount slice is **Operational Execution Phase 1I: Attention Summary Signal
Resolver Integration**.

Phase 1I scope:

- update `OrderAttentionSummaryPanel` to derive its broad summary from
  `deriveOperationalStatusSignals(...)`;
- keep the existing component name, placement, heading, description, `Derived` badge, and
  read-only card layout;
- map resolver `severity` values to the existing panel tone classes;
- pass only already loaded order/document/document-count props;
- preserve File Readiness and Review Context specialized panels;
- keep Orders row `OrderRowNextStep` unchanged;
- add focused presentation tests for due/overdue/stale/review/revision/appointment/assignment
  signal rendering and no action controls.

Phase 1I must not:

- add a new panel;
- change Smart Actions;
- change workflow/lifecycle behavior;
- add backend, Supabase, query, RPC, activity, assignment, or document fetches;
- trigger automation, notifications, reminder suppression, or escalation;
- change permissions, routes, navigation, command palette, DashboardGate, dashboard data, mobile,
  shell switching, or Client Portal behavior.

### Phase 1H Conclusions

- Operational status signals should first surface through the existing Attention Summary boundary,
  not as a separate UI stack.
- File and review summaries should stay specialized and detailed.
- Row-level signal usage should wait until the row next-step chip is intentionally consolidated.
- The next runtime slice should be a narrow Attention Summary resolver integration with tests and
  no behavior outside presentation.

## Operational Execution Phase 1I Attention Summary Signal Resolver Integration

Phase 1I integrates the passive operational status signal resolver into the existing Attention
Summary derivation path.

Runtime files updated:

- `src/features/orders/attention/deriveOrderAttentionSummary.js`;
- `src/features/orders/attention/OrderAttentionSummaryPanel.jsx`.

Focused tests updated:

- `src/features/orders/attention/__tests__/deriveOrderAttentionSummary.test.js`.

Phase 1I changes:

- `deriveOrderAttentionSummary(...)` now calls `deriveOperationalStatusSignals(...)` after the
  existing attention signals are derived;
- only approved presentation-safe signal ids are eligible for Attention Summary rendering;
- resolver `severity` values are mapped to existing Attention Summary tones;
- overlapping concepts are deduped so due, review, revision, appointment, stale-update, file, and
  assignment messages are not stacked twice;
- `overdue_no_recent_update` can enrich overdue stale orders as a higher-signal derived attention
  message;
- assignment offer/submitted states can render specific response/review-pending language instead
  of the older generic assignment-active message;
- `OrderAttentionSummaryPanel` accepts optional `activities`, `assignment`, and `assignments`
  props for future already-loaded context, while current mounts continue to pass existing loaded
  order/document context only.

Safe visible status signal ids:

- `appointment_not_scheduled`;
- `appointment_scheduled`;
- `review_pending`;
- `revisions_open`;
- `due_soon`;
- `overdue`;
- `stale_update`;
- `overdue_no_recent_update`;
- `assignment_offer_waiting`;
- `assignment_review_pending`.

Signals intentionally not surfaced:

- inspection complete;
- report on track;
- waiting on borrower;
- waiting on client documents;
- extension requested;
- reviewer/appraiser hold intent;
- automation suppression/escalation state;
- SLA/risk scoring;
- required-document completion claims.

Phase 1I preserves:

- the existing `OrderAttentionSummaryPanel` heading, description, `Derived` badge, placement, and
  read-only card layout;
- the existing Order Detail and inline drawer mounts;
- File Readiness and Review Context as specialized summaries;
- Orders row `OrderRowNextStep` behavior;
- dashboard, navigation, command palette, route, permission, backend, Supabase, query, RPC,
  workflow, Smart Action, lifecycle, automation, notification, mobile/PWA/native, shell switching,
  Client Portal, branding, and production data behavior.

Phase 1I test coverage proves:

- safe operational status signals enrich the Attention Summary when evidence exists;
- duplicate due/stale signals are avoided;
- assignment offer context uses specific response-pending language rather than duplicate generic
  assignment language;
- conservative fallback remains available when loaded context shows no attention need;
- future/internal-only intent and automation fields do not render attention messages.

### Phase 1I Conclusions

- The operational status resolver is now live only inside the existing read-only Attention Summary
  path.
- The integration enriches derived presentation copy without creating a new panel, action,
  workflow state, notification, or authority surface.
- Row-level signal integration and richer activity/assignment-fed signal mounting remain deferred.

## Operational Execution Phase 2A Operational Status Input Architecture

Phase 2A begins the next constrained MVP-convergence planning layer:

- explicit human operational status inputs;
- non-authoritative operational evidence;
- future suppression context;
- no lifecycle/workflow authority change.

New planning document:

- `docs/OPERATIONAL_STATUS_INPUT_ARCHITECTURE.md`.

Phase 2A defines first-wave explicit inputs:

- `inspection_scheduled`;
- `report_on_track`;
- `waiting_on_client`.

Doctrine decisions:

- lifecycle states remain workflow authority;
- operational inputs are explicit, auditable, time-sensitive context;
- operational inputs may later suppress or soften derived attention signals while fresh;
- operational inputs must not unlock workflow actions, change lifecycle state, change permissions,
  route access, object visibility, RLS/RPC behavior, notifications, or automation;
- future automation may consume these inputs only after separate owner/admin-configurable,
  auditable, rate-limited automation contracts exist;
- no AI inference should create these inputs from silence or weak evidence.

Phase 2A also defines:

- lifecycle state versus operational context boundaries;
- explicit operational input categories;
- freshness and expiration doctrine;
- signal suppression hierarchy;
- activity logging expectations;
- mobile interaction doctrine;
- future automation compatibility;
- explicit non-goals.

Recommended next constrained planning slice:

- **Operational Execution Phase 2B: Operational Status Input Data Contract Plan**.

Phase 2B should define the minimum future data contract, authorization boundaries, activity log
shape, freshness fields, and tests before any runtime or schema implementation.

Phase 2A preserves:

- no runtime UI;
- no schema, migration, Supabase, RLS, RPC, query, backend, Smart Action, lifecycle, workflow,
  notification, automation, route, navigation, dashboard, command palette, mobile/PWA/native,
  Client Portal, AI, branding, or production data change.

## Operational Execution Phase 2B Operational Status Input Data Contract Plan

Phase 2B adds the docs-only data-contract plan for explicit operational status inputs.

New planning document:

- `docs/OPERATIONAL_STATUS_INPUT_DATA_CONTRACT_PLAN.md`.

Phase 2B defines:

- operational inputs as lightweight evidence records;
- why Falcon should not create a single `current_operational_status` field;
- first-wave input contracts for `inspection_scheduled`, `report_on_track`, and
  `waiting_on_client`;
- suggested fields such as `order_id`, `input_type`, `actor_user_id`, actor role/context,
  `created_at`, `expires_at`, `cleared_at`, optional note/context, manual source, and future-safe
  payload JSON;
- freshness and expiration behavior;
- the suppression resolver hierarchy: lifecycle/workflow state, valid explicit evidence, passive
  derived signals, then fallback heuristics;
- activity logging and audit expectations;
- permission/RLS planning for owner/admin, appraiser, reviewer, assignment-recipient, and future
  client boundaries;
- mobile interaction implications;
- future automation compatibility.

Phase 2B preserves:

- no runtime code;
- no schema changes;
- no Supabase migration;
- no UI changes;
- no automation or notifications;
- no lifecycle mutation or Smart Action changes;
- no route, navigation, dashboard, command palette, mobile/PWA/native, Client Portal, AI, branding,
  or production data change.

Recommended next constrained planning slice:

- **Operational Execution Phase 2C: Operational Status Input Authorization And Activity Plan**.

## Operational Execution Phase 2C Operational Status Input Authorization And Activity Plan

Phase 2C adds the docs-only authorization and activity plan for explicit operational status inputs.

New planning document:

- `docs/OPERATIONAL_STATUS_INPUT_AUTHORIZATION_AND_ACTIVITY_PLAN.md`.

Phase 2C defines:

- authorization principles for operational inputs as permission-scoped, company-scoped,
  non-authoritative evidence records;
- recommended first-wave create/view/clear posture for appraisers, reviewers, admins, and owners;
- create rules for assigned orders, assigned review orders, and owner/admin company scope;
- clear rules for the original actor and owner/admin users;
- view rules tied to order visibility;
- activity logging expectations for create and clear events;
- human-readable activity copy such as `Inspection scheduled.`, `Report marked on track.`,
  `Waiting on client response.`, and clear-event copy;
- RLS/RPC planning that avoids direct broad public inserts and requires narrow governed mutation
  paths later;
- abuse and staleness protections so inputs cannot hide overdue work indefinitely.

Phase 2C preserves:

- no runtime code;
- no schema changes;
- no Supabase migration;
- no UI changes;
- no automation or notifications;
- no lifecycle mutation or Smart Action changes;
- no route, navigation, dashboard, command palette, mobile/PWA/native, Client Portal, AI, branding,
  or production data change.

Recommended next constrained planning slice:

- **Operational Execution Phase 2D: Operational Status Input Runtime Slice Readiness Plan**.

## Operational Execution Phase 2D Operational Status Input Runtime Slice Readiness Plan

Phase 2D defines the smallest safe runtime implementation boundary for explicit operational status
inputs before schema or UI work begins.

New planning document:

- `docs/OPERATIONAL_STATUS_INPUT_RUNTIME_SLICE_READINESS_PLAN.md`.

Phase 2D defines the first possible runtime slice:

- **Operational Execution Phase 2E: Operational Status Input Schema/RPC Foundation**.

Phase 2E allowed scope:

- operational input persistence foundation;
- narrow controlled create/clear RPCs;
- server-side audit/activity behavior where feasible;
- RLS policies and grants required for the persistence foundation;
- SQL/RPC safety verification.

Phase 2E explicit non-goals:

- no UI;
- no dashboard changes;
- no Attention Summary changes;
- no signal suppression integration;
- no automation;
- no notifications;
- no lifecycle/status mutation;
- no Client Portal;
- no mobile app work;
- no AI inference.

Stop condition:

- after Phase 2E, pause and review schema, RLS, RPC behavior, activity/audit output, source-scan
  results, and MVP blocker justification before adding UI or signal integration.

Phase 2D preserves:

- no runtime code;
- no schema changes;
- no Supabase migration;
- no UI changes;
- no automation or notifications;
- no lifecycle mutation or Smart Action changes;
- no route, navigation, dashboard, command palette, mobile/PWA/native, Client Portal, AI, branding,
  or production data change.

## Operational Execution Phase 2E Operational Status Input Schema/RPC Foundation

Phase 2E adds the first runtime/backend foundation for explicit operational status inputs.

Runtime migration added:

- `supabase/migrations/20260524090000_order_operational_inputs.sql`.

Phase 2E implements:

- `public.order_operational_inputs` as a non-authoritative operational evidence table;
- first-wave input types for `inspection_scheduled`, `report_on_track`, and
  `waiting_on_client`;
- manual source only;
- freshness windows calculated by the create RPC;
- RLS read scope tied to current company and existing order-read authority;
- blocked direct authenticated insert, update, and delete paths;
- controlled RPCs for create and clear;
- audit-preserving clear behavior through `cleared_at` and `cleared_by_user_id`;
- server-side activity events for create and clear where feasible.

Phase 2E preserves:

- no UI;
- no dashboard, Orders page, Order Detail, drawer, or Attention Summary changes;
- no signal suppression integration;
- no lifecycle/status mutation;
- no Smart Action changes;
- no automation or notifications;
- no route, navigation, command palette, mobile/PWA/native, Client Portal, AI, branding, or
  production data behavior change.

Stop condition:

- pause after Phase 2E for schema, RLS, RPC behavior, activity output, source-scan, and MVP blocker
  review before adding UI, signal integration, automation, notification, or mobile execution
  behavior.

## Operational Execution Phase 2H Operational Status Input Read-Only Surface Plan

Phase 2H adds the docs-only read-only surface plan for Phase 2E operational evidence records.

New planning document:

- `docs/OPERATIONAL_STATUS_INPUT_READ_ONLY_SURFACE_PLAN.md`.

Phase 2H defines:

- active/fresh operational inputs as the first visible read shape;
- small read-only chips or rows on Order Detail or the order drawer;
- first-wave labels for `inspection_scheduled`, `report_on_track`, and `waiting_on_client`;
- optional actor, created timestamp, freshness, and safe note metadata;
- direct RLS-backed reads only if safe, otherwise a separate read-only RPC/view before frontend
  display;
- no create/clear controls, forms, direct writes, signal suppression, dashboard integration,
  automation, notifications, lifecycle mutation, mobile-specific build, Client Portal exposure, or
  AI inference.

Recommended next runtime slice:

- **Operational Execution Phase 2I: Read-Only Operational Input Display**.

Phase 2I should prove read-only display only and then pause before create/clear UI or Attention
Summary suppression integration.

## Operational Execution Phase 2I Read-Only Operational Input Display

Phase 2I adds the first frontend read-only display for active/fresh operational input evidence.

Runtime files added:

- `src/features/orders/operational-inputs/orderOperationalInputsApi.js`;
- `src/features/orders/operational-inputs/useOrderOperationalInputs.js`;
- `src/features/orders/operational-inputs/OperationalInputsReadOnly.jsx`.

Runtime files updated:

- `src/pages/orders/OrderDetail.jsx`;
- `src/components/orders/drawer/OrderDrawerContent.jsx`.

Phase 2I behavior:

- reads `order_operational_inputs` through the existing Supabase client under Phase 2E RLS;
- filters to active/fresh inputs for the current order only;
- renders a calm secondary `Operational Context` evidence surface in Order Detail and the drawer;
- shows first-wave labels for `inspection_scheduled`, `report_on_track`, and
  `waiting_on_client`;
- includes actor role, created timestamp, freshness timestamp, and note only when present;
- renders no mutation controls.

Phase 2I preserves:

- no create/clear UI;
- no forms;
- no direct writes;
- no signal suppression integration;
- no lifecycle/status mutation;
- no Smart Action changes;
- no Orders table, dashboard, route, navigation, command palette, mobile/PWA/native, Client
  Portal, automation, notification, AI, branding, or production data behavior change.

Recommended next step:

- pause and review read-only display behavior before any create/clear UI or Attention Summary
  suppression integration.
