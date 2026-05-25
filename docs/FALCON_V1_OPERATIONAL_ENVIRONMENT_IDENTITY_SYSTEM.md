# Falcon v1 Operational Environment Identity System

## Purpose

This document defines Falcon's consistent operational atmosphere before further runtime visual
changes.

Falcon v1 is the Internal Staff Appraiser Platform. A2 and A3 improved shell/navigation hierarchy,
workspace headers, surface recipes, borders, elevation, and page framing. The remaining Phase A gap
is environmental cohesion: Falcon should feel like one premium operational command environment, not
several individually improved pages.

This phase exists to:

- define Falcon's visual and structural identity;
- establish one consistent operational environment;
- prevent random visual experimentation;
- move Falcon toward premium executive operations console quality.

This phase is docs/planning only. It does not implement runtime code, CSS changes, component
changes, route changes, permission changes, workflow changes, data changes, AMC work, Client Portal
work, automation, AI UI, mobile-native work, backend changes, Supabase changes, schema changes, or
production data changes.

## Core Identity

Falcon v1's visual identity should be:

- Executive Operational Command Console;
- calm;
- structured;
- high-trust;
- grounded;
- appraisal-native;
- professional.

Falcon should not feel like:

- a startup dashboard;
- decorative SaaS marketing UI;
- generic ERP clutter;
- gamer or cyberpunk UI;
- a pile of unrelated admin pages;
- a prototype with nicer cards.

The ideal feeling is controlled operational authority: a quiet command environment where appraisal
work is organized, current work is obvious, and users trust that actions and evidence are separated.

## Operational Environment Philosophy

Falcon is an environment, not a collection of pages.

The shell creates operational gravity. It should make the user feel anchored inside Falcon's work
world before any page content appears. Navigation, role/work cues, page headers, surfaces, and
status/evidence panels should all inherit the same visual logic.

Workspaces should feel like contained stations. Dashboard / Operations Command, Orders Workspace,
Order Detail, future My Work, and future Review Queue should differ by job-to-be-done, not by
visual language.

Every page should inherit the same visual world:

- consistent app background;
- clear shell-to-workspace relationship;
- stable active lane treatment;
- predictable page header framing;
- repeated surface tiers;
- calm, bounded density;
- no decorative visual ideas that only appear once.

## Operational Spine

The operational spine is Falcon's structural identity layer. It is the visual relationship between
the app frame, active navigation, role/work mode, workspace header, and primary work area.

The spine should include:

- stronger shell anchor;
- darker or deeper structural frame where appropriate;
- consistent app background;
- clear nav/workspace relationship;
- visible workspace boundaries;
- role/work mode cues that connect shell identity to page context.

The spine should not become a heavy dark-mode redesign. It should provide enough structural weight
that the workspace feels grounded and the active lane feels unmistakable.

## Tonal Hierarchy

Falcon should use a stable tonal hierarchy across pages.

### Deep Operational Anchor

Purpose:

- creates structural gravity;
- anchors navigation, shell, and active mode;
- should be used sparingly and decisively.

Possible use:

- top shell/nav frame;
- active lane boundary;
- narrow accent-wall panels where operationally useful.

### App Background

Purpose:

- separates the product environment from page surfaces;
- prevents white-on-white blending;
- provides calm continuity between pages.

Expected character:

- neutral;
- grounded;
- quiet;
- not decorative.

### Workspace Shell

Purpose:

- frames each workspace as a contained station;
- connects shell/navigation state to the active page;
- gives the page perimeter enough presence to read as a work area.

Expected character:

- stronger than individual cards;
- calmer than overlays;
- consistent across Dashboard, Orders, and Order Detail.

### Primary Operational Surface

Purpose:

- holds the main work of the page;
- should be the easiest surface to identify at a glance.

Expected character:

- stronger border or depth than support panels;
- high scan clarity;
- no marketing hero styling.

### Secondary Context Surface

