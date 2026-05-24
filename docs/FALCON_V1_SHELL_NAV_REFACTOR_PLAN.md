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
