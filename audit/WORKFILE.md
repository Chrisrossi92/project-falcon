# Project Falcon — Audit WORKFILE (Narrative SSOT)

> Use the `FILE_AUDIT_TEMPLATE.md` for each new entry. Keep sections short but specific.

## Index
<!-- Add links to audited files as you go -->

---

## `project-falcon-main/src/main.jsx`

**Decision:** Keep  
**Health:** Yellow — Initial pass only; confirm runtime behavior

**Role / Purpose:**  
React/Vite entrypoint that mounts the app and initializes providers (router, theme, session).

**Parents (who imports this):**
- (entrypoint or not referenced via relative imports)

**Children (what it imports):**
- ./App
- ./context/UserContext
- react
- react-dom/client
- react-router-dom

**Notes / Risks / TODOs:**  
- Verify router mounting and provider order.
- Confirm SSR assumptions (none) and environment variables used.
- Ensure this file’s imports are valid after cleanup.

**Next Action:**  
- Run app, visit root routes, and note any console/runtime errors.

## `project-falcon-main/src/App.jsx`

**Decision:** Keep  
**Health:** Yellow — Initial pass only; confirm runtime behavior

**Role / Purpose:**  
Top-level application shell: defines routes/layout and global UI scaffolding.

**Parents (who imports this):**
- project-falcon-main/src/main.jsx

**Children (what it imports):**
- ./lib/supabaseClient
- ./routes
- @supabase/auth-helpers-react
- react
- react-hot-toast

**Notes / Risks / TODOs:**  
- Verify router mounting and provider order.
- Confirm SSR assumptions (none) and environment variables used.
- Ensure this file’s imports are valid after cleanup.

**Next Action:**  
- Run app, visit root routes, and note any console/runtime errors.

## `project-falcon-main/src/index.html`

**Decision:** Keep  
**Health:** Yellow — Initial pass only; confirm runtime behavior

**Role / Purpose:**  
Root HTML document used by Vite to inject the app mount node and scripts.

**Parents (who imports this):**
- (entrypoint or not referenced via relative imports)

**Children (what it imports):**
- (none / HTML)

**Notes / Risks / TODOs:**  
- Verify router mounting and provider order.
- Confirm SSR assumptions (none) and environment variables used.
- Ensure this file’s imports are valid after cleanup.

**Next Action:**  
- Run app, visit root routes, and note any console/runtime errors.

## `project-falcon-main/index.html`

**Decision:** Keep  
**Health:** Yellow — Initial pass only; confirm runtime behavior

**Role / Purpose:**  
Root HTML document used by Vite to inject the app mount node and scripts.

**Parents (who imports this):**
- (entrypoint or not referenced via relative imports)

**Children (what it imports):**
- (none / HTML)

**Notes / Risks / TODOs:**  
- Verify router mounting and provider order.
- Confirm SSR assumptions (none) and environment variables used.
- Ensure this file’s imports are valid after cleanup.

**Next Action:**  
- Run app, visit root routes, and note any console/runtime errors.

## `project-falcon-main/src/routes/index.jsx`

**Decision:** Keep  
**Health:** Yellow — Initial pass only; confirm runtime behavior

**Role / Purpose:**  
Router index that centralizes route definitions and lazy-loading of pages.

**Parents (who imports this):**
- (entrypoint or not referenced via relative imports)

**Children (what it imports):**
- ../layout/Layout
- ../pages/AdminDashboard
- ../pages/AdminUsers
- ../pages/AppraiserDashboard
- ../pages/Calendar
- ../pages/ClientDetail
- ../pages/ClientsDashboard
- ../pages/EditClient
- ../pages/EditUser
- ../pages/Login
- ../pages/NewClient
- ../pages/OrderDetail
- ../pages/Orders
- ../pages/OrdersDemo
- ../pages/Settings
- ../pages/UserDetail
- ../pages/UserHub
- ../pages/UsersDashboard
- @/lib/hooks/ProtectedRoute
- @/lib/hooks/useRole
- @/lib/hooks/useSession
- @/pages/NewOrder
- @/pages/ReviewerDashboard
- react
- react-router-dom

**Notes / Risks / TODOs:**  
- Verify router mounting and provider order.
- Confirm SSR assumptions (none) and environment variables used.
- Ensure this file’s imports are valid after cleanup.

**Next Action:**  
- Run app, visit root routes, and note any console/runtime errors.

src/lib/supabaseClient.js

Decision: Keep
Health: Green — single source of client init

Role / Purpose:
Centralized Supabase client export. Provides supa, supabase, and client aliases to ensure consistent DB access.

Parents:

Imported across all API files (e.g., activities.js, calendar.ts, notifications.ts, orders.ts).

Children:

./supa.client (local initialization file).

Notes / Risks / TODOs:

Ensure only this is used as the canonical client (avoid drift if other init files exist).

Check for unused aliases (client, supa) to simplify.

Next Action:

Confirm supa.client is configured with proper env vars; prune unused aliases if safe.

src/lib/api/activities.js

Decision: Keep
Health: Green — clean RPC-first with fallback

Role / Purpose:
Fetches and posts order activity logs. Uses RPC rpc_log_note for comments, falls back to direct activity_log insert if RPC missing.

Parents:

Used wherever activity logs or comments are shown (likely Order detail components).

Children:

@/lib/supabaseClient

Notes / Risks / TODOs:

Good RPC-first design. Ensure rpc_log_note exists in DB.

Consider consolidating error handling to a util.

Next Action:

Verify UI hooks (Order detail, FloatingActivityLog) use this correctly.

src/lib/api/calendar.ts

Decision: Keep
Health: Yellow — content not fully reviewed (needs deeper scan).

Role / Purpose:
Likely handles querying order/calendar events for display in dashboards.

