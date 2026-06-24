# AMC Product Route Alias Plan

## Purpose

This plan defines future product-local route aliases for Internal Operations, Falcon AMC, Vendor
Workspace, Client Portal, and public token flows before any route implementation changes.

This is documentation only. It does not change routes, redirects, auth, navigation, workspace
switching, link builders, notifications, email, schema, RLS, deployment config, environment
variables, production data, or staging data.

Related doctrine:

- `docs/architecture/ADR_AMC_SEPARATE_PRODUCT_CONTEXT.md`
- `docs/architecture/AMC_PRODUCT_SEPARATION_AUDIT.md`
- `docs/FALCON_WORKSPACE_DOCTRINE_NAVIGATION_ARCHITECTURE.md`
- `docs/amc/AMC_FULL_MVP_SMOKE_TEST_PLAN.md`

## Route Alias Principles

1. Product-local aliases must be additive first.
2. Existing shared routes remain compatibility paths until all links, navigation, email,
   notifications, browser bookmarks, and smoke tests are migrated.
3. `operations_scope` remains a data/workflow scoping compatibility mechanism, not a route,
   legal, auth, or deployment boundary.
4. Internal and AMC may eventually use product-local `/dashboard` on separate deployments, but the
   shared single-deployment transition should use explicit prefixes such as `/internal/*` and
   `/amc/*`.
5. Vendor Workspace and Client Portal are already partially product-local. Do not rename them until
   authenticated and public-token smoke coverage proves compatibility.
6. Route aliases should not be used to constrain the workspace switcher until route aliases, link
   builders, navigation, notification/email links, and smoke coverage are ready.

## Current Registry Status

`src/lib/productContext/productRoutes.js` now defines a metadata-only route alias registry for the
future aliases in this plan. It includes route ids, product context, current compatibility path,
future canonical path, and migration phase.

The registry is not wired into React Router, navigation, redirects, auth, email links,
notification links, or workspace switching. It is an inert planning/lookup surface for later
implementation slices.

`src/lib/productContext/productLinks.js` can now explicitly opt into registry-backed canonical
paths with `useCanonicalRoutes: true` or `routeMode: "canonical"`. Default link-builder behavior
remains legacy compatibility mode and continues to emit current paths such as `/dashboard`,
`/orders/:id`, `/vendors`, `/vendor-workspace/*`, `/client-portal/*`, public vendor token routes,
and `/accept-invite/:id`.

The canonical opt-in is still utility-only. It is not wired into active navigation, React Router,
redirects, notification senders, email delivery, auth callbacks, or Edge Functions.

`src/lib/productContext/__tests__/canonicalRouteModeGuard.test.js` protects that boundary by
failing if live `src` callers opt into canonical route mode before route aliases are registered.
The guard allows the product route/link helper modules and product-context tests to exercise the
feature.

The first real AMC product-local aliases are now registered:

- `/amc/dashboard`
- `/amc/orders`
- `/amc/orders/new`
- `/amc/orders/:id`
- `/amc/vendors`
- `/amc/vendors/:vendorProfileId`
- `/amc/client-requests`

They reuse the same route guards and pages as the compatibility Dashboard route (`/dashboard`),
Order routes (`/orders`, `/orders/new`, and `/orders/:id`), Vendor Directory routes (`/vendors`
and `/vendors/:vendorProfileId`), and Client Requests route (`/client-requests`). Navigation,
email, notification links, redirects, auth callbacks, workspace switcher behavior, and canonical
`productLinks` live usage have not been changed. Canonical route mode remains blocked for live
callers until a later wiring slice intentionally updates that guard.

Vendor Directory and Vendor Profile now preserve alias-local navigation inside that surface: users
entering through `/amc/vendors` continue to profile/back links under `/amc/vendors/*`, while users
entering through `/vendors` continue to use `/vendors/*`. This is local path-aware behavior only;
global navigation and canonical `productLinks` mode remain unchanged and guarded.

