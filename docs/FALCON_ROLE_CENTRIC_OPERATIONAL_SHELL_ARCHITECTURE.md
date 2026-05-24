# Falcon Role-Centric Operational Shell Architecture

## Purpose

This document defines Falcon's role-centric operational experience philosophy and shell
architecture before any runtime shell, route, permission, dashboard, navigation, backend, Supabase,
query, workflow, or portal implementation work.

Falcon should feel like purpose-built operational software for each role, not one large admin panel
with hidden menu items. The product should preserve one platform and one permission model while
presenting different operational shells that match how each role thinks, triages, and works.

This is planning documentation only. It does not change runtime behavior, routes, permissions,
navigation, dashboards, shells, backend behavior, Supabase behavior, query behavior, workflow
behavior, role authority, Client Portal behavior, branding, or production data.

## Inspected Sources

Phase 1A inspected current doctrine and active architecture from:

- `docs/ROLE_PERMISSION_MODEL.md`;
- `docs/FALCON_PERMISSION_MATRIX.md`;
- `docs/FALCON_NAVIGATION_COMPOSITION.md`;
- `docs/FALCON_MODE_LANGUAGE_GUIDE.md`;
- `docs/FALCON_DESIGN_SYSTEM_FOUNDATION.md`;
- `docs/FALCON_INTERACTION_AND_MOTION_FOUNDATION.md`;
- `docs/OPERATIONAL_DASHBOARD_POLISH_STRATEGY.md`;
- `docs/ORDERS_WORKSPACE_POLISH_STRATEGY.md`;
- `docs/CALENDAR_WORKSPACE_POLISH_STRATEGY.md`;
- `docs/CLIENTS_WORKSPACE_POLISH_STRATEGY.md`;
- `docs/ASSIGNMENTS_WORKSPACE_POLISH_STRATEGY.md`;
- `docs/ADMIN_ONBOARDING_PLAN.md`;
- `docs/FALCON_CLIENT_PORTAL_BLUEPRINT.md`;
- `docs/FALCON_VENDOR_PORTAL_BLUEPRINT.md`;
- `docs/FALCON_PRODUCT_MODE_GUARDRAILS.md`;
- `src/features/dashboard/DashboardGate.jsx`;
- `src/lib/navigation/currentNavigationRegistry.js`;
- `src/routes/index.jsx`.

## Core Philosophy

Falcon has one underlying operating system:

- company-scoped identity and membership;
- permission-based authority;
- object-scoped visibility;
- governed order, client, assignment, document, activity, and notification contracts;
- workspace primitives and restrained interaction patterns.

Falcon should have multiple operational shells:

- each shell answers a different daily question;
- each shell emphasizes different navigation, language, alerts, and work surfaces;
- each shell uses the same permission and data authority underneath;
- each shell hides or de-emphasizes irrelevant cognitive load without weakening security;
- each shell should feel native to the role's job, not like a restricted version of someone else's
  workspace.

The shell is presentation and prioritization. It is not permission authority.

## Current Operational Reality

Current Falcon already has several foundations that support role-centric shells:

- permissions, not legacy role names, are the active direction for route and action authority;
- `DashboardGate` already separates order-capable dashboard users from assignment-only dashboard
  users;
- assignment routes are packet-scoped and do not grant canonical order/client visibility;
- polished workspaces now share a calm operational shell language across Dashboard, Orders,
  Calendar, Clients, and Assignments;
- current navigation metadata is descriptive and explicitly not permission authority;
- Client Portal and Vendor Portal are documented as future mode-native experiences, not currently
  live shells.

Current limitations:

- most internal roles still share the same broad shell vocabulary: Dashboard, Orders, Calendar,
  Clients, Assignments, Team Access, Settings;
- owner/admin, appraiser, and reviewer mental models are only partially reflected in first-screen
  priority;
- navigation visibility and route authority are not the same thing everywhere today;
- the word `packet` is useful in assignment architecture, but can feel technical if used as the
  primary user-facing noun for every role;
- Client Portal remains planning only and should not be implied as active.

## Permission Authority Versus UX Visibility

Permission authority answers:

- can this user read this object;
- can this user perform this action;
- can this user enter this route;
- can this user execute this RPC-backed workflow;
- can this user manage company/team/settings surfaces.

UX visibility answers:

- what should be first on the screen;
- which work should be emphasized;
- which surfaces should be secondary;
- which terms should describe the work;
- which alerts deserve interruption;
- which controls should be hidden, collapsed, or de-emphasized even when technically allowed.

Rules:

- do not use shell visibility as a substitute for permission checks;
- do not grant backend or route access because a shell shows a surface;
- do not show every permission-authorized surface just because it is technically available;
- do not hide critical responsibility or compliance information merely to simplify a page;
- preserve route guards, RLS/RPCs, object visibility, and workflow authority as canonical.

## Role Models

### Owner / Admin

#### Primary Goals

- keep the operation moving;
- maintain visibility across all active work;
- resolve bottlenecks before due dates slip;
- manage team access, assignments, client relationships, and setup readiness;
- preserve compliance, audit history, and rollback visibility.

#### Daily Workflow

- scan today's due pressure and overdue work;
- check review and revision queues;
- identify unassigned or stalled orders;
- open orders that need escalation or owner decision;
- manage staff assignments and client needs;
- review Team Access, invitations, owner setup, and readiness when needed.

#### Stress Points

- hidden bottlenecks;
- too many notifications for work they only supervise;
- unclear owner versus admin responsibility;
- fear of losing historical/audit context;
- uncertainty about whether production setup, storage, functions, or roles are ready.

#### Operational Priorities

- attention triage;
- role and workload visibility;
- order lifecycle health;
- review and delivery handoffs;
- team setup and access control;
- production readiness where applicable.

#### Information Needed

- active order status and next owner;
- overdue and due-soon queues;
- reviewer/appraiser workload summaries;
- unassigned work;
- client and calendar context;
- Team Access and invite status;
- setup/readiness guidance;
- historical readback as a secondary compliance surface.

#### Information To Hide Or De-Emphasize

- raw permission keys;
- RLS/RPC terminology;
- database and storage internals;
- every low-value assignment or activity event as an interrupting alert;
- future module names that are not enabled.

#### Preferred Terminology

- Operations Dashboard;
- Active Orders;
- Review Queue;
- Due Soon;
- Overdue;
- Unassigned;
- Team Access;
- Owner Setup;
- Historical Orders;
- Sent Assignments when overseeing external work.

Avoid making `packet` the dominant noun for owner/admin order operations. Use it only where the
surface is explicitly assignment-scoped.

#### Action Hierarchy

1. Resolve operational blockers.
2. Open the affected order or assignment.
3. Reassign or update workflow where permission allows.
4. Manage team/client/setup only when relevant.
5. Review reports/analytics after daily triage.

#### Dashboard / Workspace Priorities

- first: today's attention and delivery risk;
- second: active orders and review handoffs;
- third: calendar and workload context;
- fourth: setup/readiness and historical/admin support.

#### Ideal Shell / Navigation

Owner/Admin shell should have a broad but organized operational navigation:

- Dashboard;
- Orders;
- Calendar;
- Clients;
- Assignments;
- Team Access;
- Settings / Owner Setup;
- Historical Orders as secondary under Orders or admin/compliance context.

The shell should not be a raw list of every route. It should separate daily operations from
administrative setup.

#### Alerting / Notification Style

- sparse, high-signal operational exceptions;
- configurable owner/admin notification delivery;
- watchlist or summary patterns for supervised work;
- no automatic bell alert for every event merely because the user can see all work.

#### Onboarding Experience

- owner/admin onboarding should focus on company readiness, first team members, roles, clients,
  order numbering, document readiness, and operational smoke;
- setup guidance should be advisory unless a future explicit gating model is approved;
- onboarding should never bypass permission or backend authority.

#### Owner Visibility / Control Expectations

- owners expect broad visibility and final control;
- owners should be able to inspect who can see or do what;
- owner controls should remain protected and clearly separated from ordinary operations;
- owner visibility should not become owner alert overload.

### Staff Appraiser

#### Primary Goals

- understand assigned work;
- complete inspection/report work;
- upload or review needed documents;
- respond to revisions;
- submit work to review on time.

#### Daily Workflow

- start with assigned orders that need action;
- prioritize due dates and revision requests;
- open order detail for property, client, and scope context;
- add notes/files through approved paths;
- submit or resubmit to review when ready.

#### Stress Points

- unclear next action;
- admin-level clutter;
- being shown orders they cannot meaningfully act on;
- missing revision context;
- due-date pressure hidden behind generic dashboards;
- confusing internal language.

#### Operational Priorities

- assigned active work;
- due dates;
- revisions;
- site visit and report status;
- document checklist and upload/download readiness where enabled;
- communication relevant to assigned orders.

#### Information Needed

- assigned orders;
- due and overdue indicators;
- revision notes and review feedback;
- client/property/order summary;
- files relevant to the order;
- activity and notes on assigned orders;
- calendar events tied to assigned work.

#### Information To Hide Or De-Emphasize

- team-wide admin setup;
- all-client relationship management unless permissioned and role-relevant;
- owner assignment oversight;
- broad analytics;
- role management;
- external assignment internals not relevant to the appraiser's work.

#### Preferred Terminology

- My Assigned Orders;
- Needs Revisions;
- Due Soon;
- Site Visit;
- Report;
- Submit to Review;
- Resubmit to Review;
- Files;
- Notes.

Avoid:

- canonical order access;
- packet for internal assigned order work;
- queue mechanics unless translated into worklist language.

#### Action Hierarchy

1. Continue active assigned work.
2. Respond to revisions.
3. Upload or download files through approved paths.
4. Add notes.
5. Submit/resubmit to review.

#### Dashboard / Workspace Priorities

- first: assigned work needing action today;
- second: due soon/overdue assigned work;
- third: revision queue;
- fourth: calendar/site visit context;
- fifth: recent assigned-order activity.

#### Ideal Shell / Navigation

Appraiser shell should be narrower:

- Dashboard or My Work;
- Orders / My Orders;
- Calendar;
- Files within order context;
- Activity or Notes only where assigned;
- minimal Team Access / Settings unless permissioned and needed.

#### Alerting / Notification Style

- direct action-needed alerts;
- revision and due-date alerts;
- document/file events relevant to assigned orders;
- avoid owner-level summary alerts.

#### Onboarding Experience

- explain where to find assigned orders;
- explain due-date and revision language;
- explain files, notes, and submit-to-review flow;
- avoid setup/admin onboarding unless the same user also has admin responsibilities.

#### Owner Visibility / Control Expectations

- owners should see appraiser workload and assignment state;
- appraiser shell should not expose owner-only controls;
- owners may configure permissions and notifications, but appraiser daily UX should stay work-first.

### Reviewer

#### Primary Goals

- review assigned work efficiently;
- identify issues;
- request revisions clearly;
- clear review or mark work ready for the next stage where allowed;
- maintain quality without scanning unrelated operations.

#### Daily Workflow

- start with review queue;
- open in-review orders assigned to the reviewer;
- inspect order summary, report/document context, notes, and activity;
- request revisions or clear review through approved workflow actions;
- follow up on repeat revision loops.

#### Stress Points

- review work mixed into generic order inventory;
- unclear distinction between appraiser work and reviewer action;
- too much admin/client setup noise;
- revision history hard to scan;
- ambiguous ready-for-client/final approval responsibility.

#### Operational Priorities

- in-review assigned orders;
- revision decisions;
- review notes and activity;
- due pressure for review stage;
- documents/report context;
- handoff status after review.

#### Information Needed

- assigned review queue;
- order summary and relevant files;
- appraiser submission context;
- prior revision notes;
- workflow status and allowed review actions;
- due dates and delivery pressure.

#### Information To Hide Or De-Emphasize

- team management;
- full owner setup;
- client relationship administration;
- assignment vendor management unless separately permissioned;
- broad analytics unrelated to review decisions.

#### Preferred Terminology

- Review Queue;
- In Review;
- Needs Revisions;
- Clear Review;
- Ready for Client;
- Review Notes;
- Submitted Work;
- Revision History.

Avoid:

- packet for review work unless the reviewer is handling assignment-scoped external work;
- abstract workflow-state labels when plain review language is clearer.

#### Action Hierarchy

1. Open next review item.
2. Request revisions or clear review.
3. Add review notes.
4. Inspect files/activity supporting the decision.
5. Escalate only where permission and policy allow.

#### Dashboard / Workspace Priorities

- first: review queue;
- second: overdue review items;
- third: revision loops or pending final approval;
- fourth: supporting order context and recent review activity.

#### Ideal Shell / Navigation

Reviewer shell should be review-centered:

- Dashboard or Review Workbench;
- Review Queue;
- Orders, scoped to review/assigned visibility;
- Calendar where review due dates matter;
- Activity/Notes scoped to review work.

#### Alerting / Notification Style

- new review assignment;
- appraiser resubmitted;
- revision response received;
- review due soon or overdue;
- avoid general owner/admin alerts.

#### Onboarding Experience

- explain review queue, revision request, clear review, and final handoff rules;
- show how review notes differ from appraiser notes if the product distinguishes them;
- avoid owner/admin setup guidance.

#### Owner Visibility / Control Expectations

- owners should see review queue health;
- reviewer shell should keep decision work central and not expose owner configuration;
- owner/admin can assign or rebalance review work where permission allows.

### Assignment / Vendor Recipient

#### Primary Goals

- see offers and assigned work from owner companies;
- accept or decline offers;
- complete scoped work;
- submit deliverables or status through assignment lifecycle actions;
- understand due dates, terms, instructions, and owner responses.

#### Daily Workflow

- open received work;
- respond to new offers;
- work active assignments;
- submit completed work;
- handle owner review, corrections, or terminal states.

#### Stress Points

- accidentally seeing internal owner-company order operations;
- unclear offer versus active work distinction;
- too much internal appraiser/reviewer/client language;
- not knowing what action is expected next;
- uncertainty around due dates, expiration, and owner review.

#### Operational Priorities

- offers awaiting response;
- active received work;
- due and expiration dates;
- instructions and terms;
- submission status;
- owner feedback and assignment-scoped activity.

#### Information Needed

- received assignments;
- offer/work status;
- safe order summary fields provided through assignment packet;
- instructions;
- due/expiration/review dates;
- assignment-scoped activity;
- allowed packet actions.

#### Information To Hide Or De-Emphasize

- canonical order detail;
- internal client management;
- owner workflow queues;
- reviewer/appraiser staff workload;
- internal notes and activity;
- owner-company operational analytics.

#### Preferred Terminology

User-facing language should favor:

- Received Work;
- Work Request;
- Assignment;
- Offer;
- Active Work;
- Submit Work;
- Owner Review;
- Due Date;
- Instructions.

The term `packet` may remain:

- in internal architecture;
- in developer docs;
- where a compact label is needed for assignment-scoped records;
- in owner/admin contexts that understand assignment packets.

But for assignment/vendor recipients, `packet` should usually be secondary to work-native terms
such as `Work Request`, `Assignment`, or `Received Work`.

#### Action Hierarchy

1. Accept or decline offers.
2. Continue active assignment work.
3. Submit work.
4. Respond to owner review/corrections.
5. Review completed or terminal assignment history.

#### Dashboard / Workspace Priorities

- first: offers needing response;
- second: active work due soon;
- third: submitted work awaiting owner review;
- fourth: completed/terminal assignment history.

#### Ideal Shell / Navigation

Assignment/vendor shell should be assignment-native:

- Dashboard / Received Work;
- Assignments;
- Assignment Detail;
- Profile/availability later if vendor portal is enabled;
- no Orders, Clients, Calendar, Team Access, or owner settings unless separately designed and
  permissioned.

#### Alerting / Notification Style

- new work request;
- offer expiring soon;
- due soon/overdue;
- owner requested correction;
- owner completed/cancelled/revoked assignment;
- no internal owner workflow alerts.

#### Onboarding Experience

- explain received work, offers, due dates, submit-work flow, and owner review;
- explain that visibility is scoped to assigned work;
- avoid internal company setup and staff role language.

#### Owner Visibility / Control Expectations

- owner/admin should see sent assignment status and vendor response state;
- assignment recipients should not see owner control surfaces;
- owner controls should not expose more data to recipients than assignment RPCs allow.

### Future Client Portal User

This persona is high-level only. Client Portal is not implemented in this phase.

#### Primary Goals

- submit or track requests;
- understand status;
- provide documents or information when asked;
- receive reports or deliverables;
- communicate with operations through a client-safe channel.

#### Daily Workflow

- check request status;
- respond to action-needed items;
- upload required documents if enabled;
- download delivered reports;
- review completed requests.

#### Stress Points

- exposure to internal workflow language;
- uncertainty about whether a request was received;
- too many internal status changes;
- unclear document/report availability;
- seeing vendor/appraiser/reviewer details that are not intentionally exposed.

#### Operational Priorities

- requests;
- status;
- action needed;
- documents;
- reports;
- messages;
- completed history.

#### Information Needed

- client-facing request summary;
- client-safe status;
- action-needed items;
- safe document/report availability;
- messages meant for the client;
- completed request history.

#### Information To Hide Or De-Emphasize

- internal workflow state;
- reviewer/appraiser handoffs;
- vendor assignment mechanics;
- internal notes;
- internal SLA/escalation logic;
- staff workload;
- permission/module/tenant internals.

#### Preferred Terminology

- Requests;
- Status;
- Action Needed;
- Documents;
- Reports;
- Messages;
- Completed Requests.

Avoid:

- Orders as the primary client noun unless company/client terminology requires it;
- packet;
- review queue;
- vendor assignment;
- internal workflow state names.

#### Action Hierarchy

1. Submit or open request.
2. Complete action-needed items.
3. Upload requested documents.
4. View status/messages.
5. Download reports.

#### Dashboard / Workspace Priorities

- first: requests needing client action;
- second: in-progress requests;
- third: delivered reports/documents;
- fourth: completed request history.

#### Ideal Shell / Navigation

Future Client Portal shell should be complete and separate:

- Home / Requests;
- Documents;
- Reports;
- Messages;
- Account / Team if enabled.

It should not be a trimmed internal Staff or AMC shell.

#### Alerting / Notification Style

- request received/acknowledged;
- action needed;
- document/report available;
- status milestone updates;
- message received;
- sparse and client-safe.

#### Onboarding Experience

- explain request submission, status tracking, document upload, and report access;
- avoid internal workflow education;
- make scope boundaries feel normal, not restrictive.

#### Owner Visibility / Control Expectations

- owner/admin controls which client accounts and requests are exposed;
- client-facing status is a projection, not internal lifecycle authority;
- owner/admin can review client access and delivery policy before exposure.

## Terminology Guidance

### Replace Internal Terms With Operational Language

| Internal / technical term | Preferred user-facing direction |
|---|---|
| Permission key | Team access, access level, allowed action |
| RLS / row policy | Not available in your workspace |
| RPC / backend helper | System action, approved action, workflow action |
| Canonical order access | Internal order access, order access, or omit entirely |
| Assignment visibility predicate | Assigned work visibility |
| Active company claim | Current company |
| Service role | System-managed |
| Tenant | Company or workspace |
| Module | Feature area or workspace |

### `Packet` Language

`Packet` is useful as an internal system concept because assignment records are intentionally
scoped and must not imply canonical order/client access.

User-facing guidance:

- Owner/Admin overseeing assignments may see `Assignment Packet` where it helps distinguish
  scoped assignment records from full order detail.
- Assignment/vendor recipients should usually see `Work Request`, `Received Work`, `Offer`, or
  `Assignment` first, with `packet` de-emphasized or avoided.
- Staff appraisers and reviewers working internal orders should not see `packet` as the main noun.
- Client Portal users should not see `packet`.

## Shell-Level Architecture

### Single Platform / Multiple Shells

Falcon should remain a single platform:

- one login/session model;
- one current-company model;
- one permission resolver;
- one object visibility model;
- one audit/activity doctrine;
- one design system and interaction language.

Falcon should support multiple shells:

- Owner/Admin Operations Shell;
- Appraiser Work Shell;
- Reviewer Work Shell;
- Assignment Recipient Shell;
- Future Client Portal Shell.

Each shell should define:

- primary daily question;
- first-screen hierarchy;
- navigation lane order;
- empty states;
- notification emphasis;
- onboarding entry points;
- owner/admin visibility relationship;
- terminology profile.

### Recommended Shell Layers

1. **Authority layer:** permissions, RLS/RPCs, route guards, object visibility, workflow state.
2. **Resolution layer:** current company, user permissions, role labels, object responsibilities,
   available surfaces.
3. **Shell layer:** role-centric navigation grouping, dashboard selection, workspace emphasis,
   terminology.
4. **Surface layer:** specific workspace components and page sections.
5. **Action layer:** existing governed actions and future approved workflow actions.

Phase 1A only defines layers. It does not implement them.

### Cognitive Load Management

Role-centric shells should reduce cognitive load by:

- placing the role's next action first;
- hiding future modules and irrelevant admin controls;
- turning permission-limited states into plain operational language;
- keeping setup/admin surfaces secondary for non-admin roles;
- showing support context after the primary work surface;
- avoiding duplicated names for the same concept;
- keeping alerts sparse and role-relevant.

## Current Reality Versus Future Behavior

### Current Reality

- Current dashboard resolution is permission-based and separates order-capable from
  assignment-only dashboard users.
- Current navigation is partly broad and partly permission-gated.
- Current polished workspaces use shared shell patterns but not full role-specific shells.
- Current assignment detail and dashboard surfaces preserve packet-scoped visibility.
- Current Client Portal is documentation only.

### Recommended Future Shell Behavior

- resolve a role-centric shell profile after permission/current-company resolution;
- keep route guards and RLS/RPC authority unchanged;
- choose dashboard/workspace priority by shell profile;
- allow a user with multiple roles to choose or inherit a sensible primary work view;
- make owner/admin surfaces available without forcing them into every first screen;
- use role-native language in nav, dashboards, empty states, notifications, and onboarding;
- keep assignment recipient and future client shells complete rather than stripped-down internal
  shells.

### Deferred Experimental Ideas

- user-selectable default shell or work view;
- company-configurable role terminology;
- owner-authored onboarding checklists by role;
- notification digest modes by role;
- role-specific command palette lanes;
- client-safe status projection designer;
- workload personalization;
- AI-assisted daily summaries only after authoritative data contracts exist.

## Mobile, Native, And Automation Addendum

`docs/FALCON_MOBILE_NATIVE_AND_COMMUNICATION_AUTOMATION_STRATEGY.md` extends the role-centric shell
doctrine across device classes and future communication automation.

Shell planning should now treat:

- desktop as the mission-control surface for dense owner/admin and operational work;
- mobile as the operational-execution surface for quick, role-native action;
- PWA as the likely intermediate path after or around MVP;
- native apps as future/post-MVP and dependent on Falcon's governed API/RPC-first architecture;
- communication automation as a future platform feature that must remain permission-governed,
  auditable, owner/admin configurable, rate-limited, role-aware, and non-spammy.

This cross-reference does not change shell implementation scope. Role-centric shell work should
remain web-first while avoiding choices that would block future mobile, PWA, native, or governed
automation surfaces.

## Implementation Planning Guardrails

Future implementation planning must preserve:

- permission checks as authority;
- object visibility boundaries;
- assignment packet isolation;
- Client Portal as future-only until explicitly built;
- owner/admin control boundaries;
- existing route behavior until migration slices approve changes;
- existing backend/RLS/RPC contracts;
- current design-system and interaction foundations.

Future implementation planning must avoid:

- route rewrites in the first architecture slice;
- role-authority redesign disguised as UX work;
- dashboard rewrites before shell selection rules are designed;
- exposing hidden modules as locked navigation clutter;
- using owner/admin visibility as alert delivery;
- using `packet` as universal product language;
- implementing Client Portal as a restricted internal view.

## Recommended Next Slice

## Phase 1B Current Shell And Navigation Role Audit

Phase 1B audits the current runtime shell, route, navigation, dashboard, command palette, and
workspace language against the Phase 1A role-centric model. This is documentation and audit only.
It makes no runtime behavior, route, permission, navigation, dashboard, shell, backend, Supabase,
query, workflow, role-authority, Client Portal, branding, or production data change.

### Phase 1B Sources Inspected

Runtime sources inspected:

- `src/routes/index.jsx`;
- `src/components/shell/TopNav.jsx`;
- `src/lib/navigation/currentNavigationRegistry.js`;
- `src/lib/navigation/currentPrimaryNavLinks.js`;
- `src/lib/commandPalette/currentCommandRegistry.js`;
- `src/lib/commandPalette/currentCommandPaletteCommands.js`;
- `src/components/nav/CommandPalette.jsx`;
- `src/features/dashboard/DashboardGate.jsx`;
- `src/lib/dashboard/currentDashboardResolution.js`;
- `src/features/dashboard/DashboardPage.jsx`;
- `src/features/dashboard/AssignmentDashboardPage.jsx`;
- `src/pages/orders/Orders.jsx`;
- `src/pages/Calendar.jsx`;
- `src/pages/clients/ClientsIndex.jsx`;
- `src/features/assignments/AssignmentsPage.jsx`;
- `src/features/assignments/AssignmentPrimitives.jsx`;
- `src/pages/appraisers/AppraiserDashboard.jsx`;
- `src/pages/reviewers/ReviewerDashboard.jsx`.

Supporting docs inspected:

- `docs/FALCON_NAVIGATION_COMPOSITION.md`;
- `docs/ROLE_PERMISSION_MODEL.md`;
- `docs/FALCON_MODE_LANGUAGE_GUIDE.md`;
- `docs/ASSIGNMENTS_WORKSPACE_POLISH_STRATEGY.md`;
- `docs/OPERATIONAL_DASHBOARD_POLISH_STRATEGY.md`;
- `docs/ORDERS_WORKSPACE_POLISH_STRATEGY.md`;
- `docs/FALCON_DESIGN_SYSTEM_FOUNDATION.md`;
- `docs/FALCON_CLIENT_PORTAL_BLUEPRINT.md`.

### Current Shell Inventory

Current shell behavior:

- `TopNav` brand routes to `/dashboard` and labels the product as `Falcon Operations` /
  `Operations Console`.
- Primary desktop/mobile nav is built from `getCurrentPrimaryNavLinks(...)`.
- Current primary nav order is `Orders`, `Assignments`, `Relationships`, `Calendar`, `Clients`,
  and `Users`, with `Settings` added in mobile when allowed.
- `Orders` and `Calendar` are currently shown in primary nav without a nav visibility permission
  check; route guards remain the authority.
- `Assignments`, `Relationships`, `Clients`, and `Users` primary nav visibility is permission-aware.
- `DashboardGate` routes order-capable users to `DashboardPage`, assignment-only users to
  `AssignmentDashboardPage`, and other authenticated users to an unavailable state.
- `AppraiserDashboard` and `ReviewerDashboard` currently wrap the shared `DashboardPage`.
- Command palette labels are broad: `Go to Orders`, `Go to Assignments`, `Go to Relationships`,
  `Go to Calendar`, `Go to Clients`, `Go to Users`, `Open Settings`, and `Notification Settings`.
