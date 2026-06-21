# AMC-17 Client Portal MVP Checkpoint

Run date: 2026-06-07.

## Decision

AMC-17 Client Portal MVP is complete for controlled pilot readiness, subject to the deferred items
listed below and a future staging/production smoke pass.

The first slice created the route shell, client workspace guard, client-safe API seam, and
read-only dashboard/order tracking UI for the Client Portal MVP.

The second slice adds the backend-safe read model for client portal dashboard, order list, and order
detail.

The third slice adds client-safe report download authorization for released final reports. It does
not create client invitation/token onboarding, public token flows, order intake mutation, broad
document browsing, draft downloads, or internal document access.

The fourth slice adds controlled Client Portal order request intake. Client submissions create
reviewable intake records only; they do not automatically create operational orders, assignments,
vendor procurement, invoices, fees, or documents.

The fifth slice adds an Internal/AMC staff review inbox for submitted client order requests. Staff
can list requests, view intake detail, mark a request as reviewing, or reject it.

The sixth slice adds staff-confirmed conversion from a submitted or reviewing client request into
one operational order. Conversion is permission-gated, requires explicit confirmation, links the
created order back to the request, and does not create downstream assignment, vendor procurement,
invoice, payment, report, or document records.

Completed Client Portal loop:

```text
Client Portal request intake
  -> staff review inbox
  -> staff-confirmed conversion
  -> linked operational order
  -> client-safe order tracking
  -> client-authorized final report download
```

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
/client-requests
```

Route ownership:

- Client Portal uses its own `ClientPortalRouteGuard`.
- Client Portal is outside the Internal/AMC `Layout`.
- `/client-requests` is inside the authenticated Internal/AMC operational layout and is not owned
  by Client Portal routing.
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
client_portal.order_requests.read
client_portal.order_requests.manage
```

These keys now exist in frontend constants and the backend permission seed migration. Role/template
assignment is still required before production client users can use the portal.

Permission requirements:

- Client Portal dashboard/order tracking: `client_portal.dashboard.view` and
  `client_portal.orders.read`.
- Client Portal request intake: `client_portal.orders.create` plus active
  `client_portal_members` mapping.
- Client Portal final report download: `client_portal.reports.read` plus active
  `client_portal_members` mapping.
- Staff request review: `client_portal.order_requests.read` or
  `client_portal.order_requests.manage`.
- Staff request status updates: `client_portal.order_requests.manage`.
- Staff request conversion: `client_portal.order_requests.manage` and `orders.create`.

## Client-Safe Data Seam

The API seam is intentionally dedicated to portal projections:

```text
getClientPortalDashboard()
  -> rpc_client_portal_dashboard()

listClientPortalOrders()
  -> rpc_client_portal_orders()

getClientPortalOrderDetail(orderKey)
  -> rpc_client_portal_order_detail(p_order_key)

createClientPortalReportDownloadUrl(orderKey)
  -> client-portal-report-download-url Edge Function
  -> rpc_client_portal_report_authorize_download(p_order_key)

submitClientPortalOrderRequest(values)
  -> rpc_client_portal_order_request_create(...)

listClientOrderRequestsForReview()
  -> rpc_client_portal_order_requests_for_review()

getClientOrderRequestReviewDetail(requestKey)
  -> rpc_client_portal_order_request_review_detail(p_request_key)

updateClientOrderRequestReviewStatus(requestKey, status)
  -> rpc_client_portal_order_request_review_update_status(p_request_key, p_status)

convertClientOrderRequestToOrder(requestKey)
  -> rpc_client_portal_order_request_convert_to_order(p_request_key)
```

The seam requires an opaque `order_key` for detail routing and normalizes only client-safe fields:

- order number;
- status label;
- property/address;
- important dates;
- report availability;
- report file metadata;
- short-lived signed report URL only after the user explicitly clicks `Download report`.
- client-submitted appraisal request intake details.

It does not import or fall back to shared Internal/AMC order, client, vendor, bid, assignment, or
procurement APIs.

Client payloads do not include raw order ids. Staff review/conversion payloads may include the
created operational order id only for the Internal/AMC order-detail link after conversion.

## Backend Read Model

Added in `20260607100500_client_portal_safe_order_read_model.sql`:

- `client_portal_members`;
- `current_app_user_client_portal_client_ids()`;
- `current_app_user_can_read_client_portal()`;
- `client_portal_order_key(...)`;
- `v_client_portal_order_status`;
- `rpc_client_portal_dashboard()`;
- `rpc_client_portal_orders()`;
- `rpc_client_portal_order_detail(p_order_key text)`.

