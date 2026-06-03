# Falcon v1 Shell / Navigation Refactor Plan

## Purpose

This document defines Falcon v1 shell and navigation direction before runtime implementation.

Falcon v1 is the Internal Staff Appraiser Platform for Continental's daily appraisal operations.
The current shell and navigation are functionally strong, role-aware, and permission-conscious, but
they still read too much like route navigation and not enough like a role-aware operational
environment.

This phase is planning only. It does not implement runtime code, CSS refactors, route removals,
navigation behavior changes, workflow features, dashboard data changes, backend changes,
permission changes, Supabase changes, AMC features, Client Portal behavior, automation, or
notifications.

This v1 plan is subordinate to the multi-workspace doctrine in
`docs/FALCON_WORKSPACE_DOCTRINE_NAVIGATION_ARCHITECTURE.md`. Falcon is one platform with
role-native workspaces. Internal Operations, AMC Operations, and future Vendor Workspace should
have distinct navigation language and workspace identity. Switching workspaces should reset context
and navigate to that workspace's dashboard rather than preserving the current route as if the
switch were only a filter.

Runtime boundary status:

- WS-2 complete: Internal Operations / AMC Operations switching navigates to `/dashboard`.
- WS-3.1 complete: workspace switch navigation uses replace semantics and does not preserve
  query/search state.
- WS-3.2 complete: mounted Orders pages clear URL filters when `operationsMode` changes.
- WS-4.1 complete: workspace-native navigation architecture is locked in documentation.
- WS-4.2 complete: workspace navigation definitions exist for active Internal/AMC workspaces, with
  inactive future Vendor/Client placeholders.
- WS-4.3a complete: primary desktop nav visibility derives from workspace definitions with behavior
  preserved.
- WS-4.3b complete: AMC desktop/sidebar grouping derives from workspace definitions and uses
  Procurement, Vendors, and Clients labels; Internal grouping remains unchanged.
- WS-4.4 complete: AMC mobile ordering derives from workspace definitions with behavior preserved;
  Internal mobile ordering remains unchanged.
- WS-5.1 complete: AMC visual/copy identity layer added through `getWorkspaceIdentity`; Internal
  identity remains unchanged/default.
- Active-mode clicks do nothing.
- Saved views are unchanged and deferred for WS-3.4 workspace scoping design/migration.

## Current Shell / Navigation Findings

### Current Top Nav Structure

Falcon currently has:

- a persistent top shell;
- role-aware desktop grouping from visible permission-filtered links;
- role-prioritized mobile nav ordering;
- command palette role-priority ordering;
- stable route paths and route guards.

This is a strong foundation. The remaining issue is presentation: the shell still feels like a
navigation bar attached to pages rather than the frame of an operational workstation.

### Grouping Weaknesses

Current grouping helps orientation but remains visually subtle.

Issues:

- group labels do not yet create a strong operational hierarchy;
- operations, management, and support can still look equally important;
- users with broad access can see many links competing for attention;
- grouped nav does not yet create a strong current-work-mode identity.

### Route Competition

Many routes are legitimate and permissioned, but v1 should not make every route feel like a daily
execution lane.

Risks:

- admin/setup surfaces can compete with active operational work;
- management/support destinations can make appraiser and reviewer shells feel less focused;
- broad owner/admin access can produce visual clutter even when authority is correct.

### Owner/Admin Clutter

Owners and admins need broad oversight, but their shell should not become a raw route list.

Current risk:

- Orders, Assignments, Clients, Calendar, Team Access, Settings, and support areas can feel like a
  flat inventory instead of an operations command structure.

v1 direction:

- daily operational risk first;
- management second;
- setup/support third.

### Operational Versus Management Blending

Operational execution and management/admin support are both necessary, but they should not share
equal visual priority.

Operational:

- My Work;
- Review Queue;
- Operations;
- Orders.

Management/support:

- Team;
- Reports;
- Clients;
- Settings.

The shell should make that separation obvious without weakening route guards or hiding critical
responsibility.

### Active-State Weakness

Current active states are usable but not yet strong enough to anchor the active workspace.

Needed:

- clearer active lane treatment;
- stronger visual relationship between active nav, workspace header, and page shell;
- a visible role/work cue where useful.

### Workspace Framing Gaps

Workspace pages still feel like page content beneath app chrome rather than framed operational
workstations.

Needed:

- stronger workspace shell boundaries;
- clearer relationship between app background, nav shell, workspace shell, and operational panels;
- role-aware workspace headers that reinforce `My Work`, `Review Queue`, or `Operations Command`.

