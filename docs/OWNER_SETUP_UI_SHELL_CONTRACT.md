# Owner Setup UI Shell Contract

## Purpose

This document locks the Phase 10A5 owner setup UI shell contract.

It is documentation only. It does not introduce runtime code, migrations, permission seeds, RLS policies, RPC edits, route changes, registry changes, UI changes, product-mode authority, module-authoritative security, Vendor/Client live surfaces, or Continental-specific bootstrap defaults.

Phase 10A1 defined company bootstrap doctrine. Phase 10A2 audited backend dependencies. Phase 10A3 defined the bootstrap RPC contract. Phase 10A4 defined onboarding state as guidance/readiness diagnostics, not security authority.

Phase 10A5 defines the future first-owner setup experience that turns a bootstrapped company into an operationally ready workspace.

Phase 10B8 added the first minimal route shell at `/settings/owner-setup` in `src/pages/admin/OwnerSetup.jsx`. The shell is protected by the existing `settings.view` route guard and does not add a navigation/settings utility link.

Phase 10C4 wires the route to the read-only `useCompanySetupContext()` hook. Owner Setup now consumes guarded live `rpc_company_setup_context()` output when available, feeds it into the pure readiness resolver, and preserves the static sample fallback. It does not call bootstrap RPCs, mutate records, persist onboarding state, save company settings, submit invitations, configure order numbering, write notification defaults, activate Vendor/Client shells, change route protection, or make readiness authoritative.

Phase 10C5 adds a visible settings utility link labeled `Owner Setup ->` through `currentSettingsUtilityLinks`. The link points to `/settings/owner-setup`, uses the existing `settings.view` route and visibility metadata, and is navigation convenience only. It does not create a new permission, change route protection, add readiness-based visibility, or add dashboard/onboarding behavior.

Phase 10C6 adds a small dashboard prompt for users who already have `settings.view`. The prompt links to `/settings/owner-setup` and is labeled as diagnostic guidance only. It does not fetch readiness, alter `DashboardGate`, change dashboard resolution, redirect users, mutate setup state, call bootstrap, or make setup readiness authoritative.

Phase 10D4 wires only the Company Profile card to the guarded `rpc_company_profile_update(p_patch jsonb)` RPC through `src/features/company-setup/companyProfileApi.js`. The card edits only `name`, `timezone`, and `locale`, refetches `rpc_company_setup_context()` after success, and remains non-authoritative. No other setup cards became actionable, and the route guard remains existing `settings.view`.

Phase 10D5 locks the Branding / Settings shell design in `docs/COMPANY_BRANDING_SETTINGS_SHELL_DESIGN.md`. Branding remains a future/deferred Owner Setup card because no active company branding table, logo field, branding RPC, company logo storage bucket, or report branding model is confirmed. Future branding metadata should use only a narrow guarded storage contract and must not write broad settings JSON, operating-mode metadata, product/package flags, module entitlement flags, onboarding completion, order numbering, notification defaults, or Vendor/Client activation.

Phase 10D6 locks the company-safe order-numbering model design in `docs/COMPANY_ORDER_NUMBERING_MODEL_DESIGN.md`. Order numbering remains a deferred Owner Setup card because the current implementation uses legacy text `company_key`, global `orders.order_number` uniqueness, and browser-side number prefetch/submission. Future numbering setup should use company-id-backed rules/counters, server-side current-company generation, company-scoped uniqueness, guarded configuration RPCs, and audit events. Owner Setup must not configure numbering until that backend model exists.

Phase 10D7 locks the company notification-defaults model design in `docs/COMPANY_NOTIFICATION_DEFAULTS_MODEL_DESIGN.md`. Notification defaults remain a deferred Owner Setup card because the current model has global event policies and user-scoped preference tables, but no company-id-backed notification-default storage or guarded company-default update RPC. Future notification setup should keep user preferences separate from company defaults and should use company-scoped event/channel/role defaults, guarded RPCs, fallback precedence, and audit events before any Owner Setup write path exists.

## Current Baseline

Current active routes and surfaces relevant to future setup:

