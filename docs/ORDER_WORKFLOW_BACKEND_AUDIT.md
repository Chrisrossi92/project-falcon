# Order Workflow Backend Audit

## Summary

Falcon's frontend workflow hardening is now in place, and the backend workflow enforcement foundation has been validated through the new transition RPC. Legacy status mutation paths still exist for compatibility and should be retired only after frontend helpers migrate one at a time.

## Current Findings

- Existing `rpc_update_order_status` is permissive for workflow lifecycle changes and should not be treated as the final enforcement boundary. It remains available during migration.
- `rpc_transition_order_status` has been created and applied as the backend enforcement entry point for normal workflow transitions.
- Transition validation, permission enforcement, missing permission rejection, invalid transition rejection, and the happy path `submit_to_review` transition have been validated.
- `public.current_app_user_id()` exists and should be used anywhere database logic needs to map `auth.uid()` to Falcon's canonical `public.users.id`.
- `public.current_app_user_has_permission(text)` exists and should be used for transition-specific permission checks.
- Duplicate legacy order activity triggers have been disabled, while canonical order audit triggers remain enabled.
- Activity now logs one clean `status_changed` row after an RPC transition.
- Direct status updates still exist in legacy/generic helpers and should remain documented as deprecated for normal workflow actions until the backend transition RPC is ready.

## Recommended Direction

- Use `rpc_transition_order_status` as the normal workflow transition boundary.
- Do not remove `rpc_update_order_status` yet.
- Keep existing direct status update paths available until the new RPC is adopted by guarded frontend service helpers.
- Migrate frontend workflow helpers to `rpc_transition_order_status` one at a time, starting with `sendOrderToReview`.
- Restrict direct `orders.status` updates only after all helpers migrate and validation passes.
- Do not tighten RLS until all helpers migrate and validation passes.

## Validation Before Restriction

Before tightening RLS, grants, or direct status write access:

- Verify every workflow transition succeeds from the expected source statuses.
- Verify invalid transitions fail with stable errors. Initial validation passed.
- Verify missing permissions fail with stable errors. Initial validation passed.
- Verify `auth.uid()` is consistently mapped through `public.current_app_user_id()`.
- Verify activity log entries are written once with the expected actor and status values. Initial RPC validation now writes one clean `status_changed` row.
- Verify notification behavior matches current product expectations.
- Verify legacy administrative or support flows have an explicit replacement or controlled override path.

## References

- `docs/ORDER_WORKFLOW_BACKEND_PLAN.md`
- `src/lib/workflow/orderWorkflow.js`
- `src/lib/permissions/constants.js`
