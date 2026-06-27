# Falcon Order Detail Experience Plan

## Purpose

This plan records how the Order Detail page should evolve before implementation work begins. It is
an architecture and UX inspection only.

It does not approve runtime behavior changes, workflow changes, data-fetching changes, schema
changes, RPC changes, permission changes, route changes, or new product features.

## Review Scope

Reviewed:

- `src/pages/orders/OrderDetail.jsx`
- `src/features/orders/attention/OrderAttentionSummaryPanel.jsx`
- `src/features/orders/readiness/FileReadinessSummary.jsx`
- `src/features/orders/review/ReviewContextSummary.jsx`
- `src/features/assignments/components/OwnerOrderAssignmentsPanel.jsx`
- `src/features/bids/components/BidRequestsPanel.jsx`
- `src/features/vendors/components/VendorAssignmentCandidatesPanel.jsx`
- `src/components/dates/SiteVisitPicker.jsx`
- `docs/architecture/FALCON_PRODUCT_EXPERIENCE_AUDIT.md`
- Falcon UX, design system, motion, interaction, and Sprint 1 checkpoint guidance

## Current Strengths

### It Has The Right Raw Ingredients

Order Detail already contains the information users need to understand and advance an order:

- Order number
- Workspace context
- Status
- Client
- Property
- Due dates
- Site visit
- Smart Action
- Needs Attention
- Activity
- Documents
- Notes
- Assignment state
- AMC bid/procurement state
- Lifecycle and administrative actions

The issue is not missing content. The issue is hierarchy, consistency, and how many decisions are
presented at once.

### Smart Action Exists In The Right Conceptual Place

The Smart Action pattern is the right top-level workflow idea. It answers the product question:

> What should I do next?

That should remain one of the most important elements on the page.

### Role And Workspace Gating Are Meaningful

The page already adapts for operations mode, appraiser execution, reviewer review, AMC order
detail, assignment permissions, bid permissions, and lifecycle authority. Future polish should
preserve this behavior and should not simplify it by weakening access rules.

### Derived Context Is Useful

Needs Attention, File Readiness, Review Context, and AMC bid status panels are useful because they
interpret order state rather than merely listing fields.

These panels should become more consistent insight/warning surfaces, not be removed.

### Procurement Is Already Partly Deferred

When an active vendor assignment exists, procurement details are placed behind a native disclosure.
That is the right direction: after a vendor assignment exists, detailed procurement history should
not compete with the current order workflow.

## Current Weaknesses

### Information Hierarchy

What the user sees first:

- Workspace badge
- "Order Detail" eyebrow
- Order number
- Status badge
- Copy button
- Client
- Property
- Property type
- Created date
- Smart Action
- Operational inputs
- Offer Assignment / Edit / Print Packet / Back / More actions
- Archive or lifecycle notices
- AMC bid status
- Needs Attention
- Operational Overview

This is too many first-viewport objects. The page has the correct information, but several
elements compete for the first read.

What deserves emphasis:

1. Order identity and status
2. Property and client
3. Required attention or blockers
4. One next Smart Action
5. Key schedule pressure
6. Current assignment/procurement state when relevant

What currently competes:

- Copy button competes with identity despite being utility-level.
- Created date appears in the first summary grid even though it is supporting context.
- Operational inputs appear beside Smart Action and can compete with the primary workflow.
- Secondary actions sit in a boxed toolbar with similar visual weight to workflow actions.
- Activity, map, files, notes, assignments, and procurement all become large page sections after
  the overview.

### Workflow Hierarchy

Primary action:

- `primarySmartAction` should be the dominant workflow control when available.

Secondary actions:

- Offer Assignment
- Edit
- Print Packet
- Back
- More actions
- Site Visit change
- Document upload/download/archive
- Assignment refresh/open packet
- Procurement request bids / offer / select bid / record response

Actions that can be deferred or made quieter:

- Copy order number
- Print Packet
- Edit
- Back
- More actions
- Created date
- Long notes
- Full activity history
- Full procurement details after assignment exists
- Detailed document category lists when no document action is pending

### Section Organization

Should always remain visible near the top:

- Order identity
- Status
- Client
- Property
- Key due dates
- Smart Action
- Needs Attention when it has actionable signals
- Current assignment/procurement summary when relevant

Can remain visible but quieter:

- Workspace context
- Property type
- Report type
- Site visit
- Review due
- Final due
- Current appraiser/reviewer/vendor
- File readiness summary

Could collapse or defer:

- Full operational overview subsections after the first key fields
- Contacts / Map
- Notes
- Full Activity
- Full Files list when there are many documents
- Company Assignments detail rows
- Eligible vendors and vendor candidate details
- Bid request recipient details
- Procurement history after active assignment exists
- Print packet modal content until invoked

Information that repeats elsewhere:

- Client appears in the top summary and Order / Client overview.
- Property appears in top summary, Property / Assignment overview, map section, and procurement
  order summary payload.
- Contact appears in Operational Overview and Contacts / Map.
- Due dates appear in Overview, Smart Action context indirectly, assignment/procurement panels,
  and document/package previews.
- Assignment state appears in AMC bid status, Vendor Assignment overview, assignment panels, and
  procurement panels.

Repeating information is sometimes useful, but repeated fields should not have equal weight.

## State Quality

### Loading

Current state:

- Top-level loading is plain `Loading...`.
- Files use `Loading files...`.
- Assignments use `Loading company assignments...`.
- Eligible vendors use `Loading eligible vendors...`.
- Vendor candidates use a local status card.
- Bid requests and modal forms use local loading/saving labels.

Plan:

- Use shared state primitives for top-level loading, section loading, and known-shape skeletons.
- Prefer skeletons for order header, overview fields, files, assignments, and procurement rows.
- Keep loading calm and layout-preserving.

### Empty

Current state:

- No files uploaded yet.
- No company assignments.
- No eligible vendors matched.
- No suggested vendors.
- No guided action.
- Notes fall back to `-`.

Plan:

- Use `FalconEmptyState` for meaningful empty sections.
- Keep empty states task-oriented where an action exists:
  - Upload engagement package.
  - Offer Assignment.
  - Request bids after eligible vendors are available.
- Keep passive absence quiet:
  - No notes.
  - No active vendor assignment.

### Updating

Current state:

- Smart Action uses `Working...`.
- Document upload uses upload status text.
- Document archive uses `Archiving...`.
- Lifecycle and status override dialogs use submitting labels.
- Site visit save relies mainly on toast/error behavior.
- Assignment refresh disables the refresh button.

Plan:

- Use `FalconUpdatingIndicator` for inline saving/updating where the action does not block the
  whole page.
- Keep button labels specific for blocking submit actions.
- Avoid page-wide loading after localized actions unless data truly reloads.

### Error

Current state:

- Top-level failed load is plain red text.
- Files unavailable is plain amber text.
- Assignment error uses an assignment-local `ErrorState`.
- Eligible vendor and vendor candidate errors are local cards.
- Smart Action errors are inline red text.
- Modal errors are local red/rose alert boxes.

Plan:

- Use `FalconErrorState` for recoverable section failures.
- Keep destructive/lifecycle errors serious but not visually overwhelming.
- Keep error copy specific and action-oriented.
- Preserve security-safe messaging and avoid exposing internal identifiers or storage paths.

### Success

Current state:

- Success is mostly toast-based.
- Upload complete uses inline text.
- Workflow action completed uses toast and refresh.

Plan:

- Keep toasts for global confirmation.
- Use `FalconSuccessState` or subtle inline confirmation only where it reduces uncertainty after a
  local action, such as document upload or save completion.
- Do not add success animation for decoration.

## Interaction Quality

### Hover And Press

Current state:

- Buttons and links mostly use local hover classes.
- More Actions menu items use local hover states.
- Document rows and procurement rows use local card styles.
- Some passive surfaces look similar to clickable surfaces.