- `/dashboard` uses `DashboardGate`.
- `/settings` is the current account/settings surface.
- `/settings/owner-setup` is a non-authoritative setup shell route added in Phase 10B8 and wired to live read-only setup context in Phase 10C4.
- `/settings/notifications` is the current notification preferences route.
- `/users` is the current Team Access surface.
- `/settings/product-metadata-diagnostics` is a protected diagnostic route.
- `/orders/new`, `/clients`, `/relationships`, and `/assignments` are active operational surfaces with existing permission/RPC boundaries.

Live Owner Setup integration now includes guarded read-only setup context plus one narrow Company Profile write card. The page still uses a static sample fallback when live context is unavailable and still has no onboarding persistence, broad settings writes, branding writes, invite submission, order-numbering writes/configuration, notification-default writes/configuration, Vendor/Client activation, bootstrap mutation, or readiness-based authority. Phase 10C5 exposes the route through the Settings page utility links only. Other route names in this document are proposed future routes.

## Shell Purpose

The owner setup shell should help the first owner:

- Confirm the company was created.
- Confirm company and owner profile basics.
- Review basic settings and branding.
- Review order-numbering readiness.
- Review workflow/default assumptions.
- Invite staff or acknowledge solo operation.
- Review default roles.
- Review notification readiness.
- Understand whether the company is ready for first order work.

The shell is guidance and configuration UX. It is not security authority.

## When It Should Appear

Conceptually, the setup shell may appear when:

- Bootstrap succeeds and returns `session_refresh_required` or onboarding status.
- The owner first signs in with active company context.
- `rpc_company_setup_context()` or a future onboarding resolver reports required setup incomplete.
- The owner opens setup from a dashboard prompt.
- The owner resumes setup from settings or a command palette suggestion.

The shell should not appear merely because product-mode metadata exists. It should be driven by company setup/readiness state plus authenticated company-scoped access.

Incomplete onboarding should not automatically become a blanket app-wide access denial unless a later explicit guard is designed and documented.

## Proposed Future Routes

Possible future routes:

- `/setup`
- `/setup/company`
- `/setup/team`
- `/setup/workflow`
- `/setup/readiness`
- `/settings/company`

These routes do not exist today. `/settings/owner-setup` exists as a conservative direct-access shell only and should not be treated as final route strategy. Final route selection should happen in a future implementation slice after route authority, setup permissions, and owner setup data contracts are locked.

Route design should avoid exposing raw module/package/tenant terminology in user-facing paths where possible. `/setup` or `/settings/company` is preferable to implementation-oriented route names.

## Relationship To Dashboard Empty States

Dashboard setup prompts should be lightweight and contextual:

- Show incomplete setup prompt.
- Show readiness warnings.
- Link to specific setup steps.
- Show missing order-numbering warning.
- Show missing notification defaults warning.
- Show missing team/role review warning.
- Show company profile warning.

Dashboard prompts must not:

- Become security gates.
- Replace route guards.
- Hide tenant-safety failures behind UI-only checks.
- Expose hidden Vendor/Client future shells.
- Turn the dashboard into a disabled-module catalog.

If the user can access the dashboard by current route/capability checks, onboarding prompts can guide but should not invent a second authorization system.

Phase 10C6 implementation note: the current dashboard prompt is intentionally minimal and permission-gated only by existing `settings.view`. It does not use live readiness state to decide visibility.

## Relationship To Settings And Company Profile

The setup shell should reuse or lead toward future company settings/profile surfaces.

Current related active surfaces:

- `/settings` for account/settings behavior.
- `/settings/notifications` for current user notification preferences.
- `/users` for Team Access invitation management.

Future company setup should not overload personal settings with company authority. Company profile, branding, order-numbering, notification-default, and workflow-default setup should be company-scoped settings once their backend contracts exist.

Until company settings contracts exist, setup cards should be read-only, deferred, or diagnostic rather than pretending to save authoritative defaults. The current exception is the Phase 10D4 Company Profile card, which saves only `name`, `timezone`, and `locale` through the guarded profile RPC.

