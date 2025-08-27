# Falcon — WORKFILE (Top 5, always current)

> This is the ONLY place to edit the “what’s next” list. Long-form notes live in /docs/audit.

## Top 5 Next Tasks
1) Refactor `useOrders` to call service/RPC only
   - Acceptance: no direct `.from('orders')` calls in hooks; tests pass
   - Touches: src/lib/hooks/useOrders.js, src/lib/services/ordersService.js
2) Normalize status constants app-wide
   - Acceptance: single `orderStatus.ts` consumed by services + UI; reviewer queues use same set
   - Touches: src/lib/constants/orderStatus.*, ReviewerDashboard, OrdersTableRow
3) Calendar → RPC/view only (no client joins)
   - Acceptance: Calendar reads from `v_admin_calendar`/`rpc_list_admin_events` exclusively
   - Touches: calendarService, useAdminCalendar, Calendar page
4) Notifications API completion
   - Acceptance: `fetch, unreadCount, markRead, markAllRead, get/set prefs` implemented + wired to bell
   - Touches: features/notifications, services/notificationsService, NotificationBell
5) RLS hardening: appraiser scope
   - Acceptance: appraisers only fetch their orders (server-verified); smoke test path green
   - Touches: SQL policies, ordersService list functions, minimal tests

## Parking Lot
- Clients dashboard metrics → server view
- Replace dev/demo routes
- Error boundaries + skeletons

## Done (this week)
- (Fill at end of each session)