- Command palette placeholder copy enumerates broad destinations rather than role-native work
  concepts.
- Orders, Calendar, Clients, and Assignments have polished workspace shells, but most shell labels
  remain surface-centric rather than role-centric.

### Route And Authority Audit

| Surface | Current route/authority posture | Role-centric implication |
|---|---|---|
| `/dashboard` | Authenticated route; `DashboardGate` chooses order dashboard, assignment dashboard, or unavailable state from permissions. | Strong foundation. Needs richer owner/admin/appraiser/reviewer shell profiles before dashboard rewrites. |
| `/orders` | Requires `orders.read.all` or `orders.read.assigned`; primary nav currently renders Orders broadly and relies on route guard. | Authority is safe, but UX visibility can feel flat for users whose first job is review or assigned work. |
| `/calendar` | Requires order navigation/read permission at route level; nav/command expose Calendar broadly. | Good scheduling surface, but role-specific priority differs for owner/admin, appraiser, and reviewer. |
| `/clients` / `/clients/cards` | Primary path resolves to broad client management or assigned-safe client cards based on permissions. | Good visibility split; terminology still reads relationship-management rather than role-specific client context. |
| `/assignments` | Requires assigned or owner assignment read permission. Assignment visibility is packet-scoped and not canonical order access. | Strongest role-centric separation today, but user-facing packet language should be refined for recipients. |
| `/users` | Requires `users.read`; page hosts Team Access and invitations. | Good owner/admin surface, but current label `Users` is more technical/admin than operational. |
| `/settings/owner-setup` | Settings-view gated, advisory, non-authoritative setup guidance. | Good owner/admin setup support; should remain secondary and not leak into non-admin shells. |
| Future Client Portal | Not implemented. | Must remain future-only until request/status/document/report authority is designed. |

### Navigation And Command Audit

Current alignment:

- `Assignments` is permission-aware in nav and command palette.
- `Clients` resolves broad versus assigned path safely.
- `Users` is permission-gated and already documented as Team Access.
- Settings/Owner Setup are not primary desktop clutter.

Current gaps:

- primary nav is still one shared horizontal list rather than a role-native shell;
- `Orders` and `Calendar` primary visibility can appear before permission resolution denies route
  access;
- `Dashboard` is represented by the brand link rather than a role-native daily-work label;
- `Users` should trend toward `Team Access` in user-facing owner/admin shells;
- command labels use generic `Go to...` phrasing instead of work-native actions such as `Open My
  Work`, `Open Review Queue`, `Open Received Work`, or `Open Team Access`;
- command palette placeholder mentions `Orders, Assignments, Relationships, Clients, Users,
  Settings`, which reinforces the giant-admin-panel feeling for role-specific users;
- `Search Orders` fallback is order-centric and should not become the default mental model for
  assignment-only or future client users.

### Workspace Label Audit

| Workspace | Current user-facing frame | Alignment | Gap |
|---|---|---|---|
| Dashboard | `Operations Dashboard`, role context tile such as `Owner / Admin`, `Reviewer`, or `Appraiser`. | Good shared operational frame. | Appraiser and reviewer still share a broad dashboard structure instead of role-native first-screen workbenches. |
| Orders | `Orders Workspace`, `Active Orders`, saved views, historical link, active filters. | Strong active-order inventory for owner/admin and broad staff. | Appraisers may need `My Assigned Orders`; reviewers may need `Review Queue`; current surface still prioritizes Orders as the universal noun. |
| Calendar | `Calendar Workspace`, `Scheduling Coordination`, role-aware labels like company/review/assigned schedule. | Good role-aware scheduling copy. | Shell priority differs by role; calendar should support workbench context rather than remain equal-weight nav for every shell. |
| Clients | `Clients Workspace`, `Relationship Management`, client/lender/AMC relationships. | Good owner/admin relationship management. | Not primary for appraiser/reviewer unless assigned-client context matters; future Client Portal must not reuse this internal client-management shell. |
| Assignments | `Assignments Workspace`, `Packet Coordination`, `Received Work`, `Sent Assignments`, `Packet-scoped`, `Open packets only`. | Strong isolation and lane separation. | `Packet` remains dominant in headers, states, tests, and actions; recipient-facing language should shift toward work request / received work. |
| Team Access | Current route/nav label is `Users`; invitation UI uses `Team Access`. | Backend and invitation doctrine is strong. | Nav/command label should become owner/admin-native `Team Access`, not generic `Users`, in a future shell slice. |
| Owner Setup | Settings utility and dashboard prompt, advisory only. | Good owner/admin support. | Should stay secondary and not appear as cognitive load for appraisers/reviewers. |

### Empty State And Error Language Audit

Current alignment:

- Dashboard unavailable copy explicitly states order or assignment read requirements.
- Assignment denied/error states avoid canonical order fallback.
- Orders empty state distinguishes active orders and operational queue mismatch.
- Clients and Calendar use calmer loading/error/empty state primitives.

Current gaps:

- some unavailable messages still mention `assignment packet read permission`, which is accurate
  but implementation-centered;
- assignment empty states say `No assignment packets are available for this view`;
- assignment errors say `No order fallback was attempted`, which is useful for safety but too
  system-centric for normal users;
- command no-result copy says `No available commands match`, which is acceptable but not
  role-native;
- future role shells should distinguish no work, no permission, no current-company context, and
  no data without exposing hidden records.

### Role Gap Matrix

| Role | Current likely shell | What currently works | Gaps versus Phase 1A model | Audit classification |
|---|---|---|---|---|
| Owner/Admin | Shared `Operations Dashboard`, broad primary nav, Orders/Calendar/Clients/Assignments/Users access where permissioned. | Broad visibility, operational support/readiness card, workload summaries, Team Access, Owner Setup, Historical Orders. | Nav is flat; `Users` label should become `Team Access`; owner/admin supervision is mixed with daily operations; alerts are not audited here; Dashboard can become dense. | Partially aligned. |
| Staff Appraiser | Shared order dashboard with appraiser lens, Orders, Calendar, maybe Clients/Assignments depending permissions. | Dashboard subtitle and worklist can speak to assigned orders/revisions; Calendar can show assigned schedule. | No distinct `My Work` shell; Orders remains primary universal noun; Team/Admin surfaces can leak if permissioned; revision-first and due-first hierarchy is not yet first-class. | Needs role-native workbench planning. |
| Reviewer | Shared order dashboard with reviewer lens and `My Review Work`; Calendar can use review schedule. | Review filtering exists; dashboard subtitle and worklist can prioritize review work; review status language is present. | No dedicated `Review Queue` shell/nav; command palette does not expose review-native action language; broad Orders/Calendar framing still competes with review-decision focus. | Needs review-centric shell planning. |
| Assignment/Vendor Recipient | Assignment dashboard for assignment-only users; Assignments workspace with Received Work and Sent Assignments lanes when allowed. | Best current separation; no canonical order dashboard fallback; packet-scoped access is preserved; received/sent lane separation exists. | Recipient-facing copy still overuses `packet`; command/nav says `Assignments` and `Go to Assignments`; some error text exposes implementation boundaries. | Strong authority alignment, terminology needs refinement. |
| Future Client Portal | No active client portal shell. Internal Clients workspace exists for staff/owner relationship management. | Client Portal doctrine is documented; current internal Clients shell is permissioned. | No request/status/document/report portal shell; must not reuse internal Clients Workspace as a trimmed client UI; no portal nav, dashboard, auth, or status projection exists. | Future-only / blocked. |

### Role-Specific Findings

#### Owner/Admin

Current state:

- most current surfaces make sense for owner/admin;
- operational readiness and Team Access are owner/admin-relevant;
- workload visibility is useful but still secondary.

Future need:

- owner/admin shell should group daily operations separately from administrative setup;
- `Users` should become `Team Access`;
- owner/admin notification strategy should not mirror all visible events.

#### Staff Appraiser

Current state:

- appraiser lens exists through dashboard summary and calendar filtering;
- dashboard language can say assigned orders and revision follow-up.

Future need:

- first-screen shell should be `My Work` or assigned-work native;
- revisions and due dates should be first-class;
- broad owner/admin setup and client-management surfaces should be de-emphasized even if allowed by
  secondary permissions.

#### Reviewer

Current state:

- reviewer lens exists through dashboard summary, calendar filtering, and `My Review Work`;
- in-review and revision language already exists.

Future need:

- create a review-decision-first mental model before dashboard implementation;
- review queue should be a first-class shell priority, not just an Orders filter;
- command and empty-state language should speak in review terms.

#### Assignment / Vendor Recipient

Current state:

- assignment-only dashboard and routes are strong;
- assignment detail avoids order fallback;
- received and sent lanes are clear.

Future need:

- reduce user-facing `packet` density for recipients;
- keep `packet` as architecture/safety language in docs and some owner/admin contexts;
- translate denied/error states into work-request language while preserving safety.

#### Future Client Portal

Current state:

- no active shell exists;
- internal Clients workspace is not the future portal.

Future need:

- design client-native request/status/document/report shell separately;
- prevent internal workflow, assignment, review, and packet language from leaking into portal
  planning.

### Phase 1B Conclusions

- Falcon has strong authority foundations for role-centric shells, especially permission-based
  dashboard resolution and assignment-only separation.
- The current shell is still mostly surface-centric: Dashboard, Orders, Calendar, Clients,
  Assignments, Users, Settings.
- Owner/Admin is the closest fit to the current broad shell.
- Appraiser and Reviewer need separate workbench planning before runtime dashboard changes.
- Assignment/Vendor Recipient has the safest authority boundary today, but needs user-facing
  terminology refinement away from heavy `packet` language.
- Client Portal remains future-only and should not reuse the internal Clients workspace.
- The next implementation-planning work should design shell profiles and copy/navigation rules
  before changing routes, permissions, dashboards, or components.

## Phase 1C Shell Profile And Navigation Vocabulary Plan

Phase 1C defines future shell profiles, role-native navigation vocabulary, dashboard/workbench
framing, command/action wording, empty-state tone, and operational naming standards before any
runtime shell implementation.

This phase is documentation and planning only. It makes no runtime behavior, route, permission,
navigation, dashboard, shell switching, command palette behavior, backend, Supabase, query,
workflow, role-authority, Client Portal, branding, or production data change.

### Phase 1C Planning Inputs

Phase 1C uses the Phase 1A role psychology model and Phase 1B runtime audit as inputs:

- permission authority is already the canonical security layer;
- current navigation and commands are still surface-centric;
- Owner/Admin is closest to the existing broad shell;
- Staff Appraiser needs an assigned-work-first shell;
- Reviewer needs a review-decision-first shell;
- Assignment/Vendor Recipient needs received-work language and packet isolation;
- Client Portal remains future-only and must be client-native rather than a trimmed internal shell.

### Shell Naming Doctrine

Shell names should describe the job the user is trying to do, not the implementation surface they
are allowed to access.

Recommended shell names:

| Role | Future shell name | Daily-work shorthand |
|---|---|---|
| Owner/Admin | Operations Shell | Operations |
| Staff Appraiser | My Work Shell | My Work |
| Reviewer | Review Workbench Shell | Review Queue |
| Assignment/Vendor Recipient | Received Work Shell | Received Work |
| Future Client Portal User | Client Requests Shell | Requests |

Rules:

- `Operations` means owner/admin operational oversight, not every user's default experience.
- `My Work` means assigned internal order work for staff appraisers.
- `Review Queue` means review decisions and review-stage work, not a generic order filter.
- `Received Work` means assignment-scoped external or vendor work.
- `Requests` means future client-facing request/status/document/report work.
- shell names do not grant permission or route authority.

### System/Internal Terms Versus User-Facing Terms

System/internal terms may remain in architecture docs, developer docs, migrations, tests, and
guardrail documentation where precision matters.

System/internal only or mostly internal:

- permission key;
- RLS;
- RPC;
- row policy;
- canonical order access;
- assignment visibility predicate;
- active company claim;
- tenant;
- service role;
- route guard;
- resolver;
- dashboard gate;
- shell profile;
- packet, except where explicitly assignment-scoped and understood.

Preferred user-facing replacements:

| System/internal wording | User-facing direction |
|---|---|
| Permission key | Access level, allowed action, team access |
| RLS / row policy | Not available in your workspace |
| RPC | Approved action, workflow action, system action |
| Canonical order access | Order access, internal order access, or omit |
| Assignment visibility predicate | Assigned work visibility |
| Active company claim | Current company |
| Tenant | Company or workspace |
| Service role | System-managed |
| Route guard denied | You do not have access to this workspace |
| Dashboard gate | Workspace selection |
| Packet | Work request, assignment, received work, or assignment packet by context |

### Orders, My Work, And Review Queue Usage Rules

`Orders` should remain the owner/admin and broad internal operations noun for company order
inventory, lifecycle management, client context, historical readback, and administrative oversight.

Use `My Work` when the primary user need is assigned internal staff execution:

- assigned orders;
- due-soon assigned work;
- revision response;
- site visit and report progress;
- submit or resubmit to review.

Use `Review Queue` when the primary user need is review decision-making:

- in-review work;
- submitted work awaiting reviewer action;
- revision request decisions;
- clear review / ready-for-client handoff;
- review notes and revision history.

Avoid using `Orders` as the first mental model for assignment/vendor recipients or future client
portal users. Assignment recipients receive work requests or assignments. Clients submit and track
requests.

### Assignment And Vendor Terminology Direction

Assignment authority should keep packet-scoped isolation internally, but recipient-facing language
should lead with work-native nouns.

Preferred assignment/vendor terms:

- Received Work;
- Work Request;
- Offer;
- Active Work;
- Assignment;
- Submit Work;
- Owner Review;
- Correction Requested;
- Due Date;
- Instructions.

Use `Assignment Packet` selectively for owner/admin oversight or architecture-facing distinctions.
Avoid making `packet` the primary heading, empty-state noun, command noun, or mobile action label
for recipients.

### Client-Facing Terminology Boundaries

Future Client Portal language should never expose internal order, review, vendor, packet, RLS, RPC,
or permission mechanics.

Preferred future client terms:

- Requests;
- Status;
- Action Needed;
- Documents;
- Reports;
- Messages;
- Completed Requests;
- Account.

Client-facing status should be a safe projection of internal state. It should not become workflow
authority and should not reveal reviewer/appraiser/vendor handoffs unless explicitly designed.

### Command Palette Vocabulary Direction

Command palette entries should become role-native and action-oriented instead of one shared list of
`Go to...` destinations.

Global command rules:

- use `Open...` for navigation into a workspace;
- use `Find...` only when a search surface exists for that role;
- use `Review...`, `Submit...`, `Accept...`, or `Manage...` only when the user has the
  corresponding governed action;
- avoid naming hidden or future modules;
- avoid internal route names, permission keys, and packet mechanics in normal commands.

Recommended command vocabulary:

| Shell | Primary command examples |
|---|---|
| Operations | Open Operations Dashboard; Open Active Orders; Open Review Queue; Open Due Soon; Open Team Access; Open Owner Setup |
| My Work | Open My Work; Open My Assigned Orders; Open Needs Revisions; Open Due Soon; Open My Calendar |
| Review Workbench | Open Review Queue; Open In Review; Open Needs Revisions; Open Revision History; Open Review Calendar |
| Received Work | Open Received Work; Open Offers; Open Active Work; Open Submitted Work; Open Completed Work |
| Client Requests | Open Requests; Open Action Needed; Open Documents; Open Reports; Open Messages |

Fallback command search should respect shell context:

- owner/admin: `Search orders, clients, assignments, or team access`;
- appraiser: `Search my assigned work`;
- reviewer: `Search review work`;
- assignment recipient: `Search received work`;
- client portal: `Search requests, documents, or reports`.

### Dashboard And Workbench Naming Direction

Dashboards should be named by the user's operational frame:

| Shell | Preferred first screen | Preferred dashboard/workbench name |
|---|---|---|
| Operations | operational exceptions and delivery risk | Operations Dashboard |
| My Work | assigned work needing action | My Work |
| Review Workbench | review decisions needing action | Review Queue or Review Workbench |
| Received Work | offers and active received assignments | Received Work |
| Client Requests | client action-needed and request status | Requests |

`Dashboard` may remain a generic technical route or broad product concept, but user-facing headings
should prefer the shell-native name where possible.

### Owner/Admin Operations Shell Profile

Shell name:

- Operations Shell.

Primary daily question:

- What needs owner/admin attention today to keep the company moving?

First-screen focus:

- overdue and due-soon risk;
- unassigned or stalled work;
- review and revision handoffs;
- operational exceptions;
- setup/readiness prompts only when relevant.

Top navigation/grouping hierarchy:

- Operations;
- Orders;
- Review Queue;
- Calendar;
- Clients;
- Assignments;
- Team Access;
- Settings / Owner Setup;
- Historical Orders as secondary under Orders or compliance/admin context.

Preferred workspace naming:

- Active Orders;
- Review Queue;
- Sent Assignments;
- Team Access;
- Owner Setup;
- Historical Orders.

Preferred dashboard naming:

- Operations Dashboard.

Preferred quick-action naming:

- Open order;
- Assign work;
- Reassign;
- Send to review;
- Resolve blocker;
- Manage team access;
- Continue setup.

Preferred command palette language:

- Open Operations Dashboard;
- Open Active Orders;
- Open Review Queue;
- Open Due Soon;
- Open Unassigned Orders;
- Open Sent Assignments;
- Open Team Access;
- Open Owner Setup.

Preferred empty-state tone:

- operational and calm;
- distinguish no urgent work from no access;
- avoid implying hidden records when a user lacks permission;
- use `No orders need attention in this view` rather than technical permission language.

Preferred notification tone:

- exception-oriented;
- digest-friendly for supervised work;
- alert only for operational risk, assignment response, review bottleneck, setup blocker, or
  owner/admin action needed.

Operational vocabulary guidance:

- use operations, active orders, review queue, due soon, overdue, unassigned, team access, owner
  setup;
- avoid raw role keys, RLS/RPC names, internal resolver names, and owner-visible event floods.

Information-density guidance:

- densest shell;
- supports grouped tables, workload summaries, status counts, and secondary admin panels;
- should separate daily operations from setup and compliance readback.

Mobile-execution implications:

- mobile should show exception triage first, not the full desktop command center;
- primary mobile actions should be open, assign/reassign where safe, call/message later if
  communication automation exists, and acknowledge/resolve operational blockers.

### Staff Appraiser My Work Shell Profile

Shell name:

- My Work Shell.

Primary daily question:

- What assigned work do I need to move forward today?

First-screen focus:

- assigned orders needing action;
- due-soon and overdue assigned work;
- needs revisions;
- site visit/report progress;
- files and notes in order context.

Top navigation/grouping hierarchy:

- My Work;
- My Assigned Orders;
- Needs Revisions;
- Calendar;
- Files inside order context;
- Notes/Activity inside assigned-order context;
- Settings only where personally relevant.

Preferred workspace naming:

- My Assigned Orders;
- Needs Revisions;
- Due Soon;
- Site Visits;
- Report Work;
- Files;
- Notes.

Preferred dashboard naming:

- My Work.

Preferred quick-action naming:

- Continue work;
- Open assignment;
- Add note;
- Upload file;
- Submit to review;
- Resubmit to review.

Preferred command palette language:

- Open My Work;
- Open My Assigned Orders;
- Open Needs Revisions;
- Open Due Soon;
- Open My Calendar;
- Find My Assigned Work.

Preferred empty-state tone:

- clear and non-punitive;
- `No assigned work needs action right now`;
- `No revision requests are open`;
- avoid `No canonical order access` or packet language.

Preferred notification tone:

- direct action-needed alerts;
- due-soon, overdue, revision requested, file/comment relevant to assigned work;
- no owner/admin summaries.

Operational vocabulary guidance:

- use assigned work, my assigned orders, due soon, needs revisions, site visit, report, files,
  submit to review;
- avoid owner setup, team management, broad analytics, packet, canonical access, queue mechanics.

Information-density guidance:

- moderate density;
- prioritize next action, due date, revision reason, property/order summary, and required files;
- avoid large company-wide tables unless explicitly permissioned and secondary.

Mobile-execution implications:

- mobile should make due work, revision response, site visit context, file upload, and quick notes
  easy;
- do not force full order-inventory scanning on mobile.

### Reviewer Review Workbench Shell Profile

Shell name:

- Review Workbench Shell.

Primary daily question:

- What review decisions do I need to make next?

First-screen focus:

- assigned review queue;
- overdue review items;
- resubmitted work;
- revision loops;
- review notes and supporting files.

Top navigation/grouping hierarchy:

- Review Queue;
- In Review;
- Needs Revisions;
- Ready for Client where permissioned;
- Review Calendar;
- Activity/Notes scoped to review work.

Preferred workspace naming:

- Review Queue;
- In Review;
- Submitted Work;
- Needs Revisions;
- Revision History;
- Review Notes.

Preferred dashboard naming:

- Review Queue or Review Workbench.

Preferred quick-action naming:

- Open review;
- Request revisions;
- Clear review;
- Mark ready for client where permissioned;
- Add review note;
- View revision history.

Preferred command palette language:

- Open Review Queue;
- Open In Review;
- Open Needs Revisions;
- Open Resubmitted Work;
- Open Review Calendar;
- Find Review Work.

Preferred empty-state tone:

- decision-centered;
- `No review items need action right now`;
- `No resubmitted work is waiting for review`;
- avoid broad order-inventory empties when the user is in a review shell.

Preferred notification tone:

- new review assignment;
- resubmission received;
- review due soon or overdue;
- repeat revision loop;
- avoid owner/admin operations noise.

Operational vocabulary guidance:

- use review queue, in review, submitted work, needs revisions, clear review, ready for client,
  review notes, revision history;
- avoid packet except assignment-scoped work, and avoid abstract workflow-state labels when plain
  review language is clearer.

Information-density guidance:

- high density within review work;
- emphasize decision status, age in review, due pressure, appraiser submission context, latest
  revision note, and files;
- hide unrelated setup/client/admin information.

Mobile-execution implications:

- mobile should support triage, reading context, adding review notes, and requesting/clearing
  review only when the decision can be made safely on a small screen;
- complex document review may remain desktop-preferred.

### Assignment/Vendor Recipient Received Work Shell Profile

Shell name:

- Received Work Shell.

Primary daily question:

- What received work requests need my response or submission?

First-screen focus:

- offers awaiting response;
- active work due soon;
- submitted work awaiting owner review;
- correction requests;
- completed/terminal assignment history.

Top navigation/grouping hierarchy:

- Received Work;
- Offers;
- Active Work;
- Submitted Work;
- Completed Work;
- Profile/availability later if vendor portal is enabled.

Preferred workspace naming:

- Received Work;
- Work Requests;
- Offers;
- Active Work;
- Submitted Work;
- Owner Review;
- Completed Work.

Preferred dashboard naming:

- Received Work.

Preferred quick-action naming:

- View request;
- Accept offer;
- Decline offer;
- Continue work;
- Submit work;
- Respond to correction;
- View instructions.

Preferred command palette language:

- Open Received Work;
- Open Offers;
- Open Active Work;
- Open Submitted Work;
- Open Completed Work;
- Find Received Work.

Preferred empty-state tone:

- scoped and work-native;
- `No received work is available in this view`;
- `No offers are waiting for response`;
- avoid `No assignment packets are available` and avoid explaining canonical order fallback.

Preferred notification tone:

- new work request;
- offer expiring;
- due soon or overdue;
- owner requested correction;
- owner completed, cancelled, or revoked assignment;
- no internal owner workflow alerts.

Operational vocabulary guidance:

- use received work, work request, offer, assignment, active work, submit work, owner review,
  correction requested, instructions;
- reserve assignment packet for internal docs and owner/admin oversight distinctions.

Information-density guidance:

- compact and action-first;
- show only assignment-scoped fields intentionally exposed through governed packet contracts;
- avoid internal order/client/team/review detail.

Mobile-execution implications:

- mobile is especially important for offer response, due-date checks, instruction review, and
  submission status;
- large uploads or deliverable preparation may remain desktop-preferred unless mobile upload flows
  are explicitly designed.

### Future Client Portal Client Requests Shell Profile

This profile is high-level only. Client Portal is not implemented in this phase.

Shell name:

- Client Requests Shell.

Primary daily question:

- What requests need my attention, and what is their current status?

First-screen focus:

- action-needed requests;
- in-progress request status;
- document upload requests;
- reports/documents available;
- completed request history.

Top navigation/grouping hierarchy:

- Requests;
- Action Needed;
- Documents;
- Reports;
- Messages;
- Account / Team later if enabled.

Preferred workspace naming:

- Requests;
- Action Needed;
- Documents;
- Reports;
- Messages;
- Completed Requests.

Preferred dashboard naming:

- Requests or Client Home.

Preferred quick-action naming:

- Open request;
- Submit request;
- Upload document;
- View status;
- Download report;
- Reply to message.

Preferred command palette language:

- Open Requests;
- Open Action Needed;
- Open Documents;
- Open Reports;
- Open Messages;
- Find Requests.

Preferred empty-state tone:

- client-safe and simple;
- `No requests need your attention`;
- `No reports are available yet`;
- do not expose internal workflow, review, appraiser, vendor, packet, permission, or route language.

Preferred notification tone:

- request received/acknowledged;
- action needed;
- document requested;
- report available;
- message received;
- sparse, client-safe milestone language.

Operational vocabulary guidance:

- use requests, status, action needed, documents, reports, messages, completed requests;
- avoid orders as the primary noun unless company/client terminology is explicitly configured;
- never expose packet, review queue, vendor assignment, internal notes, or workflow-state labels by
  default.

Information-density guidance:

- lowest operational density;
- show status, next action, due/requested information, and available documents;
- hide internal staffing, workload, workflow, and escalation data.

Mobile-execution implications:

- client mobile should prioritize status checks, action-needed completion, document upload, report
  download, and messages;
- internal desktop mission-control assumptions should not leak into the portal.

### Role-First Entry Hierarchy

Future shell selection should choose first-screen emphasis after authority resolution:

1. Resolve current company and authenticated user.
2. Resolve permissions, object visibility, and role labels.
3. Resolve shell profile or primary work view.
4. Choose shell-native first screen, nav vocabulary, command vocabulary, and empty-state language.
5. Execute only governed route, RPC, RLS, object-visibility, and workflow actions.

Suggested default hierarchy:

- assignment-only users enter Received Work;
- reviewers with primary review responsibility enter Review Queue;
- staff appraisers with assigned-order responsibility enter My Work;
- owner/admin users enter Operations;
- multi-role users inherit the strongest daily-work default or later choose a preferred shell;
- future client users enter Requests.

This hierarchy is not an implementation plan. It is vocabulary and priority guidance for the next
planning slice.

### Current Reality Versus Future Behavior

Current reality:

- current runtime shell remains mostly shared and surface-centric;
- dashboard routing is permission-aware but not yet full shell-profile aware;
- navigation and command palette labels still use broad destinations;
- assignment-only separation is strong, but recipient-facing copy still overuses packet language;
- Client Portal is not implemented.

Recommended future shell behavior:

- resolve shell profiles after authority resolution;
- use shell-native first-screen headings and commands;
- separate owner/admin operations from setup/admin support;
- make appraiser `My Work` and reviewer `Review Queue` first-class workbench frames;
- use `Received Work` and `Work Request` for assignment/vendor recipients;
- keep client portal language request/status/document/report native;
- keep permission, route, RLS/RPC, object visibility, and workflow authority unchanged.

Deferred experimentation:

- user-selectable default shell;
- multi-role shell switcher;
- company-configurable terminology;
- role-specific command palette lanes;
- notification digest modes by role;
- mobile-first quick action rails;
- client-safe status projection designer;
- AI-assisted daily summaries after authoritative data contracts exist.

### Phase 1C Conclusions

- Shell vocabulary should be role-native before runtime shell work begins.
- `Operations`, `My Work`, `Review Queue`, `Received Work`, and `Requests` are the preferred
  future shell frames.
- `Orders` remains appropriate for owner/admin and broad internal inventory, but should not be the
  universal first-screen noun.
- `packet` remains valid as internal architecture and selective assignment-scoped owner/admin
  language, but recipient-facing surfaces should lead with `Work Request`, `Received Work`,
  `Offer`, and `Assignment`.
- Future Client Portal language must be request/status/document/report native and must not reuse
  internal Clients Workspace terminology as a restricted shell.
- Command palette language should shift from generic destination labels to role-native operational
  actions.
- Mobile should emphasize execution and triage, while desktop remains the dense mission-control
  surface for owner/admin work.

## Phase 1D Shell Resolution And Migration Slice Plan

Phase 1D defines how Falcon should safely migrate from the current broad, surface-centric shell
toward role-native shells without changing runtime behavior yet.

This phase is documentation and planning only. It makes no runtime behavior, route, permission,
navigation, dashboard, shell switching, command palette behavior, backend, Supabase, query,
workflow, role-authority, Client Portal, branding, or production data change.

### Phase 1D Goal

The migration goal is not to create new authority. The goal is to introduce a future presentation
resolver that can choose shell vocabulary, navigation emphasis, dashboard/workbench framing,
command language, and empty-state language after the existing authority model has already decided
what the user may access.

### Shell Resolution Inputs

Future shell resolution should read only already-authoritative context. It should not invent new
permissions, bypass guards, or infer access from labels.

Inputs:

- authenticated user;
- current company;
- active company membership;
- active role assignments and role labels;
- resolved permissions;
- object visibility posture;
- assignment-only access posture;
- owner/admin authority indicators;
- appraiser production responsibility indicators;
- reviewer production responsibility indicators;
- route availability from existing guards;
- future product mode/module availability when those registries are authoritative;
- future Client Portal availability only after portal authority exists.

Non-inputs:

- nav label text;
- dashboard heading text;
- command palette label text;
- hidden route presence;
- future module marketing names;
- client or vendor portal plans before those authority models exist.

### Authority Boundary

Shell resolution should stay downstream of authority:

1. Authentication confirms the user.
2. Current-company resolution confirms the company context.
3. Permissions, RLS/RPCs, route guards, and object visibility determine access.
4. Shell resolution chooses presentation and priority for already-available surfaces.
5. Runtime actions still call governed routes, RPCs, and workflow contracts.

Rules:

- a shell can hide or de-emphasize a surface the user may technically access;
- a shell cannot expose a route or action the user is not authorized to use;
- route guards remain required even when a shell omits or shows a nav item;
- RLS/RPC checks remain required even when a shell shows an action;
- object-scoped assignment visibility remains packet-scoped even if the shell calls it `Received
  Work`;
- Client Portal remains unavailable until portal-specific authority and data projections exist.

### Shell Profile Records

Future shell profiles should be data-like records, not hardcoded assumptions scattered through
components.

Each profile should define:

- shell id;
- shell name;
- daily-work label;
- dashboard/workbench label;
- primary nav groups;
- secondary nav groups;
- command vocabulary set;
- empty-state vocabulary set;
- notification emphasis;
- onboarding emphasis;
- mobile emphasis;
- surfaces to de-emphasize;
- required authority signals;
- disallowed authority shortcuts.

Recommended profile ids:

| Profile id | Shell | Required authority posture |
|---|---|---|
| `operations` | Owner/Admin Operations | owner/admin or broad operations permissions |
| `my_work` | Staff Appraiser My Work | assigned internal order work responsibility |
| `review_queue` | Reviewer Review Queue | review responsibility or review-stage permissions |
| `received_work` | Assignment Recipient Received Work | assignment-only or assignment-recipient posture |
| `requests` | Future Client Requests | future client portal authority only |
| `unavailable` | Access Unavailable | authenticated user without enough workspace access |

### Primary Shell Selection Rules

Future primary-shell selection should be conservative and explainable.

Default rules:

1. If the user has assignment-only access and no canonical order/client/admin authority, select
   `received_work`.
2. If the user has future client portal authority only, select `requests`.
3. If the user has owner/admin operations authority, select `operations`.
4. If the user has reviewer responsibility and no owner/admin authority, select `review_queue`.
5. If the user has staff appraiser assigned-work responsibility and no owner/admin or reviewer
   priority, select `my_work`.
6. If the user has both appraiser and reviewer responsibility without owner/admin authority, select
   a deterministic production default and expose the other as a secondary workbench.
7. If no profile has enough authority, select `unavailable`.

Recommended deterministic production default for appraiser/reviewer hybrids:

- default to `review_queue` when review-stage work is waiting for that user;
- otherwise default to `my_work`;
- do not create a combined workbench until the product intentionally designs one.

Rationale:

- review decisions can block delivery for other staff;
- appraiser execution still needs a clean `My Work` frame;
- a combined workbench risks recreating a generic dashboard unless deliberately designed.

### Owner/Admin And Production Work

If a user is both owner/admin and appraiser, the default should be `operations`.

Reasoning:

- owner/admin authority usually carries company-wide responsibility and operational exception
  handling;
- owner/admin users can still need their assigned production work, but their default shell should
  not hide company risk;
- `My Work` should be available as a secondary work view when the user also has assigned production
  work.

If a user is both owner/admin and reviewer, the default should also be `operations`.

Reasoning:

- review bottlenecks should be visible inside Operations;
- owner/admin can enter `Review Queue` as a workbench when directly performing review work;
- defaulting an owner/admin into review-only presentation could hide unassigned work, team access,
  setup, and broader delivery risk.

Owner/admin shell switching:

- owner/admin users who also perform production work should eventually be able to switch into `My
  Work` or `Review Queue`;
- shell switching should be presentation-only and should not grant new route/action authority;
- shell switching is deferred until shell profiles and telemetry-free defaults are stable.

### Assignment-Only Users

Assignment-only users should bypass Operations entirely.

Rules:

- do not route assignment-only users to owner/admin dashboard framing;
- do not show Orders, Clients, Team Access, or owner settings unless separately designed and
  permissioned;
- use `Received Work`, `Offers`, `Active Work`, and `Submitted Work` as the primary vocabulary;
- preserve packet-scoped route/RPC visibility underneath.

### Ambiguous Or Insufficient Access

Ambiguous access should produce a clear, non-leaky fallback.

Fallback states:

- `unavailable`: authenticated user has no order, assignment, admin, or future portal workspace
  authority;
- `company_required`: user has no resolved current company;
- `membership_inactive`: membership exists but is inactive or unavailable;
- `profile_ambiguous`: multiple production profiles match and no deterministic default has enough
  evidence;
- `module_unavailable`: future product mode/module is referenced but not enabled.

Fallback language:

- use `No workspace is available for your current access`;
- use `Choose a company to continue` where applicable;
- use `This workspace is not available for your current company`;
- avoid permission keys, RLS/RPC wording, canonical access, and hidden-record implications.

### DashboardGate Evolution

`DashboardGate` should continue to be treated as dashboard selection, not permission authority.

Near-term evolution:

- keep current permission checks and route guards unchanged;
- introduce a read-only shell-profile resolver beside, not inside, backend authority;
- let `DashboardGate` consume resolved profile metadata only to choose which dashboard/workbench
  presentation to render;
- preserve the existing unavailable state for users without order or assignment read posture;
- add tests proving shell labels do not bypass route authority.

Longer-term evolution:

- `DashboardGate` may become `WorkspaceGate` or `ShellGate` only after shell profiles are proven;
- the gate should select presentation components, not authorize data access;
- data queries inside dashboard/workbench components must remain permission-aware and object-scoped.

### Navigation Migration Sequence

Navigation should migrate from low-risk label changes to profile-aware grouping.

Phase N1: docs and copy inventory.

- map current nav labels to Phase 1C vocabulary;
- identify labels that are safe because route and authority already match;
- identify labels that must wait for profile resolution.

Phase N2: safe owner/admin label migration.

- `Users` can become `Team Access` where the route already represents team/invitation management;
- settings utility labels may clarify `Owner Setup` where already gated;
- no route paths change.

Phase N3: assignment terminology refinement.

- recipient-facing labels move from packet-heavy language toward `Received Work`, `Offers`, and
  `Active Work`;
- owner/admin assignment oversight may retain `Assignments` or `Sent Assignments`;
- do not rename architecture docs, tests, or safety comments that need packet precision.

Phase N4: shell-profile-aware primary nav.

- primary nav groups render based on resolved shell profile and existing permission visibility;
- appraiser default nav emphasizes `My Work`;
- reviewer default nav emphasizes `Review Queue`;
- owner/admin nav remains broad but grouped;
- assignment-only nav bypasses Operations.

Phase N5: optional shell switcher.

- only after profile defaults are tested;
- presentation-only;
- never a permission bypass.

Labels safe first:

- `Users` to `Team Access` in owner/admin-facing navigation and commands;
- `Owner Setup` for the existing owner setup utility;
- assignment empty/copy refinements from `assignment packets` to `received work` where recipient
  context is clear.

Labels that should wait for shell resolution:

- changing global `Orders` to `My Work`;
- changing global `Dashboard` to `Operations`;
- changing global `Assignments` to `Received Work`;
- replacing route-level nav universally with `Review Queue`;
- introducing `Requests` before Client Portal authority exists.

### Dashboard And Workbench Migration Sequence

Dashboard migration should preserve current dashboard behavior until profile selection is proven.

Phase D1: resolver design and tests.

- define pure shell resolution from supplied context;
- test owner/admin, assignment-only, appraiser, reviewer, hybrid, and unavailable cases;
- no UI change.

Phase D2: passive profile metadata.

- expose profile name, daily question, and preferred labels to dashboard components;
- keep rendered dashboard structure unchanged;
- verify no query or route behavior changes.

Phase D3: heading and empty-state vocabulary.

- update headings/subheadings where profile-specific language is safe;
- avoid changing table/query semantics;
- keep current dashboard components.

Phase D4: workbench extraction.

- create narrow workbench presentations for `My Work` and `Review Queue`;
- reuse existing governed data sources and route guards;
- do not rewrite Orders or Dashboard wholesale.

Phase D5: Operations grouping.

- group owner/admin daily operations separately from setup/admin support;
- keep broad visibility but reduce first-screen alert overload.

Phase D6: future Client Requests.

- blocked until Client Portal authority, routes, data projections, and client-safe status contracts
  exist.

### Terminology Migration Sequence

Terminology should migrate before structural shell rewrites when it is low risk.

Sequence:

1. Replace technical denied/empty-state language with operational language.
2. Replace `Users` with `Team Access` where the route purpose is already team access.
3. Reduce recipient-facing `packet` density in headings, empty states, and command labels.
4. Introduce `My Work` and `Review Queue` only in surfaces where profile context is known.
5. Keep `Orders` for owner/admin and broad internal inventory.
6. Keep `Requests` reserved for future Client Portal.

Do not change:

- permission keys;
- route ids;
- database/RPC/function names;
- test names where packet precision protects assignment isolation;
- architecture docs that explain packet-scoped safety.

### Command Palette And Quick-Action Migration Sequence

Command palette migration should follow shell resolution because commands shape user expectation.

Phase C1: label-safe command copy.

- `Go to Users` becomes `Open Team Access` when permissioned;
- settings commands clarify `Open Owner Setup` or `Open Notification Settings`;
- no command availability change.

Phase C2: command context metadata.

- commands gain shell profile tags for future grouping;
- no visible behavior change.

Phase C3: profile-aware command ordering.

- owner/admin: operations, active orders, review queue, team access;
- appraiser: my work, needs revisions, due soon;
- reviewer: review queue, in review, resubmitted work;
- assignment recipient: received work, offers, active work;
- future client: blocked.

Phase C4: profile-aware placeholders and no-result copy.

- use shell-specific search hints;
- keep unavailable commands hidden by existing authority.

Phase C5: quick-action vocabulary.

- labels reflect governed actions already available;
- do not add new actions through copy-only migration.

### Product Mode And Module Availability

Future product mode/module availability should be a shell input only when it is authoritative.

Rules:

- do not show future modules as disabled clutter;
- do not expose Client Portal shell labels before portal authority exists;
- do not infer vendor/client capabilities from product packaging docs alone;
- if a module is disabled, use `module_unavailable` fallback language only in admin/setup contexts
  where that information is relevant.

### Safest First Runtime Slice

The safest first runtime implementation slice should be **Shell Resolution Phase R1: Pure Resolver
And Tests**.

Scope:

- add a pure, side-effect-free shell profile resolver that accepts explicit context and returns a
  profile id plus presentation metadata;
- add fixture-based tests for owner/admin, appraiser, reviewer, appraiser/reviewer hybrid,
  owner/admin plus production work, assignment-only, insufficient access, and future-client blocked
  cases;
- do not connect it to live navigation, dashboard rendering, routes, data queries, command palette,
  permissions, or backend behavior yet.

Why this is safest:

- proves selection logic without changing UI;
- keeps route guards/RLS/RPCs as authority;
- creates one place to review multi-role defaults before presentation changes;
- gives later nav/dashboard/command slices a tested dependency.

Explicitly out of scope for R1:

- rendering shell-specific nav;
- changing `DashboardGate` output;
- changing labels in runtime UI;
- adding a shell switcher;
- changing route paths or guards;
- changing queries, RPCs, Supabase policies, or workflow actions;
- building Client Portal.

### Phase 1D Conclusions

- Shell resolution must be downstream of authentication, current-company, permissions, route
  guards, RLS/RPCs, and object visibility.
- Owner/admin plus production-work users should default to Operations, with future secondary access
  to `My Work` or `Review Queue`.
- Assignment-only users should bypass Operations and enter Received Work.
- Appraiser/reviewer hybrids should not get a combined workbench by default; use a deterministic
  default and expose the other workbench secondarily.
- `DashboardGate` should evolve into presentation selection only, not permission authority.
- First safe label changes are `Users` to `Team Access`, owner setup clarification, and
  recipient-facing packet-density reduction where context is clear.
- Global `Orders`, `Dashboard`, `Assignments`, and future `Requests` label changes should wait for
  shell resolution.
- The safest first runtime slice is a pure shell-profile resolver with tests and no UI connection.

## Shell Resolution Phase R1 Pure Resolver And Tests

Phase R1 adds the first runtime foundation for role-centric shells as a pure, side-effect-free
resolver plus focused unit tests.

Runtime files added:

- `src/lib/shell/resolveShellProfile.js`;
- `src/lib/shell/__tests__/resolveShellProfile.test.js`.

R1 does not wire shell resolution into live UI. It does not change `DashboardGate`, navigation,
routes, permissions, command palette behavior, backend behavior, Supabase behavior, query behavior,
workflow behavior, shell switching, Client Portal behavior, branding, or production data.

### R1 Resolver Contract

`resolveShellProfile(...)` accepts plain data and returns a stable presentation profile result.

Supported profile ids:

- `operations`;
- `my_work`;
- `review_queue`;
- `received_work`;
- `requests`;
- `unavailable`;
- `company_required`;
- `membership_inactive`;
- `profile_ambiguous`;
- `module_unavailable`.

Each result includes:

- `id`;
- `label`;
- `reason`;
- `metadataAuthority: presentation_only`;
- normalized `capabilities`.

The resolver is presentation selection only. It does not grant access, replace permission checks,
inspect routes, inspect database objects, or call external services.

### R1 Input Signals

The resolver accepts explicit plain-data signals such as:

- authenticated/session presence;
- current company presence;
- membership status;
- permission keys;
- role labels;
- owner/admin authority flags;
- appraiser responsibility flags;
- reviewer responsibility flags;
- assignment-recipient or assignment-only posture;
- review work waiting;
- future client requests authority;
- future requests module availability;
- explicit ambiguity or requested-profile markers.

The resolver also normalizes permission arrays, permission sets, permission maps, role arrays, and
role sets for deterministic test coverage.

### R1 Selection Rules Implemented

Implemented rules:

1. Missing authentication resolves to `unavailable`.
2. Missing current company resolves to `company_required`.
3. Inactive membership resolves to `membership_inactive`.
4. Explicitly requested disabled future requests profile resolves to `module_unavailable`.
5. Explicit ambiguity resolves to `profile_ambiguous`.
6. Assignment-only users resolve to `received_work`.
7. Future client requests resolves to `requests` only when both client requests authority and
   requests module availability are explicit.
8. Owner/admin authority resolves to `operations`, including owner/admin users who also have
   appraiser or reviewer production responsibility.
9. Reviewer responsibility with explicit review work waiting resolves to `review_queue`.
10. Appraiser responsibility resolves to `my_work`.
11. Reviewer-only responsibility resolves to `review_queue`.
12. No matching usable profile resolves to `unavailable`.

R1 appraiser/reviewer hybrid behavior:

- default hybrid appraiser/reviewer users to `my_work`;
- resolve to `review_queue` when `reviewWorkWaiting` is explicitly true;
- do not create a combined workbench.

### R1 Test Coverage

Focused unit tests cover:

- no authenticated session;
- missing current company;
- inactive membership;
- owner/admin authority;
- owner/admin plus appraiser production work;
- owner/admin plus reviewer production work;
- assignment-only users;
- mixed internal order plus assignment access;
- appraiser-only users;
- reviewer-only users;
- appraiser/reviewer hybrid default;
- appraiser/reviewer hybrid with review work waiting;
- future client requests explicit enablement;
- disabled future requests module fallback;
- explicit ambiguous profile fallback;
- normalized capabilities from permission maps and role sets;
- deterministic and side-effect-free output for the same plain input.

### R1 Validation

R1 validation should include:

- targeted resolver tests;
- lint;
- build;
- `git diff --check`;
- whitespace scan for touched docs and shell resolver files.

### R1 Conclusions

- Falcon now has a tested pure shell-profile resolver foundation.
- The resolver is not connected to live navigation, dashboard rendering, command palette behavior,
  route guards, permissions, queries, workflow actions, or Client Portal.
- The first runtime step preserves the Phase 1D authority boundary: shell profiles are
  presentation metadata only.

## Shell Resolution Phase R2 Passive Shell Profile Metadata

Phase R2 adds passive shell profile metadata for the R1 profile ids. This metadata describes
role-native labels, daily questions, workspace naming, dashboard/workbench naming, navigation
vocabulary notes, empty-state tone, notification tone, and preferred action language.

Runtime files added:

- `src/lib/shell/shellProfiles.js`;
- `src/lib/shell/__tests__/shellProfiles.test.js`.

R2 does not wire shell metadata into live UI. It does not change `DashboardGate`, navigation,
routes, permissions, command palette behavior, backend behavior, Supabase behavior, query behavior,
workflow behavior, shell switching, Client Portal behavior, branding, or production data.

### R2 Metadata Contract

`shellProfiles.js` exports:

- `SHELL_PROFILE_STATUSES`;
- `shellProfileMetadataEntries`;
- `shellProfileMetadataById`;
- `SHELL_PROFILE_METADATA_IDS`;
- `getShellProfileMetadata(...)`.

Each metadata record includes:

- profile id;
- display label;
- short label;
- primary daily question;
- default workspace label;
- navigation vocabulary notes;
- dashboard/workbench title;
- empty-state tone;
- notification tone;
- preferred action language;
- status;
- priority;
- `metadataAuthority: presentation_only`.

### R2 Profiles Added

Active profiles:

- `operations`: Operations / Operations Dashboard / What needs attention across the business?
- `my_work`: My Work / Assigned Work / What do I need to finish?
- `review_queue`: Review Queue / Review Workbench / What needs my review decision?
- `received_work`: Received Work / Work Requests / What was assigned to me?

Future profile:

- `requests`: Requests / Client Requests / What requests need my attention?

Fallback profiles:

- `unavailable`;
- `company_required`;
- `membership_inactive`;
- `profile_ambiguous`;
- `module_unavailable`.

### R2 Guardrails

R2 metadata is presentation-only:

- no route paths;
- no route authority;
- no permission keys;
- no component hints;
- no query contracts;
- no backend behavior;
- no module enablement behavior;
- no Client Portal activation.

The metadata can support future diagnostics, tests, and passive audit surfaces before any live
navigation, dashboard, command palette, or shell switching behavior consumes it.

### R2 Test Coverage

Focused unit tests cover:

- every R1 shell profile id has metadata;
- metadata id order is stable;
- required fields are present;
- every record is `presentation_only`;
- active operational profiles have role-native labels and titles;
- `requests` is marked future-only and avoids internal portal-leaking language;
- unavailable/company/membership/ambiguous/module records are fallback metadata;
- unknown profile lookups return `null`;
- entries and nested vocabulary arrays are frozen;
- metadata does not include route paths, permission keys, or component hints.

### R2 Conclusions

- Falcon now has passive metadata for all R1 shell profile ids.
- The metadata registry is inert and is not connected to live UI.
- R2 gives future slices a stable presentation vocabulary dependency without changing dashboard,
  navigation, command palette, route, permission, backend, or workflow behavior.

## Shell Resolution Phase R3 Safe Label Migration Plan

Phase R3 plans the first safe role-centric language migrations before changing live navigation or
UI copy.

This phase is documentation and planning only. It makes no runtime behavior, route, permission,
navigation, dashboard, command palette, shell, backend, Supabase, query, workflow, role-authority,
Client Portal, shell switcher, branding, or production data change.

### R3 Sources Inspected

Runtime label sources inspected:

- `src/lib/navigation/currentNavigationRegistry.js`;
- `src/lib/navigation/currentPrimaryNavLinks.js`;
- `src/components/shell/TopNav.jsx`;
- `src/lib/commandPalette/currentCommandRegistry.js`;
- `src/lib/commandPalette/currentCommandPaletteCommands.js`;
- `src/components/nav/CommandPalette.jsx`;
- `src/features/dashboard/DashboardGate.jsx`;
- `src/lib/dashboard/currentDashboardResolution.js`;
- `src/features/dashboard/DashboardPage.jsx`;
- `src/features/dashboard/AssignmentDashboardPage.jsx`;
- `src/features/assignments/AssignmentsPage.jsx`;
- `src/features/assignments/AssignmentPrimitives.jsx`;
- `src/features/assignments/AssignmentDetail.jsx`;
- `src/features/assignments/AssignedAssignmentInbox.jsx`;
- `src/pages/admin/UsersIndex.jsx`;
- `src/pages/admin/OwnerSetup.jsx`.

Supporting current test/source references inspected:

- dashboard tests that assert `Operations Dashboard`, `Work View`, `Owner / Admin`, `Reviewer`,
  `My Review Work`, and `Team Access`;
- assignment source strings around `Assignment packet`, `Packet Actions`, `No order fallback was
  attempted`, `Received Work`, and `Open packet`;
- admin setup tests that already assert `Owner Setup` and `Open Team Access`;
- Product Metadata Diagnostics references that must remain diagnostic-only and not be treated as
  live shell copy.

### R3 Current Label Inventory

Current live navigation labels remain surface-centric:

- brand: `Falcon Operations` / `Operations Console`;
- primary nav: `Orders`, `Assignments`, `Relationships`, `Calendar`, `Clients`, `Users`;
- mobile-only settings entry: `Settings`;
- command labels: `Go to Orders`, `Go to Assignments`, `Go to Relationships`, `Go to Calendar`,
  `Go to Clients`, `Go to Users`, `Open Settings`, `Notification Settings`;
- command placeholder: `Search... (Orders, Assignments, Relationships, Clients, Users, Settings)`;
- command fallback: `Press Enter to search Orders for ...`.

Current dashboard labels are partially role-aware but still shared:

- `Operations Dashboard`;
- `Work View`;
- `Owner / Admin`, `Reviewer`, `Appraiser`;
- `Active Worklist`, `My Review Work`, `My Assignments`;
- unavailable copy references `order read permission` and `assignment packet read permission`.

Current assignment labels preserve packet safety but overuse packet language for recipient-facing
work:

- `Assignments Workspace`;
- `Packet Coordination`;
- `Coordinate scoped assignment packets...`;
- `Packet-scoped`;
- `Open packets only`;
- `Assignment Packet`;
- `Packet Actions`;
- `Packet Context`;
- `No assignment packets are available for this view`;
- `No order fallback was attempted`;
- recipient lane also already uses `Received Work`, `No received work`, and `Offers and active
  work...`.

Current Team Access and owner setup labels are already mostly aligned inside their pages:

- `/users` route and primary nav still say `Users`;
- the users page and invitation surfaces already frame the work as `Team Access`;
- Owner Setup already uses `Owner Setup` and `Open Team Access` language.

### R3 Label Migration Safety Levels

Safety levels:

- **Safe before shell wiring:** label aligns with the route's existing purpose and existing
  permission gate, and does not require knowing the resolved shell profile.
- **Conditional before shell wiring:** copy can change only in a context-specific lane, component,
  or state where the role/user-facing context is already explicit.
- **Wait for shell wiring:** copy depends on `operations`, `my_work`, `review_queue`,
  `received_work`, or `requests` selection and should not change globally.
- **Internal only:** keep the technical wording in code identifiers, tests, architecture docs,
  diagnostics, safety notes, or developer-only contexts where precision protects authority.

### R3 Label Migration Matrix

