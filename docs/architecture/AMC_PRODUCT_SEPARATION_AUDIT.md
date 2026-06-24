# AMC Product Separation Audit

## Purpose

This audit inventories current technical couplings between Internal Operations and Falcon AMC before
any runtime separation work. It is planning documentation only.

No runtime behavior, schema, RLS, route, auth, UI, tests, Supabase project settings, Vercel
settings, environment variables, Edge Functions, email behavior, production data, or staging data
are changed by this document.

Related doctrine:

- `docs/architecture/ADR_AMC_SEPARATE_PRODUCT_CONTEXT.md`
- `docs/FALCON_WORKSPACE_DOCTRINE_NAVIGATION_ARCHITECTURE.md`
- `docs/SUPABASE_ENVIRONMENT_ARCHITECTURE_AND_MIGRATION_PLAN.md`
- `docs/ENVIRONMENT_PARITY_CHECKLIST.md`
- `docs/PRODUCTION_READINESS_AUDIT.md`
- `docs/amc/AMC_FULL_MVP_SMOKE_TEST_PLAN.md`

## Executive Summary

Falcon currently separates Internal Operations and AMC mostly through runtime workspace state,
route-ownership guards, permission gates, `operations_scope`, and `current_company_id()`.
That separation is useful for compatibility and staging, but it is not a legal/product boundary.

The hardest future work is not hiding the workspace switcher. The hardest work is removing the
assumption that one Supabase auth session can safely resolve Internal, AMC, Vendor Workspace, and
Client Portal contexts through one active company claim, one shared permission hook, one shared app
shell, and one shared set of deployment origins.

## Current Additive Diagnostic Layer

`src/lib/productContext/productContext.js` now defines stable product-context constants for
Internal, AMC, Vendor Workspace, Client Portal, and shared/legacy runtime paths. The helper can
infer diagnostic context from a pathname and can optionally use `operationsMode` to clarify
otherwise ambiguous shared operational routes such as `/dashboard` and `/orders/:id`.

This layer is diagnostic-only. It does not change auth, routing, workspace switching, active
company context, permissions, notifications, email links, data access, RLS, schema, deployment
behavior, or legal separation. It is an additive vocabulary for later slices.

`src/lib/productContext/productLinks.js` now adds product-aware link builders for future
notification, email, and navigation adoption. The builders accept product-specific base URL config,
fall back to `legacyAppBaseUrl`, and return safe relative paths when no base URL is configured.
They preserve current route paths, including shared `/orders/:id`, `/dashboard`,
`/vendor-workspace/*`, `/client-portal/*`, public vendor token routes, and `/accept-invite/:id`.

These link helpers are not wired into email delivery, notification payloads, route generation,
Edge Functions, auth callbacks, or navigation. They are a legacy-compatible utility layer only.

`src/lib/productContext/productMessagePlans.js` now adds dry-run message planning helpers for
future notification and email routing decisions. The helpers map simple event or payload
descriptors to intended product context, link target, link-builder name, required base URL key,
legacy fallback key, route family, and warnings for ambiguous or incomplete future links.

The message planners are descriptive only. They do not build live URLs, send email, create
notifications, write database payloads, mutate templates, call Edge Functions, or change any
delivery behavior.

## Classification Key

| Class | Meaning |
| --- | --- |
| Easy | Localized configuration, copy, docs, or route-map cleanup with little data risk. |
| Medium | Shared frontend behavior or low-risk backend RPC compatibility work that needs focused tests. |
| Hard | Cross-cutting auth, permission, notification, or data-model work that needs staged rollout and smoke coverage. |
| Dangerous | Work that can lock users out, leak tenant data, break production email links, or mutate auth/company context. Requires explicit design, staging proof, rollback, and production authorization. |

## Coupling Inventory

### 1. Shared Supabase Auth Client And Login

