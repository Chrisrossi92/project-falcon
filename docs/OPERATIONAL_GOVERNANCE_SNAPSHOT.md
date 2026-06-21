# Operational Governance Snapshot

## Purpose

This snapshot consolidates the currently stabilized CRUD governance domains into one operational
reference. It summarizes authoritative mutation owners, approved frontend surfaces,
quarantined/deprecated paths, source-scan protections, deferred items, and future migrations.

This is a planning and governance document. Sprint 5D makes no runtime behavior, permission, RLS,
RPC, route, UI, workflow, lifecycle, assignment, activity, notification, or feature changes.

Related doctrine:

- `docs/CRUD_STABILIZATION_MATRIX.md`
- `docs/ORDER_RETIREMENT_DOCTRINE.md`
- `docs/ORDER_WORKFLOW_STATUS_WRITE_AUDIT.md`
- `docs/ORDER_ASSIGNMENT_MUTATION_AUDIT.md`
- `docs/ACTIVITY_EVENT_OWNERSHIP_AUDIT.md`
- `docs/NOTIFICATION_OWNERSHIP_AUDIT.md`
- `docs/ACTIVITY_NOTIFICATION_OWNERSHIP_DOCTRINE.md`

## Current Status

Status: **Sprint 5D creates a consolidated operational governance snapshot without behavior
changes. Order retirement lifecycle, workflow mutation, assignment mutation, activity ownership,
and notification ownership now have documented authority boundaries, approved surfaces,
quarantined seams, source-scan expectations, and deferred cleanup tracks.**

## Current Governance Principles

1. **Backend-owned authoritative mutation.**
   Authoritative domain mutations should live in backend RPCs, backend triggers, or Edge-mediated
   paths when storage/Auth provider work is required.

2. **RPC-first operational writes.**
   Browser UI should call service/API wrappers that reach guarded RPCs or Edge functions. Direct
   table writes are not an acceptable pattern for new operational domains.

3. **No direct frontend domain writes.**
   Direct frontend mutation of `orders`, lifecycle fields, workflow status, participant assignment
   columns, activity tables, notification tables, documents, assignments, team access, or
   relationship lifecycle state should be blocked, quarantined, or explicitly documented as a
   temporary compatibility seam.

4. **Preserved operational history.**
   Archive/cancel/void retire or terminalize operational rows without deleting order numbers,
   documents, assignments, activity, notifications, calendar rows, or existing history.

5. **Frontend orchestration is transitional only.**
   Current frontend workflow notifications, note orchestration, and some compatibility helpers are
   transitional unless explicitly product-approved. New authoritative events should be backend-owned.

6. **Source scans are an enforcement layer.**
   Source scans complement backend authorization by blocking reintroduction of direct writes,
   deprecated helper reachability, and unapproved readback flags in frontend code.

7. **Historical surfaces require explicit opt-in.**
   Archived, cancelled, voided, and future historical/admin readback surfaces must opt in through
   approved low-level flags and source-scan whitelists. Active operational lists must not silently
   include retired lifecycle rows.

8. **No hidden lifecycle destruction.**
   Hard delete, restore, unarchive, reopen, bulk lifecycle action, table-menu lifecycle action, or
   silent lifecycle fanout must not be added outside an explicit design slice.

9. **Safe side-effect payloads.**
   Activity and notification payloads should be minimal, source-traceable, and safe for the
   recipient. They must not include signed URLs, storage paths, bucket names, hidden packet data, or
   unrelated client/account details.

10. **Actor identity comes from backend context.**
    Authoritative actor attribution should come from current app user/current company backend
    context, not arbitrary frontend strings.

## Stabilized Domain Snapshot

