# Operational Timeline Plan

## Purpose

Falcon should make operational history easier to understand without changing activity ownership or
adding new write behavior. The first timeline work should improve the Order Detail activity
timeline presentation so managers, appraisers, and reviewers can quickly understand what happened,
why the order is in its current state, and which events are system-owned versus human-authored.

The first planning slice did not change runtime behavior, routes, filters, backend APIs, RPCs, RLS,
database schema, activity writes, notification fanout, workflow behavior, lifecycle behavior,
assignment behavior, document behavior, or permissions. Runtime timeline presentation work remains
limited to frontend rendering of existing governed activity data unless a future slice explicitly
changes that scope.

Related doctrine:

- `docs/CRUD_STABILIZATION_MATRIX.md`
- `docs/ACTIVITY_EVENT_OWNERSHIP_AUDIT.md`
- `docs/NOTIFICATION_OWNERSHIP_AUDIT.md`
- `docs/ACTIVITY_NOTIFICATION_OWNERSHIP_DOCTRINE.md`
- `docs/OPERATIONAL_GOVERNANCE_SNAPSHOT.md`
- `docs/HISTORICAL_ADMIN_READBACK_PLAN.md`
- `docs/ORDER_DETAIL_PRINT_PACKET_PLAN.md`
- `docs/NEXT_PHASE_EXECUTION_PLAN.md`

## Goals

- Make Order Detail history easier to scan and understand.
- Unify lifecycle, workflow, assignment, document, note, notification-relevant, and system/audit
  events visually without merging their ownership semantics.
- Preserve audit integrity by displaying existing activity facts rather than inventing a new
  authoritative history layer.
- Improve manager, appraiser, and reviewer context without adding mutation controls or workflow
  shortcuts.
- Keep backend activity as the source of truth. Frontend presentation may categorize, label, group,
  and format events, but must not create authoritative events or infer facts that are not present in
  activity/order data.

## Event Categories

| Category | Example Events | Display Intent | Governance Notes |
|---|---|---|---|
| Lifecycle events | `order.archived`, `order.cancelled`, `order.voided` | Show retired-state decisions clearly with preserved-history language | Read-only. Do not add restore, reopen, unarchive, cancel, void, archive, or hard-delete controls inside the timeline. |
| Workflow status changes | `status_changed`, send-to-review/revision/approval/complete transitions where activity exists | Explain operational movement through the canonical workflow | Backend workflow/status mutation remains authoritative. Frontend must not add fallback activity rows. |
| Assignment changes | appraiser/reviewer/assignee changes, assignment packet lifecycle events where visible in the relevant surface | Show responsibility changes and handoffs | Keep canonical order activity separate from assignment-scoped packet activity unless a future read model deliberately combines them. |
| Document/file events | document upload/finalize/archive events | Show file lifecycle without exposing signed URLs, storage paths, buckets, or private object details | Display safe metadata only. Download/open controls remain governed by document surfaces, not timeline rows. |
| Notes/comments | human notes, workflow notes, general comments | Distinguish human-authored notes from system events | Notes remain frontend-orchestrated today unless a future slice moves note ownership backend-side. |
| Notification-relevant events | workflow handoffs, assignment notifications, note fanout, future lifecycle/document fanout | Help users understand why someone may have been prompted | Timeline must not imply notification delivery unless delivery data is present and authorized. |
| System/audit events | order created/updated, order-number overrides, low-level audit rows | Preserve operational audit memory with safe, minimal wording | Payload display must be minimal, source-aware, and avoid raw sensitive internals. |

## Activity Data Shape Audit

Operational Timeline Slice 1B inventories the current Order Detail activity data shape before
timeline UI changes. This audit is documentation only and does not change activity loading,
rendering, ownership, backend APIs, RPCs, or mutation behavior.

### Current Loading And Rendering Path

- Active Order Detail renders `ActivityLog` with the current `orderId`, order context, and note
  composer enabled.
- `ActivityLog` loads rows through `listOrderActivity(orderId)`, which calls
  `rpc_get_activity_feed` with `p_order_id`.
- Realtime refresh uses `subscribeOrderActivity(orderId, cb)` on `public.activity_log` inserts for
  the order and applies the same frontend shaping path.
