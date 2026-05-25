# Falcon v1 Brand / Shell / Layout Audit

## Purpose

This document audits Falcon's current visual system, shell structure, navigation hierarchy, surface
layering, and operational presentation quality before Falcon v1 implementation work begins.

Falcon v1 is locked as the Internal Staff Appraiser Platform for Continental's daily appraisal
operations. Phase A1 evaluates how the current product presentation supports that direction and
where it still feels too flat, white, blended, or prototype-like.

This phase is analysis and planning only. It does not implement runtime code, CSS refactors,
component rewrites, routes, navigation changes, workflow features, backend changes, Supabase
changes, schema changes, automation, notifications, Client Portal behavior, mobile/native
implementation, AI UI systems, or production data changes.

## Audit Lens

The audit evaluates presentation through these v1 needs:

- operational comprehension;
- visual hierarchy;
- calm structure;
- premium operational-console feel;
- role clarity;
- framing and containment;
- reduced cognitive load.

Falcon should not become decorative or visually loud. It should become easier to understand under
daily operational pressure.

## Current-State Findings

### Top Nav Hierarchy

Current top navigation has gained profile-aware grouping and mobile priority ordering, but the
visual presentation still reads as a horizontal route row more than a role-native command shell.

Findings:

- desktop grouping helps orientation but group boundaries remain subtle;
- management/admin surfaces can still visually compete with daily work surfaces;
- top nav density can feel stretched across wider viewports;
- active states are usable but not strong enough to anchor the user's current operational lane;
- brand and shell identity still feel closer to an application scaffold than an operational
  workstation.

### Shell Structure

Current shell structure provides consistent access to workspaces, but v1 needs stronger framing
around the active work area.

Findings:

- pages often open into white panels on light backgrounds without enough environmental contrast;
- the shell does not yet create a strong command-center boundary around the workspace;
- role-aware behavior exists, but the page frame does not always reinforce `My Work`, `Review
  Queue`, or `Operations Command`;
- support and management areas can appear as equal-weight siblings rather than secondary lanes.

### Workspace Containment

Workspace containment has improved through bordered panels and section shells, but many areas still
blend together.

Findings:

- primary work surfaces are present but not always visually dominant;
- repeated white cards and white sections reduce scannability;
- section boundaries sometimes rely on spacing alone;
- important operational zones would benefit from stronger perimeter framing and interior hierarchy;
- detail surfaces need clearer separation between lifecycle authority, operational context, files,
  activity, and support signals.

### Surface Layering

Falcon currently uses borders and small shadows, but the depth system is not yet strong enough for
premium operational-console presentation.

Findings:

- many panels share similar border/shadow strength regardless of importance;
- action areas, read-only context, and evidence surfaces sometimes occupy similar visual weight;
- high-priority operational states need clearer elevation or accent treatment;
- overlays and drawers are functional but should feel more like focused workstations.

### Border Visibility

Thin slate borders are consistent but often too quiet against white and near-white backgrounds.

Findings:

- low-contrast borders contribute to white-on-white blending;
- section shells need more intentional perimeter contrast;
- nested information groups need local containment without becoming stacked card clutter;
- important operational panels should not disappear into the page.

### Shadow / Elevation Consistency

Shadow usage is restrained, which supports calmness, but hierarchy is underdeveloped.

Findings:

- `shadow-sm` appears broadly and can flatten hierarchy;
- elevated action areas need a slightly stronger but still restrained treatment;
- primary workspace shells need more presence than secondary context cards;
- high-priority states need visual priority without alarmist styling.

### Spacing Consistency

Spacing is generally calm but sometimes too loose or too uniform.

Findings:

- operational dashboards and details can feel airy without feeling structured;
- dense worklists need tighter vertical rhythm;
- support cards need enough breathing room without stealing attention;
- repeated sections should use predictable internal spacing and tighter metadata groups.

### Operational Framing

