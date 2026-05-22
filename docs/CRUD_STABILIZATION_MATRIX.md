# CRUD Stabilization Matrix

## Purpose

Falcon should stabilize its core CRUD and data lifecycle surfaces before adding more workflow
features. This matrix records the current surface ownership, approved write paths, known
compatibility seams, and the recommended cleanup order.

This is a planning and test-guard document. It does not change runtime behavior, permissions, RLS,
RPCs, routes, or Supabase state.

Related doctrine:

- `docs/ORDER_RETIREMENT_DOCTRINE.md`
- `docs/ORDER_WORKFLOW_STATUS_WRITE_AUDIT.md`
- `docs/ORDER_ASSIGNMENT_MUTATION_AUDIT.md`
- `docs/ACTIVITY_EVENT_OWNERSHIP_AUDIT.md`
- `docs/NOTIFICATION_OWNERSHIP_AUDIT.md`
- `docs/ACTIVITY_NOTIFICATION_OWNERSHIP_DOCTRINE.md`
- `docs/OPERATIONAL_GOVERNANCE_SNAPSHOT.md`

## Core CRUD Surface Inventory

| Surface | Create | Read / List | Detail | Update | Archive / Delete |
|---|---|---|---|---|---|
| Orders | `/orders/new` through `createOrderViaRpc(...)` / `rpc_create_order(...)` | `/orders` through order views/table services excluding archived, cancelled, and voided rows by default | `/orders/:id` through order read service/view, including archived/cancelled/voided readback for preserved history | `/orders/:id/edit` through `updateOrderViaRpc(...)` / `rpc_update_order(...)`; site visit through same RPC | Guarded internal Order Detail archive action uses `canArchiveOrder(...)` and `archiveOrderViaRpc(...)`; no list, bulk, delete, or restore UI |
| Order workflow | No standalone create | Smart actions, drawer/table/detail actions | Order Detail has controlled cancel/void actions only | `rpc_transition_order_status(...)` through canonical workflow helpers; Order Detail cancel/void actions use `cancelOrderViaRpc(...)` / `voidOrderViaRpc(...)` only | Completion exists; cancel/void table, bulk, smart-action, restore, and reopen behavior remain deferred |
| Order documents | Edge prepare/upload plus finalize RPC | `rpc_order_documents_list(...)` | Compact `OrderDetail` Files card | finalize upload only | `rpc_order_document_archive(...)`; hard storage delete deferred |
| Clients | `/clients/new` through `rpc_client_management_create(...)` | `/clients`, `/clients/cards` through client management RPCs | `/clients/:id`, `/clients/profile/:clientId` | `rpc_client_management_update(...)` | `rpc_client_management_archive(...)` exists; active UI archive doctrine is not stabilized |
| AMCs | Managed as client/category data | AMC options through `rpc_client_management_amc_options(...)` | Client detail/category surfaces | Client management update path | Same client archive path if product-approved |
| Contacts | Embedded client/contact fields | Client list/detail projections | Client detail | Client management update path | No standalone lifecycle yet |
| Users / Team Access | Invite-only through invitation Edge/RPC flow | `/users` through `rpc_company_member_list(...)` | Card/list surface; old detail routes redirect | `rpc_company_member_role_update(...)`, `rpc_company_member_set_status(...)` | Deactivate/reactivate only; no hard delete |
| Invitations | `invite-company-member` Edge plus prepare/finalize RPCs | invitation list RPC | panel rows | cancel/resend RPC/Edge flows | cancel pending invite |
| Assignments | owner offer through `rpc_order_company_assignment_offer(...)`; internal order participant assignment currently rides through order create/edit RPCs or guarded compatibility RPCs | assignment inbox/list RPCs; order participant columns through order views | assignment packet RPCs; owner Order Detail assignment panel | packet accept/decline/start/submit/complete/cancel/revoke RPCs; deprecated direct internal assignment helpers throw after Sprint 4B; Sprint 4E locks current assignment mutation doctrine | terminal packet lifecycle RPCs; no packet hard delete or direct row mutation |
| Relationships | relationship invite RPCs | relationship list RPCs | relationship detail route/RPC | approve/suspend/reactivate RPCs | archive RPC |
| Activity | order system activity through triggers/RPCs; notes through guarded `rpc_log_event(...)`; assignment packets through assignment activity RPCs | `/activity`, order detail timeline | order-scoped/assignment-scoped timelines | update/delete generally blocked or moderator-only for legacy table | delete blocked for app roles in primary paths |
| Notifications | workflow/note fanout through guarded frontend `emitNotification(...)`; appraiser assignment trigger; assignment packet RPC fanout | bell/list/count RPCs | bell row navigation | mark read/all read/dismiss RPCs | delivery records are not hard-deleted by normal UI |
| Settings / Owner Setup | none, except guarded profile update | setup context RPC | `/settings/owner-setup` | company profile update only | none |

## Mutation Ownership Doctrine

- Browser UI should call service/API wrappers, not write directly to domain tables.
- Domain writes should be RPC-first or Edge-mediated when storage/Auth provider work is required.
- RPCs own company context, authorization, field allowlists, activity side effects, and notification
  side effects.
