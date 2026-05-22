# Order Assignment Mutation Audit

## Purpose

This audit documents currently identified order assignment mutation paths before further CRUD
hardening. It separates internal order participant assignment from cross-company assignment
packets, records current ownership, and identifies remaining direct-write and compatibility seams.

This is a planning and test-guard document. Sprint 4E makes no runtime behavior, permission, RLS,
workflow, lifecycle, RPC, or assignment feature changes.

Related doctrine:

- `docs/CRUD_STABILIZATION_MATRIX.md`
- `docs/ORDER_WORKFLOW_STATUS_WRITE_AUDIT.md`

## Current Status

Status: **Sprint 4E locks assignment mutation stabilization as substantially complete for the
current product scope. Cross-company assignment packet lifecycle mutations remain backend-owned
through `rpc_order_company_assignment_*` RPCs, with assignment-scoped activity and notifications.
Internal order participant assignment is allowed only through order create/edit RPCs or the guarded
`rpc_assign_order(...)` compatibility path; deprecated direct frontend helper exports throw before
mutating `orders` participant columns; direct frontend participant-column writes are source-scan
blocked.**

Assignment work currently falls into two different domains:

- **Internal order participant assignment:** `orders.appraiser_id`, `orders.assigned_to`,
  `orders.reviewer_id`, and `orders.current_reviewer_id` inside the owner company.
- **Cross-company assignment packets:** `order_company_assignments` records that grant scoped packet
  access to another company without writing external vendors into owner-company participant fields.

Those domains should not be collapsed. Assignment packets are not canonical order assignment
columns, and relationship records alone do not grant order/client visibility.

## Stabilized Doctrine

Sprint 4E closes the current assignment mutation stabilization track around these rules:

- Order create/update participant assignment remains RPC-owned through `rpc_create_order(...)` and
  `rpc_update_order(...)` for current routed form flows.
- Direct frontend writes to `orders.appraiser_id`, `orders.assigned_to`, `orders.reviewer_id`, and
  `orders.current_reviewer_id` are quarantined or source-scan blocked.
- Deprecated internal assignment helper exports remain throwing compatibility stubs and must not be
  used for new feature work.
- `rpc_assign_order(...)` remains a guarded transitional compatibility path for legacy
  `assigned_to` assignment only.
- Cross-company assignment packet lifecycle is backend-owned through
  `rpc_order_company_assignment_*` RPCs and must remain separate from owner-company participant
  columns.
- Assignment packet activity and notification side effects are backend RPC-owned and
  assignment-scoped; internal participant side effects are currently split between order triggers
  and the `rpc_assign_order(...)` compatibility RPC.
- Frontend assignment UI should call approved service/API wrappers only and should not add parallel
  activity or notification fanout around assignment mutations.

## Approved / Current Mutation Map

| Surface | Frontend Path | Backend Mutation Owner | Current Status |
|---|---|---|---|
| Order create appraiser field | `createOrderViaRpc(...)` -> `rpc_create_order(payload)` | Order create RPC plus assignment target trigger | Approved only as part of order create; not a standalone reassignment API |
| Order edit appraiser/reviewer fields | `updateOrderViaRpc(...)` -> `rpc_update_order(order_id, patch)` | Order update RPC plus assignment target trigger | Approved only as part of normal order edit; reassignment semantics need product cleanup |
| Legacy assigned appraiser RPC | `src/features/orders/actions.js#assignOrder(...)` -> `rpc_assign_order(...)` | Guarded compatibility RPC | Transitional; not canonical active UI doctrine |
| Assignment packet offer | `offerAssignment(...)` -> `rpc_order_company_assignment_offer(...)` | Assignment lifecycle RPC | Approved packet lifecycle path |
| Assignment packet accept/decline | `acceptAssignment(...)`, `declineAssignment(...)` -> assignment RPCs | Assignment lifecycle RPCs | Approved packet lifecycle paths |
| Assignment packet start/submit | `startAssignment(...)`, `submitAssignment(...)` -> assignment RPCs | Assignment lifecycle RPCs | Approved packet lifecycle paths |
| Assignment packet complete/cancel/revoke | `completeAssignment(...)`, `cancelAssignment(...)`, `revokeAssignment(...)` -> assignment RPCs | Assignment lifecycle RPCs | Approved packet lifecycle paths |
| Assignment packet owner/order/detail reads | assignment API list/detail wrappers | Assignment read RPCs | Approved read paths; not mutation paths |

## Approved Path Details

