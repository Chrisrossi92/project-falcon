# AMC Create Route Readiness

## Purpose

This readiness check verifies whether Falcon can safely register `/amc/orders/new` after the
recent AMC create-order scope, existing-client-only, and client-picker scope slices.

This document is analysis only. It does not register routes, change navigation, alter auth,
modify runtime behavior, apply migrations, or change notification/email behavior.

Related documents:

- `docs/architecture/AMC_ORDER_MUTATION_BOUNDARY_AUDIT.md`
- `docs/architecture/AMC_PRODUCT_ROUTE_ALIAS_PLAN.md`
- `docs/architecture/AMC_PRODUCT_SEPARATION_AUDIT.md`
- `docs/amc/AMC_FULL_MVP_SMOKE_TEST_PLAN.md`

## Executive Finding

Recommendation: **A. `/amc/orders/new` is registered for guarded validation. Do not wire global
navigation, email links, or notification links yet.**

Most frontend blockers have been removed, and the intended user path is now close:

- `AmcNewOrderPage` is registered at `/amc/orders/new` behind the existing AMC workspace guard.
- The wrapper passes `operationsScope="amc_operations"`.
- The wrapper disables inline manual client creation through `allowInlineClientCreation={false}`.
- `OrderForm` forwards explicit `operationsScope` into create and client picker calls.
- `createOrderViaRpc` can pass `p_operations_scope = 'amc_operations'`.
- `rpc_create_order` now explicitly writes `operations_scope`, defaults omitted scope to
  `internal_operations`, rejects invalid scopes, restricts create status to `new`, and rejects
  client/AMC attachments that are incompatible with the requested operations scope.
- `rpc_order_form_client_options` and `rpc_order_form_client_name_search` now support explicit
  operations-scope filtering for picker/search results.
- The post-create AMC wrapper redirects to `/amc/orders/:id`, which is already registered.

The prior backend authority blocker has a source-level fix in
`supabase/migrations/20260624102000_rpc_create_order_attachment_scope_guards.sql`. The first AMC
create route alias is now registered for focused validation only. Global navigation, email links,
notification links, workspace switcher behavior, and canonical productLinks live usage remain
unchanged.

## Readiness Matrix

| Category | Status | Finding | Required next step |
| --- | --- | --- | --- |
| Create scope safety | **READY** | `rpc_create_order(payload, p_operations_scope)` now writes explicit scope, defaults omitted scope to Internal, accepts AMC, rejects invalid scopes, allowlists create status to `new`, and rejects selected client/AMC ids that fail `client_relationship_has_operations_scope(...)`. Client contacts remain constrained to the selected client, current company, and active status; because contacts do not carry an independent operations-scope column, the selected client's scope boundary is the authority. | Keep staging replay/smoke evidence current before linking navigation to the route. |
| Client picker safety | **READY** | Picker and duplicate search RPCs are current-company guarded and now filter through `client_relationship_has_operations_scope(...)` when `operationsScope` is explicit. The default no-scope behavior remains compatible for `/orders/new`. | Keep backend create validation as the final authority. |
| Existing-client-only protection | **READY** | `AmcNewOrderPage` disables inline manual client creation and requires selecting an existing client. The create RPC now also rejects wrong-scope selected client/AMC ids before insert, so the picker is no longer the only authority boundary. | Keep inline creation disabled for the first AMC create route. |
| Notifications | **READY** | `rpc_create_order` does not insert notification rows, call `rpc_notification_create`, emit `pg_notify`, or change email delivery behavior. Registering the route would not, by itself, wire live product-aware notification/email links. | Keep create-side notification fanout absent or add it only in a later backend-owned product-aware slice. |
| Activity entries | **READY** | The create RPC does not insert activity or activity-log rows. This avoids unsafe payload/link behavior for the first direct create alias. | If create activity is later required, add backend-owned activity with safe product-scoped payload tests. |
| Post-create redirects | **READY** | `AmcNewOrderPage` redirects successful creates to `/amc/orders/:id` and falls back to `/amc/orders`. Both target aliases are already registered. | Keep global navigation unchanged until smoke passes. |
| Order detail routes | **READY** | `/amc/orders` and `/amc/orders/:id` are registered with AMC workspace guards and local path-aware order navigation. Internal mode does not render the AMC order aliases under existing tests. | Run browser smoke after route registration to verify detail load, document visibility, and procurement panels with a created AMC order. |
| `/amc/orders/new` route readiness | **READY FOR GUARDED ROUTE VALIDATION** | Frontend mechanics, picker scope, backend attachment scope guards, and focused route/render/create-path tests now exist. The route is registered behind the AMC workspace guard and create permission. | Keep navigation/email/notification links unwired until staging smoke evidence is current. |

