# AMC-17 Client Portal MVP Foundation

Run date: 2026-06-07.

## Decision

AMC-17 starts with a first-class Client Portal foundation for the controlled pilot.

This slice creates the route shell, client workspace guard, client-safe API seam, and read-only
dashboard/order tracking UI for the Client Portal MVP. It does not create backend client portal
RPCs, client invitation/token onboarding, public token flows, order intake mutation, document
release authorization, or report-download signing.

## Current Client Model Findings

Existing client-related surfaces are operational/admin-facing:

- `clients` records are company-owned operational records.
- Current client management RPCs use current-company membership and permissions such as
  `clients.read.all`, `clients.read.assigned`, `clients.create`, and `clients.update.*`.
- Existing Clients pages are Internal/AMC operational surfaces and can expose management context
  that is not appropriate for lender users.
- Existing order reads are operational order reads, not client-safe portal projections.
- Client portal permission concepts are present in doctrine and route diagnostics, but the active
  frontend permission constants did not yet include client portal keys.
- No app-readable client portal order/status/report RPC was found for this first slice.
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

These keys are frontend contract constants in this slice. Backend permission seeding and role
assignment are still required before production client users can use the portal.

## Client-Safe Data Seam

The first API seam is intentionally dedicated to portal projections:

```text
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
- frontend permission constants;
- tests proving route guard behavior, API seam shape, and UI leakage boundaries.

Placeholder/deferred:

- backend `rpc_client_portal_orders`;
- backend `rpc_client_portal_order_detail`;
- client portal permission seeds/role templates;
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

Backend client/account scoping remains required before live client users are enabled. The planned
RPCs must scope rows to the authenticated client's account/organization and return opaque route
keys rather than raw order identifiers.

## Validation Target

Required validation for the foundation:

- client portal API tests;
- client portal page rendering/leakage tests;
- client route guard tests;
- existing workspace route guard tests;
- existing Internal/AMC route guard tests;
- `npm run build`;
- `npm run lint`;
- `git diff --check`.