| Path | Fields Mutated | Required Permission / Scope | Activity | Notifications | Doctrine |
|---|---|---|---|---|---|
| `createOrderViaRpc(...)` -> `rpc_create_order(payload)` | Creates `orders` row and may set `appraiser_id`; does not currently act as standalone reviewer assignment | Requires `current_app_user_can_create_order()` plus attachable client/AMC checks; assignment target trigger validates current-company appraiser role | `order_created` activity from order insert trigger; assignment trigger behavior may also notify when `appraiser_id` is set | Appraiser assignment notification trigger can emit `order.new_assigned` for `appraiser_id` | Long-term canonical for order creation, but not a standalone assignment surface |
| `updateOrderViaRpc(...)` -> `rpc_update_order(order_id, patch)` | May update `appraiser_id` and `reviewer_id` as part of normal order edit field coverage | Requires readable/updateable order scope through `current_app_user_can_update_order_row(...)`; assignment target trigger validates current-company appraiser/reviewer roles | `assignee_changed` activity for `appraiser_id` / `reviewer_id` changes via order update trigger | Appraiser assignment notification trigger can emit `order.new_assigned` / `order.reassigned`; reviewer notification semantics remain deferred | Current approved routed edit path; dedicated reassignment RPC remains a cleanup candidate |
| `assignOrder(...)` -> `rpc_assign_order(p_order_id, p_assigned_to, p_note)` | Updates `orders.assigned_to` only | Requires authenticated current-company membership, readable/updateable order scope, `assignments.assign_appraiser` or `assignments.reassign`, and assignable current-company appraiser target | Inserts `activity_log.action = 'assignment'` with supplied note fallback | No dedicated notification documented in the compatibility RPC itself; downstream order triggers do not cover `assigned_to` notifications today | Transitional guarded compatibility path |
| `offerAssignment(...)` -> `rpc_order_company_assignment_offer(...)` | Inserts `order_company_assignments` packet row; does not mutate order participant columns | Requires owner current-company scope, readable/updateable source order, active outgoing relationship, compatible assignment type, `order_company_assignments.offer`, and `relationships.assign_work` | Backend assignment event through `log_order_company_assignment_event(...)` | Backend assignment fanout through `notify_order_company_assignment_event(...)` to assignment packet recipients | Long-term canonical for cross-company assignment offers |
| `accept/decline/start/submit/complete/cancel/revokeAssignment(...)` -> `rpc_order_company_assignment_*` | Mutates `order_company_assignments.status` and lifecycle timestamps/payloads/reasons as applicable; does not mutate order participant columns | Requires owner-company or assigned-company scope depending on action, active relationship and assignment state, plus matching `order_company_assignments.*` permission | Backend assignment event through `log_order_company_assignment_event(...)`; `assignment.started` is activity-only | Backend assignment fanout through `notify_order_company_assignment_event(...)`, except `assignment.started` currently has no fanout | Long-term canonical for assignment packet lifecycle |

The approved cross-company packet UI is `src/features/assignments/api.js` plus assignment packet
surfaces. Owner offer UX starts from Order Detail but writes only through
`rpc_order_company_assignment_offer(...)`; assigned-company users use assignment packet routes and
must not be linked into canonical `/orders/:id` detail as a side effect of packet access.

## Backend-Owned Assignment Packet Lifecycle

The `order_company_assignment_*` RPC family owns cross-company packet lifecycle writes:

- `rpc_order_company_assignment_offer(...)`
- `rpc_order_company_assignment_accept(...)`
- `rpc_order_company_assignment_decline(...)`
- `rpc_order_company_assignment_start(...)`
- `rpc_order_company_assignment_submit(...)`
- `rpc_order_company_assignment_complete(...)`
- `rpc_order_company_assignment_cancel(...)`
- `rpc_order_company_assignment_revoke(...)`

The backend enforces current-company context, owner-vs-assigned-company scope, relationship state,
assignment type compatibility, readable/updateable source order requirements where applicable, and
`order_company_assignments.*` plus `relationships.assign_work` permissions. Assignment packet
lifecycle mutations do not write `orders.appraiser_id`, `orders.assigned_to`, `orders.reviewer_id`,
or `orders.current_reviewer_id`.

Packet lifecycle side effects are assignment-scoped:

- Activity is written through `log_order_company_assignment_event(...)` into
  `order_company_assignment_activity`.
- Notifications are written through `notify_order_company_assignment_event(...)` and link to
  `/assignments/:assignmentId`.
- Assigned-company notification payloads avoid canonical order visibility; owner-company payloads
  may include owner-side order context.
- `assignment.started` currently records activity but has no notification fanout.

## Internal Order Participant Assignment

Internal participant assignment remains a mixed surface:

