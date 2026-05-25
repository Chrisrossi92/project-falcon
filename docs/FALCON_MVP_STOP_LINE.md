# Falcon MVP Stop-Line Definition

## Purpose

This document defines the Falcon MVP stop-line: the point where development stops adding new
feature classes and shifts to verification, hardening, internal rollout, and production readiness.

The stop-line exists to prevent indefinite expansion. Falcon can continue improving quality before
MVP, but new product surfaces, workflow systems, automation engines, portals, analytics programs,
mobile/native implementations, and backend authority changes must wait unless they fix a verified
MVP blocker.

This is planning documentation only. It does not change runtime behavior, routes, permissions,
backend behavior, Supabase behavior, query behavior, workflow behavior, notification behavior,
automation, mobile/PWA/native behavior, Client Portal behavior, branding, or production data.

## MVP Ready Definition

Falcon is MVP ready when a small internal operations team can run the core appraisal/order workflow
in production with acceptable reliability, governed access, clear daily work surfaces, safe
document handling, and enough operational context to avoid manual spreadsheet coordination.

MVP ready means:

- owner/admin users can create, view, triage, assign, review, and manage active order work;
- appraisers can understand assigned work, due pressure, revisions, documents, and next steps;
- reviewers can understand review work, revision context, file readiness, and due pressure;
- assignment/vendor recipients can see and act on received assignment work without internal order
  visibility leakage;
- Team Access, company membership, role assignment, and permission boundaries are trustworthy;
- private document handling works through approved signed upload/download/archive paths;
- current dashboards, navigation, command palette, Orders workspace, Order Detail, drawer,
  Calendar, Clients, Assignments, Team Access, and Settings are coherent enough for internal use;
- production environment, Supabase target, storage, Edge Functions, CSP, auth, migrations, and
  rollback evidence meet the minimum readiness listed below;
- launch smoke tests pass for owner/admin, appraiser, reviewer, and assignment-recipient workflows;
- no known blocker requires a new feature class to make internal MVP use viable.

MVP ready does not mean complete, automated, client-facing, native-mobile, analytics-rich, or fully
customizable.

## Stop-Line Rule

After the MVP stop-line is declared, Falcon should not add a new feature class before MVP launch
unless the work fixes a verified blocker.

A verified blocker must meet all of these conditions:

- it prevents the internal team from completing a core MVP workflow;
- it cannot be handled by training, documentation, operational procedure, or a small polish fix;
- it does not create a broader system than the blocker requires;
- it preserves existing permission, route, RLS/RPC, workflow, storage, and audit boundaries;
- it has a focused validation plan and rollback path.

Allowed pre-MVP work after the stop-line:

- bug fixes;
- test fixes;
- accessibility and responsive polish for existing surfaces;
- copy clarifications that reduce workflow confusion;
- production hardening;
- smoke-test repair;
- security/permission defects;
- data migration or environment readiness work;
- small operational read-only improvements that directly unblock acceptance.

Blocked pre-MVP work after the stop-line:

- new modules;
- new portals;
- new workflow engines;
- new automation systems;
- new analytics programs;
- new native/mobile/PWA implementation;
- new side-effecting action classes;
- new backend authority models;
- broad redesigns;
- large refactors not tied to a blocker.

## Required Pre-MVP Capabilities

### Platform And Access

- Authentication works for internal users.
- Current-company resolution is stable.
- Owner/admin, appraiser, reviewer, and assignment-recipient permission paths are understood.
- Route guards and backend/RLS/RPC boundaries remain canonical authority.
- Team Access and invitation flows are usable enough for the initial team.
- Owner/admin can inspect team membership and role/access posture.

### Orders And Daily Work

- Orders list supports active operational work.
- Order Detail is usable for property, client, assignment, file, activity, review, and status
  context.
- Inline order drawer supports quick inspection without breaking the Orders table flow.
- Smart Actions remain governed and do not expose unauthorized lifecycle operations.
- Operational attention cues surface due pressure, review/revision context, file readiness, and
  derived status signals without becoming workflow authority.
- Historical Orders readback exists for preserved archived/cancelled/voided context.

### Documents And Files

- Order documents use private storage and approved signed URL paths.
- Upload, download, metadata display, and archive behavior remain governed.
- File Readiness Summary gives conservative read-only context.
- Print Packet read-only browser preview is available for internal operational use.
- No raw storage paths, public file URLs, or file contents are exposed unintentionally.