Plan:

- Apply `falconInteractionClassNames` or `FalconInteractiveSurface` only to existing clickable
  elements.
- Do not make passive overview cards, static summary fields, or read-only insight panels look
  clickable.
- Use quiet secondary action styles for Edit, Print Packet, Back, Copy, Refresh, Download, and
  Close controls.

### Focus And Keyboard

Current state:

- Native buttons and links are generally keyboard reachable.
- Modal focus handling is inconsistent across local modals.
- Native `details` gives keyboard behavior but is visually separate from Falcon's shared collapse
  patterns.
- More Actions uses `role="menu"` and `role="menuitem"` but currently relies on local open/close
  behavior.

Plan:

- Preserve keyboard reachability and visible focus.
- Standardize focus-visible rings through shared interaction helpers.
- Ensure dialog close buttons and primary submit buttons have predictable focus.
- Use shared collapse behavior later only if it preserves native keyboard clarity.

### Motion

Current state:

- Order Detail does not yet use shared motion primitives.
- Native disclosures and local modals open abruptly.
- Some supporting components use raw animated icon classes, such as refresh spin.

Plan:

- Do not animate the full page in the first Order Detail slice.
- Use motion only for state clarity:
  - section fade for loading to content
  - collapse for deep detail
  - modal/panel presence if a shared modal shell exists later
- Respect reduced motion through the shared primitives.

### Feedback

Current state:

- Smart Action, upload, archive, lifecycle, status override, and procurement actions provide
  feedback, but each uses a different presentation style.

Plan:

- Standardize feedback by action type:
  - inline updating for local actions
  - section error for recoverable section failures
  - dialog error for modal submissions
  - toast for completed workflow actions
  - subtle success only when it clarifies local state

## Cognitive Load

Current decision count in the first working view can include:

- Should I follow the Smart Action?
- Should I edit the order?
- Should I print?
- Should I go back?
- Should I open More actions?
- Should I change operational inputs?
- Should I read Needs Attention?
- Should I update site visit?
- Should I inspect Activity?
- Should I inspect files?
- Should I review notes?
- Should I offer assignment?
- Should I inspect procurement?

That is too much.

What Falcon can decide automatically without new product features:

- Which workflow action deserves primary emphasis.
- Which missing data belongs in Needs Attention.
- Which state is summary versus deep detail.
- Whether procurement details should be visible or collapsed based on active assignment state.
- Whether passive sections should be quiet until needed.
- Which loading skeleton shape matches the current section.

Falcon should not automatically perform workflow actions, choose vendors, override status, archive,
cancel, void, or submit on behalf of the user.

## Scroll Behavior

Current behavior:

- The page is a long scroll with multiple major sections.
- Activity has fixed internal height.
- Files can scroll internally.
- Notes can scroll internally.
- Procurement can become very long.
- Modals are overlay-based and can scroll internally.

Concerns:

- Users may need to scroll past secondary content before reaching documents, assignments, or
  procurement.
- Multiple internal scroll regions can make orientation harder.
- Activity is high in the page even when the primary task may be documents, assignment, or
  procurement.
- A sticky header could help on desktop, but should not be introduced until hierarchy is clearer.

Plan:

- First, reduce competition and make section order more intentional.
- Use collapsible deep detail before adding sticky behavior.
- Consider a future sticky compact order header only after state and interaction polish are
  consistent.
- Avoid sticky sidebars on mobile.

## Mobile And Responsive Concerns

Future concerns:

- The first header currently stacks many controls, which can push Smart Action or attention below
  the fold.
- Secondary action buttons may wrap into a dense button cluster.
- Overview sections stack into a long field list.
- Contacts / Map can consume significant vertical space.
- Files upload controls, document actions, assignment rows, and procurement candidate cards can
  become long and repetitive.
- Modals with forms and previews need careful mobile height handling and focus management.

Plan:

- Keep the mobile first viewport focused on order identity, status, property, due pressure, and
  Smart Action.
