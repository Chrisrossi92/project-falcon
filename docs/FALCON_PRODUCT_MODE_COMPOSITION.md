# Falcon Product Mode Composition

## Purpose

This document defines how Falcon product modes compose enabled modules, hidden modules, navigation lanes, dashboard expectations, role preset families, visibility doctrine, and upgrade paths.

It is planning documentation only. It does not change code, permission seeds, route guards, navigation, dashboards, billing, onboarding, or database schema.

The navigation/dashboard composition registry in `docs/FALCON_NAVIGATION_COMPOSITION.md` defines how enabled modules should eventually register navigation entries, dashboard widgets, command palette entries, empty states, setup steps, dependency requirements, and contextual upgrade prompts.
The mode-native empty states and upgrade surfaces blueprint in `docs/FALCON_MODE_EMPTY_STATES_AND_UPGRADES.md` defines how those empty states and prompts should speak in each product mode.
The mode-native language guide in `docs/FALCON_MODE_LANGUAGE_GUIDE.md` defines the preferred vocabulary, avoided terms, safe copy examples, and leak boundaries for each product mode.
The Continental AMC operational blueprint in `docs/FALCON_CONTINENTAL_AMC_BLUEPRINT.md` defines the flagship AMC proving-ground doctrine for AMC lifecycle, vendor panel, assignment packets, SLA queues, client/lender surfaces, and hybrid participation.
The AMC vendor panel doctrine in `docs/FALCON_AMC_VENDOR_PANEL_DOCTRINE.md` defines vendor panel relationship states, assignment eligibility, vendor profile concepts, and routing boundaries.
The AMC client/lender doctrine in `docs/FALCON_AMC_CLIENT_LENDER_DOCTRINE.md` defines client/lender intake channels, client-facing status, communication, delivery, and Client Portal boundaries.
The Vendor Portal operational blueprint in `docs/FALCON_VENDOR_PORTAL_BLUEPRINT.md` defines assignment-only packet execution, vendor dashboard/navigation, visibility boundaries, communication separation, and Staff Appraisal upgrade framing.
The Client Portal operational blueprint in `docs/FALCON_CLIENT_PORTAL_BLUEPRINT.md` defines request/status/document workspace doctrine, client dashboard/navigation, client-facing visibility boundaries, communication separation, and contextual upgrade framing.
The product packaging and onboarding doctrine in `docs/FALCON_PRODUCT_PACKAGING_AND_ONBOARDING_DOCTRINE.md` defines conceptual package families, module bundle doctrine, onboarding paths, upgrade paths, trial/demo posture, and deferred billing strategy.

## Core Doctrine

- A mode is not just a permission preset.
- A mode is a complete operating surface.
- Modules define the product surface for the mode.
- Permissions authorize user actions inside that surface.
- Hidden modules should not render as disabled navigation clutter.
- Navigation, dashboards, command palette entries, empty states, and upgrade prompts should compose from enabled modules plus permissions.
- Surface language should match the user's job in the selected mode.
- Internal architecture and authorization terms should not appear in normal UI copy.
- Empty states and upgrade prompts should be mode-native, sparse, and tied to natural next actions.
- Vendor Portal and Client Portal must not feel like broken Staff or AMC accounts.
- Vendor Portal must feel like a complete assignment-packet workspace, not a restricted Staff Appraisal account.
- Client Portal must feel like a complete request/status/document workspace, not a restricted Staff Appraisal or AMC Operations account.
- Packaging should map to operational outcomes, not hidden features.
- Packages enable module bundles but do not create permission authority or operational visibility.
- Staff Appraisal Mode remains the primary SaaS sales path.
- Continental AMC remains the flagship AMC/internal proving ground.
- Continental AMC should validate AMC sophistication without contaminating Staff Appraisal Mode UX.
- Hybrid mode should separate internal operations from network work into clear lanes.
- Relationship state alone grants no operational visibility.
- Vendor panel membership is assignment eligibility context, not order/client visibility.
- Client/lender access is request/status/document scoped, not internal AMC workflow visibility.
- Assignment packets and readable client/order scope grant operational visibility.

