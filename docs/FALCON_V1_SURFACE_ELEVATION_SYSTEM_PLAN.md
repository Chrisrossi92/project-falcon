# Falcon v1 Surface / Elevation System Plan

## Purpose

This document defines Falcon v1 surface, border, shadow, contrast, and depth recipes before broad
workspace visual polish begins.

Falcon v1 is the Internal Staff Appraiser Platform for Continental's daily appraisal operations.
Phase A2 completed shell/navigation hierarchy, shell framing, role-aware shell cues, and workspace
header context. Phase A3 defines the repeatable visual system for operational panels, cards, action
areas, evidence areas, tables, lists, and high-priority states.

The purpose is to:

- prevent random one-off styling;
- create consistent operational hierarchy;
- improve contrast, depth, and framing;
- keep presentation premium, calm, and practical;
- support visual polish without changing the internal operational loop.

This phase is planning only. It does not implement runtime code, CSS refactors, component rewrites,
routes, permissions, workflow/lifecycle behavior, dashboard data, backend behavior, Supabase
changes, schema changes, automation, notifications, AMC features, Client Portal behavior,
mobile/native implementation, AI work, or production data changes.

## Surface Tiers

Falcon v1 should use a consistent surface hierarchy so users can understand what is primary,
supporting, actionable, read-only, or urgent.

### Tier 1: App Background

Purpose:

- establish the operational environment;
- create contrast behind the workspace shell;
- reduce white-on-white blending.

Recipe:

- quiet neutral or slate-tinted background;
- no loud gradients or decorative imagery;
- enough contrast to make workspace shells feel intentionally framed;
- visually subordinate to the shell and workspace content.

### Tier 2: Workspace Shell

Purpose:

- frame the active workstation;
- connect shell/nav identity to the current page context;
- contain primary operational work.

Recipe:

- stronger perimeter border than nested panels;
- white or near-white surface with subtle neutral contrast;
- restrained shadow or ring treatment;
- consistent header, context strip, primary content, and support content relationship.

### Tier 3: Primary Operational Panel

Purpose:

- hold the main work surface for the page;
- make queues, worklists, tables, calendars, and detail work visually dominant.

Recipe:

- clear title and short operational support copy where useful;
- visible border;
- calm white or very light neutral background;
- stronger presence than secondary context panels;
- compact internal spacing that supports repeated daily use.

### Tier 4: Secondary Context Panel

Purpose:

- hold support information near the primary task;
- provide scope, metadata, related context, or advisory state without competing with primary work.

Recipe:

- quieter border and lower elevation than primary panels;
- compact labels and metadata rhythm;
- no fake analytics, scores, or priority labels;
- visually secondary to the active work surface.

### Tier 5: Action / Decision Surface

Purpose:

- contain allowed user decisions and controlled mutations;
- distinguish action authority from read-only context.

Recipe:

- slightly stronger depth than read-only evidence surfaces;
- clear button hierarchy;
- concise copy that names the decision or outcome;
- no lifecycle authority unless the existing workflow surface already owns that action.

### Tier 6: Read-Only Evidence Surface

Purpose:

- display operational evidence, audit context, activity, files, readiness, or supporting state;
- keep evidence useful without implying automation or lifecycle authority.

Recipe:

- calm bordered treatment;
- lower elevation than action surfaces;
- compact timestamp/source/context metadata;
- conservative copy that avoids overclaiming state.

### Tier 7: High-Priority / Blocker State

Purpose:

- draw attention to blockers, overdue work, revision pressure, review needs, load failures, or
  required action.

Recipe:

- stronger neutral contrast or deterministic status color;
- clear copy before heavy styling;
- restrained border/accent treatment;
- no alarmist color unless the state is genuinely urgent;
- no inferred risk unless a backend contract exists.

### Tier 8: Table / List Surface

Purpose:

- support fast scanning, comparison, and repeated operational execution.

Recipe:

- visible table/list boundary;
- clear header and row separation;
- compact metadata and stable action placement;
- horizontal overflow protection where needed;
- selected, active, hover, and empty states that remain calm.

## Border Philosophy

Borders should make operational containment legible.

Guidance:

- primary workspace shells should have stronger boundaries than passive cards;
- primary operational panels should not disappear into the page background;
- nested panels should use restrained borders so the interface does not become over-carded;
- borders should solve white-on-white blending before adding heavier shadows;
- dividers should support scanning, not decorate every line;
- repeated cards should share a consistent perimeter treatment.

Avoid:

- stacking multiple equally strong bordered cards inside each other;
- relying only on whitespace for section separation;
- making every support panel look like the primary work surface;
- introducing dark borders everywhere.

## Shadow / Elevation Philosophy

Depth communicates hierarchy.

Guidance:

- app background should stay flat;
- workspace shell may use subtle elevation to frame the workstation;
- primary operational panels may use restrained shadow or ring treatment;
- secondary context panels should usually rely on border and background before shadow;
- action/decision surfaces can sit visually above read-only evidence surfaces;
- drawers, dialogs, popovers, and modals remain the highest layer;
- hover elevation should be small and functional.