Order List and Order Detail now preserve alias-local navigation inside the order surface: users
entering through `/amc/orders` continue to local detail/back links under `/amc/orders/*`, while
users entering through `/orders` continue to use `/orders/*`. Global navigation, live email links,
notification links, redirects, and canonical `productLinks` mode remain unchanged and guarded.

## Active AMC Alias Status

| Alias | Registered | Local path-aware navigation | Global nav wired | Email/notification wired | Canonical `productLinks` live usage | Smoke coverage needed later |
| --- | --- | --- | --- | --- | --- | --- |
| `/amc/dashboard` | Yes | N/A, dashboard has no local drill-down links in this slice | No | No | No | AMC dashboard browser smoke; dashboard data-scope check; Internal-mode denial check. |
| `/amc/orders` | Yes | Yes, local order detail links remain under `/amc/orders/*` | No | No | No | AMC order list browser smoke; filters/saved views smoke; order data-scope check. |
| `/amc/orders/new` | Yes | Yes, create success redirects to `/amc/orders/:id`; fallback returns `/amc/orders` | No | No | No | AMC create smoke with existing client; scoped client picker check; Internal-mode denial check. |
| `/amc/orders/:id` | Yes | Yes, local back link returns to `/amc/orders` | No | No | No | AMC order detail browser smoke; document visibility smoke; procurement panel smoke; wrong-scope denial check. |
| `/amc/vendors` | Yes | Yes, local vendor profile links remain under `/amc/vendors/*` | No | No | No | Vendor Directory browser smoke; permission denial smoke; vendor search/filter smoke. |
| `/amc/vendors/:vendorProfileId` | Yes | Yes, local back link returns to `/amc/vendors` | No | No | No | Vendor Profile browser smoke; contact/coverage visibility smoke; permission denial smoke. |
| `/amc/client-requests` | Yes | N/A, no alias-local drill-down links are wired in this slice | No | No | No | Client Requests inbox smoke; review/convert smoke; portal-to-AMC isolation smoke. |

Edit aliases remain deferred. In particular, `/amc/orders/:id/edit` is not registered in this
phase. `/amc/orders/new` is registered only as an existing-client-only AMC create route through
`AmcNewOrderPage`; it is not linked from global navigation, email, or notifications yet. Order edit
flows still need a dedicated boundary review before Falcon gives AMC product-local edit routes,
because update RPC payloads, operations-scope preservation, workflow authority, document side
effects, activity, notifications, and client/vendor visibility must be checked together. The
existing compatibility edit route (`/orders/:id/edit`) may remain as is until that review produces
a deliberate migration slice. The current boundary audit is recorded in
`docs/architecture/AMC_ORDER_MUTATION_BOUNDARY_AUDIT.md`.

Recommended next implementation options:

1. Add route aliases for lower-risk read-only/shared AMC surfaces such as `/amc/activity` or
   `/amc/calendar`, if their data scope and copy are confirmed safe.
2. Move to route-domain/deployment planning for separate AMC entry points, auth redirects, allowed
   URLs, and deployment/domain ownership.
3. Run staging smoke for `/amc/orders/new` before wiring any navigation to the new route.

## Current Route Group Inventory