| Field | Detail |
| --- | --- |
| Current behavior | `src/lib/supabaseClient.js` creates one browser Supabase client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. `src/main.jsx` wraps the entire app in one `SessionContextProvider`. `src/pages/auth/Login.jsx` uses one Supabase Auth UI for all authenticated product surfaces and returns signed-in users to a single internal path. |
| Why it exists | Falcon began as one app with one login and later added company/workspace scoping. A single auth provider kept Internal, AMC, Vendor Workspace, and Client Portal on one session. |
| Risk level | Dangerous |
| Required future state | Internal Operations and Falcon AMC must have separate account/product entry contexts. A user should not rely on one shared session to cross the Internal/AMC boundary. |
| Suggested migration approach | First add product-context configuration and documented entry points without changing auth. Then introduce product-aware login URLs and redirect allowlists. Only later decide whether separation is same Supabase project with strict product claims, separate Supabase auth projects, or separate deployments/projects. Validate sign-in, password reset, invites, public token routes, and logout per product context before production. |

### 2. Client-Side Operations Mode As Product Boundary

| Field | Detail |
| --- | --- |
| Current behavior | `src/lib/operations/OperationsModeProvider.jsx` stores `falcon.operationsMode` in localStorage and exposes `internal_operations` or `amc_operations`. `src/lib/operations/operationsMode.js` maps operations mode to `operations_scope`. |
| Why it exists | The app needed a low-friction way to reuse one shell and switch between Internal and AMC work queues during staging and pilot work. |
| Risk level | Dangerous |
| Required future state | Product context must be established by entry point, deployment/domain, auth context, and backend authorization. LocalStorage can remain a presentation preference inside a product but cannot define product/legal boundary. |
| Suggested migration approach | Treat operations mode as compatibility state. Add product-context detection separate from operations mode. Eventually make Internal and AMC entry points set fixed allowed modes so no cross-product localStorage switch is possible. |

### 3. Workspace Switcher

| Field | Detail |
| --- | --- |
| Current behavior | `src/components/shell/TopNav.jsx` renders `OperationalModeContext`, lists all available operations modes, persists the selected mode, clears workspace-scoped caches through `resetWorkspaceSwitchState(...)`, and navigates to `/dashboard`. |
| Why it exists | Same-login users needed to move between Internal Operations and AMC Operations inside one shell during the original workspace model. |
| Risk level | Hard |
| Required future state | Internal and AMC should not be switchable from one authenticated shell. Each product entry should present only its own product context. |
| Suggested migration approach | Add a product-context allowlist for available operations modes, defaulting to current behavior. In a later slice, configure AMC entry points to expose only AMC and Internal entry points to expose only Internal. Remove or hide the switcher only after routes, redirects, email links, and auth callbacks are product-aware. |

### 4. Shared Dashboard Path

| Field | Detail |
| --- | --- |
| Current behavior | Internal and AMC both use `/dashboard`. `src/routes/workspaceRouteOwnership.js` maps both Internal and AMC dashboards to `/dashboard`. `src/routes/DefaultWorkspaceRedirect.jsx` sends most authenticated operational users to `/dashboard`. `src/features/dashboard/DashboardGate.jsx` determines presentation from current shell/workspace state. |
| Why it exists | Dashboard reuse reduced route duplication while workspace mode changed dashboard meaning. |
| Risk level | Hard |
| Required future state | Internal and AMC should have distinct entry/dashboard routes or distinct deployments where `/dashboard` is product-local. |
| Suggested migration approach | Add product-local route aliases first, such as `/amc/dashboard` behind compatibility redirects, or separate deployment rewrite rules. Keep `/dashboard` as compatibility until email links, browser bookmarks, and smoke tests are migrated. |

### 5. Shared Operational Routes

| Field | Detail |
| --- | --- |
| Current behavior | Routes such as `/orders`, `/orders/:id`, `/orders/new`, `/calendar`, `/activity`, `/clients`, and `/settings` are wrapped with `WorkspaceRouteGuard` and can belong to `ROUTE_WORKSPACE_GROUPS.OPERATIONS`, meaning both Internal and AMC. |
| Why it exists | Internal and AMC share order, calendar, activity, client, and settings infrastructure. |
| Risk level | Hard |
| Required future state | Shared implementation may remain, but route ownership must be product-local. Internal routes and AMC routes should not rely on a mutable client-side workspace mode to decide meaning. |
| Suggested migration approach | Create a product route inventory and add product-local route definitions while keeping old routes as compatibility aliases. Migrate links and tests before removing cross-product route group behavior. |

### 6. AMC-Only Routes Inside Shared Shell

