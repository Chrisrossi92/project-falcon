# Falcon — MVP Goals

## Auth & Roles
- Email/password login (Supabase)
- Roles: admin, reviewer, appraiser
- Protected routes aligned with RLS

## Orders
- Create/edit/delete, assign appraiser & reviewer
- Status updates via RPC (single source)
- Key dates: site_visit_at, review_due_at, final_due_at
- Order detail drawer + activity

## Dashboards
- Admin: calendar + orders table
- Reviewer: queues (in_review, ready_to_send, revisions)
- Appraiser: my orders, upcoming deadlines

## Calendar
- Source: `v_admin_calendar` + `rpc_list_admin_events`
- Filter by appraiser (optional)

## Notifications
- In-app dropdown with unread badge
- Mark read/all, DND/Snooze, prefs table
- Click-through to order

## Data layer (Principles)
- RPC-first; fallbacks logged
- Services layer (no component table writes)
- Status constants centralized

## Compliance & UX
- RLS enforced for all list/detail endpoints
- Basic tests + lint pass
- Error boundaries + loading states on core pages