| Group | Current routes | Product context | Current guard/ownership | Notes |
| --- | --- | --- | --- | --- |
| Public shared | `/login`, `/accept-invite/:invitationId` | Shared/legacy | Public route; Supabase auth or invite flow handles continuation | Auth and invite redirects are deployment-sensitive. |
| Public vendor token | `/vendor/bid-invitations/:token`, `/vendor/assignment-offers/:token`, `/vendor/assignment-work/:token` | Vendor/AMC-adjacent | Public token pages | These links are email-sensitive and should keep compatibility for a long time. |
| Vendor Workspace | `/vendor-workspace`, `/vendor-workspace/dashboard`, `/vendor-workspace/available-work`, `/vendor-workspace/available-work/:workKey`, `/vendor-workspace/my-bids`, `/vendor-workspace/assigned-orders`, `/vendor-workspace/assigned-orders/:assignmentWorkKey`, `/vendor-workspace/payments`, `/vendor-workspace/profile` | Vendor | `VendorWorkspaceRouteGuard` plus active-company bootstrap | Already product-local by path, but still shares auth/session infrastructure. |
| Client Portal | `/client-portal`, `/client-portal/orders`, `/client-portal/orders/:orderId`, `/client-portal/new-order`, `/client-portal/invitations/:token` | Client | `ClientPortalRouteGuard` for authenticated pages; public invitation page for token route | Already product-local by path, but still shares deployment/auth infrastructure. |
| Shared operations | `/dashboard`, `/orders`, `/orders/historical`, `/orders/new`, `/orders/:id`, `/orders/:id/edit`, `/calendar`, `/activity`, `/clients`, `/clients/new`, `/clients/profile/:clientId`, `/clients/edit/:clientId`, `/clients/cards`, `/clients/:id`, `/settings`, `/settings/notifications`, `/settings/product-metadata-diagnostics`, `/settings/owner-setup` | Shared/legacy, currently clarified by operations mode | `ProtectedRoute`, `WorkspaceRouteGuard` for operations group where applicable, and permission gates | Main future alias target. |
| AMC-only operations | `/vendors`, `/vendors/:vendorProfileId`, `/client-requests` | AMC | `ProtectedRoute`, AMC workspace guard, permission gates | Good first aliases because they already have AMC-only route ownership. |
| Internal-only operations | `/my-work`, `/users`, `/users/:userId`, `/users/new`, `/users/view/:userId` | Internal | `ProtectedRoute`, Internal workspace guard, permission gates, compatibility redirects | Internal-only aliases can follow AMC-only aliases. |
| Hidden enterprise operations | `/assignments`, `/assignments/:assignmentId`, `/relationships`, `/relationships/:relationshipId` | Shared/legacy with Internal/AMC visibility controls | Permission gates, operations workspace guard, `V1HiddenSurfaceRouteGuard` | Higher risk because visibility is already conditional and product meaning is still mixed. |

## Alias Matrix

### Shared Operational Shell