- Frontend permission gates control visibility and affordances only; backend authorization remains
  authoritative.
- Deprecated direct helpers may remain temporarily as compatibility seams, but active routed
  surfaces should not introduce new direct table mutations.

## Approved Write Paths By Surface

| Surface | Approved Write Path |
|---|---|
| Orders create | `createOrderViaRpc(...)` -> `rpc_create_order(...)` |
| Orders normal edit | `updateOrderViaRpc(...)` -> `rpc_update_order(...)` |
| Site visit | `updateSiteVisitAtViaRpc(...)` -> `rpc_update_order(...)` |
| Order number override | `overrideOrderNumber(...)` -> `rpc_order_number_override(...)` |
| Workflow/status | Smart Actions / controlled handlers -> canonical `ordersService` workflow helpers -> internal transition RPC helper -> `rpc_transition_order_status(...)` |
| Orders cancel/void | controlled Order Detail actions -> `cancelOrderViaRpc(...)` -> `rpc_order_cancel(...)`; `voidOrderViaRpc(...)` -> `rpc_order_void(...)` |
| Orders archive | controlled Order Detail action -> `archiveOrderViaRpc(...)` -> `rpc_order_archive(...)` |
| Order documents upload | `order-document-upload-url` Edge -> prepare RPC -> signed private upload -> finalize RPC |
| Order documents download | `order-document-download-url` Edge -> download authorization RPC |
| Order documents archive | `archiveOrderDocument(...)` -> `rpc_order_document_archive(...)` |
| Clients create/update/archive | `clientManagementApi` -> `rpc_client_management_*` |
| Team roles/status | `company-members/api` -> `rpc_company_member_*` |
| Team invitations | invitation APIs/Edge -> invitation prepare/finalize/list/cancel/resend RPCs |
| Internal order participants | order create/edit RPCs for current routed form flows; guarded compatibility `rpc_assign_order(...)` for legacy `assigned_to` assignment only; deprecated direct helpers throw after Sprint 4B; direct participant-column writes are source-scan blocked |
| Assignments | assignment API -> `rpc_order_company_assignment_*` |
| Relationships | relationship API -> relationship lifecycle RPCs |
| Activity events | order audit triggers / guarded lifecycle/document/activity RPCs; assignment packet activity -> `order_company_assignment_activity` |
| Notifications | notification create -> `rpc_notification_create(...)`; workflow/note fanout -> transitional `emitNotification(...)`; assignment packet fanout -> `notify_order_company_assignment_event(...)`; read/mark/dismiss/preference writes -> notification RPCs |
| Current user settings | current-user settings API -> `rpc_current_user_settings_*` |

## Deprecated / Direct Helper Watchlist

Known compatibility seams that should not be used by new feature work:

- `src/lib/services/ordersService.js`: deprecated direct order create/update/date helpers remain exported; direct delete/archive helpers are throwing quarantine stubs after Sprint 2D, generic status helpers throw after Sprint 3B, and direct assignment helpers throw after Sprint 4B.
- `src/lib/api/orders.js`: legacy direct order mutation helpers remain for older imports; direct archive helper is a throwing quarantine stub after Sprint 2D, generic/bulk status helpers throw after Sprint 3B, and `assignAppraiser(...)` / `bulkAssignAppraiser(...)` throw after Sprint 4B.
- `src/lib/api/reviews.js`: legacy review-decision helper directly updates order review fields.
- `src/lib/logactivity.js` and `src/lib/utils/logOrderEvent.js`: low-level RPC-backed activity
  compatibility wrappers remain transitional and should not be used for new authoritative system
  events.
- `src/lib/api/notifications.js`: generic RPC-backed `sendNotification(...)` helper remains a
  legacy notification compatibility seam and should not be used for new authoritative fanout.
- legacy SQL helpers `_notify_user(...)`, `rpc_notify_admins(...)`, and `rpc_notify_user(...)`
  remain generic notification compatibility seams unless a future productized authoring surface
  explicitly approves them.
- `src/lib/utils/updateOrderStatus.js`: legacy direct status fallback is a throwing quarantine stub after Sprint 3B.
- `src/features/orders/actions.js`: legacy generic status RPC adapter is a throwing quarantine stub after Sprint 3B; `assignOrder(...)` remains a legacy guarded assignment RPC adapter.
- `src/features/orders/OrderActionsPanel.jsx`: freeform status action panel remains quarantined and
  is not barrel-exported.
- `src/lib/api/users.js`: direct `users` update fallback remains for an older profile RPC path.

The source-scan test added with this matrix blocks new direct write surfaces outside this watchlist.

## Archive / Delete Doctrine Gaps

- Order retirement doctrine is defined in `docs/ORDER_RETIREMENT_DOCTRINE.md`.
- Order archive has a backend-owned guarded RPC surface and controlled internal Order Detail action;
  list, table-row, bulk, restore, and hard-delete UI remain deferred/unsupported.
- Order cancel/void backend RPCs, service wrappers, and controlled Order Detail actions exist after
  Sprint 2O/2P/2Q; smart actions, table/list actions, bulk actions, restore/reopen, and broader
  workflow integration remain deferred.