- Collapse or defer map, notes, full activity, and procurement detail on smaller screens.
- Use full-width primary action and quiet secondary action rows only where needed.
- Avoid adding hover-only affordances as the only cue.

## Immediate Wins

These are small, independently shippable, and should not alter workflows.

1. Replace top-level loading, error, not-found, and switching-workspace presentation with shared
   state primitives.
2. Replace Files loading, empty, upload, error, and archive feedback presentation with shared state
   primitives where meaning is unchanged.
3. Apply shared interaction helpers to existing Order Detail buttons and links.
4. Make secondary actions visually quieter than Smart Action.
5. Use shared error/success/updating presentation for Smart Action and local action feedback.
6. Keep static overview cards passive.

## Medium Improvements

1. Rebalance the first viewport so order identity, required attention, and Smart Action dominate.
2. Move created date and lower-priority metadata deeper or quieter.
3. Consolidate repeated client/property/contact information so only one version leads the page.
4. Convert procurement and optional detail disclosures to a shared collapse pattern after the state
   foundation is adopted.
5. Standardize modal shells and focus-visible behavior for archive, lifecycle, status override,
   print packet, bid response, bid selection, and vendor offer dialogs.
6. Clarify Activity as history/supporting context rather than a competing primary workflow unless
   the current role is review-focused.

## Long-Term Vision

Order Detail should feel like a calm command surface for one order.

The first screen should answer:

- What order is this?
- What is its state?
- What needs attention?
- What should I do next?

The rest of the page should then separate:

- Current work
- Documents
- Assignment/procurement
- Supporting property/contact context
- History

Order Detail should not feel like a warehouse of every possible order field. It should feel like an
ordered workspace where Falcon has already decided what deserves attention and what can wait.

## Implementation Roadmap

### Slice 1: Top-Level State Foundation

Goal: make Order Detail loading, failed load, not found, and workspace-switching states calm and
consistent.

Status: Completed in Premium Experience Sprint 2C.

Scope:

- Use shared state primitives for top-level states.
- Preserve existing text meaning.
- Do not change data fetching, redirects, routes, or permissions.
- Add focused tests for each existing state branch.
- Wrap the loaded Order Detail container with `FalconPageMotion`.

Why this first:

- It is low-risk and establishes Order Detail as the next real adoption surface after Dashboard.

Implementation discoveries:

- Top-level loading, failed load, not-found, and workspace-switching branches were eligible for
  shared state primitives without changing workflow meaning.
- The loaded page container could adopt `FalconPageMotion` without moving sections or changing
  internal surface behavior.
- Internal section states remain local by design; Files remains the correct next state-feedback
  slice.

### Slice 2: Files State Feedback

Goal: standardize the highest-value section-level states without changing document behavior.

Status: Completed in Premium Experience Sprint 2D.

Scope:

- Use shared primitives for files loading, unavailable, empty, upload updating, upload success,
  and upload failure where appropriate.
- Preserve document upload, download, archive, category, drag/drop, and permission behavior.
- Keep document list layout intact.

Why this slice:

- Files already have clear loading, empty, updating, error, and success states.

Implementation discoveries:

- The Order Detail Files card had eligible local loading, unavailable, empty, upload updating,
  upload success, and upload failure presentation branches.
- Document upload, download, archive, category selection, drag/drop, and permission gating remained
  unchanged.
- Archive confirmation is a local confirmation dialog, not a file availability state. It should be
  reconsidered during a later modal/dialog or interaction-polish slice rather than this state
  feedback slice.
- File rows remained passive surfaces with explicit Download and Archive buttons; static file rows
  were not made to look clickable.

### Slice 3: Order Detail Interaction Baseline

Goal: make existing interactive surfaces feel consistent.

Status: Completed in Premium Experience Sprint 2E.

Scope:

- Apply shared interaction helpers to Copy, Smart Action, Offer Assignment, Edit, Print Packet,
  Back, More actions, menu items, modal buttons, document buttons, and refresh/open-packet actions.
