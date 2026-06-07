# AMC-18 Pilot Smoke Validation

Run date: 2026-06-07.

## Scope

AMC-18 is a validation checkpoint for `falcon-amc-pilot-candidate-1`, not a feature phase.

Candidate refs:

- RC2 baseline tag: `falcon-amc-rc2` at `f37ee01`.
- Pilot candidate tag: `falcon-amc-pilot-candidate-1` at `e8db731`.

Completed since RC2:

- AMC-14B Workspace Isolation.
- AMC-15 Visual Separation.
- AMC-16 Permission Center.
- AMC-17 Client Portal MVP.

## Existing Smoke And Test Coverage

### Internal Operations

Existing coverage:

- `src/pages/orders/__tests__/Orders.test.jsx`
- `src/pages/orders/__tests__/OrderDetail.test.jsx`
- `src/lib/services/__tests__/ordersServiceCreateOrderViaRpc.test.js`
- `src/features/orders/__tests__/actionsAssignment.test.js`
- `src/features/orders/operational-inputs/__tests__/orderOperationalInputsApi.test.js`
- `src/features/orders/operational-inputs/__tests__/OperationalInputsCreateClearControls.test.jsx`
- `src/features/orders/operational-inputs/__tests__/OperationalInputsReadOnly.test.jsx`
- `src/pages/__tests__/Activity.test.jsx`
- `src/components/notifications/__tests__/NotificationBell.test.jsx`

### AMC Operations

Existing coverage:

- `npm run amc:smoke:fixtures:load`
- `npm run amc:smoke:edge`
- `npm run amc:staging:runtime:check`
- `npm run amc:staging:fixtures:load`
- `npm run amc:staging:smoke:happy`
- `npm run amc:staging:smoke:edge`
- `src/lib/permissions/__tests__/amcSmokeFixtureLoad.test.js`
- `src/lib/permissions/__tests__/amcEdgeSmokeRegression.test.js`
- `src/lib/permissions/__tests__/amcStagingRuntimeCatchUpPlan.test.js`
- `src/lib/permissions/__tests__/amcStagingSmokeFixtureLoad.test.js`
- `src/lib/permissions/__tests__/amcStagingHappySmokeRunner.test.js`
- `src/lib/permissions/__tests__/amcStagingEdgeSmokeRunner.test.js`
- AMC migration/static tests under `src/lib/permissions/__tests__/*amc*.test.js`.

### Vendor Workspace

Existing coverage:

- `src/features/vendorWorkspace/__tests__/VendorWorkspaceShell.test.jsx`
- `src/features/vendorWorkspace/__tests__/vendorWorkspaceApi.test.js`
- `src/routes/__tests__/WorkspaceRouteGuard.test.jsx`
- `src/lib/permissions/__tests__/vendorWorkspace*Migration.test.js`
- `src/lib/permissions/__tests__/vendorAssignment*Migration.test.js`
- `src/lib/permissions/__tests__/bid*Migration.test.js`

Known prior warning:

- A broad aggregate Vendor Workspace run previously showed an intermittent loading-state flake.
  Focused reruns of the affected Vendor Workspace tests passed. If this recurs in AMC-18, isolate
  it with focused Vendor Workspace route/API suites before treating it as a product blocker.

### Client Portal

Existing coverage:

- `src/features/clientPortal/__tests__/clientPortalApi.test.js`
- `src/features/clientPortal/__tests__/ClientPortalPages.test.jsx`
- `src/features/clientRequests/__tests__/clientRequestsApi.test.js`
- `src/features/clientRequests/__tests__/ClientOrderRequestsPage.test.jsx`
- `src/routes/__tests__/ClientPortalRouteGuard.test.jsx`
- `src/lib/permissions/__tests__/clientPortalSafeOrderReadModelMigration.test.js`

Client Portal MVP path covered by targeted tests:

```text
request intake
  -> staff review inbox
  -> staff-confirmed conversion
  -> linked operational order
  -> client-safe tracking
  -> final report availability/download authorization
```

### Workspace Switching And Isolation

Existing coverage:

- `src/routes/__tests__/WorkspaceRouteGuard.test.jsx`
- `src/routes/__tests__/ClientPortalRouteGuard.test.jsx`
- `src/routes/__tests__/DefaultWorkspaceRedirect.test.jsx`
- `src/routes/__tests__/V1HiddenSurfaceRouteGuard.test.jsx`
- `src/lib/routes/__tests__/routeCompositionDiagnostics.test.js`
- `src/lib/workspace/__tests__/workspaceSwitchReset.test.js`
- `src/lib/workspace/__tests__/workspaceIdentity.test.js`
- `src/lib/operations/__tests__/OperationsModeProvider.test.jsx`
- `src/lib/operations/__tests__/operationsMode.test.js`
- `src/lib/operations/__tests__/operationAccess.test.js`

### Permission Center

Existing coverage:

- `src/pages/admin/__tests__/UsersIndex.test.jsx`
- `src/features/company-members/__tests__/permissionCenterModel.test.js`
- `src/features/company-members/__tests__/permissionOverrideVisibility.test.js`
- `src/lib/permissions/__tests__/permissionConstants.test.js`
- operation role-scope tests in `src/lib/permissions/__tests__/operationRoleScopeAudit.test.js`.

### Notification, Search, Activity Isolation

Existing coverage:

- `src/lib/notifications/__tests__/notificationWorkspaceScope.test.js`
- `src/lib/permissions/__tests__/notificationWorkspaceScopeMigration.test.js`
- `src/components/nav/__tests__/CommandPalette.test.jsx`
- `src/lib/commandPalette/__tests__/currentCommandPaletteCommands.test.js`
- `src/lib/commandPalette/__tests__/currentShellCommandPaletteCommands.test.js`
- `src/lib/commandPalette/__tests__/commandPaletteComposition.test.js`
- `src/lib/commandPalette/__tests__/commandPaletteParityDiagnostics.test.js`
- `src/pages/__tests__/Activity.test.jsx`
- `src/components/activity/__tests__/ActivityLog.test.jsx`

## Validation Plan

Full local validation:

```bash
npm test
npm run build
npm run lint
git diff --check
```

Focused smoke validation:

```bash
npx vitest run \
  src/pages/orders/__tests__/Orders.test.jsx \
  src/pages/orders/__tests__/OrderDetail.test.jsx \
  src/lib/services/__tests__/ordersServiceCreateOrderViaRpc.test.js \
  src/features/orders/__tests__/actionsAssignment.test.js \
  src/features/orders/operational-inputs/__tests__/orderOperationalInputsApi.test.js \
  src/features/orders/operational-inputs/__tests__/OperationalInputsCreateClearControls.test.jsx \
  src/features/orders/operational-inputs/__tests__/OperationalInputsReadOnly.test.jsx \
  src/lib/permissions/__tests__/amcSmokeFixtureLoad.test.js \
  src/lib/permissions/__tests__/amcEdgeSmokeRegression.test.js \
  src/lib/permissions/__tests__/amcStagingHappySmokeRunner.test.js \
  src/lib/permissions/__tests__/amcStagingEdgeSmokeRunner.test.js \
  src/features/vendorWorkspace/__tests__/vendorWorkspaceApi.test.js \
  src/features/vendorWorkspace/__tests__/VendorWorkspaceShell.test.jsx \
  src/features/clientPortal/__tests__/clientPortalApi.test.js \
  src/features/clientPortal/__tests__/ClientPortalPages.test.jsx \
  src/features/clientRequests/__tests__/clientRequestsApi.test.js \
  src/features/clientRequests/__tests__/ClientOrderRequestsPage.test.jsx \
  src/pages/admin/__tests__/UsersIndex.test.jsx \
  src/features/company-members/__tests__/permissionCenterModel.test.js \
  src/features/company-members/__tests__/permissionOverrideVisibility.test.js \
  src/lib/permissions/__tests__/operationRoleScopeAudit.test.js \
  src/routes/__tests__/WorkspaceRouteGuard.test.jsx \
  src/routes/__tests__/ClientPortalRouteGuard.test.jsx \
  src/routes/__tests__/DefaultWorkspaceRedirect.test.jsx \
  src/routes/__tests__/V1HiddenSurfaceRouteGuard.test.jsx \
  src/lib/routes/__tests__/routeCompositionDiagnostics.test.js \
  src/lib/workspace/__tests__/workspaceSwitchReset.test.js \
  src/lib/operations/__tests__/OperationsModeProvider.test.jsx \
  src/lib/notifications/__tests__/notificationWorkspaceScope.test.js \
  src/components/nav/__tests__/CommandPalette.test.jsx \
  src/pages/__tests__/Activity.test.jsx
```

