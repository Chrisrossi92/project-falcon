# Falcon Product Experience Audit

## Executive Summary

Falcon now has a reusable Premium Experience foundation for motion, interaction polish, and state
feedback. The next product experience work should use that foundation to reduce visual noise,
clarify priority, and make existing workflows feel more consistent without redesigning workflows or
changing runtime behavior.

The highest-value opportunity is Order Detail. It is Falcon's most important working surface and
already contains clear interactive and state-heavy areas: Smart Action, lifecycle actions,
documents, activity, assignment panels, AMC procurement, notes, map/context, and loading/error
states. It should be the next adoption target if Sprint 2 moves into implementation.

The second-highest opportunity is Orders. It already has a stronger hierarchy than Order Detail,
but the row, filter, saved-view, empty, loading, and inline drawer patterns can become more
consistent with Falcon's new shared primitives.

This audit is based on architecture documentation and source inspection of the major user-facing
pages. It recommends experience improvements only. It does not approve new features, business
logic changes, data-fetching changes, route changes, schema changes, RPC changes, permission
changes, or workflow redesigns.

## Ranked Priority Table

| Rank | Page / Surface | Score | Estimated UX impact | Why it ranks here |
| --- | ---: | ---: | --- | --- |
| 1 | Order Detail | 6.0 | Very high | Critical working surface with dense content, many local states, and clear existing interactive surfaces. |
| 2 | Orders | 7.0 | High | High-frequency triage surface; strong structure but local row/filter/drawer polish remains. |
| 3 | Procurement surfaces | 5.5 | High | Embedded AMC bid/vendor selection flows are operationally important and visually dense. |
| 4 | Vendor Workspace dashboard | 6.5 | High | Important external-facing workspace with many local loading/empty/error states and mixed clickable/passive cards. |
| 5 | Client Portal dashboard | 6.8 | High | Client-facing surface needs calmer loading, clearer action priority, and stronger distinction between tracking and action. |
| 6 | Calendar | 7.0 | Medium-high | Clear orientation but older state components and dense control treatment remain. |
| 7 | AMC Dashboard | 7.4 | Medium-high | First Premium Experience adoption is in place; next gains are consistency and state coverage. |
| 8 | Dashboard | 7.5 | Medium | Best current proof of the new foundation; remaining work is selective, not broad. |
| 9 | Owner Setup | 6.7 | Medium | Governance-aware and structured, but dense diagnostics and local state styles compete with setup guidance. |
| 10 | Intelligence surfaces | 6.2 | Medium | No standalone intelligence page found; embedded assignment intelligence needs clearer exception-first hierarchy. |

## Page Audits

### Dashboard

Score: 7.5 / 10

Strengths:
- Clear page header, workspace badge, role-aware title, and summary cards establish orientation.
- Sprint 1 adoption proves `FalconPageMotion`, list/card motion, interactive surfaces, and
  skeleton state in a narrow real surface.
- AMC pipeline stage controls now distinguish selected and clickable states better than most other
  pages.

Weaknesses:
- Dashboard uses the new foundation only in selected areas, so surrounding tables, calendar panels,
  and local states still feel less consistent.
- Some dashboard counts and worklist sections compete for attention before the user understands
  the most urgent next item.
- Loading and error presentation is not yet fully standardized across all dashboard subsections.

Quick wins:
- Keep static summary cards passive and avoid adding click affordance unless the card actually
  navigates or filters.
- Replace remaining local dashboard loading, empty, and recoverable error presentation with shared
  state primitives where meaning is identical.
- Use shared interaction helpers for existing buttons and filter-like controls that already
  support click or selection.

Medium improvements:
- Make the highest-priority actionable queue visually lead the page more consistently across
  internal, reviewer, appraiser, and AMC modes.
- Normalize dashboard table/calendar section headers so each section answers why it exists and what
  action follows.

Major improvements:
- If future dashboard strategy changes, split analytics, calendar, and active work into clearer
  role-specific surfaces rather than adding more competing modules to one dashboard.

Estimated UX impact: Medium. Dashboard is already the strongest Premium Experience example; the
remaining gains are consistency and restraint.

### AMC Dashboard

Score: 7.4 / 10

Strengths:
- AMC workspace context is visible through workspace identity, badge, and procurement pipeline.
- Pipeline stage controls answer what type of AMC work needs attention.
- First motion and interaction adoption provides a useful implementation model.

