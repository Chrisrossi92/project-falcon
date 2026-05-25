# Production Smoke Test Checklist

## Purpose

Falcon should have a manual smoke test checklist for a future clean-production cutover before user
traffic is treated as moved. This checklist verifies that the final production environment can run
the critical governed app flows after migration replay, bootstrap, environment parity, storage,
Edge Function, auth, owner/company setup, and Vercel alignment have been completed.

This is a manual validation checklist. It does not add automated tests, change runtime behavior,
run migrations, change Supabase or Vercel settings, deploy Edge Functions, change storage policies,
change environment variables, mutate production data outside approved smoke fixtures, or alter
permissions/RLS.

Related doctrine:

- `docs/PRODUCTION_READINESS_AUDIT.md`
- `docs/PRODUCTION_MIGRATION_REPLAY_CHECKLIST.md`
- `docs/ENVIRONMENT_PARITY_CHECKLIST.md`
- `docs/PRODUCTION_BOOTSTRAP_PLAN.md`
- `docs/FINAL_PRODUCTION_CUTOVER_PLAN.md`
- `docs/OPERATIONAL_GOVERNANCE_SNAPSHOT.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

## Execution Rules

- Run this checklist only against an approved production dry-run, controlled production preview, or
  final production cutover window.
- Record environment, Supabase project ref, Vercel deployment id, Git commit/tag, tester, and date
  before starting.
- Use approved smoke-test companies, users, orders, and documents. Do not use real customer
  documents unless the cutover owner explicitly approves that data set.
- Stop and escalate on authentication, current-company, RLS, document storage, or order mutation
  governance failures.
- Do not repair failures by direct table writes or service-role shortcuts unless the incident owner
  explicitly declares a controlled bootstrap repair.

## Evidence Header

- Environment:
- Supabase project ref:
- Vercel deployment id / URL:
- Git commit / release tag:
- Tester:
- Date / time:
- Smoke company:
- Owner/admin user:
- Representative appraiser/reviewer user:
- Cross-company denial fixture, if available:

## Preview Evidence Gate

Before this checklist is used for production cutover, run a preview evidence gate against the
selected Supabase target.

Preview target classification:

- Preview deployment URL/domain:
- Preview deployment id:
- Git commit / release tag:
- Preview Supabase project ref:
- Target classification:
  - `modern-staging`;
  - `disposable-rehearsal`;
  - `final-candidate`;
  - `legacy-production`;
  - `unknown`.
- Data classification:
  - staging fixture;
  - disposable rehearsal;
  - final-candidate rehearsal;
  - legacy production compatibility;
  - unknown.

Preview CSP / bundle evidence:

- Preview CSP `connect-src` host(s):
- Expected Supabase host:
- Deployed bundle Supabase host evidence:
- Mixed legacy/modern host evidence:
- Browser console CSP/CORS errors:

Preview smoke requirements:

- unauthenticated app boot and protected-route handling;
- authenticated login/session smoke with approved smoke user;
- owner/admin current-company context and dashboard smoke;
- Orders, Clients, Calendar, Assignments, and representative detail route smoke;
- Team Access / Owner Setup smoke where safe fixture data exists;
- document upload/download/archive smoke only when storage/function evidence is approved for the
  selected target;
- browser network host review confirming no unexpected mixed legacy/modern Supabase calls.

Preview no-promotion criteria:

- preview target is `unknown`;
- preview `VITE_SUPABASE_URL` target cannot be classified by safe project ref;
- preview CSP does not allow the selected Supabase host;
- preview CSP allows unrelated Supabase hosts without documented reason;
- deployed bundle contains an unexpected Supabase host;
- owner/admin cannot authenticate or resolve current company;
- core route failures are not explained by known fixture gaps;
- storage/function smoke fails where document flows are in production scope;
- rollback/deployment history and env restoration remain unproven.

## Smoke Sections

### Login / Auth

- Test goal: Verify intended production users can authenticate and invalid or unintended sessions
  fail closed.
- Basic steps: Open the production deployment, sign in as owner/admin, sign out, then attempt an
  invalid login or expired invite path where safe.
- Expected result: Valid login reaches the app shell; invalid auth is denied without partial app
  context; redirects use the intended production URL.
- Failure notes / escalation: Block cutover and inspect Supabase Auth site URL, redirect URLs,
  Vercel env vars, auth callback routes, and user import/bootstrap state.

### Current Company Context

- Test goal: Confirm authenticated users resolve exactly one intended current company context.
- Basic steps: After login, load the app context, Owner Setup or dashboard, and one company-scoped
  route such as Orders.
- Expected result: The user has a current company, active membership, expected role context, and no
  cross-company rows in normal views.
- Failure notes / escalation: Block operational testing and inspect app-user mapping, memberships,
  role assignments, current-company helper behavior, and bootstrap seed state.

### Owner / Admin Access

- Test goal: Verify owner/admin can reach management and operational surfaces without bypassing
  governance.
- Basic steps: As owner/admin, load Owner Setup, dashboard, Orders, Team Access, activity,
  notifications, and an Order Detail record.
- Expected result: Authorized surfaces load; management affordances are present where expected;
  lifecycle/document/order writes still use governed actions.
- Failure notes / escalation: Escalate as a bootstrap or permission-seed issue. Check owner role
  assignment, template role permissions, and route guards.

### Team Access

- Test goal: Verify member management and invitation surfaces work in the production tenant.
- Basic steps: Open Team Access, list members, inspect a representative member row, and exercise
  invite/resend/cancel or role/status actions only if approved for the smoke window.
- Expected result: Member list is company-scoped; enabled actions use existing RPC/Edge paths; no
  unauthorized member data appears.
- Failure notes / escalation: Inspect Team Access RPC grants, invitation Edge Function secrets,
  redirect origin config, role update permissions, and owner invariant rules.

### Orders List

- Test goal: Confirm active operational order listing loads with governed visibility.
- Basic steps: Open `/orders`, search/filter using normal controls, and verify known active smoke
  orders appear while retired lifecycle rows do not appear in the active list.
- Expected result: Orders load with expected company scope, active lifecycle defaults, filter
  behavior, pagination/page size behavior, and no direct-write errors.
- Failure notes / escalation: Inspect order read views, current-company predicates, active-list
  lifecycle exclusion, frontend env target, and RLS/grants.

### Order Detail

- Test goal: Confirm a company-scoped order detail can be read safely.
- Basic steps: Open a known smoke order from the list, verify summary fields, participants,
  documents card, timeline, lifecycle notices, and navigation back to list.
- Expected result: Detail loads preserved safe metadata and authorized actions only; no raw storage
  paths or unauthorized joined data appears.
- Failure notes / escalation: Inspect order detail read projection/RPC, company scoping,
  relationship grants, document metadata shape, and route loader errors.

### Workflow Transitions

- Test goal: Verify canonical workflow status changes work only through governed transition paths.
- Basic steps: On an eligible smoke order, perform an approved workflow transition such as send to
  review, request revisions, approve review, ready for client, or complete as permissions allow.
- Expected result: Transition succeeds through canonical RPC behavior, refreshes status, records
  expected activity/notification behavior, and rejects unauthorized transitions.
- Failure notes / escalation: Inspect `rpc_transition_order_status(...)`, permission seeds,
  frontend workflow wrappers, activity logging, notification fanout, and status constraints.

### Lifecycle Actions: Archive / Cancel / Void

- Test goal: Confirm terminal lifecycle actions remain permissioned, preserved-history actions.
- Basic steps: On disposable smoke orders only, perform archive, cancel, and void where the current
  user has matching permissions and required reason input.
- Expected result: Each action uses its backend RPC, preserves order number/documents/activity,
  removes the order from active lists, and remains readable through approved historical/detail
  paths.
- Failure notes / escalation: Block lifecycle cutover confidence and inspect lifecycle RPC grants,
  permission seeds, active-list exclusion, activity writes, and preserved-history readback.

### Historical Orders

- Test goal: Verify retired lifecycle rows are available only through approved history readback.
- Basic steps: Open Historical Orders, locate archived/cancelled/voided smoke rows, and navigate to
  preserved Order Detail readback.
- Expected result: Historical rows load intentionally, active mutation controls are absent where
  unsupported, and restore/reopen/unarchive/hard-delete actions are not present.
- Failure notes / escalation: Inspect historical route gating, retired lifecycle read flags,
  source-scan guardrails, order read APIs, and RLS predicates.

### Print Packet

- Test goal: Verify print packet output is read-only and safe for operational review.
- Basic steps: Open Print Packet for a smoke order and inspect order details, lifecycle notices,
  document category counts, and printable layout.
- Expected result: Packet renders without mutation controls, signed URLs, raw storage internals, or
  file contents; counts and order metadata match the source order.
- Failure notes / escalation: Inspect print packet data mapping, document category count source,
  lifecycle notice handling, and unsafe field rendering.

### Secure Document Upload / Download / Archive

- Test goal: Verify private document governance works end to end.
- Basic steps: Upload an approved smoke document, confirm metadata appears in Order Detail Files,
  download through the app action, archive the document, and refresh.
- Expected result: Upload uses prepare/finalize, download uses signed Edge path, archive uses the
  backend RPC, metadata remains safe, and no public URL/storage path/object key is exposed.
- Failure notes / escalation: Block document cutover confidence and inspect bucket privacy,
  policies, document RPCs, Edge Function secrets/CORS, storage object creation, and function logs.

### Activity Timeline

- Test goal: Confirm operational history records and displays expected events safely.
- Basic steps: After workflow, lifecycle, document, and note actions, open the Order Detail timeline
  and verify relevant rows.
- Expected result: Timeline shows safe event labels, timestamps, actor context where available, and
  no raw payload dumps, storage internals, or mutation controls.
- Failure notes / escalation: Inspect activity RPCs/triggers, actor attribution, frontend timeline
  rendering, and event payload normalization.

### Notifications

- Test goal: Verify notification read and fanout behavior matches current doctrine.
- Basic steps: Trigger an action expected to notify a representative user, open the notification
  bell/list as recipient, mark read, and dismiss if supported.
- Expected result: Notifications are company/user scoped, link to approved routes, and read/dismiss
  actions use existing RPC paths.
- Failure notes / escalation: Inspect notification RPC grants, frontend fanout paths, assignment
  fanout helpers, recipient resolution, and notification preference state.

### Saved Views

- Test goal: Confirm saved views are read-only navigation presets.
- Basic steps: On Orders, list saved views, apply one, save the current allowlisted filter state as
  a new view, delete that view, and refresh.
- Expected result: Applying changes only URL/query state; save/delete use saved-view RPC wrappers;
  unknown, page, hidden, historical, or admin flags are not persisted.
- Failure notes / escalation: Inspect saved-view RPC grants, backend filter allowlist,
  frontend wrapper usage, direct table access guards, and URL/query-state mapping.

### Dashboard KPIs

- Test goal: Verify dashboard metrics reflect governed active operational data.
- Basic steps: Open the dashboard, compare visible KPI cards against known smoke data, and inspect
  links from KPI cards where available.
- Expected result: KPIs load without cross-company leakage, exclude archived/cancelled/voided rows
  from active metrics, and link into governed list/detail surfaces.
- Failure notes / escalation: Inspect dashboard data sources, active lifecycle filters, current
  company predicates, and drill-link query state.

### Workload Visibility

- Test goal: Verify workload views reflect assigned work for representative operational roles.
- Basic steps: Sign in as owner/admin and representative appraiser/reviewer users, then inspect
  workload/queue/list visibility for assigned smoke orders.
- Expected result: Owner/admin sees expected company workload; appraiser/reviewer users see only
  permitted assigned/readable work; no unrelated company workload appears.
- Failure notes / escalation: Inspect assignment/participant fields, order read permissions,
  workload query predicates, role permissions, and current-company context.

### Filtering / Drill Links

- Test goal: Confirm filters and dashboard/list drill links preserve governed query behavior.
- Basic steps: Apply status/search/client/appraiser/reviewer/due/queue/page-size filters, use
  dashboard drill links, then refresh and navigate back/forward.
- Expected result: URL/query state remains canonical, visible results match allowed filters, and no
  hidden historical/admin flags are injected.
- Failure notes / escalation: Inspect query parsing, filter allowlists, dashboard link builders,
  Saved Views apply behavior, and active-list lifecycle defaults.

### Permission Denial Checks

- Test goal: Verify unauthorized users fail closed without partial mutation or leaked data.
- Basic steps: As a lower-permission representative user, attempt disallowed lifecycle actions,
  workflow transitions, Team Access management, document archive, and restricted reads where safe.
- Expected result: UI hides or disables unavailable actions where expected, backend denies direct
  attempts, and no order/document/member mutation occurs.
- Failure notes / escalation: Inspect frontend permission gates, backend permissions, RPC
  authorization, RLS policies, and audit logs for unexpected side effects.

### RLS / Company Isolation Spot Checks

- Test goal: Verify company isolation holds for representative reads and writes.
- Basic steps: With a cross-company fixture, attempt to open another company's order/detail,
  document, saved view, notification, member, or activity route/API result where safe.
- Expected result: Cross-company data is not visible or mutable; direct table access remains
  blocked where RPC-only doctrine requires it; service-role shortcuts are not used by the frontend.
- Failure notes / escalation: Block cutover and inspect RLS policies, current-company helpers,
  view predicates, RPC ownership checks, grants, and frontend environment targeting.

## Closeout

- Record pass/fail for every section.
- Attach screenshots, logs, request ids, or SQL verification snippets only where approved.
- Classify failures as blocker before cutover, needs verification, or deferred post-MVP hardening.
- Do not proceed to traffic cutover until authentication, current-company context, RLS/company
  isolation, document storage governance, order read/write governance, and rollback references are
  accepted by the cutover owner.
