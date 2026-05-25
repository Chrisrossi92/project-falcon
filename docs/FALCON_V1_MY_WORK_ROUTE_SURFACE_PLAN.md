# Falcon v1 My Work Route Surface Plan

## Purpose

This document defines whether and how `My Work` should become a dedicated staff appraiser
execution surface instead of remaining only a dashboard-fed preview.

The goal is to preserve the safety and data discipline of B1.1 while giving appraisers a
purpose-built place to answer:

> What do I need to do today?

This phase is planning only. It does not implement runtime code, route changes, navigation changes,
permission changes, workflow changes, Smart Action changes, data/query changes, backend changes,
schema changes, Supabase changes, AMC work, Client Portal work, automation, AI work, or production
data changes.

## Current B1.1 State

B1.1 introduced the first runtime My Work foundation through the existing dashboard-fed workbench
preview.

Current behavior:

- `My Work` is rendered through the dashboard/workbench preview path;
- the surface receives existing assigned order rows already loaded by the dashboard;
- grouping is client-side and presentation-only;
- the current zones are `Priority Work`, `Due Soon / Overdue`, `Revisions Required`,
  `Upcoming Inspections`, `Waiting / Blocked Context`, and `Lower-Priority Work`;
- work items link to existing order detail routes when row ids are present;
- no new route, query, permission, workflow action, Smart Action behavior, backend, schema, or
  Supabase behavior was added.

B1.1 proves the surface language and first hierarchy, but it is still dependent on the dashboard
container rather than owning a dedicated appraiser execution page.

## Required v1 Behavior

For v1, My Work should become a clearly appraiser-native operational surface when shell/navigation
review confirms the route is safe.

Required behavior:

- answer today's appraiser execution question before showing broad dashboard context;
- prioritize assigned work, due pressure, revision pressure, inspection context, and waiting or
  blocked context;
- use the same governed order visibility and assigned-work rows already available to the appraiser;
- link into existing Order Detail surfaces for deeper work;
- preserve the current shell hierarchy where the left rail owns operational movement;
- avoid becoming an owner/admin dashboard clone.

The dedicated route should make My Work feel like a daily workstation, not a renamed dashboard.

## Data Source Strategy

The first dedicated My Work route should use existing governed rows only.

Data rules:

- reuse the current dashboard/order summary data path where it already returns appraiser-readable
  assigned rows;
- do not add a new backend endpoint, RPC, view, schema object, or Supabase policy;
- do not broaden order visibility;
- do not infer hidden priority authority from unavailable data;
- keep grouping client-side and explainable from fields already present in the row set;
- defer operational-input, readiness, review-feedback, and activity enrichment unless those data
  are already safely available to the route through existing governed read paths.

The route may extract shared grouping/presentation helpers from the B1.1 preview only if that
reduces duplication without changing data authority.

## Route / Navigation Expectations

The route should be introduced only when route and shell behavior can remain behavior-preserving.

Route expectations:

- prefer a stable internal path such as `/my-work` only after route ownership is approved;
- preserve existing `Orders` and `Dashboard / Operations` routes;
- do not remove or retarget existing dashboard behavior as part of the route foundation;
- keep route guards and permission checks aligned with existing appraiser-readable order access;
- hide the route from users who should not see the `My Work` lane through existing nav visibility
  rules.

Navigation expectations:

- the left operational rail should highlight `My Work` when the dedicated route is active;
- the top utility bar must not reintroduce My Work route navigation;
- command/search may eventually include `Open My Work` only through existing command palette
  authority patterns;
- mobile navigation should preserve the same route label and not expose broader route inventory.

## Relationship To Dashboard / Operations Command

`Dashboard / Operations` and `My Work` should remain distinct.

Dashboard / Operations:

- owner/admin operational overview;
- broader operational health and queue context;
- management-oriented scanning;
- cross-role awareness where permissions allow.

My Work:

- staff appraiser daily execution;
- assigned-work priority;
- due/revision/inspection pressure;
- next-work orientation.