- The order drawer also uses `ActivityLog`, so the first governed timeline presentation should
  avoid Order Detail-only assumptions unless a surface explicitly opts out.
- `ActivityNoteForm` writes notes through `logNote(...)` / `rpc_log_event(...)` with
  `event_type = 'note'`, then refetches activity. Note notification fanout remains a separate
  frontend-orchestrated concern and should not be represented as confirmed delivery in timeline
  rows.
- `src/components/orders/view/OrderActivity.jsx` is a legacy/non-active activity component that
  also calls `listOrderActivity(...)` and `logNote(...)`. It renders raw `detail` key/value pairs
  and should not be used as the model for the governed timeline MVP.

### Normalized Row Fields

| Field | Current Source / Use | Governed Display Rule |
|---|---|---|
| `id` | Activity row identity | Internal React key only. Do not expose unless an admin audit surface explicitly requires it. |
| `order_id` | Activity row order scope | Internal association only. |
| `event_type` | Backend/legacy activity classifier | Use only through a controlled category/title map. Unknown values should remain visible with conservative wording. |
| `title` | Optional row title | Safe when present, but should not override governed event labels without review. |
| `message` / `body` | Backend/RPC message, note body, or shaped status text | Safe for known activity paths and human notes. Avoid displaying raw JSON strings or debug payloads. |
| `created_at` | Activity timestamp | Primary timeline timestamp. Preserve chronological ordering. |
| `created_by` | Legacy creator/user reference | Actor fallback only. Do not present as the preferred user label when name/email fields exist. |
| `created_by_name` / `created_by_email` | Feed or realtime enrichment fields | Preferred actor display fields when non-generic. |
| `actor_name` / `actor_email` / `actor_role` | Backend or compatibility actor fields | Safe actor display fields when non-generic. Role may be useful as secondary context, not as authority. |
| `actor_id` / `actor_user_id` | Backend app-user actor references | Fallback identity only. Avoid user-facing UUIDs when a name/email exists. |
| `detail` | Event payload details | Display only approved snippets for known event types. Never dump the full object in the active timeline. |

### Current Event Type Mapping

| Event Type | Current Source / Shape | Timeline Category | MVP Display Notes |
|---|---|---|---|
| `order_created` | Order insert audit trigger | System/audit | Show as order creation with timestamp and actor when available. |
| `status_changed` | Order update audit trigger after workflow/status mutation | Workflow | Show normalized from/to status labels. Do not add frontend fallback workflow activity. |
| `dates_updated` | Order update audit trigger | System/audit | Show safe date fields such as site visit, review due, and final due dates. |
| `assignee_changed` | Order update audit trigger for appraiser/reviewer changes | Assignment | Show assignment field and safe name/email labels when available. Avoid raw IDs where possible. |
| `fee_changed` | Order update audit trigger | System/audit | Keep minimal. Fee details should be deliberately formatted, not raw-dumped. |
| `note` | Active note composer via `rpc_log_event(...)` | Note/comment | Show as human-authored note with actor and body. |
| `note_added` | Legacy/optimistic activity compatibility path | Note/comment | Support as a legacy note alias if present. |
| `sent_to_review` | Legacy/display utility workflow type | Workflow | Support conservatively, but current canonical workflow activity is normally `status_changed`. |
| `sent_back_to_appraiser` | Legacy/display utility workflow type | Workflow | Support conservatively, with clear revision-request wording. |
| `ready_for_client` | Legacy/display utility workflow type | Workflow | Support conservatively if present. |
| `completed` | Legacy/display utility workflow type | Workflow | Support conservatively if present. |
| `order.archived` | Archive lifecycle RPC | Lifecycle | Show as archived preserved-history event. Reason is safe if already stored by the RPC. |
| `order.cancelled` | Cancel lifecycle RPC | Lifecycle | Show as cancelled preserved-history event. Reason is safe if already stored by the RPC. |
| `order.voided` | Void lifecycle RPC | Lifecycle | Show as voided preserved-history event. Reason is safe if already stored by the RPC. |
| `order_document.uploaded` | Document finalize RPC | Document | Show safe document title/file/category/visibility only. Do not expose storage paths, buckets, or signed URLs. |
| `order_document.archived` | Document archive RPC | Document | Show safe document title/file/category/visibility and optional reason. Do not expose storage internals. |
| `order_number.manual_override` | Order number override RPC | System/audit | Show old/new order numbers and safe reason/source/scope if present. |
| `site_visit` | Legacy/calendar or compatibility paths if activity exists | System/audit | Treat as a date/visit event with minimal wording. |
| `assignment` | Legacy assignment compatibility rows if present | Assignment | Treat as transitional assignment activity. Prefer specific `assignee_changed` semantics when available. |
| unknown / other | Any unmapped `event_type` | Unknown/other | Keep visible with conservative title and timestamp, but do not render raw payload. |