| Current path | Future canonical path | Compatibility path | Product context | Risk | Migration notes | Later tests/smokes |
| --- | --- | --- | --- | --- | --- | --- |
| `/dashboard` | `/internal/dashboard` and `/amc/dashboard` during single-deployment transition; product-local `/dashboard` after separate deployments | `/dashboard` | Internal / AMC / shared legacy | Hard | Add aliases without redirecting. Existing `/dashboard` remains default until link builders and navigation choose product-local paths. | Route render tests for both aliases; dashboard data scope tests; browser smoke for Internal and AMC dashboards. |
| `/orders` | `/internal/orders`, `/amc/orders` | `/orders` | Internal / AMC | Hard | Shared component can remain. Alias route should set/require product context later, but not in first alias slice. | Orders list render, filters, saved views, and data isolation smoke for both contexts. |
| `/orders/historical` | `/internal/orders/historical`, `/amc/orders/historical` if AMC history is product-approved | `/orders/historical` | Internal / AMC | Medium | Historical readback has governance implications; do not expose AMC historical alias until requirements are explicit. | Historical list route test; retired lifecycle visibility smoke. |
| `/orders/new` | `/internal/orders/new`, `/amc/orders/new` | `/orders/new` | Internal / AMC | Hard | Creation aliases must not change RPC payload behavior until product context and operations scope are deliberately wired. | Create form route tests; RPC payload tests for operations scope; staging smoke for Internal and AMC order creation. |
| `/orders/:id` | `/internal/orders/:id`, `/amc/orders/:id` | `/orders/:id` | Internal / AMC | Hard | Detail aliases should preserve existing component and read RPC behavior at first. Later link builders can choose product-specific paths. | Detail route render; wrong-scope denial; document visibility; notification link smoke. |
| `/orders/:id/edit` | `/internal/orders/:id/edit`, `/amc/orders/:id/edit` | `/orders/:id/edit` | Internal / AMC | Hard | Edit aliases need careful workflow and create/update RPC coverage before navigation uses them. | Edit route permission tests; update RPC tests; operations scope preservation smoke. |
| `/calendar` | `/internal/calendar`, `/amc/calendar` | `/calendar` | Internal / AMC | Medium | Calendar is read-heavy and a safer alias after dashboards/orders. | Calendar route render; event data scope smoke; due/review/site visit visibility checks. |
| `/activity` | `/internal/activity`, `/amc/activity` | `/activity` | Internal / AMC | Medium | Activity payloads must carry product-safe context before notifications link to aliases. | Activity route render; internal note leakage smoke; product-scoped notification/activity smoke. |
| `/clients`, `/clients/cards`, `/clients/:id`, `/clients/new`, `/clients/profile/:clientId`, `/clients/edit/:clientId` | `/internal/clients*`, `/amc/clients*` or `/amc/client-services*` | Existing `/clients*` paths | Internal / AMC | Hard | Client/lender/AMC relationship semantics differ by product. Alias after order/dashboard basics are proven. | Client list/detail/create/edit tests; client relationship operations-scope smoke; client request conversion smoke. |
| `/settings`, `/settings/notifications`, `/settings/product-metadata-diagnostics`, `/settings/owner-setup` | `/internal/settings*`, `/amc/settings*` for product-approved settings only | Existing `/settings*` paths | Internal / AMC / shared legacy | Hard | Settings contain owner setup, diagnostics, and preferences. Do not imply product-specific admin authority until product settings are modeled. | Settings route tests; owner setup access tests; notification preferences smoke. |

### AMC-Only Operations

| Current path | Future canonical path | Compatibility path | Product context | Risk | Migration notes | Later tests/smokes |
| --- | --- | --- | --- | --- | --- | --- |
| `/vendors` | `/amc/vendors` | `/vendors` | AMC | Easy | Good first alias candidate because current route is already AMC-only. Keep `/vendors` compatibility. | Vendor directory route render; permission denial; candidate/procurement smoke. |
| `/vendors/:vendorProfileId` | `/amc/vendors/:vendorProfileId` | `/vendors/:vendorProfileId` | AMC | Easy | Pair with `/amc/vendors`. Preserve profile id shape and existing RPCs. | Vendor profile route render; contact/coverage tests; profile update request smoke. |
| `/client-requests` | `/amc/client-requests` | `/client-requests` | AMC | Medium | Client request review is AMC-native. Alias after client portal request smoke coverage is current. | Client request inbox/review tests; conversion smoke; portal-to-AMC isolation smoke. |

### Internal-Only Operations

| Current path | Future canonical path | Compatibility path | Product context | Risk | Migration notes | Later tests/smokes |
| --- | --- | --- | --- | --- | --- | --- |
| `/my-work` | `/internal/my-work` | `/my-work` | Internal | Medium | Internal appraiser shell path can remain. Alias after dashboard/order aliases. | My Work render; assigned-only data smoke; appraiser workflow smoke. |
| `/users` | `/internal/users` | `/users` | Internal | Medium | Team access should remain Internal until AMC user/admin model is explicit. | Users index tests; role/permission save tests; owner/admin smoke. |
| `/users/:userId`, `/users/new`, `/users/view/:userId` | `/internal/users/:userId`, `/internal/users/new`, `/internal/users/view/:userId` if reintroduced | Current redirects to `/users` | Internal | Easy | Current behavior redirects; aliases can mirror redirects later if still needed. | Redirect tests only. |

### Hidden Enterprise Operations