Parents:

Imported by AdminDashboard (via AdminCalendar) or calendar page.

Children:

@/lib/supabaseClient

Notes / Risks / TODOs:

Need to confirm it properly narrows down to only site visits / due dates (per business rules).

Next Action:

Inspect functions for filtering; validate against real DB schema.

src/lib/api/notifications.ts

Decision: Keep
Health: Yellow — not yet fully reviewed.

Role / Purpose:
Handles notification fetch/insert logic. Tied to NotificationBell and possibly email triggers.

Parents:

Likely consumed by NotificationBell in Layout.

Children:

@/lib/supabaseClient

Notes / Risks / TODOs:

Needs verification of whether push/email logic is handled here or in backend RPC.

Next Action:

Confirm supabase functions match (notifications table or RPC).

src/lib/api/orders.ts

Decision: Keep
Health: Green — central to system.

Role / Purpose:
Primary CRUD + RPC for Orders table. Backbone of assignment, updates, status changes.

Parents:

Dashboards (AdminDashboard, ReviewerDashboard), OrdersTable, hooks (useOrders).

Children:

@/lib/supabaseClient

Notes / Risks / TODOs:

Must remain RPC-only where possible.

Review for legacy direct .from("orders") calls that could be refactored to RPC.

Next Action:

Audit all functions for RLS compliance; remove unused exports.

src/pages/AdminDashboard.jsx

Decision: Keep
Health: Green — functional dashboard

Role / Purpose:
Admin view combining calendar and orders table. Calls useOrders to fetch data and passes down to AdminCalendar and OrdersTable.

Parents:

Routed via ProtectedRoutes (for admin role).

Children:

@/lib/hooks/useOrders

@/components/DashboardCalendar, @/components/orders/OrdersTable, @/components/admin/AdminCalendar

Notes / Risks / TODOs:

Calendar currently basic; ensure only key events shown.

Consider error boundary UI improvements.

Next Action:

Validate refetch pattern with OrdersTable.

src/pages/ReviewerDashboard.jsx

Decision: Keep
Health: Green — tailored reviewer workflow

Role / Purpose:
Displays reviewer queue of orders (in_review, ready_to_send, revisions). Provides approve/reject actions with status updates.

Parents:

Routed via /reviewer in ProtectedRoutes.

Children:

@/lib/hooks/useOrders

@/lib/services/ordersService

react-hot-toast

Notes / Risks / TODOs:

Hardcoded IN_QUEUE statuses — maybe externalize.

Ensure proper RLS rules on reviewer actions.

Next Action:

Add loading/error skeletons for consistency.

src/routes/index.jsx

Decision: Keep
Health: Green — main router

Role / Purpose:
Defines all app routes, protected by session + role. Switches dashboards based on DB role.

Parents:

Imported by src/main.jsx.

Children:

All pages (Orders, ClientsDashboard, UsersDashboard, Calendar, Login, AdminDashboard, AppraiserDashboard, ReviewerDashboard, etc.)

Hooks: useSession, useRole, ProtectedRoute

Notes / Risks / TODOs:

Contains demo routes (OrdersDemoPage) → may need removal for production.

Ensure consistent ProtectedRoute usage.

Next Action:

Remove dev/demo routes before release.

src/layout/Layout.jsx

Decision: Keep
Health: Green — app shell

Role / Purpose:
Provides header, nav, logout, role-based navigation, and wraps <Outlet />. Includes NotificationBell and FloatingActivityLog.

Parents:

Used in src/routes/index.jsx as layout wrapper.

Children:

@/lib/hooks/useSession

@/components/notifications/NotificationBell

../components/FloatingActivityLog

@/components/ui/Loaders

@/lib/supabaseClient

Notes / Risks / TODOs:

Role logic duplicated (isAdmin, isReviewer) — consider centralizing.

Logout ties directly to supabase client; fine for MVP but may need wrapper later.

FloatingActivityLog inclusion pending refactor decision: keep or replace depending on final UX plan (admin toggle vs removal).

Next Action:

Revisit inclusion of FloatingActivityLog once all components are audited and decisions finalized.

Align nav visibility rules with ProtectedRoute to avoid UI/backdoor mismatch.

project-falcon-main/src/lib/api/calendar.ts

Exports: createEvent, listAdminEvents

Uses: RPC rpc_create_calendar_event, view v_admin_calendar

Notes: confirm view filters to only the three event types; validate timezone handling

project-falcon-main/src/lib/api/notifications.ts

Exports: sendNotification

Uses: notifications table

Notes: confirm table schema; consider RPC for email side‑effects; add list/markRead helpers if missing

project-falcon-main/src/lib/api/orders.ts

Exports: fetchSiteVisitAt, updateSiteVisitAt (+ core CRUD)

Uses: orders table; couples site‑visit update with calendar via rpc_create_calendar_event

Notes: keep RPC‑first for multi‑table side effects; unify errors

src/pages/ClientsDashboard.jsx

Decision: Keep
Health: Yellow — heavy client-side joins
Role: Lists clients with metrics (orders, avg fee, active orders). Enriches AMC parents with children.
Parents: Routed via /clients (Protected admin).
Children: ClientCard, ClientFilters, supabase.
Notes: Multiple sequential Supabase queries → performance risk.
Next Action: Refactor into backend RPC/view for efficiency.

src/pages/EditUser.jsx

Decision: Keep
Health: Green
Role: “My profile” edit form. Updates display name, avatar, bio, status.
Parents: /profile/edit.
Children: useSession, supabase.
Notes: Direct updates fine; limited scope to logged-in user.
Next Action: Consolidate validation + allow image upload later.

src/pages/Login.jsx