| Field | Detail |
| --- | --- |
| Current behavior | `/vendors`, `/vendors/:vendorProfileId`, and `/client-requests` are AMC-only through `WorkspaceRouteGuard workspace={ROUTE_WORKSPACES.AMC}` plus permission gates. They still live under the shared authenticated `Layout`. |
| Why it exists | AMC vendor directory and client request work was added to the shared operations shell. |
| Risk level | Medium |
| Required future state | AMC-only routes should be reachable only from the AMC product context, not merely hidden by a switchable workspace guard. |
| Suggested migration approach | Introduce AMC product route aliases and product-context guards. Keep current route paths temporarily for bookmarks and tests. Later redirect `/vendors` and `/client-requests` only inside AMC deployment/context. |

### 7. Internal-Only Routes Inside Shared Shell

| Field | Detail |
| --- | --- |
| Current behavior | `/my-work` and `/users` are Internal-only through `WorkspaceRouteGuard workspace={ROUTE_WORKSPACES.INTERNAL}`. Hidden enterprise surfaces such as assignments and relationships are further filtered by `V1HiddenSurfaceRouteGuard`. |
| Why it exists | Staff appraisal surfaces and team access are internal operational surfaces but share the main shell and permission resolver. |
| Risk level | Medium |
| Required future state | Internal-only routes should be unavailable from AMC product entry points independent of local workspace state. |
| Suggested migration approach | Add product-context guards before removing switch behavior. Preserve current permission gates so internal workflows do not regress. |

### 8. Vendor Workspace Active Company Switching

| Field | Detail |
| --- | --- |
| Current behavior | `src/routes/VendorWorkspaceRouteGuard.jsx` calls `bootstrapVendorWorkspace()`, which calls `rpc_vendor_workspace_bootstrap`, invokes the `set-active-company` Edge Function, refreshes the Supabase session, and reloads permissions. The same auth session is moved into the vendor company context. |
| Why it exists | Authenticated Vendor Workspace needed to work for vendor contacts without a separate vendor auth product, while preserving `current_company_id()`-scoped RPCs. |
| Risk level | Dangerous |
| Required future state | Vendor Workspace should be explicitly product/portal scoped and should not depend on accidentally sharing an Internal or AMC active company session. |
| Suggested migration approach | Do not rewrite in the first product-separation slice. First document current behavior, then add product-context diagnostics. Later introduce vendor entry-point scoping and decide whether vendor auth remains in AMC auth or becomes separate. Any change must cover bid, assignment, report upload, invoice, document, and wrong-vendor smoke cases. |

### 9. `current_company_id()` JWT Claim Coupling

| Field | Detail |
| --- | --- |
| Current behavior | `current_company_id()` resolves `active_company_id` / `current_company_id` from JWT app metadata if the app user has active membership; current migrations also fall back to primary membership or `default_company_id()` for compatibility. Many RPCs and RLS policies use it as the active company boundary. |
| Why it exists | Company-scoped RLS/RPC governance needs one current company for reads and writes. The fallback preserved legacy single-company compatibility. |
| Risk level | Dangerous |
| Required future state | Product separation needs company context plus product context. Active company cannot be the only discriminator when one person may have separate Internal and AMC identities or when one company may own multiple product contexts. |
| Suggested migration approach | Add read-only product-context audit helpers before changing `current_company_id()`. Later introduce explicit product context claims or product-specific Supabase projects. Remove compatibility fallbacks only after all users have deterministic product/company bootstrap. |

### 10. Permission Resolution

| Field | Detail |
| --- | --- |
| Current behavior | `useEffectivePermissions()` calls `current_app_user_permission_keys()`. The backend resolves permissions from `user_role_assignments` for `current_company_id()`. `rpc_current_user_app_context()` returns active company, display profile, role assignments, and role flags for the same current company. |
| Why it exists | One permission hook can govern navigation, route guards, shell profile, and actions across the app. |
| Risk level | Hard |
| Required future state | Permission resolution must become product-aware. Internal permissions should not accidentally satisfy AMC entry requirements, and AMC permissions should not unlock Internal surfaces. |
| Suggested migration approach | Add product-context parameter support to read-only permission/context RPCs or add separate product-aware wrappers. Keep existing RPC signatures for compatibility until frontend routes and shell are product-context aware. |

### 11. Role Assignments And Company Memberships

