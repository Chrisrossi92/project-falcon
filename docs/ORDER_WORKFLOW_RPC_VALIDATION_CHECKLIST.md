# Order Workflow RPC Validation Checklist

Use this checklist to track validation for the new `rpc_transition_order_status` migration and the backend workflow enforcement foundation.

## Scope

- Docs-only checklist for migration validation status.
- Do not change SQL from this checklist.
- Do not change frontend or backend application code from this checklist.

## Current Status

- [x] `rpc_transition_order_status` was created and applied.
- [x] Transition validation works.
- [x] Permission enforcement works.
- [x] Missing permission rejection was validated.
- [x] Invalid transition rejection was validated.
- [x] Happy path `submit_to_review` was validated.
- [x] Duplicate legacy order activity triggers were disabled.
- [x] Activity now logs one clean `status_changed` row after an RPC transition.
- [x] Primary `ordersService.js` workflow helpers now use `rpc_transition_order_status`.
- [x] Full lifecycle tested through backend RPC: `new` -> `in_review` -> `review_cleared` -> `pending_final_approval` -> `ready_for_client` -> `completed`.
- [x] Request revisions path tested: `in_review` -> `needs_revisions`.
- [x] Notification/toast behavior preserved.

## 1. Pre-Apply Checks

- [x] Confirm the migration file for `rpc_transition_order_status` exists.
- [x] Confirm no frontend code depends on `rpc_transition_order_status` yet.
- [x] Confirm the existing `rpc_update_order_status` function still exists.
- [x] Confirm the migration is additive only.

## 2. Apply Checks

- [x] Apply the migration in Supabase.
- [x] Confirm the `rpc_transition_order_status` function exists after apply.
- [x] Confirm `authenticated` has execute grant on `rpc_transition_order_status`.

## 3. Happy Path Transition Tests

- [x] `submit_to_review`: `new` -> `in_review`
- [ ] `submit_to_review`: `in_progress` -> `in_review`
- [ ] `submit_to_review`: `needs_revisions` -> `in_review`
- [x] `request_revisions`: `in_review` -> `needs_revisions`
- [x] `approve_review`: `in_review` -> `review_cleared`
- [x] `request_final_approval`: `review_cleared` -> `pending_final_approval`
- [ ] `ready_for_client`: `review_cleared` -> `ready_for_client`
- [x] `ready_for_client`: `pending_final_approval` -> `ready_for_client`
- [x] `complete`: `ready_for_client` -> `completed`

## 4. Failure Tests

- [x] Invalid transition key is rejected.
- [ ] Transition from the wrong status is rejected.
- [x] Missing permission is rejected.
- [ ] Missing order is rejected.
- [ ] Unauthenticated request or missing current app user is rejected.

## 5. Activity Validation

- [x] `activity_log` records the status change once.
- [ ] Actor uses `public.users.id` resolved through `current_app_user_id`.
- [ ] Previous and new statuses are correct.
- [ ] Optional note appears where expected.
- [x] New RPC transitions produce one canonical `status_changed` row each.

## 6. Frontend Migration Readiness

- [x] Do not switch `ordersService.js` to `rpc_transition_order_status` until validation passes.
- [x] `sendOrderToReview` uses `rpc_transition_order_status`.
- [x] `sendOrderBackToAppraiser` uses `rpc_transition_order_status`.
- [x] `clearReview` uses `rpc_transition_order_status`.
- [x] `requestFinalApproval` uses `rpc_transition_order_status`.
- [x] `markReadyForClient` uses `rpc_transition_order_status`.
- [x] `completeOrder` uses `rpc_transition_order_status`.
- [ ] Do not remove old `rpc_update_order_status` yet.
- [ ] Audit remaining generic status helpers/RPCs before restriction.
- [ ] Do not tighten RLS until the generic usage audit is complete.
- [ ] Consider backend notification ownership later.