Notification-relevant events are not a standalone confirmed-delivery category in the current order
activity feed. Workflow, note, assignment, lifecycle, or document events may be relevant to
notifications, but the timeline should not claim a notification was delivered unless a future
authorized delivery read model supplies that fact.

### Safe Display Fields

- Title: controlled label from `event_type`, with backend `message` used only when already authored
  by an approved activity path.
- Timestamp: `created_at`.
- Actor: resolved from non-generic `created_by_name`, `created_by_email`, `actor_name`,
  `actor_email`, `detail.actor`, or final identity fallback.
- Short description: known, formatted details such as status from/to, due dates, assignment field,
  lifecycle reason, document title/category/visibility, order number old/new values, or note body.
- Category chip: frontend presentation derived from the governed event-type map.
- Payload snippets: safe only for known sanitized fields. The active timeline should never show
  entire `detail` objects, raw JSON bodies, storage paths, bucket names, signed URLs, SQL/debug
  internals, or private payload data.

### Risks And Gaps

- Raw payload leakage: the legacy `OrderActivity` component renders `detail` entries directly, and
  future timeline work should avoid copying that pattern.
- Inconsistent actor naming: current rows may use `created_by_name`, `created_by_email`,
  `actor_name`, `actor_email`, `actor_user_id`, `actor_id`, `created_by`, or `detail.actor`.
- Duplicated event titles: `status_changed` can have both shaped status text and separate
  formatter output, and several workflow helper event types currently share a generic `Workflow`
  label.
- Missing explicit display mappings: lifecycle events, document events, and order-number override
  events are not yet first-class in the current row label/icon maps.
- Unknown event hiding risk: unknown rows with only `detail` and no safe message can disappear in
  current rendering. The MVP should keep unknowns visible with conservative wording.
- Frontend-invented interpretations: current presentation may group nearby human notes and workflow
  events as an "Operational moment." This must remain clearly presentational and must not alter the
  underlying event facts.
- Note/comment compatibility: active notes use `note`, while legacy optimistic paths may still
  produce `note_added`; both need safe read handling.

## Governance Rules

- Timeline surfaces are read-only.
- The first pass must use existing activity/order data only.
- No new backend writes, activity rows, notification rows, RPCs, views, triggers, migrations, or
  analytics pipeline are part of the MVP.
- No mutation controls should appear inside timeline rows.
- Source and payload display must be safe and minimal. Avoid signed URLs, storage paths, bucket
  names, raw SQL/debug fields, private payload internals, and unvetted metadata dumps.
- Frontend may format, group, and label events, but it must not invent authoritative history.
- Backend activity remains the source of truth for durable system history.
- Activity ownership doctrine remains unchanged: trigger-owned and RPC-owned system events stay
  backend-owned; frontend note orchestration remains transitional unless changed by a separate
  ownership migration slice.
- Timeline work must not create new workflow, lifecycle, assignment, document, notification, or
  permission behavior.
- Historical/admin readback timelines must remain visually distinct from active operational
  timelines if future surfaces include archived/cancelled/voided records.

## First MVP Recommendation

The first implementation should improve the existing Order Detail activity timeline presentation
without changing its data source.

Recommended MVP:

1. Categorize existing activity rows into lifecycle, workflow, assignment, document, note,
   notification-relevant, and system/audit presentation groups.