## Composition Summary

| Product Mode | Primary Entity | Baseline Modules | Hidden By Default | Primary Upgrade Path |
|---|---|---|---|---|
| Staff Appraisal Mode | Appraisal shops/staff firms | Core workspace, dashboard, orders, clients, team access, reviews, calendar, notifications, activity, settings | AMC operations, vendor portal, client portal, billing/integrations unless enabled | Continental AMC Panel, AI, analytics, client portal |
| AMC Operations Mode | AMCs/Continental AMC | Core workspace, AMC operations, orders, assignments, relationships, clients, reviews, calendar, vendor/client surfaces | Staff-only internal-only clutter, vendor/client-only portal shells | Vendor portal, client portal, analytics, integrations |
| Vendor Portal Mode | External appraisers/vendors | Core workspace, assignment packets, vendor profile, assigned calendar, notifications, activity, settings | Internal orders, clients, team ops, AMC admin, client portal | Staff Appraisal Mode |
| Client Portal Mode | Lenders/clients | Core workspace, client portal orders/status, documents/reports, messages/activity, settings | Internal orders, clients CRM, team ops, AMC/vendor admin | Integrations, analytics, billing |
| Hybrid / Ecosystem Mode | Multi-role companies | Selected internal + network modules | Anything not explicitly enabled | Add AMC, vendor, client, AI, analytics, integrations |

Package families such as Staff Essentials, Staff Professional, Staff AI+, AMC Operations, Vendor Portal, Client Portal, Hybrid/Ecosystem, and Enterprise later are defined conceptually in `docs/FALCON_PRODUCT_PACKAGING_AND_ONBOARDING_DOCTRINE.md`. This composition matrix defines product-mode surfaces; packaging should consume these surfaces without turning hidden modules into disabled UI or widening visibility.

## Staff Appraisal Mode

Primary user/entity:

- Independent appraisal firms.
- Staff appraiser companies.
- Internal admins, reviewers, appraisers, and billing users.

Primary daily question:

- "What orders need attention today, who owns them, and what is blocking delivery?"

Included modules:

- `core_workspace`
- `dashboard`
- `notifications`
- `activity`
- `settings`
- `orders`
- `clients`
- `team_access`
- `reviews`
- `calendar`

Optional/add-on modules:

- `assignments`
- `relationships`
- `vendor_portal`
- `client_portal`
- `reports`
- `analytics`
- `ai_workspace`
- `billing`
- `integrations`
- `onboarding`
- `tenant_admin`

Intentionally hidden modules:

- `amc_operations` unless the company explicitly enables AMC/hybrid behavior.
- `vendor_portal` unless the company participates in network/vendor work.
- `client_portal` unless client-facing access is enabled.
- `billing` and `integrations` unless packaged/enabled.

Required foundational modules:

- `core_workspace`
- `dashboard`
- `settings`
- `notifications`
- `activity`

Default nav lanes:

- Dashboard.
- Orders.
- Calendar.
- Clients.
- Team Access.
- Reports/Analytics if enabled.
- Settings.

Dashboard surface expectations:

- Active order queues.
- Due soon / overdue.
- Appraiser workload.
- Reviewer workload.
- Pending review/revision work.
- Calendar/inspection pressure.
- Recent operational activity.

Default role preset families:

- Staff Owner.
- Staff Admin.
- Staff Appraiser.
- Staff Reviewer.
- Staff Billing.

Visibility doctrine:

- Company membership plus order/client read helpers determine visibility.
- Appraisers and reviewers see assigned/readable work.
- Owners/admins see company-wide work only through explicit permissions.
- Joining Continental AMC Panel does not expose internal orders to the AMC.

Upgrade/cross-sell path:

- Join Continental AMC Panel for assignment opportunities.
- Add client portal for direct clients/lenders.
- Add analytics, AI, reports, integrations, and billing modules.

Minimum viable complete experience:

- Create/edit orders.
- Manage clients/AMCs.
- Assign appraisers/reviewers.
- Review and transition workflow.
- Track dashboard/calendar/notifications/activity.
- Manage team invitations, roles, and status.
- Manage personal/company settings needed for operations.