Added in `20260607101000_client_portal_report_download_authorization.sql`:

- `rpc_client_portal_report_authorize_download(p_order_key text)`.

Added in `20260607102500_client_portal_order_request_intake.sql`:

- `client_portal_order_requests`;
- `client_portal_order_request_key(...)`;
- `current_app_user_can_create_client_portal_order_request()`;
- `rpc_client_portal_order_request_create(...)`.

Added in `20260607103000_client_portal_order_request_review_inbox.sql`:

- `client_portal.order_requests.read`;
- `client_portal.order_requests.manage`;
- `current_app_user_can_read_client_portal_order_requests()`;
- `current_app_user_can_manage_client_portal_order_requests()`;
- `v_client_portal_order_request_staff_review`;
- `rpc_client_portal_order_requests_for_review()`;
- `rpc_client_portal_order_request_review_detail(p_request_key text)`;
- `rpc_client_portal_order_request_review_update_status(p_request_key text, p_status text)`.

Added in `20260607104000_client_portal_order_request_conversion.sql`:

- updated `v_client_portal_order_request_staff_review` with minimal accepted-order linkage;
- updated `rpc_client_portal_order_request_review_detail(p_request_key text)` to return accepted
  order number when present;
- `rpc_client_portal_order_request_convert_to_order(p_request_key text)`.

The read model is current-company scoped and requires:

- authenticated app user;
- active current-company membership;
- client portal permission;
- active `client_portal_members` mapping between the app user and client account;
- orders linked to the mapped `client_id`;
- non-archived orders.

The detail route uses opaque `order_key` values generated from order, company, and client scope.
The RPC payload does not return raw order ids.

## Report Download Authorization

Client Portal report download is intentionally not broad document browsing.

The browser calls `client-portal-report-download-url` with only the opaque `order_key`. The Edge
Function:

- requires a bearer token;
- validates the `order_key` shape;
- calls `rpc_client_portal_report_authorize_download(p_order_key)` as the signed-in user;
- requires current company, active `client_portal_members` client mapping, and
  `client_portal.reports.read`;
- authorizes only the newest active `order_documents` row where:
  - `category = 'final_report'`;
  - `visibility_scope = 'client'`;
  - `status = 'active'`;
- uses service-role storage access only after the user-scoped RPC authorizes the report;
- returns a short-lived signed URL plus safe final-report filename/metadata;
- never returns storage bucket/path or raw order ids to the Client Portal.

The client detail page disables download when no final report is available, shows a loading state
while preparing the signed URL, and shows a clear error if the report becomes unavailable or access
is denied.

## Order Request Intake

Client Portal new-order intake is a request workflow, not operational order creation.

The browser submits client-safe form fields to `rpc_client_portal_order_request_create(...)`. The
RPC:

- requires current-company membership;
- requires authenticated app user identity;
- requires `client_portal.orders.create`;
- requires an active `client_portal_members` mapping;
- derives company and client scope server-side;
- rejects missing property address, property type, or report type;
- rejects past requested due dates;
- validates client contact email shape when provided;
- inserts a `client_portal_order_requests` row with `status = 'submitted'`;
- returns an opaque request key and submitted status;
- does not accept raw company, client, order, vendor, appraiser, reviewer, assignment, fee, or
  margin inputs.

Captured request fields:

- property address;
- property type;
- report/appraisal type;
- loan purpose/intended use;
- requested due date;
- borrower or property contact name;
- client contact name;
- client contact phone;
- client contact email;
- notes/instructions.

After submit, the Client Portal shows `Request submitted` and explains that the team will review
and confirm details. Clients cannot directly create operational orders.

## Staff Review Inbox

The staff review inbox route is `/client-requests`.

It is an Internal/AMC operations route, not a Client Portal route. It requires:

- `client_portal.order_requests.read` to list/view requests; or
- `client_portal.order_requests.manage` to list/view and update review status.

Staff can see:

- submitted request status;
- client name;
- property address;
- property type;
- report type;
- loan purpose;
- requested due date;
- borrower/property contact;
- client contact name, phone, and email;
- requester identity when available;
- request notes;
- review attribution when available.

Statuses supported in this slice:

- `submitted`;
- `under_review`;
- `declined`;
- historical/display-only `accepted` and `cancelled` if data already exists.

Review status mutations wired are:

- `submitted` or `under_review` -> `under_review`;
- `submitted` or `under_review` -> `declined`.

