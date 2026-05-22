# Governance Retrospective And Next Phase

## Purpose

This retrospective assesses whether Falcon should continue deeper stabilization, begin selective
backend ownership migrations, or resume product expansion on top of the stabilized governance layer.

This is a planning document. It makes no runtime behavior, permission, RLS, RPC, route, UI,
workflow, lifecycle, assignment, activity, notification, or feature changes.

Related doctrine:

- `docs/OPERATIONAL_GOVERNANCE_SNAPSHOT.md`
- `docs/CRUD_STABILIZATION_MATRIX.md`
- `docs/ORDER_RETIREMENT_DOCTRINE.md`
- `docs/ORDER_WORKFLOW_STATUS_WRITE_AUDIT.md`
- `docs/ORDER_ASSIGNMENT_MUTATION_AUDIT.md`
- `docs/ACTIVITY_EVENT_OWNERSHIP_AUDIT.md`
- `docs/NOTIFICATION_OWNERSHIP_AUDIT.md`
- `docs/ACTIVITY_NOTIFICATION_OWNERSHIP_DOCTRINE.md`
- `docs/STAGING_COMPANY_SCOPE_MIGRATION_PLAN.md`
- `docs/FINAL_PRODUCTION_CUTOVER_PLAN.md`

## Executive Recommendation

Falcon should **resume selective product expansion on top of the stabilized governance layer while
running a narrow backend-ownership migration track in parallel**.

The core operational mutation surfaces are now governed enough for careful product work:

- order retirement lifecycle is backend-owned and controlled;
- workflow status mutation is backend-owned and source-scan protected;
- assignment mutation is documented, direct helper writes are quarantined, and packet lifecycle is
  backend-owned;
- activity and notification ownership boundaries are documented;
- source scans now serve as a practical enforcement layer.

The remaining governance debt is real, but most of it is not a blocker to MVP or early production if
new product work respects the stabilized boundaries. The exception is production cutover work:
customer rollout should not broaden until staging/final production validation, company-scope data
readiness, secrets, Edge Functions, storage, and rollback plans are handled.

## Remaining Work Categories

### A. Critical Governance Debt

These items can cause data integrity, security, duplicate fanout, or rollout risk if ignored.

| Item | Why It Matters | Recommendation |
|---|---|---|
| Production cutover readiness | Legacy hosted production is not the intended final production shape, and direct production migration remains unsafe without rehearsal | Treat as a hard blocker before broader customer rollout |
| Source-scan coverage for low-level activity/notification helpers | Generic wrappers can reintroduce frontend-authored authoritative side effects | Add focused guard tests before expanding new activity/notification-producing features |
| Backend notification migration design for workflow events | Current workflow notification fanout is frontend-orchestrated and can duplicate if backend fanout is added casually | Design first; migrate selectively with no-duplicate tests |
| Company-scope / multi-company validation | Assignment packets, notifications, activity, and relationship boundaries depend on correct company isolation | Validate in staging before production rollout |
| Order Documents deployment safety | Document RPC/storage work must not be pushed to legacy production without company-scoped staging/final validation | Keep production blocked until staging plan says otherwise |

### B. Important But Safe Transitional Architecture

These items should be cleaned up, but they can remain transitional for MVP/early production if new
work does not deepen the seam.

| Item | Current State | Safe Condition |
|---|---|---|
| Frontend workflow notifications | `ordersService` emits after successful transition RPC | Safe if no backend duplicate fanout is added and event registry/policies remain stable |
| Frontend note orchestration | General notes and review/revision notes use guarded `rpc_log_event(...)` | Safe if notes are allowed to be best-effort/non-atomic with transitions |
| Reviewer shortcut duplicate UI | Shortcut calls canonical helpers but bypasses shared renderer | Safe if no new workflow actions are added there |
| `rpc_assign_order(...)` compatibility path | Guarded transitional `assigned_to` path with activity only | Safe if not expanded and eventual retirement remains planned |
| Missing lifecycle/document notification fanout | Archive/cancel/void and document upload/archive are activity-only today | Safe if product accepts silence until notification doctrine is explicitly designed |
| Payload/actor inconsistency across older side effects | UI normalizes many rows, but authorship shape is not uniform | Safe if new backend-owned events follow the new doctrine |

### C. Product-Facing Feature Work

These surfaces are now safe to expand again if they respect current governance rules.

| Product Area | Safe Expansion Guidance |
|---|---|
| Order Detail read-only productivity | Print packets, read-only audit/summary views, and detail layout improvements are safe when they do not add new mutation paths |
| Activity timeline UX | Rendering, grouping, filtering, and readback improvements are safe if they do not create new frontend-authored system events |
| Assignment packet experience | Read/detail/packet workflow improvements are safe when mutations stay on `rpc_order_company_assignment_*` |
| Notification center UX | Read/list/filter/mark-read UX is safe when writes stay on notification RPCs and no new fanout is introduced |
| History/Admin planning | Documentation and read-only design are safe; runtime surfaces need explicit opt-in flags and source-scan whitelists |
| Client/AMC CRUD stabilization | Can resume as the next CRUD domain after client archive semantics are clarified |