Weaknesses:
- AMC attention rows and pipeline summaries can still feel like another layer on top of the
  general operations dashboard rather than a fully owned AMC command surface.
- Procurement summary loading is intentionally quiet, but lack of standardized state feedback can
  make the pipeline feel temporarily empty.
- Some actions open Order Detail for deeper work, so the handoff from dashboard to order detail is
  important but not yet visually reinforced.

Quick wins:
- Use shared state primitives for procurement summary loading and recoverable summary failures
  where existing meaning is preserved.
- Keep pipeline stage motion subtle and avoid adding stagger that delays triage.
- Ensure every clickable AMC card or row uses the shared interaction foundation.

Medium improvements:
- Make "All attention" and selected stage language more explicit about whether the user is seeing
  all urgent work or one stage.
- Align AMC dashboard empty states with task-oriented language such as "No bid responses need
  review" instead of generic absence.

Major improvements:
- Over time, consider a more dedicated AMC command hierarchy that keeps intake, procurement,
  vendor follow-up, review, and delivery distinct without changing workflow ownership.

Estimated UX impact: Medium-high. AMC Dashboard is already close, but better state clarity would
make it feel more reliable during live operations.

### Order Detail

Score: 6.0 / 10

Strengths:
- The page contains the right decision information: order number, status, client, property, due
  dates, Smart Action, attention summary, activity, documents, assignments, and AMC procurement.
- Smart Action placement is valuable and makes the next workflow action visible.
- Workspace redirect protection and role-specific surfaces keep context safer than a generic order
  page.
- AMC procurement is progressively disclosed when an active vendor assignment exists, which is the
  right instinct for density control.

Weaknesses:
- The first viewport has many competing focal points: status, copy action, Smart Action, operation
  inputs, assignment/edit/print/back/more actions, attention summary, and overview fields.
- Loading, error, not-found, switching-workspace, action errors, document states, and assignment
  states are local and visually inconsistent with the new shared state primitives.
- Button styling is mostly local, so hover, focus, disabled, destructive, and quiet secondary
  actions do not yet share one interaction language.
- The order body uses several dense side-by-side sections. Activity, contacts/map, files, notes,
  assignment, and procurement can compete instead of reading as a clear primary workflow plus
  supporting context.
- The native `details` procurement disclosure works, but it is not aligned with the shared
  collapse/motion primitive or shared focus/interaction behavior.

Quick wins:
- Adopt shared state primitives for loading, failed load, not found, switching workspace, Smart
  Action error, assignment loading/error/empty, and document loading/empty states where meaning is
  unchanged.
- Apply shared interaction helpers to existing buttons, menu items, and clickable cards without
  changing labels or behavior.
- Keep the existing Smart Action but make secondary controls visually quieter and more consistent.
- Replace local "Loading..." text with layout-preserving skeletons where the final shape is known.

Medium improvements:
- Rebalance the first viewport so order identity, current status, required attention, and one next
  action are the dominant read.
- Use progressive disclosure for deep detail: notes, full activity, procurement internals,
  diagnostics, and long document lists should not compete with decision information.
- Normalize Order Detail sections into clear bands: overview, current work, supporting context,
  documents, history.
- Add shared collapse behavior to procurement and optional detail sections while preserving
  keyboard access and reduced motion.

Major improvements:
- Eventually create an Order Detail information hierarchy pass that reduces the number of visible
  panels before the user has answered "what needs attention and what should I do next?"
- Consider an Order Detail section architecture that makes AMC procurement, internal assignment,
  review, and appraiser execution mode-specific rather than all feeling attached to one large page.

Estimated UX impact: Very high. This is the best next target because it has clear existing
interactive and state surfaces, and improvements can be adopted without inventing new workflow.

### Orders

Score: 7.0 / 10

Strengths:
- The page has a clear title, role-aware copy, workspace context, and focused table ownership.
- Filters are URL-governed and active filter chips make current scope visible.
- Saved views and queue-derived filtering already support triage without adding new navigation.
- Unified table supports inline details, quick actions, pagination, and AMC procurement chips.

Weaknesses:
- `OrdersTableRow` uses raw transition durations, transform values, and local hover/active styling
  instead of the shared motion and interaction foundation.
- Row click behavior is useful but keyboard semantics could be stronger because the row behaves
  like an expandable control.
- Active chips, saved-view dropdown rows, table loading, error, and empty states use local visual
  treatment.
- AMC procurement chips add useful signal but can become visually small compared with their
  operational importance.

