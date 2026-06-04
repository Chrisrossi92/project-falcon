# Falcon v1 Operational Completion Strategy

## Purpose

This document locks Falcon v1 around one clear product direction:

- Falcon v1 is the Internal Staff Appraiser Platform for Continental's daily appraisal operations.

The goal is to finish the internal operational loop before expanding into broader AMC, vendor,
client, automation, marketplace, or AI product classes.

This is strategy documentation only. It does not implement frontend code, backend code, schema,
Supabase migrations, queries, routes, navigation, workflow/lifecycle behavior, automation,
notifications, Client Portal behavior, mobile/native behavior, AI behavior, branding runtime
changes, or production data changes.

## Falcon v1 Mission

Falcon v1 should let Continental run daily internal staff appraisal operations inside Falcon with
less ambiguity, fewer context switches, and more confidence than the current tool chain.

The mission is focused on:

- internal staff appraisal operations;
- Continental's daily appraisal workflow;
- staff appraisers;
- reviewers;
- admins;
- owners.

Falcon v1 should feel like a premium operational console for real appraisal work, not a broad
generic admin system and not a future-facing product demo.

## Explicit v1 Scope

Falcon v1 includes the internal operational loop:

- internal order operations;
- appraiser workflow;
- reviewer workflow;
- owner/admin oversight;
- assignment, review, revision, and completion loop;
- order detail context;
- file/document readiness context;
- review/revision context;
- operational status evidence;
- operational clarity and confidence.

v1 work should improve the ability to answer:

- what needs action now;
- what is assigned to me;
- what needs review;
- what needs revision follow-up;
- what is due or overdue;
- what files/context are available;
- what operational evidence says the work is moving;
- what the owner/admin needs to watch.

v1 surfaces should follow the permission-scoped surface doctrine in
`docs/FALCON_PERMISSION_SCOPED_SURFACE_DOCTRINE.md`: role defines default persona, permissions
define allowed actions, and module/product scope defines which operational worlds a user can
access. Internal Staff Appraiser Platform remains the v1 default; AMC Operations, Vendor Portal,
and Client Portal remain v2+ unless explicitly scoped and implemented.

Workspace boundaries are locked in `docs/FALCON_WORKSPACE_DOCTRINE_NAVIGATION_ARCHITECTURE.md`.
Falcon v1 remains the Internal Operations Workspace. AMC Operations is a separate workspace context,
not an Internal Operations view filter, and future Vendor Workspace surfaces should be vendor-native
workbenches rather than hidden menu items inside AMC.

Decision-first UX doctrine is locked in `docs/FALCON_DECISION_FIRST_UX_DOCTRINE.md`. Falcon v1
surfaces should prioritize the decision and next action before supporting or reference detail:
users are paid to make decisions, not read data.

## Explicit v2+ Deferred Scope

The following are deferred beyond Falcon v1 unless a specific item is required to fix a verified
MVP blocker:

- AMC workflows;
- external vendor panel expansion;
- Client Portal;
- advanced automation;
- automated email systems;
- advanced notifications;
- marketplace or multi-tenant commercialization;
- AI appraisal writing or orchestration;
- public client/vendor self-service workflows;
- broad analytics and reporting;
- configurable workflow engines;
- native mobile applications.

These may remain architecturally considered, but they must not drive v1 runtime work.

## MVP Done Definition

Falcon v1 is done when Continental can run daily internal staff appraisal operations inside Falcon
without operational regression versus current tools.

That means:

- internal orders can be created, viewed, updated, assigned, reviewed, revised, completed, and
  preserved without losing operational context;
- appraisers can identify and execute their assigned work;
- reviewers can identify and clear review work or request revisions;
- owners/admins can see operational pressure, exceptions, workload, and readiness;
- files/documents are usable enough for internal work;
- operational status evidence is visible and usable without becoming lifecycle authority;
- permissions, CRUD, workflow actions, and RLS/RPC boundaries are trusted enough for internal use;
- production readiness and smoke-test criteria are satisfied for the internal workflow.