### D. Production-Cutover Blockers

These should block broader customer rollout even if product work continues in development.

| Blocker | Required Outcome |
|---|---|
| Final production project plan | Confirm target project, secrets, origins, Edge Functions, storage, and rollback strategy |
| Migration rehearsal | Run repeatable staging/final rehearsal with production-like data and table counts |
| Company-scope validation | Confirm company rows, memberships, order/client/notification/activity ownership, and packet isolation |
| Order Documents production posture | Keep legacy production blocked until staging/final production validates storage and document RPCs |
| Smoke and rollback plan | Define post-cutover smoke, monitoring, rollback, and reconciliation rules |
| Permission and owner invariants | Verify Team Access, owner invariants, invite lifecycle, deactivate/reactivate, and role grants |

## What Must Be Stabilized Before Broader Customer Rollout

1. Complete the production cutover readiness plan or choose a limited rollout environment that is
   explicitly not final production.
2. Validate company-scoped data isolation with production-like rows in staging/final production.
3. Keep Order Documents blocked from legacy production until storage and document RPCs pass staging
   validation.
4. Add focused source-scan protection around low-level activity/notification helper usage before
   adding new side-effecting product features.
5. Verify Team Access owner invariants, invitation lifecycle, deactivate/reactivate behavior, and
   role grants against staging.
6. Decide the minimum notification policy for workflow/customer-facing operations before a broader
   external rollout, even if implementation remains frontend-orchestrated for the first release.

## What Can Remain Transitional For MVP / Early Production

- Frontend workflow notification fanout can remain if it is not duplicated by backend fanout.
- General note notification fanout can remain best-effort.
- Review/revision notes can remain non-atomic with workflow transitions if UI communicates failure
  cleanly and the transition path remains canonical.
- `ReviewerActionCell` can remain as a known duplicate if no new actions are added there.
- `rpc_assign_order(...)` can remain as a guarded compatibility path if no product work expands it.
- Lifecycle/document notification silence can remain if product accepts activity-only history for
  those events.
- Payload/actor inconsistency in older activity/notification rows can remain if new events follow
  the unified doctrine.

## Product Surfaces Safe To Expand Again

The following product work can resume with normal engineering discipline:

- Order Detail print/export packets, beginning read-only and using already authorized order/activity
  data where possible.
- Order Detail layout and information architecture improvements.
- Activity timeline read UX, filters, grouping, and history rendering.
- Assignment packet read/detail UX and owner/assigned-company operational ergonomics.
- Notification center read UX and preference UX, as long as fanout remains unchanged.
- Client/AMC surface hardening after client archive and recovery semantics are clarified.
- History/Admin design documentation before runtime implementation.

Avoid adding:

- bulk archive/cancel/void/reopen/unarchive;
- table-row lifecycle menus;
- new frontend-authored system activity events;
- new frontend notification fanout for lifecycle/document/team/relationship events;
- new direct table mutation helpers.

## Recommended Next-Phase Ordering

1. **Production readiness checkpoint.**
   Review `STAGING_COMPANY_SCOPE_MIGRATION_PLAN.md` and `FINAL_PRODUCTION_CUTOVER_PLAN.md`, then
   decide whether the next rollout target is staging, limited pilot, or final production.

2. **Source-scan hardening slice.**
   Add narrow scan coverage for low-level activity and notification helper reachability before new
   side-effecting product features.

3. **Product expansion: read-only Order Detail Print Packets.**
   This is a good first product expansion because it is read-only, operationally valuable, and
   aligned with the preserved-history model.

4. **Client archive semantics slice.**
   Resolve client archive UI behavior, recovery expectations, and hard-delete doctrine before
   broader client/AMC expansion.

5. **Selective backend ownership migration: workflow notifications.**
   Design backend workflow notification fanout and migrate one event family at a time, replacing
   frontend emissions in the same slice.

6. **Workflow UI consolidation.**
   Consolidate reviewer shortcuts into shared Smart Action descriptors before adding new workflow
   actions.

7. **Participant assignment RPC design.**
   Design a unified participant assignment backend surface for appraiser/reviewer/assigned-to
   semantics, activity, and notifications.

8. **History/Admin surface design.**
   Design explicit readback surfaces for archived/cancelled/voided orders and assignment history
   without changing active-list defaults.

9. **Document notification doctrine.**
   Decide whether document upload/archive needs fanout; keep any implementation backend-owned and
   payload-safe.

10. **Final production cutover execution.**
    Execute only after rehearsals, smoke checks, secrets/origins, Edge Functions, rollback, and
    monitoring are ready.

## Decision

The governance phase should not continue as an open-ended stabilization-only track. The better next
phase is:

- **resume safe product expansion for read-only and already-governed surfaces;**
- **run targeted backend ownership migrations where frontend orchestration creates real risk;**
- **treat production cutover readiness as the main blocker for broader customer rollout.**