Falcon has useful operational summaries, attention panels, file readiness, review context, and
operational input evidence. The next gap is framing these as a coherent operational workstation.

Findings:

- derived context is helpful but can look like separate cards rather than one operational story;
- order detail needs clearer zones for authority, context, evidence, files, and activity;
- role-specific work surfaces need stronger first-screen framing.

### Active-State Visibility

Active route and status treatment exists, but v1 should make current work mode unmistakable.

Findings:

- active nav states should be more legible without becoming loud;
- selected filters and lanes should read as operational mode, not just UI state;
- current role/work profile should be a visible shell cue where useful.

### Visual Anchors

Current surfaces lack strong visual anchors beyond headers and cards.

Findings:

- pages need one or two structural anchors that orient the user quickly;
- accent-wall style anchors can help distinguish role/work modes;
- anchors should be architectural, not decorative gradients or illustrations.

### Section Separation

Section separation is present but uneven.

Findings:

- dashboard/workspace panels need clearer separation between primary and support areas;
- detail pages need stronger separation between operational overview and secondary detail body;
- management/admin support should be separated from direct daily work.

### Role-Aware Hierarchy

Role-aware presentation exists in navigation, command palette, dashboard presentation, and
workbench previews. The visual shell needs to make those mental models feel native.

Findings:

- appraiser surfaces should make `My Work` primary;
- reviewer surfaces should make `Review Queue` primary;
- owner/admin surfaces should feel like `Operations Command`;
- hybrid users need owner/admin risk visible without burying personal production work.

### Dashboard / Workspace Density Balance

Falcon has enough operational signals now that density must be controlled deliberately.

Findings:

- dashboards need structured density rather than more cards;
- tables need scan-first density;
- summaries should be compact and high-signal;
- support context should not create a second dashboard under every page.

## Current Problems To Solve

Falcon v1 presentation should address:

- white-on-white blending;
- weak section containment;
- insufficient contrast hierarchy;
- flat operational presentation;
- top nav feeling horizontally stretched or cluttered;
- management/admin surfaces visually competing with operational workflow;
- insufficient workstation-style framing;
- underpowered active states;
- inconsistent elevation hierarchy;
- operational summaries appearing as separate cards instead of a coherent context layer;
- role-aware behavior not always matched by role-aware visual priority.

## Falcon v1 Visual Philosophy

Falcon v1 visual direction is:

- premium operational console;
- framed operational workstations;
- layered surfaces;
- stronger contrast hierarchy;
- restrained but meaningful depth;
- accent-wall style operational anchors;
- low cognitive load;
- operational clarity first.

Avoid:

- decorative startup-dashboard aesthetics;
- noisy enterprise ERP clutter;
- giant marketing-style hero sections;
- excessive gradients or illustration;
- ornamental motion;
- new visual systems that do not help daily internal appraisal operations.

## Surface Hierarchy Proposal

Falcon v1 should use a clearer presentation hierarchy.

### Tier 1: App Background

Purpose:

- establish workspace environment;
- create contrast behind operational shells;
- make white panels feel intentionally placed.

Direction:

- use a calm slate or neutral app background;
- avoid pure white page backgrounds behind every shell;
- avoid decorative gradients as the main structure.

### Tier 2: Workspace Shell

Purpose:

- frame the current role/work mode;
- contain primary operational surfaces;
- distinguish the active workstation from global app chrome.

Direction:

- stronger perimeter border;
- slightly deeper surface than ordinary cards;
- consistent header/context/action relationship;
- optional accent-wall anchor when it clarifies the workspace.

### Tier 3: Operational Panels

Purpose:

- hold worklists, queues, details, summaries, files, and activity.

Direction:

- clear panel titles;
- visible but restrained borders;
- predictable spacing;
- panel hierarchy based on operational priority.

### Tier 4: Elevated Action Areas

Purpose:

- hold allowed actions, controlled mutations, and decision points.