- Cancelled and voided orders are excluded from active operational list queries by default after
  Sprint 2R; direct Order Detail readback remains preserved-history access.
- Hard order delete must remain unavailable in normal UI.
- Client archive exists as an RPC, but active UI behavior and recovery semantics need final product
  confirmation.
- Order document archive is soft archive only; hard storage delete remains intentionally deferred.
- Team Access supports deactivate/reactivate, not hard user delete.
- Activity and notification records should be retained as operational history unless a retention
  policy explicitly says otherwise.

## Activity Logging Expectations

- Order create/edit/workflow/date/document changes should create backend-owned activity where the
  event matters operationally.
- Normal workflow status changes are currently activity-backed by backend order update triggers
  after `rpc_transition_order_status(...)`; frontend code must not add fallback `status_changed`
  activity.
- Optional workflow notes are separate note activity and remain frontend-orchestrated until a
  deliberate note-ownership cleanup slice moves them backend-side.
- Frontend workflow note orchestration is transitional; new workflow status work should not add
  more frontend activity side effects around canonical transitions.
- Order document upload/finalize and archive must log backend-side events without signed URLs,
  storage paths, or bucket names.
- Assignment lifecycle events should use assignment activity, not canonical order activity leakage.
- Cross-company assignment packet lifecycle activity is backend-owned in
  `order_company_assignment_activity`; internal order participant changes currently use order update
  trigger activity such as `assignee_changed`.
- Sprint 4E locks current assignment activity ownership: order create/edit participant side effects
  are trigger-owned, `rpc_assign_order(...)` owns only its transitional `assigned_to` activity, and
  assignment packet lifecycle activity remains RPC-owned and assignment-scoped.
- Sprint 5A inventories activity ownership: normal order create/update/workflow activity is
  trigger-owned, lifecycle/order-number/document events are backend RPC-owned, notes remain
  frontend-orchestrated through guarded `rpc_log_event(...)`, and assignment packet activity remains
  separate from canonical order activity.
- Sprint 5C defines unified activity/notification ownership doctrine: authoritative domain
  mutations should own durable activity whenever possible, frontend activity seams are transitional
  unless explicitly approved, payloads must be safe/minimal/source-traceable, and actor attribution
  for authoritative events should come from backend app user/company context.
- Low-level frontend activity wrappers may remain as compatibility seams, but new authoritative
  system events should be backend-owned by the relevant RPC or trigger.
- Team role/status/invite changes should remain audit/event backed through company-owned paths.
- Frontend-only activity logging should not be added for security-relevant lifecycle events.

## Notification Expectations

- Workflow and assignment notifications should be generated from canonical transition/lifecycle
  paths, with recipients resolved from order responsibility or assignment context.
- Cross-company assignment packet notifications are backend-owned by assignment lifecycle RPC
  helpers and should link to `/assignments/:assignmentId`; internal participant assignment
  notifications still need cleanup around appraiser/reviewer/assigned-to semantics.
- Appraiser assignment notifications are trigger-owned for `appraiser_id` insert/update today;
  reviewer and `assigned_to` assignment notification fanout remains deferred rather than
  frontend-filled.
- Sprint 5B inventories notification ownership: `rpc_notification_create(...)` is the guarded
  frontend insert gate, normal workflow and note fanout remain frontend-orchestrated through
  `emitNotification(...)`, appraiser assignment fanout is trigger-owned, assignment packet fanout is
  backend RPC-owned, and lifecycle/document fanout remains deferred.
- Sprint 5C defines unified activity/notification ownership doctrine: notification fanout for
  domain events should eventually move backend-side, current frontend emissions are transitional
  unless explicitly product-approved, and backend fanout must replace matching frontend fanout
  rather than duplicate it.
- Normal workflow notification fanout is currently frontend service-owned after successful
  `rpc_transition_order_status(...)`; future backend ownership must replace, not duplicate, those
  frontend emissions.
- New workflow notification paths should not call generic frontend notification helpers unless the
  surface is explicitly approved; avoid parallel frontend/backend fanout for the same event.
- Notification read, mark-read, dismiss, and preference writes should use RPCs.
- Notification preference writes are RPC-only after Sprint 1B; the remaining direct preference read
  fallback is non-mutating compatibility only.
- Manual/system notification helpers should remain quarantined unless a productized notification
  authoring surface is designed.

## Permission Gates By Surface

| Surface | Primary Permissions |
|---|---|
| Orders | `orders.create`, `orders.read.all`, `orders.read.assigned`, `orders.update.all`, `orders.update.assigned`, `orders.archive`, `orders.cancel`, `orders.void`, `orders.delete` |
| Workflow | `workflow.status.*`, `workflow.override_status` |
| Order documents | `documents.read.*`, `documents.upload.*`, `documents.delete`, future `documents.publish_to_client` |
| Clients / AMCs / Contacts | `clients.create`, `clients.read.*`, `clients.update.*`, `clients.archive`, `clients.delete` |
| Users / Team Access | `users.read`, `users.invite`, `users.manage_company_access`, `users.deactivate`, `roles.assign`, owner grant/revoke permissions |
| Assignments | `order_company_assignments.*`, `relationships.assign_work`, `relationships.read` |
| Relationships | `relationships.read`, `relationships.invite`, `relationships.approve`, `relationships.suspend`, `relationships.archive` |
| Activity | `activity.read.*`, `activity.create.note.*`, `activity.moderate` |
| Notifications | `notifications.read_own`, `notifications.mark_read_own`, `notifications.preferences.manage_own` |
| Settings / Owner Setup | `settings.view`, `company.setup.read`, `company.update_profile` |