Avoid:

- decorative floating cards everywhere;
- heavy shadow stacks;
- hover motion that makes worklists harder to scan;
- shadow as the only signal for urgency.

## Contrast Philosophy

Falcon v1 should use stronger neutral contrast without becoming dark, loud, or decorative.

Guidance:

- use neutral contrast to separate app background, workspace shell, primary panels, and support
  panels;
- use dark anchor surfaces sparingly, only where they improve operational orientation;
- use accent-wall style anchors only when they clarify role, workspace, active lane, or operational
  priority;
- use deterministic status colors only for explicit states;
- keep text contrast accessible and stable across dense operational surfaces.

Avoid:

- loud gradients;
- gamer-style neon or excessive glow;
- startup-dashboard decoration;
- ornamental illustrations;
- color systems that imply model-backed risk or automation that does not exist.

## Operational Panel Recipes

### Queue / Worklist Panels

Use for assigned work, review queues, active order inventory, and operational lists.

Recipe:

- primary operational panel treatment;
- compact header with current scope;
- scan-first row spacing;
- active filters and selected lanes visibly connected to the list;
- support copy kept short and secondary.

### Filter Panels

Use for search, saved views, status filters, date controls, and scope controls.

Recipe:

- secondary or control-group treatment;
- grouped controls with clear labels;
- quiet background that does not compete with results;
- wrapping behavior that protects mobile and narrower desktop widths;
- no hidden local-only state unless the existing surface already owns it.

### Summary Panels

Use for high-signal operational summaries and context strips.

Recipe:

- compact secondary panel treatment;
- small label/value rhythm;
- deterministic numbers or labels only;
- no repeated dashboard under every page;
- visually below the primary work surface unless the summary is the page's main context.

### Detail Panels

Use for order detail, assignment packet detail, client detail, review context, and related records.

Recipe:

- clear separation between authority, context, evidence, files, activity, and actions;
- stronger containment around the active task;
- secondary sections grouped by operational purpose;
- mutation controls visually distinct from read-only fields.

### File / Readiness Panels

Use for documents, required files, report context, upload/download readiness, and document metadata.

Recipe:

- read-only evidence or secondary context treatment unless the panel contains an allowed action;
- stable rows for file name, status, source, and timestamp;
- clear unavailable/error states;
- avoid implying required-document enforcement unless that authority exists.

### Review / Revision Panels

Use for reviewer queues, revision history, review decisions, and resubmission context.

Recipe:

- primary or action/decision treatment when a review decision is available;
- read-only evidence treatment for revision history;
- deterministic status color tied to explicit review state;
- clear separation between reviewer action and historical context.

### Operational Input / Evidence Panels

Use for explicit operational status inputs such as inspection scheduled, report on track, and
waiting on client.

Recipe:

- read-only evidence treatment by default;
- action/decision treatment only for create/clear controls in an approved slice;
- show source, freshness, and timestamp context clearly;
- never imply lifecycle transition, automation, notification delivery, or signal suppression unless
  separately implemented.

### Activity Panels

Use for audit events, order activity, packet activity, and operational history.

Recipe:

- read-only evidence treatment;
- compact event rhythm;
- clear actor/time/source metadata;
- avoid equal visual weight with action areas;
- preserve domain boundaries between canonical order activity and assignment-scoped activity.

## Table / List Density Guidance

Tables and lists should be dense enough for daily operations while preserving calm structure.

Guidance:

- prioritize scan-first rows;
- keep row height stable;
- use visible but calm row separation;
- make column framing clear without heavy gridlines;
- keep metadata compact and consistently ordered;
- use tabular numbers for counts, dates, and compact numeric values where useful;
- keep row actions predictable and visually secondary until needed;
- protect wide tables with horizontal overflow instead of squeezing content into unreadable columns;
- keep empty, loading, and error states within the table/list surface.

Avoid:

- cardifying every row when a table supports faster comparison;
- oversized rows that reduce operational visibility;
- dense ERP clutter with too many simultaneous actions;
- hidden horizontal overflow that clips actions or status.

## Implementation Order

### A3.1 Shared Surface Recipes / Helpers

Purpose:

- establish shared recipes, helper classes, or small passive primitives only if they reduce real
  duplication and preserve existing behavior.

Possible scope:

- documentation-backed class recipes;
- passive panel/surface wrappers;
- no route, permission, data, workflow, or mutation ownership.

### A3.2 Orders Workspace Surface Pass

Purpose:

- improve the active internal order inventory surface.

Possible scope:

- table/list containment;
- filters and saved-view containment;
- row separation and scan hierarchy;
- support panels kept secondary.

### A3.3 Dashboard / Operations Command Surface Pass

Purpose:

- make owner/admin operational command surfaces easier to scan without adding data.

Possible scope:

- calendar/worklist/summary panel hierarchy;
- attention and support panel separation;
- cockpit density and spacing cleanup.

### A3.4 Order Detail Surface Pass

Purpose:

- separate authority, evidence, files, review/revision context, activity, and operational status
  input surfaces.

