# Activity Log & Notifications Inventory (Falcon-MVP)

## A) DB Objects (source of truth)
- `public.activity_log` — primary audit/event stream for orders; columns include `event_type`, `detail` (jsonb), `actor_id`, `created_at`. RLS enabled; see triggers below.
- `public.order_activity` — legacy activity table kept for compat; inserts still possible via client fallback (`logOrderEvent`). Compat view `public.v_order_activity_compat` exposes `activity_log` shape.
- `public.notifications` — in-app notifications; mixed flags `is_read` vs `read/read_at`, optional order linkage (`order_id`, `link_path`, `payload`).
- `public.notification_prefs` — per-user prefs row (dnd/snooze/email/push + categories json).
- `public.notification_policies` — JSON rules keyed by event (used client-side to fan out recipients).
- `public.user_notification_prefs` & view `public.v_user_notification_prefs` — granular type×channel prefs (not yet wired in UI).
- Views with last-activity: `public.v_orders_list_with_last_activity` and `_v2` (joins latest `activity_log`), used by orders list/drawer. Additional order views reference `last_activity_at`.
- Triggers (orders): `public.tg_orders_audit_ins` and `public.tg_orders_audit_upd` on `orders` insert/update → write normalized rows into `activity_log` (event_type: order_created, status_changed, dates_updated, assignee_changed, fee_changed).
- RPCs (activity): `rpc_log_event` (two overloads), `rpc_log_note`, `rpc_log_status_change`; older order RPCs (`rpc_update_order_status`, `rpc_assign_order`) also insert into `activity_log`.
- RPCs (notifications): `rpc_notification_create`, `rpc_notifications_list`, `rpc_notifications_mark_read`, `rpc_notifications_mark_all_read`, `rpc_notifications_unread_count` (also legacy `rpc_unread_notifications_count`), `rpc_notification_prefs_ensure/get/update`, `rpc_set_notification_pref_v1`, `_default_notification_categories`, `_ensure_notification_prefs_for`, `rpc_create_notifications_for_event` / `_order_event`, `rpc_notify_admins`, `rpc_notify_user`.

## B) Frontend Files (paths + purpose)
- `src/lib/services/activityService.js` — reads `activity_log`, subscribes to realtime inserts, and writes notes directly into `activity_log`.
- `src/components/activity/ActivityLog.jsx` & `src/components/activity/ActivityNoteForm.jsx` — primary activity feed UI (drawer + detail), uses activityService.
- `src/components/orders/drawer/OrderDrawerContent.jsx` — embeds `ActivityLog` in order drawer.
- `src/components/orders/view/OrderActivity.jsx` — alternate activity panel with inline composer (also uses activityService).
- `src/components/orders/shared/OrderActions.jsx` — action bar that can post a note via `logNote`.
- `src/lib/utils/logOrderEvent.js` — RPC-first logger (`rpc_log_event`) with fallback insert into `order_activity`.
- `src/lib/logactivity.js` — fetch wrapper for `get_order_activity_flexible_v3`; `logActivity` import elsewhere is missing (see risks).
- `src/lib/api/reviews.js` — updates review status and calls missing `logActivity` helper.
- `src/lib/services/ordersService.js` — writes directly to `orders` (create/update/archive/status) and emits notifications for key transitions.
- `src/lib/services/notificationsService.js` — loads `notification_policies`, builds payloads, and inserts into `notifications`; `markRead` updates `read_at`.
- `src/features/notifications/{api.js,hooks.js,index.js}` — notification prefs + list/count + mark read/all (RPC-first with table fallbacks); hooks power settings UI.
- `src/components/notifications/NotificationBell.jsx` — top-nav bell; queries `notifications` by `user_id`, marks read and mark-all-read with direct table updates.
- `src/lib/hooks/useNotifications.js` — polling hook using `rpcGetNotifications` and optional realtime on `notification_center` (table not present in schema dump).
- `src/lib/services/api.js` — RPC wrappers for notification list/mark-read/prefs; used by `useNotifications`.
- `src/lib/api/notifications.js` — simple direct insert into `notifications` (legacy).
- `src/lib/bootstrap/ensureNotificationPrefs.js` & `src/pages/Settings.jsx` — bootstrap + settings screen calling notifications feature APIs.

## C) Current Flows (event → activity → notification → UI)
- Order writes (create/update/status/assign) happen directly on `orders` via `ordersService`; DB triggers add normalized rows to `activity_log`. UI reads from `activity_log` via activityService-powered components (drawer activity tab, order view activity, actions add-note).
- Manual notes: ActivityNoteForm/OrderActions call `logNote`, which inserts into `activity_log` without RPC, relying on RLS to allow insert; realtime channel streams inserts to feeds.
- Legacy logging: `logOrderEvent` tries `rpc_log_event` else inserts into `order_activity`; review submission calls missing `logActivity` helper (likely intended to log review status).
- Notifications fan-out: `ordersService` workflows (`createOrder`, `sendOrderToReview`, `sendOrderBackToAppraiser`, `completeOrder`) call `emitNotification`, which reads `notification_policies` and inserts rows into `notifications`.
- Notification consumption: NotificationBell fetches `notifications` for the current user and marks them read on open; settings page uses `features/notifications/api` to read/update prefs; `useNotifications` hook polls `rpc_notifications_list` and supports realtime on non-existent `notification_center`.

## D) Problems / Risks
- Direct table writes instead of RPC-only: `activityService.logNote` writes to `activity_log`; `notificationsService.emitNotification` and `markRead`, NotificationBell, `features/notifications/*` fall back to `.from("notifications")` inserts/updates; `sendNotification` utility inserts directly; `ordersService` writes `orders` directly (bypasses RPC-based audit intent, though triggers still fire).
- `logOrderEvent` fallback writes to legacy `order_activity`, keeping two audit trails alive; compat view suggests `order_activity` should be retired.
- Missing export: `src/lib/logactivity.js` does not export `logActivity`, but `src/lib/api/reviews.js` imports it; likely runtime failure when submitting review decisions.
- Schema mismatch: NotificationBell and fallbacks depend on `is_read` and `read_at`, while RPC surface (`rpc_notifications_mark_read`) uses `is_read`; table also has `read` boolean — double flags can drift.
- Realtime hook references `notification_center` table that does not exist in current schema snapshot.
- No client-side guard for RLS failures when direct inserting activity/notifications; errors logged to console only (emitNotification) or thrown (logNote), risking UX regressions if policies tighten.

## E) Proposed Consolidation Targets (no code changes yet)
- Standardize all activity writes through RPCs (`rpc_log_event`/`rpc_log_note`/`rpc_log_status_change`) and remove `order_activity` fallback; ensure review flow uses the same RPC.
- Route notifications through RPCs (`rpc_notification_create` + `rpc_notifications_mark_*`) or a single server-side fan-out RPC, eliminating direct `.from("notifications")` writes/updates.
- Pick one notifications client surface (likely `features/notifications/api + hooks`) and refit `NotificationBell` to it; drop legacy `src/lib/api/notifications.js` and redundant module `src/features/notifications/index.js` after consolidation.
- Align schema fields to one read flag (`read_at` or `is_read`) and mirror that in the API/hook responses.
- Validate presence/need of `notification_center` realtime channel; either create matching view/table or remove listener.
- Keep `activity_log` as the sole audit log and document that triggers already cover order mutations; ensure manual note path respects the same RPC-only policy.