2. Add compact category chips or icons to timeline rows.
3. Use a compact chronological layout that remains easy to scan inside Order Detail.
4. Render clear event titles and short descriptions from known event types.
5. Keep unknown or legacy events visible with conservative fallback labels rather than hiding them.
6. Preserve actor and timestamp display where available.
7. Avoid raw payload dumps; display only approved, human-readable payload fields.
8. Add focused tests for category labeling, safe payload rendering, chronological ordering, and
   absence of mutation controls.

The MVP should not add a dedicated timeline API, read model, RPC, database view, route, export,
print-packet integration, advanced filters, or admin console.

## Presentation Foundation Status

Operational Timeline Slice 1C implements the first governed frontend-only presentation foundation
for the existing `ActivityLog` row renderer. The foundation keeps the existing
`rpc_get_activity_feed` loading path, realtime subscription path, note composer path, grouping
behavior, and backend activity ownership unchanged.

Completed behavior:

1. Activity rows now use a governed category map for `Lifecycle`, `Workflow`, `Assignment`,
   `Documents`, `Notes`, `System`, and conservative `Unknown` rows.
2. Known event types render clearer titles for lifecycle, workflow, assignment, document,
   note/comment, order-number, date, fee, and system/audit rows.
3. Category chips and category-specific visual treatment make row purpose easier to scan without
   changing event facts or authority.
4. Actor display remains resolved from existing row fields only and is emphasized for human-authored
   rows while system rows retain actor context when available.
5. Safe descriptions are derived only from existing `event_type`, `message` / `body`, `created_at`,
   actor fields, and approved snippets in `detail`.
6. Lifecycle reasons, document title/category/visibility, order-number old/new values, date
   snippets, assignment labels, status from/to labels, and note bodies are the supported safe detail
   outputs.
7. Document rows intentionally do not expose storage paths, bucket names, signed URLs, or raw file
   internals.
8. Unknown/unmapped events remain visible with `Activity event`, `Unknown`, and `Event recorded`
   fallback wording rather than disappearing.
9. Timeline rows include no mutation buttons, links, menus, workflow controls, lifecycle controls,
   document actions, or assignment actions.

This foundation adds no backend/API/RPC/view/migration change, activity write, notification fanout,
mutation behavior, activity ownership change, workflow/lifecycle/assignment/document behavior,
route, permission, saved view, export, print-packet integration, admin console, or historical/admin
readback behavior.

## Grouping Plan

Operational Timeline Slice 1D plans lightweight timeline grouping before additional implementation.
The Slice 1C presentation foundation already makes individual rows clearer through governed
category chips, category-specific styling, safe descriptions, and unknown-event fallbacks. Grouping
should build on that foundation without changing the activity source, hiding events, or introducing
filters.

Grouping options reviewed:

| Option | Benefit | Risk / Reason To Defer |
|---|---|---|
| Date/day grouping | Preserves chronological audit reading while making long timelines easier to scan | Low risk if stable ordering is preserved. Recommended first implementation. |
| Category grouping | Helps users scan lifecycle, workflow, assignment, document, note, and system events by type | Can break event chronology and imply separate authoritative lanes. Defer until filtering or a dedicated read model is designed. |
| Lifecycle/workflow phase grouping | Could make operational state progression easier to understand | Requires stronger workflow/lifecycle interpretation and risks frontend-invented history. Defer. |
| No grouping, improved rows only | Lowest complexity and already partly achieved by Slice 1C | Long order histories remain harder to scan. Keep as fallback, not the preferred next step. |

Recommended first grouping implementation:

1. Use date/day grouping only.
2. Keep global chronological order and stable ordering within each day.
3. Preserve every activity row, including unknown/unmapped events.
4. Do not add filters, category toggles, collapse controls, hidden groups, or event hiding.
5. Continue using the existing activity feed rows and frontend formatting only.
6. Keep category chips as row-level scan aids rather than group-level filters.

Display behavior:

- Events from the current local calendar day should group under `Today`.
- Events from the prior local calendar day should group under `Yesterday`.
- Older events should group under a specific human-readable date.
- Rows within a group should keep deterministic chronological ordering by `created_at`.
- Rows with missing or invalid timestamps should remain visible under a conservative fallback date
  label rather than being dropped.