## Shell Philosophy

Falcon should feel like an operational environment, not a page collection.

Principles:

- the shell frames work, not just navigation;
- the current role/work identity should be visually obvious;
- daily execution should visually dominate broad administration;
- navigation should reduce cognitive load by emphasizing the next likely work lane;
- permission authority remains separate from shell presentation;
- shell changes must not grant access, remove route guards, or mutate workflow behavior.

The shell should answer:

- where am I working;
- what role/work mode am I in;
- what is the primary daily lane;
- what is supporting or administrative context;
- what is deferred or future.

## Primary Versus Secondary Navigation Philosophy

Primary operational lanes are the destinations that support daily internal execution.

Likely primary lanes:

- `My Work`;
- `Review Queue`;
- `Operations`;
- `Orders`.

Secondary/support areas should remain accessible without visually competing with daily execution.

Likely secondary/support areas:

- `Team`;
- `Reports`;
- `Clients`;
- `Settings`.

Operational execution must visually dominate because Falcon v1 succeeds only when internal staff can
run daily appraisal work with less ambiguity. Support/admin surfaces are important, but they should
not pull attention away from direct work, review, assignment, due pressure, and completion.

## Role-Aware Shell Expectations

### Appraiser

The appraiser shell should prioritize:

- `My Work` first;
- assigned active work;
- due and revision pressure;
- file/context availability;
- operational status evidence.

The appraiser shell should reduce:

- admin/setup noise;
- broad management surfaces;
- owner-level operational clutter.

### Reviewer

The reviewer shell should prioritize:

- `Review Queue` first;
- resubmissions;
- revisions;
- files and review context;
- clear decision zones.

The reviewer shell should reduce:

- generic order-inventory feel;
- client/admin setup noise;
- unrelated assignment/vendor management.

### Owner/Admin

The owner/admin shell should use `Operations Command` framing.

It should prioritize:

- exception visibility;
- due/overdue pressure;
- unassigned or stale work;
- review/appraiser workload;
- readiness and team health.

Management should remain present but secondary:

- Team;
- Clients;
- Reports;
- Settings.

Owner/admin broad access should feel governed and organized, not cluttered.

## Navigation Grouping Proposal

Navigation grouping should come from workspace definitions. Permission checks remain authority,
but the workspace definition decides which section a permissioned link belongs to and whether that
link is part of the workspace's primary navigation at all.

Recommended definition model:

- Internal Operations: Operations, Management, Reporting, System.
- AMC Operations: Procurement, Vendors, Clients, Analytics, System.
- Future Vendor Workspace: Work, Documents, Financials, Profile.
- Future Client Workspace: Orders, Documents, Messages, Billing, Profile.

### Operational Group

Purpose:

- daily execution and operational risk.

Examples:

- Operations;
- My Work;
- Review Queue;
- Orders;
- Calendar where it supports due/inspection work.

Visual direction:

- first group;
- strongest active treatment;
- clearest relationship to workspace header.

### Management Group

Purpose:

- ongoing company/team/client operational management.

Examples:

- Team;
- Clients;
- Assignments where owner/admin oversight is active;
- Reports where implemented.

Visual direction:

- secondary group;
- clear but less dominant than operational lanes;
- possible overflow/de-emphasis pattern for compact widths.

### Support / Setup Group

Purpose:

- settings, owner setup, account, diagnostics, readiness support.

Examples:

- Settings;
- Team Access / setup where not already management;
- Owner Setup;
- Notification Settings;
- diagnostics where intentionally exposed.

Visual direction:

- tertiary group;
- accessible but visually quiet;
- good candidate for overflow or right-side support affordance.

### Future / Deferred Areas

Purpose:

- planned but not v1 runtime scope.

Examples:

- Client Portal;
- AMC workflows;
- expanded vendor panels;
- automation systems;
- AI workspaces.

Visual direction:

- do not render live nav entries before authority, routes, data contracts, and v1 relevance exist.

### AMC Operations Groups

AMC Operations should not reuse the Internal Operations sidebar with a few hidden links. It should
present procurement and vendor management as first-class lanes.

Recommended AMC groups:

- Procurement: Dashboard, Orders, Calendar, future Procurement Queue, future standalone Bid Requests.
- Vendors: Vendor Directory, future Coverage, future Performance, future Compliance.
- Clients: Clients.
- Analytics: Reports / AMC analytics when implemented.
- System: Settings.

AMC Operations should hide direct My Work, Internal Assignments, Relationships, Users / Staff
Directory, and internal production-only surfaces unless a later admin requirement explicitly brings
one of those surfaces back under System.