Direction:

- visually separate from read-only evidence;
- avoid competing with lifecycle/Smart Actions unless the action is equally important;
- use restrained elevation and concise copy.

### Tier 5: High-Priority Operational States

Purpose:

- draw attention to blockers, overdue work, revision pressure, review needs, and stale updates.

Direction:

- stronger contrast or accent treatment;
- no fake risk scoring;
- no alarmist color unless the state is genuinely urgent;
- copy should remain conservative and operational.

## Border / Shadow / Elevation Philosophy

Borders should make operational containment visible.

Guidance:

- primary shells should have visibly stronger boundaries than passive cards;
- important operational panels should not rely on whitespace alone;
- nested zones should use borders sparingly but consistently;
- borders should reinforce the task boundary, not decorate every item.

Shadows should communicate hierarchy, not decoration.

Guidance:

- app shell: little to no shadow;
- workspace shell: subtle but clear depth;
- operational panels: restrained shadow or border, depending on density;
- action panels/drawers: stronger depth than read-only summaries;
- high-priority states: contrast and copy before heavy shadow.

Elevation should be predictable:

- primary work surface above background;
- action surface above read-only context;
- modal/drawer above page;
- alerts above standard panels.

## Navigation Hierarchy Audit

Current top nav problems:

- primary and secondary routes can feel visually equal;
- owner/admin broad access can create clutter;
- active state could be stronger;
- grouping exists but the shell still feels like route navigation more than operational navigation;
- mobile ordering is role-prioritized, but desktop shell could better distinguish operations from
  management/support.

Operational versus management grouping:

- daily work should be first and visually dominant;
- management surfaces should remain accessible but secondary;
- setup/support should not compete with live work.

Role-aware expectations:

- appraisers should see `My Work` framing before broad order inventory;
- reviewers should see `Review Queue` framing before generic order context;
- owner/admins should see `Operations Command` framing with management as a secondary lane.

Shell simplification opportunities:

- stronger active lane treatment;
- clearer desktop group separation;
- role/profile cue in workspace header or shell context;
- management/support overflow patterns where safe;
- avoid new routes until the current shell hierarchy is clearer.

Owner/admin operational cockpit direction:

- emphasize exception triage, due pressure, unassigned/stale work, review bottlenecks, and team
  readiness;
- keep Team Access, setup, and settings as support surfaces.

Appraiser/reviewer workflow focus direction:

- appraiser: assigned work, due soon, revisions, files/context, status evidence;
- reviewer: review queue, resubmissions, revisions, files/context, review decisions.

## Operational Framing Guidance

### Queues

Queues should:

- look like primary work surfaces;
- support fast scan and action;
- make active filters/lane state obvious;
- avoid low-value card decoration.

### Workspaces

Workspaces should:

- open with a clear role/work frame;
- place daily work first;
- put support context nearby but visually secondary;
- separate management and setup from primary execution.

### Summaries

Summaries should:

- be compact;
- show only high-signal context;
- use conservative copy;
- avoid becoming a second dashboard.

### Detail Panels

Detail panels should:

- separate lifecycle authority, operational evidence, files, review context, and activity;
- use stronger containment for the active task;
- keep read-only evidence visually distinct from mutation controls.

### Context Cards

Context cards should:

- be useful at a glance;
- use tight labels and consistent metadata rhythm;
- avoid equal visual weight with the primary work surface.

### Operational Evidence

Operational evidence should:

- read as temporary context;
- remain below lifecycle/status authority;
- be visually calm and auditable;
- avoid implying automation, notification, or workflow completion.

## Density / Spacing Philosophy

Use breathing room when:

- establishing workspace identity;
- separating primary work from support content;
- presenting review/detail decisions;
- preventing dense information from becoming noisy.

Tighten density when:

- scanning worklists;
- showing repeated metadata;
- presenting queues;
- rendering support signals near the primary work.