| Current label / copy | Proposed direction | Affected roles | Safety level | Implementation dependency | Requires shell resolution first? |
|---|---|---|---|---|---|
| `Users` primary nav | `Team Access` | Owner/Admin | Safe before shell wiring | Navigation registry label and primary nav tests | No |
| `Go to Users` command | `Open Team Access` | Owner/Admin | Safe before shell wiring | Command registry/helper tests and palette assertions | No |
| command placeholder includes `Users` | `Team Access` in the existing broad placeholder | Owner/Admin and users with team access | Safe before shell wiring if placeholder remains broad | Command palette copy/tests | No |
| `/users` route id/path | Keep internal route id/path | Internal | Internal only | None | No |
| `Open Settings` | Keep until owner/admin setup is split from personal settings | All roles with settings | Wait for shell wiring | Settings/profile utility planning | Yes |
| `Owner Setup →` settings link | Keep `Owner Setup`; optionally align command/utility wording later | Owner/Admin | Safe before shell wiring where already settings-gated | Settings utility tests | No |
| `Dashboard` registry label / brand route | Keep generic route label; do not globally rename | All roles | Wait for shell wiring | Dashboard/shell consumption of R1/R2 metadata | Yes |
| `Falcon Operations` / `Operations Console` brand | Keep for now | All authenticated users | Wait for shell wiring | Brand strategy and profile-aware shell frame | Yes |
| `Operations Dashboard` | Keep as current shared dashboard heading until profile-aware rendering | Owner/Admin, appraiser, reviewer | Wait for shell wiring | Dashboard heading migration | Yes |
| `Work View` context tile | Later derive profile-native labels such as `Operations`, `My Work`, `Review Queue`, `Received Work` | All shell profiles | Wait for shell wiring | Passive metadata consumption | Yes |
| `Active Worklist` | Keep for owner/admin/dashboard shared surface; role-specific labels later | Owner/Admin primarily | Wait for shell wiring | Dashboard/workbench extraction | Yes |
| `My Review Work` | Future `Review Queue` candidate | Reviewer | Wait for shell wiring | Reviewer profile/workbench selection | Yes |
| `My Assignments` | Future `My Work` / `My Assigned Orders` candidate for internal appraisers; avoid for vendor recipients | Appraiser | Wait for shell wiring | Appraiser profile/workbench selection | Yes |
| `Orders` primary nav | Keep globally for now | Owner/Admin and broad internal users | Wait for shell wiring | Profile-aware nav grouping | Yes |
| `Go to Orders` command | Keep globally for now | Owner/Admin and broad internal users | Wait for shell wiring | Profile-aware command ordering/language | Yes |
| `Search Orders` fallback | Keep until command search can be profile-aware | Internal order-capable users | Wait for shell wiring | Profile-aware command fallback | Yes |
| `Assignments` primary nav | Keep globally for now | Owner/Admin and assignment recipients | Wait for shell wiring | Profile-aware nav grouping and owner/recipient lane split | Yes |
| `Go to Assignments` command | Later split toward `Open Received Work` or `Open Sent Assignments` by shell | Owner/Admin, assignment recipients | Wait for shell wiring | Profile-aware command metadata/order | Yes |
| `Assignments Workspace` | Keep until assignment shell context is known | Owner/Admin, assignment recipients | Conditional before shell wiring | Could change only in recipient-only dashboard/lane | Usually yes |
| `Packet Coordination` | Keep for owner/admin/internal assignment coordination | Owner/Admin/internal | Internal/conditional | Recipient-facing lane copy can differ | No for lane-only changes; yes globally |
| `Coordinate scoped assignment packets...` | Recipient-facing copy should lead with `work requests` / `received work`; owner/admin copy can retain packet precision | Assignment recipients, owner/admin | Conditional before shell wiring | Lane-specific copy and tests | No if lane-specific |
| `Packet-scoped` access tile | Keep where explaining safety; later translate to `Received work only` in recipient shell | Assignment recipients | Conditional before shell wiring | Context-specific assignment tile copy | No if recipient-only |
| `Open packets only` navigation tile | `Open received work only` where recipient-only; keep packet precision elsewhere | Assignment recipients | Conditional before shell wiring | Assignment lane/context tests | No if recipient-only |
| `No assignment packets are available for this view` | `No received work is available in this view` where assigned-recipient context is explicit | Assignment recipients | Conditional before shell wiring | Assignment empty-state tests | No if recipient-only |
| `Open packet` button | `Open work request` in received-work lane; keep `packet` in internal/owner contexts | Assignment recipients | Conditional before shell wiring | Assigned inbox copy/tests | No if recipient-only |
| `Assignment Packet` detail route label | Keep route/internal label; future detail title can become `Work Request` for recipients | Internal, assignment recipients | Internal now / wait for title split | Profile-aware detail presentation | Yes for global title |
| `Packet Actions` / `Packet Context` | Keep until detail can distinguish recipient versus owner/admin contexts | Assignment recipients, owner/admin | Wait for shell wiring | Detail shell/profile context | Yes |
| `No order fallback was attempted` | Keep in tests/safety docs; replace normal user-facing error later with scoped work language | Assignment recipients | Conditional before shell wiring | Error-state copy review and safety test updates | No if only user copy changes and safety remains in tests/docs |
| `Dashboard access requires order read permission or assignment packet read permission...` | Later use non-leaky fallback language such as `No workspace is available for your current access` | All fallback users | Wait for shell wiring | Shell fallback state mapping | Yes |
| `Requests` / Client Portal labels | Keep future-only; do not introduce in live nav/commands | Future client portal | Internal/future only | Client Portal authority/data projection | Yes |

### Safe Before Shell Wiring

The safest live label candidates after R3 planning are:

1. Change owner/admin-facing `Users` navigation to `Team Access`.
2. Change `Go to Users` command copy to `Open Team Access`.
3. Update the existing broad command placeholder from `Users` to `Team Access` without changing
   command availability, ordering, routes, or search behavior.
4. Keep `Owner Setup` as the setup utility label and avoid broader settings renames until shell
   profiles are live.

These changes are safe because `/users` already hosts Team Access invitation/member management,
the route remains `users.read` gated, Owner Setup already links to `Open Team Access`, and the
change does not depend on appraiser/reviewer/assignment-recipient shell selection.

### Conditional Before Shell Wiring

Assignment copy can improve before full shell wiring only where the component already knows it is
rendering assigned-recipient received work:

- `No assignment packets are available for this view` can become `No received work is available in
  this view` only in the received-work lane;
- `Open packet` can become `Open work request` only in the received-work lane;
- `Open packets only` can become `Open received work only` only where the context is clearly
  recipient-facing;
- normal user-facing error text can reduce `No order fallback was attempted` if the safety
  assertion remains preserved in tests, docs, or developer-only diagnostics.

Do not globally replace `packet` in assignment architecture, route metadata, safety tests, owner
assignment oversight, or internal comments. Packet precision still protects assignment isolation.

### Labels That Must Wait

These labels should wait until the R1 resolver and R2 metadata are consumed by a live presentation
boundary:

- `Dashboard` to `Operations`, `My Work`, `Review Queue`, or `Received Work`;
- `Operations Dashboard` to profile-specific dashboard/workbench headings;
- `Orders` to `My Orders`, `My Assigned Orders`, or `Review Queue`;
- `Assignments` to `Received Work` or `Sent Assignments`;
- command palette profile ordering and shell-specific placeholders;
- order-search fallback replacement for non-order-first shells;
- brand-level `Falcon Operations` / `Operations Console` changes;
- assignment detail `Packet Actions` and `Packet Context` changes that require owner versus
  recipient detail presentation;
- any `Requests` label in live UI before Client Portal authority, routes, and data projections
  exist.

### Internal-Only Language

Keep these terms in architecture, tests, diagnostics, route ids, permission constants, database/RPC
names, safety notes, and developer-facing explanations where precision matters:

- permission keys;
- route ids and route paths;
- RLS/RPC;
- canonical order access;
- assignment packet isolation;
- packet-scoped visibility;
- dashboard gate;
- shell profile resolver;
- product-mode/shadow diagnostics;
- Client Portal future-only references.

### R3 First Runtime Slice Recommendation

The first safe runtime label slice after R3 should be **R3A Team Access Label Alignment**.

Scope:

- update the current live navigation registry label for `users` from `Users` to `Team Access`;
- update the current live command label from `Go to Users` to `Open Team Access`;
- update the broad command palette placeholder from `Users` to `Team Access`;
- preserve `/users`, `users.read`, `navigation.users.view`, route guards, command availability,
  command ordering, primary nav order, mobile nav behavior, settings behavior, and Team Access page
  behavior;
- add or update focused tests for current nav links, command helper output, and active command
  palette copy.

Explicitly out of scope for R3A:

- profile-aware navigation;
- dashboard/workbench heading changes;
- appraiser/reviewer `My Work` or `Review Queue` runtime changes;
- assignment packet terminology changes outside a separate recipient-copy slice;
- command palette role-specific ordering;
- shell switcher;
- Client Portal labels or implementation.

### R3 Conclusions

- `Users` to `Team Access` is the clearest safe label migration because runtime purpose and current
  permission gates already align.
- Owner Setup copy is already mostly aligned and should remain secondary.
- Assignment recipient copy can reduce packet density only in clearly recipient-facing lanes; route,
  safety, and owner/admin packet language should remain precise.
- Global Dashboard, Orders, Assignments, command ordering, search fallback, and brand changes must
  wait for live shell-profile consumption.
- Future `Requests` language remains blocked until Client Portal authority and client-safe data
  projection exist.

## Shell Resolution Phase R3A Team Access Label Alignment

Phase R3A implements the first safe runtime role-language migration identified by R3.

Runtime files updated:

- `src/lib/navigation/currentNavigationRegistry.js`;
- `src/lib/commandPalette/currentCommandRegistry.js`;
- `src/components/nav/CommandPalette.jsx`.

Focused tests updated:

- `src/lib/navigation/__tests__/currentPrimaryNavLinks.test.js`;
- `src/lib/commandPalette/__tests__/currentCommandPaletteCommands.test.js`;
- `src/components/shell/__tests__/TopNav.test.jsx`;
- `src/components/nav/__tests__/CommandPalette.test.jsx`.

R3A changes only visible operational wording for the guarded `/users` Team Access surface:

- current live navigation label `Users` is now `Team Access`;
- current live command label `Go to Users` is now `Open Team Access`;
- command palette placeholder now says `Team Access` instead of `Users`.

R3A preserves:

- `/users` route path;
- `users` route/nav/command ids;
- `users.read` and `navigation.users.view` permission keys;
- route guards and command availability rules;
- primary nav order;
- desktop and mobile nav rendering behavior;
- command palette ordering, keyboard hints, filtering, and order-search fallback;
- `UsersIndex` component name and internal implementation;
- Owner Setup bridge behavior;
- backend, Supabase, query, workflow, RLS/RPC, and production data behavior.

R3A deliberately does not change:

- Dashboard labels;
- Orders labels;
- Assignments labels;
- shell-level headings;
- role-native dashboard/workbench titles;
- assignment packet terminology;
- Client Portal labels;
- shell switching or profile-aware runtime logic.

### R3A Validation

R3A validation should include:

- targeted current primary nav helper tests;
- targeted TopNav tests;
- targeted current command palette helper tests;
- targeted CommandPalette tests;
- lint;
- build;
- `git diff --check`;
- whitespace scan for touched docs and files.

### R3A Conclusions

- The first runtime role-language migration is complete without route, permission, or behavior
  changes.
- Team Access is now the visible label for the existing guarded team/member management surface.
- Remaining role-native wording work should stay narrow and context-specific until live shell
  profile consumption exists.

## Shell Resolution Phase R3B Owner Setup And Settings Label Alignment

Phase R3B implements the next safe runtime role-language migration for owner/admin setup and
settings surfaces.

Runtime files updated:

- `src/lib/navigation/currentNavigationRegistry.js`;
- `src/lib/commandPalette/currentCommandRegistry.js`;
- `src/pages/Settings.jsx`;
- `src/pages/admin/OwnerSetup.jsx`;
- `src/features/dashboard/DashboardPage.jsx`.

Focused tests updated:

- `src/lib/navigation/__tests__/currentNavigationRegistry.test.js`;
- `src/lib/commandPalette/__tests__/currentCommandPaletteCommands.test.js`;
- `src/components/nav/__tests__/CommandPalette.test.jsx`;
- `src/pages/admin/__tests__/OwnerSetup.test.jsx`;
- `src/features/dashboard/__tests__/OwnerSetupDashboardPrompt.test.jsx`.

R3B changes only visible setup/settings wording:

- `Open Settings` command copy is now `Open Account Settings`;
- `Notification Settings` command copy is now `Open Notification Settings`;
- the `/settings` page heading is now `Account Settings`;
- Owner Setup guidance now emphasizes company setup and operational readiness;
- generic Owner Setup card labels now use `Company Setup`, `Operational Setup`, `Workspace
  Defaults`, `Workflow Settings`, `Team Access`, `Company Notification Settings`, and
  `Operational Readiness Checklist`;
- the dashboard setup prompt now says `Owner Setup Guidance`, `Review operational setup readiness`,
  and `Review Owner Setup`.

R3B preserves:

- `/settings`, `/settings/notifications`, `/settings/owner-setup`, and `/users` route paths;
- `settings`, `settings.notifications`, `settings.ownerSetup`, and `users` internal ids;
- `settings.view`, `navigation.settings.view`, `notifications.preferences.manage_own`,
  `users.read`, and `navigation.users.view` permission keys;
- settings utility link order and mobile nav placement;
- command availability, command ids, command ordering, keyboard hints, filtering, and order-search
  fallback;
- Owner Setup's advisory/read-only setup context behavior and narrow guarded company-profile save
  path;
- backend, Supabase, query, workflow, RLS/RPC, and production data behavior.

R3B deliberately does not change:

- Dashboard labels outside the existing Owner Setup prompt;
- Orders labels;
- Assignments labels;
- shell-level workbench headings;
- `My Work` or `Review Queue` live headings;
- assignment packet terminology;
- route paths or route guards;
- permissions;
- DashboardGate behavior;
- shell switching or profile-aware runtime logic;
- Client Portal labels or implementation.

### R3B Validation

R3B validation should include:

- targeted current navigation registry tests;
- targeted current command palette helper tests;
- targeted CommandPalette tests;
- targeted Owner Setup tests;
- targeted Owner Setup dashboard prompt tests;
- lint;
- build;
- `git diff --check`;
- whitespace scan for touched docs and files.

### R3B Conclusions

- Owner/admin setup language is clearer without changing authority or route structure.
- Personal settings are now framed as Account Settings where the surface is personal rather than
  operational setup.
- Owner Setup remains advisory and settings-gated, with no shell-profile runtime dependency.
- Remaining role-native wording work should stay context-specific until live shell-profile
  consumption exists.

## Recommended Next Slice

Proceed with **Falcon Role-Centric Operational Shell Architecture Phase R3C: Assignment Recipient
Copy Audit And Packet Density Reduction**.

R3C should reduce recipient-facing `packet` density only where the surface is clearly received-work
or assigned-company facing. It should not globally rename `Assignments`, remove internal packet
precision, change owner/admin assignment-scope language, change assignment detail authority, alter
routes, change permissions, wire shell profiles into UI, change backend/Supabase/query/workflow
behavior, add shell switching, or implement Client Portal.

## Shell Resolution Phase R3C Assignment Recipient Copy Audit And Packet Density Reduction

Phase R3C implements the next safe runtime role-language migration for assignment-recipient and
vendor-facing received-work surfaces.

Runtime files updated:

- `src/features/assignments/AssignmentsPage.jsx`;
- `src/features/assignments/AssignedAssignmentInbox.jsx`;
- `src/features/assignments/AssignedOfferPacket.jsx`;
- `src/features/assignments/AssignedWorkPacket.jsx`;
- `src/features/assignments/AssignmentDetail.jsx`;
- `src/features/assignments/AssignmentPrimitives.jsx`;
- `src/features/assignments/components/AssignedWorkDashboard.jsx`;
- `src/features/dashboard/AssignmentDashboardPage.jsx`.

Focused tests updated:

- `src/features/assignments/__tests__/AssignmentsPage.test.jsx`;
- `src/features/assignments/__tests__/AssignmentPacketPresentation.test.jsx`.

R3C changes only recipient-facing assignment wording:

- received-work lane region copy now uses `Received Work`, `Work requests assigned to your
  company`, `Work Request`, `Open work request`, and `received work`;
- assigned-only workspace context now says `Assignment-scoped` and `Open received work only`;
- assigned offer detail now uses `Work Request`, `Work Request Actions`, and `Work Request
  Details`;
- assigned active-work detail now uses `Active Work`, `Assignment Actions`, and `Assignment
  Details`;
- assignment recipient dashboard rows now use `Open Assignment` and `Received assignment work`;
- generic assignment loading/denied/error support copy avoids unnecessary `packet` wording while
  preserving assignment-scoped safety language.

R3C intentionally preserves `packet` language where it protects assignment-scope clarity:

- internal file, component, loader, API, variable, and test names;
- owner/admin sent-assignment management and order assignment panels;
- owner assignment detail copy such as `Owner Packet`, `Packet Actions`, and `Packet Context`;
- owner-side links such as `Open assignment packet`;
- route ids, route paths, permission keys, and assignment packet resolution diagnostics;
- architecture, safety, and developer-facing wording that explains packet-scoped isolation.

R3C preserves:

- `/assignments` and `/assignments/:assignmentId` route paths;
- assignment route ids and internal component names;
- assignment read permissions and guards;
- assignment list/detail API calls and packet resolution order;
- assignment lifecycle actions;
- dashboard assignment data sources;
- command and navigation structure/order;
- backend, Supabase, query, workflow, RLS/RPC, and production data behavior.

R3C deliberately does not change:

- global `Assignments` navigation or command labels;
- Dashboard, Orders, My Work, Review Queue, or shell-level workbench headings;
- owner/admin assignment-scope packet language;
- route paths or route guards;
- permissions;
- DashboardGate behavior;
- shell switching or profile-aware runtime logic;
- Client Portal labels or implementation.

### R3C Validation

R3C validation should include:

- targeted AssignmentsPage tests;
- targeted assignment packet presentation tests;
- targeted assignment API tests where practical;
- lint;
- build;
- `git diff --check`;
- whitespace scan for touched docs and files.

### R3C Conclusions

- Assignment-recipient surfaces now lead with received-work, work-request, offer, active-work, and
  assignment language.
- Packet terminology remains intact where it is internal, owner/admin-facing, or needed to explain
  scoped assignment visibility.
- R3C remains copy-only and does not introduce shell-profile consumption.

## Recommended Next Slice

Proceed with **Falcon Role-Centric Operational Shell Architecture Phase R4: Passive Shell Profile
Exposure**.

R4 should expose resolved shell profile information at runtime as presentation-only metadata. It
should not change navigation, dashboard/workbench rendering, command ordering, route behavior,
permissions, backend/Supabase/query/workflow behavior, shell switching, or Client Portal
implementation.

## Shell Resolution Phase R4 Passive Shell Profile Exposure

Phase R4 implements the first runtime observation surface for shell profile resolution.

Runtime files added:

- `src/lib/shell/shellProfileExposure.js`;
- `src/lib/shell/useShellProfile.js`.

Focused tests added:

- `src/lib/shell/__tests__/shellProfileExposure.test.js`;
- `src/lib/shell/__tests__/useShellProfile.test.jsx`.

R4 adds:

- `buildShellProfileInput(...)`, a pure adapter that maps already available app context and
  permission state into the R1 resolver input shape;
- `resolveShellProfileExposure(...)`, a pure read-only exposure wrapper that returns profile id,
  shell metadata, resolution reason, resolver output, capabilities, and
  `metadataAuthority: presentation_only`;
- `getShellProfileExposure(...)`, a convenience pure helper for diagnostics and tests;
- `useShellProfile(...)`, a passive hook that observes existing session, current user app context,
  and effective permission hooks and returns the same presentation-only exposure plus loading/error
  state.

R4 intentionally does not connect the hook or exposure helper to live navigation, routes,
DashboardGate, dashboard/workbench headings, command palette ordering, permissions, object
visibility, workflow behavior, shell switching, product-mode authority, or Client Portal
implementation.

R4 input boundaries:

- session/auth state is observed only from the existing session hook;
- current company, active membership, role labels, and role responsibility flags are observed only
  from the existing current-user app context hook;
- permission keys are observed only from the existing effective permissions hook;
- no new backend, Supabase, query, workflow, or RPC behavior is introduced.

R4 fallback behavior remains non-leaky:

- missing authentication resolves to `unavailable`;
- missing current company resolves to `company_required`;
- inactive current-company membership resolves to `membership_inactive`;
- explicit ambiguity continues to resolve to `profile_ambiguous`;
- explicitly unavailable future modules continue to resolve to `module_unavailable`.

R4 preserves:

- all route paths and route ids;
- all permission keys and route guards;
- DashboardGate decision behavior;
- primary navigation, mobile navigation, settings utility navigation, and command palette order;
- dashboard/workbench headings and rendered dashboard components;
- assignment packet resolution, lifecycle actions, and object visibility;
- backend, Supabase, query, workflow, RLS/RPC, product-mode authority, and production data behavior.

### R4 Validation

R4 validation should include:

- targeted resolver tests;
- targeted shell metadata tests;
- targeted shell profile exposure tests;
- targeted `useShellProfile` hook tests;
- lint;
- build;
- `git diff --check`;
- whitespace scan for touched docs and files.

### R4 Conclusions

- Falcon can now observe a user's resolved shell profile at runtime without acting on it.
- The exposure mechanism is presentation-only and read-only.
- No live shell-aware navigation, route, DashboardGate, command palette, permission, workflow, or
  Client Portal behavior has been introduced.

## Recommended Next Slice

Proceed with **Falcon Role-Centric Operational Shell Architecture Phase R5: DashboardGate
Presentation Readiness Plan**.

R5 should plan how `DashboardGate` can safely consume R4 shell profile exposure later for
presentation-only dashboard/workbench framing. It should not wire the hook, change `DashboardGate`,
change dashboard selection, alter route authority, change permissions, change dashboard data
loading, rewrite dashboards, add shell switching, or implement Client Portal.

## Shell Resolution Phase R5 DashboardGate Presentation Readiness Plan

Phase R5 plans the first safe relationship between passive shell profile exposure and dashboard
presentation. This phase is documentation and planning only.

R5 inspected:

- `src/features/dashboard/DashboardGate.jsx`;
- `src/lib/dashboard/currentDashboardResolution.js`;
- `src/features/dashboard/DashboardPage.jsx`;
- `src/features/dashboard/AssignmentDashboardPage.jsx`;
- `src/features/assignments/components/AssignedWorkDashboard.jsx`;
- `src/features/assignments/components/OwnerSentAssignmentsDashboard.jsx`;
- `src/pages/appraisers/AppraiserDashboard.jsx`;
- `src/pages/reviewers/ReviewerDashboard.jsx`;
- `src/features/dashboard/__tests__/DashboardGate.test.jsx`.

### Current DashboardGate Behavior

Current `DashboardGate` behavior remains permission-derived:

- it reads `useEffectivePermissions()`;
- it calls `resolveCurrentDashboard(...)` with loading, error, and permission keys;
- loading renders the assignment primitive loading state with `Loading dashboard...`;
- order-capable users render `DashboardPage`;
- assignment-capable users without order dashboard capability render `AssignmentDashboardPage`;
- users without either dashboard capability render the current dashboard-unavailable state.

Current precedence is important:

1. loading;
2. order dashboard;
3. assignment dashboard;
4. unavailable fallback.

Mixed order plus assignment users currently render the order dashboard. Assignment-only users render
the assignment dashboard. R5 does not propose changing that precedence.

### Current Dashboard Surfaces

`DashboardPage` is the current order-capable dashboard. It uses existing dashboard summary, company
setup, permission, calendar, order table, KPI, workload, and readiness surfaces. It renders:

- `Operations Dashboard`;
- role-aware subtitle copy for owner/admin, reviewer, or appraiser context;
- current company and `Work View` context chips;
- Calendar first;
- order worklist with `Active Worklist`, `My Review Work`, or `My Assignments`;
- status filtering over already loaded dashboard rows;
- secondary `Operational Support`, KPI, workload, and readiness surfaces.

`AssignmentDashboardPage` is the current assignment dashboard. It independently checks assignment
read permissions and renders assignment-native widgets:

- `AssignedWorkDashboard` for assigned-company received work;
- `OwnerSentAssignmentsDashboard` for owner-side sent assignments;
- no order dashboard fallback inside assignment widgets.

`AppraiserDashboard` and `ReviewerDashboard` currently wrap the shared `DashboardPage`; they are
not separate workbench components.

### DashboardGate And Shell Profile Relationship

Future `DashboardGate` consumption of shell profile exposure should be presentation-only.

Recommended rule:

- `DashboardGate` remains the dashboard selector.
- `resolveCurrentDashboard(...)` remains the current dashboard-selection helper.
- R4 shell profile exposure may be observed after or alongside current dashboard resolution.
- Shell metadata may be passed downward as optional presentation metadata only after the current
  dashboard state has already been selected.
- Shell metadata must not decide whether the user gets `DashboardPage`, `AssignmentDashboardPage`,
  or the unavailable fallback.

In practical terms, a later runtime slice may let `DashboardGate` pass a prop such as
`shellProfilePresentation` or `shellProfileMetadata` to the already selected dashboard component.
That prop may support wording decisions, but it must not contain route, permission, query,
workflow, component-selection, or object-visibility authority.

### Answers To R5 Questions

Should `DashboardGate` merely pass shell metadata downward later?

- Yes. The first runtime use should pass shell metadata downward only after current dashboard
  resolution has selected the dashboard surface. It should not branch on shell profile id.

Should `DashboardGate` remain the selector while shell profile only changes wording?

- Yes. `DashboardGate` should remain the selector until a separately approved shell-aware dashboard
  selection phase exists. Current permission-derived dashboard resolution remains safer than using
  profile metadata as authority.

Should appraiser/reviewer-specific dashboard headings wait until route/data behavior is clearer?

- Mostly yes. Minor contextual wording can be planned, but changing `Operations Dashboard` to
  `My Work` or `Review Queue` should wait until the product decides whether those are true
  workbench presentations or only labels over the shared order dashboard. The existing
  `My Review Work` and `My Assignments` section labels can inform later copy, but global heading
  changes should not outrun route/data behavior.

How does assignment-only dashboard preserve Received Work language without broad order context?

- Assignment-only users should continue to reach `AssignmentDashboardPage` through the current
  assignment dashboard branch.
- `AssignmentDashboardPage` may later receive shell metadata and use `Received Work` framing only
  for assigned-recipient context.
- Owner-side sent assignment widgets should preserve assignment-scope clarity and may continue to
  use sent-assignment or packet language where it prevents confusion with canonical order access.
- Assignment dashboard data should continue to come from assignment list helpers/RPC-backed
  contracts, not order dashboard summaries.

What exact first DashboardGate runtime slice would be safe?

- **R5A DashboardGate Passive Shell Metadata Prop**.

### Safe Future Presentation-Only Changes

A later runtime slice may safely use shell metadata for copy only, after current dashboard
resolution selects the surface:

- dashboard heading support copy;
- subheading/support paragraph wording;
- empty-state tone;
- unavailable-state message tone;
- context chip label such as `Work View`;
- role-native intro copy;
- assignment dashboard eyebrow/title/subtitle copy where assignment-only context is already
  selected by current dashboard resolution.

These changes must be covered by tests proving dashboard branch selection, route paths,
permissions, command behavior, and data hooks remain unchanged.

### Unsafe Changes That Must Wait

These changes must wait for a separately approved runtime phase:

- selecting a different dashboard component from shell profile id;
- replacing `DashboardGate` authority with shell profile resolution;
- changing route guards or `/dashboard` route behavior;
- redirecting users by shell profile;
- filtering or regrouping navigation by shell profile;
- changing command palette order, availability, search behavior, or fallback routes;
- changing dashboard queries, RPCs, data sources, or object visibility;
- changing workflow/action availability;
- introducing a shell switcher;
- introducing Client Portal dashboard behavior;
- activating product-mode/module authority.

### R5A Recommended Runtime Slice

