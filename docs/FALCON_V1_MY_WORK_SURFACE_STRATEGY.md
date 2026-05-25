# Falcon v1 My Work Surface Strategy

## Purpose

This document defines the role-tailored operational surface strategy for staff appraisers before
runtime implementation.

The My Work surface should answer:

> What do I need to do today?

Phase A established Falcon's operational environment, shell identity, operational spine, login
environment, and premium command-console structure. Phase B shifts from shared environment work to
role-native operational surfaces.

My Work exists to:

- reduce appraiser cognitive load;
- prioritize actionable work;
- reduce operational ambiguity;
- create a purpose-built daily workspace;
- reinforce appraisal-native workflow.

This phase is planning only. It does not implement runtime code, workflow logic changes,
permission changes, backend changes, schema changes, Supabase changes, AMC implementation, AI
workflow implementation, notification system changes, route changes, data/query changes, or
production data changes.

## Core Philosophy

My Work is:

- task-first;
- due-pressure aware;
- revision-aware;
- inspection-aware;
- operationally calm;
- scan-first;
- action-oriented.

My Work should avoid:

- admin clutter;
- route inventory;
- irrelevant management surfaces;
- noisy dashboard widgets;
- equal visual weight for every signal;
- broad analytics that do not help today's appraiser execution.

The surface should feel like a daily execution station, not a miniature owner/admin dashboard.

## Appraiser Mental Model

The appraiser needs immediate answers to:

- what matters today;
- what is overdue or close to due;
- what revision pressure exists;
- which inspections are upcoming;
- which orders are stalled or waiting;
- which operational blockers prevent progress;
- which files or readiness items are missing;
- whether due-date confidence is strong or weakening.

The surface should translate assigned work into practical appraisal execution sequence without
forcing the appraiser to reconstruct priority from tables, filters, and scattered context panels.

## Surface Hierarchy Proposal

### Primary Zones

Primary zones should answer today's work question first.

Recommended primary zones:

- priority work;
- due soon;
- revisions required;
- inspections / upcoming schedule;
- operational inputs / context;
- workload overview.

Priority work should lead. Due soon, revisions, and inspections should be visually nearby because
they represent the appraiser's most immediate execution pressure.

### Secondary Zones

Secondary zones should support orientation without competing with action.

Recommended secondary zones:

- recently completed;
- passive metrics;
- historical reference.

Secondary zones should be visibly quieter than active work. Recently completed work can reinforce
progress, but it should not compete with overdue, revision, or inspection work.

## Priority Logic Philosophy

My Work priority should be visual and operational. It should not invent new authority or hidden
ranking rules.

Visual hierarchy should prioritize:

- overdue work;
- due soon work;
- revisions required;
- waiting on client;
- inspection scheduled;
- report on track;
- stale / no-update work.

Guidance:

- overdue and due-soon work should be easiest to find;
- revisions should read as active appraiser work, not reviewer/admin noise;
- waiting-on-client should remain context, not lifecycle status;
- inspection scheduled and report on track should read as positive operational context;
- stale or no-update work should surface calmly as attention needed, not as alarmist failure.

Priority presentation should remain explainable from existing governed data and approved
operational-input evidence.

## Operational Context Integration

My Work should integrate operational context where it naturally helps the appraiser decide the
next action.

Context types:

- operational inputs;
- file readiness;
- review feedback;
- activity context.

Integration rules:

- operational inputs should appear as current evidence, not status authority;
- file readiness should be near orders where missing documents or readiness affect execution;
- review feedback should be prominent for revision-required work;
- activity context should summarize recency and blocker clues without becoming a full activity
  feed;
- context should be attached to the relevant work item or lane instead of isolated in a generic
  dashboard widget.

The surface should reduce navigation by carrying enough context to make the next move obvious.

## Action Philosophy

My Work should encourage:

- next best action;
- minimal navigation;
- operational confidence.

Action principles:

- expose only actions the appraiser can currently take;
- place actions near the relevant work context;
- keep primary actions obvious and secondary actions quieter;
- prefer one clear action path over a menu of equivalent-looking choices;
- preserve existing workflow and RPC authority.

