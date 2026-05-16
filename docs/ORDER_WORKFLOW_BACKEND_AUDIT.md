# Order Workflow Backend Audit

## Summary

Falcon's frontend workflow hardening is now in place, and the primary frontend workflow helpers now use the backend transition RPC. Legacy generic status mutation paths still exist for compatibility and should be audited before any restriction.

## Current Findings

- Existing `rpc_update_order_status` is permissive for workflow lifecycle changes and should not be treated as the final enforcement boundary. It remains available during migration.
- `rpc_transition_order_status` has been created and applied as the backend enforcement entry point for normal workflow transitions.
- Transition validation, permission enforcement, missing permission rejection, invalid transition rejection, and the happy path `submit_to_review` transition have been validated.
- `sendOrderToReview`, `sendOrderBackToAppraiser`, `clearReview`, `requestFinalApproval`, `markReadyForClient`, and `completeOrder` now call `rpc_transition_order_status`.
- Full lifecycle testing passed through the backend RPC: `new` -> `in_review` -> `review_cleared` -> `pending_final_approval` -> `ready_for_client` -> `completed`.
- Request revisions path testing passed through the backend RPC: `in_review` -> `needs_revisions`.
- `public.current_app_user_id()` exists and should be used anywhere database logic needs to map `auth.uid()` to Falcon's canonical `public.users.id`.
- `public.current_app_user_has_permission(text)` exists and should be used for transition-specific permission checks.
- Duplicate legacy order activity triggers have been disabled, while canonical order audit triggers remain enabled.
- Activity now logs one clean canonical `status_changed` row after each new RPC transition.
- Notification/toast behavior is preserved after primary helper migration.
- Direct status updates still exist in legacy/generic helpers and should remain documented as deprecated for normal workflow actions until the backend transition RPC is ready.

## Recommended Direction

- Use `rpc_transition_order_status` as the normal workflow transition boundary.
- Do not remove `rpc_update_order_status` yet.
- Audit remaining generic status helpers and legacy status RPC usage before restriction.
- Keep existing direct status update paths available until the generic usage audit is complete.
- Restrict direct `orders.status` updates only after the generic usage audit identifies safe replacements or controlled override paths.
- Do not tighten RLS until the generic usage audit is complete.
- Consider backend notification ownership later; frontend notification behavior is intentionally preserved for this migration.

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
