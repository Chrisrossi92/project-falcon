# Order Workflow Backend Plan

## Purpose

Falcon now has frontend workflow guards and shared Smart Actions, but frontend checks are not sufficient as the enforcement boundary. Browser code can be bypassed, stale clients can call older helpers, and generic status mutation utilities still exist for legacy paths and administrative tooling. Supabase must become the source of truth for allowed order lifecycle transitions.

Backend enforcement should ensure every normal lifecycle status change is validated consistently, audited, and routed through the same permission and notification model regardless of which UI or client initiates it.

## Proposed RPC

Create a single workflow transition RPC:

```text
rpc_transition_order_status
```

This RPC should become the only supported backend entry point for normal order lifecycle transitions.

## Input

The RPC should accept:

- `order_id`: The target order id.
- `transition_key`: The requested workflow transition key.
- `note`: Optional text note attached to the transition.
- `actor_user_id`: Derived from `auth.uid()` inside Supabase, not trusted from client input.

Client calls should provide only `order_id`, `transition_key`, and optional `note`. The backend should derive the actor from the authenticated session.

## Behavior

`rpc_transition_order_status` should perform the transition atomically:

1. Load and lock the target order row.
2. Resolve the transition definition by `transition_key`.
3. Validate the order's current status is allowed for that transition.
4. Validate the authenticated actor has the required workflow permission.
5. Update `orders.status` to the transition target status.
6. Insert an `activity_log` row recording:
   - order id
   - actor user id
   - transition key
   - previous status
   - new status
   - optional note
   - timestamp
7. Trigger or enqueue notifications for transitions that define notification behavior.
8. Return the updated order or a compact transition result.

The status update and activity log insert should happen in the same transaction. Notifications may be inserted into an outbox table in the same transaction, then delivered asynchronously.

## Transition Mapping

The backend transition map should mirror the frontend canonical workflow map in:

```text
src/lib/workflow/orderWorkflow.js
```

Initial transition keys:

- `submit_to_review`
- `request_revisions`
- `approve_review`
- `request_final_approval`
- `ready_for_client`
- `complete`

Each backend transition definition should include:

- `key`
- allowed `from` statuses
- target `to` status
- required permission
- optional resubmission permission, where applicable
- notification event, where applicable
- note requirements or recommendations

The backend should be treated as authoritative. The frontend map should remain aligned with it for rendering and client-side user feedback.

## Permission Model

Supabase should validate workflow permissions using the authenticated actor from `auth.uid()`.

Recommended approach:

1. Resolve the actor's application user record from `auth.uid()`.
2. Resolve the actor's role and assigned permission grants.
3. Validate the required permission for the requested transition.
4. For `submit_to_review` from `needs_revisions`, use the resubmission permission instead of the normal submit permission.
5. Optionally validate assignment scope where a permission is scoped to assigned orders rather than all orders.

Workflow permission keys should align with `src/lib/permissions/constants.js`, including:

- `workflow.status.submit_to_review`
- `workflow.status.resubmit`
- `workflow.status.request_revisions`
- `workflow.status.approve_review`
- `workflow.status.ready_for_client`
- `workflow.status.complete`

If Falcon keeps role names as a convenience, role checks should not replace permission checks. Roles can explain defaults; permissions should decide access.

## Failure Cases

The RPC should fail with explicit, stable error codes/messages for client handling.

### Invalid Transition

Return an error when:

- `transition_key` is unknown.
- The order's current status is not included in the transition's allowed `from` statuses.

Suggested code:

```text
invalid_transition
```

### Missing Permission

Return an error when the actor lacks the required workflow permission for the transition.

Suggested code:

```text
missing_permission
```

### Invalid Order

Return an error when:

- `order_id` is missing or malformed.
- No order exists for `order_id`.
- The actor cannot access the order under tenant or assignment rules.

Suggested code:

```text
invalid_order
```

### Unauthenticated Actor

Return an error when `auth.uid()` is null.

Suggested code:

```text
unauthenticated
```

## Migration Plan

Move in small slices so product behavior stays stable:

1. Keep current frontend guards and guarded service helpers in place.
2. Add `rpc_transition_order_status` behind a migration without changing callers.
3. Add backend tests or SQL verification cases for every transition:
   - allowed transition
   - invalid status
   - missing permission
   - invalid order
4. Update `ordersService.js` guarded workflow helpers to call the RPC instead of direct `orders.status` updates.
5. Preserve existing notification behavior during the service migration, then move notification enqueueing into the RPC once parity is verified.
6. Keep generic status update helpers deprecated and unavailable from normal product UI.
7. Audit remaining direct `orders.status` writes.
8. Restrict direct status updates with RLS or database privileges so normal clients must use the RPC.
9. Keep a separate administrative override path only if needed, guarded by `workflow.override_status` and explicit activity logging.

The end state is that normal lifecycle actions use `rpc_transition_order_status`, generic status mutation helpers are removed or limited to controlled administrative paths, and Supabase enforces the same workflow rules the frontend displays.