### Review And Revision

- Review status and revision context are visible in Order Detail and drawer surfaces.
- Review / Revision Context Summary remains read-only and conservative.
- Reviewer-facing work is discoverable through dashboard/workbench previews, Orders filters, and
  command/navigation priority.
- Review workflow authority remains in existing governed actions.

### Assignments / Received Work

- Assignment-only users remain isolated from canonical internal order/client access.
- Assignment/Received Work surfaces preserve packet-scoped visibility underneath.
- Offer, active work, submitted work, and owner review states are understandable enough for MVP.
- Owner/admin sent-assignment visibility is usable for internal coordination.

### Role-Aware Shell And Navigation

- Shell resolver, profile exposure, dashboard presentation, desktop/mobile navigation priority,
  and command palette priority are stable.
- Owner/admin, appraiser, reviewer, and received-work users land in coherent enough daily work
  surfaces.
- Navigation and command priority remain presentation/discoverability, not authority.

### Production Environment

- Production Supabase target is explicitly decided and recorded.
- Schema/migration head, RLS/RPC/grant posture, Auth/app-user/company membership, storage, Edge
  Functions, CORS, and secrets have minimum evidence.
- Vercel project, branch, deployment, env var names, domains, CSP, headers, rollback, and preview
  posture have safe evidence.
- Preview or staging smoke is completed before production cutover when available.
- Production smoke tests are defined and pass before internal rollout.

## Explicit Post-MVP Backlog

These are valuable but should wait until after MVP unless they fix a verified blocker:

- Client Portal / Requests shell;
- vendor profile/availability portal;
- native iOS/Android apps;
- full PWA implementation;
- communication automation engine;
- configurable reminder timing/escalation/templates;
- email/SMS notification automation beyond existing notification foundations;
- AI-assisted daily summaries;
- AI document extraction or review assistance;
- analytics dashboards beyond MVP operational KPI/workload foundations;
- trend charts, lifecycle analytics, and exports/reporting;
- full dashboard/workbench component replacement for `My Work` and `Review Queue`;
- shell switcher and user-selectable default shell;
- company-configurable terminology;
- role-specific onboarding checklists;
- client-safe status projection designer;
- required-document enforcement system;
- document preview/viewer beyond approved signed-download behavior;
- bulk lifecycle actions;
- restore/reopen/unarchive workflows;
- advanced activity feed filtering/search;
- mobile quick-action rails;
- offline mode;
- payment/billing integrations;
- public API or third-party integrations.

## Do Not Add Before MVP

Do not add these before MVP launch:

- new Client Portal runtime routes or client-facing request/report/document surfaces;
- new native app or PWA app-shell implementation;
- new automation/reminder/escalation engine;
- new email/SMS template editor;
- AI generation, extraction, summarization, or decision-support features;
- new workflow/lifecycle authority outside approved existing contracts;
- new role-authority model or permission redesign;
- new backend data model for operational status unless required for a blocker;
- new bulk mutation features;
- new reporting/export subsystem;
- new billing/payment/accounting module;
- new public integrations;
- major redesign of navigation, DashboardGate, Orders table columns, or core routes;
- hidden disabled modules as navigation clutter.

## Launch / Smoke-Test Criteria

Before MVP internal launch, these smoke tests must pass in the intended production or production-like
environment:

- user can sign in and resolve current company;
- owner/admin can open Dashboard, Orders, Order Detail, Order Drawer, Calendar, Clients, Team
  Access, Settings / Owner Setup, Assignments, and Historical Orders where permissioned;
- owner/admin can create or inspect an order through the approved workflow path used for MVP;
- appraiser can open assigned work, inspect due/revision/file context, and reach allowed actions;
- reviewer can open review work, inspect review/revision/file context, and reach allowed actions;
- assignment-recipient can open Received Work / Assignments without canonical order/client leakage;
- document upload/download/archive smoke succeeds through approved paths;
- private storage does not expose public/raw object paths;
- Smart Actions show only allowed actions for the tested user;
- route guards deny unavailable workspaces cleanly;
- navigation and command palette do not expose unauthorized destinations as access;
- activity/notes surfaces load and write only where currently approved;
- no critical console errors on Dashboard, Orders, Order Detail, Calendar, Assignments, Team
  Access, and Settings;
- production CSP allows required runtime hosts and blocks obsolete hosts where intentionally
  removed;