### Hidden But Reachable Routes

Primary navigation does not have to expose every route that a workflow can reach. Some routes
remain valid destinations from contextual links while staying absent from the workspace sidebar.

Example:

- AMC Operations can hide direct Assignments navigation while assignment packets remain reachable
  from Order Detail after selected bid conversion.

## Recommended Navigation Presentation

The first runtime shell/nav refactor should consider:

- stronger visual group separation;
- reduced horizontal clutter;
- active lane treatment that is visible at a glance;
- role/work profile cue near the shell or workspace header;
- management/support de-emphasis where safe;
- overflow patterns for support/setup links if horizontal density remains high;
- no route removals until route authority, discoverability, and role expectations are reviewed.

## Active Workspace Treatment

Active workspace treatment should connect:

- active nav state;
- workspace shell boundary;
- page header;
- role/work cue;
- primary work surface.

Recommended active-state qualities:

- stronger contrast than passive nav;
- visible without relying only on text color;
- not so loud that it competes with operational alerts;
- consistent across desktop;
- mobile active state remains task-first and compact.

Possible cues:

- active lane border or inset marker;
- subtle background shift;
- role/work eyebrow;
- workspace shell accent edge;
- active group label emphasis.

## Shell Containment Philosophy

The app should use a clear structural hierarchy:

1. **App background:** quiet environment that creates contrast behind the work shell.
2. **Nav shell:** global orientation and role/work navigation.
3. **Workspace shell:** active operational workstation boundary.
4. **Operational panels:** worklists, queues, detail panels, files, activity, evidence, and support
   context.
5. **Action/evidence surfaces:** controlled mutation areas and read-only operational context.

The shell should not make every panel look equally important. Workstation framing should guide the
eye from role/work identity to primary work, then to support context.

## Desktop Versus Mobile Philosophy

### Desktop

Desktop is the operational command shell.

Direction:

- grouped navigation;
- current-work identity;
- contextual workspace framing;
- enough density for operations, review, and owner/admin oversight;
- management/support separation without hiding responsibility.

Desktop should support scanning, comparison, review, assignment, and operational triage.

### Mobile

Mobile is operational execution.

Direction:

- task-first hierarchy;
- reduced route exposure;
- direct access to assigned/review/urgent work;
- operational continuity without full admin density;
- no desktop-style management breadth by default.

Mobile should support quick confirmation, lookup, field context, and follow-up, not full owner/admin
command density.

## Suggested Implementation Phases

### A2.1 Nav Hierarchy Implementation

Purpose:

- improve desktop shell nav hierarchy using existing visible links and shell metadata.

Possible scope:

- stronger group separation;
- clearer active lane treatment;
- support/setup de-emphasis;
- no route removal;
- no permission changes.

### A2.2 Shell Framing / Elevation Implementation

Purpose:

- make the shell feel like an operational workstation boundary.

Possible scope:

- app background and workspace shell contrast;
- nav shell containment;
- workspace boundary and depth;
- no broad CSS token rewrite unless narrowly required.

### A2.3 Role-Aware Shell Polish

Purpose:

- reinforce `My Work`, `Review Queue`, and `Operations Command`.

Possible scope:

- role/work cues;
- shell copy alignment;
- active group emphasis by shell profile;
- hybrid owner/admin handling review.

### A2.4 Workspace Header / Context Pass

Purpose:

- connect nav identity to page/workspace identity.

Possible scope:

- workspace header framing;
- context strip hierarchy;
- primary work surface relationship;
- role-specific support copy cleanup.

## Explicit Non-Goals

Phase A2 does not include:

- runtime implementation;
- CSS refactor yet;
- route removals;
- permission changes;
- backend changes;
- Supabase changes;
- new workflow features;
- AMC features;
- Client Portal;
- automation;
- notifications;
- dashboard data rewrites;
- mobile/native implementation;
- AI UI systems;
- shell switching.

## A2 Conclusion

Falcon v1 shell and navigation should become a role-aware operational environment. The next runtime
work should improve orientation and hierarchy without changing authority:

- daily operational lanes first;
- management/support secondary;
- active workspace identity stronger;
- shell/workspace/panel containment clearer;
- role mental models visible in the page frame.

The next safe runtime phase is **A2.1 Nav Hierarchy Implementation**, scoped to presentation from
already-visible links and existing shell metadata.

## A2.1 Implementation Record

Phase A2.1 implements the first shell/navigation hierarchy refactor as presentation-only runtime
work.

Runtime files updated:

- `src/components/shell/TopNav.jsx`;
- `src/layout/Layout.jsx`;
- `src/components/shell/__tests__/TopNav.test.jsx`.

A2.1 changes:

- strengthens desktop navigation group containment;
- visually emphasizes operational groups over management/support groups;
- keeps every nav link sourced from existing visible permission-filtered links;
- improves active workspace/lane treatment;
- adds horizontal overflow protection for broad desktop nav;
- strengthens the top shell boundary and utility area containment;
- frames routed workspace content inside a subtle operational workstation shell;
- keeps mobile nav link ordering and behavior unchanged.

A2.1 preserves:

- all route paths;
- all permission checks and route guards;
- all nav link availability;
- command palette behavior;
- dashboard data behavior;
- workflow/lifecycle behavior;
- Smart Actions;
- backend, Supabase, schema, automation, notifications, AMC, Client Portal, mobile/native, AI, and
  production data behavior.

The next safe phase is **A2.2 Shell Framing / Elevation Implementation** only if further shell
containment work is needed after visual review.

## A2.2 Implementation Record

Phase A2.2 implements the first shell framing and elevation pass as presentation-only runtime work.

Runtime files updated:

- `src/layout/Layout.jsx`;
- `src/components/shell/TopNav.jsx`.

A2.2 changes:

- deepens the neutral slate app environment behind the active workspace;
- reduces background image intensity so it supports containment without becoming decorative;
- adds a stronger outer workspace frame with restrained border, ring, and shadow hierarchy;
- keeps routed page content inside a lighter inner work surface;
- slightly strengthens top-shell border and shadow so navigation sits above the workspace shell;
- preserves Phase A2.1 navigation grouping, active lane treatment, and mobile nav behavior.

A2.2 preserves:

- all route paths;
- all permission checks and route guards;
- all nav link availability;
- command palette behavior;
- dashboard data behavior;
- workflow/lifecycle behavior;
- Smart Actions;
- backend, Supabase, schema, automation, notifications, AMC, Client Portal, mobile/native, AI, and
  production data behavior.

The next safe phase is **A2.3 Role-Aware Shell Polish** only after visual review confirms the shell
containment direction is stable.

## A2.3 Implementation Record

Phase A2.3 polishes the shell's role/work-mode presentation as presentation-only runtime work.

Runtime files updated:

- `src/components/shell/TopNav.jsx`;
- `src/components/shell/__tests__/TopNav.test.jsx`.

A2.3 changes:

- reuses existing presentation-only shell profile exposure;
- changes the brand sublabel into a current work-mode cue;
- presents `Operations Command`, `My Work`, `Review Queue`, or `Received Work` based on the
  resolved shell profile;
- lightly emphasizes the matching desktop navigation group;
- keeps the cue subtle so it does not create a new switcher, route, badge system, or workflow
  surface;
- keeps mobile nav ordering and behavior unchanged.

A2.3 preserves:

- all route paths;
- all permission checks and route guards;
- all nav link availability;
- command palette behavior;
- dashboard data behavior;
- workflow/lifecycle behavior;
- Smart Actions;
- backend, Supabase, schema, automation, notifications, AMC, Client Portal, mobile/native, AI, and
  production data behavior.

The next safe phase is **A2.4 Workspace Header / Context Pass** only if role/work identity still
needs clearer page-level reinforcement after visual review.

## A2.4 Implementation Record

Phase A2.4 connects shell/nav identity to the highest-value workspace headers as
presentation-only runtime work.

Runtime files updated:

- `src/lib/shell/shellWorkMode.js`;
- `src/components/shell/TopNav.jsx`;
- `src/features/dashboard/DashboardPage.jsx`;
- `src/features/dashboard/__tests__/DashboardPage.test.jsx`;
- `src/pages/orders/Orders.jsx`;
- `src/pages/orders/__tests__/Orders.test.jsx`.

A2.4 changes:

- moves the A2.3 shell work-mode cue into a shared presentation helper;
- keeps `TopNav` using the same role/work cue source;
- surfaces the resolved work mode in the dashboard header eyebrow;
- surfaces the resolved work mode in the Orders workspace header context;
- keeps the copy subtle and presentation-only;
- avoids Order Detail header changes because lifecycle and action controls live there.

A2.4 preserves:

- all route paths;
- all permission checks and route guards;
- all nav link availability;
- command palette behavior;
- dashboard data behavior;
- Orders filter/query/table behavior;
- workflow/lifecycle behavior;
- Smart Actions;
- backend, Supabase, schema, automation, notifications, AMC, Client Portal, mobile/native, AI, and
  production data behavior.