Quick wins:
- Replace raw row hover/press/drawer motion values with shared tokens or primitives in a focused
  table slice.
- Use shared interaction helpers for active filter chips, saved-view rows, row hover, and quiet
  secondary actions.
- Adopt `FalconEmptyState`, `FalconErrorState`, and skeletons for table loading/empty/error states
  where behavior remains identical.

Medium improvements:
- Clarify row affordance for keyboard users: expandable row, open detail link, and inline actions
  should be visually and semantically distinct.
- Make saved views feel like a calm panel state rather than a local dropdown with separate styles.
- Preserve table density while making due/attention/procurement signals easier to scan.

Major improvements:
- A future table system pass could align orders, vendors, assignments, and client portal lists on
  one row interaction model.

Estimated UX impact: High. Orders is high-frequency, and small consistency improvements will be
felt immediately.

### Calendar

Score: 7.0 / 10

Strengths:
- Header, workspace badge, context tiles, controls, board, and selected-day rail create clear
  orientation.
- The page answers where the user is and what schedule lens is active.
- Month/two-week board split and selected-day rail are good information architecture.

Weaknesses:
- Loading and error use older `WorkspaceLoadingState` and `WorkspaceErrorState` rather than the
  shared state feedback foundation.
- Calendar control buttons and selected-day/event interactions likely use mixed local interaction
  styles across child components.
- The controls section has several labels and pills that can compete before the user reaches the
  actual schedule.
- Horizontal scrolling on calendar board is necessary, but it can feel like layout pressure rather
  than intentional responsive design.

Quick wins:
- Adopt shared loading and error primitives for the top-level calendar state.
- Apply shared interaction helpers to existing date/event controls where they are already clickable
  or selectable.
- Keep the context strip but reduce repeated labels if they restate the same work view.

Medium improvements:
- Standardize selected-day and event focus states so keyboard users can understand selected,
  hovered, and active event states.
- Make empty selected-day states more task-oriented and less like absence.
- Use subtle shared motion only for day detail rail state changes or view changes, not every event.

Major improvements:
- If scheduling becomes more central, define a reusable calendar interaction system for month,
  week, event, and detail-rail behavior.

Estimated UX impact: Medium-high. Calendar is already well structured, but state and interaction
consistency will noticeably improve trust.

### Client Portal Dashboard

Score: 6.8 / 10

Strengths:
- Client-safe language is mostly clear and avoids exposing internal operations.
- The dashboard has an obvious primary action: Request Appraisal.
- Sections map to client needs: current orders, upcoming dates, submitted requests, documents, and
  recent activity.

Weaknesses:
- Loading states are plain text inside cards, so the page can feel unfinished while data loads.
- Empty states use older `WorkspaceEmptyState` and sometimes report absence rather than guiding
  the next client-safe action.
- Several sections compete for attention even when the client likely needs one of three things:
  request work, provide missing input, or download a report.
- Clickable order cards use local hover styling and do not share the new interaction foundation.

Quick wins:
- Replace text loading states with `FalconSkeleton` or `FalconLoadingState` where the card/list
  shape is known.
- Use `FalconEmptyState` for no orders, no due dates, no documents, and no recent activity while
  preserving client-safe wording.
- Apply shared clickable surface polish only to existing links and actions.

Medium improvements:
- Make "Waiting on You" the clearest client-action signal when count is nonzero.
- Reduce equal-weight summary cards when the user has no active orders or reports.
- Clarify which sections are actionable versus read-only tracking.

Major improvements:
- A future client portal hierarchy pass could orient around client actions first, then tracking,
  then history.

Estimated UX impact: High. Client-facing polish has outsized trust impact because clients see less
of Falcon's internal context.

### Vendor Workspace Dashboard

Score: 6.5 / 10

Strengths:
- Vendor dashboard has clear external-facing purpose: work queue, assignments, bids, payments, and
  profile.
- Counts, action cards, and due-date preview support vendor triage.
- Some cards correctly identify "Open" versus "Read-only," reducing false affordance.

Weaknesses:
- Loading and error states are local; loading skeletons exist but are not shared or reduced-motion
  aware through the new state foundation.
- Dashboard cards mix clickable and passive cards with similar visual weight, which risks making
  passive cards feel clickable.
- There are multiple summary groups with overlapping concepts: top tiles, dashboard counts,
  calendar, recent uploads, next actions.
- Empty states are calm but inconsistent with the shared state primitive language.

Quick wins:
- Replace local `LoadingState`, `ErrorState`, and `WorkspaceEmptyState` usage with shared state
  primitives where meaning is unchanged.