Avoid:

- giant menu systems;
- buried actions;
- equal-weight cards everywhere;
- action panels that visually compete with revision, due, or inspection priority;
- pretending passive context is an allowed workflow action.

## Visual Philosophy

My Work should feel like an appraiser workstation inside Falcon's operational environment.

Visual direction:

- operational workstation;
- focused;
- restrained;
- premium;
- dense where useful;
- calm under pressure;
- clear hierarchy.

The page should support fast scanning during daily work. Density is acceptable where it helps
compare assigned orders, dates, readiness, and revision state. Decorative cards, oversized headers,
and marketing-like composition should be avoided.

## Relationship To Shell

My Work should align with the operational spine shell.

Shell relationship:

- left rail highlights `My Work` as the active operational lane when available;
- active lane treatment should make the appraiser's current workspace unmistakable;
- top utility remains command/search, notifications, profile, and compact context only;
- the workspace header should reinforce appraiser execution, not repeat route inventory;
- operational orientation should be clear before the appraiser reads individual cards or rows.

The shell should communicate that My Work is one station inside the same Falcon environment, not a
separate app.

## Future Integration Hooks

Future-ready concepts may be acknowledged only as hooks.

Future hooks:

- AMC assignment flow;
- operational notifications;
- AI assistance;
- workload forecasting.

These hooks should not be implemented in B1. They should not appear as live controls, disabled
buttons, placeholder widgets, or visible promises before real contracts exist.

## Suggested Implementation Phases

### B1.1 My Work Layout / Runtime Foundation

Purpose:

- create the first appraiser-native surface structure.

Expected scope:

- role-tailored layout;
- existing appraiser-readable data only;
- no workflow logic, permission, backend, or schema changes.

### B1.2 Priority Grouping Pass

Purpose:

- define the dedicated My Work route/surface path and organize assigned work by practical
  due/revision/inspection pressure.

Expected scope:

- route ownership planning before runtime route work;
- priority lanes or grouped worklist presentation;
- explainable visual hierarchy;
- no hidden ranking authority.

Planning reference:

- `docs/FALCON_V1_MY_WORK_ROUTE_SURFACE_PLAN.md`.

### B1.3 Operational Context Integration

Purpose:

- place file readiness, review feedback, activity context, and operational inputs near relevant
  work.

Expected scope:

- read-only context integration;
- evidence-aware display;
- no new mutation or workflow behavior.

### B1.4 Action Optimization Pass

Purpose:

- reduce navigation and make next allowed appraiser actions easier to find.

Expected scope:

- presentation and placement of existing allowed actions;
- no new workflow actions or backend behavior.

### B1.5 Appraiser Workflow QA

Purpose:

- verify the surface answers today's work question across common appraiser scenarios.

Expected scope:

- overdue work;
- due soon work;
- revision-required work;
- upcoming inspections;
- waiting/stalled context;
- file readiness gaps;
- responsive review.

## Explicit Non-Goals

Phase B1 does not include:

- runtime implementation yet;
- workflow logic changes;
- permission changes;
- backend changes;
- schema changes;
- Supabase changes;
- AMC implementation;
- AI workflow implementation;
- notification system changes;
- route changes;
- data/query changes;
- production data changes.

## B1.1 Runtime Foundation Record

Phase B1.1 implements the first appraiser-native My Work layout foundation.

Runtime files updated:

- `src/features/dashboard/workbenches/AppraiserWorkbenchPreview.jsx`;
- `src/features/dashboard/workbenches/__tests__/WorkbenchPreviews.test.jsx`.

B1.1 changes:

- keeps My Work mounted through the existing dashboard/workbench preview path;
- uses only the existing assigned order rows already provided to the dashboard surface;
- reframes the surface around `Priority Work`, `Due Soon / Overdue`, `Revisions Required`,
  `Upcoming Inspections`, `Waiting / Blocked Context`, and `Lower-Priority Work`;