- Order create can set `appraiser_id` through `rpc_create_order(...)`.
- Order edit can set `appraiser_id` and `reviewer_id` through `rpc_update_order(...)`.
- Assignment target validation is trigger-backed by `tg_orders_validate_assignment_targets()`,
  which validates appraiser/reviewer targets against current-company membership and role capability.
- `rpc_assign_order(uuid, uuid, text)` is a guarded compatibility RPC for `assigned_to`; it requires
  current-company membership, readable/updateable order scope, assignment permission, and an
  assignable appraiser target.
- `rpc_assign_reviewer(...)`, `rpc_assign_next_reviewer(...)`, and the older
  `rpc_assign_order(uuid, uuid)` overload are quarantined from authenticated callers.

Internal participant activity/notification behavior is not yet fully productized:

- `tg_orders_audit_upd()` writes `assignee_changed` activity for `appraiser_id` and `reviewer_id`
  changes.
- Assignment notification trigger behavior exists for `appraiser_id` insert/update, producing
  `order.new_assigned` or `order.reassigned` notifications.
- Reviewer assignment notification semantics and `assigned_to` vs `appraiser_id` responsibility
  semantics remain cleanup candidates.

## Activity / Notification Ownership Audit

Sprint 4D found no obvious active duplicate-write bug, but side-effect ownership is split across
order triggers, a compatibility assignment RPC, and packet lifecycle RPCs.

| Path | Activity Owner | Notification Owner | Duplicate Risk | Long-Term Owner / Gap |
|---|---|---|---|---|
| `createOrderViaRpc(...)` -> `rpc_create_order(payload)` with `appraiser_id` | Backend trigger-owned: `trg_orders_audit_ins` writes `order_created`; there is no separate create-time `assignee_changed` activity | Backend trigger-owned: `trg_orders_insert_assignment_notification` emits `order.new_assigned` for inserted `appraiser_id` | Low today because frontend create does not emit assignment activity/notifications; future frontend assignment fanout would duplicate trigger behavior | Keep create side effects backend-owned; if participant assignment becomes a dedicated RPC later, it should replace or deliberately coordinate with trigger fanout |
| `updateOrderViaRpc(...)` -> `rpc_update_order(order_id, patch)` for `appraiser_id` / `reviewer_id` | Backend trigger-owned: `tg_orders_audit_upd()` writes `assignee_changed` for `appraiser_id` and `reviewer_id` changes | Backend trigger-owned only for `appraiser_id` via `trg_orders_insert_assignment_notification`; reviewer notification fanout is missing/deferred | Low currently; risk rises if a future reassignment RPC adds explicit activity/notifications while existing triggers remain active | Desired owner is backend-only participant assignment side effects; reviewer notification semantics need explicit design |
| `assignOrder(...)` -> `rpc_assign_order(p_order_id, p_assigned_to, p_note)` | RPC-owned compatibility activity: inserts `activity_log.action = 'assignment'`; `tg_orders_audit_upd()` does not log `assigned_to` | Missing today: no dedicated compatibility RPC notification and appraiser notification trigger does not cover `assigned_to` | Low currently; adding an `assigned_to` trigger without removing the RPC activity insert could duplicate activity | Transitional path; if retained, move to a canonical participant assignment service/RPC with one clear activity and notification owner |
| `offerAssignment(...)` -> `rpc_order_company_assignment_offer(...)` | Backend RPC-owned through `log_order_company_assignment_event(...)` into `order_company_assignment_activity` | Backend RPC-owned through `notify_order_company_assignment_event(...)`, linking to `/assignments/:assignmentId` | Low; frontend must not add parallel packet lifecycle fanout | Long-term canonical packet owner |
| `accept/decline/start/submit/complete/cancel/revokeAssignment(...)` -> `rpc_order_company_assignment_*` | Backend RPC-owned through `log_order_company_assignment_event(...)`; `assignment.started` is activity-only | Backend RPC-owned through `notify_order_company_assignment_event(...)`; `assignment.started` intentionally returns no fanout | Low; duplicate risk would come from frontend packet notifications or canonical order activity leakage | Long-term canonical packet owner; keep packet activity separate from order activity |

Current transitional gaps:

- Reviewer assignment changes get `assignee_changed` activity but no dedicated reviewer assignment
  notification doctrine.
- `assigned_to` compatibility assignment gets RPC-owned activity but no notification fanout.
- Internal participant side effects are split between order triggers and `rpc_assign_order(...)`;
  a future dedicated participant assignment RPC should define whether triggers remain the side-effect
  owner or are replaced by explicit RPC-owned activity/notifications.
- Cross-company packet notifications are backend-owned and assignment-scoped; new frontend packet
  notification helpers would create duplicate fanout risk.

## Deprecated / Direct Helper Risks

Known frontend compatibility seams:

| Path | Current Behavior | Risk |
|---|---|---|
| `src/lib/services/ordersService.js#assignParticipants(...)` | Throwing quarantine stub after Sprint 4B | Preserved export for compatibility, but it no longer mutates `orders` |
| `src/lib/services/ordersService.js#assignAppraiser(...)` / `assignReviewer(...)` | Funnel into the throwing `assignParticipants(...)` quarantine stub | Preserved exports for compatibility, but they no longer mutate `orders` |
| `src/lib/services/ordersService.js#updateAssignees(...)` | Funnels into the throwing assignment quarantine stub | Preserved export for compatibility, but it no longer mutates `orders` |
| `src/lib/api/orders.js#assignAppraiser(...)` | Throwing quarantine stub after Sprint 4B | Preserved export for compatibility, but it no longer mutates `orders` |
| `src/lib/api/orders.js#bulkAssignAppraiser(...)` | Throwing quarantine stub after Sprint 4B | Bulk appraiser assignment remains unsupported without an explicit backend-owned design |
| `src/features/orders/actions.js#assignOrder(...)` | Calls guarded compatibility `rpc_assign_order(...)` | Transitional adapter outside canonical order service wrappers |

The CRUD source scan now blocks explicit frontend `orders` insert/update/upsert calls that include
`appraiser_id`, `assigned_to`, `reviewer_id`, or `current_reviewer_id` object fields. It also keeps
legacy internal assignment helper reachability confined to the legacy/quarantined files. It does
not block approved order create/edit RPC payload fields or assignment packet RPC wrappers.

Sprint 4C added test coverage that locks the approved frontend boundaries:

- `createOrderViaRpc(...)` passes participant payload through `rpc_create_order(...)` without direct
  table insert.
- `updateOrderViaRpc(...)` passes participant fields through `rpc_update_order(...)` without direct
  table update.
- `assignOrder(...)` calls only `rpc_assign_order(...)` and does not direct-update `orders`.
- Assignment packet lifecycle helpers call only `rpc_order_company_assignment_*` RPCs and do not use
  direct table writes.
- CRUD source scans continue to block direct participant-column writes and active legacy helper
  reachability.

## Company Scope / RLS Assumptions

- Direct authenticated writes to `orders` are restricted by current order write policies; active
  frontend code should rely on RPC wrappers rather than direct table mutation.
- Assignment target validation protects `orders` participant columns on insert/update.
- Cross-company assignment packets are security-definer RPC-owned and validate owner-company,
  assigned-company, relationship, permission, and assignment state boundaries.
- Assignment packet visibility does not imply canonical order, client, calendar, activity, or
  notification visibility.
- Assignment packet notifications use assignment links, not assigned-company `/orders/:id` links.

## Permission / Role Coupling

Internal participant assignment currently depends on a mix of order update permission, assignment
permission, active company membership, and role eligibility:

- Appraiser targets must be active current-company members with Appraiser role capability.
- Reviewer targets must be active current-company members with Reviewer role capability.
- `rpc_assign_order(...)` checks `assignments.assign_appraiser` or `assignments.reassign`.
- Order create/edit assignment fields currently ride through broader order create/update
  authorization and trigger-level target validation.

Assignment packet lifecycle uses assignment and relationship permissions instead:

- `order_company_assignments.offer`
- `order_company_assignments.respond`
- `order_company_assignments.progress`
- `order_company_assignments.complete`
- `order_company_assignments.cancel`
- `order_company_assignments.revoke`
- `order_company_assignments.read_owner`
- `order_company_assignments.read_assigned`
- `relationships.assign_work`

## Deferred Cleanup

- Design dedicated participant assignment RPCs if appraiser/reviewer reassignment needs to become a
  first-class surface outside generic order edit.
- Replace remaining legacy `assignOrder(...)` adapter usage with a chosen canonical assignment
  service path if `rpc_assign_order(...)` remains product-supported.
- Retire the `assigned_to` compatibility path once responsibility semantics are unified.
- Clarify `assigned_to` versus `appraiser_id` responsibility semantics.
- Define reviewer assignment notification behavior and whether assignment notifications should be
  fully backend-owned by a dedicated participant assignment RPC.
- Unify internal participant assignment activity/notification ownership so future RPCs do not
  duplicate existing trigger-owned side effects.
- Decide whether bulk appraiser assignment should remain unsupported or be redesigned as an explicit
  backend-owned bulk operation.
- Keep assignment packet lifecycle separate from owner-company participant assignment and from
  normal workflow Smart Actions.
- Design future Assignment History/Admin surfaces only if product needs explicit packet or
  participant assignment audit review outside existing order/assignment detail timelines.