## Stabilization Order

1. Lock source-scan guards around direct writes and known compatibility seams.
2. Completed Sprint 1B: remove notification preference direct fallback writes and keep preference
   writes on `rpc_notification_prefs_ensure` / `rpc_notification_prefs_update`.
3. Completed Sprint 2B: implement backend-only guarded `rpc_order_archive(...)` before any active
   archive UI.
4. Completed Sprint 2D: quarantine direct order archive/delete helper reachability with throwing
   stubs and source-scan guards.
5. Completed Sprint 2E: add safe frontend `archiveOrderViaRpc(...)` wrapper without UI activation.
6. Completed Sprint 2F: add archive permission/readiness helper and guard against active UI/RPC
   reachability.
7. Completed Sprint 2G: define archive confirmation UX copy/state doctrine without runtime wiring.
8. Completed Sprint 2H: add a fully guarded internal Order Detail archive action entry point only.
9. Completed Sprint 2I: harden active-list archived exclusion and archived Order Detail notice/readback.
10. Completed Sprint 2J: document archived-order operational rules and guard `includeArchived`
    usage to low-level order read APIs.
11. Completed Sprint 2K: define future cancel vs void lifecycle doctrine without implementation.
12. Completed Sprint 2L: seed future `orders.cancel` and `orders.void` permission catalog rows
    without role grants or behavior.
13. Completed Sprint 2M: add frontend permission constants and pure readiness helpers for future
    cancel/void without UI, RPCs, or status behavior.
14. Completed Sprint 2N: define future cancel/void confirmation copy doctrine without runtime
    behavior.
15. Completed Sprint 2O: implement backend-only guarded cancel/void RPCs.
16. Completed Sprint 2P: add isolated frontend cancel/void RPC wrappers without UI reachability.
17. Completed Sprint 2Q: expose strictly guarded Order Detail cancel/void actions only.
18. Completed Sprint 2R: harden post-cancel/void active-list exclusion and preserved-history
    readback notices.
19. Completed Sprint 2S: lock archive/cancel/void lifecycle as complete for the current backend and
    Order Detail scope.
20. Completed Sprint 3A: inventory workflow/status mutation entry points before additional workflow
    expansion.
21. Completed Sprint 3B: quarantine direct frontend order status writes outside approved workflow
    RPC paths.
22. Completed Sprint 3C: consolidate approved workflow transition wrapper usage and tests.
23. Completed Sprint 3D: audit workflow activity/notification ownership.
24. Completed Sprint 3E: inventory frontend-owned workflow note/notification orchestration paths.
25. Completed Sprint 3F: audit Smart Actions against canonical workflow transition doctrine.
26. Completed Sprint 3G: align workflow transition permission semantics documentation across
    frontend visibility and backend enforcement.
27. Completed Sprint 3H: document reviewer shortcut and duplicated workflow action surface doctrine.
28. Completed Sprint 3I: lock workflow mutation stabilization as substantially complete.
29. Completed Sprint 4A: inventory order assignment mutation paths.
30. Completed Sprint 4B: quarantine deprecated direct internal assignment helper paths.
31. Completed Sprint 4C: document and test approved internal assignment mutation paths.
32. Completed Sprint 4D: audit assignment activity/notification ownership.
33. Completed Sprint 4E: lock assignment mutation stabilization as substantially complete.
34. Completed Sprint 5A: inventory activity event ownership.
35. Completed Sprint 5B: inventory notification mutation and fanout ownership.
36. Completed Sprint 5C: define unified activity and notification ownership doctrine.
37. Completed Sprint 5D: create consolidated operational governance snapshot.
38. Resolve client archive UI semantics and recovery expectations.
39. Audit activity note creation so note writes are RPC-owned everywhere.
40. Verify Team Access owner invariants, invite lifecycle, and deactivate/reactivate in staging.
41. Verify assignment lifecycle activity and notification parity.
42. Keep Order Documents deployment blocked from legacy production and validate only on
   company-scoped staging/final production.

## First Runtime Cleanup Candidate

Sprint 1B removed the direct notification preference fallback writes in
`src/features/notifications/api.js`. Preference creation/update now uses:

- `rpc_notification_prefs_ensure`;
- `rpc_notification_prefs_update`;

Sprint 2B added backend-only `rpc_order_archive(p_order_id uuid, p_reason text default null)` in
`supabase/migrations/20260518075000_order_archive_rpc.sql`. The RPC requires authenticated
current-company access, readable order scope, and `orders.archive`; updates only `is_archived` and
`updated_at`; writes backend-owned `order.archived` activity; and preserves status, order number,
documents, assignments, notifications, calendar rows, and existing activity.