Conversion mutation wired:

- `submitted` or `under_review` -> `accepted` with `accepted_order_id` linked to the created
  operational order.

The review inbox does not create assignments, start vendor bidding, expose fees, expose margins,
upload documents, create invoices/payments, or show storage internals.

## Request Conversion

Staff conversion is a confirmed operational action, not a client action.

The browser shows `Convert to order` only when the staff user has both:

- `client_portal.order_requests.manage`;
- `orders.create`.

The server RPC also enforces both authorities and current-company scope. It accepts only the opaque
request key, locks the request row, blocks `declined`, `cancelled`, `accepted`, and already-linked
requests, and creates one `orders` row using server-side order numbering.

Mapped order fields:

- `client_id`;
- property address;
- property type;
- report/appraisal type;
- loan purpose/intended use into operational instructions/notes;
- requested due date into final due date;
- borrower/property contact name;
- client contact name, phone, and email;
- notes/instructions.

Conversion success returns only:

- request key;
- accepted status;
- created order id for the staff route link;
- created order number;
- property address;
- client name.

Conversion intentionally does not create:

- order-company assignments;
- vendor bid requests or responses;
- assignment invitations or offers;
- reports/documents;
- invoices;
- payment ledger rows.

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
- client-facing milestones;
- short-lived signed final report URL only from the click-time Edge Function response;
- submitted request confirmation metadata.

Staff-only request review payloads may expose:

- opaque request key;
- client name;
- submitted request status;
- property/contact/request intake fields;
- requester/reviewer identity when available;
- accepted order id and order number after conversion, for Internal/AMC navigation only.

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
- signed report download URLs in dashboard/list/detail RPC payloads;
- drafts, internal documents, vendor submissions, reviewer files, invoices, and procurement
  documents;
- direct operational order creation controls in Client Portal.

## UI Added

Client and staff UI now includes:

- Client Portal shell;
- Client Portal dashboard;
- client-scoped order list;
- client-safe order detail;
- report availability;
- authorized final report download action;
- order request intake form;
- request submitted confirmation;
- staff request review inbox;
- staff-confirmed request conversion to one operational order.

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
- dedicated final-report download authorization RPC and Edge Function;
- dedicated client order request intake table and create RPC;
- client-facing new-order request form;
- staff request review RPCs and inbox UI;
- staff-confirmed request conversion RPC and UI;
- tests proving route guard behavior, API seam shape, and UI leakage boundaries.

Placeholder/deferred:

- client portal role templates and production role assignment;
- dedicated client invite/onboarding flow;
- full client account management;
- upload/document request flow;
- file upload with new order request;
- public/token order status links;
- client messaging/comment thread;
- configurable lender-specific order forms;
- deeper backend operation-entitlement model;
- production/staging smoke validation for Client Portal.

## Security Boundary

Client Portal MVP foundation is fail-closed:

- unauthenticated users go to login;
- users without client portal permission see `Client Portal unavailable`;
- Internal/AMC operational users do not get portal access unless they also receive explicit client
  portal permission;
- client routes do not render internal operational shell chrome;
- page models do not expose internal/vendor/procurement fields.

Backend client/account scoping now exists for read-only dashboard/list/detail through
`client_portal_members`. Request intake and final report download authorization use the same
current-company and client-account boundary. Staff review/conversion remains in the Internal/AMC
operations workspace. Client invite/token onboarding is still required before live client users are
enabled.

Security guarantees in the completed MVP:

- client routes are owned by the client workspace and guarded by `ClientPortalRouteGuard`;
- staff review route is owned by the operations workspace and guarded by staff permissions;
- client detail/download requests use opaque order keys;
- client intake/review requests use opaque request keys;
- client dashboard/list/detail RPCs do not return raw order ids;
- storage bucket/path values remain server-side;
- signed final report URLs are created only after click-time authorization;
- vendor/procurement/internal notes are not shown to clients;
- clients cannot directly create operational orders.

## Validation Target

Completed validation scope across AMC-17 slices:

- client portal API tests;
- client portal migration/static DB tests;
- client portal page rendering/leakage tests;
- client request intake/review/conversion tests;
- client route guard tests;
- existing workspace route guard tests;
- existing Internal/AMC route guard tests;
- order create/service tests when conversion touched order creation boundaries;
- `npm run build`;
- `npm run lint`;
- `git diff --check`.

Remaining validation gap:

- production/staging smoke validation for Client Portal with real mapped client users is still
  deferred.