The safest first DashboardGate runtime slice is **R5A DashboardGate Passive Shell Metadata Prop**.

Scope:

- import `useShellProfile()` in `DashboardGate`;
- call it only as a passive observer;
- preserve existing `resolveCurrentDashboard(...)` inputs and branch order;
- pass shell exposure metadata as an optional prop to the already selected dashboard component;
- do not change rendered copy yet except perhaps hidden/test-only diagnostics if needed;
- add tests proving order-capable, assignment-only, mixed, loading, and unavailable dashboard
  branches are unchanged when shell metadata is present.

R5A must not:

- branch on shell profile id;
- change `resolveCurrentDashboard(...)`;
- change route paths or route guards;
- change permission keys;
- change dashboard data hooks;
- change assignment or order queries;
- change dashboard headings;
- change navigation or commands;
- add shell switching;
- add Client Portal behavior.

R5A success criteria:

- `DashboardGate` branch snapshots are identical for current permission cases;
- shell metadata is available to selected dashboard components as inert presentation data;
- tests prove shell profile id does not grant dashboard access;
- static scans show no shell exposure imports in route authority, navigation, command palette, or
  backend/query/workflow surfaces.

### R5 Guardrails

R5 preserves:

- `/dashboard` route behavior;
- current `DashboardGate` branch selection;
- current order dashboard priority for mixed users;
- assignment-only dashboard isolation;
- current assignment dashboard widget data sources;
- current order dashboard data sources;
- route guards and permission checks;
- object visibility and assignment packet isolation;
- workflow/action availability;
- command palette and navigation behavior;
- backend, Supabase, query, workflow, RLS/RPC, product-mode authority, shell switching, Client
  Portal, and production data behavior.

### R5 Conclusions

- `DashboardGate` can eventually observe shell profile metadata, but it should not use shell
  profile metadata as dashboard authority.
- The first safe runtime use is passing passive metadata to already selected dashboard surfaces,
  with no visible copy change.
- Appraiser and reviewer dashboard headings should wait until the product separates shared
  dashboard wording from true `My Work` and `Review Queue` workbench behavior.
- Assignment-only users should continue to be protected by the current assignment dashboard branch
  and assignment-scoped data contracts.

## Shell Resolution Phase R5A DashboardGate Passive Shell Metadata Prop

Phase R5A implements the first passive runtime connection between shell profile exposure and
dashboard presentation.

Runtime files updated:

- `src/features/dashboard/DashboardGate.jsx`;
- `src/features/dashboard/DashboardPage.jsx`;
- `src/features/dashboard/AssignmentDashboardPage.jsx`.

Focused tests updated:

- `src/features/dashboard/__tests__/DashboardGate.test.jsx`.

R5A changes:

- `DashboardGate` now observes `useShellProfile()` as passive presentation metadata;
- `DashboardGate` preserves the existing `resolveCurrentDashboard(...)` call inputs: loading,
  error, and permission keys;
- `DashboardGate` preserves the existing branch order: loading, order dashboard, assignment
  dashboard, unavailable fallback;
- the already selected `DashboardPage` or `AssignmentDashboardPage` receives
  `shellProfilePresentation` as an optional prop;
- `DashboardPage` and `AssignmentDashboardPage` accept and ignore the optional prop.

R5A deliberately does not pass shell metadata to loading or unavailable fallback states. Those
states keep current copy and behavior until a separate fallback-language slice is approved.

R5A preserves:

- `/dashboard` route behavior;
- current `DashboardGate` branch selection;
- current order dashboard priority for mixed order/assignment users;
- assignment-only dashboard isolation;
- `resolveCurrentDashboard(...)` behavior;
- dashboard headings, subtitles, empty states, support copy, and contextual labels;
- dashboard data hooks, queries, RPCs, summaries, assignment widgets, and object visibility;
- route guards and permission keys;
- workflow/action availability;
- navigation and command palette behavior;
- backend, Supabase, query, workflow, RLS/RPC, product-mode authority, shell switching, Client
  Portal, branding, and production data behavior.

R5A test coverage proves:

- loading behavior remains unchanged;
- owner/admin and order-capable users still render the existing order dashboard;
- assignment-only users still render the existing assignment dashboard;
- mixed order plus assignment users still prioritize the order dashboard;
- unavailable users still receive the existing fallback state;
- shell metadata is passed to the selected dashboard component as inert presentation data;
- mismatched shell profile ids do not select a different dashboard branch.

### R5A Conclusions

- `DashboardGate` can now pass shell profile exposure to selected dashboard components without
  using that exposure as authority.
- Shell profile metadata remains presentation-only and inert.
- The dashboard components do not read the metadata yet, so no visible copy or data behavior
  changes.
- Appraiser, reviewer, assignment-recipient, and fallback copy changes still require separate
  presentation-only slices.

## Shell Resolution Phase R6A Assignment Dashboard Received Work Presentation

Phase R6A implements the first visible shell-aware dashboard presentation change in the safest
isolated dashboard surface: the assignment dashboard branch that is already selected by
permission-derived `DashboardGate` behavior.

Runtime files updated:

- `src/features/dashboard/AssignmentDashboardPage.jsx`.

Focused tests added:

- `src/features/dashboard/__tests__/AssignmentDashboardPage.test.jsx`.

R6A changes:

- `AssignmentDashboardPage` now derives presentation copy from `shellProfilePresentation` only
  when the passive shell profile is `received_work`;
- the received-work shell heading is `Received Work`;
- received-work support copy focuses on work requests assigned to the user's company, due dates,
  assignment status, and owner review after submission;
- received-work dashboard copy avoids universal `packet` terminology;
- non-`received_work` assignment dashboard contexts keep the existing `Assignment Dashboard`
  heading and generic assignment support copy.

R6A preserves:

- `DashboardGate` branch selection and branch order;
- `resolveCurrentDashboard(...)` inputs and behavior;
- `/dashboard`, `/assignments`, and assignment detail route paths;
- route guards and permission keys;
- assignment-only dashboard isolation;
- assignment dashboard loading, unavailable, assigned-work widget, and owner-sent widget behavior;
- assignment list/detail APIs, packet resolution, lifecycle actions, and object visibility;
- order-capable dashboard headings, copy, data hooks, and rendering behavior;
- navigation and command palette behavior;
- backend, Supabase, query, workflow, RLS/RPC, product-mode authority, shell switching, Client
  Portal, branding, and production data behavior.

R6A test coverage proves:

- the `received_work` shell renders `Received Work` dashboard copy;
- received-work dashboard support copy avoids `packet` wording;
- non-received assignment contexts retain the existing generic assignment dashboard frame;
- assigned and owner assignment widgets still render from the same permission checks;
- assignment dashboard loading behavior is unchanged;
- `DashboardGate` tests still prove assignment-only and order-capable dashboard selection remains
  permission-derived and unchanged.

### R6A Conclusions

- Falcon now has its first visible shell-aware dashboard wording change.
- The change is limited to assignment dashboard presentation after the existing assignment
  dashboard branch has already been selected.
- Shell metadata still does not grant dashboard access, choose dashboard components, alter
  permissions, change queries, or change assignment workflows.

## Shell Resolution Phase R6B Owner/Admin Operations Dashboard Presentation

Phase R6B applies shell-aware presentation copy to the owner/admin order-capable dashboard while
preserving the current dashboard selection, data loading, permission, navigation, and workflow
behavior.

Runtime files updated:

- `src/features/dashboard/DashboardPage.jsx`.

Focused tests updated:

- `src/features/dashboard/__tests__/DashboardPage.test.jsx`.

R6B changes:

- `DashboardPage` now derives presentation copy from `shellProfilePresentation` only when the
  passive shell profile is `operations`;
- the operations shell keeps the `Operations Dashboard` heading;
- operations support copy now says `Track active work, review handoffs, due pressure, and
  operational readiness.`;
- non-`operations` dashboard contexts keep the existing role-derived support copy;
- setup/readiness remains secondary inside the existing operational support area.

R6B preserves:

- `DashboardGate` branch selection and branch order;
- `resolveCurrentDashboard(...)` inputs and behavior;
- `/dashboard`, `/orders`, `/calendar`, `/clients`, `/assignments`, `/users`, and settings route
  paths;
- route guards and permission keys;
- dashboard summary loading, table filters, status filters, calendar panel, order table, KPI cards,
  workload visibility, owner setup prompt, and operational readiness behavior;
- assignment dashboard presentation and data behavior;
- navigation and command palette behavior;
- backend, Supabase, query, workflow, RLS/RPC, product-mode authority, shell switching, Client
  Portal, branding, and production data behavior.

R6B test coverage proves:

- the `operations` shell renders owner/admin-native operations support copy;
- non-operations dashboard contexts retain the previous role-derived support copy;
- existing dashboard sections, widgets, links, filtering, table props, and readiness surfaces still
  render from the same data and permission checks;
- `DashboardGate` tests still prove assignment-only, order-capable, mixed, loading, and fallback
  dashboard selection remains permission-derived and unchanged;
- `AssignmentDashboardPage` tests still prove the R6A received-work presentation remains isolated.

### R6B Conclusions

- Falcon now has shell-aware presentation copy in both currently selected dashboard surfaces:
  owner/admin operations and assignment-recipient received work.
- The operations change is limited to heading/support presentation after the existing order-capable
  dashboard branch has already been selected.
- Shell metadata still does not grant dashboard access, choose dashboard components, alter
  permissions, change queries, or change workflow behavior.

## Shell Resolution Phase R6C Appraiser And Reviewer Workbench Presentation Plan

Phase R6C plans the safest appraiser and reviewer dashboard/workbench presentation migration before
any runtime copy, layout, route, permission, data, navigation, command palette, shell-switching, or
Client Portal changes.

This phase is documentation and planning only.

### R6C Sources Inspected

R6C inspected:

- `src/features/dashboard/DashboardPage.jsx`;
- `src/features/dashboard/__tests__/DashboardPage.test.jsx`;
- `src/features/dashboard/DashboardGate.jsx`;
- `src/lib/dashboard/currentDashboardResolution.js`;
- `src/lib/shell/shellProfiles.js`;
- `src/lib/shell/resolveShellProfile.js`;
- `src/pages/appraisers/AppraiserDashboard.jsx`;
- `src/pages/reviewers/ReviewerDashboard.jsx`.

### Current Appraiser And Reviewer Dashboard Reality

Current appraiser and reviewer presentation still runs through the shared order-capable dashboard
surface:

- `AppraiserDashboard` renders `DashboardPage`;
- `ReviewerDashboard` renders `DashboardPage`;
- `DashboardGate` still selects `DashboardPage` for order-capable users and
  `AssignmentDashboardPage` for assignment-only users from permission-derived dashboard resolution;
- `DashboardPage` accepts `shellProfilePresentation` as optional presentation metadata;
- `DashboardPage` currently reads the passive shell profile only for the `operations` presentation
  branch;
- non-operations order-capable contexts retain the existing role-derived support copy;
- reviewer support copy remains `Calendar context and review work assigned to your queue.`;
- appraiser support copy remains `Calendar context, assigned orders, and revision follow-up.`;
- the current worklist section already has role-aware labels: `Active Worklist`,
  `My Review Work`, or `My Assignments`.

The shared `DashboardPage` still includes broader order-capable dashboard structure:

- calendar context;
- status timeline filters;
- order table behavior through `UnifiedOrdersTable`;
- KPI cards;
- workload and operational support surfaces;
- owner setup and readiness surfaces where existing permissions and context allow.

Because the page remains a shared dashboard, appraiser and reviewer workbench wording must not
imply that Falcon has already shipped dedicated `My Work` or `Review Queue` workbench components.

### R6C Presentation Rules

For `operations`:

- keep R6B behavior;
- `Operations Dashboard` remains the heading for owner/admin operations presentation;
- owner/admin operations support copy may stay shell-aware;
- owner/admin plus appraiser/reviewer users continue to default to operations presentation.

For `my_work`:

- do not change the shared `DashboardPage` heading to `My Work` yet;
- do not imply that the full dashboard is a dedicated appraiser workbench while the page still
  includes broader order-capable dashboard surfaces;
- future low-risk presentation can start with support-copy-only or section-label-only refinements
  after focused tests prove no dashboard branch, data, or widget behavior changed;
- empty-state wording may be considered later only where it is tied to existing assigned-work rows
  or filters and does not imply hidden records.

For `review_queue`:

- do not change the shared `DashboardPage` heading to `Review Queue` yet;
- do not imply that the full dashboard is a dedicated review workbench while the page still
  includes broader order-capable dashboard surfaces;
- future low-risk presentation can start with support-copy-only or section-label-only refinements
  after focused tests prove no dashboard branch, data, or widget behavior changed;
- empty-state wording may be considered later only where it is tied to existing review rows or
  filters and does not imply hidden records.

### R6C Answers

Is it safe to show `My Work` heading inside `DashboardPage` for appraiser-only users now?

- No. The heading would overpromise because the current page is still the shared order-capable
  dashboard with calendar, order table, KPI, workload, and support surfaces. `My Work` should wait
  for a dedicated workbench boundary or a stronger shared-dashboard framing decision.

Is it safe to show `Review Queue` heading inside `DashboardPage` for reviewer-only users now?

- No. The heading would overpromise because the current page is still the shared order-capable
  dashboard, not a dedicated review-decision workbench. `Review Queue` should wait for a dedicated
  workbench boundary or a stronger shared-dashboard framing decision.

Would those labels overpromise if `DashboardPage` still includes broader operational sections?

- Yes. They would imply a narrower workbench than the page currently provides.

Should Falcon first add passive tests/fixtures for `DashboardPage` shell presentations?

- Yes. The next safe runtime slice should add passive test coverage for `my_work` and
  `review_queue` shell metadata in the shared `DashboardPage`, proving current heading, support
  copy, section labels, table props, widgets, filters, and readiness surfaces remain unchanged
  until a copy slice is explicitly approved.

Should appraiser/reviewer workbench presentation wait until a dedicated workbench component exists?

- Heading-level presentation should wait. Support-copy-only, section-label-only, or scoped
  empty-state refinements may be safe sooner, but only after passive tests and with explicit proof
  that dashboard selection, route behavior, permissions, data hooks, widgets, and navigation remain
  unchanged.

### Hybrid Behavior

Hybrid behavior should continue to follow the R1 resolver and current dashboard authority:

- owner/admin plus appraiser or reviewer responsibility defaults to `operations`;
- owner/admin users may later enter `My Work` or `Review Queue` through a presentation-only shell
  switcher, but no shell switcher exists in R6C;
- appraiser plus reviewer users default deterministically to `my_work` unless
  `reviewWorkWaiting` is explicitly true, in which case the resolver may select `review_queue`;
- future alternate views must remain presentation-only and must not grant route, permission,
  object, query, workflow, or action authority.

### What Should Not Change Yet

R6C does not recommend changing:

- `DashboardGate` branch selection;
- `resolveCurrentDashboard(...)`;
- dashboard route behavior;
- route paths or route guards;
- permission keys or permission checks;
- dashboard data hooks, queries, RPCs, table props, filters, widgets, or object visibility;
- Orders table behavior;
- KPI, workload, operational support, owner setup, or readiness behavior;
- Calendar panel behavior;
- navigation labels;
- command palette labels, ordering, availability, or fallback behavior;
- shell switching;
- Client Portal labels or implementation.

### R6C Recommended Runtime Slice

The safest next runtime slice is **R6D DashboardPage Appraiser/Reviewer Passive Presentation
Tests**.

R6D scope:

- add or extend focused `DashboardPage` tests for `my_work` and `review_queue`
  `shellProfilePresentation` fixtures;
- prove the shared `DashboardPage` still renders the current heading and existing role-derived
  support copy for appraiser and reviewer contexts;
- prove existing role-aware section labels, table props, widgets, filters, links, calendar panel,
  workload, and readiness surfaces still render from the same data and permission checks;
- do not change visible copy.

R6D must not:

- change dashboard headings;
- change appraiser/reviewer support copy;
- introduce dedicated workbench components;
- change `DashboardGate`, routes, permissions, queries, navigation, commands, shell switching, or
  Client Portal behavior.

### R6C Conclusions

- `My Work` and `Review Queue` are correct future workbench frames, but they should not become the
  shared `DashboardPage` heading yet.
- The current shared dashboard can safely keep role-derived support copy and section labels while
  workbench boundaries are planned.
- Passive tests should come before appraiser/reviewer visible copy changes.
- Dedicated `My Work` and `Review Queue` workbench components remain the clearer path for heading
  changes.

## Shell Resolution Phase R6D DashboardPage Appraiser/Reviewer Passive Presentation Tests

Phase R6D adds passive test coverage for appraiser and reviewer shell presentation metadata on the
shared `DashboardPage`.

Runtime files changed:

- none.

Focused tests updated:

- `src/features/dashboard/__tests__/DashboardPage.test.jsx`.

R6D adds:

- a `my_work` shell presentation fixture with `dashboardTitle: "My Work"`;
- a `review_queue` shell presentation fixture with `dashboardTitle: "Review Queue"`;
- appraiser coverage proving `my_work` metadata does not change the shared `DashboardPage`
  heading to `My Work`;
- reviewer coverage proving `review_queue` metadata does not change the shared `DashboardPage`
  heading to `Review Queue`;
- assertions that the existing appraiser support copy remains `Calendar context, assigned orders,
  and revision follow-up.`;
- assertions that the existing reviewer support copy remains `Calendar context and review work
  assigned to your queue.`;
- assertions that existing appraiser/reviewer role labels and worklist labels remain visible;
- assertions that dashboard calendar and order table props still come from the same summary data
  and role-derived table modes;
- continued coverage that R6B `operations` shell presentation still renders owner/admin-native
  support copy.

R6D intentionally keeps appraiser and reviewer copy deferred:

- `My Work` is not used as the shared `DashboardPage` heading;
- `Review Queue` is not used as the shared `DashboardPage` heading;
- no visible dashboard copy changes are introduced.

R6D preserves:

- `DashboardGate` branch selection and branch order;
- `resolveCurrentDashboard(...)` inputs and behavior;
- all route paths and route guards;
- all permission keys and permission checks;
- dashboard data hooks, queries, RPCs, widgets, filters, table props, links, and object visibility;
- Orders table behavior;
- KPI, workload, operational support, owner setup, and readiness behavior;
- Calendar panel behavior;
- navigation and command palette behavior;
- backend, Supabase, query, workflow, RLS/RPC, product-mode authority, shell switching, Client
  Portal, branding, and production data behavior.

R6D test coverage proves:

- `operations` shell presentation from R6B still works;
- `my_work` shell metadata remains passive in the shared `DashboardPage`;
- `review_queue` shell metadata remains passive in the shared `DashboardPage`;
- appraiser and reviewer heading-level workbench presentation is still deferred;
- dashboard rendering behavior remains tied to existing role, permission, summary, table, and
  calendar inputs.

### R6D Conclusions

- Appraiser and reviewer shell metadata can be supplied to `DashboardPage` without changing visible
  copy.
- The shared dashboard still keeps `Operations Dashboard` as its heading for appraiser/reviewer
  contexts.
- Future visible appraiser/reviewer presentation should remain scoped and separately approved.

## Shell Resolution Phase R6E Appraiser/Reviewer Workbench Surface Plan

Phase R6E plans the first actual appraiser and reviewer workbench surface migration without
changing runtime behavior.

This phase is documentation and planning only.

### R6E Sources Inspected

R6E inspected:

- `src/features/dashboard/DashboardPage.jsx`;
- `src/features/dashboard/__tests__/DashboardPage.test.jsx`;
- `src/features/dashboard/DashboardGate.jsx`;
- `src/pages/orders/Orders.jsx`;
- `src/features/orders/UnifiedOrdersTable.jsx`;
- `src/components/dashboard/DashboardCalendarPanel.jsx`.

### Current Reusable Dashboard And Orders Surfaces

Current reusable frontend surfaces:

- `DashboardPage` already receives dashboard summary rows and renders calendar, status rail,
  worklist, KPI, workload, operational support, and readiness surfaces;
- `DashboardCalendarPanel` can render from supplied order rows and already accepts reviewer queue
  mode and reviewer id;
- `UnifiedOrdersTable` can render dashboard-scoped rows from `rowsOverride`;
- `UnifiedOrdersTable` already supports reviewer queue mode through `mode="reviewerQueue"` and
  `reviewerId`;
- appraiser contexts currently pass role-derived table behavior rather than a dedicated appraiser
  queue mode;
- Orders route filters already support status, appraiser id, reviewer id, due window, queue id,
  search, and saved-view-related filter state;
- workload cards already derive appraiser ownership, review ownership, unassigned active work, and
  revision follow-up from existing dashboard rows.

Current reusable data without new backend work:

- assigned order rows already present in dashboard summary where the existing dashboard summary
  provides them;
- review-stage rows already present in dashboard summary where the existing dashboard summary
  provides them;
- due and overdue counts already represented by dashboard summary and order row due dates;
- status counts for new, in progress, in review, needs revisions, and ready for client;
- existing appraiser/reviewer ownership summaries derived from current rows;
- existing Orders table filter routes for status, appraiser, reviewer, due, and queue context;
- current calendar context from already loaded order rows.

### Appraiser-First Workbench Ideal

An appraiser workbench should answer:

- what assigned work do I need to move forward today?

Ideal appraiser-first sections:

- assigned orders needing action;
- needs revisions;
- due soon and overdue assigned work;
- appointment and site visit context;
- report-progress status;
- files needed for the order;
- notes and activity relevant to assigned orders;
- submit to review and resubmit to review actions where governed workflow allows.

Safe reuse from current surfaces:

- an assigned-work panel can reuse current dashboard rows and `UnifiedOrdersTable` with
  role-derived appraiser behavior;
- needs-revisions and due/overdue panels can reuse current status/due fields and existing Orders
  filter links;
- appointment/site visit context can reuse `DashboardCalendarPanel` when the needed dates are
  present on loaded order rows;
- summary counts can reuse status counts and workload-derived revision ownership.

Needs later data or workflow support:

- reliable per-user assigned-order query contracts if dashboard rows are not already scoped enough;
- explicit revision request detail, latest reviewer note, and revision-loop history;
- file checklist and document availability by assigned order;
- notes/activity surfaces scoped to assigned orders;
- report-progress state if it is separate from order status;
- governed submit/resubmit workflow action availability and action-result state inside a workbench;
- mobile-safe upload/note/submit flows.

### Reviewer-First Workbench Ideal

A reviewer workbench should answer:

- what review decisions do I need to make next?

Ideal reviewer-first sections:

- assigned review queue;
- resubmitted work waiting for review;
- overdue and due-soon review items;
- repeat revision loops;
- submitted report/files context;
- review notes and revision history;
- clear review, ready-for-client, and request-revisions actions where governed workflow allows.

Safe reuse from current surfaces:

- a review queue panel can reuse current dashboard rows and `UnifiedOrdersTable` reviewer queue
  mode;
- due pressure can reuse existing due dates and status counts where review due dates are present;
- calendar context can reuse `DashboardCalendarPanel` reviewer queue mode;
- review ownership can reuse current workload-derived reviewer summaries;
- Orders filter links can reuse status and reviewer query parameters.

Needs later data or workflow support:

- explicit reviewer assignment query if dashboard summary rows are not enough;
- resubmission state separate from general `in_review` status;
- latest appraiser submission timestamp and report/file readiness;
- revision-loop count and prior revision notes;
- document/report preview readiness and safe file access;
- governed request-revisions, clear-review, and ready-for-client action availability inside the
  workbench;
- audit-safe review note creation and display.

### Surface Shape Decision

R6E does not recommend renaming the shared `DashboardPage` into `My Work` or `Review Queue`.

Recommended surface shape:

1. Keep `DashboardGate` and dashboard branch selection unchanged.
2. Keep shared `DashboardPage` as the order-capable dashboard for now.
3. Introduce passive, unmounted component boundaries first:
   - `AppraiserWorkDashboard` or `MyWorkDashboard`;
   - `ReviewerWorkbenchDashboard` or `ReviewWorkbenchDashboard`.
4. Build those components around existing props and existing data shapes before wiring them into
   `DashboardPage`.
5. Add tests that prove the components can render from supplied rows without new queries.
6. Only after component boundaries are proven, decide whether to mount them as scoped panels inside
   `DashboardPage` or as selected dashboard presentation components in a later approved slice.

Rejected or deferred surface shapes:

- heading-only change inside shared `DashboardPage`: rejected for now because it overpromises a
  dedicated workbench;
- section-label-only change as the first runtime slice: possible later, but less useful than
  proving workbench component boundaries first;
- route-level alternate views: deferred because route/path behavior should remain unchanged until
  workbench data and authority needs are clearer;
- shell switcher: deferred and presentation-only if ever introduced;
- backend-backed workbench queries: deferred until frontend component boundaries prove the exact
  missing data.

### Safest First Runtime Slice

The safest first appraiser/reviewer runtime slice is **R6F Passive Workbench Component Skeletons**.

R6F scope:

- add unmounted, presentational component skeletons for appraiser and reviewer workbench panels;
- accept plain props such as rows, loading, role labels, and callback placeholders;
- render no live dashboard copy changes because the components are not mounted in `DashboardPage`;
- add focused tests proving each skeleton can render from supplied existing dashboard rows;
- avoid new hooks, queries, route behavior, permission behavior, workflow actions, navigation, or
  command palette behavior.

R6F should not:

- change `DashboardPage` visible copy;
- mount the new workbench components in the live dashboard;
- change `DashboardGate`;
- change route paths or route guards;
- change permissions;
- add backend, Supabase, query, or workflow behavior;
- change Orders table, KPI/workload, or Calendar panel behavior;
- add shell switching;
- implement Client Portal behavior.

### R6E Conclusions

- Appraiser and reviewer workbench headings should still wait.
- The first real workbench migration should create tested component boundaries before visible
  dashboard copy changes.
- Existing dashboard rows, status counts, calendar rows, Orders table behavior, workload summaries,
  and Orders filter links are safe reusable inputs.
- Revision-loop details, files, notes, report readiness, and governed workflow actions need clearer
  query/workflow contracts before becoming workbench commitments.

## Recommended Next Slice

Proceed with **Falcon Role-Centric Operational Shell Architecture Phase R6F: Passive Workbench
Component Skeletons**.

R6F should add unmounted appraiser/reviewer workbench component skeletons and tests using existing
dashboard row props only. It should not mount them in live UI, change dashboard copy,
`DashboardGate` selection, routes, permissions, queries, workflow behavior, navigation, command
palette behavior, shell switching, or Client Portal implementation.

## Shell Resolution Phase R6F Passive Workbench Component Skeletons

Phase R6F adds the first passive appraiser and reviewer workbench component boundaries without
mounting them in live runtime UI.

Runtime files added:

- `src/features/dashboard/workbenches/AppraiserWorkbenchPreview.jsx`;
- `src/features/dashboard/workbenches/ReviewerWorkbenchPreview.jsx`.

Focused tests added:

- `src/features/dashboard/workbenches/__tests__/WorkbenchPreviews.test.jsx`.

R6F changes:

- `AppraiserWorkbenchPreview` renders a passive `My Work` preview from supplied order rows;
- `ReviewerWorkbenchPreview` renders a passive `Review Queue` preview from supplied order rows;
- both previews accept plain props only: `rows`, `loading`, and a role label
  (`appraiserLabel` or `reviewerLabel`);
- both previews derive summary counts from provided row fields and do not call hooks, fetch data,
  import router helpers, import permission helpers, import Supabase/API modules, or trigger
  workflow actions;
- both previews render role-native headings, support copy, section labels, and empty states;
- neither preview is imported by `DashboardPage`, `DashboardGate`, routes, navigation, command
  palette, data hooks, or workflow surfaces.

Appraiser preview sections:

- `Assigned Work`;
- `Needs Revisions`;
- `Due Soon`;
- `Site Visit / Calendar Context`;
- `Recent Notes / Files`.

Reviewer preview sections:

- `In Review`;
- `Resubmitted Work`;
- `Due Soon / Overdue Review`;
- `Revision Follow-Up`;
- `Review Notes / Files`.

R6F test coverage proves:

- appraiser-native `My Work` heading and support copy render from props;
- reviewer-native `Review Queue` heading and support copy render from props;
- role-native empty-state copy renders when no rows are supplied;
- preview components render no action buttons;
- static source scans reject imports or references to Supabase/API/router helpers, `DashboardGate`,
  `DashboardPage`, dashboard data hooks, permission hooks, or workflow action functions.

R6F preserves:

- `DashboardPage` rendering and visible copy;
- `DashboardGate` branch selection and branch order;
- `resolveCurrentDashboard(...)` inputs and behavior;
- all route paths and route guards;
- all permission keys and permission checks;
- dashboard data hooks, queries, RPCs, widgets, filters, table props, links, and object visibility;
- Orders table behavior;
- KPI, workload, operational support, owner setup, and readiness behavior;
- Calendar panel behavior;
- navigation and command palette behavior;
- backend, Supabase, query, workflow, RLS/RPC, product-mode authority, shell switching, Client
  Portal, branding, and production data behavior.

### R6F Conclusions

- Falcon now has tested passive component boundaries for future appraiser and reviewer workbench
  surfaces.
- The components prove initial shape and language without changing any live dashboard behavior.
- Existing dashboard/order rows are enough for first-pass summary sections, but files, notes,
  revision history, report readiness, and governed workflow actions remain deferred.
- The next step should plan when and how these passive boundaries could be mounted safely.

## Recommended Next Slice

Proceed with **Falcon Role-Centric Operational Shell Architecture Phase R6G: Workbench Mount
Readiness Plan**.

R6G should decide whether the passive appraiser/reviewer workbench previews should first mount as
scoped panels inside `DashboardPage`, remain unmounted until dedicated workbench selection exists,
or wait for stronger data contracts. It should not mount them, change dashboard copy,
`DashboardGate` selection, routes, permissions, queries, workflow behavior, navigation, command
palette behavior, shell switching, or Client Portal implementation.

## Shell Resolution Phase R6G Workbench Mount Readiness Plan

Phase R6G plans how the passive R6F appraiser and reviewer workbench previews may eventually mount
without changing live runtime behavior in this phase.

This phase is documentation and planning only.

### R6G Sources Inspected

R6G inspected:

- `src/features/dashboard/workbenches/AppraiserWorkbenchPreview.jsx`;
- `src/features/dashboard/workbenches/ReviewerWorkbenchPreview.jsx`;
- `src/features/dashboard/workbenches/__tests__/WorkbenchPreviews.test.jsx`;
- `src/features/dashboard/DashboardPage.jsx`.

### R6F Preview Contract

The R6F previews are mount candidates only because their contract is intentionally narrow:

- both components accept plain props only;
- appraiser props are `rows`, `loading`, and `appraiserLabel`;
- reviewer props are `rows`, `loading`, and `reviewerLabel`;
- both components derive counts from supplied order row fields;
- neither component fetches data, imports router helpers, imports Supabase/API modules, imports
  permission hooks, imports dashboard data hooks, imports `DashboardGate`, or triggers workflow
  actions;
- neither component renders action buttons;
- both components can render useful empty states from an empty `rows` array.

This contract is sufficient for a presentation-only mount fed by existing `DashboardPage` summary
state. It is not sufficient for real workflow action surfaces, file panels, note feeds, revision
history, report preview, or route-level workbench replacement.

### Current Dashboard Mount Context

Current `DashboardPage` already has these reusable inputs:

- `ordersRows` from the existing dashboard summary hook;
- `loading` from the existing dashboard summary state;
- `normalizedRole`;
- `isAdmin`;
- `isReviewer`;
- `roleLabel`;
- `shellProfilePresentation`;
- existing calendar, order table, status rail, KPI, workload, and readiness sections.

Current layout order:

1. shared dashboard header;
2. owner setup prompt where applicable;
3. calendar section;
4. order table plus status rail;
5. operational support section with KPIs, workload visibility, and owner/admin readiness;
6. dormant future review queue placeholder controlled by `cfg.showReviewQueue`, which is currently
   false for all configured roles.

The safest future mount point is a secondary role-specific support panel after the existing order
table/status rail and before the existing `Operational Support` section. This keeps the page
heading and main dashboard structure honest while giving appraiser/reviewer users a role-native
preview surface.

### Mount Strategies Considered

#### 1. Below Existing Dashboard As A Passive Preview Panel

This is the recommended eventual mount strategy.

Shape:

- render `AppraiserWorkbenchPreview` only for `my_work` profile users who are not owner/admin;
- render `ReviewerWorkbenchPreview` only for `review_queue` profile users who are not owner/admin;
- keep the shared `Operations Dashboard` heading unchanged;
- place the panel below the current table/status area and above `Operational Support`;
- pass existing dashboard summary props only;
- do not add actions, links, queries, filters, route changes, or workflow behavior.

Reasoning:

- it avoids claiming the whole shared dashboard is already a dedicated workbench;
- it lets the workbench language appear in a clearly scoped section;
- it is reversible and testable;
- it uses only already-loaded dashboard rows.

#### 2. Replace Limited Support Copy Only

This is safe but not very useful as the next mount step.

Reasoning:

- R6B already proved shell-aware support copy can be isolated;
- appraiser/reviewer support copy changes alone would not establish the workbench surface shape;
- copy-only changes risk making the dashboard sound more workbench-like without giving users a
  real role-specific panel.

Recommendation:

- do not make support-copy-only changes before the secondary panel decision.

#### 3. Mount Only In Dev/Test/Staging

This is useful for visual QA only if Falcon has a formal preview harness.

Reasoning:

- the components are already test-rendered in R6F;
- adding environment-only live branches can create behavior that differs from production;
- without Storybook or an equivalent preview surface, dev-only mounting adds complexity without
  product value.

Recommendation:

- do not add environment-only mounting inside `DashboardPage`;
- if a preview harness is introduced later, keep it outside live dashboard routing.

#### 4. Wait For Dedicated Dashboard Branch Or Component

This remains the right direction for heading-level workbench replacement.

Reasoning:

- replacing `DashboardPage` with dedicated `My Work` or `Review Queue` components would require
  a clearer dashboard-selection phase;
- that phase must decide how `DashboardGate` selects presentation components without using shell
  profile metadata as permission authority;
- it may also need stronger data contracts for revision loops, files, notes, and workflow action
  availability.

Recommendation:

- wait for dedicated branches before changing page headings or dashboard component selection.

#### 5. Mount As Secondary Role-Specific Support Section

This is the recommended first live mount pattern.

Reasoning:

- it uses the R6F components as scoped support surfaces, not as page-level replacements;
- it can be gated by passive shell metadata and existing role/admin state;
- it does not change dashboard authority, routes, nav, commands, or queries;
- it gives the product a small live surface to evaluate appraiser/reviewer workbench language.

### Required Conditions Before Mounting

A future runtime mount must satisfy all of these conditions:

- `DashboardGate` must still select `DashboardPage` through existing permission-derived logic;
- `DashboardPage` must receive passive `shellProfilePresentation` metadata as it does today;
- the selected profile must be `my_work` or `review_queue`;
- owner/admin hybrids must not see the secondary appraiser/reviewer panel by default because they
  resolve to `operations`;
- `isAdmin` must be false for the mount;
- `ordersRows` must be passed exactly from existing dashboard summary state;
- `loading` must be passed exactly from existing dashboard summary state;
- no new query, hook, Supabase, API, or RPC dependency may be added;
- no table filters, status filters, calendar rows, KPI values, workload summaries, or readiness
  items may change;
- no action button may be introduced;
- empty states must state that no rows are represented, not that hidden records do not exist;
- tests must prove branch selection, dashboard heading, existing support copy, table props, and
  calendar props remain unchanged.

### Props For A Later Mount

If mounted later, `DashboardPage` should pass only these props:

For appraiser profile:

```jsx
<AppraiserWorkbenchPreview
  rows={ordersRows || []}
  loading={loading}
  appraiserLabel={roleLabel}
/>
```

For reviewer profile:

```jsx
<ReviewerWorkbenchPreview
  rows={ordersRows || []}
  loading={loading}
  reviewerLabel={roleLabel}
/>
```

Do not pass callbacks, route helpers, permission state, workflow action handlers, filter setters,
Supabase clients, query clients, or navigation functions.

### Blocked Changes

R6G keeps these changes blocked:

- replacing the shared `DashboardPage` heading with `My Work` or `Review Queue`;
- selecting a dashboard component from shell profile id;
- changing `DashboardGate` branch selection or branch order;
- changing `resolveCurrentDashboard(...)`;
- changing route paths or route guards;
- changing permission keys or permission checks;
- changing dashboard queries, RPCs, hooks, table filters, status filters, or calendar inputs;
- changing navigation or command palette labels/order;
- adding workflow buttons for submit, resubmit, request revisions, clear review, or ready for
  client;
- adding file, note, report-preview, revision-history, or activity feeds without explicit data
  contracts;
- creating new routes;
- adding shell switching;
- implementing Client Portal behavior.

### R6G Answers

Should the previews mount as secondary panels inside `DashboardPage` for appraiser/reviewer
profiles?

- Yes, eventually, but only as secondary scoped panels and only after a runtime slice adds tests
  proving the existing dashboard behavior is unchanged.

Should they remain unmounted until data/query support is stronger?

- They should remain unmounted for primary workbench replacement, workflow actions, files, notes,
  revision history, and report context. They do not need stronger data/query support for a small
  secondary summary panel fed by existing dashboard rows.

Should they be used only in tests/storybook-like preview first?

- They are already covered by tests. A Storybook-like preview would be useful but should be
  separate from live dashboard routing and should not block a later secondary-panel mount.

Should appraiser/reviewer live dashboard copy start with a small scoped section label instead of
page heading?

- Yes. The first visible runtime mount should introduce a scoped section, not change the page
  heading.

What exact props should `DashboardPage` pass if mounted later?

- `rows={ordersRows || []}`;
- `loading={loading}`;
- `appraiserLabel={roleLabel}` for `my_work`;
- `reviewerLabel={roleLabel}` for `review_queue`.

### Safest First Runtime Mount Slice

The safest first runtime mount slice is **R6H DashboardPage Secondary Workbench Preview Mount**.

R6H scope:

- import the two R6F preview components into `DashboardPage`;
- derive the passive profile id from `shellProfilePresentation`;
- render `AppraiserWorkbenchPreview` only when profile id is `my_work` and `isAdmin` is false;
- render `ReviewerWorkbenchPreview` only when profile id is `review_queue` and `isAdmin` is false;
- mount the selected preview after the existing table/status area and before `Operational
  Support`;
- pass only `rows`, `loading`, and role label props;
- add focused tests proving headings/support copy for the secondary panel render only in the
  intended profile cases;
- add regression tests proving the shared dashboard heading remains `Operations Dashboard`, current
  appraiser/reviewer support copy remains unchanged unless separately approved, dashboard branch
  selection remains permission-derived, and table/calendar props still come from the same summary
  rows.

R6H must not:

- change `DashboardGate`;
- change `resolveCurrentDashboard(...)`;
- change dashboard heading or top support copy;
- add routes, nav, commands, shell switching, or Client Portal behavior;
- add queries, hooks, Supabase/API imports, RPCs, workflow actions, links, buttons, or callbacks;
- change table filters, status filters, KPI, workload, calendar, setup, or readiness behavior.

### R6G Conclusions

- The previews are ready for a limited secondary-panel mount, not a page-level workbench
  replacement.
- Appraiser/reviewer page headings should remain unchanged until dedicated dashboard selection or
  stronger workbench data contracts exist.
- Existing dashboard rows are sufficient for a scoped summary panel, but not for workflow actions,
  files, notes, report context, or revision history commitments.
- The next safe runtime slice is R6H, a tightly gated secondary workbench preview mount inside the
  existing `DashboardPage`.

## Recommended Next Slice

Proceed with **Falcon Role-Centric Operational Shell Architecture Phase R6H: DashboardPage
Secondary Workbench Preview Mount**.

R6H should mount the passive appraiser/reviewer previews as secondary scoped panels inside
`DashboardPage` only for non-admin `my_work` and `review_queue` shell profiles, using existing
dashboard rows and loading state only. It should not change dashboard headings, `DashboardGate`,
routes, permissions, queries, workflow behavior, table/calendar/KPI/workload behavior, navigation,
command palette behavior, shell switching, or Client Portal implementation.

## Shell Resolution Phase R6H DashboardPage Secondary Workbench Preview Mount

Phase R6H mounts the passive R6F appraiser and reviewer workbench previews as secondary scoped
panels inside the existing shared `DashboardPage`.

Runtime files updated:

- `src/features/dashboard/DashboardPage.jsx`.

Focused tests updated:

- `src/features/dashboard/__tests__/DashboardPage.test.jsx`.

R6H changes:

- `DashboardPage` imports `AppraiserWorkbenchPreview` and `ReviewerWorkbenchPreview`;
- `DashboardPage` derives the passive shell profile id from the existing
  `shellProfilePresentation` prop;
- `AppraiserWorkbenchPreview` renders only when the passive profile id is `my_work` and `isAdmin`
  is false;
- `ReviewerWorkbenchPreview` renders only when the passive profile id is `review_queue` and
  `isAdmin` is false;
- the selected preview mounts after the existing primary table/status area and before
  `Operational Support`;
- the preview receives only existing dashboard props: `rows={ordersRows || []}`,
  `loading={loading}`, and the existing role label;
- no workflow buttons, links, callbacks, new queries, or route helpers are passed into the preview
  panels.

R6H intentionally keeps:

- the shared page heading as `Operations Dashboard`;
- appraiser support copy as `Calendar context, assigned orders, and revision follow-up.`;
- reviewer support copy as `Calendar context and review work assigned to your queue.`;
- owner/admin operations presentation behavior from R6B;
- assignment dashboard received-work presentation behavior from R6A.

R6H preserves:

- `DashboardGate` branch selection and branch order;
- `resolveCurrentDashboard(...)` inputs and behavior;
- all route paths and route guards;
- all permission keys and permission checks;
- dashboard summary loading, table filters, status filters, calendar panel, order table, KPI cards,
  workload visibility, owner setup prompt, and operational readiness behavior;
- dashboard data hooks, queries, RPCs, widgets, table props, calendar props, links, and object
  visibility;
- navigation and command palette behavior;
- backend, Supabase, query, workflow, RLS/RPC, product-mode authority, shell switching, Client
  Portal, branding, and production data behavior.

R6H test coverage proves:

- non-admin `my_work` dashboard contexts render the secondary `My Work` preview while keeping the
  `Operations Dashboard` page heading;
- non-admin `review_queue` dashboard contexts render the secondary `Review Queue` preview while
  keeping the `Operations Dashboard` page heading;
- appraiser and reviewer top-level support copy remains unchanged;
- owner/admin operations users do not render appraiser or reviewer preview panels;
- owner/admin plus production-work hybrids do not render the panels when `isAdmin` is true;
- calendar and Orders table props still come from the same dashboard summary rows and role-derived
  table modes;
- preview panels render no action buttons.

### R6H Conclusions

- Falcon now has its first live appraiser/reviewer workbench surface, but only as a secondary
  scoped panel inside the existing shared dashboard.
- The mount does not turn the page into a dedicated `My Work` or `Review Queue` dashboard.
- Owner/admin hybrids remain excluded from the secondary panels by default.
- Existing dashboard rows are still the only data source for these panels.
- Workflow actions, files, notes, report preview, revision history, activity feeds, route-level
  workbenches, shell switching, and dedicated dashboard branch selection remain deferred.

## Recommended Next Slice

Proceed with **Falcon Role-Centric Operational Shell Architecture Phase R6I: Workbench Preview Data
Sufficiency And Copy Audit**.

R6I should audit whether the live secondary workbench previews' row-derived counts, labels, support
copy, and empty states are accurate enough for appraiser/reviewer daily work before adding richer
workbench behavior. It should not add queries, workflow actions, files, notes, report preview,
revision history, new routes, navigation or command palette changes, shell switching, or Client
Portal implementation.

## Shell Resolution Phase R7A Profile-Aware Navigation Grouping Plan

Phase R7A plans profile-aware navigation grouping, emphasis, ordering, and de-emphasis before any
runtime navigation implementation.

This phase is documentation and planning only.

### R7A Sources Inspected

R7A inspected:

- `src/lib/navigation/currentNavigationRegistry.js`;
- `src/lib/navigation/currentPrimaryNavLinks.js`;
- `src/components/shell/TopNav.jsx`;
- `src/lib/commandPalette/currentCommandRegistry.js`;
- `src/lib/commandPalette/currentCommandPaletteCommands.js`;
- `src/components/nav/CommandPalette.jsx`;
- `src/routes/index.jsx`;
- `src/lib/shell/resolveShellProfile.js`;
- `src/lib/shell/shellProfiles.js`;
- `src/features/dashboard/DashboardGate.jsx`.

### Current Navigation Reality

Current runtime navigation is still mostly flat and surface-centric:

- `TopNav` brand routes to `/dashboard` and still presents `Falcon Operations` /
  `Operations Console`;
- desktop and mobile primary nav are built from `getCurrentPrimaryNavLinks(...)`;
- current primary nav order is `Orders`, `Assignments`, `Relationships`, `Calendar`, `Clients`,
  and `Team Access`;
- mobile nav renders the same primary links and adds `Settings` when settings access is allowed;
- `Orders` and `Calendar` remain broadly visible in primary nav while route guards remain
  authority;
- `Assignments`, `Relationships`, `Clients`, and `Team Access` are permission-aware in primary nav;
- `Clients` resolves to `/clients` or `/clients/cards` from current client permissions;
- `Team Access` is the visible label for the guarded `/users` surface after R3A;
- account/settings command copy is aligned after R3B, but mobile nav still uses the broad
  `Settings` label;
- global `Assignments` nav and command labels remain stable after R3C, while recipient-facing
  assignment pages now lead with received-work/work-request language;
- the command palette is related to navigation but uses a separate command registry and helper;
- command palette entries remain permission-filtered and flat: Orders, Assignments,
  Relationships, Calendar, Clients, Team Access, Account Settings, and Notification Settings;
- the command palette can expose broader discoverability than primary nav, and its order-search
  fallback still assumes Orders when order navigation permission is present.

Current route authority remains separate:

- `/orders` is guarded by order read permissions;
- `/calendar` is guarded by order navigation/read permissions;
- `/assignments` and assignment detail are guarded by assignment read permissions;
- `/relationships` is guarded by relationship read permission;
- `/clients` and `/clients/cards` are guarded by client read permissions;
- `/users` is guarded by `users.read`;
- settings routes remain settings/notification permission guarded;
- `/dashboard` still uses `DashboardGate`, which selects dashboard surfaces from current dashboard
  permissions and only passes shell profile exposure as presentation metadata.

### Navigation Grouping Doctrine

Profile-aware navigation grouping is presentation and discoverability only.

Rules:

- route guards, permissions, RLS/RPCs, object visibility, and workflow contracts remain authority;
- showing a nav item must never grant route, data, or action access;
- hiding or de-emphasizing a nav item must never be treated as access denial;
- route paths and route ids should remain stable through the first grouping slices;
- shell profile id may influence nav grouping, labels, and order only after permission visibility
  has already determined which surfaces are available;
- navigation should be allowed to show fewer daily-work surfaces than the user can technically
  access;
- the command palette may remain broader than primary nav, but it must still be permission-gated;
- future-only surfaces such as Client Portal Requests must not appear in live nav before portal
  authority and routes exist.

Recommended grouping tiers:

| Tier | Meaning |
|---|---|
| Primary | Daily work lanes that answer the profile's first question. |
| Secondary | Useful work context that should remain discoverable but not first in the shell. |
| Management | Owner/admin operational management surfaces. |
| Setup / Support | Team access, account settings, owner setup, diagnostics, and readiness utilities. |
| De-emphasized | Permissioned surfaces that should not drive daily attention for the profile. |
| Future / Blocked | Planned surfaces that must not render until authority and routes exist. |

### Profile Navigation Grouping Plan

| Shell profile | Primary navigation emphasis | Secondary / support | De-emphasized or hidden by default |
|---|---|---|---|
| `operations` | Operations Dashboard, Orders / Active Orders, Review Queue as an operational lane, Calendar. | Clients, Relationships, Assignments / Sent Assignments, Team Access, Owner Setup, Account Settings, Historical Orders. | Future Requests and any disabled module labels. |
| `my_work` | My Work, assigned order work, due/revision lanes, Calendar. | Assigned-safe client context, personal Account Settings, Files/Notes only inside order context when later designed. | Team Access, Owner Setup, broad Clients, Relationships, sent-assignment management, broad analytics. |
| `review_queue` | Review Queue, in-review work, resubmitted/revision follow-up lanes, review Calendar. | Orders as review-scoped context, personal Account Settings, review notes/activity only when later designed. | Team Access, Owner Setup, broad client management, assignment/vendor management, broad operations analytics. |
| `received_work` | Received Work / Assignments, Offers, Active Work, Submitted Work. | Account Settings and future profile/availability if a vendor shell is enabled. | Orders, Clients, Calendar, Team Access, Owner Setup, internal review/appraiser lanes. |
| `requests` | Future Requests, Action Needed, Documents, Reports, Messages. | Account / Team only after Client Portal authority exists. | All internal Orders, Assignments, Team Access, review, vendor, packet, and workflow-management surfaces. |
| fallback profiles | Minimal current-company/account/help affordances only where safe. | Account settings only if already permissioned and useful. | Work surfaces, future modules, hidden-record hints, and profile-specific claims. |

### Operations Navigation Plan

Owner/admin users should keep broad navigation, but it should be grouped instead of remaining one
flat row.

Recommended future operations grouping:

- **Operations:** Dashboard, Active Orders, Review Queue, Due Soon / Overdue where implemented,
  Calendar.
- **Management:** Clients, Relationships, Assignments / Sent Assignments, Historical Orders.
- **Setup / Support:** Team Access, Owner Setup, Account Settings, Notification Settings, Product
  Metadata Diagnostics only where diagnostic access is intentionally exposed.

Owner/admin grouping should not hide operational responsibility merely to simplify the page. It
should separate daily triage from setup/admin support so the shell feels like mission-control
software rather than a raw route list.

### My Work Navigation Plan

Appraiser users should eventually see an assigned-work-first shell, but global `Orders` should not
be renamed to `My Orders` until shell-aware navigation can prove context safely.

Recommended future appraiser grouping:

- **My Work:** My Work, My Assigned Orders, Needs Revisions, Due Soon.
- **Schedule:** Calendar / My Calendar.
- **Support:** Account Settings; assigned-safe client context only where permissioned and
  role-relevant.

Blocked until later shell maturity:

- replacing global `Orders` with `My Orders`;
- adding Files, Notes, or Submit/Resubmit nav entries before those surfaces and workflow contracts
  are designed;
- hiding Team Access as security when the user still has route authority.

### Review Queue Navigation Plan

Reviewer users should get review-first grouping before any route-level dashboard replacement, but
`Review Queue` should initially be a grouping/emphasis concept, not proof of a new route.

Recommended future reviewer grouping:

- **Review Queue:** Review Queue, In Review, Resubmitted Work, Needs Revisions / Revision
  Follow-Up.
- **Schedule:** Review Calendar.
- **Support:** Orders as review-scoped context, Account Settings, review notes/activity only after
  data contracts exist.

Blocked until later shell maturity:

- replacing the shared dashboard heading or dashboard component from navigation metadata;
- creating a global `Review Queue` route without dashboard/Orders selection design;
- adding clear-review/request-revisions/ready-for-client action entries to nav or commands before
  governed workflow action availability is exposed safely.

### Received Work Navigation Plan

Assignment-only users should see an assignment-native shell and should not be pushed through
internal Operations navigation.

Recommended future received-work grouping:

- **Received Work:** Received Work, Offers, Active Work, Submitted Work, Completed Work.
- **Support:** Account Settings; profile/availability only if a vendor portal surface is later
  enabled.

Current `Assignments` can remain the stable route/nav label until profile-aware nav rendering can
show `Received Work` only for the assignment-recipient context. Owner/admin assignment oversight
may continue to use `Assignments`, `Sent Assignments`, or `Assignment Packet` where packet-scoped
precision prevents confusion with canonical order access.

### Future Requests Navigation Plan

The `requests` shell remains future-only.

Recommended future client portal grouping after portal authority exists:

- **Requests:** Requests, Action Needed, In Progress, Completed Requests.
- **Documents:** Requested Documents, Uploaded Documents.
- **Reports:** Available Reports.
- **Messages:** Client-safe messages.
- **Account:** Account / Team only if explicitly designed.

Do not introduce Requests navigation in the live internal shell before Client Portal routes,
authority, data projections, and client-safe status language exist.

### Hybrid User Behavior

Hybrid users should follow the existing shell resolver defaults before navigation grouping:

- owner/admin plus appraiser or reviewer responsibility defaults to `operations`;
- owner/admin production work may later appear as a secondary `My Work` or `Review Queue` lane,
  but the primary nav should not hide company-wide risk;
- appraiser plus reviewer users default to `my_work` unless explicit review work waiting selects
  `review_queue`;
- the non-selected production lane may become a secondary group after profile-aware metadata is
  proven;
- mixed internal order plus assignment access should not be treated as assignment-only received
  work;
- no hybrid case should require a shell switcher in the first navigation grouping slice.

### Mobile Navigation Grouping

Mobile nav should collapse by shell priority rather than mirror every authorized desktop route.

Recommended mobile direction:

- `operations`: Dashboard, Orders, Review Queue/Due Soon where implemented, Calendar, then Team
  Access and Settings in support/overflow;
- `my_work`: My Work, Needs Revisions/Due Soon where implemented, Calendar, then Account Settings;
- `review_queue`: Review Queue, In Review/Due Soon where implemented, Review Calendar, then
  Account Settings;
- `received_work`: Received Work, Offers, Active Work, Submitted Work, then Account Settings;
- `requests`: Requests, Action Needed, Documents, Reports, Messages, Account after portal launch;
- fallback profiles: company/account recovery only, with no operational work claims.