Phase 10D5 design note: branding/settings should not be implemented as a broad `companies.settings` editor. If branding becomes actionable later, the preferred storage path is a narrow guarded RPC that writes only validated presentation metadata under a dedicated `companies.settings.branding` subkey, likely requiring `company.manage_branding`. Logo upload, report branding, public contact fields, `operating_mode_settings`, product/package flags, module flags, order numbering, notification defaults, and onboarding completion remain separate deferred contracts.

Phase 10D6 design note: order numbering should not be stored in broad `companies.settings` and should not rely on `order_numbering_rules.company_key` as tenant authority. Future numbering setup belongs behind company-id-backed numbering tables or compatibility columns, guarded current-company RPCs, server-side generation, company-scoped uniqueness, and audit-backed rule changes.

Phase 10D7 design note: notification defaults should not be stored in broad `companies.settings` and should not reuse user preference tables as company defaults. Future company notification setup belongs behind company-id-backed event/channel/role defaults, guarded current-company RPCs, explicit fallback precedence, and audit-backed rule changes. Personal notification preferences remain separate.

## Relationship To Onboarding Checklist State

The setup shell should consume the onboarding checklist model defined in `docs/COMPANY_ONBOARDING_STATE_MODEL.md`.

The shell may show:

- Overall setup state.
- Required and optional checklist items.
- Blocking and non-blocking warnings.
- Completion timestamps.
- Completed-by attribution.
- Related route links.
- Related permission hints through safe copy.
- Diagnostic/readiness summaries.

The shell must not treat checklist state as permission authority. If a checklist item says a setup task is complete but an RPC/permission/RLS check rejects an action, the authority check wins.

## Relationship To Product Modes And Modules

Product/package choice may influence:

- Recommended setup steps.
- Step labels and copy.
- Which optional cards are hidden.
- Which future upgrade/readiness prompts are relevant.
- Whether client/vendor/network setup appears later.

Product/package choice must not:

- Grant permissions.
- Grant operational visibility.
- Activate routes.
- Activate Vendor Portal or Client Portal shells by itself.
- Override assignment packet boundaries.
- Override order/client visibility.
- Override workflow authority.

Disabled future modules may appear only as contextual readiness or upgrade prompts when doing so does not reveal hidden concepts or imply entitlement. Hidden future modules should usually remain hidden.

## Authority Boundary

The owner setup shell may:

- Show setup steps.
- Link to permitted configuration surfaces.
- Request setup RPCs in future slices.
- Show warnings before operational work.
- Show completion summaries.

The owner setup shell must not:

- Create companies, memberships, role assignments, users, clients, relationships, assignments, orders, notification defaults, order-numbering rules, or settings through frontend-orchestrated table writes.
- Grant access.
- Bypass permissions/RLS/RPCs.
- Escalate a company Owner into platform/system admin.
- Activate Vendor/Client live surfaces.
- Treat product-mode or module state as security authority.

## Recommended Future Owner Setup Flow

1. Welcome / Company Created
   - Confirm the company workspace exists.
   - Show company name and owner identity.
   - Explain that setup can be resumed.

2. Confirm Company Profile
   - Confirm display name, type, timezone, and locale.
   - Future optional fields: legal name, public contact, address, service area.

3. Confirm Owner Profile
   - Confirm owner name, email, phone, and display identity.
   - Ensure audit/activity attribution is usable.

4. Basic Company Settings
   - Confirm timezone, locale, working assumptions, calendar basics, and terminology later when available.

5. Branding Shell
   - Optional unless package requires branded external communication.
   - Future display metadata may include a validated accent color after a guarded branding settings RPC exists.
   - Logo/file upload, public contact fields, report header/footer text, and portal branding require separate storage/security design before implementation.

6. Order Numbering Setup
   - Show readiness state.
   - Configure only after company-safe numbering model exists.
   - Future configuration should be guarded by RPC and should never generate numbers in the browser.
   - Warn if first order creation should wait.

7. Default Workflow Assumptions
   - Review default review/delivery assumptions.
   - Do not expose arbitrary workflow builders.