Sprint 2B local SQL validation applied the migration directly to the local Postgres container and
verified the function signature plus execute grants. Full `supabase db reset` was blocked by a
Supabase storage image pull failure for
`public.ecr.aws/supabase/storage-api:optimize-existing-functions-again`.

Sprint 2D converted deprecated direct archive/delete helpers into throwing quarantine stubs with the
message `Order archive/delete must use backend-owned lifecycle RPCs.` It also expanded the CRUD
source scan to block direct frontend `orders.delete`, direct `orders` archive updates, and active
uses of deprecated `deleteOrder` / `archiveOrder` helpers outside the quarantined helper files.

Sprint 2E added `archiveOrderViaRpc(orderId, reason = null)` as a safe service wrapper around
`rpc_order_archive(p_order_id, p_reason)` for future use. No archive button, menu item, modal,
route, or active UI reachability was added.

Sprint 2F added `canArchiveOrder(order, permissions)` as a pure readiness helper using
`orders.archive` through existing frontend permission data. The helper is not wired into UI, and
the CRUD source scan now also blocks active `archiveOrderViaRpc(...)` reachability outside the
service wrapper.

Sprint 2G defined archive confirmation UX copy/state doctrine in
`docs/ORDER_RETIREMENT_DOCTRINE.md` without runtime wiring. The future confirmation should say
archive removes the order from active operational lists, does not delete, preserves documents,
activity, and order number history, and does not change status.

Sprint 2H wired that doctrine into a controlled internal Order Detail archive action only. Visibility
is gated by `canArchiveOrder(order, permissions)`, submission calls only `archiveOrderViaRpc(...)`,
success refreshes the loaded order state, and failure leaves the modal open without local mutation.
No table-row menu, bulk action, hard delete, cancel/void lifecycle, restore/unarchive path, direct
write, RLS change, or migration was added.

Sprint 2I hardens archived visibility after archive UI activation. Active order list queries now
exclude archived orders by default, with an explicit `includeArchived` opt-in reserved for future
archived readback surfaces. Order Detail still reads archived orders directly for preserved history,
maps `is_archived`, shows an archived-order notice, and hides the archive action after refresh.
No restore/unarchive path, table-row archive, bulk archive, hard delete, cancel/void lifecycle,
status mutation, RLS change, migration, or direct order write was added.

Sprint 2J completes the current internal Order Detail archive lifecycle documentation and future
archived readback guardrails. Archived orders may appear only in explicit Archived, History, or
Admin surfaces; active queues/lists must not opt into archived rows unless a future surface is
explicitly whitelisted. Archived records remain preserved-history readback by default and read-only
except for future deliberately designed lifecycle actions. The CRUD source scan now keeps
`includeArchived` confined to low-level order read API files until an archived/history surface is
approved.

Sprint 2K defines cancel vs void doctrine before implementation. Cancel means a legitimate order is
stopped before completion; void means administrative invalidation for an error, duplicate, or order
opened by mistake; archive remains active-surface retirement without status mutation; and hard
delete remains unavailable in normal UI. Future backend events are reserved as `order.cancelled`
and `order.voided`; future permissions are reserved as `orders.cancel` and `orders.void`. Active
source and active migration inspection found no current `orders.cancel` or `orders.void` permission
constant/seed, so no UI/backend behavior should depend on them until a future permission slice.

Sprint 2L seeds `orders.cancel` and `orders.void` into the database permission catalog using
existing permission seed conventions. No template role grants, frontend constants, cancel/void RPCs,
UI, statuses, source-scan changes, RLS changes, or behavior were added. The permissions are now
available to owner/all-permission resolution and future role/permission assignment systems, but no
normal role receives them by default.

Sprint 2M adds static frontend permission constants `PERMISSIONS.ORDERS_CANCEL` and
`PERMISSIONS.ORDERS_VOID`, plus pure readiness helpers `canCancelOrder(order, permissions)` and
`canVoidOrder(order, permissions)`. The helpers deny missing orders, archived orders, loading/error
permission state, and missing matching permission keys. They do not call the backend, mutate status,
or create UI/RPC reachability.

Sprint 2N defines cancel/void UX copy doctrine only. Future cancel confirmation should use
`Cancel order`, required reason label `Reason for cancellation`, and preservation-focused
success/failure toast copy. Future void confirmation should use `Void order`, required reason label
`Reason for voiding`, and preservation-focused success/failure toast copy. Both warnings must state
that the action does not delete the order, release the order number, or remove documents/activity.
No runtime helper, UI, RPC, migration, status mutation, source-scan change, or behavior was added.

Sprint 2O added backend-only `rpc_order_cancel(p_order_id uuid, p_reason text)` and
`rpc_order_void(p_order_id uuid, p_reason text)` in
`supabase/migrations/20260518077000_order_cancel_void_rpcs.sql`. The RPCs require authenticated
current-company access, readable order scope, active membership, a trimmed non-empty reason, and the
matching `orders.cancel` / `orders.void` permission. They deny archived orders, set only
`status = 'cancelled'` or `status = 'voided'` plus `updated_at`, write backend-owned
`order.cancelled` / `order.voided` activity with safe payload, and preserve order number,
documents, existing activity, assignments, notifications, and calendar rows.