- rollback procedure is known and documented.

## Internal Rollout Criteria

Internal rollout can begin when:

- launch smoke tests pass;
- owner/admin acceptance checklist is complete;
- appraiser/reviewer/vendor acceptance checklist is complete or explicitly marked not applicable;
- production readiness minimums are complete;
- known issues are triaged into `blocker`, `launch follow-up`, or `post-MVP`;
- no unresolved blocker requires a new feature class;
- support owner and rollback owner are named;
- first users know what Falcon does not yet do.

Internal rollout should start with a constrained user set:

- one owner/admin;
- one appraiser or appraiser-like staff user;
- one reviewer or reviewer-like staff user;
- one assignment/vendor recipient if assignment workflows are part of the first internal run.

## Owner/Admin Acceptance Checklist

- Can sign in and reach the correct company.
- Can identify today's active work, due pressure, overdue work, and review/revision pressure.
- Can open Orders, Order Detail, and inline drawer without losing context.
- Can understand Attention Summary, File Readiness, Review Context, and row next-step cues as
  derived support, not authority.
- Can inspect Team Access and invite/team state.
- Can inspect owner setup/readiness surfaces where applicable.
- Can use Calendar for operational schedule context.
- Can use Clients/Relationships enough for MVP coordination.
- Can inspect Assignments / Sent Assignments where permissioned.
- Can inspect Historical Orders for archived/cancelled/voided readback.
- Can confirm Smart Actions remain governed and expected.
- Can explain what is post-MVP and not part of initial launch.

## Appraiser / Reviewer / Vendor Acceptance Checklist

### Appraiser

- Can sign in and reach assigned work.
- Can understand due soon, overdue, revision, appointment, file, and activity context.
- Can open Order Detail and drawer for assigned work.
- Can identify what needs action without owner/admin clutter dominating the surface.
- Can reach allowed submit/resubmit or status workflow actions where currently implemented.
- Does not see owner-only controls unless separately permissioned.

### Reviewer

- Can sign in and reach review work.
- Can understand review pending, revisions open, file readiness, and stale/update context.
- Can open supporting order context and activity without unrelated admin setup noise dominating.
- Can reach allowed review workflow actions where currently implemented.
- Does not see owner-only controls unless separately permissioned.

### Assignment / Vendor Recipient

- Can sign in and reach Received Work / Assignments where assignment access exists.
- Can distinguish offer, active work, submitted work, owner review, and completed/terminal state.
- Can open assignment detail without canonical order/client visibility leakage.
- Can reach allowed accept/decline/submit actions where currently implemented.
- Does not see Orders, Clients, Team Access, or owner setup unless intentionally permissioned and
  designed.

## Production Readiness Minimums

MVP production readiness requires:

- selected production Supabase target recorded;
- Vercel project, production branch, domain, build, deployment, env var names, and rollback evidence
  recorded;
- production CSP/header posture reviewed against the selected Supabase target;
- schema/migration head evidence captured for the selected target;
- Auth/app-user/company membership/role assignment parity proven for initial users;
- permission catalog/template role readiness verified;
- storage bucket/function readiness verified for order documents;
- Edge Function/CORS/secret-name readiness verified for document and invite flows used in MVP;
- production or production-like smoke tests pass;
- backup/rollback procedure documented;
- no secret values, anon keys, service-role keys, or sensitive screenshots stored in docs.

## Acceptance Of Known Limitations

Before declaring MVP ready, the team should explicitly accept that MVP does not include:

- Client Portal;
- native mobile app;
- PWA install/offline support;
- communication automation engine;
- AI summaries or document extraction;
- full analytics/reporting;
- configurable workflow/status model;
- required-document enforcement;
- advanced exports;
- billing/payment;
- public integrations.

These limitations are acceptable only if the internal team can complete the core daily workflow
without them.

## MVP Stop-Line Declaration

The MVP stop-line can be declared when:

- required pre-MVP capabilities are complete enough for internal use;
- launch/smoke-test criteria pass;
- acceptance checklists are signed off or explicitly waived;
- production readiness minimums are met;
- remaining issues are categorized;
- no new feature class is required to fix a blocker.

After declaration, all new work should be classified as:

- `MVP blocker fix`;
- `MVP hardening`;
- `MVP smoke-test repair`;
- `MVP launch support`;
- `post-MVP backlog`.

Anything that does not fit those categories should wait.