| Field | Detail |
| --- | --- |
| Current behavior | `company_memberships` grants user-company membership. `user_role_assignments` grants role permissions per company. Vendor bootstrap can create/reactivate vendor-company membership and assign the `Vendor Admin` template role. AMC user-facing member projections can filter by `operations_scope`, but the core membership/role model is company-wide. |
| Why it exists | Falcon uses companies as the tenant boundary and roles as capability bundles. |
| Risk level | Hard |
| Required future state | Product context needs to be explicit in role applicability or auth/deployment context. Company membership alone cannot represent legal separation between Internal and AMC account contexts. |
| Suggested migration approach | Audit role templates for Internal-only, AMC-only, Vendor Workspace, and Client Portal use. Add compatibility product tags or product-scoped role metadata before changing enforcement. |

### 12. `operations_scope`

| Field | Detail |
| --- | --- |
| Current behavior | Orders and some clients/role projections use `operations_scope` values `internal_operations` and `amc_operations`. AMC procurement/execution RPCs require AMC-scoped orders. Frontend notification filtering also uses operations scope. |
| Why it exists | It prevents Internal and AMC work queues from bleeding into each other inside one app/company context. |
| Risk level | Hard |
| Required future state | `operations_scope` remains a compatibility/scoping mechanism, not the product/legal boundary. Separate product context must exist above it. |
| Suggested migration approach | Keep `operations_scope` in place through migration. Add product context to entry/auth/deployment. Later decide whether `operations_scope` remains as workflow classification inside AMC/Internal products or is replaced by product-owned datasets. |

### 13. Navigation Composition

| Field | Detail |
| --- | --- |
| Current behavior | `currentPrimaryNavLinks`, `currentShellNavigationSections`, and `workspaceNavigationDefinitions` change labels and visible nav entries based on `operationsMode` and permissions. AMC hides assignments, relationships, users, and my-work nav, but routes may still exist behind guards. |
| Why it exists | One navigation registry supports role-aware and workspace-aware presentation. |
| Risk level | Medium |
| Required future state | Navigation should be product-local by construction. Shared registries can remain, but Internal and AMC should load separate product definitions. |
| Suggested migration approach | Add a product-context argument to navigation composition while defaulting to current behavior. Then move Internal and AMC navigation definitions into product-specific registries or configs. |

### 14. Shared Shell And Branding

| Field | Detail |
| --- | --- |
| Current behavior | `src/layout/Layout.jsx` and `TopNav` are shared for Internal and AMC. `workspaceIdentity.js` changes labels, page chrome, document titles, and accent classes according to `operationsMode`. The login page still uses shared Falcon and Continental branding. |
| Why it exists | Same app, same session, and same shell originally hosted all operations modes. |
| Risk level | Medium |
| Required future state | Internal and AMC entry points should have separate product shell configuration, branding, document titles, and legal ownership presentation. |
| Suggested migration approach | Add product-context shell config before changing visual behavior. Later make AMC deployment/domain load AMC shell defaults and Internal deployment/domain load Internal shell defaults. |

### 15. Notifications In Shared Bell

| Field | Detail |
| --- | --- |
| Current behavior | `NotificationBell` is part of shared `TopNav`. It calls `rpc_get_notifications` with `p_operations_scope`, filters results client-side with `filterNotificationsForOperationsScope`, and opens order notifications to `/orders/:id` unless a safe link path exists. Realtime listens to `notifications` rows by user id. |
| Why it exists | The notification center predates product separation and needed workspace filtering without separate accounts. |
| Risk level | Hard |
| Required future state | Notifications must be product-aware and link to product-local routes/domains. AMC notifications should not point to Internal routes or appear in Internal product sessions. |
| Suggested migration approach | First require all notification payloads to carry product/context and product-safe `link_path`. Then make email and bell link resolution product-aware. Later split notification channels by product or auth context if deployments/auth separate. |

### 16. Email Link Base And Templates

| Field | Detail |
| --- | --- |
| Current behavior | `supabase/functions/email-worker/index.ts` uses `APP_BASE_URL`. `workerCore.ts` builds `order_url` from `link_path` or `/orders/:id`, and templates use `[Open Order]({order_url})`. Vendor bid email templates use `bid_invitation_url`. |
| Why it exists | One deployed app URL was enough when all operational links landed in one app. |
| Risk level | Dangerous |
| Required future state | Email URLs must be product-specific. Internal order emails, AMC order/procurement emails, Vendor Workspace emails, Client Portal emails, and public token links need separate base URL policy. |
| Suggested migration approach | Add product-aware URL builder inputs to notification/email payloads before changing delivery. Preserve legacy `APP_BASE_URL` as fallback. Then configure `INTERNAL_APP_BASE_URL`, `AMC_APP_BASE_URL`, `VENDOR_APP_BASE_URL`, and `CLIENT_PORTAL_APP_BASE_URL` or equivalent. |