Sprint 2P added isolated service wrappers `cancelOrderViaRpc(orderId, reason)` and
`voidOrderViaRpc(orderId, reason)` around those RPCs. The wrappers require a non-empty reason,
trim before calling the backend, do not use `supabase.from`, and remain blocked from active UI
reachability by the CRUD source scan. No UI, modal, archive change, direct write, RLS change, or
migration was added.

Sprint 2Q wires cancel/void into the same controlled internal Order Detail action area used for
archive discipline. Visibility is gated by `canCancelOrder(order, permissions)` and
`canVoidOrder(order, permissions)`, confirmation uses Sprint 2N copy, reason is required and
trimmed, submit calls only the service RPC wrappers, success refreshes loaded order state, and
failure stays in the modal with no local status mutation. The CRUD source scan allows wrapper
reachability only in `ordersService.js` and `OrderDetail.jsx`. No table-row action, bulk action,
hard delete, restore/reopen, direct write, RLS change, or migration was added.

Sprint 2R hardens post-cancel/void visibility. Active order list queries now exclude `cancelled`
and `voided` statuses by default, with low-level `includeRetiredLifecycle` opt-in reserved for
future History/Admin readback surfaces and blocked from active components by source scan. Direct
Order Detail remains loadable for cancelled/voided preserved history, shows a lifecycle notice, and
hides archive/cancel/void actions once status is `cancelled` or `voided`. No restore/reopen,
history list UI, table row lifecycle action, bulk action, direct write, RLS change, or migration was
added.

Sprint 2S locks the current order archive/cancel/void lifecycle as complete for backend-owned RPC
behavior and controlled Order Detail UI. Hard delete remains forbidden in normal UI. Active order
lists exclude archived, cancelled, and voided orders by default. Direct Order Detail readback
remains available as preserved history. Future History/Admin surfaces must explicitly opt in through
approved low-level readback flags and source-scan whitelists. Restore, reopen, and unarchive are not
supported. Source scans continue to block direct delete/archive writes and restrict lifecycle
wrappers plus retired/archived readback flags.

Sprint 3A inventories all currently identified order workflow/status mutation entry points in
`docs/ORDER_WORKFLOW_STATUS_WRITE_AUDIT.md`. Active normal workflow transitions are backend-owned
through named service helpers and `rpc_transition_order_status(...)`; Order Detail
archive/cancel/void lifecycle actions remain separate backend-owned RPC paths. Remaining risks are
generic/direct status helpers, bulk status helpers, legacy status adapters, the quarantined
`OrderActionsPanel`, the review-field helper, duplicated UI action rendering, frontend-owned
workflow notifications, and optional workflow notes created before selected transitions. No runtime,
permission, lifecycle, or workflow behavior changed in Sprint 3A.

Sprint 3B quarantines direct frontend order status writes outside approved workflow RPC paths.
Deprecated generic status helpers in `ordersService`, `src/lib/api/orders.js`,
`src/lib/utils/updateOrderStatus.js`, and `src/features/orders/actions.js` now throw before direct
status mutation, legacy arbitrary-status RPC calls, or fallback activity writes. `updateOrder(...)`
also rejects patches containing `status`. The CRUD source scan now blocks new direct
`orders.status` update patterns and legacy status helper reachability outside quarantine files.
Approved Smart Action orchestration and `rpc_transition_order_status(...)` remain unchanged.

Sprint 3C consolidates the approved normal workflow transition frontend path. Active workflow UI
continues to call named `ordersService` helpers only, while `ordersService.js` now centralizes the
direct `rpc_transition_order_status(...)` call behind one internal transition RPC helper. Service
tests cover the canonical RPC name, required payload fields, error propagation, and absence of
direct status updates. The CRUD source scan now also blocks direct `rpc_transition_order_status`
reachability outside `ordersService.js`. No workflow behavior, UI, permission, status model,
lifecycle, migration, or RLS change was added.

Sprint 3D audits workflow activity and notification ownership without runtime changes. Normal
workflow status mutation remains backend-owned by `rpc_transition_order_status(...)`, and
`tg_orders_audit_upd` owns the canonical `status_changed` activity row after the order update.
Optional send-to-review/request-revisions notes remain frontend-orchestrated through
`logNote(...)` / `rpc_log_event(...)`. Normal workflow notification fanout remains frontend
service-owned through `emitNotification(...)` / `rpc_notification_create(...)` after successful
RPC return; future backend notification ownership must replace those emissions rather than
duplicate them. No clear duplicate active workflow activity/notification write bug was found.

Sprint 3E inventories remaining frontend-owned workflow note and notification orchestration paths
without runtime changes. `UnifiedOrdersTable` still creates optional review/revision notes before
`submit_to_review` / `request_revisions`; `ordersService` still emits handoff notifications after
successful `submit_to_review`, `request_revisions`, `approve_review`, `ready_for_client`, and
`complete`; `request_final_approval` has no currently identified fanout. General Order Detail note
notifications are separate from workflow status authority, while legacy review-field and generic
activity/notification helpers remain compatibility seams. Frontend workflow side-effect
orchestration is transitional unless explicitly approved long-term, and backend notification fanout
must replace rather than duplicate frontend fanout.