| Domain | Authoritative Mutation Owner | Approved Frontend Surfaces | Quarantined / Deprecated Paths | Source-Scan Protections | Deferred / Transitional Items | Known Future Migrations |
|---|---|---|---|---|---|---|
| Order retirement lifecycle | `rpc_order_archive(...)`, `rpc_order_cancel(...)`, `rpc_order_void(...)`; order status audit trigger for terminal status history | Controlled Order Detail archive/cancel/void actions only | Direct archive/delete helpers; direct lifecycle writes; table/bulk lifecycle concepts | Direct delete/archive writes blocked; lifecycle wrapper reachability restricted; archived/retired readback flags confined to low-level APIs | Restore/reopen/unarchive unsupported; lifecycle notification doctrine deferred | Explicit History/Admin readback surfaces; lifecycle notification policy if product-approved |
| Workflow mutation | `rpc_transition_order_status(...)` through canonical `ordersService` helpers; owner/admin override through `rpc_order_status_override(...)`; order audit trigger owns `status_changed` activity | Smart Actions and Order Detail `Recommended next step` for normal guided workflow; owner/admin `More actions > Override status` for audited exceptional control; drawer contextual duplicates; reviewer shortcut transitional duplicate | Generic status helpers, bulk status helpers, arbitrary status adapters, freeform status panel, direct `orders.status` writes, override presented as a recommendation | Direct status writes blocked; generic helper reachability blocked; direct transition RPC calls confined to `ordersService.js`; override requires `workflow.override_status` | Frontend workflow notifications; frontend review/revision notes; reviewer shortcut duplication; `request_final_approval` notification semantics | Backend-owned workflow notifications; backend-owned atomic review/revision notes; reviewer shortcut consolidation |
| Assignment mutation | Order create/update RPCs for internal participant fields; guarded `rpc_assign_order(...)` for transitional `assigned_to`; `rpc_order_company_assignment_*` for packets | Routed order create/edit forms; assignment packet UI/API surfaces | Deprecated direct assignment helpers; direct participant-column updates; legacy assignment adapters outside approved paths | Direct participant-column writes blocked; legacy assignment helper usage confined to quarantine files | Reviewer assignment notification doctrine; `assigned_to` compatibility; mixed appraiser/reviewer side-effect ownership | Dedicated participant assignment RPCs; unified participant side effects; `assigned_to` path retirement; assignment History/Admin surfaces if needed |
| Activity ownership | Order audit triggers; lifecycle/document/order-number RPCs; guarded `rpc_log_event(...)`; assignment packet activity RPCs | Order notes through `logNote(...)`; order/detail timelines; assignment packet timelines | Low-level activity wrappers; legacy review helper; disabled duplicate legacy triggers | Direct activity table write protections are expected through CRUD source scan/watchlist hardening; low-level wrapper reachability remains future hardening | Frontend note orchestration; non-atomic review/revision notes; payload/actor inconsistency | Dedicated note RPC or backend note orchestration; wrapper quarantine; activity payload/actor normalization |
| Notification ownership | `rpc_notification_create(...)` as insert gate; appraiser assignment trigger; assignment packet notification RPC helper; notification read/mark/dismiss/preference RPCs | Bell/list/read surfaces; transitional workflow/note `emitNotification(...)`; settings preferences | Generic `sendNotification(...)`; legacy SQL notify helpers; direct notification insert concepts | Direct notification table writes blocked by RLS and should remain source-scan guarded; generic helper reachability remains future hardening | Frontend workflow/note fanout; missing lifecycle/document/reviewer/`assigned_to` fanout; payload/actor inconsistency | Backend workflow fanout; lifecycle notification doctrine; document notification doctrine; reviewer assignment fanout; generic helper quarantine |

## Domain Notes

### Order Retirement Lifecycle

Archive, cancel, and void are backend-owned lifecycle actions. They preserve operational history and
are exposed only through controlled Order Detail actions. Active lists exclude archived, cancelled,
and voided rows by default. Future History/Admin surfaces must be explicitly designed and
source-scan whitelisted.

### Workflow Mutation

Normal workflow mutation is substantially stabilized around named service helpers and
`rpc_transition_order_status(...)`. The main remaining governance risk is not the status mutation
itself; it is transitional frontend side effects around workflow notifications, optional notes, and
duplicated reviewer shortcut rendering.

Order Detail now separates normal guidance from exceptional owner/admin control. Normal guided
workflow actions live in the `Recommended next step` surface and are derived from the shared Smart
Actions decision model. Owner/admin status override lives only under `More actions > Override
status`, requires `workflow.override_status`, requires a non-empty reason, calls the backend-owned
`rpc_order_status_override(...)` path through `overrideOrderStatusViaRpc(...)`, and records an
explicit `order.status_override` activity event with from/to status, reason, source, and override
metadata. Override is not a recommendation and must not be added to Smart Actions. Cancel and void
remain separate terminal lifecycle actions, not generic status override targets.

### Assignment Mutation

Cross-company assignment packet lifecycle is backend-owned and packet-scoped. Internal participant
assignment remains split between order create/update RPCs, appraiser assignment trigger side
effects, reviewer assignment gaps, and the transitional `assigned_to` compatibility RPC. Direct
participant-column helper writes are quarantined.

### Activity Ownership

System activity is mostly trigger-owned or backend RPC-owned. Human notes remain a guarded
frontend-orchestrated seam. New authoritative system events should be owned by the backend mutation
boundary that caused the event, with safe payloads and backend-derived actor context.

### Notification Ownership

Notification insertion is guarded, but fanout ownership is mixed. Assignment packet fanout and
appraiser assignment fanout are backend-owned. Normal workflow and note/comment fanout remain
frontend-orchestrated transitional seams. Lifecycle, document, reviewer assignment, and
`request_final_approval` notifications remain doctrine gaps.

## Current Major Deferred Areas

- **Backend notification migration.**
  Move workflow and possibly note/comment notification fanout backend-side without duplicating
  current frontend emissions.

- **Reviewer shortcut consolidation.**
  Merge `ReviewerActionCell` into shared Smart Action descriptors or remove the active duplicate
  rendering path.

- **Participant assignment RPC unification.**
  Design dedicated participant assignment RPCs that unify appraiser/reviewer/assigned-to semantics,
  side effects, activity, and notifications.

- **History/Admin surfaces.**
  Design explicit readback surfaces for archived, cancelled, voided, and possibly assignment
  history/admin review without contaminating active operational lists.

- **Future multi-company operational isolation refinements.**
  Continue tightening assignment packet visibility, relationship boundaries, company-scoped
  notification/activity payloads, and default-company compatibility seams.

- **Eventual production cutover tasks.**
  Validate company-scoped staging/final production behavior, data backfills, permission grants,
  source-scan coverage, Order Documents deployment safety, and legacy production blockers before
  final cutover.

## Non-Goals

- No new features are introduced by this snapshot.
- No runtime code, tests, migrations, permissions, RLS, routes, or UI changed in Sprint 5D.
- This snapshot does not approve new lifecycle, workflow, assignment, activity, or notification
  behavior. Future behavior still needs its own design and implementation slice.