### 17. Activity Feed And Audit Events

| Field | Detail |
| --- | --- |
| Current behavior | Activity is company/order scoped and rendered through shared operational surfaces such as `/activity` and order detail. AMC assignment/vendor events are increasingly RPC-owned but still share activity/logging concepts and current-company context. |
| Why it exists | Activity is a shared operational audit layer for orders and assignments. |
| Risk level | Medium |
| Required future state | Activity events must retain company/order safety and carry enough product context for product-local feeds and links. |
| Suggested migration approach | Audit activity payloads for missing `operations_scope` or product context. Add context fields additively. Do not split tables until reads and notifications are product-aware. |

### 18. Edge Function CORS And Origin Policy

| Field | Detail |
| --- | --- |
| Current behavior | Document and Vendor Workspace Edge Functions read `APP_ORIGIN`, `SITE_URL`, `PUBLIC_SITE_URL`, and `APP_URL` and allow configured origins. `set-active-company`, invite, and resend functions currently use wildcard `Access-Control-Allow-Origin: *`. |
| Why it exists | Local/staging/preview validation and shared app deployment needed flexible origins. |
| Risk level | Dangerous |
| Required future state | Origins must be product/deployment-specific. AMC and Internal deployments should not rely on broad wildcard CORS for auth-sensitive context mutation. |
| Suggested migration approach | Inventory each function by product surface. Add product-specific allowed origin lists while preserving staging. Tighten `set-active-company` only after Vendor Workspace bootstrap has a replacement strategy or explicit allowed origins. |

### 19. Vercel Rewrite And CSP

| Field | Detail |
| --- | --- |
| Current behavior | `vercel.json` rewrites almost every non-asset route to one `index.html`. CSP currently allows both known legacy and modern staging Supabase hosts in `connect-src`. One cron path runs `/api/cron/email-worker`. |
| Why it exists | Single-page app routing and mixed environment evidence during production-readiness work. |
| Risk level | Hard |
| Required future state | Internal and AMC deployments/domains need explicit environment classification, Supabase hosts, CSP, cron/email behavior, and rollback expectations. |
| Suggested migration approach | Create separate deployment/domain plan first. Then add preview proof for product-specific CSP and env vars before production. Do not remove existing hosts until deployed bundle evidence and authenticated smoke prove the active target. |

### 20. Supabase Auth Redirect URLs And Invitations

| Field | Detail |
| --- | --- |
| Current behavior | Invite Edge Functions derive `/accept-invite/:invitationId` from `APP_ORIGIN`, `SITE_URL`, `PUBLIC_SITE_URL`, or `APP_URL`; public Client Portal invitation flow uses current `window.location.origin` for auth redirect. Login return paths are path-only within the current app. |
| Why it exists | A single app origin could host invite acceptance, login, and portal onboarding. |
| Risk level | Dangerous |
| Required future state | Supabase Auth site URL, allowed redirect URLs, invite redirects, password reset redirects, and public token links must be separated by product/domain. |
| Suggested migration approach | Document redirect matrix for Internal, AMC, Vendor Workspace, and Client Portal. Add product-aware redirect builders and tests before changing Supabase dashboard settings. |

### 21. Data Model: AMC Ownership And Vendor Ownership

| Field | Detail |
| --- | --- |
| Current behavior | AMC orders are regular `orders` rows with `operations_scope = 'amc_operations'` owned by `company_id`. Vendor ownership is modeled through `company_vendor_profiles`, `company_relationships` of type `amc_vendor`, vendor company memberships, and vendor-scoped RPCs using `current_company_id()`. |
| Why it exists | The company model provided tenant isolation while `operations_scope` introduced AMC workflow classification. |
| Risk level | Hard |
| Required future state | AMC ownership should be product/account-context owned, with vendor companies clearly external to the AMC product and not part of Internal Operations. |
| Suggested migration approach | Keep current schema during transition. Add product ownership metadata or product-context views/RPCs additively. Later evaluate whether AMC requires a distinct Supabase project, schema namespace, company tree, or product-owned database. |