Sprint 3F audits Smart Actions against the canonical workflow doctrine without runtime changes.
The valid Smart Actions remain the six normal workflow transitions:
`submit_to_review`, `request_revisions`, `approve_review`, `request_final_approval`,
`ready_for_client`, and `complete`. Table/dashboard and drawer actions route through named
`ordersService` helpers and `rpc_transition_order_status(...)`; reviewer shortcut actions also call
canonical helpers but remain a duplicated transitional surface outside the shared descriptor
renderer. `request_final_approval` still has no identified notification fanout. Lifecycle actions
remain Order Detail-only and must not be moved into Smart Actions without a separate design slice.

Sprint 3G audits workflow transition permission semantics without runtime changes. Frontend Smart
Action visibility and backend `rpc_transition_order_status(...)` enforcement are aligned for active
canonical transitions: send-to-review uses `workflow.status.submit_to_review`, resubmit from
`needs_revisions` uses `workflow.status.resubmit`, request revisions uses
`workflow.status.request_revisions`, clear review uses `workflow.status.approve_review`, final
approval and ready-for-client both use `workflow.status.ready_for_client`, and complete uses
`workflow.status.complete`. Frontend role checks remain visibility rules only; backend
current-company scope, readable/updateable order scope, and permission checks remain authoritative.
Reviewer shortcut actions still bypass shared descriptor rendering and remain a UI consolidation
target.

Sprint 3H documents reviewer shortcut and duplicated workflow action surface doctrine without
runtime changes. Table/dashboard Smart Actions are the primary normal workflow surface. Drawer
quick actions are acceptable contextual duplicates while they remain shared-descriptor and
canonical-helper backed. `ReviewerActionCell` is a transitional duplicate for Request Revisions and
Clear Review that should eventually merge into shared descriptors or be removed from active
rendering. Request Final Approval, Ready for Client, and Complete remain table/dashboard-only in
current UI. Order Detail has no separate normal workflow action set; archive/cancel/void lifecycle
actions remain controlled Order Detail-only actions and must not move into Smart Actions without a
separate lifecycle design slice.

Sprint 3I locks workflow mutation stabilization as substantially complete for the current product
scope without runtime changes. `rpc_transition_order_status(...)` is authoritative for normal
workflow status mutation; canonical `ordersService` helpers are the authoritative frontend
transition path; direct frontend status writes, generic status helpers, bulk status helpers,
arbitrary status adapters, and freeform status UI remain quarantined or source-scan blocked. Smart
Actions are the primary workflow surface, drawer actions are transitional contextual duplicates,
and lifecycle actions remain Order Detail-only. Backend workflow mutation and `status_changed`
audit activity are authoritative, while frontend workflow notes and notifications remain
transitional orchestration. Deferred items are backend-owned workflow notifications, backend-owned
review/revision notes, reviewer shortcut consolidation, `request_final_approval` notification and
permission semantics, and future History/Admin readback surfaces.

Sprint 4A inventories order assignment mutation paths without runtime changes in
`docs/ORDER_ASSIGNMENT_MUTATION_AUDIT.md`. Cross-company assignment packets are backend-owned
through `rpc_order_company_assignment_*` lifecycle RPCs with assignment-scoped activity and
notifications, and they do not write owner-company appraiser/reviewer/assigned-to columns.
Internal order participant assignment still has mixed ownership: routed create/edit forms use
order create/update RPCs plus assignment target trigger validation, `rpc_assign_order(...)` remains
a guarded compatibility RPC for `assigned_to`, and deprecated frontend direct helpers in
`ordersService.js` / `src/lib/api/orders.js` remain future quarantine/source-scan candidates.
No workflow, lifecycle, permission, migration, RLS, UI, or assignment behavior changed.

Sprint 4B quarantines deprecated direct internal assignment helpers without changing approved
assignment flows. `ordersService.assignParticipants(...)`, `assignAppraiser(...)`,
`assignReviewer(...)`, `updateAssignees(...)`, `src/lib/api/orders.js#assignAppraiser(...)`, and
`bulkAssignAppraiser(...)` now throw before mutating `orders` participant columns. Routed order
create/edit RPCs, guarded compatibility `rpc_assign_order(...)`, and
`rpc_order_company_assignment_*` packet lifecycle RPCs remain unchanged. The CRUD source scan now
blocks explicit frontend `orders` participant-column writes and keeps legacy internal assignment
helper usage confined to quarantined files.

Sprint 4C documents approved assignment mutation paths and adds nearby test coverage without
behavior changes. `createOrderViaRpc(...)` remains the order-create path that may submit
`appraiser_id` to `rpc_create_order(...)`; `updateOrderViaRpc(...)` remains the routed edit path
for `appraiser_id` / `reviewer_id`; `assignOrder(...)` remains the transitional compatibility path
to guarded `rpc_assign_order(...)` for `assigned_to`; and assignment packet mutations remain
confined to `rpc_order_company_assignment_*` wrappers. Tests now assert those paths use RPCs and
do not direct-write order participant columns.