| Current path | Future canonical path | Compatibility path | Product context | Risk | Migration notes | Later tests/smokes |
| --- | --- | --- | --- | --- | --- | --- |
| `/assignments`, `/assignments/:assignmentId` | `/internal/assignments*` and possibly `/amc/assignments*` only if product-approved | `/assignments*` | Internal / AMC / shared legacy | Hard | Existing surface is hidden/suppressed in several modes. Do not alias before visibility doctrine is settled. | Hidden-surface guard tests; assignment packet smoke; wrong-company denial. |
| `/relationships`, `/relationships/:relationshipId` | `/internal/relationships*`; `/amc/relationships*` only if vendor/client relationship management needs it | `/relationships*` | Internal / AMC / shared legacy | Hard | Relationship routes can imply broader network administration. Defer until product ownership is clearer. | Hidden-surface guard tests; relationship permission tests; vendor/client isolation smoke. |

### Vendor Workspace

| Current path | Future canonical path | Compatibility path | Product context | Risk | Migration notes | Later tests/smokes |
| --- | --- | --- | --- | --- | --- | --- |
| `/vendor-workspace` | `/vendor-workspace` or `/vendor/dashboard` after vendor-domain decision | `/vendor-workspace` | Vendor | Medium | Keep current path until auth/session and domain plan is settled. | Vendor route guard tests; bootstrap diagnostics; vendor dashboard smoke. |
| `/vendor-workspace/available-work`, `/vendor-workspace/available-work/:workKey` | `/vendor/available-work*` only if shorter vendor route is approved | `/vendor-workspace/available-work*` | Vendor | Medium | Public `/vendor/*` token routes already exist, so avoid collisions before a full vendor route plan. | Available work list/detail tests; bid submit/decline smoke; wrong-vendor denial. |
| `/vendor-workspace/my-bids` | `/vendor/my-bids` if approved | `/vendor-workspace/my-bids` | Vendor | Medium | Keep compatibility because this path may appear in training/support material. | My Bids tests; selected/not-selected/expired bid smoke. |
| `/vendor-workspace/assigned-orders`, `/vendor-workspace/assigned-orders/:assignmentWorkKey` | `/vendor/assigned-orders*` if approved | `/vendor-workspace/assigned-orders*` | Vendor | Medium | Alias after assignment execution smoke is stable. | Start work, submit report, revision/resubmit, document access smoke. |
| `/vendor-workspace/payments` | `/vendor/payments` if approved | `/vendor-workspace/payments` | Vendor | Medium | Payment links need careful email/notification handling before alias use. | Invoice submit/correction/payment status smoke. |
| `/vendor-workspace/profile` | `/vendor/profile` if approved | `/vendor-workspace/profile` | Vendor | Easy | Low-risk alias once vendor route namespace collision is resolved. | Profile read/update-request tests. |

### Client Portal

| Current path | Future canonical path | Compatibility path | Product context | Risk | Migration notes | Later tests/smokes |
| --- | --- | --- | --- | --- | --- | --- |
| `/client-portal` | `/client-portal` or `/client/dashboard` after client-domain decision | `/client-portal` | Client | Medium | Keep current path until client portal domain/auth plan is settled. | Client portal guard tests; dashboard smoke. |
| `/client-portal/orders`, `/client-portal/orders/:orderId` | `/client/orders*` if approved | `/client-portal/orders*` | Client | Medium | Client route aliases must preserve client-safe read model and report access rules. | Client order list/detail tests; document/report download smoke. |
| `/client-portal/new-order` | `/client/new-order` if approved | `/client-portal/new-order` | Client | Medium | Alias after client request intake smoke is stable. | New request form tests; submission notification fanout smoke. |
| `/client-portal/invitations/:token` | `/client/invitations/:token` if approved | `/client-portal/invitations/:token` | Client | Hard | Auth redirect and email links are sensitive. Keep current path until redirect matrix is finalized. | Invitation accept tests; Supabase redirect smoke; wrong-email denial. |