- Do not make passive summary fields or insight cards clickable.
- Preserve all click handlers, links, disabled behavior, and labels.

Why this slice:

- It improves perceived quality without changing hierarchy or data.

Implementation discoveries:

- Shared interaction recipes were adopted for existing Order Detail file actions, document archive
  confirmation actions, top action-bar controls, More actions menu items, print/status/lifecycle
  dialog actions, bid-request controls, selectable vendor labels, and the Open Packet link.
- The existing More actions open state now maps to the shared selected-state recipe.
- Static summary fields, read-only file rows, insight cards, operational context panels, and
  passive vendor summary cards were intentionally skipped so passive content does not look
  clickable.
- Upload/download/archive/status workflow handlers, routes, permission gates, and data fetching
  were left unchanged.

### Slice 4: Smart Action And Secondary Action Hierarchy

Goal: make the primary workflow action visually lead the page.

Status: Completed in Premium Experience Sprint 2F.

Scope:

- Keep `primarySmartAction` behavior unchanged.
- Make Smart Action visually dominant when available.
- Make secondary utilities quieter.
- Keep lifecycle and status override actions in More Actions.
- Improve inline error/updating feedback presentation.

Why this slice:

- It reduces first-viewport decision load without changing workflow logic.

Implementation discoveries:

- The Smart Action surface was given clearer visual priority with a stronger action-card treatment
  and a larger primary workflow button.
- Secondary header utilities were kept in place but moved to a quieter visual treatment so they do
  not compete with the Smart Action.
- Offer Assignment remains visible when permitted. When a Smart Action exists, it is visually
  secondary; when no Smart Action exists, it can still retain stronger action styling.
- More actions remained available and keyboard-focusable, with lifecycle and status override
  actions still behind the existing menu.
- Smart Action decision logic, action handlers, routes, permissions, data fetching, and labels were
  left unchanged.
- Internal section controls, file actions, procurement controls, and dialogs were intentionally left
  unchanged in this hierarchy slice after the prior interaction baseline.

### Slice 5: Header And Overview Hierarchy

Goal: make the first viewport answer the core Order Detail questions.

Status: Completed in Premium Experience Sprint 2G.

Scope:

- Rebalance visible fields: order identity, status, client, property, due pressure, and current
  assignment/procurement summary.
- Quiet or defer created date and lower-priority metadata.
- Avoid changing field values, data sources, or permissions.
- Preserve accessibility labels.

Why this slice:

- It is the first hierarchy slice and should happen after state/interaction primitives are already
  trusted on the page.

Implementation discoveries:

- The header now separates order identity, status, workspace context, and the property address so
  the page has a clearer first read.
- Existing client, review due, final due, appraiser, reviewer, and created fields were grouped into
  compact header context fields using the same data sources.
- Property type and report type remain visible as supporting property context under the primary
  address.
- The overview sections remain in the same order with the same fields. Lower-priority updated
  metadata was visually muted rather than removed.
- Smart Action, secondary actions, workflow logic, routes, permissions, data fetching, and section
  order were left unchanged.
- Passive overview fields remain passive; no summary or overview field was made clickable.

### Slice 6: Supporting Context And Repetition Cleanup

Goal: reduce repeated information and page length while preserving meaning.

Status: Completed in Premium Experience Sprint 2H.

Scope:

- Review duplicate client/property/contact/due-date appearances.
- Keep one leading version of each important field.
- Move repeated support fields into quieter sections or existing supporting panels.
- Do not remove information needed for role-specific workflows.

Why this slice:

- It lowers cognitive load without changing workflow ownership.

Implementation discoveries:

- Client, property, due-date, appraiser, and reviewer values now remain available in the overview
  but use muted supporting text when they repeat stronger header context.
- Site Visit remains normal weight because it is action-adjacent and still owned by the Schedule
  overview section.