Optional live local AMC smoke, only if local Supabase is running and disposable reset is approved:

```bash
npm run supabase:reset:local
npm run amc:smoke:fixtures:load
npm run amc:smoke:edge
```

## Results

### Full Local Validation

| Check | Result | Notes |
| --- | --- | --- |
| `npm test` | Pass | 214 test files passed; 1,836 tests passed. |
| `npm run build` | Pass | Vite production build completed. Existing warnings remain for Tailwind ambiguous `ease-[${EASING}]` and chunk size over 500 kB. |
| `npm run lint` | Pass with warnings | ESLint returned 0 errors and 109 warnings, primarily existing unused React imports and hook dependency warnings. |
| `git diff --check` | Pass | No whitespace errors. |
| `git diff --cached --check` | Pass | No staged whitespace errors. |
| Markdown lint | Not available | No markdown lint script or markdownlint config was found in the repo. |

Stale deterministic test expectations fixed during AMC-18:

```bash
npx vitest run \
  src/features/dashboard/__tests__/DashboardPage.test.jsx \
  src/lib/navigation/__tests__/currentPrimaryNavLinks.test.js \
  src/lib/navigation/__tests__/currentShellMobileNavigationLinks.test.js \
  src/lib/navigation/__tests__/currentShellNavigationSections.test.js \
  src/lib/navigation/__tests__/shellNavigationGroups.test.js
```

Result:

- Pass.
- 5 test files passed.
- 51 tests passed.

Fixed expectations:

- Dashboard labels now assert AMC-15 workspace identity copy:
  - `Appraisal Production Dashboard`.
  - `Falcon AMC Dashboard`.
  - `Continental Internal Operations`.
  - `Falcon AMC`.
- Navigation labels now assert workspace-specific chrome while preserving the existing route and
  permission assertions:
  - Internal: `Client Orders`, `Staff Assignments`, `Review Workflow`,
    `Client Relationships`, `Staff Directory`.
  - AMC: `Procurement`, `Assignment Oversight`, `Vendor Network`, `Client Services`.
  - Internal shell Operations still intentionally resolves the `users` link label to `Users`
    in role-intent contexts.

Vendor Workspace aggregate flake status:

- Did not reappear in the final full `npm test` run.
- Focused Vendor Workspace coverage also passed as part of the focused AMC-18 pilot smoke set.

### Focused Pilot Smoke Validation

The focused smoke command in the validation plan passed.

Result:

- 31 test files passed.
- 403 tests passed.

Coverage proven by the focused smoke run:

- Internal order workflow.
- AMC smoke fixture/edge/staging runner static coverage.
- Vendor Workspace API and shell behavior.
- Client Portal request intake, staff review, conversion, tracking, report availability, and report
  download authorization.
- Permission Center read/edit/review/save coverage.
- Workspace switch/reset/isolation.
- Route ownership guards.
- Notification/search/activity isolation.

### Live Local AMC Smoke

Not run in this checkpoint.

The repeatable live local sequence remains:

```bash
npm run supabase:reset:local
npm run amc:smoke:fixtures:load
npm run amc:smoke:edge
```

This sequence requires a disposable local Supabase reset. It was not run during this checkpoint
because it is a hands-on database/browser smoke pass that should be run as the next local pilot
simulation step after the automated gate.

## Decision

Pilot candidate validation is green at the automated test/build/lint level.

Current status:

- Focused AMC-18 pilot smoke coverage is green.
- Build and lint are green, with warnings only.
- Whitespace checks are green.
- Full `npm test` is green after updating stale AMC-15 dashboard/navigation test expectations.
- The known Vendor Workspace aggregate-run loading flake did not reappear in the final full-suite
  run.

Remaining recommended validation before push/deploy:

1. Run the live disposable local AMC smoke sequence or explicitly schedule it as the final pre-push
   local database smoke.
2. Continue tracking the Vendor Workspace aggregate loading flake if it appears again in broad
   suite execution.