### 22. Public Token Routes

| Field | Detail |
| --- | --- |
| Current behavior | Public vendor bid invitations, assignment offers, assignment work, and Client Portal invitations are outside the shared authenticated layout but still live in the same SPA/deployment and Supabase project. |
| Why it exists | Public token flows needed lightweight access without logging into the main operations shell. |
| Risk level | Medium |
| Required future state | Public token routes need product-specific domains and link generation. Vendor public routes likely belong to AMC/Vendor context, not Internal. |
| Suggested migration approach | Preserve current token routes. Add product-aware URL generation and canonical domains before changing tokens or route paths. |

### 23. Staging And Smoke Automation

| Field | Detail |
| --- | --- |
| Current behavior | AMC staging scripts and Playwright commands target the approved staging profile and exercise Internal/AMC workspace separation in one app. Environment validation uses `FALCON_APP_BASE_URL`, `E2E_BASE_URL`, `AMC_STAGING_APP_URL`, `APP_URL`, `PUBLIC_SITE_URL`, or `SITE_URL`. |
| Why it exists | The MVP needed repeatable validation without production changes. |
| Risk level | Medium |
| Required future state | Smoke automation must classify product entry point, domain, Supabase project, and auth context explicitly. |
| Suggested migration approach | Add product-context parameters to smoke scripts after the architecture plan is accepted. Keep existing staging safeguards and production-ref refusal checks. |

## Route Classification Snapshot

| Route group | Current routes | Current guard model | Separation class |
| --- | --- | --- | --- |
| Public shared | `/login`, `/accept-invite/:invitationId` | No main shell; single Supabase auth project | Dangerous |
| Public AMC/vendor token | `/vendor/bid-invitations/:token`, `/vendor/assignment-offers/:token`, `/vendor/assignment-work/:token` | Public token pages in shared deployment | Medium |
| Vendor Workspace | `/vendor-workspace/*` | Auth session plus vendor bootstrap plus active company switch | Dangerous |
| Client Portal | `/client-portal/*` | Auth session plus portal permissions | Hard |
| Shared operations | `/dashboard`, `/orders*`, `/calendar`, `/activity`, `/clients*`, `/settings*` | `ProtectedRoute`, permissions, `WorkspaceRouteGuard` for operations group | Hard |
| AMC-only operations | `/vendors*`, `/client-requests` | `ProtectedRoute`, AMC workspace guard, permissions | Medium |
| Internal-only operations | `/my-work`, `/users` | `ProtectedRoute`, Internal workspace guard, permissions | Medium |
| Hidden enterprise | `/assignments*`, `/relationships*` | Permission guard, operations workspace guard, hidden-surface guard | Medium |

## Highest-Risk Separations

1. Auth/session split: one browser Supabase session currently owns all products.
2. Active company context: `set-active-company` mutates JWT metadata used by RLS/RPCs.
3. Vendor Workspace bootstrap: authenticated vendor access depends on active company switching.
4. Email links: the email worker currently has one app base URL fallback and many order links point
   to shared `/orders/:id`.
5. Deployment origin policy: Edge Function CORS and Vercel CSP are still shared-environment
   assumptions.
6. Permission resolution: current hooks and RPCs are company-scoped, not product-context scoped.

## Recommended Migration Order

1. Add a product-context architecture document and route/domain matrix before runtime changes.
2. Add product-context constants/config and no-op diagnostics while preserving existing behavior.
3. Add product-aware link builders for navigation, notification, and email payloads with legacy
   fallback.
4. Add product-aware route aliases and smoke coverage for AMC entry points.
5. Hide or constrain the workspace switcher by product context after routes and links are ready.
6. Design auth/session separation, including Supabase project choice, redirect URLs, user migration,
   Vendor Workspace bootstrap replacement, and rollback.
7. Only after staging proof, alter deployment/domain/CSP/auth settings.

## Non-Goals For This Audit

- No implementation changes.
- No schema migrations.
- No RLS changes.
- No route, auth, shell, navigation, notification, email, or Edge Function changes.
- No production or staging mutation.
- No removal of workspace switching.