If B1.1 preview remains on Dashboard while a dedicated route exists, it should become a compact
entry or summary, not a second full My Work surface. Avoid duplicate full surfaces that force
appraisers to choose between two versions of the same answer.

## Appraiser-First Layout Requirements

The dedicated My Work route should preserve and strengthen the B1.1 hierarchy.

Primary layout requirements:

- priority work leads the page;
- due soon and overdue work remain visually near the top;
- revisions required must read as active appraiser work;
- upcoming inspections should appear only when existing row data supports it;
- waiting or blocked context should remain evidence/context, not workflow status authority;
- lower-priority work should be quieter and below immediate pressure lanes.

The page should avoid:

- generic dashboard widgets;
- broad analytics cards;
- route inventory;
- equal-weight card grids;
- placeholder modules for future AMC, AI, automation, or notifications.

## Explicit Non-Goals

B1.2 route/surface planning does not authorize:

- runtime implementation;
- backend changes;
- schema changes;
- Supabase changes;
- new RPCs or views;
- data/query authority changes;
- workflow/action changes;
- Smart Action behavior changes;
- permission changes;
- route guard changes;
- dashboard data rewrites;
- AMC implementation;
- Client Portal work;
- automation;
- notifications;
- AI workflow implementation;
- production data changes.

## Implementation Phases

### B1.2.1 Route / Page Foundation

Purpose:

- create the smallest dedicated My Work page only after route ownership is approved.

Expected scope:

- route/page shell;
- reuse existing dashboard/order summary row source where safe;
- reuse B1.1 presentation or extracted presentational helpers;
- preserve route guards, permissions, and data authority.

### B1.2.2 Priority Grouping Expansion

Purpose:

- refine priority grouping for a full appraiser page.

Expected scope:

- clearer overdue, due-soon, revision, inspection, waiting/blocker, and lower-priority lanes;
- client-side grouping from existing row fields;
- no hidden ranking authority.

### B1.2.3 Context Integration

Purpose:

- add read-only operational context only when existing governed reads safely support it.

Expected scope:

- file readiness, review feedback, operational inputs, or activity context if already available;
- evidence-aware display;
- no new mutation, workflow, backend, schema, or query authority.

### B1.2.4 Appraiser QA

Purpose:

- validate that the dedicated route answers today's work question better than the dashboard
  preview alone.

Expected scope:

- appraiser role review;
- desktop and mobile shell review;
- active rail state review;
- overdue, due soon, revision, inspection, waiting/blocker, empty-state, and lower-priority
  scenarios.

## Stop Condition

After this plan, stop before route implementation.

Required review:

- route path and guard decision;
- nav visibility behavior;
- whether B1.1 preview remains on Dashboard after a dedicated route exists;
- data-source reuse plan;
- test scope for route rendering and behavior preservation.

## B1.2.1 Runtime Foundation Record

Phase B1.2.1 implements the first dedicated My Work route/page foundation for staff appraisers.

Runtime files updated:

- `src/features/dashboard/MyWorkPage.jsx`;
- `src/routes/index.jsx`;
- `src/features/dashboard/workbenches/AppraiserWorkbenchPreview.jsx`;
- `src/features/dashboard/DashboardPage.jsx`;
- `src/components/shell/TopNav.jsx`;
- `src/lib/navigation/currentNavigationRegistry.js`;
- `src/lib/navigation/shellNavigationGroups.js`;
- related route, navigation, dashboard, and workbench tests.

B1.2.1 changes:

- adds `/my-work` as a protected authenticated route using the existing order-read permission gate;
- creates a dedicated `MyWorkPage` that reuses `useDashboardSummary()` and the existing governed
  assigned order rows;
- reuses the B1.1 My Work grouping/presentation for the full dedicated surface;
- keeps non-appraiser direct route access from presenting broad rows as staff appraiser work;
- exposes `My Work` in the left rail and mobile menu only for the resolved `my_work` shell profile
  when existing order-read permission allows it;