## v1 Completion Phases

### Phase A: Brand / Shell / Layout Lock

Lock the operational presentation system before expanding workflows.

Focus:

- premium operational console direction;
- stronger contrast;
- defined borders;
- framed operational zones;
- layered surfaces;
- accent-wall style visual anchors where they carry operational structure;
- depth and shadow hierarchy;
- calm but structured interface;
- low cognitive load.

Phase A should not create new workflow features. It should make the existing role-aware shell and
workspace surfaces feel finished, consistent, and operationally trustworthy.

#### Phase A1: Brand / Shell / Layout Audit

Phase A1 is documented in `docs/FALCON_V1_BRAND_SHELL_LAYOUT_AUDIT.md`.

It audits the current Falcon visual system, shell structure, navigation hierarchy, surface
layering, and operational presentation quality before implementation. Its conclusion is that v1
presentation work should prioritize stronger operational framing: clearer shell hierarchy,
workspace containment, role/work anchors, navigation hierarchy, surface layering, and
density/elevation consistency.

Phase A1 is analysis only. It does not authorize runtime implementation, CSS refactor, component
rewrite, workflow feature work, AMC features, Client Portal, mobile/native implementation,
automation, notifications, or AI UI systems.

#### Phase A2: Shell / Navigation Refactor Plan

Phase A2 is documented in `docs/FALCON_V1_SHELL_NAV_REFACTOR_PLAN.md`.

It defines the structural shell, navigation hierarchy, operational grouping philosophy, and
role-aware workspace framing before runtime implementation. Its direction is to make Falcon feel
like an operational environment rather than a page collection: daily operational lanes first,
management/support secondary, stronger active workspace identity, clearer shell containment, and
role cues for `My Work`, `Review Queue`, and `Operations Command`.

Phase A2 is planning only. It does not authorize route removals, permission changes, workflow
features, AMC features, Client Portal work, automation, notifications, dashboard data rewrites, or
backend changes.

Multi-workspace transition behavior is outside the original v1 shell refactor and should follow
the workspace architecture lock: switching workspaces should navigate to the target workspace
dashboard, clear workspace-specific state, and prevent stale route persistence across Internal and
AMC order contexts.

#### Phase A3: Surface / Elevation System Plan

Phase A3 is documented in `docs/FALCON_V1_SURFACE_ELEVATION_SYSTEM_PLAN.md`.

It defines repeatable surface, border, shadow, contrast, and depth recipes before workspace visual
polish continues. Its direction is to make operational hierarchy predictable: workspace shells
above app backgrounds, primary operational panels above support context, action/decision surfaces
above read-only evidence, high-priority states visible without becoming noisy, and tables/lists
dense enough for daily work.

Phase A3 is planning only. It does not authorize runtime implementation, CSS refactors, broad
component rewrites, route or permission changes, workflow/lifecycle changes, dashboard data
rewrites, backend or Supabase changes, AMC features, Client Portal work, automation,
notifications, mobile/native implementation, AI work, or production data changes.

#### Phase A4: Operational Environment Identity System

Phase A4 is documented in `docs/FALCON_V1_OPERATIONAL_ENVIRONMENT_IDENTITY_SYSTEM.md`.

It defines Falcon's shared operational atmosphere before further runtime visual changes. Its
direction is to make Falcon feel like one Executive Operational Command Console: calm, structured,
high-trust, grounded, appraisal-native, and professional. A4 sits above individual page polish by
defining the operational spine, tonal hierarchy, signature visual elements, typography/density
philosophy, and cross-page consistency rules for Dashboard / Operations Command, Orders Workspace,
Order Detail, future My Work, and future Review Queue.

Phase A4 is planning only. It does not authorize runtime code, CSS changes, component changes,
route or permission changes, workflow changes, data changes, AMC work, Client Portal work,
automation, AI UI, backend changes, Supabase changes, or production data changes.

