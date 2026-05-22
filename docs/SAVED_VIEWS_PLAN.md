# Saved Views Plan

## Purpose

Falcon should let users quickly return to common operational queues without changing the governed
Orders read model. Saved views are read-only navigation presets over existing Orders URL/query
state. They reduce repetitive filtering and navigation, improve day-to-day operational workflow
efficiency, and preserve current filter, permission, RLS, and active-list behavior.

This document records the Saved Views foundation plan, implementation boundaries, and closeout
guardrails. It should be updated before future saved-view expansion so new behavior stays tied to
the governed Orders URL/query model.

Related doctrine:

- `docs/OPERATIONS_FILTERING_AUDIT.md`
- `docs/OPERATIONAL_GOVERNANCE_SNAPSHOT.md`
- `docs/CRUD_STABILIZATION_MATRIX.md`
- `docs/NEXT_PHASE_EXECUTION_PLAN.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

## Goals

- Allow users to quickly return to common active operational queues.
- Reduce repetitive Orders filtering and navigation.
- Improve manager, appraiser, reviewer, and coordinator workflow efficiency.
- Keep existing governed Orders filters and URL/query state authoritative.
- Avoid hidden filters, permission bypasses, backend query injection, or mutation behavior.

## Likely Saved State Scope

Saved views should store an allowlisted filter state, not arbitrary predicates or backend query
fragments.

| Field | Initial Direction |
|---|---|
| `status` | Save existing active Orders status values only. |
| `due` | Save existing governed due values, with `overdue` as the safest initial value; `this_week` and `next_week` remain transitional until predicate support is reconciled. |
| `q` / search | Save the visible search term as URL/query state. |
| `appraiserId` | Save existing appraiser filter state. |
| `reviewerId` | Save existing reviewer filter state. |
| `queue` | Save only as a clearly labeled derived operational queue over governed active rows. |
| `page` | Do not treat page as semantic view state; applying a saved view should reset to the default first page. |
| `pageSize` | Preserve the user's existing page-size behavior unless product deliberately decides page size is part of a saved view. |
| Historical/admin flags | Deferred. Do not include archived, cancelled, voided, or other historical/admin opt-in flags in the first active saved views. |

`clientId` is already part of the governed active Orders filter model, but it is not required for
the first saved operational queue scope unless product explicitly wants client-specific saved
views. If included later, it should follow the same allowlist and URL/query canonicalization rules.

## Governance Rules

- Saved views are read-only navigation presets only.
- Applying a saved view updates Orders URL/query state and then uses the existing governed Orders
  read path.
- Saved views do not bypass permissions, RLS, current company scope, active-list exclusions, or
  backend authorization.
- Saved views must use existing governed Orders filters only.
- URL/query state remains canonical; saved views should not create a second hidden filter source.
- No hidden filters are allowed. After applying a saved view, active filter chips should explain
  the resulting state.
- No mutation behavior, workflow behavior, lifecycle behavior, assignment mutation, notification
  fanout, activity write, or backend query injection may be introduced by saved views.
- No arbitrary SQL, query fragments, raw filter expressions, or backend predicates should be stored.
- Historical/admin flags remain out of initial active saved views until a separate historical/admin
  preset design explicitly approves them.

## Likely UX

- Add a lightweight `Saved Views` dropdown or compact rail on the active Orders page.
- Allow `Save current view` from the current URL/query-backed filter state.
- Apply a saved view by replacing the supported Orders query parameters.
- Allow rename and delete for personal saved views.
- Keep active filter chips visible after a saved view is applied.
- Reset page position when a saved view is applied; preserve page-size behavior unless explicitly
  productized as saved state.
- Consider an optional personal default saved view later, after basic save/apply/delete behavior is
  stable.

## Persistence Audit

Slice 1B reviewed existing persistence patterns before implementation. The active app has only a
very small local persistence pattern: `Settings.jsx` stores the theme in `localStorage` under
`falcon.theme`. No active saved queue, saved filter, or operational view local persistence pattern
was found.

Existing user preference/profile persistence is mostly backend-owned:

- current user settings use `getCurrentUserSettings(...)` and `updateCurrentUserSettings(...)`
  through `rpc_current_user_settings_get` and `rpc_current_user_settings_update`;
- the current-user settings RPCs update only allowlisted profile/display fields on the current app
  user and reject broad profile authority changes;
- notification preferences use `rpc_notification_prefs_ensure`, `rpc_notification_prefs_get`, and
  `rpc_notification_prefs_update`;
- `notification_prefs.categories` is an existing user-scoped JSON preference field, but it is
  notification-domain state and should not become a generic saved-view container;
- company and relationship settings JSON fields exist for company/relationship configuration, but
  they are not appropriate for personal operational queue presets.

The safest existing pattern to copy for production saved views is a narrow user-scoped backend
contract: explicit storage, current-user/company scope, allowlisted payload keys, and RPC/API
wrappers. Broad profile JSON, notification preference JSON, company settings JSON, and direct
Orders query persistence are not good fits.

## Persistence Options

| Criterion | Local-only saved views | Backend user-scoped saved views |
|---|---|---|
| Governance consistency | Weak-to-moderate. Can be allowlisted in frontend code, but lacks backend validation and can drift per browser. | Strong. Can mirror current governed RPC patterns with backend allowlists, RLS/current-user checks, and company scope. |
| Multi-device usability | Weak. Views are browser/device scoped and disappear with storage clearing. | Strong. Views follow the user across devices and sessions. |
| Implementation complexity | Low for a prototype. Requires no schema/RPC, but still needs careful keying and validation. | Moderate. Requires schema/RLS/RPC/API design, tests, and source-scan review. |
| Migration risk | Low initially, but creates future migration/merge complexity if users depend on local saved views. | Moderate upfront, lower long-term because the persistence model is explicit from the start. |
| Company scoping | Fragile. Must encode user/company context into storage keys and handle company switching carefully. | Strong. Rows can include `user_id` and `company_id` with backend enforcement. |
| Future shared/admin views | Poor foundation. Local-only state does not naturally evolve into team/admin presets. | Good foundation. User rows can later coexist with team/admin/global scopes after separate design. |
| Production-readiness | Limited. Acceptable only for throwaway prototype or clearly non-portable personal convenience. | Preferred. Fits Falcon's current RPC-first governance direction. |

## Saved Payload Constraints

Saved view payloads should be small, versioned, and allowlisted. They may contain only governed
Orders filter values approved for active operational views:

- `status`;
- `due`, initially safest with `overdue`;
- `q`;
- `appraiserId`;
- `reviewerId`;
- derived `queue`, clearly labeled as frontend-derived operational queue state;
- `clientId` only if a later product slice explicitly includes client-specific saved views.

Saved view payloads must not include:

- hidden/internal flags;
- historical/admin flags such as archived/cancelled/voided readback opt-ins;
- raw SQL, query fragments, arbitrary predicates, or backend filter expressions;
- mutation state, selected rows, pending actions, workflow/lifecycle/assignment commands, or
  notification state;
- storage paths, signed URLs, activity payload dumps, or other unrelated domain data.

## First MVP Recommendation

The first production MVP should use backend user-scoped saved views, not local-only saved views.
Local persistence remains acceptable only for a throwaway prototype or temporary spike, because it
is not multi-device, is fragile under company switching, and is a poor foundation for future
team/admin presets.

The recommended backend MVP should be deliberately narrow:

- one user/company-scoped saved-view table or equivalent narrow storage contract;
- RPC/API wrappers for list/create/update/delete;
- backend validation of allowed filter keys and value shapes;
- no direct frontend table writes;
- no shared/team/global scopes;
- no historical/admin flags;
- no filter redesign;
- applying a saved view still only updates URL/query state and uses the existing Orders read path.

The MVP should not include shared team views, admin/global presets, dashboard-managed presets,
historical/admin saved views, pinned queues, alerts, subscriptions, or filter redesign.

## Backend Schema/RPC Proposal

Slice 1C proposes a concrete backend contract for the first production implementation. This is a
design proposal only; no migration, RLS policy, RPC, API wrapper, route, or UI behavior is added by
this document.

### Proposed Table

The proposed table is `public.order_saved_views`.

| Column | Direction |
|---|---|
| `id uuid primary key` | Server-generated saved view identifier. |
| `company_id uuid not null` | Current company scope for the saved view. |
| `user_id uuid not null` | Current app user owner for the saved view. |
| `name text not null` | User-facing saved view name, trimmed and length-limited by backend validation. |
| `filters jsonb not null` | Allowlisted Orders filter object only. |
| `sort_order integer` | Optional user-controlled ordering for future display; may default to creation order. |
| `is_default boolean default false` | Reserved for a later personal default behavior unless the first migration can enforce a simple one-default-per-user/company constraint cleanly. |
| `created_at timestamptz` | Server timestamp. |
| `updated_at timestamptz` | Server timestamp, updated on backend-owned mutations. |

Recommended initial constraints and indexes:

- primary key on `id`;
- foreign key or equivalent validated reference to the app user identity used by `current_app_user_id()`;
- foreign key to `companies` if aligned with current company scope conventions;
- index on `(company_id, user_id, sort_order, created_at)`;
- optional uniqueness on `(company_id, user_id, lower(name))` only if product wants names unique per user/company;
- if `is_default` is active in the first backend slice, enforce at most one default per
  `(company_id, user_id)` with a partial unique index where `is_default = true`.

### Strict Filter Allowlist

Backend validation should accept only these top-level filter keys:

- `status`;
- `q`;
- `clientId`;
- `appraiserId`;
- `reviewerId`;
- `due`;
- `queue`;
- `pageSize`, only if product decides page size is part of saved presentation state.

Backend validation should reject:

- `page`, because applying a saved view should reset to the first page;
- historical/admin flags, including archived/cancelled/voided readback opt-ins;
- hidden/internal filters such as `assignedAppraiserId`, `inspectedAwaitingReport`,
  `finalDueWithinDays`, `from`, `to`, `mode`, `scope`, `rowsOverride`, or similar internal helper
  state;
- `priority` until it becomes a governed active Orders filter;
- raw SQL, query fragments, arbitrary predicates, backend expressions, sort clauses, or table names;
- selected row ids, pending mutations, workflow/lifecycle/assignment commands, notification state,
  activity payloads, storage paths, signed URLs, or document content.

The backend should also validate value shapes:

- text values should be trimmed and length-limited;
- ids should be UUID strings where relevant;
- enum-like values such as `status`, `due`, and `queue` should be checked against current governed
  active Orders values;
- empty/null values should be stripped or rejected consistently so saved payloads remain compact
  and predictable.

### Proposed RPCs

Initial RPC surface:

- `rpc_order_saved_views_list()`
  - returns the current user's saved views for the current company, ordered by `sort_order`,
    `created_at`, and/or `name`;
  - does not accept arbitrary filters because company/user scope comes from backend context.
- `rpc_order_saved_view_create(p_name text, p_filters jsonb)`
  - trims and validates `p_name`;
  - validates `p_filters` against the strict allowlist;
  - inserts only for the current app user and current company.
- `rpc_order_saved_view_update(p_view_id uuid, p_name text, p_filters jsonb)`
  - requires the row to belong to the current app user and current company;
  - updates only the name and/or filters;
  - refreshes `updated_at`.
- `rpc_order_saved_view_delete(p_view_id uuid)`
  - requires the row to belong to the current app user and current company;
  - deletes only that saved view row.

Optional later RPC:

- `rpc_order_saved_view_set_default(p_view_id uuid)`
  - deferred unless the first backend slice also implements clean one-default-per-user/company
    enforcement;
  - should be user/company scoped and should not apply the saved view automatically.

### Backend Validation Requirements

Every saved-view RPC should require:

- authenticated caller;
- resolvable `current_app_user_id()`;
- current company context;
- active company membership;
- saved view ownership by current `user_id` and `company_id` for update/delete;
- filters matching the strict allowlist only;
- no hidden/internal flags;
- no historical/admin flags initially;
- no raw SQL, query fragments, arbitrary predicates, table names, sort expressions, or backend
  query injection;
- no mutation state, selected rows, pending action state, workflow/lifecycle/assignment commands,
  activity payloads, notification payloads, storage paths, or signed URLs.

### RLS / Security Direction

- Browser UI should not receive direct table write access to `order_saved_views`.
- Normal frontend access should go through RPC/API wrappers only.
- RLS should remain enabled on the table.
- Direct table grants should be avoided for `authenticated` unless a future implementation proves
  they are necessary and source-scan guarded.
- RPCs should be security-definer only if needed, with a narrow `search_path`, explicit
  current-user/current-company checks, and allowlisted payload handling.
- Service-role access remains a deployment/admin concern and should not define browser behavior.
- Saved views do not authorize Orders reads. Applying a saved view still uses the existing Orders
  read path, permissions, RLS, and active-list exclusions.

## Backend Schema/RPC Foundation

Slice 1D implements the backend-only saved views foundation in
`supabase/migrations/20260522090000_order_saved_views.sql`. No frontend UI, frontend API wrapper,
Orders filter change, saved-view application behavior, or order mutation behavior is added.

The migration adds `public.order_saved_views` with:

- `id uuid primary key default gen_random_uuid()`;
- `company_id uuid not null`;
- `user_id uuid not null`;
- `name text not null`;
- `filters jsonb not null`;
- `sort_order integer`;
- `is_default boolean not null default false`;
- `created_at timestamptz not null default now()`;
- `updated_at timestamptz not null default now()`.

The table has RLS enabled, direct `public` / `anon` / `authenticated` table access revoked, and
service-role table access preserved for deployment/operator paths. Normal browser access is
RPC-owned only.

The backend validation helper `order_saved_view_validate_filters(p_filters jsonb)` requires a JSON
object and accepts only `status`, `q`, `clientId`, `appraiserId`, `reviewerId`, `due`, `queue`, and
`pageSize`. It rejects `page`, historical/admin readback flags, hidden/internal filter keys,
`priority` until it becomes a governed active Orders filter, unknown keys, non-object filters, raw
query/predicate-shaped payloads by omission, and mutation/action state by omission. The helper also
normalizes and validates scalar value shapes for status, search, ids, due windows, queue ids, and
page size.

The backend RPC foundation is:

- `rpc_order_saved_views_list()`;
- `rpc_order_saved_view_create(p_name text, p_filters jsonb)`;
- `rpc_order_saved_view_update(p_view_id uuid, p_name text, p_filters jsonb)`;
- `rpc_order_saved_view_delete(p_view_id uuid)`.

Each RPC requires an authenticated caller, a resolvable current app user, current company context,
active current-company membership, and user/company row ownership for update/delete. The RPCs
return only saved-view metadata plus the validated allowlisted `filters` object. They do not read
or mutate orders, apply filters, change URL/query state, create activity, emit notifications, or
create any saved-view UI reachability.

## Frontend API Wrapper Foundation

Slice 1E adds isolated frontend API wrappers in `src/lib/api/orderSavedViews.js` without UI
reachability. The wrappers are:

- `listOrderSavedViews()`;
- `createOrderSavedView(name, filters)`;
- `updateOrderSavedView(viewId, name, filters)`;
- `deleteOrderSavedView(viewId)`.

Each wrapper calls only the corresponding saved-view RPC:

- `rpc_order_saved_views_list`;
- `rpc_order_saved_view_create`;
- `rpc_order_saved_view_update`;
- `rpc_order_saved_view_delete`.

The wrappers do not call `supabase.from("order_saved_views")`, do not use `localStorage` or
`sessionStorage`, do not apply saved views to the Orders URL/query state, and do not mutate order
data. Frontend validation is limited to rejecting non-object filter payloads before create/update;
the backend remains authoritative for filter allowlists, value validation, company scope, and saved
view ownership.

The CRUD source scan now blocks direct frontend `order_saved_views` table access so new active code
must use the RPC wrapper path.

## First Orders UI Design

Slice 1F plans the first minimal Orders-page Saved Views UI before implementation. This section is
design-only and does not add runtime behavior, UI code, route changes, backend changes, filter
changes, or saved-view application behavior.

### MVP UI Behavior

The first UI should support only the smallest useful personal saved-view workflow:

- list the current user's saved views for the current company;
- apply a saved view to the Orders URL/query state;
- save the current Orders filter state as a named saved view;
- delete a saved view;
- show clear loading, empty, and backend-rejection states;
- defer update/rename unless the first component can support it with minimal extra surface area;
- defer personal default saved view behavior.

Applying a saved view should replace only supported saved filter query parameters, reset `page`, and
then let the existing Orders page read path load data from canonical URL/query state. It should not
store active filters in hidden component state or apply filters directly to loaded rows outside the
existing Orders filter chain.

### Placement

The first UI should live in the Orders page filter/header area, near the active filter chips and
filter controls. It should be visually secondary to primary order actions such as creating an order
or interacting with the active operational queue.

Preferred first presentation:

- compact `Saved Views` dropdown or small panel;
- saved view rows with a simple apply action;
- a `Save current view` command inside the same surface;
- delete available from a secondary row action or confirmation affordance;
- no dashboard placement, dashboard widget, primary navigation entry, command palette entry, or
  pinned queue behavior in the first implementation.

The UI should not read as a new queue authority. It is a convenience control over the existing
Orders URL state.

### Saveable Filters

The UI should save only the same governed active Orders filters accepted by the backend contract:

- `status`;
- `q`;
- `clientId`;
- `appraiserId`;
- `reviewerId`;
- `due`;
- `queue`;
- `pageSize`, if product keeps it approved as saved presentation state.

The UI must exclude:

- `page`, because applying a saved view should reset to the first page;
- archived/cancelled/voided or other historical/admin readback flags;
- hidden/internal filters such as `assignedAppraiserId`, `inspectedAwaitingReport`,
  `finalDueWithinDays`, `from`, `to`, `mode`, `scope`, or `rowsOverride`;
- `priority` until it becomes a governed active Orders filter;
- selected rows, pending actions, workflow/lifecycle/assignment commands, notification state, or
  mutation state.

### UX Guardrails

- Saved views remain read-only navigation presets.
- Saved views must not mutate orders, workflow status, lifecycle state, assignments, documents,
  activity, notifications, permissions, or company context.
- Saved views must not introduce hidden filters. After applying a saved view, the resulting active
  filter chips and URL/query state should explain the active filter state.
- Saved views must apply through Orders URL/query state, not direct table queries or hidden local
  row filtering.
- The existing Orders read path, permissions, RLS, current-company scope, and active-list
  exclusions remain authoritative.
- Backend validation remains authoritative for payload allowlists and row ownership.
- If the backend rejects a saved filter payload during save, the UI should show a clear non-blocking
  error and leave the current Orders filters unchanged.
- If applying a saved view contains a filter the current frontend does not understand, the UI should
  avoid silently applying partial hidden behavior; the safest initial behavior is to surface an
  error and leave URL/query state unchanged.

### First Implementation Recommendation

The first implementation should be a lightweight Orders-page component that uses only
`src/lib/api/orderSavedViews.js` wrappers:

- `listOrderSavedViews()`;
- `createOrderSavedView(name, filters)`;
- `deleteOrderSavedView(viewId)`;
- `updateOrderSavedView(...)` only if rename/update is included without expanding the MVP.

Recommended implementation boundaries:

- derive the current save payload from the existing Orders URL/filter state;
- apply saved views by writing the approved query parameters through the existing Orders URL update
  path;
- keep `pageSize` behavior explicit and tested if included;
- add focused tests for list, apply, save, delete, backend error display, and absence of order
  mutation controls;
- add no sharing/team views, admin/global presets, dashboard-linked views, historical/admin
  presets, pinned queues, alerting, subscriptions, or command palette integration.

## First Orders UI Foundation

Slice 1G implements the first minimal Orders-page Saved Views UI. The implementation is intentionally
small and read-only with respect to order data.

Current behavior:

- the Orders page header exposes a compact secondary `Saved Views` control;
- saved views load through `listOrderSavedViews()`;
- selecting a saved view applies only allowlisted saved filters by writing the normal Orders
  URL/query state through the existing Orders filter path;
- saving the current view calls `createOrderSavedView(name, filters)` with an allowlisted payload
  derived from current Orders filter state;
- deleting a saved view calls `deleteOrderSavedView(viewId)`;
- backend validation errors are surfaced in the panel without changing current Orders filters.

The save payload includes only:

- `status`;
- `q`;
- `clientId`;
- `appraiserId`;
- `reviewerId`;
- `due`;
- `queue`;
- `pageSize`.

The implementation deliberately excludes:

- `page`;
- `priority`, until it becomes a governed active Orders filter;
- hidden/internal filters;
- historical/admin flags;
- selected rows, pending actions, workflow/lifecycle/assignment commands, notification state, and
  mutation state.

Applying a saved view rejects unsupported returned filter keys rather than silently applying partial
hidden state. The existing active filter chips remain the visible explanation of the resulting
Orders URL/query state.

Slice 1G adds no backend changes, no direct table access, no `localStorage` fallback, no Orders
filter redesign, no order mutation behavior, no rename/edit behavior, no default saved view, no
team/shared views, no dashboard-linked views, no historical/admin presets, no activity writes, and
no notification fanout.

## Foundation Closeout

Saved Views Slices 1A through 1H complete the first governed Saved Views foundation.

The completed foundation includes:

- backend user/company-scoped persistence in `public.order_saved_views`;
- RLS-enabled table storage with normal browser access owned by RPCs;
- RPC-owned saved view CRUD through `rpc_order_saved_views_list()`,
  `rpc_order_saved_view_create(p_name text, p_filters jsonb)`,
  `rpc_order_saved_view_update(p_view_id uuid, p_name text, p_filters jsonb)`, and
  `rpc_order_saved_view_delete(p_view_id uuid)`;
- strict backend filter allowlist validation for `status`, `q`, `clientId`, `appraiserId`,
  `reviewerId`, `due`, `queue`, and `pageSize`;
- backend rejection of `page`, historical/admin flags, hidden/internal filters, unknown keys,
  non-object filters, raw query fragments by omission, and mutation/action state by omission;
- frontend RPC wrappers in `src/lib/api/orderSavedViews.js`;
- source-scan blocking for direct frontend `order_saved_views` table access;
- compact Orders-page `Saved Views` UI;
- list, apply, save, and delete behavior;
- saved-view application through Orders URL/query state only;
- unsupported returned saved-view filter keys rejected without changing the current Orders filters;
- no `localStorage` or `sessionStorage` saved-view fallback;
- no hidden filters;
- no historical/admin presets.

Locked guardrails:

- saved views are read-only navigation presets;
- saved views do not authorize Orders reads and do not bypass RLS, permissions, current company
  scope, active-list exclusions, or backend authorization;
- URL/query state remains canonical for active Orders filters;
- backend validation remains authoritative for filter allowlists, value shapes, current user,
  current company, active membership, and saved-view ownership;
- frontend code may derive and apply saved-view filters only through the governed Orders URL/filter
  path;
- saved views must not mutate orders, workflow status, lifecycle state, assignments, documents,
  activity, notifications, permissions, or company context;
- saved views must not introduce hidden filters, backend query injection, raw SQL fragments,
  arbitrary predicates, selected-row state, or pending action state.

Deferred future work:

- rename/edit saved view;
- personal default saved view;
- team/shared views;
- admin/global presets;
- historical/admin saved views;
- dashboard-linked saved views;
- saved view ordering and pinning;
- richer saved-view labels or previews;
- command palette integration only after a separate design slice.

## Deferred Work

- Rename/edit view.
- Default saved view.
- Shared team views.
- Admin/global views.
- Dashboard-linked views.
- Historical/admin presets.
- Saved view ordering/pinning.
- Alerting/subscriptions.
- Saved-view analytics or usage reporting, only if a future product slice needs it.

## Non-Goals

- No order mutation behavior.
- No filter redesign.
- No hidden filters.
- No saved-view sharing without a separate design and authorization slice.
- No backend query language.
- No permission changes.