Purpose:

- supports the primary work with context, summaries, filters, readiness, or related information.

Expected character:

- contained but quieter;
- clear boundaries without competing with the main panel.

### Action Surface

Purpose:

- holds allowed decisions, Smart Actions, explicit operational inputs, or other direct controls.

Expected character:

- visually above evidence surfaces;
- distinct from read-only content;
- never implies authority beyond the underlying workflow/RPC permission model.

### Evidence Surface

Purpose:

- holds read-only operational evidence, file/readiness context, activity, review context, or
  audit-like information.

Expected character:

- durable;
- trustworthy;
- contained;
- quieter than action surfaces.

### High-Priority State

Purpose:

- communicates blockers, overdue work, or exceptional operational attention.

Expected character:

- visible and calm;
- stronger border or accent only when operationally justified;
- no alarmist color floods.

## Contrast And Depth Rules

Use stronger contrast intentionally:

- workspace boundaries need enough contrast to be read quickly;
- primary operational panels should not disappear into the app background;
- high-priority states may carry stronger contrast when they represent real operational urgency.

Avoid white-on-white blending:

- do not rely on spacing alone to separate important sections;
- avoid identical backgrounds for app, workspace, panel, and nested evidence surfaces;
- use borders, tonal shifts, or restrained depth to establish hierarchy.

Use dark anchors sparingly but decisively:

- a dark structural anchor can make Falcon feel grounded and executive;
- dark areas should support orientation, not become decoration;
- avoid turning every panel header into a dark block.

Use depth for hierarchy, not decoration:

- action surfaces can sit above evidence surfaces;
- primary work areas can carry more presence than secondary context;
- drawers and modals remain the highest layer;
- ordinary panels should not all float.

Avoid:

- flashy gradients;
- glassmorphism;
- decorative glow;
- theme novelty;
- gamer/cyberpunk treatments;
- visual effects that do not improve operational orientation.

## Falcon Signature Elements

Falcon's signature visual elements should be structural, not ornamental.

Potential signature elements:

- operational spine: the consistent shell/nav/header/workspace relationship;
- framed workstations: page-level containers that make each workspace feel grounded;
- dark structural anchor: selective depth in the shell or active lane;
- accent-wall style panels: used only where they clarify operational mode or primary context;
- restrained depth: shadows and elevation that communicate hierarchy;
- strong active lane: visible current mode without noisy badges;
- precise section framing: clear panel boundaries and scan-first grouping.

These elements should repeat across pages. A signature element used once becomes decoration; a
signature element used consistently becomes Falcon's environment.

## Typography And Density Philosophy

Falcon typography should support operational scanning.

Guidance:

- use stronger section labels where they clarify hierarchy;
- keep metadata rhythm compact and predictable;
- make worklists scan-first;
- preserve executive restraint;
- avoid marketing hero typography inside the app;
- avoid oversized page titles in dense work surfaces;
- keep labels literal and appraisal-native;
- do not use visual drama to compensate for unclear information architecture.

Density should be purposeful:

- Dashboard should show operational pressure without becoming an executive vanity dashboard;
- Orders should feel like a live worklist, not a spreadsheet dump;
- Order Detail should feel like a workstation, not a document page;
- future My Work and Review Queue should present the next action path quickly.

## Page Consistency Rules

Each major surface should feel like a different station inside the same environment.

### Dashboard / Operations Command

Identity:

- command station for owner/admin operational awareness.

Rules:

- primary summary and active work areas should feel command-oriented;
- support cards should not become a second dashboard layer;
- risk/attention areas should be visible without alarmism;
- active shell cue should reinforce Operations Command.

### Orders Workspace

Identity:

- active order inventory and coordination station.

Rules:

- table/list containment should be strong and scan-first;
- filters and saved views should feel attached to the worklist;
- active filter/status strips should clarify mode without becoming noisy;
- the page should feel operational, not administrative.

### Order Detail

Identity:

- specific order workstation.

Rules:

- lifecycle/status authority must be visually separate from evidence;
- allowed actions must be distinguishable from read-only context;
- files, review/revision context, operational input evidence, and activity should each have clear
  containment;
- the page should feel like the place to resolve the order, not just inspect it.

### Future My Work

Identity:

- appraiser execution station.

Rules:

- assigned work and next actions should lead;
- support context should stay near the action path;
- owner/admin operational noise should not dominate;
- visual hierarchy should support daily production flow.

### Future Review Queue

Identity:

- reviewer decision station.

Rules:

- review-ready work, resubmissions, revision needs, and decision context should lead;
- file/readiness and revision context should be close to the review decision path;
- activity/evidence should support review judgment without competing with action surfaces.

## Implementation Roadmap

Recommended Phase A4 implementation sequence:

### A4.1 Environment Identity Runtime Experiment

Purpose:

- test the operational spine, tonal hierarchy, and signature elements in the smallest safe runtime
  slice.

Scope direction:

- one constrained shell/workspace experiment;
- no route, permission, workflow, data, backend, or broad component changes;
- visual comparison before wider application.

### A4.2 Shell Anchor / Operational Spine Implementation

Purpose:

- strengthen the shell anchor and connect active nav/work mode to workspace identity.

Scope direction:

- shell-level structural framing;
- active lane treatment;
- workspace perimeter relationship.

### A4.3 Tonal Hierarchy Pass

Purpose:

- apply the tonal hierarchy consistently across the highest-value internal surfaces.

Scope direction:

- app background;
- workspace shell;
- primary/secondary/action/evidence surface relationship;
- high-priority state treatment.

### A4.4 Cross-Page Visual QA

Purpose:

- review Dashboard, Orders, Order Detail, and any touched role surfaces together.

Scope direction:

- browser review;
- screenshot comparison where possible;
- small corrections only.

### A4.5 Brand Lock Checkpoint

Purpose:

- freeze the v1 operational environment identity before Phase B role-tailored surfaces continue.

Scope direction:

- document accepted identity;
- record remaining visual risks;
- stop random visual experimentation.

## Explicit Non-Goals

Phase A4 does not include:

- runtime code;
- CSS changes;
- component changes;
- route changes;
- permission changes;
- workflow changes;
- data changes;
- AMC work;
- Client Portal work;
- automation;
- AI UI.

## A4.1 Runtime Experiment Record

Phase A4.1 runs the smallest controlled runtime experiment for Falcon's operational environment
identity.

Runtime files updated:

- `src/layout/Layout.jsx`;
- `src/components/shell/TopNav.jsx`;
- `src/components/workspace/WorkspaceSurface.jsx`;
- `src/components/workspace/__tests__/WorkspaceSurface.test.jsx`.

A4.1 changes:

- strengthens the app environment from a polite light frame into a deeper slate operational
  command environment;
- adds a darker shell/workspace perimeter so routed pages sit inside one grounded workstation;
- refines TopNav into the operational spine with a deeper structural anchor, stronger active lane,
  darker grouped nav containers, and shell utility contrast;
- tunes shared `WorkspaceSurface` recipes so primary/table surfaces have stronger containment,
  secondary/evidence surfaces are tonally distinct, and action surfaces sit above evidence;
- leaves Dashboard, Orders, and Order Detail page logic and component structure untouched so the
  experiment remains reversible.

A4.1 preserves:

- all route paths and route guards;
- all permission checks and visible-link filtering;
- all shell profile resolution and work-mode cue behavior;
- all command palette behavior;
- all dashboard, Orders, and Order Detail data/query behavior;
- all workflow/lifecycle and Smart Action behavior;
- all backend, Supabase, schema, automation, notification, AMC, Client Portal, mobile-native, AI,
  and production data behavior.

A4.1 experiment assessment:

- Falcon now has a clearer operational spine: dark shell anchor -> framed workspace environment ->
  lighter operational surfaces;