### Public Shared And Token Routes

| Current path | Future canonical path | Compatibility path | Product context | Risk | Migration notes | Later tests/smokes |
| --- | --- | --- | --- | --- | --- | --- |
| `/login` | Product-local login per deployment or `/internal/login`, `/amc/login`, `/vendor/login`, `/client/login` if single deployment persists | `/login` | Shared legacy | Dangerous | Do not alias login before auth/redirect strategy is accepted. | Login redirect tests; password reset/invite redirect smoke. |
| `/accept-invite/:invitationId` | Product-specific invite accept paths only after invite model is product-aware | `/accept-invite/:invitationId` | Shared legacy | Dangerous | Existing company invite flow is shared. Product-specific redirects require Supabase allowed URL changes. | Invite accept/resend/cancel tests; allowed redirect smoke. |
| `/vendor/bid-invitations/:token` | Keep or move to vendor-domain-local `/bid-invitations/:token` later | `/vendor/bid-invitations/:token` | Vendor | Hard | Email-sensitive public token route. Do not change without link-builder and email dry-run comparison. | Public token route tests; expired/declined/wrong-token smoke. |
| `/vendor/assignment-offers/:token` | Keep or move to vendor-domain-local `/assignment-offers/:token` later | `/vendor/assignment-offers/:token` | Vendor | Hard | Offer acceptance is workflow-critical. Preserve compatibility. | Accept/decline offer smoke; assignment state transition tests. |
| `/vendor/assignment-work/:token` | Keep or move to vendor-domain-local `/assignment-work/:token` later | `/vendor/assignment-work/:token` | Vendor | Hard | Public work route may overlap with authenticated Vendor Workspace semantics. Preserve compatibility. | Public work route tests; token response smoke. |

## Recommended Migration Order

1. Add route alias constants only.
   - No route table changes.
   - Use constants in tests and product link builders first.

2. Add inactive alias route definitions behind existing guards.
   - Start with AMC-only `/amc/vendors` and `/amc/vendors/:vendorProfileId`.
   - Then add `/amc/client-requests`.
   - Do not redirect compatibility paths yet.

3. Update product link builders.
   - Make builders capable of returning aliases through a feature/config flag.
   - Keep legacy fallback as default.

4. Update navigation in product-context-aware mode.
   - Internal and AMC navigation should choose aliases only after alias routes have render tests.
   - Keep current paths available.

5. Update notification/email dry-run mappers.
   - Compare planned alias URL with existing URL.
   - Add tests that prove no live delivery changes before wiring.

6. Add smoke coverage.
   - Browser smoke for Internal and AMC dashboards/orders.
   - AMC vendor directory, client requests, procurement, Vendor Workspace, and Client Portal smoke.
   - Email/notification link dry-run comparison before any live send changes.

7. Wire live links.
   - Product-specific in-app navigation first.
   - Notification links next.
   - Email links last, after domain/auth redirect matrix is proven.

8. Constrain or hide workspace switcher.
   - Only after product-local routes, links, email/notification paths, and smoke coverage prove
     product entry behavior.

9. Consider compatibility redirects.
   - Redirect old shared paths only when browser bookmarks, email links, notifications, and support
     workflows have migrated.
   - Public token routes should keep long-lived compatibility.

## First Implementation Candidate

The safest first implementation slice is route alias constants plus tests, with no active route
table changes. The safest first active route aliases are:

1. `/amc/vendors`
2. `/amc/vendors/:vendorProfileId`
3. `/amc/client-requests`

These are already AMC-only by current route guard and permission model, so aliasing them has a
smaller blast radius than shared `/dashboard` or `/orders`.

## Explicit Non-Goals

- No route changes in this planning slice.
- No redirect changes.
- No auth/session changes.
- No workspace switcher changes.
- No navigation changes.
- No email or notification link changes.
- No Supabase migrations or RLS changes.
- No Edge Function, Vercel, CSP, or environment changes.