Decision: Keep
Health: Green
Role: Supabase Auth UI for sign-in. Redirects if already logged in.
Parents: /login.
Children: Auth from @supabase/auth-ui-react.
Notes: Email/password only. Hardcoded logo path.
Next Action: Add SSO providers later if needed.

src/pages/Settings.jsx

Decision: Keep
Health: Green
Role: Settings page with Profile, Preferences, Notification settings.
Parents: /settings.
Children: ProfileForm, PreferencesForm, NotificationsSettings.
Notes: Pure UI composition.
Next Action: Ensure forms map to DB update APIs.

src/pages/UserDetail.jsx

Decision: Keep
Health: Green
Role: Admin-level user editor (legal name, email, phone, avatar).
Parents: Routed /users/:userId.
Children: supabase, Button, toast.
Notes: Direct DB update — should route via AdminUsers service layer.
Next Action: Restrict access (admin only) in router + RLS.

src/pages/UsersDashboard.jsx

Decision: Keep
Health: Green
Role: Displays team member list. Admin/manager sees “Manage Roles” link.
Parents: /users.
Children: useRole, supabase.
Notes: Good separation: quick edit link vs role mgmt in AdminUsers.
Next Action: Consider centralizing user queries in API layer.

src/pages/AdminUsers.jsx

Decision: Keep
Health: Green
Role: Admin “Team & Roles” manager. Can edit email, role, fee split, status inline.
Parents: /admin/users.
Children: supabase, role/status dropdowns.
Notes: Inline update calls → may bypass audit logging.
Next Action: Wrap in service function for consistency + add audit log.

src/pages/AppraiserDashboard.jsx

Decision: Keep
Health: Green
Role: Appraiser’s orders list. Filters orders by current user id.
Parents: /dashboard if role=appraiser.
Children: useOrders, useSession, OrdersTable.
Notes: Good defensive coding (guards undefined).
Next Action: Add summary stats (count, upcoming deadlines).

src/pages/Calendar.jsx

Decision: Keep
Health: Green
Role: Admin calendar with site, review, due, and holidays. Uses FullCalendar.
Parents: /calendar.
Children: supabase, useOrderEvents, FullCalendarWrapper.
Notes: Pulls raw orders; filters by role. RPC/view would be cleaner.
Next Action: Replace direct queries with API hook.

src/pages/ClientDetail.jsx

Decision: Keep
Health: Yellow — multiple sequential queries
Role: Client detail form; supports new + edit; manages associated contacts.
Parents: /clients/:id.
Children: supabase, ContactForm.
Notes: Duplicates queries (clients + contacts). Could move to RPC/view.
Next Action: Add validation + better error UX; migrate to API.

src/components/ui/FullCalendarWrapper.jsx

Decision: Keep
Health: Green
Role: Wrapper around FullCalendar with two-week view, event tooltips, imperative API.
Parents: CalendarPage.
Children: @fullcalendar/react, plugins.
Notes: Solid abstraction.
Next Action: Ensure consistent theming.

src/components/ui/input.jsx

Decision: Keep
Health: Green
Role: Styled input with cn util.
Parents: AddressAutocomplete, OrderNumberField, etc.
Children: cn util.
Next Action: Add validation props for forms.

src/components/ui/Loaders.jsx

Decision: Keep
Health: Green
Role: Simple animated loading indicator.
Parents: Layout, UserDetail.
Next Action: Add skeleton loaders.

src/components/ui/button.jsx

Decision: Keep
Health: Green
Role: Shadcn-style button with variants and sizes.
Parents: Everywhere (Order forms, modals).
Children: class-variance-authority, cn.
Next Action: Audit for consistent variant usage.

src/components/ui/dialog.jsx

Decision: Keep
Health: Green
Role: Radix-based dialog primitives (modal).
Parents: ReviewersModal.
Notes: Full feature set (overlay, header, footer).
Next Action: Ensure accessibility (aria props).

src/components/ui/Errors.jsx

Decision: Keep
Health: Green
Role: Reusable error message box.
Parents: UserDetail, ReviewerDashboard.
Next Action: Add more variants (warnings, empty state).

src/components/notifications/NotificationBell.jsx

Decision: Keep
Health: Yellow — complex, multi-source
Role: Notification dropdown with filters, DND/Snooze, unread badge.
Parents: Layout header.
Children: features/notifications API functions, useSession.
Notes: Client-heavy logic; duplicates categoryOf.
Next Action: Refactor into hook + backend RPC for preferences.

src/components/FloatingActivityLog.jsx

Decision: Refactor — improve UX
Health: Yellow
Role: Draggable floating log viewer; fetches recent activity_log.
Parents: Included in Layout.
Children: supabase, Draggable, useSession.
Notes: Current UX feels intrusive. NotificationBell already covers most needs. Admins may still want persistent, always-visible activity.
Next Action:

Replace with optional toggle in settings or admin role-only.

Consider docking panel (sidebar/tab) instead of floating draggable.

Consolidate with Notification system for consistency.

src/components/inputs/AddressAutocomplete.jsx

Decision: Keep
Health: Green
Role: Google Places autocomplete wrapper with parsed fields.
Parents: BasicInfoFields.
Children: Google Maps API.
Notes: Manual mode handled in BasicInfoFields.
Next Action: Cache Google API load to prevent re-inits.

src/components/inputs/OrderNumberField.jsx

Decision: Keep
Health: Green
Role: Input field with Supabase uniqueness check for order numbers.
Parents: BasicInfoFields.
Children: supabase.
Notes: Good debounce; risk of race conditions on fast typing.
Next Action: Handle server validation at submission too.

src/lib/hooks/useGooglePlaces.js

Decision: Keep
Health: Green
Role: Loads Google Places API script once, resolves to window.google.
Parents: AddressAutocomplete, BasicInfoFields.
Next Action: Cache errors; centralize API key validation.