- the change moves Falcon closer to the intended Executive Operational Command Console direction
  without introducing full dark mode, decorative gradients, glassmorphism, broad page rewrites, or
  new features;
- the experiment should be visually reviewed across Dashboard, Orders, and Order Detail before any
  wider A4.2/A4.3 pass.

## A4.2 Operational Spine Composition Plan

Phase A4.2 is documented in `docs/FALCON_V1_OPERATIONAL_SPINE_COMPOSITION_PLAN.md`.

It defines the shell information architecture before runtime implementation of a left operational
rail and utility top bar. The core decision is:

- **LEFT = operational movement**;
- **TOP = utility/context**;
- **CENTER = active work**.

A4.2 plans the transition from top-nav-centered route inventory toward a persistent operational
spine where the left rail becomes primary operational navigation authority and the top bar becomes
compact utility/context. It remains planning only and does not add runtime code, remove routes,
change permissions, alter workflow, change data, or touch backend/Supabase behavior.

## A4.2.1 Operational Spine Runtime Experiment

Phase A4.2.1 begins the runtime expression of the operational spine identity.

Runtime shell direction:

- the persistent desktop left rail becomes Falcon's primary operational movement layer;
- the top bar moves toward utility/context only;
- the app background, shell, workspace frame, and page surfaces now have stronger tonal separation;
- the rail uses existing permission-filtered links and shell profile grouping metadata;
- the current work-mode cue remains presentation-only and does not become authorization.

A4.2.1 preserves:

- all routes and route guards;
- all permission checks and visible-link filtering;
- all workflow/lifecycle behavior;
- all Dashboard, Orders, and Order Detail data behavior;
- all backend, Supabase, schema, automation, notification, AMC, Client Portal, AI, and production
  data behavior.

Identity assessment:

- the experiment moves Falcon further away from a polite white top-nav app and closer to one
  grounded Executive Operational Command Console;
- the environment now has a stronger operational spine without switching to full dark mode or
  introducing decorative gradients, glassmorphism, broad page rewrites, or new features;
- A4.2.2 should stay focused on nav migration polish and parity rather than redesigning page
  workspaces.

## Logo Implementation Strategy

Falcon v1 logo usage is governed by `docs/FALCON_V1_LOGO_IMPLEMENTATION_STRATEGY.md`.

Environment identity rules:

- the shell should have one primary brand anchor;
- the top shell carries the full dark-shell Falcon wordmark;
- the left rail carries operational mode/context and remains the primary movement anchor;
- the top utility layer should stay secondary and should not duplicate full brand identity;
- mark-only assets should support collapsed rail and compact mobile behavior;
- work-mode context such as `Operations Command` remains operational state, not logo text.

## Login Environment Branding Plan

Falcon v1 login/auth presentation is governed by
`docs/FALCON_V1_LOGIN_ENVIRONMENT_BRANDING_PLAN.md`.

Login identity rules:

- login should feel like the entry point into Falcon's Executive Operational Command Console;
- Falcon is the platform/environment identity;
- Continental or another tenant/company logo is workspace identity;
- both identities may appear, but they must not compete or imply the tenant logo is the Falcon
  product brand;
- login polish must preserve auth behavior, routes, permissions, Supabase behavior, workflow, and
  data/query authority.

## Phase B1 My Work Surface Strategy

Phase B1 role-tailored appraiser surface planning is documented in
`docs/FALCON_V1_MY_WORK_SURFACE_STRATEGY.md`.

Environment identity rules:

- My Work should feel like an appraiser workstation inside the same Falcon operational world;
- the surface should answer what the appraiser needs to do today;
- priority, due pressure, revisions, inspections, operational context, file readiness, and allowed
  next actions should be clearer than route inventory or admin widgets;
- B1 remains planning only and does not authorize runtime, workflow, permission, backend/schema,
  AMC, AI, notification, or production data changes.