8. Team / Staff Invitations
   - Link to Team Access flow when permitted.
   - Staff invitation can be optional for solo-owner Staff setup unless package policy requires team setup.

9. Role Review
   - Show safe role preset labels and purpose.
   - Do not expose raw permission keys in normal UI.

10. Notification Preferences And Defaults
   - Link to personal notification preferences.
   - Show company-default readiness only after the storage model exists.
   - Do not treat personal DND/snooze/type-channel preferences as company defaults.

11. Readiness Checklist
   - Summarize blocking and non-blocking tasks.
   - Show whether first order work is safe.

12. Enter Workspace / Ready For Orders
   - Route to dashboard or first natural operational step.
   - Do not bypass existing route permissions.

## Recommended UI Primitives

Setup shell layout:

- Focused setup page under authenticated app shell.
- Clear title and company context.
- Primary content step area.
- Progress/checklist rail.
- Footer actions for continue, back, skip where allowed, and resume later.

Progress/checklist rail:

- Required tasks.
- Optional tasks.
- Blocking warnings.
- Non-blocking warnings.
- Completion state.

Step cards:

- One business task per card.
- Short copy.
- Current readiness state.
- Primary action.
- Secondary action where appropriate.

Warning banners:

- Blocking warnings for tasks that prevent safe first operational use.
- Non-blocking warnings for recommendations.
- Safe copy only; no raw backend object names.

Blocking vs non-blocking:

- Blocking tasks can prevent setup completion or ready-for-orders status.
- Non-blocking tasks can be skipped or deferred.
- Blocking state is guidance unless future route/action guards are explicitly designed.

Skip for now:

- Allowed only for optional or non-blocking tasks.
- Should record an owner acknowledgement only after a persistence model exists.
- Must not create false completion for computed readiness.

Return/resume:

- Setup should be resumable from dashboard prompts, settings, or a future command palette suggestion.
- Resume state should come from onboarding state/resolver output, not local browser state only.

Completion summary:

- Show what was completed.
- Show warnings still open.
- Show the next recommended operational action.

Diagnostics/readiness panel:

- Owner-facing summary of setup readiness.
- Developer/operator diagnostics should stay separate from normal UI.
- No raw permission/RLS/RPC internals in normal owner copy.

## Routing And Access Doctrine

Future setup routes should still require authenticated company-scoped access.

Setup routes should not bypass existing route guards. Owner-only steps should rely on permissions and RPC authority, not shell visibility.

Setup route visibility is not permission authority. A visible setup step means the UI recommends a task; it does not mean the user can perform the task unless the action RPC/route permission allows it.

Incomplete onboarding should not become a blanket access denial unless a future explicit guard is designed, reviewed, and documented. A company may be allowed to operate with warnings if canonical permissions/RPCs allow the action and no tenant-safety issue exists.

Recommended future route-gate posture:

- Base setup shell: authenticated plus current-company membership.
- Company profile step: company profile permission once defined.
- Team invite step: existing invite/user/role permissions.
- Role review step: role read/manage permissions.
- Numbering/settings steps: future company settings/numbering permissions.
- Readiness step: setup read permission or successor.

## Dashboard / Empty-State Integration

Future dashboards may show:

- Incomplete setup prompt.
- Readiness warnings.
- Quick links to setup steps.
- Missing order-numbering warning.
- Missing notification defaults warning.
- Missing team warning.
- Company profile warning.
- Ready-for-orders action when checks pass.

Dashboard prompts should be sparse and operationally relevant. They should not become a permanent onboarding card stack once the company is active and operating.

Dashboard prompts should not:

- Deny access by themselves.
- Replace `DashboardGate`.
- Change dashboard capability resolution.
- Import product-mode/shadow metadata as active authority.
- Expose future Vendor/Client shells.

## Product Mode / Module Influence

Product/package choice may affect recommended setup cards:

- Staff: company profile, team, clients, order numbering, workflow defaults, notification defaults, first order readiness.
- AMC: client/lender setup, vendor relationship setup, assignment readiness, review/delivery assumptions, but only after AMC package/mode contracts are explicit.
- Vendor: profile/readiness for packet work, only after Vendor Portal live surface contracts exist.
- Client: request/status/document setup, only after Client Portal live surface contracts exist.
- Hybrid: lane-specific setup, only after Hybrid lane contracts exist.

