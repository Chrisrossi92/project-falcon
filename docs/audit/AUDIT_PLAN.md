# Project Falcon — Full Codebase Audit Plan

This plan turns the repo into a *single source of truth (SSOT)* with a rigorous, file-by-file audit.

## Objectives
1. **Necessity** — Decide whether each file is required for the MVP (keep / refactor / retire).
2. **Health** — Note whether it appears to work as expected (green/yellow/red).
3. **Context** — Record an exact path, purpose, and parent/child relationships.
4. **Traceability** — Link usage with lightweight import/dependency mapping.
5. **Actionability** — Capture a concrete next step per file.

## Outputs
- `WORKFILE.md` — the living narrative (long-form notes per file).
- `FILE_AUDIT_TEMPLATE.md` — copy/paste template for each file’s entry.
- `file_inventory.csv` — raw file list.
- `imports_map.csv` — import statements (all) for quick lookups.
- `local_edges.csv` — local dependency edges (relative imports only).

## Workflow (RLS‑first, RPC‑only writes, small PRs)
1. **Audit Order (top‑down):**
   - Entrypoints & app shell: `index.html`, `main.tsx/jsx`, `App.(t|j)sx`.
   - Routing: pages/router config.
   - Core state & data: `lib/`, `hooks/`, `store/`, Supabase client, RPC calls.
   - Primary features (Orders, Users, Dashboards, Calendar, Notifications).
   - Shared UI/components.
   - Utilities and types.
   - Config, env, and scripts.
2. **Per File:**
   - Create a new section in `WORKFILE.md` using `FILE_AUDIT_TEMPLATE.md`.
   - Decide: **Keep / Refactor / Retire / Unknown**.
   - Mark health: **Green / Yellow / Red** with a one‑line reason.
   - Describe purpose, parents (who imports it), children (what it imports).
   - Link related tickets or TODOs.
3. **Daily Audit Loop:**
   - Process ≤10 files per batch (your preference).
   - Land changes as **small PRs** using Conventional Commits.
   - Update SSOT immediately after each batch.
4. **Retirement Strategy:**
   - If `Retire`, search inbound imports to avoid breakage.
   - Replace with stubs where needed; remove dead routes/exports.
5. **Verification:**
   - For high‑risk files, add/restore quick smoke tests where feasible.
   - Keep a running “Unknowns” list to resolve.

## Suggested Conventional Commits
- `chore(audit): catalog <path>`
- `refactor(component): simplify <name>`
- `feat(orders): replace legacy <x> with <y>`
- `fix(supabase): correct RPC call for <x>`
- `docs(audit): update SSOT for <file>`

## Proposed First Batches
We’ll start with the true entrypoints and router, then branch out:

**Batch 1 — Entrypoints**
- (auto-detected) Main app mount (e.g., `src/main.tsx` or `src/main.jsx`)
- App wrapper `src/App.tsx|jsx`
- Root HTML `index.html`
- Global styles `src/index.css`, `src/styles/*`

**Batch 2 — Routing & Layout**
- Router config (e.g., `src/router.tsx`, `src/routes/*`, or `src/AppRoutes.tsx`)
- Layout shells (e.g., `src/layouts/*`, `src/components/layout/*`)

**Batch 3 — Data Layer**
- `src/lib/supabaseClient.*`
- `src/lib/api/*` and RPC bindings
- `src/lib/hooks/*`

**Batch 4 — Core Feature: Orders**
- `src/components/orders/*`
- `src/pages/orders/*`

**Batch 5 — Core Feature: Users/Admin**
- Dashboards: Admin/Appraiser/Reviewer
- `src/components/users/*`, `src/pages/admin/*`

We’ll refine batches once we confirm exact paths below.

Session Log — MVP Execution (Aug 26–27)

This session advanced several roadmap items while staying aligned with the SSOT/audit workflow (batches, small PRs, RPC-first, RLS-first). Key areas touched map to Batch 3 (Data Layer), Batch 4 (Orders), Batch 5 (Users/Admin), Calendar, and Notifications, per the plan’s structure and outputs.

Data layer & RPC (RPC-first, fallbacks)

Added robust rpcFirst helper (handles “function not found / schema cache” and falls back cleanly).

Created/updated RPCs: rpc_update_order_status, rpc_update_order_dates, rpc_assign_reviewer, rpc_assign_appraiser, rpc_create_order (bigint client_id), rpc_update_order (bigint client_id), rpc_delete_order.

Stubs to quiet legacy calls while we migrate:
team_list_users, clients_metrics (+ v_client_metrics), v_orders_list_with_last_activity.
(Goal: unblock UI while we finish service migration; these can be retired later.)

Orders feature

Consolidated orders service (create/update/delete, assign appraiser/reviewer, status/dates, review route, review actions; RPC-first with fallbacks).

Removed ambiguous PostgREST embeds (multiple FKs to clients); now hydrate names via batched lookups.

OrderForm: added order-number availability check + friendly unique-constraint error.

Orders list: simplified presentational table; use “Details” link instead of row-embed fetches.

OrderDetail page: new container using panel + sidebar; pretty status labels; canonical date fields.

Calendar

New windowed pipeline: v_admin_calendar (site_visit / review_due / final_due) + rpc_list_admin_events, service + hook, and FullCalendarWrapper.

Added optional Appraiser filter to calendar.

Notifications

Built notifications service + hooks (fetch, unreadCount, mark read/all, prefs incl. DND/Snooze); created notification_prefs table + RPCs.

Hardened RPCs to accept explicit user ID when called from SQL (no JWT).

NotificationBell updated to new API; fallbacks ensure order_id is always present so items are clickable.

App bootstrapper ensures a prefs row exists on sign-in.

Users/Admin

Added adminUserService (roles / fee split / status / email) and rewired AdminUsers to it.

Added userService (team list, appraisers). Introduced users.fee_split column (nullable) to support Admin UI.

Routing & Guard

Centralized ProtectedRoute with loading UI and roles alias (back-compat).

Cleaned routes; Layout now uses NotificationBell and a global New Order button (admin only).

Activity

New activityService + reusable ActivityLog and ActivityNoteForm; sidebar uses these.

Layout: removed floating activity panel (kept activity scoped to orders).

Shims & compatibility

Short-term shims to keep legacy code quiet while we migrate fully to services (listed above). These are tracked for retirement.

What’s next (high-leverage)

Tighten client-side scoping with RLS (appraisers only see their orders; reviewers their queues).

Replace remaining legacy queries/views with service calls; delete shims.

Notifications: move more fan-out into DB functions; finalize categories and email policy.

Clients: finish server-side metrics view; remove client-side aggregation on large lists.

Test path: create → assign → set dates → review → send → complete (smoke run + seed data).

Polish: error boundaries, skeletons; unify status constants everywhere; prune dead routes.

This log complements the plan’s Batches/Workflow/Outputs and should be used to guide the next small PRs.