Anti-clutter rules:

- Do not show AMC panel administration unless enabled.
- Do not show vendor/client portal nav unless enabled.
- Do not show upgrade prompts in primary order execution paths unless contextually relevant.
- Do not mix assigned network packets into owned internal order queues without a clear lane.

## AMC Operations Mode

Primary user/entity:

- Continental AMC.
- Future AMC operators.
- AMC coordinators, reviewers, vendor managers, and client/lender account users.

Primary daily question:

- "Which client orders need assignment, vendor follow-up, review, or escalation to meet SLA?"

Included modules:

- `core_workspace`
- `dashboard`
- `notifications`
- `activity`
- `settings`
- `orders`
- `clients`
- `assignments`
- `relationships`
- `reviews`
- `calendar`
- `amc_operations`

Optional/add-on modules:

- `vendor_portal`
- `client_portal`
- `reports`
- `analytics`
- `ai_workspace`
- `billing`
- `integrations`
- `onboarding`
- `tenant_admin`

Intentionally hidden modules:

- Staff-only appraisal company language where it conflicts with AMC operations.
- Vendor-only packet execution shell for internal AMC users.
- Client-only request/status shell for internal AMC users.

Required foundational modules:

- `core_workspace`
- `dashboard`
- `orders`
- `assignments`
- `relationships`
- `reviews`
- `notifications`
- `activity`
- `settings`

Default nav lanes:

- AMC Dashboard.
- Orders / Intake.
- Assignments.
- Vendor Panel.
- Clients / Lenders.
- Reviews / QC.
- Calendar / SLA.
- Analytics if enabled.
- Integrations if enabled.
- Settings.

Dashboard surface expectations:

- Incoming/unassigned orders.
- Vendor offer/acceptance status.
- Assignment SLA and due-date pressure.
- Review queue.
- Client/lender exceptions.
- Vendor performance exceptions.
- Aging and escalation indicators.

Default role preset families:

- AMC Owner.
- AMC Admin.
- AMC Coordinator.
- AMC Reviewer.
- Vendor Manager if separated later.
- Client/Lender Account Manager if separated later.

Visibility doctrine:

- AMC company users see AMC-owned orders through order permissions.
- Vendor work is exposed through assignment packets.
- Client portal users see client-scoped order status, not AMC internal operations.
- Vendor relationships do not expose vendor internal Staff Mode data.
- Continental AMC-specific lifecycle, SLA, vendor panel, assignment packet, and client/lender doctrine lives in `docs/FALCON_CONTINENTAL_AMC_BLUEPRINT.md`.
- Vendor panel states and assignment eligibility doctrine live in `docs/FALCON_AMC_VENDOR_PANEL_DOCTRINE.md`.
- Client/lender intake, status, communication, and delivery doctrine lives in `docs/FALCON_AMC_CLIENT_LENDER_DOCTRINE.md`.

Upgrade/cross-sell path:

- Enable Vendor Portal for external panel participation.
- Enable Client Portal for lender/client access.
- Add analytics, AI, billing, and integrations.

Minimum viable complete experience:

- Intake orders.
- Manage clients/lenders.
- Manage panel relationships.
- Offer assignments to vendors.
- Track assignment packet lifecycle.
- Review/QC work.
- Monitor SLA and operational risk.

Anti-clutter rules:

- Do not show staff-firm-only dashboards to AMC users.
- Do not expose vendor portal as a broken internal staff screen.
- Keep client/lender portal management separate from internal client CRM.
- Keep Continental-specific workflows configurable rather than hardcoded into every mode.

## Vendor Portal Mode

Primary user/entity:

- External appraisers/vendors.
- Vendor companies participating in Continental AMC Panel.
- Vendors that do not use Falcon as their internal platform.

Primary daily question:

- "What assigned packets do I need to accept, work, update, or submit?"

Included modules:

- `core_workspace`
- `dashboard`
- `notifications`
- `activity`
- `settings`
- `assignments`
- `vendor_portal`
- Limited `calendar`

Optional/add-on modules:

- `orders` only when upgrading to Staff Appraisal Mode.
- `clients` only when upgrading to Staff Appraisal Mode.
- `team_access` for vendor organization administration where needed.
- `reports` if packet/document handling is enabled.
- `ai_workspace` if vendor-side assistance is enabled.

Intentionally hidden modules:

- `orders` as internal owned order management.
- `clients` as internal CRM.
- `amc_operations`.
- `client_portal`.
- Broad `team_access` unless vendor company administration is enabled.
- `analytics`, `billing`, `integrations`, and `tenant_admin` unless specifically packaged.

Required foundational modules:

- `core_workspace`
- `dashboard`
- `assignments`
- `notifications`
- `activity`
- `settings`

Default nav lanes:

- My Assignments.
- Due Soon.
- Revisions.
- Messages / Updates.
- Completed Work.
- Profile / Availability later.
- Settings.

Dashboard surface expectations:

- New offers.
- Active assignments.
- Due soon / overdue packets.
- Revision requests.
- Submitted/completed packet history.

Default role preset families:

- Vendor Owner.
- Vendor User.

Visibility doctrine:

- Vendor users see assignment packets only.
- Assignment packet access is not canonical order access unless explicitly granted.
- Vendor users should not see AMC internal queues or owner-company order/client data.
- Relationship/panel membership alone does not expose work.
- Vendor Portal operational doctrine lives in `docs/FALCON_VENDOR_PORTAL_BLUEPRINT.md`.
- Vendor profile, availability, and readiness doctrine lives in `docs/FALCON_VENDOR_PROFILE_AVAILABILITY_UPGRADE_DOCTRINE.md`.
- Profile completion and availability affect assignment eligibility only; they are not visibility grants.

Upgrade/cross-sell path:

- Upgrade to Staff Appraisal Mode for internal order/client/team operations.
- Add AI/report assistance where packaged.
- Add analytics after Staff Mode upgrade.

Minimum viable complete experience:

- Accept/decline assignments.
- View packet requirements and due dates.
- Communicate status/activity.
- Submit/complete packet work where supported.
- Maintain vendor profile/settings.

Anti-clutter rules:

- Do not show empty Orders or Clients nav.
- Do not show disabled Team Access/AMC/Client Portal nav.
- Avoid internal Falcon staff-appraisal terminology unless the vendor upgrades.
- Do not make vendors feel like second-class users in a missing Staff app.

## Client Portal Mode

Primary user/entity:

- Lenders.
- Direct client organizations.
- Client users who need request/status/report access only.

Primary daily question:

- "What orders have we requested, what is their status, and what needs our attention?"

Included modules:

- `core_workspace`
- `dashboard`
- `notifications`
- `activity`
- `settings`
- `client_portal`
- `reports` where document/report access is enabled.
- Limited `orders` for request/status surfaces only.

Optional/add-on modules:

- `billing`
- `integrations`
- `analytics`
- Limited `team_access` for client organization user management.

Intentionally hidden modules:

- Internal `orders` operations surfaces.
- `clients` CRM.
- `assignments`.
- `reviews`.
- `amc_operations`.
- `vendor_portal`.
- Internal staff Team Access unless client org administration is enabled.

Required foundational modules:

- `core_workspace`
- `dashboard`
- `client_portal`
- `notifications`
- `activity`
- `settings`

Default nav lanes:

- Submit Request.
- My Requests.
- Status Updates.
- Documents / Reports.
- Messages / Updates.
- Organization Users later.
- Billing later.
- Settings.

Dashboard surface expectations:

- Submitted orders.
- Status and milestones.
- Action required.
- Recent updates.
- Delivered reports/documents.
- Billing status if enabled.

Default role preset families:

- Client Admin.
- Client Requester.
- Client Viewer.

Visibility doctrine:

- Client users see client/order-scoped records only.
- Client Portal access does not expose internal order production, vendor assignments, reviewer queues, or company team data.
- Client organization membership does not imply visibility into unrelated clients or orders.
- Client-facing status is a projection and does not mutate canonical order lifecycle directly.
- Document/report access is request/account-scoped.
- Client Portal operational doctrine lives in `docs/FALCON_CLIENT_PORTAL_BLUEPRINT.md`.
- Client communication, activity, documents, reports, and notifications stay request/account scoped and do not reuse internal AMC, vendor packet, or Staff order surfaces.