The next safe phase is **A3 Surface / Elevation System** only if visual review confirms shell,
workspace, and page-context identity are now stable enough for broader surface recipes.

## A4.2 Operational Spine Composition Forward Plan

Phase A4.2 is documented in `docs/FALCON_V1_OPERATIONAL_SPINE_COMPOSITION_PLAN.md`.

The A2 shell/navigation work strengthened the existing top-nav shell without changing route,
permission, or workflow behavior. A4.2 plans the next information-architecture step before runtime
implementation: Falcon should move from a top-nav-centered route inventory toward a persistent left
operational rail and compact top utility/context bar.

A4.2 direction:

- left rail owns operational movement;
- top bar owns utility/context;
- center workspace owns active work;
- primary operational lanes lead;
- management/support remains accessible but visually secondary;
- search stays fast but compact;
- mobile remains task-first rather than a dense desktop clone.

A4.2 remains planning only. It adds no runtime shell code, route removals, permission changes,
workflow changes, dashboard data changes, backend/Supabase changes, AMC work, Client Portal work,
automation, AI work, or production data changes.

## WS-4.5 Navigation Runtime Closeout

WS-4.5 records the completed workspace-native navigation wiring after the WS-4.1 doctrine lock.

Runtime files involved:

- `src/lib/navigation/workspaceNavigationDefinitions.js`;
- `src/lib/navigation/currentPrimaryNavLinks.js`;
- `src/lib/navigation/currentShellNavigationSections.js`;
- `src/lib/navigation/currentShellMobileNavigationLinks.js`;
- `src/components/shell/TopNav.jsx`;
- related navigation and shell tests.

Completed behavior:

- active Internal Operations and AMC Operations workspace navigation definitions exist;
- future Vendor Workspace and Client Workspace definitions exist only as inactive placeholders;
- primary desktop nav visibility uses workspace definitions while preserving previous behavior;
- AMC desktop/sidebar grouping uses workspace definitions and now renders Procurement, Vendors, and
  Clients section labels;
- Internal desktop/sidebar profile grouping remains unchanged;
- AMC mobile ordering uses workspace definitions while preserving the existing Orders, Calendar,
  Vendors, Clients order;
- Internal mobile ordering remains unchanged;
- route paths, permissions, command palette behavior, dashboard routing, workflow reachability, and
  future Vendor/Client hidden boundaries remain unchanged.

Deferred items:

- WS-3.4 saved view workspace scoping design/migration;
- optional future Internal mobile definition migration if it can remain behavior-preserving;
- WS-5.3 optional broader workspace frame accent after visual review;
- WS-6 Vendor Workbench doctrine;
- WS-7 AMC-7 tokenized vendor order detail.

## WS-5.2 AMC Visual Identity Closeout

WS-5.2 records the completed WS-5.1 AMC visual/copy identity pass. The pass stays intentionally
narrow: Falcon remains one shared platform, with AMC Operations receiving only enough presentation
language and accent treatment to feel like a procurement/vendor-management workspace.

Runtime files involved:

- `src/lib/workspace/workspaceIdentity.js`;
- `src/components/shell/TopNav.jsx`;
- `src/features/dashboard/DashboardPage.jsx`;
- `src/pages/orders/Orders.jsx`;
- related helper, shell, dashboard, and Orders tests.

Completed behavior:

- `getWorkspaceIdentity(operationsMode)` provides workspace presentation identity.
- Internal Operations returns default/empty overrides, preserving existing Internal copy and visual
  treatment.
- AMC Operations now uses `Procurement Command` in TopNav.
- AMC shell cue title is `Vendor procurement and AMC operations`.
- AMC Dashboard subtitle is `Track procurement queues, vendor response, client orders, and SLA
  pressure.`
- AMC Dashboard stat reads `Workspace / AMC Operations`.
- AMC Orders header reads `Procurement / AMC Operations`.
- AMC Orders description is `Manage AMC orders, vendor procurement context, and client
  coordination.`
- AMC receives restrained cyan accent treatment in the shell context panel/sidebar ring and Orders
  eyebrow chip.

WS-5.1 preserves:

- all route paths and route behavior;
- all permission checks and route guards;
- data fetching and operations-scope behavior;
- workflow/lifecycle behavior;
- command palette behavior;
- saved view behavior;
- navigation composition and link visibility/order behavior.

Deferred items:

- WS-5.3 optional broader workspace frame accent, only after visual review;
- WS-6 Vendor Workbench doctrine;
- WS-7 AMC-7 tokenized vendor order detail;
- WS-3.4 saved view workspace scoping.
