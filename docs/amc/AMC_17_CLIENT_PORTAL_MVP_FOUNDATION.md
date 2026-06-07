# AMC-17 Client Portal MVP Foundation

Run date: 2026-06-07.

## Decision

AMC-17 starts with a first-class Client Portal foundation for the controlled pilot.

The first slice created the route shell, client workspace guard, client-safe API seam, and
read-only dashboard/order tracking UI for the Client Portal MVP.

The second slice adds the backend-safe read model for client portal dashboard, order list, and order
detail. It does not create client invitation/token onboarding, public token flows, order intake
mutation, document release authorization, or report-download signing.

## Current Client Model Findings

Existing client-related surfaces are operational/admin-facing:

- `clients` records are company-owned operational records.
- Current client management RPCs use current-company membership and permissions such as
  `clients.read.all`, `clients.read.assigned`, `clients.create`, and `clients.update.*`.
- Existing Clients pages are Internal/AMC operational surfaces and can expose management context
  that is not appropriate for lender users.
- Existing order reads are operational order reads, not client-safe portal projections.
- Client portal permission concepts were present in doctrine and route diagnostics before AMC-17,
  but active permission constants and backend permission seeds were missing.
- No durable client-user-to-client-account mapping table was found before AMC-17.
- No app-readable client portal order/status/report RPC was found before AMC-17.
- No client user invite/token acceptance flow dedicated to Client Portal was found.

## Architecture Added

Client Portal routes:

```text
/client-portal
/client-portal/orders
/client-portal/orders/:orderId
/client-portal/new-order
```

Route ownership:

- Client Portal uses its own `ClientPortalRouteGuard`.
- Client Portal is outside the Internal/AMC `Layout`.
- Client Portal does not mount operational TopNav, sidebar, command palette, admin, vendor, bid,
  assignment, procurement, or permission surfaces.
- `workspaceRouteOwnership` now treats `client` as a distinct route workspace with
  `/client-portal` as its fallback target.

Permission keys added to frontend constants:

```text
client_portal.dashboard.view
client_portal.orders.read
client_portal.orders.create
client_portal.reports.read
```

These keys now exist in frontend constants and the backend permission seed migration. Role/template
assignment is still required before production client users can use the portal.

## Client-Safe Data Seam

The API seam is intentionally dedicated to portal projections:

```text
getClientPortalDashboard()
  -> rpc_client_portal_dashboard()

listClientPortalOrders()
  -> rpc_client_portal_orders()

getClientPortalOrderDetail(orderKey)
  -> rpc_client_portal_order_detail(p_order_key)
```

The seam requires an opaque `order_key` for detail routing and normalizes only client-safe fields:

- order number;
- status label;
- property/address;
- important dates;
- report availability;
- optional report file/download metadata when a future safe backend supplies it.

It does not import or fall back to shared Internal/AMC order, client, vendor, bid, assignment, or
procurement APIs.

## Backend Read Model

Added in `20260607100000_client_portal_safe_order_read_model.sql`:

- `client_portal_members`;
- `current_app_user_client_portal_client_ids()`;
- `current_app_user_can_read_client_portal()`;
- `client_portal_order_key(...)`;
- `v_client_portal_order_status`;
- `rpc_client_portal_dashboard()`;
- `rpc_client_portal_orders()`;
- `rpc_client_portal_order_detail(p_order_key text)`.

The read model is current-company scoped and requires:

- authenticated app user;
- active current-company membership;
- client portal permission;
- active `client_portal_members` mapping between the app user and client account;
- orders linked to the mapped `client_id`;
- non-archived orders.

The detail route uses opaque `order_key` values generated from order, company, and client scope.
The RPC payload does not return raw order ids.

## Fields Exposed

Client Portal order payloads may expose:

- opaque order key;
- display order number;
- order/report type;
- high-level status and status label;
- safe property address/city/state/postal summary;
- ordered/requested date;
- inspection date when present;
- expected delivery/client due date;
- completed date when present;
- report availability;
- report ready/delivered timestamps;
- report file name metadata;
- client-facing milestones.

## Fields Hidden

The client-safe read model intentionally does not expose:

- vendor bidding/procurement;
- vendor company or identity;
- internal appraiser assignment IDs;
- reviewer IDs or review route details;
- coordinator/internal/private notes;
- activity/audit chatter;
- client invoice amount, appraiser fee, base fee, split percentage, AMC margin, payment status, or
  vendor invoice/payment details;
- raw storage bucket/path;
- signed report download URLs.

## UI Added

Read-only now:

- Client Portal shell;
- Client Portal dashboard;
- client-scoped order list;
- client-safe order detail;
- report availability/download placeholder;
- non-mutating new-order placeholder.

The UI intentionally avoids:

- vendor bidding;
- internal assignment details;
- appraiser/vendor private notes;
- internal review chatter;
- procurement details;
- permission/admin surfaces;
- client fee, AMC margin, and internal financial context.

## Wired vs Placeholder

Wired in this slice:

- route shell and client workspace guard;
- read-only portal pages;
- dedicated frontend API seam;
- frontend and backend client portal permission constants/seeds;
- `client_portal_members` mapping table;
- dedicated client-safe dashboard/list/detail RPCs;
- tests proving route guard behavior, API seam shape, and UI leakage boundaries.

Placeholder/deferred:

- client portal role templates and production role assignment;
- client invite/token onboarding;
- new-order intake mutation;
- upload/document request flow;
- final report signed download authorization;
- public/token order status links;
- client portal activity/messages.

## Security Boundary

Client Portal MVP foundation is fail-closed:

- unauthenticated users go to login;
- users without client portal permission see `Client Portal unavailable`;
- Internal/AMC operational users do not get portal access unless they also receive explicit client
  portal permission;
- client routes do not render internal operational shell chrome;
- page models do not expose internal/vendor/procurement fields.

Backend client/account scoping now exists for read-only dashboard/list/detail through
`client_portal_members`. Client invite/token onboarding is still required before live client users
are enabled.

## Validation Target

Required validation for the foundation:

- client portal API tests;
- client portal migration/static DB tests;
- client portal page rendering/leakage tests;
- client route guard tests;
- existing workspace route guard tests;
- existing Internal/AMC route guard tests;
- `npm run build`;
- `npm run lint`;
- `git diff --check`.