src/lib/hooks/useOrderEvents.js

Decision: Keep
Health: Green
Role: Maps orders to calendar events (site/review/due), color-coded by appraiser.
Parents: CalendarPage.
Children: mapOrderToEvents, colorForId.
Next Action: Consolidate category logic with Notification system for consistency.

src/lib/hooks/useOrders.js

Decision: Refactor (keep)
Health: Yellow
Role: Fetches orders + realtime subscription.
Parents: AdminDashboard, AppraiserDashboard, ReviewerDashboard.
Children: supabase, useSession.
Notes: Direct supabase.from("orders") inside hook → bypasses service layer.
Next Action: Refactor to call ordersService RPCs, not raw queries.

src/lib/hooks/useRole.js

Decision: Keep
Health: Green
Role: Gets user role, self-creates minimal users row if missing.
Parents: ProtectedRoute, Layout, UsersDashboard.
Children: supabase.
Next Action: Confirm auth_id linkage matches schema; add audit logging on auto-create.

src/lib/hooks/useSession.js

Decision: Keep
Health: Green
Role: Wraps internal UserContext to expose user + role flags.
Parents: Layout, Orders hooks, NotificationBell.
Children: internalUseUser.
Next Action: Add null guards for SSR contexts.

src/lib/hooks/ProtectedRoute.jsx

Decision: Keep
Health: Green
Role: Guards routes by auth + role. Redirects to login/dashboard.
Parents: Router (index.jsx).
Children: useRole, supabase.auth.
Next Action: Add loading UI instead of returning null.

src/lib/services/ordersService.js

Decision: Keep
Health: Green
Role: RPC-first service for creating, assigning, updating orders. Logs events.
Parents: OrdersTableRow, OrderDetail, ReviewerDashboard.
Children: supabase.rpc, logOrderEvent.
Next Action: Expand coverage (fetch orders, fetch by id) so components don’t hit Supabase directly.

src/lib/services/notifications.ts

Decision: Keep
Health: Yellow (not fully reviewed — type coverage pending)
Role: Likely core notification service (fetch, mark read, prefs).
Parents: NotificationBell.
Next Action: Standardize with features/notifications exports; confirm RPC usage.

src/lib/utils/logOrderEvent.js

Decision: Keep
Health: Green
Role: Canonical event logger. Calls rpc_log_event and fans out notifications.
Parents: ordersService, OrdersTableRow (indirect), OrderDetail.
Children: supabase.rpc.
Next Action: Ensure RPC names (rpc_log_event, rpc_create_notifications_for_order_event) exist in DB; centralize all logging here.

src/lib/utils/rpcFirst.js

Decision: Keep
Health: Green — clean RPC‑first helper with fallback on 42883/404
Role: Attempts supabase.rpc(fn, params) and runs a provided fallback if the RPC doesn’t exist.
Parents: updateOrderStatus.js (and good candidate for broader use).
Next Action: Consider telemetry on fallbacks to spot missing RPCs in prod.

src/lib/utils/updateOrderStatus.js

Decision: Retire (superseded by services)
Health: Yellow — mixes direct table update + custom event logger; overlaps ordersService.updateOrderStatus
Role: Changes order status via RPC rpc_update_order_status or falls back to .from('orders').update and calls logOrderEvent.
Notes: Uses logOrderEvent with param orderId (camel), while canonical util expects order_id (snake).
Next Action: Replace all usage with src/lib/services/ordersService.updateOrderStatus and remove to avoid drift.

src/lib/utils/autoUpdateOrderStatus.js

Decision: Refactor (keep for now)
Health: Yellow — direct DB calls; status strings differ from normalized set
Role: After site‑visit passes, flips status to "Inspected" via RPC fallback.
Notes: Our app’s statuses elsewhere are snake_case (e.g., site_visit_done, in_review). This uses "Inspected"/"inspection scheduled"—inconsistent.
Next Action: Normalize status constants and route through ordersService.updateOrderStatus.

src/lib/utils/colorForId.js

Decision: Keep
Health: Green — deterministic palette hashing
Role: Stable color by id for calendar/appraiser tinting.
Next Action: Consider theme awareness (dark mode contrasts).

src/lib/utils/logOrderEvent.js

Decision: Keep (canonical)
Health: Green — RPC‑only, then fan‑out notifications
Role: Calls rpc_log_event then rpc_create_notifications_for_order_event.
Next Action: Ensure both RPCs exist and are versioned; all event logs should go through this.

src/lib/utils/mapOrderToEvents.js

Decision: Refactor (keep)
Health: Yellow — field names don’t match current pages/hooks
Role: Converts an order to FullCalendar events (site/review/due).
Notes: Uses review_due_date and due_date, but OrderDetail/OrdersTableRow use review_due_at and final_due_at.
Next Action: Align to {site_visit_at, review_due_at, final_due_at} and prefer property_address/city/state/zip for titles.

src/lib/utils/permissions.js

Decision: Refactor (keep)
Health: Yellow — role/strings inconsistent with current workflow
Role: Client‑side permission helpers for orders/clients/users/logs.
Notes: Uses "Needs Review", "Site Visit Scheduled", "In Progress" while dashboards/rows use snake_case like in_review, ready_to_send. Reviewers rules are placeholders.
Next Action: Centralize status constants and update checks; add tests for common scenarios.

Notifications Feature Layer

Decision: Refactor / Build out
Health: Red — incomplete
Role: NotificationBell expects a full API (fetchNotifications, markAsRead, markAllRead, unreadCount, getNotificationPrefs, isDndActive, isSnoozed, setSnooze, clearSnooze). Currently only src/features/notification.ts exists.
Parents: NotificationBell.
Notes: Missing the full implementation.
Next Action:

Either expand notification.ts into a full notifications/ module exposing these functions,