Module defaults may affect visible setup cards only as composition metadata. None of this authorizes access.

Disabled future modules may be shown only as contextual upgrade/readiness prompts if appropriate. Hidden modules should remain hidden.

## Implementation Slice Recommendations

Recommended future implementation slices:

1. Create read-only owner setup route shell.
2. Add onboarding checklist resolver using existing setup context where possible.
3. Add company profile setup card.
4. Add owner profile setup card.
5. Add branding/settings setup card as read-only or deferred until backend exists.
6. Add team invite setup card using existing Team Access route/RPC boundaries.
7. Add role review setup card.
8. Add order numbering readiness card.
9. Add notification readiness card.
10. Add workflow/default assumptions card.
11. Add dashboard setup prompt.
12. Add diagnostics/readiness preview.

Each slice should preserve existing route/action authority and should avoid broad mode-aware runtime behavior until company/package/module settings contracts are locked.

Phase 10A6 completes the invite/staff setup bridge contract in `docs/INVITE_STAFF_SETUP_BRIDGE_CONTRACT.md`. Future team invite setup cards should consume that contract before implementation, especially its pending-versus-active membership rules, role preset handling, invitation acceptance boundary, and no-frontend-provisioning rule.

Phase 10H1 adds the Owner Setup layout/card polish design in `docs/OWNER_SETUP_LAYOUT_POLISH_DESIGN.md`. Future visual polish should group cards into Core Setup, Operations Setup, Communication / Branding, and Readiness; use the fixed status labels `Ready`, `Needs attention`, `Available`, `Coming later`, `Diagnostic only`, and `Deferred`; preserve Company Profile as the only actionable setup write; and keep readiness diagnostic-only. The recommended 10H2 implementation is layout/copy polish only with no new backend writes, route changes, registry changes, broad settings writes, order-numbering configuration, notification-default configuration, branding upload/configuration, Vendor/Client activation, or setup authority.

Phase 10H2 implements the Owner Setup layout/card polish in `src/pages/admin/OwnerSetup.jsx`. The page now renders grouped sections for Core Setup, Operations Setup, Communication / Branding, and Readiness, uses the fixed status-label vocabulary, keeps Company Profile as the only actionable card, labels readiness as diagnostic-only guidance, and keeps the static sample fallback secondary. Company Profile still writes only `name`, `timezone`, and `locale` through the guarded profile RPC and still refetches live setup context after success. No new setup write paths, backend behavior, route/registry changes, readiness authority, blocking gate, order-numbering configuration, notification-default configuration, branding configuration, Vendor/Client activation, broad settings writes, or bootstrap mutation were added.

Phase 10H3 maps safe live readiness diagnostics into Owner Setup card badges without changing authority. Owner Profile now reflects owner presence and active owner membership signals; Role Review reflects role preset and owner role assignment signals; Team / Staff Invitations can show ready only when invitation and staff readiness summaries both pass. Company Profile remains `Available`; Readiness remains `Diagnostic only`; deferred implementation cards remain `Deferred`. These badges are guidance only and do not grant access, block access, make cards actionable, mutate setup state, or replace permissions, route guards, RLS, RPCs, workflow guards, assignment visibility, or company membership checks.

Phase 10H4 polishes deferred card UX. Basic Settings, Order Numbering, Notification Preferences, and Branding now show consistent `Planned later` copy explaining that each card is intentionally waiting on backend, storage, policy, or security contracts. Deferred cards do not render disabled controls, fake actions, or configuration links. Company Profile remains the only actionable card, and no backend writes, route/registry changes, readiness authority, blocking gate, broad settings writes, order-numbering configuration, notification-default configuration, or branding configuration were added.