Grouping guardrails:

- Grouping is read-only presentation.
- Grouping must use existing loaded activity data only.
- No backend/API/RPC/view/migration changes are part of this grouping step.
- No filtering, hiding, collapsing-by-default, or saved grouping views.
- No mutation controls, workflow actions, lifecycle actions, document actions, or assignment
  actions inside timeline groups.
- No raw payload expansion at the group or row level.
- Frontend grouping must not invent lifecycle/workflow phases or authoritative history beyond the
  row timestamps and backend-authored activity facts.

## Date Grouping Foundation Status

Operational Timeline Slice 1E locks the first date/day grouping foundation for the Order Detail
operational timeline using the existing loaded activity feed only. The active timeline renderer now
keeps lightweight frontend grouping by local calendar day while preserving the Slice 1C row
presentation foundation.

Completed behavior:

1. Activity rows are grouped under `Today`, `Yesterday`, or a specific older calendar date label.
2. Rows inside each date group are sorted chronologically by `created_at`.
3. Equal or invalid timestamps receive deterministic fallback ordering rather than being dropped.
4. Unknown/unmapped events remain visible inside their date group with conservative fallback
   labels.
5. Existing category chips, category styling, actor display, and safe detail descriptions are
   preserved.
6. Grouping does not add filters, collapse controls, event hiding, timeline actions, or mutation
   controls.

This foundation remains frontend presentation only. It adds no backend/API/RPC/view/migration
change, no activity data mutation, no activity write, no notification fanout, no payload expansion,
no derived authoritative history, no workflow/lifecycle/assignment/document behavior, no route,
no permission change, and no historical/admin readback behavior.

## Timeline Foundation Closeout

Operational Timeline Slice 1F closes out and locks the initial governed Order Detail operational
timeline foundation. The foundation is limited to read-only frontend presentation over existing
activity feed data.

Locked behavior:

1. Category mapping is governed and limited to `Lifecycle`, `Workflow`, `Assignment`, `Documents`,
   `Notes`, `System`, and conservative `Unknown` presentation groups.
2. Category chips and category-specific styling are presentation-only scan aids.
3. Event titles and descriptions are derived from known safe labels and approved detail snippets.
4. Unknown/unmapped events are preserved and shown with conservative fallback wording.
5. Date/day grouping is the only grouping foundation: `Today`, `Yesterday`, and specific older
   calendar dates.
6. Rows inside each date group use deterministic chronological ordering.
7. Timeline rows remain read-only and contain no timeline actions, workflow controls, lifecycle
   controls, document actions, assignment actions, menus, links, or mutation controls.
8. The timeline uses existing loaded activity data only.
9. Backend activity remains the source of truth for durable operational history.
10. Frontend timeline code may format, label, group, and present activity, but it must not invent
    authoritative history.
11. No timeline filters, event hiding, category hiding, collapse-by-default behavior, or saved
    timeline views are part of this foundation.
12. No raw payload expansion is allowed. Raw `detail` objects, storage paths, bucket names, signed
    URLs, debug fields, SQL internals, and private payload internals remain excluded.
13. No backend/API/RPC/view/migration changes are part of the foundation.

Deferred future work:

- Event-type filters.
- Richer timeline lanes for lifecycle, workflow, assignment, document, note, or system/audit
  reading when a dedicated design exists.
- Dedicated timeline API or read model if the current activity feed is insufficient for richer
  presentation.
- Printable timeline inclusion in Order Detail print packets or audit packets.
- Exportable audit trail.
- Admin audit console.

## Deferred Work

- Dedicated timeline API or read model if existing activity data becomes too expensive or too
  inconsistent for richer presentation.
- Advanced filtering by event type, actor, source, date range, or operational category.
- Assignment and lifecycle timeline lanes with stronger visual separation.
- Printable timeline inclusion in Order Detail print packets or future audit packets.
- Exportable audit trail for internal review or compliance workflows.
- Admin audit console with broader search and governance-specific permissions.
- Backend note/workflow activity ownership migrations if atomic note + transition history becomes
  required.
- Payload and actor normalization after the current activity ownership doctrine is further
  stabilized.