Or refactor NotificationBell to use what notification.ts provides.

Define RPCs / tables (notifications, notification_prefs) and align.

src/components/orders/OrdersDrawer.jsx

Decision: Keep
Health: Green
Role: Radix dialog wrapper around OrderDrawerContent.
Parents: Orders pages.
Children: OrderDrawerContent.
Next Action: Add close button inside drawer for UX.

src/components/orders/OrderSidebarPanel.jsx

Decision: Keep
Health: Green
Role: Sidebar with tabs (Activity/Map).
Parents: OrderDrawerContent.
Children: OrderActivityPanel, MapContainer.
Notes: Good UX; ensure MapContainer supports missing address gracefully.
Next Action: Unify with Notifications vs ActivityLog duplication.

src/components/orders/OrdersTableHeader.jsx

Decision: Keep
Health: Green
Role: Table header with toggleable Appraiser column.
Parents: OrdersTable.
Children: —
Next Action: Centralize column labels for consistency with CSV export.

src/components/orders/OrdersTablePagination.jsx

Decision: Keep
Health: Green
Role: Pagination controls.
Parents: Orders list pages.
Children: Button.
Next Action: Add keyboard navigation + page size selector.

src/components/orders/OrderActivityPanel.jsx

Decision: Refactor (keep)
Health: Yellow
Role: Displays realtime order activity via Supabase channel.
Parents: OrderSidebarPanel.
Children: supabase.
Notes: Duplicates logic with FloatingActivityLog.
Next Action: Centralize into one ActivityLog component; reuse.

src/components/orders/OrderDetailPanel.jsx

Decision: Keep
Health: Green
Role: Shows detailed fields for order (fees, assignment, status, notes).
Parents: OrderDrawerContent.
Children: MetaItem.
Next Action: Refactor dates to use unified format utils.

src/components/review/ReviewAssignmentModal.jsx

Decision: Refactor (keep)
Health: Yellow
Role: Assigns reviewer to order.
Parents: Admin/Reviewer tools.
Children: supabase, logOrderEvent.
Notes: Direct table update, inconsistent event log params.
Next Action: Route through ordersService.assignReviewer; align statuses.

src/components/review/ReviewModal.jsx

Decision: Keep
Health: Green
Role: Reviewer selection modal with ordering/required flags.
Parents: Admin/Reviewer dashboard.
Children: supabase, Dialog, Button.
Notes: Includes “default Pam” hardcoded logic — fragile.
Next Action: Externalize reviewer defaults; remove hardcoded name.

src/components/clients/ClientCard.jsx

Decision: Keep
Health: Green
Role: Displays client info, stats, contact, and actions.
Parents: ClientsDashboard.
Children: —
Next Action: Factor out status label color constants for consistency.

src/components/clients/ClientFilters.jsx

Decision: Keep
Health: Green
Role: React-select search/filter over clients.
Parents: ClientsDashboard.
Children: react-select.
Next Action: Add async loading option for large client lists.

src/components/orders/OrderForm.jsx

Decision: Keep
Health: Green
Role: Full create/edit order form. Handles basic info, assignment, dates, and calls useOrderForm for persistence.
Parents: Pages (NewOrder, EditOrder).
Children: useOrderForm, supabase for fetching users/clients.
Notes: Good structure; ensures RPC logging via hook.
Next Action:

Replace manual supabase.from("users")/("clients") with API layer for consistency.

Centralize status options from constants.

src/components/MapContainer.jsx

Decision: Keep
Health: Green
Role: Embeds Google Maps iframe for property address.
Parents: OrderSidebarPanel.
Children: Google Maps embed API.
Notes: Lightweight but depends on env key.
Next Action: Add error handling for missing/invalid API key; consider using Places JS already loaded.

src/components/MetaItem.jsx

Decision: Keep
Health: Green
Role: Simple label + value wrapper for metadata display.
Parents: OrderDetailPanel.
Children: —
Notes: Very clean and reusable.
Next Action: None needed; could expand variants (e.g., tooltip, copyable values).

src/components/Badge.jsx

Decision: Refactor (keep)
Health: Yellow
Role: Basic badge with hardcoded color types.
Parents: Possibly used in lists or dashboards.
Children: —
Notes: Limited variants; not aligned with Shadcn/ui or Tailwind tokens.
Next Action: Refactor to use class-variance-authority pattern like Button for consistency.

src/pages/NewOrder.jsx

Decision: Keep
Health: Green
Role: Wrapper page for creating orders; seeds OrderForm with defaults.
Parents: Router /orders/new.
Children: OrderForm.
Next Action: Ensure status default is snake_case (new) for consistency.

src/pages/OrdersDemo.jsx

Decision: Retire (dev-only)
Health: Red
Role: Demo page showing OrdersTable against a DB view.
Parents: Router /dev/orders.
Children: OrdersTable.
Next Action: Remove from production build; keep behind feature flag if needed.

src/pages/NewClient.jsx

Decision: Keep
Health: Green
Role: Page to create new clients using ClientForm.
Parents: Router /clients/new.
Children: ClientForm, supabase.
Next Action: Route through clientService RPCs instead of direct supabase.

src/pages/EditClient.jsx

Decision: Keep
Health: Yellow
Role: Edit existing client, save/delete with Supabase.
Parents: Router /clients/edit/:id.
Children: ClientForm, supabase.
Notes: Direct DB calls; deletion prompts via window.confirm.
Next Action: Move logic to clientService; add soft-delete.

src/pages/Reports.jsx

Decision: Keep (placeholder)
Health: Yellow
Role: Stub for reports view.
Parents: Router /reports.
Children: —
Notes: No functionality yet.
Next Action: Define scope (order metrics, client metrics) or remove until needed.

src/pages/UserHub.jsx