## Evidence Reviewed

### AMC create wrapper

`src/pages/orders/AmcNewOrderPage.jsx` renders `OrderForm` with:

- `operationsScope="amc_operations"`
- `allowInlineClientCreation={false}`
- post-save navigation to `/amc/orders/:id` or `/amc/orders`

The wrapper is registered in `src/routes/index.jsx` at `/amc/orders/new` behind
`ProtectedRoute requiredPermission={PERMISSIONS.ORDERS_CREATE}` and
`WorkspaceRouteGuard workspace={ROUTE_WORKSPACES.AMC}`.

### OrderForm operations scope flow

`OrderForm` accepts `operationsScope` and:

- passes it to `ClientFields`;
- passes it into duplicate search when explicit;
- passes it to `createOrderViaRpc(payload, { operationsScope })` on create;
- preserves existing `/orders/new` behavior when omitted.

`allowInlineClientCreation={false}` forces existing-client selection before create.

### Create service

`createOrderViaRpc(payload, { operationsScope })`:

- preserves legacy/default behavior by omitting `p_operations_scope` unless explicit;
- passes `p_operations_scope = 'amc_operations'` when requested;
- rejects invalid frontend scopes before the RPC call.

### Create RPC migration

`supabase/migrations/20260624100000_amc_create_order_scope_contract.sql`:

- replaces `rpc_create_order(payload jsonb)` with
  `rpc_create_order(payload jsonb, p_operations_scope text default null)`;
- defaults null scope to `internal_operations`;
- accepts only `internal_operations` and `amc_operations`;
- explicitly inserts `operations_scope`;
- rejects invalid create status values except `new`;
- keeps current-company client, managing AMC, and client contact guards;
- rejects client and managing AMC ids that are incompatible with the requested operations scope;
- does not add notification/email/activity fanout.

Contact scope note: `client_contacts` are still validated by selected client, current company, and
active status. They do not carry an independent operations-scope field, so the selected client's
scope compatibility is the current boundary.

### Client picker migration

`supabase/migrations/20260624101000_order_form_client_options_operations_scope.sql`:

- adds optional `p_operations_scope text default null` to `rpc_order_form_client_options`;
- adds optional `p_operations_scope text default null` to
  `rpc_order_form_client_name_search`;
- preserves null/default compatibility behavior;
- rejects invalid scopes;
- filters explicit scopes with `client_relationship_has_operations_scope(...)`;
- returns `operations_scope` metadata for diagnostics.

### Contract tests

Focused source and service tests now cover:

- create RPC scope contract and route registration through `AmcNewOrderPage`;
- client option/search scope contract and route registration through `AmcNewOrderPage`;
- service-level create scope opt-in;
- service-level client picker scope opt-in;
- OrderForm scope propagation;
- AMC wrapper existing-client-only mode;
- `/orders/new` compatibility remains unchanged;
- `/amc/orders/new` is blocked in Internal Operations mode.

These tests are source/unit-level. They do not prove a migrated database target has applied the new
RPC signatures.

## Remaining Blockers

1. **Migration replay evidence.**
   The new create and client-picker migrations have source tests, but this readiness slice did not
   run a local Supabase reset/replay or approved staging verification.

2. **Staging smoke proof.**
   Focused route tests now prove the page renders under AMC guards, uses the AMC wrapper, preserves
   `/orders/new`, and remains unavailable in Internal mode. Staging smoke is still needed before
   navigation links point to the route.

3. **Browser smoke before navigation.**
   Even after route registration, keep global navigation unchanged until browser smoke verifies
   order create, detail load, document/procurement surfaces, and Internal-vs-AMC isolation.

## Local Migration Replay Readiness Check

Status: **Blocked by local Docker socket access; source and ordering checks passed.**

Attempted command:

```bash
npm run supabase:reset:local
```

Result:

- The repo's documented local reset wrapper was selected instead of raw `supabase db reset`.
- The wrapper targets local Docker-backed Supabase and includes the documented local-only Storage
  bootstrap behavior.
- The command failed before migration replay because the execution sandbox could not connect to the
  local Docker daemon socket at `/Users/christopherrossi/.docker/run/docker.sock`.
- Granting filesystem access to the socket for this turn did not resolve the sandbox-level Docker
  connection denial.
- No database replay result was produced, and this check did not touch staging or production.

Fallback checks completed:

- Verified the three recent AMC create migrations exist:
  - `20260624100000_amc_create_order_scope_contract.sql`
  - `20260624101000_order_form_client_options_operations_scope.sql`
  - `20260624102000_rpc_create_order_attachment_scope_guards.sql`
- Verified migration filename order is correct: create scope contract, then client picker scope,
  then attachment scope guards.
