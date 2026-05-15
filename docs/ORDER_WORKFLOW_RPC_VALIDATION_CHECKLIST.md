# Order Workflow RPC Validation Checklist

Use this checklist to validate the new `rpc_transition_order_status` migration before applying it to any shared Supabase environment.

## Scope

- Docs-only checklist for migration validation.
- Do not change SQL during this validation pass.
- Do not change frontend or backend application code during this validation pass.

## 1. Pre-Apply Checks

- [ ] Confirm the migration file for `rpc_transition_order_status` exists.
- [ ] Confirm no frontend code depends on `rpc_transition_order_status` yet.
- [ ] Confirm the existing `rpc_update_order_status` function still exists.
- [ ] Confirm the migration is additive only.

## 2. Apply Checks

- [ ] Apply the migration in Supabase.
- [ ] Confirm the `rpc_transition_order_status` function exists after apply.
- [ ] Confirm `authenticated` has execute grant on `rpc_transition_order_status`.

## 3. Happy Path Transition Tests

- [ ] `submit_to_review`: `new` -> `in_review`
- [ ] `submit_to_review`: `in_progress` -> `in_review`
- [ ] `submit_to_review`: `needs_revisions` -> `in_review`
- [ ] `request_revisions`: `in_review` -> `needs_revisions`
- [ ] `approve_review`: `in_review` -> `review_cleared`
- [ ] `request_final_approval`: `review_cleared` -> `pending_final_approval`
- [ ] `ready_for_client`: `review_cleared` -> `ready_for_client`
- [ ] `ready_for_client`: `pending_final_approval` -> `ready_for_client`
- [ ] `complete`: `ready_for_client` -> `completed`

## 4. Failure Tests

- [ ] Invalid transition key is rejected.
- [ ] Transition from the wrong status is rejected.
- [ ] Missing permission is rejected.
- [ ] Missing order is rejected.
- [ ] Unauthenticated request or missing current app user is rejected.

## 5. Activity Validation

- [ ] `activity_log` records the status change once.
- [ ] Actor uses `public.users.id` resolved through `current_app_user_id`.
- [ ] Previous and new statuses are correct.
- [ ] Optional note appears where expected.

## 6. Frontend Migration Readiness

- [ ] Do not switch `ordersService.js` to `rpc_transition_order_status` until validation passes.
- [ ] Once validated, migrate one helper first, likely `sendOrderToReview`.