Decision: Keep
Health: Green
Role: User profile hub for self or admin. Allows edits (display, avatar, bio, status).
Parents: Router /users/view/:id.
Children: useSession, supabase.
Next Action: Move updates to userService; add audit logging.

src/components/forms/ClientForm.jsx

Decision: Keep
Health: Green
Role: Form component for creating/editing clients with validation and AMC parent linkage.
Parents: NewClient, EditClient.
Children: supabase (fetch AMC list).
Notes: Handles multiple contacts and supports AMC parent selection. Client-side validation included.
Next Action:

Move Supabase fetch for AMC options into a clientService or hook for consistency.

Expand validation beyond just name (emails, phone formats).

Add loading/error UI around AMC options fetch.

src/context/NotificationProvider.jsx

Decision: Keep
Health: Green
Role: React context wrapper for toast notifications (react-hot-toast). Provides notify() and mounts <Toaster>.
Parents: App root (wraps children).
Children: react-hot-toast.
Next Action: Merge with NotificationBell prefs once backend notifications solidify.

src/context/UserContext.jsx

Decision: Keep
Health: Green
Role: Manages logged-in user state via Supabase session + users table profile.
Parents: Used by useSession.
Children: supabase.
Next Action: Refactor to fetch by auth_id consistently (matches useRole); add error boundaries.

src/data/generateHolidays.js

Decision: Keep (dev util)
Health: Green
Role: Script to generate JSON of US holidays using date-holidays.
Parents: Developer run.
Children: date-holidays.
Next Action: Document as a one-off script; exclude from prod bundle.

src/data/usHolidays2025.json

Decision: Keep
Health: Green
Role: Static holidays dataset for 2025.
Parents: CalendarPage.
Children: —
Next Action: Regenerate annually via generateHolidays.js.

.env.example

Decision: Keep
Health: Green
Role: Documents required environment variables.
Parents: Developer onboarding.
Next Action: Ensure all required keys present (Supabase URL/key, Google Maps API key).

jsconfig.json