- derives grouping client-side from provided row fields such as status, due date, inspection
  context, and waiting/blocker context;
- links work items to existing order detail routes when an order id is present;
- preserves the surface as presentation-only with no workflow action controls.

B1.1 intentionally does not:

- add a new route;
- change dashboard data hooks or query authority;
- change permissions, route guards, role resolution, or visible-link filtering;
- add workflow actions or change Smart Action behavior;
- add operational input, file readiness, review feedback, or activity queries;
- change backend, schema, Supabase, automation, notifications, AI, AMC, Client Portal, or
  production data behavior.

Implementation assessment:

- My Work now answers the daily appraiser question with a clearer scan-first hierarchy;
- due pressure, revision pressure, inspection context, and waiting/blocker context are visible
  without requiring the appraiser to reconstruct priority from generic dashboard panels;
- B1.2 should refine priority grouping only after appraiser workflow review confirms the first
  layout foundation remains clear and behavior-preserving.

## B1.2 Dedicated Route / Surface Planning Record

Phase B1.2 creates the dedicated My Work route/surface plan in
`docs/FALCON_V1_MY_WORK_ROUTE_SURFACE_PLAN.md`.

B1.2 planning defines:

- the current B1.1 state as a dashboard-fed, presentation-only workbench preview;
- the v1 expectation that My Work may become a standalone appraiser execution surface;
- a data-source strategy based on existing governed assigned order rows only;
- route and navigation expectations for a future dedicated My Work path;
- the relationship between `Dashboard / Operations` and appraiser `My Work`;
- appraiser-first layout requirements for priority work, due pressure, revisions, inspections,
  waiting/blocker context, and lower-priority work;
- implementation phases B1.2.1 through B1.2.4.

B1.2 remains docs-only. It does not implement runtime route/page code, route guards, navigation,
permissions, workflow actions, Smart Action behavior, data/query authority, backend, schema,
Supabase, AMC, Client Portal, automation, notification, AI, or production data changes.

## B1.2.1 Dedicated Route Foundation Record

Phase B1.2.1 implements the first dedicated My Work route/page foundation.

B1.2.1 changes:

- adds `/my-work` as the dedicated staff appraiser execution route;
- reuses the existing dashboard/order summary row source through `useDashboardSummary()`;
- reuses the B1.1 My Work grouping and presentation for the full route surface;
- keeps Dashboard / Operations distinct by reducing the dashboard My Work presence to a compact
  summary/entry point;
- exposes the My Work nav link only for the resolved `my_work` shell profile with existing
  order-read visibility;
- prevents non-appraiser role contexts from seeing broad visible rows presented as My Work.

B1.2.1 intentionally does not:

- add backend endpoints, RPCs, views, schema objects, or Supabase policies;
- change permissions, route guards, workflow actions, Smart Actions, data/query authority,
  automation, notifications, AI, AMC, Client Portal, or production data behavior;
- add operational-input, file readiness, review feedback, or activity queries.

Implementation assessment:

- My Work is now a real appraiser execution station rather than only a dashboard-fed preview;
- the route remains behavior-preserving because it uses existing governed rows and client-side
  presentation grouping only;
- B1.2.2 should focus on clearer priority grouping and route-level scan quality, not new authority.

## B1.2.2 Priority Grouping Expansion Record

Phase B1.2.2 expands My Work's execution hierarchy inside the existing dedicated route foundation.

B1.2.2 changes:

- separates urgent overdue work from due-soon work;
- keeps revisions required as an active appraiser execution lane;
- keeps upcoming inspections time-anchored from existing schedule/site-visit fields;
- keeps waiting or blocked context as evidence/context rather than workflow authority;
- makes lower-priority assigned work visually recede below immediate pressure lanes.

B1.2.2 remains presentation-only. It uses existing governed assigned order rows and client-side
grouping from available row fields. It does not add workflow logic, permissions, route authority,
backend/schema/Supabase behavior, new queries, Smart Action behavior, automation, notifications,
AI, AMC, Client Portal, or production data behavior.