Phase 10H5 polishes the Owner Setup readiness summary. The live readiness panel now leads with owner-readable counts for blockers, warnings, and unknown/deferred items, while raw diagnostic status, severity counts, blocker keys, and unknown keys remain visually secondary. The summary remains labeled diagnostic-only, the static sample fallback remains secondary, and the rendered copy avoids access, completion, unlock, and activation language. No backend writes, route/registry changes, readiness authority, blocking gate, broad settings writes, order-numbering configuration, notification-default configuration, or branding configuration were added.

Phase 10H6 closes the Owner Setup product polish arc in `docs/OWNER_SETUP_PRODUCT_POLISH_HANDOFF.md`. The handoff records the current card inventory, current actionable/diagnostic/deferred boundaries, safety rules, and recommended next phase options. The default recommendation is route-level browser smoke validation before adding more onboarding features, because Phase 10G restricted direct order writes and Phase 10H polished setup UX. No runtime code, migrations, backend behavior, route/registry changes, setup writes, readiness authority, blocking gate, broad settings writes, order-numbering configuration, notification-default configuration, or branding configuration were added in 10H6.

Phase 10J1 designs the Owner Setup Team / Staff bridge in `docs/OWNER_SETUP_TEAM_STAFF_BRIDGE_DESIGN.md`. The bridge should be a permission-aware navigation handoff from the Team / Staff Invitations card to the existing `/users` Team Access route, guarded by existing `users.read` route visibility. Owner Setup should not embed invitation management, submit invitations, call new RPCs or Edge Functions, add permissions, bypass route guards, activate staff, persist setup completion, or treat readiness as authority. The recommended 10J2 implementation is one safe link/action on that card only, with Company Profile preserved as the only Owner Setup write path.

Phase 10J2 implements that bridge. The Team / Staff Invitations card now shows `Open Team Access` linking to `/users` only when existing `PERMISSIONS.USERS_READ` visibility is allowed through the current permission helper. If `users.read` is not available, the card remains informational. The implementation preserves Company Profile as the only Owner Setup write path and adds no invitation submission, invite/member listing inside Owner Setup, new RPCs, new Edge Function calls, permissions, route guards, migrations, backend behavior, RLS changes, product-mode/module authority, Vendor activation, or Client activation.

## Hard No-Go Rules

Owner setup UI must not introduce:

- Product-mode authority.
- Module-authoritative security.
- Vendor/Client shell activation.
- Continental defaults.
- Frontend-owned provisioning.
- Onboarding bypass of permissions/RLS/RPCs.
- Global admin escalation for company owners.
- UI-only masking of tenant-safety problems.
- Direct app-role writes to bootstrap/setup-owned tables.
- Operational order/client/assignment creation as a setup side effect unless a later explicit step and backend contract are designed.
- Disabled-module graveyards.
- Raw permission keys, RLS/RPC names, or tenant mechanics in normal owner copy.

## Open Questions Before Implementation

Phase 10A7 completes the bootstrap readiness/checklist contract in `docs/COMPANY_BOOTSTRAP_READINESS_CHECKLIST.md`. Future owner setup rails, cards, dashboard prompts, and diagnostics panels should consume that readiness contract before implementation and must preserve its diagnostic-only authority boundary.

- Final setup route path.
- Whether setup lives under `/setup`, `/settings/company`, or both.
- Whether onboarding checklist state is computed, persisted, or hybrid.
- Which setup permission gates are required for the shell and each step.
- Whether company profile/settings writes use `companies.settings`, normalized tables, or a hybrid.
- How setup completion writes audit events.
- How to handle owner setup for invited owners versus bootstrap-created owners.
- How to show setup prompts without cluttering active dashboards.
- Whether command palette should include setup resume actions.
- Whether `ready_for_orders` can be reached before company-safe order numbering exists.
- Whether Staff solo-owner setup can skip staff invitations.
- What setup looks like for AMC, Vendor, Client, and Hybrid modes once their contracts exist.

## Phase 10A5 Lock

Phase 10A5 is documentation-only.

It defines the future owner setup UI shell as guidance and configuration UX. It adds no runtime behavior, migrations, permission seeds, RLS policies, RPC edits, route changes, registry changes, UI changes, product-mode authority, module-authoritative security, Vendor/Client live surfaces, or Continental-default bootstrap assumptions.