Phase A4.2 is documented in `docs/FALCON_V1_OPERATIONAL_SPINE_COMPOSITION_PLAN.md`. It defines the
next shell information architecture direction before runtime implementation: the left rail becomes
the primary operational movement layer, the top bar becomes utility/context only, and the center
remains active work. The plan is intentionally docs-only and does not authorize route removals,
permission changes, workflow changes, backend/Supabase changes, dashboard data changes, AMC work,
Client Portal work, automation, or AI work.

### Phase B: Role-Tailored Operational Surfaces

Finish the daily role surfaces around three primary mental models:

- Appraiser: `My Work`;
- Reviewer: `Review Queue`;
- Owner/Admin: `Operations Command`.

Each role surface should present the right work first, keep support context nearby, and avoid
forcing users through a generic admin vocabulary.

Phase B surfaces should not be role-label-only. Navigation, dashboards, setup guidance, and action
surfaces should be composed from active membership, module scope, effective permissions, and then
role/persona defaults.

### Phase C: CRUD / Workflow Completion

Close the internal operational loop.

Focus:

- order create/edit/read paths;
- appraiser assignment visibility;
- reviewer queue and revision loop;
- file/document handling;
- operational input create/clear evidence;
- completion and preservation behavior;
- permission and authority checks around each mutation.

Phase C should finish current internal workflows before adding new classes of work.

### Phase D: Operational Confidence Pass

Reduce uncertainty after the core loop works.

Focus:

- attention summaries;
- next-step support copy;
- file readiness;
- review/revision context;
- operational status evidence;
- empty states;
- error handling;
- audit/activity readability;
- smoke-test coverage.

This phase is about confidence, not new product surface area.

### Phase E: MVP Freeze / Internal Rollout

Freeze scope and prepare internal use.

Focus:

- stop-line review;
- production readiness minimums;
- owner/admin acceptance checklist;
- appraiser/reviewer acceptance checklist;
- staff onboarding notes;
- regression smoke tests;
- rollback/readback expectations;
- known post-MVP backlog.

During Phase E, new feature classes should be rejected unless they fix a verified launch blocker.

## Brand / System Philosophy

Falcon v1 should feel like a premium internal operations console.

The visual system should favor:

- stronger contrast than the early prototype surfaces;
- defined borders around operational zones;
- framed work areas that make the current task obvious;
- layered surfaces with purposeful depth;
- accent-wall style visual anchors where they help orient the workspace;
- restrained shadows that create hierarchy;
- calm, structured layouts;
- clear scanning paths;
- low cognitive load.

The interface should not become decorative, marketing-like, or visually noisy. Visual richness
should support operational comprehension.

Default surfaces should follow the decision-first hierarchy:

- show decision information such as status, owner, due date, recommendation, and next action;
- minimize supporting metrics and short explanations;
- hide reference detail such as contacts, notes, audit trails, and history behind contextual
  disclosure.

## Role Philosophy

### Appraiser: My Work

The appraiser experience should answer:

- what is assigned to me;
- what needs action today;
- what is due soon or overdue;
- what needs revision follow-up;
- what files/context do I need;
- how do I tell the system work is on track.

Phase B1 My Work planning is documented in
`docs/FALCON_V1_MY_WORK_SURFACE_STRATEGY.md`. It defines My Work as the staff appraiser's
task-first daily execution surface for priorities, due pressure, revisions, inspections,
operational context, file readiness, and next allowed actions. B1 is planning only and does not
authorize runtime implementation, workflow logic changes, permission changes, backend/schema
changes, AMC implementation, AI workflow implementation, notification changes, or production data
changes.

### Reviewer: Review Queue

The reviewer experience should answer:

- what is waiting for review;
- what was resubmitted;
- what needs revisions;
- what review context/files are available;
- what decisions are allowed now.

