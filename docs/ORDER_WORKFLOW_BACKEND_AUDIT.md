# Order Workflow Backend Audit

## Summary

Falcon's frontend workflow hardening is now in place, but Supabase still has permissive backend status mutation paths. Backend enforcement should be added carefully and incrementally so existing production paths are not broken before parity is validated.

## Current Findings

- Existing `rpc_update_order_status` is permissive for workflow lifecycle changes and should not be treated as the final enforcement boundary.
- `public.current_app_user_id()` exists and should be used anywhere database logic needs to map `auth.uid()` to Falcon's canonical `public.users.id`.
- `public.current_app_user_has_permission(text)` exists and should be used for transition-specific permission checks.
- Activity logging has multiple paths and triggers, so workflow transition auditing needs to account for existing `activity_log` behavior before replacing or consolidating write paths.
- Direct status updates still exist in legacy/generic helpers and should remain documented as deprecated for normal workflow actions until the backend transition RPC is ready.

## Recommended Direction

- Add `rpc_transition_order_status` as a new additive RPC first.
- Do not remove `rpc_update_order_status` yet.
- Keep existing direct status update paths available until the new RPC is implemented, validated, and adopted by guarded frontend service helpers.
- Migrate frontend workflow helpers to `rpc_transition_order_status` in later slices after backend behavior matches current frontend/service behavior.
- Restrict direct `orders.status` updates only after validation proves the new RPC covers normal lifecycle actions, activity logging, permissions, and notification enqueueing.

## Validation Before Restriction

Before tightening RLS, grants, or direct status write access:

- Verify every workflow transition succeeds from the expected source statuses.
- Verify invalid transitions fail with stable errors.
- Verify missing permissions fail with stable errors.
- Verify `auth.uid()` is consistently mapped through `public.current_app_user_id()`.
- Verify activity log entries are written once with the expected actor and status values.
- Verify notification behavior matches current product expectations.
- Verify legacy administrative or support flows have an explicit replacement or controlled override path.

## References

- `docs/ORDER_WORKFLOW_BACKEND_PLAN.md`
- `src/lib/workflow/orderWorkflow.js`
- `src/lib/permissions/constants.js`