Avoid sterile whitespace by:

- grouping related information into framed zones;
- using clear section titles and metadata rhythm;
- reducing repeated standalone cards;
- making primary and secondary surfaces visually distinct.

Avoid clutter by:

- limiting competing action regions;
- keeping management/support secondary;
- hiding future modules;
- avoiding repeated summaries that say the same thing.

## Role-Aware Shell Direction

### Appraiser = My Work

Layout should reinforce:

- assigned orders first;
- due/revision pressure;
- file and property context;
- operational status evidence;
- fewer admin/support distractions.

### Reviewer = Review Queue

Layout should reinforce:

- review queue first;
- submitted/resubmitted work;
- revision history and review context;
- files available for review;
- clear decision zones.

### Owner/Admin = Operations Command

Layout should reinforce:

- exception triage;
- due/overdue pressure;
- workload and assignment visibility;
- review bottlenecks;
- management/setup as secondary support.

## Suggested Implementation Phases

### A2 Shell / Nav Refactor

Purpose:

- make the active shell feel like a role-aware operational console.

Possible scope:

- stronger desktop shell framing;
- clearer nav group separation;
- active lane treatment;
- role/work profile context in the shell;
- management/support de-emphasis where safe.

### A3 Surface / Elevation System

Purpose:

- define repeatable border, shadow, depth, and panel hierarchy.

Possible scope:

- shell, panel, action area, evidence, and high-priority state recipes;
- no broad token rewrite unless required;
- focused visual regression checks.

Planning record:

- Phase A3 is documented in `docs/FALCON_V1_SURFACE_ELEVATION_SYSTEM_PLAN.md`;
- the plan expands this audit's surface hierarchy into repeatable recipes for app background,
  workspace shell, primary panels, secondary context, action/decision surfaces, read-only evidence,
  high-priority states, and table/list surfaces;
- Phase A3 remains planning only and does not authorize runtime implementation or broad component
  rewrites.

### A4 Operational Environment Identity System

Purpose:

- define Falcon's shared operational atmosphere before further runtime visual changes.

Possible scope:

- Executive Operational Command Console identity;
- operational spine;
- tonal hierarchy;
- signature environmental elements;
- page consistency rules for Dashboard, Orders, Order Detail, future My Work, and future Review
  Queue.

Planning record:

- Phase A4 is documented in `docs/FALCON_V1_OPERATIONAL_ENVIRONMENT_IDENTITY_SYSTEM.md`;
- it turns the audit's workspace-framing concern into an environment-level identity system;
- Phase A4 remains planning only and does not authorize runtime implementation, CSS changes, or
  component changes.

### A5 Role Surface Polish

Purpose:

- make role surfaces feel native rather than adapted from a generic admin panel.

Possible scope:

- Appraiser `My Work`;
- Reviewer `Review Queue`;
- Owner/Admin `Operations Command`;
- role-specific empty states and support hierarchy.

## Explicit Non-Goals

Phase A1 does not include:

- runtime implementation;
- CSS refactor;
- component rewrite;
- new workflow features;
- AMC features;
- Client Portal;
- mobile/native implementation;
- automation;
- notifications;
- AI UI systems;
- route changes;
- permission changes;
- dashboard data changes;
- Supabase/backend changes.

## A1 Conclusion

Falcon has enough functional and operational foundation to shift from feature expansion into
presentation completion.

The highest-value v1 presentation work is not decorative redesign. It is stronger operational
framing:

- clearer shell hierarchy;
- stronger workspace containment;
- more intentional navigation hierarchy;
- more visible role/work anchors;
- better surface layering;
- more consistent density and elevation.

Falcon v1 Phase A2 is now documented in `docs/FALCON_V1_SHELL_NAV_REFACTOR_PLAN.md`.

The next safe runtime phase is **A2.1 Nav Hierarchy Implementation**, scoped to presentation from
already-visible links and existing shell metadata.
