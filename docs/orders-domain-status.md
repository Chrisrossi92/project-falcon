# Falcon Orders Domain Cleanup Status

Last updated: 2026-03-12

## 1) Canonical modules now in use
- Raw order data access: `src/lib/api/orders.js`
- Workflow/status actions (and workflow side effects): `src/lib/domain/ordersWorkflow.js`
- Status constants: `src/lib/constants/orderStatus.js`
- Primary hooks:
  - `src/lib/hooks/useOrders.js`
  - `src/lib/hooks/useOrder.js`
  - `src/lib/hooks/useCalendarEvents.js`

## 2) Remaining legacy/compatibility modules
- Compatibility bridge still present: `src/lib/services/ordersService.js`
- Remaining live consumer of `ordersService`:
  - `src/components/orders/form/OrderForm.jsx` (`createOrder` import only)
- Legacy parallel hook path (not via canonical order API):
  - `src/lib/hooks/useMyorders.js` (direct Supabase query)

## 3) What has already been migrated
- Workflow action consumers moved from `ordersService` to `ordersWorkflow`:
  - `src/features/orders/UnifiedOrdersTable.jsx`
  - `src/components/orders/shared/OrderActions.jsx`
  - `src/components/orders/view/QuickActionsDrawerPanel.jsx`
- Status constant usage aligned to `orderStatus` in calendar/hook/UI paths.
- `useOrder` migrated to canonical API (`getOrder` from `src/lib/api/orders.js`).
- `OrderForm` edit path migrated to canonical API (`updateOrder` from `src/lib/api/orders.js`).
- `src/features/orders/index.js` stale exports fixed.

## 4) What is still blocked by Supabase/auth being unavailable
- Safe final cutover of create flow requires runtime verification of:
  - RLS behavior for insert/update/select by role.
  - Notification fanout behavior (`order.new_assigned`) on create.
  - View-backed detail/read parity (`v_orders_frontend_v4`) under real session context.
- Without live backend/auth, create-flow refactor cannot be validated end-to-end.

## 5) Final intended architecture for `createOrder`
- `src/lib/api/orders.js`: raw DB operations only (insert/select/update), no notification orchestration.
- Domain create flow module (new, recommended):
  - Example: `src/lib/domain/ordersCreation.js`
  - Responsibilities:
    - create payload normalization/validation for domain use case
    - call raw API insert
    - emit `order.new_assigned` notifications
- `ordersWorkflow` remains focused on status transitions and their side effects.

## 6) Resume checklist once backend access is restored
1. Confirm current create behavior baseline (payload shape + notifications) in staging.
2. Implement domain-level create flow (`ordersCreation`) that preserves baseline behavior.
3. Cut `OrderForm` create path to domain create flow.
4. Run role-based smoke tests (owner/admin/reviewer/appraiser):
   - create
   - edit
   - detail read
   - workflow transitions
   - calendar queue visibility
5. Verify notification records are created for expected recipients.
6. Remove remaining imports of `ordersService`.

## 7) Conditions to verify before deleting `src/lib/services/ordersService.js`
- `rg -n "@/lib/services/ordersService" src` returns no app consumers.
- `OrderForm` no longer imports `createOrder` from `ordersService`.
- Create/edit/detail flows pass manual smoke tests with live Supabase auth.
- Notification side effects on create are preserved after cutover.
- No regressions in workflow actions currently using `ordersWorkflow`.