- Apply `FalconInteractiveSurface` or shared interaction classes only to cards with paths.
- Make passive/read-only cards visually quieter than actionable cards.

Medium improvements:
- Consolidate duplicate count areas so the dashboard has one obvious vendor next-action region.
- Improve due-date and priority states so overdue and due-soon actions lead the page.
- Align external-facing dashboard card hover/focus behavior with Client Portal cards.

Major improvements:
- A future vendor workspace pass could separate dashboard triage from read-only profile/payment
  summaries to reduce same-page competition.

Estimated UX impact: High. Vendor Workspace is a major external surface and has many safe state and
interaction adoption points.

### Owner Setup

Score: 6.7 / 10

Strengths:
- The page clearly protects governance boundaries and states that setup progress does not grant
  access.
- Setup readiness, required sections, authority boundary, and diagnostics are explicit.
- Company Profile is the only narrow save path, which aligns with production safety.

Weaknesses:
- The page is visually dense and governance-heavy; the operational next step can compete with
  diagnostic explanation.
- Required setup sections, status badges, readiness metrics, authority boundary, and diagnostics
  all use similar card weight.
- Loading, error, saving, completion, and profile validation states are local.
- Diagnostic sections may be too prominent for users trying to complete setup.

Quick wins:
- Use shared state primitives for live setup loading, permission-denied/unavailable, save error,
  completion success, and completion error states.
- Make required setup sections visually lead optional/deferred/diagnostic sections.
- Apply shared interaction helpers to Save Profile, Complete setup, and Open Team Access controls.

Medium improvements:
- Move internal diagnostics lower or behind clearer progressive disclosure while preserving
  governance language.
- Make "Next Step" read as the main work cue, not one of several readiness metrics.
- Standardize setup section card selected/complete/needs-attention styling.

Major improvements:
- A future setup information architecture pass could separate owner action flow from internal
  diagnostics while preserving auditability.

Estimated UX impact: Medium. The page is important but narrower in audience and already strong on
governance clarity.

### Procurement Surfaces

Score: 5.5 / 10

Scope audited: AMC Order Detail procurement area, bid requests panel, eligible vendors panel, vendor
assignment candidates panel, and assignment panels that support AMC procurement.

Strengths:
- Procurement work is permission-aware and embedded where order context is available.
- Bid/vendor panels expose useful operational information: coverage, vendor status, bid response,
  selected vendor, due dates, and assignment conversion.
- Deterministic matching language avoids implying opaque AI recommendation.

Weaknesses:
- Procurement lives across multiple dense panels and modals, making it hard to tell what the next
  procurement step is at a glance.
- Modals, inline cards, candidate rows, bid rows, warnings, loading, error, and empty states use
  many local styles.
- Candidate and bid interactions are high-stakes but do not yet share a common selected/disabled/
  focused interaction language.
- Native `details` disclosures and local modal transitions do not use the shared motion/collapse
  foundation.

Quick wins:
- Use shared state primitives for candidate loading, no matches, bid request loading, no bid
  requests, recoverable errors, and action success/working states.
- Apply shared interaction helpers to candidate rows, bid response rows, selected vendors, quiet
  secondary actions, and destructive/withdraw-like actions where present.
- Keep deterministic matching copy, but make blockers and next actions visually clearer.

Medium improvements:
- Establish a procurement step hierarchy: match vendors, request bids, review responses, select,
  offer assignment, track accepted assignment.
- Use shared collapse for supporting details such as email previews, match reasons, package
  previews, and lower-priority diagnostics.
- Standardize modal shell, focus behavior, and inline error presentation across procurement
  actions.

Major improvements:
- Consider a future dedicated procurement sub-surface inside Order Detail if embedded panels keep
  growing, but do not create a new workflow without a separate design slice.

Estimated UX impact: High. Procurement is complex, important, and currently has many local UI
patterns that can be safely standardized.

### Intelligence Surfaces

Score: 6.2 / 10

Scope audited: no standalone Intelligence page was found. Current intelligence appears as embedded
Smart Actions, order attention/readiness summaries, row next-step guidance, timeline
intelligence, and Assignment Intelligence inside engagement package preview.

Strengths:
- Intelligence is mostly explainable and deterministic, which aligns with Falcon principles.
- Smart Actions and attention summaries answer "what should I do next" better than generic status
  text.
- Assignment Intelligence uses exception-oriented language and avoids claiming more certainty than
  the model has.