Decision: Keep
Health: Green
Role: Configures path aliases (@/*).
Parents: Dev tooling.
Next Action: Align with vite.config.js alias.

package.json

Decision: Keep
Health: Green
Role: Dependency manifest.
Parents: —
Children: All deps.
Notes: Contains both supabase and @supabase/supabase-js — might be duplication risk.
Next Action: Prune unused deps (react-big-calendar vs fullcalendar, etc.).

vite.config.js

Decision: Keep
Health: Green
Role: Vite config with React plugin and alias.
Parents: Build system.
Children: —
Next Action: Add Tailwind config if missing; ensure consistency with jsconfig.json.
src/components/orders/OrderDetailPanel.jsx

Decision: Keep
Health: Green — complete, cleanly structured

Role / Purpose:
Displays detailed order info in 3-column layout (general, fees, dates) with notes and admin-only fields.

Parents: Likely OrderDrawerContent.
Children: MetaItem, react-router-dom.

Notes / Risks / TODOs:

Uses mixed date fields (due_date, site_visit_at) — confirm consistency with schema (final_due_at vs due_date).

Good separation; simple navigation to edit.

Next Action: Align field naming with canonical schema (final_due_at, review_due_at) to avoid drift.

src/components/orders/OrdersDrawer.jsx

Decision: Keep
Health: Green — thin wrapper around Radix Dialog

Role / Purpose:
Drawer container for order details, conditionally renders OrderDrawerContent.

Parents: Orders pages, dashboards.
Children: OrderDrawerContent, Radix Dialog.

Notes / Risks / TODOs:

Lacks a close button in drawer content itself.

UX is otherwise clean.

Next Action: Add explicit close button in drawer for accessibility.

src/components/orders/OrderSidebarPanel.jsx

Decision: Keep
Health: Green — functional tabbed panel

Role / Purpose:
Side panel with tabs for Activity and Map. Passes order.id to OrderActivityPanel.

Parents: OrderDrawerContent.
Children: OrderActivityPanel, MapContainer.

Notes / Risks / TODOs:

Duplicates Activity display already provided elsewhere (FloatingActivityLog).

Tab design fine for MVP.

Next Action: Decide long-term whether to consolidate activity into Notifications system.

src/features/orders/OrdersTable.jsx

Decision: Keep
Health: Yellow — adapter is solid, but still tied to raw useOrders

Role / Purpose:
Adapter between hook and presentational OrdersTable. Handles filtering by status, appraiser, client.

Parents: Orders pages, dashboards.
Children: useOrders, PresentationalOrdersTable.

Notes / Risks / TODOs:

Still depends on useOrders which uses raw Supabase queries.

Filtering logic is clean but will need to move server-side eventually.

Next Action: Refactor useOrders → service layer RPC calls; keep adapter.

src/components/orders/OrdersTableHeader.jsx

Decision: Keep
Health: Green — stable

Role / Purpose:
Defines table header row with conditional appraiser vs fee split column.

Parents: OrdersTable.
Children: None.

Notes / Risks / TODOs:

Hardcoded labels; should be centralized if headers reused in exports.

Next Action: Centralize column labels for consistency.

src/components/OrdersTablePagination.jsx

Decision: Keep
Health: Green — simple, works

Role / Purpose:
Pagination controls with Prev/Next.

Parents: Orders list/table wrapper.
Children: Button (shadcn).

Notes / Risks / TODOs:

Missing page size selector.

Otherwise good.

Next Action: Add keyboard navigation + page size.

src/components/orders/OrdersTableRow.jsx

Decision: Keep
Health: Green — complete and RPC-first

Role / Purpose:
Row renderer with inline status, site visit, final due editing. Uses service layer (ordersService) and toast feedback.

Parents: OrdersTable.
Children: updateOrderStatus, updateOrderDates, useSession.

Notes / Risks / TODOs:

Good use of RPC services.

Schema alignment: uses final_due_at + site_visit_at (correct).

Provides reviewer task highlighting.

Next Action: Verify all status options match canonical constants.

src/components/orders/OrderActivityPanel.jsx

Decision: Refactor (keep)
Health: Yellow — duplicate logic

Role / Purpose:
Fetches and displays order activity log with refresh button.

Parents: OrderSidebarPanel.
Children: activityService.

Notes / Risks / TODOs:

Duplicate logic with FloatingActivityLog.

UI is fine; risk is fragmentation.

Next Action: Consolidate into a single ActivityLog component reused across app.

src/pages/AdminDashboard.jsx

Decision: Keep
Health: Green — functional dashboard

Role / Purpose:
Admin view combining calendar and orders table; fetches via useOrders, composes DashboardCalendar and OrdersTable.

Parents: Router (admin-protected).
Children: useOrders, DashboardCalendar, OrdersTable.

Notes / Risks / TODOs:

Calendar should only surface site/review/final due per biz rules.
Next Action: Confirm calendar events are fed by RPC/view (not client joins).

src/pages/ReviewerDashboard.jsx

Decision: Keep
Health: Green — tailored reviewer workflow

Role / Purpose:
Shows reviewer queue (in_review, ready_to_send, revisions), approve/reject paths.

Parents: /reviewer (protected).
Children: useOrders, ordersService, toast.

Notes / Risks / TODOs:

Hardcoded queue states → centralize constants.
Next Action: Enforce RLS for reviewer actions; add loading/skeleton.

src/pages/AppraiserDashboard.jsx

Decision: Keep
Health: Green — stable, role-aware list

Role / Purpose:
Filters orders to current appraiser; future: summary stats.

Parents: Role-routed /dashboard.
Children: useOrders, useSession, OrdersTable.

Notes / Risks / TODOs:

Guard undefined user state (already present).
Next Action: Add top-line KPIs (count, upcoming deadlines).

src/pages/UsersDashboard.jsx

Decision: Keep
Health: Green — team overview

Role / Purpose:
Lists teammates; admin/manager sees “Manage Roles”.

Parents: /users.
Children: useRole, supabase.

Notes / Risks / TODOs:

Consider centralizing user queries in API layer.
Next Action: Move data access behind userService.

src/pages/AdminUsers.jsx

Decision: Keep
Health: Green — roles & splits manager

Role / Purpose:
Inline edit for role, fee split, status.

Parents: /admin/users.
Children: supabase, dropdowns.

Notes / Risks / TODOs:

Inline updates may bypass audit logging.
Next Action: Wrap updates in adminUserService + add audit events.

src/pages/UserDetail.jsx

Decision: Keep
Health: Green — admin editor

Role / Purpose:
Edit legal name, email, phone, avatar. Admin-only route.

Parents: /users/:userId.
Children: supabase, Button, toast.

Notes / Risks / TODOs:

Should go through service layer for consistency.
Next Action: Enforce admin gate in router + RLS.

src/pages/EditUser.jsx

Decision: Keep
Health: Green — self-profile

Role / Purpose:
“My profile” editor; display name, avatar, bio, status.

Parents: /profile/edit.
Children: useSession, supabase.

Notes / Risks / TODOs:

Fine to update directly (self scope).
Next Action: Add image upload later; unify validation.

src/pages/Settings.jsx

Decision: Keep
Health: Green — composition page

Role / Purpose:
Hosts Profile, Preferences, Notification settings.

Parents: /settings.
Children: ProfileForm, PreferencesForm, NotificationSettings.

Notes / Risks / TODOs:

Ensure forms wire to API layer.
Next Action: Map each form field to DB updates/services.

src/pages/Login.jsx

Decision: Keep
Health: Green — simple auth UI

Role / Purpose:
Email/password sign-in; redirects if logged in.

Parents: /login.
Children: @supabase/auth-ui-react.

Notes / Risks / TODOs:

Hardcoded logo path.
Next Action: Optional SSO providers later.

src/pages/UserHub.jsx

Decision: Keep
Health: Green — user profile hub

Role / Purpose:
Self/admin profile view; quick edits.

Parents: /users/view/:id.
Children: useSession, supabase.

Notes / Risks / TODOs:

Migrate updates to userService; add audit log.
Next Action: Add “view as” guard rails for admin.

src/layout/Layout.jsx

Decision: Keep
Health: Green — app shell & nav

Role / Purpose:
Header/nav, logout, role-based links; includes NotificationBell and (optional) FloatingActivityLog.

Parents: Routes wrapper.
Children: useSession, NotificationBell, Loaders, supabase.

Notes / Risks / TODOs:

Role logic duplicated; centralize.
Next Action: Align nav visibility with ProtectedRoute; decide fate of FloatingActivityLog.

src/lib/hooks/useRole.js

Decision: Keep
Health: Green — role fetch + self-create minimal user row

Role / Purpose:
Provides role and ensures minimal users row exists.

Parents: ProtectedRoute, Layout, UsersDashboard.
Children: supabase.

Notes / Risks / TODOs:

Confirm auth_id linkage.
Next Action: Add audit logging on auto-create.

src/lib/hooks/useSession.js

Decision: Keep
Health: Green — session wrapper

Role / Purpose:
Exposes user + role flags via internal UserContext.

Parents: Layout, Order hooks, NotificationBell.
Children: internal user context.

Notes / Risks / TODOs:

Add null guards for SSR.
Next Action: Ensure consistent role booleans.

src/lib/hooks/ProtectedRoute.jsx

Decision: Keep
Health: Green — access control

Role / Purpose:
Guards by auth + role; redirects to login/dashboard.

Parents: Router.
Children: useRole, supabase.auth.

Notes / Risks / TODOs:

Returns null while loading.
Next Action: Add loading UI/skeleton state.

src/components/notifications/NotificationBell.jsx

Decision: Keep
Health: Yellow — client-heavy, API gaps

Role / Purpose:
Dropdown with filters, unread badge, DND/Snooze. Expects a full notifications API.

Parents: Layout.
Children: notifications feature layer, useSession.

Notes / Risks / TODOs:

Backend API surface incomplete.
Next Action: Build out notifications/ module (fetch, unreadCount, markRead/All, prefs, snooze).

src/context/NotificationProvider.jsx

Decision: Keep
Health: Green — toast mount + helper

Role / Purpose:
Context for react-hot-toast; notify() helper and <Toaster/>.

Parents: App root.
Children: react-hot-toast.

Notes / Risks / TODOs:

Later: merge with NotificationBell prefs.
Next Action: None for MVP beyond ensuring single mount.

Session Summary — Aug 26–27 (Delta from last audit)
New/Updated files (Decision • Health • Why)

src/lib/utils/rpcFirst.js • Keep • Green — unified RPC-first fallback; stops schema-cache noise.

src/lib/services/ordersService.js • Keep • Green — canonical service (create/update/delete, assign, status/dates, review route, reviewer actions); no embeds; hydrates names client-side.

src/lib/hooks/useOrders.js • Refactor(keep) • Green — pulls via service; client-scopes appraiser views (admin/reviewer see all).

src/pages/OrderDetail.jsx • Keep • Green — new container composing panel + sidebar; role-aware actions.

src/components/orders/OrderDetailPanel.jsx • Keep • Green — normalized labels/dates; admin edit link.

src/components/activity/ActivityLog.jsx • Keep • Green — reusable; realtime; replaces floating panel.

src/components/activity/ActivityNoteForm.jsx • Keep • Green — quick notes; uses rpc_log_note fallback.

src/lib/services/activityService.js • Keep • Green — RPC-first activity list/note; realtime subscription helper.

src/components/ui/FullCalendarWrapper.jsx • Keep • Green — FC v6 (no CSS imports); wrapper events API.

src/lib/services/calendarService.ts + src/lib/hooks/useAdminCalendar.ts • Keep • Green — windowed events via v_admin_calendar + RPC.

src/pages/Calendar.jsx • Keep • Green — appraiser filter added.

src/lib/services/notificationsService.ts • Keep • Green — typed service; prefs fallbacks set user_id; TS shim for rpcFirst.

src/features/notifications/{api.ts,hooks.ts} • Keep • Green — exported surface for bell + settings.

src/components/NotificationBell.jsx • Keep • Green — wired to new hooks; items clickable (guaranteed order_id).

src/components/settings/NotificationPrefsCard.jsx • Keep • Green — DND/Snooze, categories, delivery toggles.

src/lib/bootstrap/ensureNotificationPrefs.js • Keep • Green — creates prefs on sign-in.

src/pages/Settings.jsx • Keep • Green — now just Notifications for MVP (removed legacy “users.preferences”).

src/lib/services/userService.js • Keep • Green — listTeam, listAppraisers, getUserById; safe fallback (no fee_split dependency).

src/lib/services/adminUserService.js • Keep • Green — RPC-first admin updates with audit logs; AdminUsers uses it.

src/lib/services/clientsService.js • Keep • Green — list/get/metrics + create/update/delete (+ fetchClientById alias).

src/pages/Orders.jsx • Keep • Green — appraiser filter; presentational table.

src/components/orders/PresentationalOrdersTable.jsx • Keep • Green — no row-embed fetch; links to detail.

src/components/orders/NewOrderButton.jsx • Keep • Green — admin-only CTA; added to Layout + Orders page.

src/pages/NewOrder.jsx / src/pages/EditOrder.jsx • Keep • Green — wire to OrderForm; delete support in edit.

src/components/orders/OrderForm.jsx • Keep • Green — order-number availability check, normalized patching.

src/layout/Layout.jsx • Keep • Green — removed floating log; added global New-Order; tidy nav.

src/lib/constants/orderStatus.js • Keep • Green — canonical statuses, helpers (normalize/label/isReview).

DB schema / RPC delta

Orders: bigint client_id supported in RPCs; review route JSON; canonical date fields used; unique order_number handled politely in UI.

Users: added fee_split (nullable).

Notifications: notifications + notification_prefs tables; prefs RPCs hardened for missing JWT; create-notification fallback added in client.

Calendar: v_admin_calendar view + rpc_list_admin_events.

Shims (compatibility while migrating): v_orders_list_with_last_activity, team_list_users, clients_metrics.

Activity: activity_log table + RPCs (log event/note, list by order).

Retired / superseded (safe to remove when references are gone)

Legacy row-expander fetch in orders table (replaced by details link).

Floating activity panel in Layout (replaced by ActivityLog in sidebar).

Any direct component calls to Supabase for orders/clients/users should be migrated to services (ongoing).

Known gaps / next actions (prioritized)

RLS hardening: ensure appraisers only fetch their orders server-side; reviewers see only queues; admins full access.

Delete shims after service migration: remove v_orders_list_with_last_activity, clients_metrics, team_list_users when no longer referenced.

Notifications: move fan-out to DB (rpc_create_notifications_for_order_event) and finalize categories.

Clients dashboard: keep v_client_metrics as the single source; remove client-side aggregation.

Error UX: add error boundaries & skeletons to Dashboard/Orders/Detail.

Consolidate activity UIs (OrderActivityPanel → ActivityLog everywhere).

Status constants: confirm 1:1 usage across services, UI, and DB checks.

This update follows the WORKFILE’s per-file audit style and should be treated as the latest narrative SSOT snapshot.