Sprint 4D audits assignment activity and notification ownership without runtime changes. Order
create/edit participant side effects are backend trigger-owned: `trg_orders_audit_ins` writes
`order_created`, `tg_orders_audit_upd()` writes `assignee_changed` for appraiser/reviewer changes,
and `trg_orders_insert_assignment_notification` emits appraiser `order.new_assigned` /
`order.reassigned` notifications. `rpc_assign_order(...)` owns only its transitional
`assigned_to` activity and has no notification fanout. Cross-company assignment packets remain
backend RPC-owned through `log_order_company_assignment_event(...)` and
`notify_order_company_assignment_event(...)`, with `assignment.started` intentionally activity-only.
No active duplicate side-effect bug was found; reviewer and `assigned_to` notification semantics
remain deferred cleanup.

Sprint 4E locks assignment mutation stabilization as substantially complete for the current product
scope without runtime changes. Order create/update participant assignment remains RPC-owned through
`rpc_create_order(...)` and `rpc_update_order(...)`; direct frontend participant-column writes are
quarantined or source-scan blocked; deprecated assignment helpers remain throwing compatibility
stubs; and `rpc_assign_order(...)` remains a guarded transitional `assigned_to` compatibility path.
Cross-company assignment packet lifecycle remains backend-owned through
`rpc_order_company_assignment_*` RPCs, with assignment-scoped activity and notifications. Deferred
items are dedicated participant assignment RPC design, reviewer assignment notification doctrine,
`assigned_to` compatibility-path retirement, unified participant assignment side-effect ownership,
and future assignment History/Admin surfaces if product needs them.

Sprint 5A inventories activity event ownership without runtime changes in
`docs/ACTIVITY_EVENT_OWNERSHIP_AUDIT.md`. Normal order create/update/workflow activity is
trigger-owned through `trg_orders_audit_ins` / `trg_orders_audit_upd`; archive/cancel/void,
order-number override, and document upload/archive events are backend RPC-owned; general and
workflow notes remain frontend-orchestrated through guarded `rpc_log_event(...)`; `rpc_assign_order`
owns a transitional `assigned_to` compatibility activity row; and cross-company assignment packet
activity remains assignment-scoped in `order_company_assignment_activity`. No severe active
duplicate-write bug was found. Deferred cleanup includes backend-owned workflow/note orchestration
if atomic notes are required, low-level activity wrapper quarantine, review helper retirement,
payload/actor normalization, and future direct activity source-scan hardening.

Sprint 5B inventories notification mutation and fanout ownership without runtime changes in
`docs/NOTIFICATION_OWNERSHIP_AUDIT.md`. `rpc_notification_create(...)` remains the guarded insert
gate for frontend-created order-tied notifications; normal workflow notifications and general note
notifications remain frontend-orchestrated through `emitNotification(...)`; internal appraiser
assignment notifications are backend trigger-owned; and cross-company assignment packet
notifications are backend RPC-owned through `notify_order_company_assignment_event(...)`. Lifecycle
archive/cancel/void notifications, document upload/archive notifications, reviewer assignment
notifications, `assigned_to` compatibility notifications, and `request_final_approval` fanout remain
deferred doctrine gaps. No obvious duplicate-spam bug was found. Future backend notification
ownership must replace frontend fanout rather than duplicate it.

Sprint 5C defines unified activity and notification ownership doctrine without runtime changes in
`docs/ACTIVITY_NOTIFICATION_OWNERSHIP_DOCTRINE.md`. Authoritative domain mutations should own their
durable activity and eventual notification fanout whenever possible. Frontend-emitted activity or
notification side effects are transitional unless explicitly product-approved. Backend fanout must
replace matching frontend fanout rather than duplicate it. Payloads must be safe, minimal, and
source-traceable, and authoritative actor attribution should come from backend app user/company
context rather than arbitrary frontend strings. Future priority migrations are workflow
notifications, review/revision notes, reviewer assignment notifications, lifecycle notification
doctrine, and document notification doctrine.

Sprint 5D creates a consolidated operational governance snapshot without runtime changes in
`docs/OPERATIONAL_GOVERNANCE_SNAPSHOT.md`. The snapshot rolls up order retirement lifecycle,
workflow mutation, assignment mutation, activity ownership, and notification ownership into one
reference covering authoritative mutation owners, approved frontend surfaces, quarantined paths,
source-scan protections, deferred/transitional items, and known future migrations. It also records
current governance principles: backend-owned authoritative mutation, RPC-first operational writes,
no direct frontend domain writes, preserved operational history, transitional frontend orchestration,
source scans as enforcement, explicit opt-in historical surfaces, and no hidden lifecycle
destruction. Major deferred areas remain backend notification migration, reviewer shortcut
consolidation, participant assignment RPC unification, History/Admin surfaces, future multi-company
operational isolation refinements, and production cutover tasks.

The next runtime cleanup candidate is either designing an explicit History/Admin readback surface or
continuing to harden other direct CRUD seams first. Do not add bulk archive, table menu archive,
restore, unarchive, reopen, or lifecycle behavior outside the controlled Order Detail surface
without a separate design slice.
