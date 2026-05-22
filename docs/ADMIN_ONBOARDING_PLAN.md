# Admin Onboarding Plan

## Purpose

Falcon should make first-owner, company, and team setup easier to understand without weakening the
company-scoped governance model. This plan designs the first governed admin/company onboarding and
setup UX improvements before implementation.

This is a planning document. It does not change runtime behavior, permissions, RLS, RPCs, routes,
Team Access, invitation behavior, onboarding automation, backend state, Supabase state, or Vercel
configuration.

Related doctrine:

- `docs/OPERATIONAL_GOVERNANCE_SNAPSHOT.md`
- `docs/PRODUCTION_READINESS_AUDIT.md`
- `docs/PRODUCTION_BOOTSTRAP_PLAN.md`
- `docs/PRODUCTION_SMOKE_TEST_CHECKLIST.md`
- `docs/STAGING_COMPANY_SCOPE_MIGRATION_PLAN.md`
- `docs/NEXT_PHASE_EXECUTION_PLAN.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

## Onboarding / Setup Goals

- Smoother first-owner setup after login.
- Easier company and user onboarding for owner/admin users.
- Reduced manual configuration uncertainty during setup and production bootstrap.
- Clearer operational readiness signals before a company relies on daily workflows.
- Safer role and permission setup that explains current access without bypassing backend
  authority.

The first onboarding work should help an owner/admin answer:

- Is my company context active?
- Have the required owner/admin and team roles been configured?
- Are invitations and Team Access ready?
- Are core operational surfaces ready for orders, documents, workflow, notifications, and saved
  views?
- Which setup items are advisory versus required blockers?

## Current Foundation

Falcon already has the core governance foundation needed for a cautious onboarding/readiness
surface:

- Company-scoped memberships and current-company context are the runtime isolation model.
- Team Access provides the current user/member management surface.
- The permission system and template roles define operational access rather than ad hoc frontend
  flags.
- Owner/admin hierarchy exists as the management authority model.
- Invitation infrastructure supports company member onboarding through approved Edge/RPC paths.
- Current user and current company app context are available through governed backend helpers.
- Production readiness, migration replay, bootstrap, environment parity, and smoke-test documents
  define manual setup expectations for clean production cutover.

Existing Owner Setup and Team Access behavior should be treated as the starting point. The next
slice should improve clarity and readiness visibility before adding any setup automation.

## Candidate Onboarding / Setup Surfaces

### First-Login Owner Checklist

An owner-facing checklist could summarize first-run items such as company profile review, Team
Access setup, first invite, order workflow readiness, documents readiness, and production smoke
status where relevant.

This should be advisory at first and should not block normal navigation unless a backend-required
company context or membership is missing.

### Company Setup Checklist

A company setup checklist could show whether core company-scoped prerequisites are present:

- current company resolved;
- owner/admin membership active;
- at least one owner/admin role assignment present;
- Team Access route reachable;
- invitations configured;
- order create/read/edit paths available to the current owner/admin;
- document storage/functions expected to be available in the target environment;
- notification and saved-view RPC surfaces available.

### Invite-Team Flow Polish

Team onboarding could be improved by making invite status, resend/cancel affordances, and role
assignment expectations easier to scan from the existing Team Access surface.

The first design should polish visibility around existing invitation paths rather than inventing new
member lifecycle writes.

### Missing Configuration Indicators

Readiness indicators could call out missing or incomplete setup such as no current company, missing
owner/admin membership, no team members, missing document readiness, missing invitation config, or
permission catalog/grant mismatches in production smoke contexts.

Indicators should be explicit about whether a missing item is a blocker, warning, or optional
future improvement.

### Role / Permission Summaries

Owner/admin users could see compact summaries of what each company role is intended to do. The
first pass should be explanatory and read-only, using existing permission/role data where already
available.

Do not add frontend role editing shortcuts outside the existing Team Access governed paths.

### Onboarding Progress States

Progress states could group setup into `Not started`, `Needs attention`, `Ready enough`, and
`Complete` labels. These labels should be derived from already authorized setup context and should
not become hidden authorization gates.

### Operational Readiness Checks

Readiness checks could summarize whether core operational surfaces are configured enough for daily
use:

- Orders list/detail;
- workflow transitions;
- lifecycle archive/cancel/void availability where intentionally granted;
- secure document upload/download/archive;
- activity timeline;
- notifications;
- saved views;
- dashboard KPIs and workload visibility;
- Historical Orders and Print Packet read surfaces.

The first pass should link to existing docs/manual smoke expectations where appropriate and avoid
running destructive or mutation-heavy checks automatically.

## Operational Readiness Checklist Design

Admin Onboarding Slice 1B narrows the first onboarding implementation target to a lightweight
operational readiness checklist.

### Candidate Readiness Checks

| Check | Initial Meaning | First Category | Future Category |
|---|---|---|---|
| Owner account exists | Current authenticated user resolves to an app user with active owner/admin company access. | Warning / attention state if missing | Future automated validation |
| Company profile configured | Company identity fields are present enough for operational display and external-facing packet context. | Read-only informational | Future onboarding automation if profile completion is productized |
| At least one appraiser/reviewer/admin added | Team has at least one operational user beyond the first owner/admin, or clearly shows that staffing is incomplete. | Warning / attention state | Future automated validation |
| Team Access reachable | Owner/admin can navigate to the existing Team Access surface. | Read-only informational | Future automated validation |
| Permission seeds verified | Permission catalog and role grants are expected to exist in the target environment. | Read-only informational when inferred from current access | Future automated validation |
| Storage/document system configured | Document upload/download/archive dependencies are expected to be available in the target environment. | Warning / attention state if not verifiable | Future automated validation |
| Order workflow operational | Active order workflow actions are expected to run through governed transition RPCs. | Read-only informational | Future automated validation |
| Dashboard metrics operational | Dashboard KPI surfaces load active operational metrics for the current company. | Read-only informational | Future automated validation |
| Saved views available | Saved Views can list/apply/save/delete through RPC-owned paths. | Read-only informational | Future automated validation |
| Historical orders accessible | Historical Orders readback is available for preserved lifecycle records. | Read-only informational | Future automated validation |
| Print packet operational | Order Detail Print Packet renders read-only operational packet content. | Read-only informational | Future automated validation |

### Readiness State Categories

- **Read-only informational**: displays already known or already authorized state without claiming
  the system is fully configured.
- **Warning / attention state**: highlights missing or incomplete setup that may affect daily
  operation, without blocking navigation or creating hidden enforcement.
- **Future automated validation**: a candidate for later backend-verified checks, route smoke, or
  environment validation once a governed signal exists.
- **Future onboarding automation**: a candidate for later guided actions or setup writes, only after
  a separate backend-owned mutation design.

### Recommended MVP

The MVP should be a lightweight read-only checklist card.

MVP behavior:

- show a compact list of setup/readiness items;
- distinguish informational items from attention items;
- link to existing governed surfaces such as Team Access, Orders, dashboard, Historical Orders,
  and production smoke documentation where useful;
- avoid blocking wizard behavior;
- avoid automated enforcement;
- avoid hidden setup actions;
- avoid backend onboarding automation;
- avoid permission changes or permission-editing shortcuts.

The checklist should be a confidence and orientation aid, not an authorization layer.

### Checklist Governance Rules

- The checklist must reflect actual governed system state only.
- Do not show fake readiness assumptions when a signal is not available.
- Missing signals should be labeled as not yet verified or deferred, not silently treated as pass.
- Viewing the checklist must not mutate company, user, invitation, order, document, notification,
  saved-view, dashboard, or workflow state.
- No hidden permission escalation or role repair is allowed.
- Any future automated validation must use approved read/RPC paths and preserve company scope/RLS.
- Any future onboarding automation must receive a dedicated backend-owned design before
  implementation.

### Future Extension Ideas

- Onboarding completion percentage.
- Guided setup flows.
- Role-specific onboarding for owner/admin, appraiser, reviewer, and support roles.
- Client onboarding readiness.
- AMC/vendor onboarding readiness.
- Environment-aware production readiness checks.
- Checklist evidence capture for production cutover rehearsals.

## Readiness Data Shape Audit

Admin Onboarding Slice 1C audits existing governed read paths before checklist implementation.

### Existing Read Sources

Current company context:

- `useCurrentUserAppContext()` calls `rpc_current_user_app_context`.
- Available fields include `user_id`, `current_company_id`, `company_name`, `company_slug`,
  `has_current_company_membership`, display identity fields, role assignments, role keys,
  `primary_role_key`, and role booleans such as `is_owner`, `is_admin_role`, `is_reviewer_role`,
  and `is_appraiser_role`.

Current user permissions:

- `useEffectivePermissions()` calls `current_app_user_permission_keys`.
- It returns the effective permission key list for the authenticated current app user context.
- This can show that the current user has specific permissions, but it does not prove every seed,
  grant, template role, or future role configuration is globally correct.

Company setup context:

- `useCompanySetupContext()` calls `rpc_company_setup_context`.
- Normalized fields include company identity/status, timezone/locale,
  `active_company_context_valid`, `profile_complete`, `owner_invariant_ok`,
  `active_owner_count`, `active_member_count`, `active_role_assignment_count`,
  `role_presets_ready`, `owner_role_ready`, readiness objects, `setup_complete`,
  `setup_blockers`, and backend-provided `checklist`.
- The existing frontend `resolveCompanyReadiness(...)` derives diagnostic-only readiness items for
  setup context, company profile, owner presence, owner active membership, role presets, owner role
  assignment, bootstrap audit, dashboard projection, invitation pipeline, relationship summary,
  assignment summary, staff readiness, and explicitly unknown setup keys.

Team Access / users:

- `listCompanyMembers(...)` calls `rpc_company_member_list`.
- Team Access route `/users` is guarded by `PERMISSIONS.USERS_READ`.
- Invitation reads use `rpc_company_member_invitations_list`; invite send/resend continue through
  existing Edge Function paths.

Document/storage readiness:

- Order document reads are order-scoped through `listOrderDocuments(orderId)` /
  `rpc_order_documents_list(p_order_id)`.
- Upload/download/archive behavior exists through order document RPCs and Edge Functions, but there
  is no general setup/readiness read that proves the bucket, policies, secrets, and functions are
  configured for the current environment before an actual document flow is exercised.

Dashboard KPI availability:

- `useDashboardSummary(...)` derives dashboard state from current app context, order summary, and
  `useDashboardKpis(...)`.
- `fetchDashboardKpis(...)` counts rows from `v_orders_active_frontend_v4` with role-aware scoping.
- A zero-order dashboard can be valid; no orders should not be treated as setup failure.

Saved Views availability:

- `listOrderSavedViews()`, `createOrderSavedView(...)`, `updateOrderSavedView(...)`, and
  `deleteOrderSavedView(...)` call the saved-view RPCs only.
- Listing saved views can prove the RPC surface is reachable for the current user/company, but an
  empty result is valid and should not be treated as failure.

Historical Orders readback:

- `/orders/historical` calls `listHistoricalOrders(...)`, which uses existing order read filters
  with explicit `includeArchived: true` and `includeRetiredLifecycle: true`.
- The route/readback is a runtime surface, not a setup context signal. No historical orders is a
  valid result for a new company.

Print Packet availability:

- `OrderDetail` opens `OrderPrintPacket` from an already loaded authorized order and calls browser
  print.
- Availability depends on an accessible Order Detail record; there is no standalone setup read that
  proves print packet behavior before an order exists.

### Readiness Check Data Categorization

| Readiness Check | Current Data Availability | Recommended Treatment |
|---|---|---|
| Owner account exists | Available from existing frontend state plus `rpc_current_user_app_context` and `rpc_company_setup_context` owner fields. | Show now from current app/setup context. |
| Company profile configured | Available from existing setup read API through company identity fields and `profile_complete`. | Show now from setup context. |
| At least one appraiser/reviewer/admin added | Partially available from `active_member_count`; role-specific staff composition requires member list inspection or a new derived read. | Show generic staff count now; require new read helper for role-specific truth. |
| Team Access reachable | Available from existing frontend permissions and route guard via `PERMISSIONS.USERS_READ`; member list availability comes from `rpc_company_member_list`. | Show link/permission state now; member-list verification can be a later read check. |
| Permission seeds verified | Partially available from setup context (`role_presets_ready`, `owner_role_ready`) and current effective permissions. | Do not claim full seed verification; mark as inferred/needs backend validation. |
| Storage/document system configured | No general readiness signal exists; order-scoped document RPCs and Edge flows exist. | Defer/manual only until a backend validation or smoke evidence source exists. |
| Order workflow operational | Permission keys and workflow UI/RPCs exist, but no setup read proves transition health. | Mark as informational or future automated validation; do not claim operational until smoke-tested. |
| Dashboard metrics operational | Available from existing dashboard read hooks when dashboard route loads; zero counts can be valid. | Show route/read availability only; do not treat empty metrics as failure. |
| Saved views available | Available from existing saved-view list RPC wrapper if invoked. | Show as future read helper or optional live check; empty list is valid. |
| Historical orders accessible | Available through existing route/read helper if invoked. | Show route/read availability only; no historical rows is valid. |
| Print packet operational | Available only after an authorized Order Detail is loaded. | Defer/manual unless a known test order exists; do not require orders for setup readiness. |

### MVP Checklist Fields Truthful Now

The first implementation can truthfully show:

- current company resolved;
- current company membership valid;
- company profile configured;
- owner invariant present;
- active owner count;
- active member count;
- active role assignment count;
- role presets ready;
- owner role assignment ready;
- current user's owner/admin/appraiser/reviewer role labels;
- current user's effective permission count or selected permission affordance states;
- Team Access link availability based on `users.read`;
- dashboard projection/readiness signal already present in setup context;
- setup blockers and checklist entries already returned by `rpc_company_setup_context`;
- unknown/deferred setup signals explicitly labeled as not verified.

The MVP should not require a company to already have orders, historical orders, saved views,
uploaded documents, or additional staff beyond the first owner unless product policy later makes
those items required.

### Unsafe Assumptions To Avoid

- Do not claim storage is configured unless a backend validation, environment checklist, or actual
  document smoke flow proves it.
- Do not claim permissions are fully seeded unless backend validation verifies the catalog, grants,
  template roles, and role assignments.
- Do not infer company readiness from mere login. Login proves authentication only, not
  current-company membership, owner role assignment, or operational readiness.
- Do not treat lack of orders as failure. New companies can be ready before their first order.
- Do not treat an empty saved-view list as failure.
- Do not treat an empty Historical Orders list as failure.
- Do not infer print packet readiness unless an authorized order detail can load.
- Do not infer workflow readiness from visible buttons alone; backend transition authorization and
  smoke validation remain authoritative.

## Operational Readiness Card Foundation

Admin Onboarding Slice 1D implements the first lightweight read-only operational readiness card on
the dashboard for owner/admin users.

Implemented behavior:

- compact dashboard secondary section labeled `Operational Readiness`;
- owner/admin-visible only through the existing dashboard role summary;
- uses existing governed read state only;
- advisory/read-only labels only;
- no onboarding automation;
- no hidden setup actions;
- no mutation controls;
- no completion percentage or fake readiness score;
- neutral treatment for unknown or optional states.

Initial checks:

- current company loaded from current app context;
- owner/admin access confirmed from dashboard summary role state;
- Team Access reachable from `users.read` permission state;
- at least one additional member exists from existing setup context active-member count;
- dashboard KPI system operational from loaded dashboard state;
- Historical Orders reachable from existing order-read permission state;
- Saved Views available from existing Orders surface availability;
- Print Packet available from authorized Order Detail when an order exists, otherwise neutral.

The card intentionally does not claim that storage/document configuration, permission seed
completeness, workflow health, or production readiness are fully validated. Those remain backend
validation or manual smoke checklist concerns.

## Operational Readiness Foundation Closeout

Admin Onboarding Slice 1E locks the first Operational Readiness card foundation as complete for the
current product scope.

Locked foundation:

- owner/admin-only dashboard card;
- read-only and advisory only;
- uses existing governed read state only;
- shows current company context;
- shows owner/admin access;
- shows Team Access reachability;
- shows additional-member readiness as optional/neutral when solo-owner;
- shows dashboard KPI read-path readiness;
- shows Historical Orders reachability;
- shows Saved Views availability from the Orders surface;
- shows Print Packet availability from authorized Order Detail when an order exists;
- keeps unknown and optional states neutral;
- has no completion score, percentage, gamification, or readiness grade;
- has no guided wizard or onboarding automation;
- has no mutation buttons or hidden setup actions;
- adds no backend, permission, RLS, storage, Edge Function, Supabase, or Vercel changes.

Closeout guardrails:

- The readiness card must not claim unverified production readiness.
- The readiness card must not claim storage/document system readiness unless a future backend or
  smoke-validation signal exists.
- The readiness card must not claim permission seed completeness from current-user permissions
  alone.
- The readiness card must not perform hidden setup actions.
- The readiness card must not escalate permissions, repair roles, invite users, create orders,
  create saved views, mutate documents, or alter workflow/lifecycle state.
- The readiness card must not become a blocking onboarding flow until a separate guided setup
  design explicitly approves that behavior.
- Empty orders, empty saved views, empty Historical Orders, and solo-owner operation remain valid
  neutral states.

## Team Access UX Planning

Admin Onboarding Slice 2A plans the next Team Access onboarding/admin UX improvements before
implementation.

### Current Team Access Foundation

- Team Access lists company members through governed company member RPCs.
- Member role/status mutations already route through approved Team Access APIs/RPCs.
- Invitation infrastructure exists through invitation prepare/finalize/list/cancel/resend RPC and
  Edge Function paths.
- Owner/admin hierarchy is backend-governed through company membership, role assignment, and
  permission checks.
- Route access is permission-based through `users.read`.
- The company-scoped membership model remains the authority for who participates in a company.
- Existing Team Access and invitation surfaces must remain the write paths for member/role/invite
  behavior.

### Team Access UX Goals

- Make it obvious who currently has access to the company.
- Clarify each person's role/function without exposing raw permission internals as the primary UI.
- Show invitation and member status clearly.
- Reduce owner/admin uncertainty about pending invites, inactive members, and active team members.
- Support onboarding without permission confusion or accidental role escalation.
- Keep role and permission authority backend-owned and explain frontend state as display only.

### Candidate Improvements

- Clearer member status chips for active, inactive, invited, pending, cancelled, expired, or failed
  states where those states are already available.
- Role summary cards that describe owner/admin/appraiser/reviewer functions in plain operational
  language.
- Separate or visually grouped invited versus active member sections.
- Permission summary display that stays high-level and avoids implying frontend authority.
- `Next step` copy for pending invites, such as resend, wait for acceptance, or cancel if wrong.
- Owner/admin explanatory help text describing who can manage access and why backend permissions
  remain authoritative.
- Safer empty states for solo-owner companies and companies with no pending invites.

### Team Access Governance Rules

- No permission redesign.
- No hidden role escalation.
- All mutations remain through existing approved Team Access and invitation paths.
- No direct `users`, `company_memberships`, role assignment, role permission, or invitation table
  writes from frontend code.
- Company scope remains authoritative for all lists and actions.
- Owner/admin hierarchy remains backend-governed.
- Status chips and summaries are explanatory only and must not become authorization sources.
- Invitation copy must not imply that access exists before backend acceptance/finalization.

### Recommended First Team Access Implementation

The first Team Access implementation should be read-only/status clarity polish:

- improve existing status chips and labels;
- make active members and pending/invited members easier to distinguish;
- add concise owner/admin help text;
- add safer solo-owner and no-invitation empty states;
- keep existing invite, resend, cancel, role update, deactivate, and reactivate behavior unchanged;
- add no new invite behavior;
- add no role editing behavior changes;
- add no backend/API/RPC/schema changes.

### Deferred Team Access Work

- Guided invite wizard.
- Role templates.
- Bulk invites.
- Onboarding email polish.
- Permission diff views.
- Audit trail for access changes.
- Role-specific onboarding paths.
- Access review exports.

## Team Access Data Shape Audit

Admin Onboarding Slice 2B audits the current Team Access data/read flows before UX polish.

### Current Rendering / Data Sources

Team Access route:

- `/users` renders `UsersIndex` behind `PERMISSIONS.USERS_READ`.
- `UsersIndex` loads members through `listCompanyMembers({ includeInactive })`, which calls
  `rpc_company_member_list(p_include_inactive)`.
- `UsersIndex` loads role presets through `listCompanyRolePresets()`, which calls
  `rpc_company_role_preset_list()`.
- The page also renders `CompanyInvitationsPanel`, which loads invitation rows through
  `rpc_company_member_invitations_list(p_status, p_limit)`.
- Invite creation and resend remain Edge-mediated through `invite-company-member` and
  `resend-company-member-invite`; cancellation and acceptance remain RPC-owned.

Member rows:

- Safe member fields already returned include `user_id`, `membership_id`, `display_name`,
  `full_name`, `email`, `phone`, `avatar_url`, `display_color`, `membership_status`,
  `membership_type`, `is_primary`, `joined_at`, `auth_linked`, `is_owner`, `role_assignments`,
  `can_update_roles`, `can_deactivate`, and `can_reactivate`.
- The backend projection is current-company scoped and documented as returning safe role labels
  only, with no Auth ids, raw permission keys, operational data, or cross-company members.
- Current rendering shows member identity, email, active role chips, membership status, login
  linked, joined date, optional phone, and available role/status actions.

Invitation rows:

- Safe invitation fields already returned include `invitation_id`, `invite_email`,
  `invitation_status`, `role_assignments`, `primary_role_id`, `invited_by_display_name`,
  `created_at`, `expires_at`, `auth_invite_sent_at`, `accepted_at`, `cancelled_at`, `can_cancel`,
  and `can_resend`.
- Supported status filters are `open`, `terminal`, `all`, and individual states.
- `open` includes `prepared`, `sent`, and `auth_failed`; `terminal` includes `accepted`,
  `cancelled`, and `expired`.
- Current rendering shows email, status chip, role names, inviter display name, created/expires/sent
  timestamps, closed timestamp for non-open filters, and resend/cancel actions where allowed.

Role display and permission summaries:

- Member role assignments contain `role_assignment_id`, `role_id`, `role_name`, `is_owner_role`,
  `is_primary`, and assignment `status`.
- The frontend filters member roles to active role assignments for display and appends `primary` to
  the primary role label.
- Role presets expose `role_id`, `role_key`, `role_name`, `description`, owner/system/template
  flags, `active_assignment_count`, `permission_count`, `owner_only_permission_count`, and
  `assignable_by_current_user`.
- The active UI uses role names and descriptions but does not currently surface permission counts
  as a formal permission summary.
- Raw permission keys are not exposed in Team Access; permission summaries are aggregate counts
  only and should remain explanatory.

Owner/admin indicators:

- Member rows include `is_owner`, but current visible owner/admin distinction is mostly derived
  from active role chips rather than a separate owner/admin indicator.
- Role editing and owner grant/revoke restrictions are backend-owned through existing RPCs and
  permission checks.
- Current error copy already distinguishes protected Owner grant/revoke cases.

Active/invited states:

- Active and inactive member states are distinguishable through `membership_status`.
- Invited membership can be represented by `membership_status = invited` if returned by the member
  list, but most pending invite clarity comes from the separate invitation panel.
- Invitation states distinguish `prepared`, `sent`, `auth_failed`, `accepted`, `cancelled`, and
  `expired`.
- Auth email delivery state is partially visible through `auth_invite_sent_at` and `auth_failed`.

Current company scope assumptions:

- Member and invitation projections resolve `current_company_id()` and require active
  current-company membership.
- Route visibility is frontend-gated by permission hooks, but backend RPC authorization remains
  authoritative.
- Frontend grouping, chips, summaries, and copy must not imply cross-company visibility or
  authorization.

### Already Safe To Display

- Member display name, full name, email, phone, avatar/color, membership status/type, primary flag,
  joined date, auth linked state, owner-role indicator, active role labels, and action availability
  booleans.
- Invitation email, invitation lifecycle status, requested role labels, primary role marker,
  inviter display name, created/expires/sent/accepted/cancelled timestamps, and resend/cancel
  availability.
- Role preset name, description, owner-role/system/template flags, active assignment count,
  permission count, owner-only permission count, and assignability by current user.
- High-level page copy explaining that roles are company-scoped presets and invitations do not
  grant access until accepted.

### Label / Status Inconsistencies And Confusion Risks

- Member status labels are minimal (`Active`, `Inactive`, `Invited`) while invitation statuses have
  more lifecycle detail (`Prepared`, `Sent`, `Auth failed`, `Accepted`, `Cancelled`, `Expired`).
- `Listed Members` can be confused with total access because inactive members appear only when the
  `Show inactive` toggle is enabled.
- Role labels append `primary` inline, which is accurate but can read like a separate role rather
  than the primary role marker.
- Owner/admin meaning is conveyed through role chips and modal copy, but no nearby explanatory text
  states that Owner access is backend-protected and cannot be casually granted/revoked.
- `Login linked` may be unclear to owners; it means an Auth identity is linked, not necessarily that
  the user has completed operational onboarding.
- `Prepared` versus `Sent` invite states may be unclear without next-step copy.
- `Auth failed` is visible but does not currently explain whether resend or cancellation is the
  expected next step.
- Permission summaries are not currently surfaced; role preset permission counts exist but are not
  a substitute for exact permission diffing.

### Already Distinguishable Invitation / Member States

- Members: `active`, `inactive`, and potentially `invited` from `membership_status`.
- Invitations: `prepared`, `sent`, `auth_failed`, `accepted`, `cancelled`, and `expired` from
  `invitation_status`.
- Open invitations: `prepared`, `sent`, and `auth_failed`.
- Terminal invitations: `accepted`, `cancelled`, and `expired`.
- Resend/cancel availability: backend-provided `can_resend` and `can_cancel`.
- Role assignability: backend-provided `assignable_by_current_user`.
- Member role/status action availability: backend-provided `can_update_roles`, `can_deactivate`,
  and `can_reactivate`.

### Permission Summary State

- Existing authoritative state:
  - route/page access through `users.read`;
  - invitation send/list affordances through `users.invite`, `users.manage_company_access`, and
    `roles.assign`;
  - role grant/revoke protection through backend RPC permission checks;
  - role-preset aggregate counts through `permission_count` and `owner_only_permission_count`.
- Existing inferred/frontend state:
  - active role chip labels derived by filtering `role_assignments` to active status;
  - primary role label derived from `is_primary`;
  - role sort order by role name.
- Not available today:
  - exact permission diff view by member;
  - raw permission key list per role in Team Access;
  - per-member resolved effective permission list;
  - audit trail view for historical access changes.

### Safe First-Pass UX Polish Targets

- Clearer status chips for member and invitation states using existing status fields.
- Group active members separately from inactive/invited members when the inactive toggle is enabled.
- Group open/pending invitations separately from terminal invitations or improve the filter labels
  and empty states.
- Add role description/help text explaining Owner, Admin, Appraiser, Reviewer, and Billing presets
  using existing role preset descriptions where available.
- Add next-step copy for pending invitation states:
  - prepared: resend/send another invite email or cancel if incorrect;
  - sent: wait for acceptance or resend if needed;
  - auth failed: resend or cancel;
  - expired/cancelled: send a new invite if access is still needed.
- Add owner/admin explanatory copy that Owner access is backend-protected and the company must keep
  an active owner.
- Improve empty states for solo-owner companies, no pending invites, no inactive members, and no
  assignable role presets.

### Unsafe / Risky Areas

- Do not infer exact permissions from role names or frontend role ordering.
- Do not show permission diff claims unless backed by an authoritative backend read.
- Do not create frontend-generated role assumptions that imply security authority.
- Do not add hidden escalation paths around Owner/Admin grants.
- Do not bypass backend `can_*` booleans for role/status/invite actions.
- Do not direct-write `users`, `company_memberships`, `user_role_assignments`, `roles`,
  `role_permissions`, or `company_member_invitations`.
- Do not treat pending invitations as active access.
- Do not expose raw permission keys, Auth ids, provider tokens, invite tokens, or cross-company
  member data.

## Team Access Readability Polish

Admin Onboarding Slice 2C implements the first Team Access readability polish using only existing
governed member and invitation data.

### Implemented Presentation Changes

- The member section now separates visible active rows under `Active Team Members`.
- When inactive rows are shown, non-active member rows render under `Inactive / Invited Members`
  instead of mixing with active access.
- Member cards now emphasize Owner and Admin access with explanatory chips derived from existing
  role/member fields.
- Member role chips now show the role name and a distinct `Primary` marker instead of inline
  `primary` wording.
- Member cards now include a compact access summary derived only from active role assignments:
  owner-protected access, no active role assigned, or the count of active roles.
- The summary metric formerly labeled `Listed Members` now reads `Members Shown` and clarifies that
  inactive members appear only when enabled.
- Empty states now explain that solo-owner operation can be valid and that invitations should be
  used when another person needs access.
- The invitation panel copy now reinforces that pending invitations are separate from active team
  membership.
- Invitation statuses now include lightweight next-step text such as waiting for acceptance, ready
  to resend, email send needs attention, or send a new invite if needed.
- Invitation role display now marks primary roles as `(primary)` for readability.

### Preserved Behavior

- Member listing still uses `rpc_company_member_list(...)` through the existing frontend API.
- Invitation listing still uses `rpc_company_member_invitations_list(...)` through the existing
  frontend API.
- Invite creation/resend remain on existing Edge Function paths.
- Invitation cancel, member role update, and member deactivate/reactivate remain on existing RPC
  paths.
- No role editing behavior, invite flow behavior, permission/RLS behavior, backend state, or
  onboarding automation changed.
- The polish adds no frontend-invented permissions and does not bypass backend `can_*` booleans.

### Test Coverage

Focused Team Access tests cover:

- active versus inactive/invited member grouping;
- member status chip rendering;
- Owner/Admin access indicators and role primary markers;
- pending invitation status help and role primary labeling;
- improved empty states;
- no governed mutation API calls during readability-only rendering.

## Team Access Polish Closeout

Admin Onboarding Slice 2D locks the initial Team Access readability/onboarding polish as complete.

Locked foundation:

- Active company members are grouped under `Active Team Members`.
- Non-active member rows are grouped under `Inactive / Invited Members` when the inactive toggle is
  enabled.
- Owner/Admin indicators are clearer and remain derived from existing safe member/role fields.
- Role primary markers render as separate labels.
- Compact access summaries use existing active role assignment data only.
- Empty states are safer for solo-owner companies, no visible members, no pending invitations, and
  filtered invitation views.
- Pending Invitations copy and status help text clarify that pending invites do not grant access
  until accepted.

Locked guardrails:

- No permission changes.
- No role editing behavior changes.
- No invite flow changes.
- No hidden escalation.
- No frontend-invented permissions.
- Company scope remains authoritative.
- Existing backend `can_*` booleans remain the authority for visible mutation actions.
- Existing RPC/Edge paths remain the only approved member, role, and invitation write paths.

Deferred Team Access onboarding work:

- Guided invite wizard.
- Role templates.
- Bulk invites.
- Onboarding email polish.
- Permission diff views.
- Audit trail for access changes.
- Deeper setup checklist automation.

## Governance Rules

- Onboarding must respect company scope, RLS, current-company context, and active membership.
- No hidden permission escalation is allowed. Role and permission changes must remain on existing
  backend-authoritative paths.
- Owner/admin authority remains backend authoritative; frontend readiness labels are visibility and
  guidance only.
- Setup helpers should be advisory and read-only where possible.
- Any future setup mutation must use existing approved RPC/Edge paths or receive a dedicated
  backend-owned design first.
- Do not add mutation shortcuts that bypass RPC ownership, Team Access APIs, invitation Edge
  functions, document RPCs, or order lifecycle/workflow RPCs.
- Do not infer production readiness from frontend-only checks when backend validation is required.
- Do not expose service-role secrets, raw permission internals, Supabase project secrets, or
  operational data from another company.

## Recommended First Implementation

The first implementation should be a lightweight onboarding/readiness checklist for owner/admin
users.

Recommended scope:

- read-only operational readiness indicators;
- compact checklist presentation in or near the existing Owner Setup area;
- links to existing governed surfaces such as Team Access, Orders, dashboard, and production smoke
  checklist documentation where appropriate;
- clear labels for blocker, warning, and optional items;
- no guided wizard yet;
- no multi-step setup flow yet;
- no automatic setup mutation;
- no permission redesign;
- no new backend RPC unless a later implementation audit proves existing context is insufficient.

The first slice should prefer existing setup context and frontend-only presentation of already
authorized state. If a needed readiness signal is not already available safely, mark that indicator
as deferred rather than adding a backend shortcut.

After Slice 1B, the recommended MVP is specifically a read-only checklist card that distinguishes
informational readiness items from attention states, avoids blocking wizard behavior, and performs
no automated enforcement or setup mutation.

## Deferred Work

- Guided onboarding wizard.
- Guided invite wizard.
- Company setup templates.
- Automated onboarding emails.
- Onboarding email polish.
- Setup automation.
- Company setup checklist automation.
- Role templates.
- Bulk invites.
- Client onboarding.
- AMC/vendor onboarding flows.
- Billing/subscription setup.
- Advanced role/permission diffing.
- Permission diff views.
- Audit trail for access changes.
- Automated production readiness execution.
- Cross-company admin console or global support tooling.
- Onboarding completion percentage.
- Setup completion tracking.
- Role-specific onboarding.
- Client onboarding readiness.
- AMC/vendor onboarding readiness.
- Storage readiness validation signals.
- Permission seed validation signals.
- Backend readiness validation RPCs.

## Slice Closeout Criteria

Admin Onboarding Slice 1A is complete when this plan exists and the roadmap documents the intended
first implementation direction, governance rules, and deferred work. No runtime behavior, backend
state, permissions, RLS, invitation behavior, or onboarding automation changes are part of this
slice.

Admin Onboarding Slice 1B is complete when this plan defines the first operational readiness
checklist checks, categories, MVP behavior, governance rules, and future extensions. No runtime
behavior, backend state, permissions, RLS, invitation behavior, checklist automation, or onboarding
automation changes are part of this slice.

Admin Onboarding Slice 1C is complete when this plan records the existing readiness data sources,
categorizes each readiness check by availability, recommends truthful MVP fields, and documents
unsafe assumptions to avoid. No runtime behavior, backend state, permissions, RLS, invitation
behavior, checklist automation, or onboarding automation changes are part of this slice.

Admin Onboarding Slice 1D is complete when the first dashboard Operational Readiness card renders
for owner/admin users using existing governed read state only, handles optional/unknown items
neutrally, contains no mutation controls or onboarding automation, and is covered by focused tests.
No backend state, permissions, RLS, invitation behavior, onboarding automation, or fake readiness
scoring changes are part of this slice.

Admin Onboarding Slice 1E is complete when this plan, the next-phase plan, and roadmap mark the
Operational Readiness card foundation complete, record the locked guardrails, and keep future
wizard, automation, validation-signal, role-specific, client/AMC/vendor onboarding, and completion
tracking work deferred. No runtime behavior, backend state, permissions, RLS, invitation behavior,
checklist automation, or onboarding automation changes are part of this slice.

Admin Onboarding Slice 2A is complete when this plan documents the current Team Access foundation,
UX goals, candidate clarity improvements, governance rules, recommended first read-only/status
polish implementation, and deferred Team Access onboarding work. No runtime behavior, backend
state, permissions, RLS, invitation behavior, role editing behavior, or onboarding automation
changes are part of this slice.

Admin Onboarding Slice 2B is complete when this plan documents the current Team Access data/read
flows, safe fields, inconsistent labels/statuses, role terminology risks, distinguishable
invitation/member states, existing versus inferred permission summaries, safe first-pass polish
targets, and unsafe areas. No runtime behavior, backend state, permissions, RLS, invitation
behavior, role editing behavior, or onboarding automation changes are part of this slice.

Admin Onboarding Slice 2C is complete when Team Access improves readability using existing governed
member/invitation data only, separates active members from inactive/invited rows, keeps pending
invitations distinct from active access, adds clearer status chips and Owner/Admin indicators,
improves role primary labels and empty states, preserves existing mutation/action paths, and is
covered by focused presentation tests. No backend state, permissions, RLS, invitation workflow,
role editing redesign, hidden escalation, frontend-invented permission, or onboarding automation
changes are part of this slice.

Admin Onboarding Slice 2D is complete when this plan, the next-phase plan, and roadmap mark the
Team Access readability polish foundation complete; record the locked grouping, indicators, role
markers, summaries, empty states, and Pending Invitations copy/status help; preserve guardrails
against permission changes, role editing changes, invite flow changes, hidden escalation,
frontend-invented permissions, and company-scope bypass; and keep guided invite wizard, role
templates, bulk invites, onboarding email polish, permission diff views, access-change audit trail,
and deeper setup checklist automation deferred. No runtime behavior, backend state, permissions,
RLS, invitation workflow, role editing behavior, or onboarding automation changes are part of this
slice.