The first mobile grouping implementation should not add new routes. It should reorder and group
already available links from permission-filtered inputs.

### Command Palette Relationship

Command palette should remain broader than primary navigation, but later become role-prioritized.

Rules:

- command availability remains permission-derived;
- shell profile may later affect command grouping, order, aliases, and placeholder copy;
- command palette should include de-emphasized but permissioned destinations that are intentionally
  absent from compact nav;
- profile-aware command placeholders should wait until navigation grouping metadata is stable;
- order-search fallback should remain unchanged until a separate command-palette slice designs
  profile-aware search fallback behavior.

Recommended later command priority:

- `operations`: Operations Dashboard, Orders, Review Queue, Team Access, Owner Setup;
- `my_work`: My Work, My Assigned Orders, Needs Revisions, Due Soon, My Calendar;
- `review_queue`: Review Queue, In Review, Resubmitted Work, Review Calendar;
- `received_work`: Received Work, Offers, Active Work, Submitted Work;
- `requests`: Requests, Action Needed, Documents, Reports, Messages, only after Client Portal
  authority exists.

### Safe First Navigation Runtime Slice

The safest first runtime navigation slice is **R7B Passive Navigation Group Metadata And Tests**.

R7B scope:

- add inert profile-aware navigation grouping metadata for existing live nav entry ids;
- define group ids, group labels, profile priorities, and de-emphasis notes as data only;
- keep current `getCurrentPrimaryNavLinks(...)` output unchanged;
- keep `TopNav` rendering unchanged;
- keep mobile nav rendering unchanged;
- keep command palette output unchanged;
- add tests proving every metadata entry references known nav ids and every profile grouping is
  `presentation_only`;
- add regression tests proving current primary nav links, labels, order, mobile settings behavior,
  command palette labels/order, and route paths are unchanged.

R7B must not:

- call `useShellProfile()` from `TopNav`;
- render grouped navigation;
- rename `Orders`, `Assignments`, `Calendar`, `Clients`, or brand copy;
- change command palette behavior;
- change route paths, guards, or permission keys;
- change `DashboardGate`, dashboards, queries, workflows, backend/Supabase behavior, shell
  switching, or Client Portal behavior.

### R7A Conclusions

- Navigation can become role-aware through grouping and emphasis without becoming authority.
- Owner/admin should keep broad navigation, but grouped into daily Operations, Management, and
  Setup / Support.
- Appraiser and reviewer shells should receive `My Work` and `Review Queue` grouping before global
  route labels or dashboard branches change.
- Assignment-only users should eventually see Received Work-first navigation, while owner/admin
  assignment oversight may keep assignment/packet precision.
- Client Requests navigation remains future-only and blocked until Client Portal authority exists.
- Command palette should remain broader than primary nav and become role-prioritized only after
  navigation grouping metadata is proven.

## Recommended Next Slice

Proceed with **Falcon Role-Centric Operational Shell Architecture Phase R7B: Passive Navigation
Group Metadata And Tests**.

R7B should add inert, tested profile-aware navigation grouping metadata without changing live
`TopNav`, mobile nav, command palette, routes, permissions, guards, DashboardGate, dashboards,
backend/Supabase/query/workflow behavior, shell switching, or Client Portal implementation.

## Shell Resolution Phase R7B Passive Navigation Group Metadata And Tests

Phase R7B adds inert profile-aware navigation grouping metadata for existing navigation item ids
only.

Runtime files added:

- `src/lib/navigation/shellNavigationGroups.js`.

Focused tests added:

- `src/lib/navigation/__tests__/shellNavigationGroups.test.js`.

R7B changes:

- adds a passive `shellNavigationGroups` metadata registry keyed by shell profile id;
- defines group ids, group labels, ordered existing nav entry ids, notes, deemphasized ids, and
  future/fallback status;
- covers active profiles `operations`, `my_work`, `review_queue`, and `received_work`;
- covers fallback profiles `unavailable`, `company_required`, `membership_inactive`,
  `profile_ambiguous`, and `module_unavailable`;
- includes `requests` as future-only metadata with no live Client Portal route assumptions;
- exports `getShellNavigationGroups(...)`, `shellNavigationGroupsByProfileId`, and stable profile
  id ordering for tests and future passive consumers;
- freezes entries, groups, and arrays in the same read-only style as other shell metadata.

R7B grouping metadata:

- `operations` groups existing ids into `Operations`, `Management`, and `Setup / Support`;
- `my_work` groups existing ids into `Work` and `Support`, with admin/setup surfaces
  deemphasized as metadata only;
- `review_queue` groups existing ids into `Review Work` and `Support`, without creating a
  Review Queue route;
- `received_work` groups existing ids into `Received Work` and `Account`, without granting
  canonical order/client/team access;
- `requests` remains future-only and references no live Client Portal, Documents, Reports,
  Messages, or Requests route ids;
- fallback profiles expose only minimal `dashboard` and `settings` grouping as workspace/account
  recovery metadata.

R7B preserves:

- `currentNavigationRegistry` behavior;
- `getCurrentPrimaryNavLinks(...)` output;
- `TopNav` desktop rendering;
- `TopNav` mobile rendering and mobile Settings behavior;
- command palette registry, helper, rendering, labels, ordering, and order-search fallback;
- all route paths and route guards;
- all permission keys and permission checks;
- `DashboardGate` branch selection and shell metadata passing behavior;
- dashboard, assignment, Orders, Calendar, Clients, Team Access, Settings, backend, Supabase,
  query, workflow, RLS/RPC, product-mode authority, shell switching, Client Portal, branding, and
  production data behavior.

R7B test coverage proves:

- every shell navigation grouping record is `presentation_only`;
- records do not include permission keys, permission decision inputs, route guards, or visibility
  gates;
- every referenced nav id exists in the current live navigation registry;
- every shell profile metadata id has exactly one navigation grouping record;
- `requests` metadata is future-only and does not invent Client Portal route ids;
- operations, appraiser, reviewer, received-work, and fallback grouping shapes match the R7A plan;
- current primary nav ids, labels, order, and route paths remain unchanged;
- existing `Orders`, `Assignments`, `Team Access`, and `Owner Setup` labels/paths remain unchanged;
- all metadata entries, groups, and arrays are frozen/read-only;
- unknown profile lookup returns `null`.

### R7B Conclusions

- Falcon now has passive profile-aware navigation grouping metadata without rendering grouped nav.
- The metadata is suitable for future presentation planning and tests, not runtime authority.
- No live navigation, mobile navigation, command palette, route, permission, dashboard, backend, or
  workflow behavior changed.
- The next navigation step should decide how to consume this metadata in the smallest live surface
  without changing route authority.

## Recommended Next Slice

Proceed with **Falcon Role-Centric Operational Shell Architecture Phase R7C: Navigation Grouping
Render Readiness Plan**.

R7C should plan how `TopNav` could safely consume passive navigation grouping metadata later. It
should not render grouped navigation, call `useShellProfile()` from `TopNav`, change current nav
labels/order, change mobile nav behavior, change command palette behavior, alter routes,
permissions, guards, DashboardGate, dashboards, backend/Supabase/query/workflow behavior, add shell
switching, or implement Client Portal.

## Shell Resolution Phase R7C Navigation Grouping Render Readiness Plan

Phase R7C plans how profile-aware navigation grouping can be rendered safely later without changing
route access, permission authority, command palette behavior, or mobile usability unexpectedly.

This phase is documentation and planning only.

### R7C Sources Inspected

R7C inspected:

- `src/components/shell/TopNav.jsx`;
- `src/lib/navigation/currentPrimaryNavLinks.js`;
- `src/lib/navigation/shellNavigationGroups.js`.

### Current Render Path

Current `TopNav` behavior:

- derives permission booleans through existing permission hooks;
- calls `getCurrentPrimaryNavLinks(...)`;
- renders desktop primary nav by mapping over `primaryNavLinks`;
- renders mobile nav by mapping over the same `primaryNavLinks`;
- adds mobile `Settings` separately when settings access is allowed;
- opens `CommandPalette` independently from nav rendering;
- does not call `useShellProfile()`;
- does not import `shellNavigationGroups`;
- does not render group labels, grouped sections, or shell-specific ordering.

Current primary nav derivation:

- produces visible links from existing nav ids and permission booleans;
- keeps `Orders` and `Calendar` broadly present;
- conditionally includes `Assignments`, `Relationships`, `Clients`, and `Team Access`;
- resolves assigned-client versus all-client paths before rendering;
- returns frozen link records with existing labels, paths, route gates, visibility gates, and
  `sourceSurface`.

Current R7B grouping metadata:

- is passive and frozen;
- references existing live navigation ids only;
- includes groups and deemphasized ids by shell profile;
- includes `requests` as future-only metadata with no live route assumptions;
- is not consumed by `TopNav`, mobile nav, command palette, routes, or guards.

### Render Strategy Options

#### 1. Desktop Grouped Sections Only

This is the recommended first live render strategy.

Shape:

- keep `getCurrentPrimaryNavLinks(...)` as the permission-filtered source of visible links;
- resolve shell profile presentation separately;
- look up passive grouping metadata by profile id;
- group only links already present in `primaryNavLinks`;
- render compact desktop group labels or separators around visible links;
- preserve existing link labels and paths;
- do not render metadata-only ids that are not currently visible links.

Reasoning:

- desktop has enough horizontal/contextual space to test grouping without disrupting mobile;
- owner/admin broad navigation benefits most from separating Operations, Management, and Setup;
- keeping grouping after permission-filtered link derivation prevents metadata from becoming
  authority.

#### 2. Mobile Grouped Sections Only

This is not recommended as the first live slice.

Reasoning:

- mobile nav is more sensitive to height, tap target density, and cognitive load;
- adding group labels to mobile first could bury the few important actions behind headings;
- mobile also has the separate Settings affordance that needs careful treatment.

Mobile grouping should follow desktop proof, or remain a separate slice with mobile-specific tests.

#### 3. Group Labels As Visual Separators

This is safe if labels are small and non-interactive.

Rules:

- group labels must not be links;
- group labels must not imply access to hidden routes;
- empty groups should not render;
- one-link groups may render without a label if the label adds clutter;
- labels should use metadata group labels only after the group contains at least one currently
  visible link.

#### 4. Prioritize / Reorder Without Hiding

This is acceptable only after R7D proves grouping can preserve the same visible link set.

Rules:

- reorder links only inside the visible permission-filtered set;
- do not remove links because they are listed in `deemphasizedNavEntryIds`;
- do not add metadata-only links to the visible set;
- keep all currently visible links reachable in both desktop and mobile;
- add tests that compare visible link id sets before and after grouping.

#### 5. Grouping Disabled For Fallback Profiles

This is recommended.

Fallback profile behavior:

- unknown profile id, `unavailable`, `company_required`, `membership_inactive`,
  `profile_ambiguous`, and `module_unavailable` should keep current flat nav until a fallback
  navigation UX is separately designed;
- fallback grouping metadata should remain available for tests and future planning;
- no fallback profile should render operational group labels that imply hidden work exists.

#### 6. Dev/Test-Only Grouping First

This is not recommended inside live `TopNav`.

Reasoning:

- environment-only branches create a UI that differs from production;
- R7B already provides passive metadata tests;
- a preview harness could be useful later, but it should sit outside live routing if introduced.

### What Grouping May Change Later

After a runtime slice is approved, grouping may change:

- visual grouping around already visible links;
- section labels for groups that contain visible links;
- order of currently visible links;
- visual emphasis or de-emphasis of currently visible links;
- desktop grouping before mobile grouping;
- eventually mobile grouping after separate mobile tests.

### What Grouping Must Not Change

Grouping must not change:

- route access;
- permission filtering;
- available link set;
- URL paths;
- command palette availability, labels, order, filtering, or fallback search;
- `DashboardGate` branch selection;
- dashboard selection or dashboard headings;
- backend, Supabase, query, RLS/RPC, workflow, or object visibility behavior;
- shell switching;
- Client Portal behavior.

### Required Runtime Consumption Order

The future runtime consumption order should be:

1. Resolve the current visible nav links through existing permission-derived inputs.
2. Resolve passive shell profile presentation metadata.
3. Look up passive navigation grouping metadata for that profile.
4. Intersect grouping metadata with the already visible link ids.
5. Render non-empty groups or fall back to the current flat list.

The grouping step must not call route guards, inspect permission keys, fetch data, execute queries,
or decide whether a link is allowed.

### Hybrid User Behavior

Owner/admin hybrids:

- should use the `operations` grouping by default;
- should keep all currently visible owner/admin links in the visible set;
- should not lose access to permissioned production work or admin surfaces because grouping says
  those links are secondary.

Appraiser/reviewer hybrids:

- should follow the already resolved shell profile;
- should group around the selected profile only after current visible links exist;
- should not hide the non-primary work lane in the first render slice.

Assignment plus internal-order users:

- should not use `received_work` grouping unless the resolver has selected assignment-only
  `received_work`;
- should keep assignment links as visible secondary context when permissions expose them.

### Assignment-Only Behavior

Assignment-only users can eventually receive `Received Work` grouping, but only over the existing
visible assignment dashboard/nav surfaces.

Rules:

- do not add Orders, Clients, Calendar, Team Access, or owner setup from grouping metadata;
- do not remove the assignment route link if the current permission-derived helper includes it;
- do not imply canonical order access through group labels.

### Safest First Runtime Render Slice

The safest first runtime render slice is **R7D Desktop Navigation Group Labels From Visible Links**.

R7D scope:

- call passive shell profile exposure in `TopNav` only for presentation metadata;
- keep `getCurrentPrimaryNavLinks(...)` as the source of visible links;
- derive grouped desktop nav sections by intersecting `primaryNavLinks` with
  `getShellNavigationGroups(profileId)`;
- render desktop group labels/separators only when a group has visible links;
- keep the same link labels, paths, active behavior, and click behavior;
- keep mobile nav flat and unchanged;
- keep command palette unchanged;
- add tests proving the visible desktop nav link id set is unchanged for fully permissioned,
  appraiser-like, reviewer-like, assignment-only, and fallback/unknown profile cases;
- add tests proving no metadata-only ids are rendered;
- add tests proving unknown/fallback profiles fall back to current flat nav.

R7D must not:

- hide links;
- add links;
- change route paths;
- change nav labels;
- change command palette behavior;
- change mobile nav;
- change DashboardGate or dashboard selection;
- change permissions, guards, backend/Supabase/query/workflow behavior, shell switching, or Client
  Portal behavior.

### R7C Conclusions

- Grouping should be applied after existing permission-filtered nav link derivation.
- The first live render should be desktop-only group labels/separators over the current visible
  links.
- Mobile grouping should wait for a separate mobile-specific slice.
- `deemphasizedNavEntryIds` should remain metadata only during the first render slice.
- Unknown and fallback profiles should keep flat current nav until fallback-specific UX is
  designed.
- Command palette should remain unchanged and broader than nav.

## Recommended Next Slice

Proceed with **Falcon Role-Centric Operational Shell Architecture Phase R7D: Desktop Navigation
Group Labels From Visible Links**.

R7D should render desktop-only group labels from passive grouping metadata after existing
permission-filtered nav links are derived. It should preserve the visible link set, labels, paths,
mobile nav, command palette, routes, permissions, guards, DashboardGate, dashboards,
backend/Supabase/query/workflow behavior, shell switching, and Client Portal behavior.

## Shell Resolution Phase R7D Desktop Navigation Group Labels From Visible Links

Phase R7D renders the first live profile-aware navigation grouping, limited to desktop primary
navigation presentation.

Runtime files added:

- `src/lib/navigation/currentShellNavigationSections.js`.

Runtime files updated:

- `src/components/shell/TopNav.jsx`.

Focused tests added or updated:

- `src/lib/navigation/__tests__/currentShellNavigationSections.test.js`;
- `src/components/shell/__tests__/TopNav.test.jsx`.

R7D changes:

- `TopNav` now observes `useShellProfile()` only as presentation metadata;
- desktop primary navigation derives grouped sections from `getCurrentShellNavigationSections(...)`;
- the grouping helper accepts already visible links from `getCurrentPrimaryNavLinks(...)`;
- active shell profiles render desktop group labels only for groups with visible links;
- unknown, fallback, and future profiles keep the current flat desktop nav;
- metadata-only ids are ignored when they are not already visible links;
- visible links not covered by active profile grouping metadata remain visible in a non-authority
  `More` group;
- desktop group labels are visual only and are not links, access indicators, route guards, or
  permission decisions.

R7D desktop grouping behavior:

- `operations` can render `Operations` and `Management` groups from currently visible links;
- `my_work` can render `Work`, `Support`, and `More` when the user also has permissioned surfaces
  outside the appraiser grouping metadata;
- `review_queue` follows the same visible-link-only grouping rule;
- `received_work` groups only visible assignment/dashboard surfaces and does not create canonical
  order, client, calendar, team, or owner setup links;
- fallback and unknown profiles preserve the current flat primary nav order.

R7D preserves:

- existing `getCurrentPrimaryNavLinks(...)` permission-filtered link derivation;
- visible link availability;
- link labels;
- link paths;
- active-link behavior;
- mobile nav rendering, order, and mobile Settings placement;
- command palette registry, helper, rendering, labels, ordering, filtering, and order-search
  fallback;
- all route paths, route guards, permission keys, permission checks, `DashboardGate`, dashboards,
  backend/Supabase/query/workflow behavior, RLS/RPCs, object visibility, shell switching, Client
  Portal behavior, branding, and production data.

R7D test coverage proves:

- operations-profile desktop nav renders group labels when visible links exist;
- grouping uses only already visible links and does not create inaccessible links from metadata;
- empty groups are skipped;
- unknown profiles preserve the current flat desktop nav;
- visible links outside profile grouping metadata remain reachable in `More`;
- mobile nav remains flat and keeps the current order and Settings placement;
- active-link styling still comes from `NavItem`;
- shell navigation group metadata remains passive, frozen, and aligned with current nav ids.

### R7D Conclusions

- Falcon now renders passive shell navigation grouping in desktop primary nav only.
- The grouping is applied after permission-filtered link derivation and never grants or removes
  access.
- Mobile nav and command palette behavior remain unchanged.
- The next navigation slice should evaluate mobile grouping separately before changing compact
  navigation behavior.

## Recommended Next Slice

Proceed with **Falcon Role-Centric Operational Shell Architecture Phase R7E: Mobile Navigation
Grouping Readiness Plan**.

R7E should audit whether mobile nav should receive profile-aware grouping, priority ordering, or
remain flat for usability. It should not change routes, permissions, command palette behavior,
DashboardGate, dashboards, backend/Supabase/query/workflow behavior, shell switching, or Client
Portal implementation.

## Shell Resolution Phase R7E Mobile Navigation Grouping Readiness Plan

Phase R7E plans mobile navigation grouping after the R7D desktop grouping render. This phase is
documentation and planning only.

### R7E Sources Inspected

R7E inspected:

- `src/components/shell/TopNav.jsx`;
- `src/lib/navigation/currentPrimaryNavLinks.js`;
- `src/lib/navigation/currentShellNavigationSections.js`;
- `src/lib/navigation/shellNavigationGroups.js`.

### Current Mobile Navigation Behavior

Current mobile navigation remains flat and permission-derived:

- `TopNav` derives `primaryNavLinks` from `getCurrentPrimaryNavLinks(...)`;
- the mobile drawer maps `primaryNavLinks` directly in current helper order;
- the mobile drawer closes when a nav link is selected;
- mobile `Settings` is rendered separately after a divider when `settings.view` allows it;
- mobile nav does not consume `currentShellNavigationSections`;
- mobile nav does not render group labels, accordions, or de-emphasis;
- command palette behavior remains independent from mobile nav.

This means R7D desktop grouping did not change mobile link availability, mobile link order, mobile
settings placement, command palette behavior, route paths, or permission checks.

### Desktop Versus Mobile

Desktop is Falcon's mission-control surface. It can tolerate visible section labels because owner
and admin users need broad scanability across daily operations, management, and setup/support.

Mobile is Falcon's operational-execution surface. It should help users reach the next work surface
quickly with minimal tap depth and minimal vertical noise. Mobile should not automatically mirror
desktop grouping because section labels increase drawer height and can slow action-oriented use.

### Mobile Strategies Considered

#### Grouped Sections

Grouped sections would reuse the R7D desktop pattern inside the mobile drawer.

Decision:

- do not use grouped mobile sections as the first mobile runtime slice.

Reasoning:

- group labels add vertical height to a compact surface;
- owner/admin grouping may be useful later, but appraiser, reviewer, and assignment-recipient
  mobile flows should emphasize direct work access;
- grouping can make permissioned secondary links feel unavailable or less important if not tested
  carefully.

#### Role-Priority Ordering Only

Role-priority ordering would keep the drawer as a flat list but sort already visible links by the
resolved shell profile's mobile priority.

Decision:

- this is the recommended first mobile runtime direction.

Rules:

- start from `getCurrentPrimaryNavLinks(...)`;
- keep the same visible link set;
- keep the same labels and paths;
- intersect only with passive shell navigation metadata;
- move role-primary visible links earlier;
- append any visible links not represented by profile metadata in their existing relative order;
- keep mobile `Settings` behavior separate unless a later slice explicitly folds settings into
  mobile ordering.

#### Accordions

Accordions would collapse groups inside the mobile drawer.

Decision:

- defer accordions.

Reasoning:

- accordions add interaction cost before navigation;
- they can hide permissioned links behind a second tap;
- they are better suited to a larger mobile information architecture after real usage patterns are
  known.

#### Quick-Action-First Layout

A quick-action-first mobile drawer would place governed workflow actions ahead of navigation.

Decision:

- keep this future-only.

Reasoning:

- quick actions require explicit governed action availability, workflow state, object context, and
  audit behavior;
- nav grouping metadata is not workflow authority;
- adding actions to mobile nav would exceed the current navigation-only scope.

#### Flat Nav With Role-Native Labels

Flat nav with role-native labels would rename visible links such as `Orders` to `My Work` or
`Assignments` to `Received Work` in mobile contexts.

Decision:

- defer global mobile label changes.

Reasoning:

- global `Orders`, `Assignments`, and dashboard wording still depend on broader shell-aware
  presentation decisions;
- owner/admin assignment oversight and assignment-recipient received work need different language;
- label changes can overpromise route behavior if the underlying route still serves a broader
  workspace.

### Recommended Mobile Direction

Mobile should remain flat in the first mobile runtime slice, but the flat list may become
profile-prioritized.

Recommended profile behavior:

- `operations`: keep broad operational visibility, but prioritize visible daily operations links
  before management/support links;
- `my_work`: prioritize visible work and calendar links before permissioned admin or management
  links;
- `review_queue`: prioritize visible review/order/calendar links before permissioned support links;
- `received_work`: prioritize visible assignment/received-work links and do not create internal
  order, client, calendar, team, or owner setup links;
- fallback, unknown, and future profiles: keep current flat mobile order.

This ordering must preserve every currently visible permission-filtered link. Appraisers,
reviewers, or hybrid users must not lose access to permissioned admin, assignment, client, or
relationship links merely because their primary shell is `my_work` or `review_queue`.

### Owner/Admin Hybrids

Owner/admin plus production-work users should continue to resolve to `operations`.

Mobile implications:

- do not hide company-wide risk behind a production-work mobile default;
- keep any currently visible production or assignment links available;
- prioritize operational triage links first, then management/support links;
- do not introduce a shell switcher in the mobile nav slice.

### Assignment-Only Users

Assignment-only users should remain assignment-native without gaining internal routes.

Mobile implications:

- prioritize visible assignment/received-work surfaces;
- do not create `Orders`, `Clients`, `Calendar`, `Team Access`, or owner setup links from metadata;
- preserve assignment-scoped safety underneath the existing route and permission model;
- keep `Received Work` terminology for later label-specific slices rather than renaming global
  mobile nav in the first ordering slice.

### Fallback And Unknown Profiles

Fallback and unknown profiles should keep the current flat mobile nav.

Rules:

- no profile-specific labels;
- no group headings;
- no role-priority reordering;
- no future `Requests` links;
- no hidden-record or disabled-module implication.

### Safest First Mobile Runtime Slice

The safest first mobile runtime slice is **R7F Mobile Navigation Priority Ordering From Visible
Links**.

R7F scope:

- add a small pure helper that accepts already visible mobile nav links and a shell profile id;
- return the same link objects with profile-prioritized ordering for active profiles;
- preserve the visible link id set exactly;
- preserve link labels and paths exactly;
- append ungrouped visible links in current relative order;
- keep unknown, fallback, and future profiles in the current flat order;
- apply the helper only to the mobile drawer;
- keep mobile `Settings` placement unchanged after the divider unless separately approved;
- keep desktop R7D grouping unchanged;
- keep command palette unchanged.

R7F tests should prove:

- active profiles reorder only already visible mobile links;
- no metadata-only nav ids create links;
- the mobile visible link id set is unchanged for operations, my_work, review_queue,
  received_work, and fallback cases;
- unknown/fallback profiles preserve current mobile order;
- mobile Settings remains after the divider and keeps current behavior;
- selecting a mobile link still closes the drawer;
- command palette labels, ordering, availability, and fallback search remain unchanged.

R7F must not:

- render mobile group labels;
- add mobile accordions;
- hide or de-emphasize links;
- rename nav labels;
- change route paths or route guards;
- change permission keys or permission filtering;
- change command palette behavior;
- change DashboardGate, dashboards, queries, backend/Supabase/workflow behavior, shell switching,
  Client Portal behavior, branding, or production data.

### R7E Conclusions

- Desktop grouping can support mission-control scanability, but mobile should optimize for
  operational execution.
- The first mobile change should not render section labels or accordions.
- The safest mobile runtime direction is flat, profile-prioritized ordering from already visible
  permission-filtered links.
- Mobile grouping metadata must remain presentation-only and downstream of existing permission
  visibility.
- Unknown, fallback, and future profiles should keep current flat mobile behavior.

## Recommended Next Slice

Proceed with **Falcon Role-Centric Operational Shell Architecture Phase R7F: Mobile Navigation
Priority Ordering From Visible Links**.

R7F should keep mobile nav flat while ordering already visible links by shell profile priority. It
should preserve link availability, labels, paths, mobile Settings placement, command palette
behavior, routes, permissions, guards, DashboardGate, dashboards, backend/Supabase/query/workflow
behavior, shell switching, and Client Portal behavior.

## Shell Resolution Phase R7F Mobile Navigation Priority Ordering From Visible Links

Phase R7F applies the first role-aware mobile navigation presentation change while keeping mobile
navigation flat.

Runtime files added:

- `src/lib/navigation/currentShellMobileNavigationLinks.js`.

Runtime files updated:

- `src/components/shell/TopNav.jsx`.

Focused tests added or updated:

- `src/lib/navigation/__tests__/currentShellMobileNavigationLinks.test.js`;
- `src/components/shell/__tests__/TopNav.test.jsx`.

R7F changes:

- `TopNav` derives a single passive shell profile id from existing shell profile presentation
  metadata;