Possible scope:

- detail section containment;
- action versus evidence hierarchy;
- file/readiness panel treatment;
- activity/evidence density cleanup.

### A3.5 Role Surfaces Polish Later

Purpose:

- apply refined surface hierarchy to Appraiser `My Work`, Reviewer `Review Queue`, and Owner/Admin
  `Operations Command` after shared recipes and core workspaces are stable.

Possible scope:

- role-native empty states;
- role-specific primary/support panel balance;
- hybrid user clarity.

## Explicit Non-Goals

Phase A3 does not include:

- runtime implementation yet;
- CSS refactor;
- broad component rewrite;
- route changes;
- permission changes;
- workflow/lifecycle changes;
- dashboard data rewrites;
- backend changes;
- Supabase changes;
- schema changes;
- new workflow features;
- Orders page redesign;
- Dashboard redesign;
- Order Detail redesign;
- AMC features;
- Client Portal;
- automation;
- notifications;
- mobile/native implementation;
- AI work;
- production data changes.

## A3 Conclusion

Falcon v1 needs a repeatable operational surface system before workspace-level visual polish
continues.

The system should make hierarchy obvious:

- workspace shell above app background;
- primary operational panels above support context;
- action/decision surfaces above read-only evidence;
- high-priority states visible without becoming noisy;
- tables and lists dense enough for real work.

The next safe phase is **A3.1 Shared Surface Recipes / Helpers**, only if implementation review
confirms shared recipes can improve consistency without changing route, permission, data,
workflow, backend, dashboard data, automation, notification, AMC, Client Portal, mobile/native, or
AI behavior.

## A3.1 Implementation Record

Phase A3.1 implements the smallest shared surface/elevation recipe foundation as passive runtime
helpers.

Runtime files added:

- `src/components/workspace/WorkspaceSurface.jsx`;
- `src/components/workspace/__tests__/WorkspaceSurface.test.jsx`.

A3.1 adds:

- `workspaceSurfaceRecipes` for primary operational panels, secondary context panels,
  action/decision surfaces, evidence/read-only surfaces, high-priority states, and table/list
  surfaces;
- `workspaceSurfaceClassNames(...)` for class composition where a full component wrapper is not
  appropriate;
- `WorkspaceSurface` as a passive presentational wrapper with opt-in tactile elevation.

A3.1 intentionally does not migrate Dashboard, Orders, or Order Detail surfaces yet. The helper is
available for later A3.2, A3.3, and A3.4 surface passes after each workspace is reviewed in its own
slice.

A3.1 preserves:

- all route paths and route guards;
- all permission checks;
- all workflow/lifecycle behavior;
- all dashboard data behavior;
- all backend, Supabase, schema, automation, notification, AMC, Client Portal, mobile/native, AI,
  and production data behavior.

## A3.2 Implementation Record

Phase A3.2 applies shared surface recipes to the Orders workspace as a presentation-only surface
pass.

Runtime files updated:

- `src/pages/orders/Orders.jsx`;
- `src/features/orders/OrdersFilters.jsx`;
- `src/features/orders/UnifiedOrdersTable.jsx`.

A3.2 changes:

- frames the Orders workspace header with the shared primary operational panel recipe;
- frames the active filter chip row and Orders workspace context strip with the shared evidence
  recipe;
- frames the Orders filter panel with the shared secondary context recipe;
- composes the Orders table root from the shared table/list surface recipe while preserving its
  existing table chrome and active order behavior.

A3.2 preserves:

- all Orders route paths and URL filter semantics;
- all saved-view behavior;
- all Orders table data loading and row rendering behavior;
- all Smart Action and workflow/lifecycle behavior;
- all permission checks and route guards;
- all backend, Supabase, schema, dashboard data, automation, notification, AMC, Client Portal,
  mobile/native, AI, and production data behavior.

## A3.3 Implementation Record

Phase A3.3 applies shared surface recipes to the Dashboard / Operations Command surface as a
presentation-only command-surface pass.

Runtime files updated:

- `src/features/dashboard/DashboardPage.jsx`;
- `src/features/dashboard/workbenches/AppraiserWorkbenchPreview.jsx`;
- `src/features/dashboard/workbenches/ReviewerWorkbenchPreview.jsx`.

A3.3 changes:

- frames the Dashboard command header with the shared primary operational panel recipe;
- frames calendar, status, workload, readiness, and support areas with shared secondary/evidence
  recipes;
- frames the active worklist area as the primary operational dashboard surface while preserving the
  existing dashboard table integration;
- frames passive appraiser and reviewer workbench previews with shared secondary/evidence recipes;
- keeps status/KPI colors deterministic and tied to existing dashboard state.

A3.3 preserves:

- all dashboard data hooks, queries, summaries, and row filtering behavior;
- all Dashboard route paths and link targets;
- all Orders table integration behavior from the dashboard;
- all workflow/lifecycle behavior;
- all permission checks and route guards;
- all backend, Supabase, schema, automation, notification, AMC, Client Portal, mobile/native, AI,
  and production data behavior.