Weaknesses:
- Intelligence surfaces vary visually, so users may not immediately understand when Falcon is
  guiding, warning, summarizing, or simply showing metadata.
- Embedded intelligence can get buried inside dense panels, especially on Order Detail and package
  previews.
- Success, ready, warning, and blocked intelligence states use local badges and cards.
- Some labels like "Assignment Intelligence" can sound system-centric rather than user-action
  centric.

Quick wins:
- Treat intelligence panels as insight/warning cards from the design system rather than generic
  information cards.
- Use shared state primitives for ready/no-risk, warning, unavailable, and updating intelligence
  states.
- Make intelligence copy answer "why this matters" and "what to do next" before listing evidence.

Medium improvements:
- Create a consistent visual grammar for Smart Action, Attention, Readiness, Risk, and
  Recommendation surfaces.
- Keep intelligence exception-first: show what needs review, then supporting evidence.
- Avoid giving passive intelligence panels clickable polish unless they open evidence or take an
  action.

Major improvements:
- If Falcon later adds standalone intelligence pages, define a separate architecture entry before
  implementation. The current audit does not recommend inventing a new page.

Estimated UX impact: Medium. Intelligence can improve trust significantly, but current work should
focus on embedded clarity rather than new features.

## Additional Major Surface Notes

### Assignments

Score: 6.8 / 10

Assignments has strong workspace context and clear permission boundaries. The most useful next
polish would be shared state primitives for unavailable/loading/error states, shared interaction
for packet rows and action buttons, and clearer separation between received work and sent
assignments.

### Client Requests

Score: 6.6 / 10

Client Requests is an AMC intake surface and should follow the same rules as Orders: preserve
client-safe meaning, use shared state primitives for loading/empty/error, and make review actions
clear without making passive request metadata feel clickable.

### Vendor Directory And Vendor Profile

Score: 6.4 / 10

Vendor management surfaces are dense and useful. Future polish should standardize vendor rows,
coverage sections, credential states, empty states, and focus behavior. Avoid turning vendor
summary cards into clickable surfaces unless they navigate or select.

### Settings And Team Access

Score: 6.5 / 10

These pages should remain quiet, utilitarian, and governance-aware. Premium polish should focus on
form state, disabled/saving feedback, focus-visible consistency, and calm error handling rather
than motion or card-heavy presentation.

## Top 10 Improvements Across The Product

1. Adopt shared state primitives on Order Detail loading, error, not-found, action-error,
   assignment, document, and procurement states.
2. Apply shared interaction helpers to Order Detail buttons, menus, clickable panels, and
   disclosure controls without changing behavior.
3. Standardize Orders table row hover, press, selected/expanded, keyboard focus, and inline drawer
   motion through shared tokens/primitives.
4. Replace plain text loading states in Client Portal and Vendor Workspace dashboards with
   layout-preserving skeletons.
5. Make passive cards visually quieter than clickable cards across dashboards, portal, and vendor
   workspace.
6. Use task-oriented empty states consistently: explain what can happen next, not just what is
   missing.
7. Reduce Order Detail first-viewport competition so order identity, required attention, and the
   Smart Action lead the page.
8. Normalize modal, drawer, and disclosure behavior for procurement and assignment flows.
9. Establish a consistent visual language for Smart Action, Attention, Readiness, Risk, and
   Recommendation surfaces.
10. Continue adopting one surface at a time, starting with Order Detail if its existing
    interactive/state surfaces remain the selected target; otherwise move to Orders.

## Recommended Sprint 2 Adoption Sequence

1. Order Detail state primitives.
2. Order Detail interaction polish.
3. Orders row/filter/table state and interaction polish.
4. Procurement panel state and disclosure polish within Order Detail.
5. Client Portal dashboard state and clickable-surface polish.
6. Vendor Workspace dashboard state and clickable-surface polish.
7. Calendar loading/error and selected-day/event interaction polish.
8. Owner Setup state and progressive-disclosure polish.

## Audit Guardrails

- Do not introduce raw animation values in product screens.
- Do not add Framer Motion outside the shared primitives.
- Do not animate static content or passive cards.
- Do not make non-clickable content look clickable.
- Do not change business logic, data fetching, schemas, RPCs, routes, permissions, or workflows.
- Preserve client-safe, vendor-safe, and workspace-scoped meaning.
- Respect reduced motion through the shared foundation.
- Use shared primitives and helpers before introducing local presentation patterns.