### Owner/Admin: Operations Command

The owner/admin experience should answer:

- what is blocked;
- what is due or overdue;
- what is unassigned or stale;
- where review/appraiser workload needs attention;
- whether the team can run tomorrow's work inside Falcon.

Owner/admin surfaces should preserve broad oversight without turning every visible event into an
interrupting alert.

## Role-Based Surface Refinement Doctrine

Falcon v1 role refinement should use a stable hierarchy:

- role defines the user's worldview/persona;
- permissions define action authority;
- product/module scope defines which operational world is visible.

Appraiser surfaces should feel like assigned-work execution, not company management. Reviewer
surfaces should feel like review and quality control, not owner/admin management. Admin surfaces
should expose operational coordination tools only within granted permissions. Owner surfaces can
expose company setup, users, permissions, and high-level operational controls.

AMC/network concepts must not leak into Staff Appraiser Platform views unless AMC scope is
explicitly enabled. Runtime language should stay plain and role-native: appraiser/reviewer surfaces
use `Staff Directory`, `Assigned Orders`, and `My Work`; owner/admin surfaces use `Users`,
`Operations`, `Setup`, and `Management`.

Runtime surfaces should avoid redundant explanatory copy once structure is clear, avoid fake
navigation that redirects back to the same place, keep drawers as secondary context rather than row
or detail-page duplicates, and reuse established table/list systems instead of creating weaker
duplicate versions. Visual polish should prioritize calm hierarchy, density, and clarity over
dashboard clutter.

The appraiser experience is visually and structurally locked pending final smoke testing. The
reviewer worldview pass is also checkpointed: reviewer surfaces now center quality control,
revision coordination, files, notes, calendar context, and workflow actions rather than
management/admin operations.

Reviewer checkpoint outcomes:

- dashboard language is `Pam's Reviews` / `My Reviews`, with reviewer queue context;
- Orders language is user-specific and avoids active-operations inventory framing;
- Order Detail suppresses derived operational context clutter while preserving reviewer workflow
  areas;
- reviewers no longer see the general Order Detail `Edit` action;
- pre-review appraiser notes no longer alert reviewers;
- first submission and true resubmission wording are distinct;
- Smart Action clicks are contained and successful reviewer actions update visible rows
  optimistically.

The reviewer checkpoint does not change backend/schema/Supabase behavior, permission model,
query authority, lifecycle authority, route structure, AMC scope, automation, Client Portal
behavior, AI, or production data.

Next refinement order:

1. Admin worldview.
2. Owner worldview.
3. Cross-role consistency pass.

## Success Criteria

Falcon v1 succeeds when:

- the internal workflow loop is complete;
- appraisers, reviewers, owners, and admins can do daily work with fewer context switches;
- operational ambiguity is lower than current tools;
- daily execution is cleaner and easier to scan;
- permissions, CRUD, workflow, and operational evidence behavior are trusted;
- the product is polished enough for internal staff use;
- post-MVP scope is clearly deferred rather than half-started.

## Anti-Scope-Creep Doctrine

Every v1 feature must answer:

> Does this help complete the internal operational loop?

If the answer is no, defer it to v2+.

If the answer is unclear, do not build it until a specific MVP blocker is documented.

v1 should prefer:

- finishing existing internal workflows over adding new surfaces;
- role clarity over feature breadth;
- operational evidence over automation;
- explicit human actions over inference;
- production confidence over product expansion.

## v2+ Backlog Holding Area

Deferred work should be documented without being allowed to leak into v1 implementation:

- Client Portal request/status/document/report experience;
- expanded external vendor operations;
- AMC-specific workflow variants;
- automated email/reminder engines;
- advanced notification routing;
- AI drafting, review assistance, or orchestration;
- marketplace/multi-tenant commercialization;
- mobile-native applications;
- analytics and executive reporting.

The backlog is real, but v1 completion comes first.