- Re-ran focused source/service/form tests for create scope, client picker scope, OrderForm scope
  propagation, and the unregistered AMC create wrapper.
- `git diff --check` passed.

Decision impact:

- `/amc/orders/new` is registered for guarded validation, but the blocked replay check remains
  residual risk before navigation promotion.
- The next slice should rerun `npm run supabase:reset:local` in an environment with Docker socket
  access, or run an equivalent disposable/local Supabase replay, before broader promotion.

## Route Registration And Smoke Status

Status: **Registered for guarded validation; staging happy-path smoke passed.**

Route registration:

- `/amc/orders/new` is registered in `src/routes/index.jsx`.
- The route uses `AmcNewOrderPage`.
- The route is protected by `PERMISSIONS.ORDERS_CREATE`.
- The route is wrapped with `WorkspaceRouteGuard workspace={ROUTE_WORKSPACES.AMC}`.
- `/orders/new` remains registered to `NewOrder` through the shared operations workspace guard.
- No global navigation, email, notification, workspace switcher, or canonical productLinks wiring
  was changed.

Focused tests now prove:

- `/amc/orders/new` renders the AMC create wrapper in AMC Operations mode.
- `/amc/orders/new` does not render in Internal Operations mode.
- `/orders/new` remains the compatibility create route and does not render the AMC wrapper.
- `AmcNewOrderPage` renders `OrderForm` with `operationsScope="amc_operations"`.
- `AmcNewOrderPage` renders `OrderForm` with `allowInlineClientCreation={false}`.
- Successful AMC create redirects to `/amc/orders/:id`.
- Navigation registry tests still leave the live New Order navigation path at `/orders/new`.
- Canonical route mode remains guarded from live callers.

Staging smoke:

```bash
set -a
. ./.env.staging.local
set +a
npm run amc:staging:smoke:happy
```

Result: **PASS** against approved AMC staging harness. The smoke completed owner/vendor auth,
candidate matching, bid submission, bid selection, assignment offer, vendor acceptance, assigned
work, report upload/submission, revision/resubmission, invoice submission, invoice approval,
payment scheduling, mark paid, and vendor payment visibility with no defects.

Scope note: this was the existing staging happy-path smoke. It validates the broader AMC
procurement/execution loop, but it is not a browser-level `/amc/orders/new` direct-create smoke.

## Direct Create Browser Smoke

Status: **Smoke added; local execution blocked by Playwright Chromium launch permissions.**

Smoke file:

- `e2e/amc/amc-direct-create-smoke.spec.ts`

Command:

```bash
set -a
. ./.env.staging.local
set +a
E2E_BASE_URL=https://falcon-staging.therossicompany.com npm run e2e:amc:direct-create:staging
```

The smoke follows the existing AMC staging conventions:

- requires `E2E_TARGET=staging` and `E2E_ALLOW_STAGING=1`;
- validates the approved AMC staging Supabase ref through existing helpers;
- refuses production-like app/Supabase targets through Playwright and staging helper checks;
- uses disposable `example.test` smoke credentials and data.

The smoke covers:

- AMC owner/admin login;
- AMC Operations mode selection;
- direct navigation to `/amc/orders/new`;
- inline/manual client creation unavailable;
- existing AMC-visible disposable client selection;
- minimum order field entry;
- create submission;
- redirect to `/amc/orders/:id`;
- created order detail load;
- database verification that the created order is `amc_operations`;
- Internal Operations mode denial for `/amc/orders/new`.

Execution result in this Codex environment:

- Initial run found and fixed a smoke setup issue: the disposable client lookup now respects the
  global client-name uniqueness constraint and the spec runs serially.
- Re-run was blocked before browser navigation because Playwright Chromium failed to launch with a
  macOS Mach port permission denial:
  `bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer... Permission denied (1100)`.
- Because no browser page opened, this is not evidence that `/amc/orders/new` passed direct-create
  smoke.

Decision impact:

- `/amc/orders/new` remains registered for guarded validation only.
- Do not wire AMC New Order navigation yet.
- Re-run the command above in a browser-capable local/CI environment before promoting navigation.

## Decision

`/amc/orders/new` is registered for guarded validation. Do **not** wire it into navigation, email,
notifications, or workspace switching until direct-create browser smoke passes.

The safest next implementation slice is direct-create browser smoke and promotion preparation:

- verify/replay the create and client-picker migrations in a safe target if local replay remains
  unavailable;
- add or run a browser/direct-create smoke for `/amc/orders/new` with an existing AMC-visible
  client;
- keep global navigation, email, notification links, and workspace switcher behavior unchanged;
- wire navigation to the new route only after direct-create smoke evidence is current.