Upgrade/cross-sell path:

- Add billing.
- Add lender/client integrations.
- Add analytics/reporting.
- Add managed workflow controls.

Minimum viable complete experience:

- Submit/request orders.
- Track order status.
- Respond to action-required items.
- View activity/messages.
- Access reports/documents where allowed.
- Manage basic account settings.

Anti-clutter rules:

- Do not show staff appraisal operations nav.
- Do not show AMC/vendor/internal review queues.
- Do not make client users land on a generic internal dashboard.
- Use client-facing language, not internal production language.

## Hybrid / Ecosystem Mode

Primary user/entity:

- Companies that intentionally combine internal operations with network participation.
- Staff companies receiving AMC panel work.
- AMCs with internal staff appraisal teams.
- Larger firms with client/vendor/internal lanes.

Primary daily question:

- "What internal work, network work, client requests, and exceptions need attention in each lane?"

Included modules:

- Selected modules from Staff Appraisal Mode, AMC Operations Mode, Vendor Portal Mode, and Client Portal Mode.
- Always includes `core_workspace`, `dashboard`, `notifications`, `activity`, and `settings`.

Optional/add-on modules:

- Any module can be optional if supported by package and product design.

Intentionally hidden modules:

- Any module not explicitly enabled for the company/package.
- Any lane that the user personally lacks permission to view.

Required foundational modules:

- `core_workspace`
- `dashboard`
- `settings`
- `notifications`
- `activity`
- Enabled source modules for each lane.

Default nav lanes:

- Internal Operations.
- Network Work.
- Sent Assignments.
- Client Requests.
- Vendor/Panel.
- Analytics.
- Settings/Admin.

Dashboard surface expectations:

- Clear lane separation.
- Internal order queues.
- Assigned network packets.
- Sent assignment status.
- Client request/action-required status.
- Exceptions across lanes.

Default role preset families:

- Base mode role presets plus module-specific presets.
- Hybrid Owner.
- Hybrid Admin.
- Lane-specific operator roles where needed.

Visibility doctrine:

- Internal operations and network work stay separate unless the user explicitly opens a unified lane.
- Relationship state alone grants no visibility.
- Assignment packets grant packet visibility.
- Client portal scope grants client/order visibility.
- Internal order access remains company/order permission scoped.

Upgrade/cross-sell path:

- Add AMC operations.
- Add vendor portal.
- Add client portal.
- Add AI, analytics, reports, billing, integrations.

Minimum viable complete experience:

- User can clearly distinguish internal owned work from network assigned/sent work.
- Enabled lanes have complete dashboards/nav/empty states.
- Disabled modules do not appear as broken or unavailable features.

Anti-clutter rules:

- Do not collapse every module into one universal nav.
- Do not mix assigned packets into internal order queues without explicit labels.
- Do not show every possible add-on to every user.
- Keep lane names aligned with what the company actually bought/enabled.

## Composition Implementation Notes

- Product mode should eventually be stored as company/package configuration.
- Enabled modules should be resolved separately from user permissions.
- Route/nav/dashboard visibility should require both enabled module and user permission.
- Row/object visibility remains enforced by RLS/RPC helpers.
- Empty states should be mode-native and should not mention hidden modules.
- Upgrade prompts should be sparse, contextual, and sales-aligned.
- Staff Appraisal Mode should remain the default commercial path until another mode is proven.
- Continental AMC should validate AMC Operations without making every Staff customer see AMC concepts.

## Open Questions

- Which modules are in the base Staff Appraisal paid package versus add-ons?
- Should Vendor Portal be free/low-cost for Continental panel participation?
- Which Client Portal features are needed before external client rollout?
- How should hybrid lane selection work per user versus per company?
- Which modules require onboarding before first use?
- Which product-mode settings belong in tenant admin versus billing/package configuration?
- How much upgrade prompting is acceptable inside production workflows?