- Fee fields remain normal weight because they are not represented in the strengthened header.
- Contacts / Map keeps address and property contact data visible, but the repeated map reference
  and contact details use quieter supporting treatment.
- No fields, sections, actions, handlers, data sources, routes, permissions, schemas, or workflows
  were removed or changed.
- Repetition was intentionally preserved where role-specific workflows still benefit from local
  context, especially Schedule, Team / Fees, Property Contact, and map reference details.

### Slice 7: Procurement Disclosure And State Polish

Goal: make AMC procurement understandable without overwhelming Order Detail.

Status: Completed in Premium Experience Sprint 2I.

Scope:

- Standardize eligible vendor, vendor candidate, and bid request loading/empty/error states.
- Apply shared interaction helpers to selectable candidate and bid response rows.
- Use shared collapse for deep procurement details only where keyboard behavior remains clear.
- Keep deterministic matching language.
- Do not change vendor matching, bid creation, assignment conversion, or permissions.

Why this slice:

- Procurement is high-impact but complex, so it should follow simpler Order Detail polish slices.

Implementation discoveries:

- Eligible vendor loading, empty, and error states now use shared Falcon state primitives while
  preserving existing state meanings and messages.
- Eligible vendor detail rows remain passive and visually secondary; Request bids remains the
  explicit action.
- AMC bid status summary now separates status, contact/response counts, assignment status, and
  supporting metrics with calmer spacing and borders.
- Existing selectable vendor rows in the request-bids dialog continue using shared interaction
  helpers from the prior interaction baseline.
- Existing procurement disclosure for active vendor assignments was preserved; no new collapse
  behavior was introduced.
- Vendor matching, bid request creation, assignment offer/conversion behavior, permissions, data
  fetching, routes, schemas, RPCs, and labels were left unchanged.

### Slice 8: Modal And Dialog Polish

Goal: create consistent dialog behavior across Order Detail actions.

Status: Completed in Premium Experience Sprint 2J.

Scope:

- Align archive, lifecycle, status override, print packet, eligible vendor bid request, bid
  response, bid selection, vendor offer, and request-bids dialogs with shared state and interaction
  patterns.
- Preserve submit behavior, validation, warning copy, and access rules.
- Improve focus-visible and close/cancel consistency.

Why this slice:

- Dialogs are important but numerous; they should be handled after inline surfaces are stable.

Implementation discoveries:

- Order Detail dialogs now share calmer rounded panel, title, description, form field, error, and
  action-row presentation.
- Eligible vendor bid request, archive order, status override, lifecycle confirmation, and print
  packet dialogs were aligned visually while preserving their existing triggers.
- Existing warning and doctrine copy was preserved; destructive/lifecycle dialogs still present
  risk text prominently.
- Eligible dialog submit errors, archive errors, status override errors, and lifecycle errors now
  use shared Falcon error state presentation while preserving existing error messages.
- Submit behavior, validation logic, close/cancel behavior, access rules, handlers, data fetching,
  routes, schemas, RPCs, permissions, and modal fields/actions were left unchanged.

### Slice 9: Activity, Notes, Map, And Deep Detail Organization

Goal: make supporting context useful without competing with current work.

Status: Completed in Premium Experience Sprint 2K.

Scope:

- Decide which supporting sections should remain visible by default.
- Consider collapse for Notes, Contacts / Map, full Activity, and long document/procurement
  detail.
- Keep primary decision information visible.
- Do not introduce sticky behavior yet.

Why this slice:

- It is more structural and should follow the lower-risk polish slices.

Implementation discoveries:

- Activity, Contacts / Map, and Notes now use consistent supporting-section headings and short
  captions so lower-page context is easier to scan.
- Activity was visually quieted into a supporting evidence surface while preserving the existing
  activity feed, composer, height, and review context behavior.
- Contacts / Map was visually aligned with other supporting context while preserving address,
  contact, phone, and map rendering behavior.
- Notes retained the same scroll behavior and content, with a calmer supporting caption.
- Files, assignment, procurement, activity, notes, contact, and map values/actions remain visible;
  no lower section was collapsed, hidden, reordered, or made sticky.