- converts the dashboard-fed B1.1 surface into a compact summary/entry point so Dashboard does not
  duplicate the full dedicated My Work surface.

B1.2.1 intentionally does not:

- add a new backend endpoint, RPC, view, schema object, or Supabase policy;
- broaden order visibility;
- change route guards beyond using the existing order-read permission gate for `/my-work`;
- change workflow actions, Smart Action behavior, permission seeds, dashboard query authority, or
  order data authority;
- add operational-input, file readiness, review feedback, or activity queries;
- change automation, notifications, AI, AMC, Client Portal, or production data behavior.

Implementation assessment:

- My Work now has a dedicated appraiser execution station while preserving Dashboard / Operations
  as a separate operational overview;
- the route is behavior-preserving because it uses existing governed dashboard/order rows and
  presentation-only grouping;
- B1.2.2 should refine priority grouping only after route-level appraiser QA confirms the
  dedicated surface answers today's work question clearly.

## B1.2.2 Priority Grouping Expansion Record

Phase B1.2.2 refines the dedicated My Work priority hierarchy without changing data authority.

Runtime files updated:

- `src/features/dashboard/workbenches/AppraiserWorkbenchPreview.jsx`;
- `src/features/dashboard/workbenches/__tests__/WorkbenchPreviews.test.jsx`;
- `src/features/dashboard/__tests__/MyWorkPage.test.jsx`.

B1.2.2 changes:

- splits due pressure into separate `Urgent / Overdue` and `Due Soon` lanes;
- keeps `Revisions Required`, `Upcoming Inspections`, `Waiting / Blocked Context`, and
  `Lower-Priority Work` as distinct scan lanes;
- strengthens the top priority area as a route-level execution pressure summary;
- makes lower-priority work visually quieter so it does not compete with overdue, due-soon,
  revision, inspection, or waiting/blocker lanes;
- continues deriving all groups client-side from existing row fields such as status, due date,
  inspection context, and waiting/blocker context.

B1.2.2 intentionally does not:

- add new queries, RPCs, views, schema objects, Supabase policies, or backend behavior;
- change route guards, permission seeds, workflow actions, Smart Action behavior, dashboard query
  authority, or order data authority;
- add AI prioritization, hidden ranking authority, automation, notifications, AMC, Client Portal,
  or production data behavior.

Implementation assessment:

- My Work now separates urgent overdue work from due-soon work at first scan;
- revisions read as active appraiser work, while waiting/blocker context remains contextual rather
  than a failure state;
- B1.2.3 should add operational context only if existing governed reads safely support it.

## B1.2.3 Read-Only Context Integration Record

Phase B1.2.3 adds item-level read-only context to My Work using only data already present on the
existing governed row objects.

Runtime files updated:

- `src/features/dashboard/workbenches/AppraiserWorkbenchPreview.jsx`;
- `src/features/dashboard/workbenches/__tests__/WorkbenchPreviews.test.jsx`.

B1.2.3 changes:

- adds compact context chips directly inside My Work order items;
- surfaces revision, operational input, waiting/blocker, inspection, file-count, and loaded
  activity/update evidence when those fields are already present on the row;
- keeps context lower in visual weight than priority, due, revision, inspection, and
  waiting/blocker lane structure;
- avoids rendering unavailable context instead of fetching additional order detail data.

B1.2.3 intentionally does not:

- mount Order Detail context components that require documents, activities, or operational-input
  arrays that My Work does not currently load;
- add queries, RPCs, views, schema objects, Supabase policies, or backend behavior;
- change route guards, permissions, workflow/lifecycle behavior, Smart Actions, data/query
  authority, automation, notifications, AI, AMC, Client Portal, or production data behavior.

Implementation assessment:

- My Work now gives appraisers a clearer read-only reason for why a row is urgent, revision-bound,
  inspection-bound, waiting, or file-sensitive when row evidence exists;
- context remains attached to the relevant work item rather than becoming a dashboard module;
- B1.2.4 should verify scan quality across real appraiser scenarios before any deeper context
  enrichment is considered.