- desktop nav continues to use `getCurrentShellNavigationSections(...)` from R7D;
- mobile nav now uses `getCurrentShellMobileNavigationLinks(...)`;
- the mobile helper accepts already visible links from `getCurrentPrimaryNavLinks(...)`;
- active shell profiles reorder visible mobile links by shell navigation metadata priority;
- metadata-only nav ids are ignored when they are not already visible;
- visible links not represented by profile metadata are appended in their current relative order;
- unknown, fallback, and future profiles keep the current flat mobile order;
- mobile `Settings` remains rendered separately after the existing divider when allowed.

R7F mobile ordering behavior:

- `operations` prioritizes visible daily operation links before management links;
- `my_work` prioritizes visible work/calendar/client-context links and keeps permissioned
  assignment, relationship, and Team Access links available after those primary links;
- `review_queue` follows the same visible-link-only priority model for review work;
- `received_work` prioritizes visible assignment links without creating Orders, Clients, Calendar,
  Team Access, or owner setup links from metadata;
- fallback, future, unresolved, and unknown shell profiles keep current mobile order.

R7F preserves:

- the exact permission-filtered mobile link set;
- mobile link labels;
- mobile link paths;
- mobile link click/close behavior;
- mobile Settings placement after the divider;
- desktop grouped navigation behavior from R7D;
- command palette registry, helper, rendering, labels, ordering, filtering, and order-search
  fallback;
- all route paths, route guards, permission keys, permission checks, `DashboardGate`, dashboards,
  backend/Supabase/query/workflow behavior, RLS/RPCs, object visibility, shell switching, Client
  Portal behavior, branding, and production data.

R7F deliberately does not:

- render mobile group labels;
- add mobile accordions;
- hide links;
- de-emphasize links;
- rename mobile nav labels;
- change route access;
- change command palette behavior;
- introduce quick actions;
- introduce a shell switcher;
- implement Client Portal navigation.

R7F test coverage proves:

- operations-profile mobile nav keeps the same visible links while applying shell priority order;
- mobile Settings remains after the nav links and keeps its existing path;
- received-work ordering uses only visible links and does not create inaccessible links from
  metadata;
- unknown profiles preserve the current flat mobile order;
- assigned-only client routing remains unchanged;
- mobile link selection still closes the drawer;
- desktop grouping tests continue to prove R7D desktop behavior remains intact;
- shell navigation group metadata remains passive, frozen, and aligned with current nav ids.

### R7F Conclusions

- Falcon now has profile-aware mobile nav ordering without mobile group labels.
- The ordering is applied after permission-filtered link derivation and never grants, removes, or
  hides access.
- Mobile remains an operational-execution flat list.
- Desktop grouping and command palette behavior remain unchanged.

## Recommended Next Slice

Proceed with **Falcon Role-Centric Operational Shell Architecture Phase R7G: Mobile Navigation
Copy And Density Audit**.

R7G should audit whether mobile nav labels, spacing, and Settings/support placement remain clear
after profile-priority ordering. It should not change route access, permissions, command palette
behavior, DashboardGate, dashboards, backend/Supabase/query/workflow behavior, shell switching, or
Client Portal implementation.

## Shell Resolution Phase R8A Command Palette Role-Priority Plan

Phase R8A plans profile-aware command palette ordering and language before any runtime command
palette behavior changes. This phase is documentation and planning only.

### R8A Sources Inspected

R8A inspected:

- `src/lib/commandPalette/currentCommandRegistry.js`;
- `src/lib/commandPalette/currentCommandPaletteCommands.js`;
- `src/components/nav/CommandPalette.jsx`;
- `src/lib/commandPalette/__tests__/currentCommandPaletteCommands.test.js`;
- `src/lib/shell/shellProfiles.js`;
- `src/lib/navigation/shellNavigationGroups.js`.

### Current Command Palette Behavior

Current command palette behavior:

- `CommandPalette` reads effective permissions through `useEffectivePermissions()`;
- command permission inputs are built from existing permission keys;
- `getCurrentCommandPaletteCommands(...)` returns a flat command list;
- current command order is `orders`, `assignments`, `relationships`, `calendar`, `clients`,
  `users`, `settings`, and `notif`;
- loading/error states use a legacy fallback command list that excludes assignments and
  relationships;
- command filtering matches typed text against command labels;
- arrow keys move selection;
- Enter navigates to the selected command;
- when no command matches and order navigation is available, Enter searches Orders through
  `/orders?q=...`;
- command palette placeholder text remains broad and global;
- command execution delegates navigation through the existing `onNavigate` callback from `TopNav`.

Current command labels remain mostly destination-oriented:

- `Go to Orders`;
- `Go to Assignments`;
- `Go to Relationships`;
- `Go to Calendar`;
- `Go to Clients`;
- `Open Team Access`;
- `Open Account Settings`;
- `Open Notification Settings`.

### Command Palette Doctrine

Command palette priority is presentation and discoverability only.

Rules:

- command availability remains permission-derived;
- route guards remain authority after navigation;
- command ordering must not grant access;
- command ordering must not hide permissioned commands in the first runtime slice;
- command labels must not imply a route has become a dedicated workbench before route/data behavior
  supports that claim;
- order-search fallback must remain unchanged until a separate search behavior slice is approved;
- quick-action commands must wait for governed workflow action availability and audit behavior.

The command palette may remain broader than navigation. Navigation can focus daily surfaces, while
the command palette can still expose permissioned secondary destinations for power users.

### Profile Command Priority Plan

#### `operations`

Priority intent:

- owner/admin daily operations first;
- management and setup support after operational surfaces.

Recommended first ordering from existing visible commands:

1. `orders`;
2. `calendar`;
3. `assignments`;
4. `clients`;
5. `relationships`;
6. `users`;
7. `settings`;
8. `notif`.

Later role-native label candidates:

- `Go to Orders` -> `Open Active Orders`;
- `Go to Assignments` -> `Open Assignments` or `Open Sent Assignments` where owner/admin context
  is explicit;
- `Go to Calendar` -> `Open Operations Calendar`;
- `Go to Clients` -> `Open Clients`;
- `Open Team Access` can remain as-is.

Labels that should wait:

- `Open Review Queue` should wait until a command can target an actual review queue surface or
  safely route to an approved filtered view;
- `Open Due Soon` and `Open Unassigned Orders` should wait until route/filter contracts are
  explicit.

#### `my_work`

Priority intent:

- assigned internal work and schedule first;
- support/admin surfaces stay available but secondary when permissioned.

Recommended first ordering from existing visible commands:

1. `orders`;
2. `calendar`;
3. `clients`;
4. `assignments`;
5. `relationships`;
6. `users`;
7. `settings`;
8. `notif`.

Later role-native label candidates:

- `Go to Orders` -> `Open My Assigned Orders` only after the command can target assigned-work
  context safely;
- `Go to Calendar` -> `Open My Calendar`;
- `Go to Clients` -> `Open Client Context` only if assigned-client context is clear;
- `Open Account Settings` can remain as-is.

Labels that should wait:

- `Open My Work` should wait until a command target can open a true My Work dashboard/workbench or
  approved profile-aware destination;
- `Open Needs Revisions` and `Open Due Soon` should wait for route/filter semantics.

#### `review_queue`

Priority intent:

- review work and review schedule first;
- support/admin surfaces stay available but secondary when permissioned.

Recommended first ordering from existing visible commands:

1. `orders`;
2. `calendar`;
3. `clients`;
4. `assignments`;
5. `relationships`;
6. `users`;
7. `settings`;
8. `notif`.

Later role-native label candidates:

- `Go to Orders` -> `Open Review Work` only after the command can target review-scoped context
  safely;
- `Go to Calendar` -> `Open Review Calendar`;
- `Open Account Settings` can remain as-is.

Labels that should wait:

- `Open Review Queue`, `Open In Review`, and `Open Resubmitted Work` should wait until those
  commands can target a real review queue surface or approved filtered route;
- review action commands such as `Request Revisions` or `Clear Review` must wait for governed
  action availability.

#### `received_work`

Priority intent:

- assignment-recipient received work first;
- account/support commands after received work;
- do not imply canonical order, client, calendar, or team access from shell profile metadata.

Recommended first ordering from existing visible commands:

1. `assignments`;
2. `orders` only if already permissioned through existing command availability;
3. `calendar` because it is currently command-visible and route guards remain authority;
4. `clients` only if already permissioned;
5. `relationships` only if already permissioned;
6. `users` only if already permissioned;
7. `settings`;
8. `notif`.

Later role-native label candidates:

- `Go to Assignments` -> `Open Received Work` when the command profile is explicitly
  `received_work`;
- `Open Account Settings` can remain as-is.

Labels that should wait:

- `Open Offers`, `Open Active Work`, `Open Submitted Work`, and `Open Completed Work` should wait
  for route/filter targets;
- `Open Work Request` should wait for a selected object context or search result, not a generic
  top-level command.

#### Fallback Profiles

Fallback profiles include:

- `unavailable`;
- `company_required`;
- `membership_inactive`;
- `profile_ambiguous`;
- `module_unavailable`;
- unknown profile ids.

Recommended behavior:

- keep current command order;
- keep current command labels;
- keep current loading/error fallback behavior;
- do not add profile-specific command claims;
- do not expose future or disabled module commands.

#### `requests`

`requests` remains future-only.

Recommended behavior:

- do not introduce Requests, Documents, Reports, Messages, or Client Portal commands in the live
  internal command palette;
- define future command priority only after Client Portal routes, authority, and client-safe data
  projections exist.

Future command examples after portal authority exists:

- `Open Requests`;
- `Open Action Needed`;
- `Open Documents`;
- `Open Reports`;
- `Open Messages`.

### Ordering Versus Labels Versus Actions

#### First: Reorder Existing Visible Commands

The safest first runtime command slice should reorder only existing visible command definitions
after permission filtering.

Rules:

- start from `getCurrentCommandPaletteCommands(...)`;
- keep the same command ids;
- keep the same command labels;
- keep the same paths;
- keep the same hints;
- keep the same filtering behavior;
- keep the same keyboard behavior;
- keep the same order-search fallback behavior;
- append any unprioritized visible commands in their current relative order;
- fallback, future, loading, error, and unknown profile states keep current command order.

#### Later: Group Labels

Command group labels may be useful later, but should not be first.

Reasoning:

- current palette is compact;
- grouping changes keyboard scanning and visual density;
- role-priority ordering is easier to prove without changing filtering, selection index behavior,
  or command execution.

#### Later: Role-Native Aliases

Role-native aliases should be separate from command relabeling.

Potential future aliases:

- `Open My Work` as an alias for a profile-aware dashboard/workbench entry;
- `Open Review Queue` as an alias for an approved review queue destination;
- `Open Received Work` as an alias for assignments in `received_work` profile;
- `Open Team Access` already exists and can remain stable.

Aliases should not change permission availability or route authority.

#### Later: Quick-Action Commands

Quick-action commands must wait.

Blocked examples:

- `Submit to Review`;
- `Resubmit to Review`;
- `Request Revisions`;
- `Clear Review`;
- `Accept Offer`;
- `Decline Offer`;
- `Submit Work`;
- `Send Assignment`;
- `Create Client Request`.

These require governed workflow action contracts, object context, permission checks, audit logging,
error handling, and rollback behavior. They are not command-priority metadata.

### Safest First Runtime Slice

The safest first runtime command slice is **R8B Passive Command Priority Metadata And Tests**.

R8B scope:

- add inert command-priority metadata keyed by shell profile id;
- reference existing command ids only;
- include active profile priority lists for `operations`, `my_work`, `review_queue`, and
  `received_work`;
- include fallback profile records that preserve current order;
- include `requests` as future-only metadata with no live command ids beyond existing internal
  commands if needed for safe fallback;
- add tests proving every referenced command id exists;
- add tests proving metadata is `presentation_only`;
- add tests proving metadata contains no permission keys, route guards, query contracts, workflow
  action ids, Client Portal route assumptions, or backend behavior.

R8B must not:

- import shell profile metadata into `CommandPalette`;
- reorder live commands;
- change command labels;
- add command groups;
- add aliases;
- add quick actions;
- change command availability;
- change command filtering, search fallback, keyboard behavior, or execution;
- change routes, permissions, navigation, DashboardGate, dashboards, backend/Supabase/query/
  workflow behavior, shell switching, or Client Portal behavior.

### R8A Conclusions

- Command palette should become role-prioritized, but remain broader than navigation.
- The first command runtime dependency should be passive priority metadata, not live ordering.
- The first live behavior change after metadata should reorder existing visible commands only.
- Role-native labels and aliases should wait until their target routes/workbenches are explicit.
- Quick-action commands must wait for governed workflow action contracts and object context.

## Recommended Next Slice

Proceed with **Falcon Role-Centric Operational Shell Architecture Phase R8B: Passive Command
Priority Metadata And Tests**.

R8B should add inert profile-aware command priority metadata for existing command ids only. It
should not change live command palette behavior, labels, ordering, availability, search fallback,
keyboard behavior, routes, permissions, navigation, DashboardGate, dashboards,
backend/Supabase/query/workflow behavior, shell switching, or Client Portal implementation.

## Shell Resolution Phase R8B Passive Command Priority Metadata And Tests

Phase R8B adds inert profile-aware command priority metadata for existing command palette command
ids only.

Runtime files added:

- `src/lib/commandPalette/shellCommandPriority.js`.

Focused tests added:

- `src/lib/commandPalette/__tests__/shellCommandPriority.test.js`.

R8B changes:

- adds a passive `shellCommandPriority` metadata registry keyed by shell profile id;
- defines command priority statuses: `active`, `fallback`, and `future`;
- covers active profiles `operations`, `my_work`, `review_queue`, and `received_work`;
- covers fallback profiles `unavailable`, `company_required`, `membership_inactive`,
  `profile_ambiguous`, and `module_unavailable`;
- includes `requests` as future-only command priority metadata;
- references existing current command palette ids only;
- includes optional non-runtime priority groups and future alias notes;
- exports `getShellCommandPriority(...)`, `shellCommandPriorityByProfileId`,
  `SHELL_COMMAND_PRIORITY_PROFILE_IDS`, and stable entries for tests;
- freezes entries, groups, and arrays in the same read-only style as shell and navigation
  metadata.

R8B active priority metadata:

- `operations`: `orders`, `calendar`, `assignments`, `clients`, `relationships`, `users`,
  `settings`, `notif`;
- `my_work`: `orders`, `calendar`, `clients`, `settings`, `notif`, `assignments`,
  `relationships`, `users`;
- `review_queue`: `orders`, `calendar`, `clients`, `settings`, `notif`, `assignments`,
  `relationships`, `users`;
- `received_work`: `assignments`, `settings`, `notif`, `orders`, `calendar`, `clients`,
  `relationships`, `users`.

R8B fallback and future metadata:

- fallback profiles keep the current command palette order as metadata;
- unknown profiles return `null`;
- `requests` is future-only and does not create live Requests, Documents, Reports, Messages, or
  Client Portal command ids.

R8B preserves:

- `currentCommandRegistry` behavior;
- `getCurrentCommandPaletteCommands(...)` output;
- `getCurrentOrderSearchFallback(...)` behavior;
- `CommandPalette` rendering, filtering, keyboard behavior, command execution, placeholder copy,
  and no-result behavior;
- command labels, hints, paths, and availability;
- route paths, route guards, permission keys, permission checks, navigation behavior,
  `DashboardGate`, dashboards, backend/Supabase/query/workflow behavior, RLS/RPCs, object
  visibility, shell switching, Client Portal behavior, branding, and production data.

R8B deliberately does not:

- import shell command priority metadata into `CommandPalette`;
- reorder live commands;
- change labels;
- add command groups;
- add aliases;
- add quick-action commands;
- change search fallback;
- change command filtering or keyboard selection;
- change command execution.

R8B test coverage proves:

- every shell command priority record is `presentation_only`;
- every shell profile metadata id has exactly one command priority record;
- every referenced command id exists in the current live command palette command ids;
- metadata includes no permission keys, route guards, visibility gates, workflow action ids, or
  authority fields;
- active profile priority order matches the R8A plan;
- fallback profiles keep current command order;
- future `requests` metadata does not invent Client Portal route or command ids;
- workflow/action command ids and order-search fallback are not visible priority ids;
- all metadata entries, groups, and arrays are frozen/read-only.

### R8B Conclusions

- Falcon now has passive profile-aware command priority metadata.
- The metadata is suitable for future command ordering tests and implementation planning.
- No live command palette behavior changed.
- The next command slice should plan how to consume this metadata safely before any runtime command
  ordering change.

## Recommended Next Slice

Proceed with **Falcon Role-Centric Operational Shell Architecture Phase R8C: Command Priority
Consumption Readiness Plan**.

R8C should plan how `CommandPalette` can safely consume passive command priority metadata later. It
should not reorder live commands, change labels, add aliases, add command groups, change search or
keyboard behavior, alter routes, permissions, navigation, DashboardGate, dashboards,
backend/Supabase/query/workflow behavior, shell switching, or Client Portal implementation.

## Shell Resolution Phase R8C Command Palette Priority Render Readiness Plan

Phase R8C plans how Falcon can safely consume passive command priority metadata in the live command
palette later. This phase is documentation and planning only.

### R8C Sources Inspected

R8C inspected:

- `src/components/nav/CommandPalette.jsx`;
- `src/lib/commandPalette/currentCommandPaletteCommands.js`;
- `src/lib/commandPalette/currentCommandRegistry.js`;
- `src/lib/commandPalette/shellCommandPriority.js`.

### Current Command Palette Flow

Current command palette flow:

1. `CommandPalette` reads effective permission state through `useEffectivePermissions()`.
2. It builds command permission inputs from the existing command permission key list.
3. `getCurrentCommandPaletteCommands(...)` returns available commands from the current registry.
4. Loading and error states use the existing legacy fallback command list.
5. `getCurrentOrderSearchFallback(...)` separately resolves whether order search fallback is
   available.
6. `CommandPalette` filters the available command list by typed text against command labels.
7. Arrow keys move through the filtered list.
8. Enter navigates to the selected command, searches Orders when no command matches and order
   search fallback is allowed, or closes the palette.

Current command priority is therefore a flat registry/helper order, not shell-aware.

### Render Readiness Decision

The first live command priority render should reorder existing visible commands only after command
availability has already been resolved.

Required ordering sequence:

1. Resolve command availability through existing permission/loading/error logic.
2. Resolve passive shell profile presentation metadata.
3. Look up passive command priority metadata for that profile.
4. Intersect priority metadata with the already available command ids.
5. Append any available commands missing from metadata in their current relative order.
6. Render the resulting flat command list.

The priority step must not:

- inspect permission keys directly;
- call route guards;
- fetch data;
- change command ids;
- change labels;
- change paths;
- change hints;
- add aliases;
- add workflow actions;
- change order-search fallback.

### Search Behavior Decision

Role priority should first affect the default open state when the search query is empty.

Search query behavior should remain conservative:

- filtering should still match current command labels;
- no fuzzy ranking, aliases, or hidden keywords should be introduced in the first live ordering
  slice;
- when a query is active, filtered results may preserve the order of the already priority-ordered
  available command list, but search relevance should not become profile-specific yet;
- no-result behavior should remain unchanged;
- order-search fallback should remain unchanged.

This means the safest first live behavior is:

- empty query: show profile-prioritized visible commands;
- active query: filter those commands by the current label-match behavior, without adding aliases,
  new relevance ranking, or route-specific search behavior.

### Fallback Behavior

Fallback behavior should stay non-surprising:

- unknown profiles keep current command order;
- fallback profiles keep current command order;
- future profiles keep current command order;
- loading and error states keep the current legacy fallback command order;
- if shell profile exposure is unresolved or null, keep current command order;
- commands not present in active profile priority metadata remain visible after prioritized
  commands in their current relative order.

### Component Consumption Boundary

The first live consumption slice may let `CommandPalette` observe shell profile metadata directly,
but only as passive presentation input.

Recommended near-term approach:

- import `useShellProfile()` in `CommandPalette` only when the live ordering slice is approved;
- derive `profileId` from passive shell profile exposure;
- pass `commands` and `profileId` to a pure helper;
- keep `getCurrentCommandPaletteCommands(...)` unchanged;
- keep `getCurrentOrderSearchFallback(...)` unchanged;
- keep command filtering, keyboard handling, and execution unchanged.

Alternative later approach:

- pass shell profile presentation down from `TopNav` to `CommandPalette`.

Why not first:

- `CommandPalette` already owns command permission resolution;
- a pure helper plus passive hook mirrors the R7D/R7F navigation pattern;
- prop drilling from `TopNav` would not improve authority boundaries for the first ordering slice.

### Profile-Specific Render Rules

Operations:

- prioritize order, calendar, and assignment commands when visible;
- keep clients, relationships, Team Access, account settings, and notification settings available;
- settings and notification commands should stay toward the bottom unless searched.

My Work:

- prioritize order, calendar, and client context commands when visible;
- keep assignment, relationship, Team Access, account settings, and notification settings available
  when permissioned;
- do not rename `Go to Orders` to `Open My Work` in this slice.

Review Queue:

- prioritize order, calendar, and client context commands when visible;
- keep secondary permissioned commands available;
- do not rename `Go to Orders` to `Open Review Queue` in this slice.

Received Work:

- prioritize `assignments` only if it is already visible from existing permission filtering;
- keep account/settings commands available when visible;
- keep any other visible commands available after received-work/account commands;
- do not create internal order, client, calendar, relationship, or Team Access commands from
  profile metadata.

Fallback, unknown, future:

- keep current command order.

### Safest First Runtime Slice

The safest first runtime command render slice is **R8D Command Palette Priority Ordering From
Visible Commands**.

R8D scope:

- add a pure helper that accepts already available command definitions and a shell profile id;
- use `getShellCommandPriority(profileId)` only to order existing commands;
- return the same command objects;
- preserve command ids, labels, paths, hints, gates, status, and metadata authority;
- append unprioritized visible commands in current relative order;
- keep unknown, fallback, future, loading, error, and unresolved profiles in current command order;
- import/use shell profile exposure in `CommandPalette` only as passive presentation metadata;
- apply priority ordering before current label filtering;
- keep current filtering, selection index behavior, Enter behavior, order-search fallback,
  placeholder copy, and no-result copy unchanged;
- add tests proving visible command ids are unchanged and only order changes for active profiles.

R8D must not:

- change `currentCommandRegistry`;
- change `getCurrentCommandPaletteCommands(...)`;
- change `getCurrentOrderSearchFallback(...)`;
- change command labels;
- add aliases;
- add command group labels;
- add quick actions;
- change search matching or search fallback;
- change keyboard handling;
- change command execution;
- change routes, permissions, navigation, DashboardGate, dashboards, backend/Supabase/query/
  workflow behavior, shell switching, or Client Portal behavior.

### R8C Conclusions

- Command priority rendering should be downstream of existing permission-filtered command
  availability.
- The first live render should reorder only already available commands.
- Role priority should primarily affect the empty-query default command list.
- Active search should keep current label filtering and order-search fallback behavior.
- Settings and notification commands should remain lower priority unless searched.
- `received_work` should prioritize Assignments only when that command is already visible.

## Recommended Next Slice

Proceed with **Falcon Role-Centric Operational Shell Architecture Phase R8D: Command Palette
Priority Ordering From Visible Commands**.

R8D should add a pure command-ordering helper and use passive shell profile exposure in
`CommandPalette` only to reorder already available commands. It should preserve command
availability, labels, paths, search fallback, filtering, keyboard behavior, execution, routes,
permissions, navigation, DashboardGate, dashboards, backend/Supabase/query/workflow behavior,
shell switching, and Client Portal behavior.

## Shell Resolution Phase R8D Command Palette Priority Ordering From Visible Commands

Phase R8D applies shell-aware command priority ordering to the command palette default list using
only already available command objects.

Runtime files added:

- `src/lib/commandPalette/currentShellCommandPaletteCommands.js`.

Runtime files updated:

- `src/components/nav/CommandPalette.jsx`.

Focused tests added or updated:

- `src/lib/commandPalette/__tests__/currentShellCommandPaletteCommands.test.js`;
- `src/components/nav/__tests__/CommandPalette.test.jsx`.

R8D changes:

- adds `getCurrentShellCommandPaletteCommands(...)`, a pure helper that accepts visible command
  objects and a shell profile id;
- the helper uses passive `shellCommandPriority` metadata only to reorder commands that already
  exist in the visible command list;
- the helper returns the same command objects with ids, labels, paths, hints, gates, statuses, and
  metadata authority intact;
- unknown, fallback, and future profiles return current command order;
- commands not represented by priority metadata remain visible after prioritized commands in their
  current relative order;
- `CommandPalette` observes `useShellProfile()` only as passive presentation metadata;
- `CommandPalette` applies shell priority only when permission loading/error states are not active;
- empty-query command lists use profile-prioritized command order;
- active search queries continue to filter the original current-order command list by label.

R8D ordering behavior:

- `operations` prioritizes Orders, Calendar, Assignments, Clients, Relationships, Team Access,
  Account Settings, and Notification Settings;
- `my_work` and `review_queue` use the passive priority metadata for role-relevant default order;
- `received_work` prioritizes Assignments only when the command is already visible, then account
  and notification settings when visible, then other already visible commands;
- unknown, fallback, future, loading, error, and unresolved profile states keep current command
  order.

R8D preserves:

- command availability;
- command labels;
- command paths;
- command hints;
- command object identity;
- command filtering for active search queries;
- order-search fallback behavior;
- no-result behavior;
- keyboard selection behavior;
- command execution behavior;
- current command registry behavior;
- `getCurrentCommandPaletteCommands(...)` output;
- `getCurrentOrderSearchFallback(...)` behavior;
- navigation behavior, route paths, route guards, permission keys, permission checks,
  `DashboardGate`, dashboards, backend/Supabase/query/workflow behavior, RLS/RPCs, object
  visibility, shell switching, Client Portal behavior, branding, and production data.

R8D deliberately does not:

- add command group labels;
- add aliases;
- rename commands;
- add workflow/action commands;
- add Client Portal commands;
- change placeholder copy;
- change search matching;
- change search fallback;
- change route targets.

R8D test coverage proves:

- operations-profile default empty-query commands are shell-prioritized;
- received-work profile prioritizes Assignments only when that command is already visible;
- unknown profiles preserve current command order;
- active search query results preserve current label filtering and current command order;
- metadata-only ids do not create commands;
- commands outside priority metadata retain current relative order;
- command click execution still navigates to the existing command target;
- existing order-search fallback behavior remains unchanged.

### R8D Conclusions

- Falcon now applies shell-aware command priority ordering to the default command palette list.
- Ordering happens after command availability and permission filtering.
- Search, labels, routes, execution, keyboard behavior, and fallback search remain unchanged.
- Command priority remains presentation-only and does not become authority.

## Recommended Next Slice

Proceed with **Falcon Role-Centric Operational Shell Architecture Phase R8E: Command Palette Copy
And Alias Readiness Plan**.

R8E should audit which command labels or aliases can safely become role-native after priority
ordering. It should not change command availability, routes, permissions, search fallback,
keyboard behavior, execution, workflow behavior, navigation, DashboardGate, dashboards, shell
switching, or Client Portal implementation.
