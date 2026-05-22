# Staging Baseline Snapshot

## Snapshot Identity

- Snapshot name: Governance Baseline v1
- Git tag: `governance-baseline-v1`
- Git commit: `455f684`
- Date created: May 22, 2026
- Environment: Modern company-scoped staging
- Supabase project ref: `voompccpkjfcsmehdoqu`

## Purpose

This snapshot marks Falcon's governance baseline after the CRUD stabilization and operational governance phase.

It is intended to serve as the reference point before renewed product expansion, backend ownership migrations, and production cutover planning.

## Baseline Scope

This baseline includes completed doctrine and stabilization for:

- Order retirement lifecycle
  - archive
  - cancel
  - void
  - hard delete forbidden
- Workflow mutation ownership
- Assignment mutation ownership
- Activity event ownership
- Notification ownership
- Source-scan enforcement
- Operational governance snapshot
- Governance phase retrospective

## Major Governance Rules Locked

- Authoritative operational mutations must be backend-owned whenever possible.
- Frontend direct domain writes are blocked or quarantined.
- Normal workflow status changes use `rpc_transition_order_status(...)`.
- Order retirement lifecycle mutations use guarded backend RPCs.
- Assignment mutation paths are documented and restricted.
- Active lists exclude archived/cancelled/voided orders by default.
- Preserved-history direct readback remains available.
- Future History/Admin surfaces must explicitly opt in.
- Frontend activity/notification emissions are transitional unless explicitly approved.
- Backend fanout must replace frontend fanout, not duplicate it.

## Active Modern Staging Project

- Project ref: `voompccpkjfcsmehdoqu`
- Role: modern company-scoped staging environment
- Status: primary validated architecture target

## Legacy Hosted Project

- Project ref: `okwqhkrsjgxrhyisaovc`
- Role: legacy hosted production-like environment
- Decision: do not retrofit modern governance features into this schema

## Important Baseline Documents

- `docs/OPERATIONAL_GOVERNANCE_SNAPSHOT.md`
- `docs/GOVERNANCE_RETROSPECTIVE_AND_NEXT_PHASE.md`
- `docs/CRUD_STABILIZATION_MATRIX.md`
- `docs/ORDER_RETIREMENT_DOCTRINE.md`
- `docs/ORDER_WORKFLOW_STATUS_WRITE_AUDIT.md`
- `docs/ORDER_ASSIGNMENT_MUTATION_AUDIT.md`
- `docs/ACTIVITY_EVENT_OWNERSHIP_AUDIT.md`
- `docs/NOTIFICATION_OWNERSHIP_AUDIT.md`
- `docs/ACTIVITY_NOTIFICATION_OWNERSHIP_DOCTRINE.md`
- `docs/FINAL_PRODUCTION_CUTOVER_PLAN.md`
- `docs/STAGING_COMPANY_SCOPE_MIGRATION_PLAN.md`

## Known Transitional Areas

The following are intentionally not fully migrated yet:

- Frontend workflow notification fanout
- Frontend review/revision note orchestration
- Reviewer shortcut consolidation
- Participant assignment RPC unification
- `assigned_to` compatibility path retirement
- `request_final_approval` notification/permission semantics
- Explicit History/Admin readback surfaces
- Production bootstrap and cutover automation

## Recommended Next Phase

Proceed with selective product expansion on governed/read-only surfaces while running targeted backend ownership migrations in parallel.

Recommended tracks:

1. Product expansion on safe governed surfaces
2. Targeted backend ownership migrations
3. Production cutover readiness

## Validation at Time of Snapshot

- Git tag pushed: `governance-baseline-v1`
- Main pushed to GitHub at commit: `455f684`
- Governance docs committed and pushed
- Runtime validation completed throughout CRUD stabilization sprints
- Final snapshot doc created after tag push

## Notes

This snapshot is a human-readable architectural checkpoint, not a database dump.

If future changes introduce instability, this tag and document should be used as the reference point for the last known governed baseline.