- Notes behavior, activity behavior, map behavior, data fetching, routes, schemas, RPCs,
  permissions, handlers, and workflow logic were left unchanged.

### Slice 10: Responsive Refinement

Goal: keep Order Detail usable on small screens.

Status: Completed as the final consistency and responsive review in Premium Experience Sprint 2L.

Scope:

- Ensure top identity, status, Smart Action, and key due information remain visible early.
- Reduce dense action wrapping.
- Confirm modals and dropdowns remain usable on mobile.
- Avoid hover-only cues.

Why this slice:

- Responsive refinement should follow hierarchy decisions so mobile does not simply stack the old
  density.

Final consistency outcome:

- Order Detail now uses shared Falcon page motion, shared state primitives, and shared interaction
  helpers where the previous slices adopted them.
- Header, Smart Action, secondary actions, overview, files, procurement, dialogs, activity, notes,
  contacts, and map sections now follow a calmer hierarchy without changing section order or
  product behavior.
- Supporting files and notes surfaces now align visually with the lower evidence surfaces adopted
  for activity and map context.
- Dialog action rows and the secondary action group now wrap more predictably on narrow viewports
  while preserving the same controls, labels, handlers, and focusable elements.
- Passive overview and supporting context remains visible and secondary; clickable affordance is
  reserved for existing controls and links.

Intentionally deferred:

- A future responsive layout pass if browser QA shows first-viewport crowding on small devices.
- Any sticky header/sidebar, new collapse behavior, section reordering, workflow redesign, or
  broader page adoption outside Order Detail.

### Premium Experience Sprint 2M: Browser QA Attempt

Goal: verify the completed Order Detail polish work in a browser across representative states before
expanding Premium Experience adoption.

Status: Blocked by local browser launch restrictions in the Codex desktop sandbox.

Future Order Detail browser QA should follow
`docs/architecture/FALCON_PREMIUM_EXPERIENCE_QA_GUIDE.md`, including authenticated persona setup,
representative state coverage, viewport notes, and explicit `passed`, `needs fixes`, `attempted`,
or `blocked` status recording.

Representative states prepared for QA:

- Internal order with files.
- Internal order without files.
- AMC order with procurement/bids.
- AMC order without active procurement/bids.
- Reviewer view.
- Appraiser view.
- Owner/admin view.
- Narrow mobile viewport.
- Dialog/menu checks for More actions and Print Packet.

Validation notes:

- The local Vite app server started successfully at `http://127.0.0.1:5173/`.
- The local app returned `HTTP 200`, confirming the server was reachable.
- A controlled read-only browser fixture plan was prepared to mock session, permissions, order
  data, files, assignments, activity, map, and procurement responses without using real credentials
  or mutating Supabase data.
- Browser execution could not complete because Playwright's bundled Chromium, installed Chrome,
  and alternate launch modes were blocked by the macOS sandbox before any page could render.
- WebKit and Firefox Playwright executables were not installed in the local cache.

Fixes made:

- None. No runtime code changes were made during Sprint 2M because browser QA could not render the
  page and no verified visual regression was observed.

Deferred visual issues:

- Full browser QA remains required before declaring Order Detail visually QA-confirmed.
- The next pass should check first viewport clarity, Smart Action hierarchy, secondary action
  wrapping, files and procurement state presentation, dialog wrapping, lower-section calmness,
  hover/focus behavior, passive-content affordance, horizontal overflow, clipped text/buttons, and
  narrow viewport layout.

## Non-Goals

- Do not redesign the order workflow.
- Do not create new product features.
- Do not change business logic, data fetching, schemas, RPCs, routes, permissions, or workflow
  authority.
- Do not make vendor selection, status transitions, archive, cancel, void, or approval automatic.
- Do not add broad page animation.
- Do not use raw animation values in Order Detail product code.
- Do not make passive cards or summary fields look clickable.
