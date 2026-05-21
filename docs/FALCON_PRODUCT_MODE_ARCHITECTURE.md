# Falcon Product Mode Architecture

## 1. Executive Summary

Falcon should support multiple complete product modes without making any customer feel like they are using a stripped-down or half-finished version of someone else's product.

The platform should start from a strong Staff Appraisal Mode because that is the likely primary SaaS demand. AMC Operations, Vendor Portal, Client Portal, and Hybrid/Ecosystem modes should be designed as complete experiences with their own dashboard, navigation, permissions, and onboarding path.

Modules and network access are upgrade paths. They should not appear as clutter in a mode that does not need them.

The Continental AMC operational blueprint in `docs/FALCON_CONTINENTAL_AMC_BLUEPRINT.md` defines the flagship AMC proving-ground doctrine for validating AMC Operations, Vendor Portal, Client Portal, Hybrid participation, assignment packets, SLA queues, and escalation behavior without contaminating Staff Appraisal Mode.
The Vendor Portal operational blueprint in `docs/FALCON_VENDOR_PORTAL_BLUEPRINT.md` defines the assignment-only external vendor experience for packet execution, vendor dashboard/navigation, packet visibility, communication, and Staff Appraisal upgrade framing.
The Client Portal operational blueprint in `docs/FALCON_CLIENT_PORTAL_BLUEPRINT.md` defines the request/status/document client-facing workspace for lenders, direct clients, requester organizations, client dashboard/navigation, communication, visibility, and contextual upgrade framing.
The product packaging and onboarding doctrine in `docs/FALCON_PRODUCT_PACKAGING_AND_ONBOARDING_DOCTRINE.md` defines conceptual package families, module bundle doctrine, onboarding paths, upgrade paths, trial/demo posture, and deferred billing strategy before runtime enforcement.

## 2. Core Product Philosophy

Each entity sees a complete, isolated experience for the function they chose.

Core rules:

- A product mode is a coherent operating surface, not just a permission mask.
- Missing modules should not look like disabled or unavailable features.
- Packaging should map to operational outcomes, not hidden features.
- Modules are capability bundles, not arbitrary feature flags.
- Navigation should be purpose-built for the mode.
- Dashboards should answer the primary daily question for that entity.
- Cross-company network access should be additive and intentional.
- Capability and permission checks remain the enforcement layer.
- Company relationships provide network topology, not automatic data visibility.

This means a staff appraisal company can use Falcon as a complete internal operations platform without caring about AMC operations. An AMC can run Falcon as a complete order/vendor/client operations system. A vendor can participate in an AMC panel without adopting Falcon internally. A client can see only order intake/status/communication surfaces without internal operational tools.

## 3. Product Modes Overview

| Mode | Target Entity | Primary Experience | Default Scope | Main Upgrade Path |
|---|---|---|---|---|
| Staff Appraisal Mode | Appraisal shops and staff appraiser companies | Internal order operations | Own team, clients, orders, calendar, reviews | Join Continental AMC Panel, add AI/reporting/analytics |
| AMC Operations Mode | AMCs and appraisal management teams | Vendor/client/order network operations | Client orders, vendor assignments, panel management | Add client portal, vendor portal, analytics, integrations |
| Vendor Portal Mode | External appraisers/vendors | Assigned work packet execution | Assigned AMC/vendor packets only | Upgrade to Staff Appraisal Mode |
| Client Portal Mode | Lenders/clients/borrowers where applicable | Order request and status visibility | Submitted/readable orders only | Add integrations, analytics, managed workflow |
| Hybrid / Ecosystem Mode | Companies with multiple roles | Combined internal operations and network participation | Company-selected module bundle | Expand into AMC, vendor, or client network functions |

## 4. Staff Appraisal Mode

Target user/entity:

- Independent appraisal firms.
- Staff appraiser companies.
- Internal admin/reviewer/appraiser teams.

Primary jobs-to-be-done:

- Create, assign, track, review, and deliver appraisal orders.
- Manage clients and AMCs.
- Coordinate appraisers/reviewers.
- Track due dates, calendar work, and order status.
- Maintain operational memory through activity and notifications.

Core dashboard:

- Order workload, deadlines, status queues, upcoming inspections, reviewer/appraiser workload, exceptions.

Key modules:

- Orders.
- Clients.
- Team Access.
- Assignments.
- Reviews.
- Calendar.
- Activity/notifications.
- Reports and analytics.
- Settings.

Permissions needed:

- `core.dashboard.view`
- `orders.*`
- `clients.*`
- `users/team.*`
- `assignments.*`
- `reviews.*`
- `calendar.*`
- `reports.*`
- `analytics.*`
- `settings.*`

Should be hidden:

- AMC panel administration unless enabled.
- Vendor marketplace/network administration unless enabled.
- Client portal administration unless enabled.
- Billing/package features not relevant to the company plan.

Upgrade/cross-sell path:

- Join Continental AMC Panel for order opportunities.
- Add AI operations and reporting.
- Add advanced analytics.
- Add client portal for direct lender/client visibility.

## 5. AMC Operations Mode

Target user/entity:

- Continental AMC as the internal flagship deployment.
- External AMCs if Falcon later sells this mode.

Primary jobs-to-be-done:

- Intake client/lender orders.
- Assign work to vendors/panel appraisers.
- Monitor vendor delivery, review status, exceptions, SLA performance.
- Manage client relationships and vendor panel quality.

Core dashboard:

- AMC operations command center: incoming orders, unassigned work, vendor SLA, review queues, client exceptions, aging, and delivery risk.

Continental AMC blueprint:

- Continental AMC is the flagship internal AMC deployment and proving ground.
- It validates AMC mode, vendor packet execution, client/lender request and status surfaces, hybrid participation, assignment packet boundaries, and SLA/queue systems.
- It should not become the global default UX or force AMC command-center language into Staff Appraisal Mode.

Key modules:

- AMC order intake.
- Panel/vendor management.
- Assignment packet management.
- Client/lender portal management.
- Reviews and quality control.
- SLA/calendar.
- Analytics.
- Integrations.

Permissions needed:

- `core.dashboard.view`
- `amc.*`
- `orders.*`
- `assignments.*`
- `vendor.*`
- `client_portal.*`
- `reviews.*`
- `calendar.*`
- `analytics.*`
- `integrations.*`
- `settings.*`

Should be hidden:

- Staff-only internal appraiser workflow unless the AMC also has internal appraisal staff.
- Vendor internal operations.
- Client-only simplified views.

Upgrade/cross-sell path:

- Add client portals for lenders.
- Add vendor portals for panel participation.
- Add advanced vendor analytics.
- Add integrations with lender systems or LOS platforms.

## 6. Vendor Portal Mode

Target user/entity:

- External appraisers or appraisal companies joining Continental AMC Panel.
- Vendors that only need to accept, manage, and complete assigned AMC work.

Vendor Portal blueprint:

- The canonical assignment-only Vendor Portal doctrine lives in `docs/FALCON_VENDOR_PORTAL_BLUEPRINT.md`.
- Vendor Portal should feel like a complete packet execution workspace, not a restricted Staff Appraisal account.
- Vendor relationships and panel membership do not grant visibility; explicit assignment packets grant scoped packet access.

Primary jobs-to-be-done:

- Receive assignments.
- Accept/decline packets.
- Track due dates and requirements.
- Communicate status/activity.
- Upload or complete required deliverables where supported.

Core dashboard:

- Assigned work queue: new offers, active assignments, due soon, revision requests, completed packets.

Key modules:

- Assignment packets.
- Limited activity/communication.
- Calendar for assigned work.
- Vendor profile/settings.
- Optional order/report workspace if upgraded.

Permissions needed:

- `core.dashboard.view`
- `assignments.*`
- `vendor.*`
- `calendar.*`
- `settings.*`
- Optional `orders.read.assigned` only where a packet intentionally grants order-derived visibility.

Should be hidden:

- Company-wide orders.
- Client management.
- Team management unless upgraded to Staff Appraisal Mode.
- AMC panel administration.
- Client portal administration.
- Internal AMC analytics.

Upgrade/cross-sell path:

- Upgrade to Staff Appraisal Mode for internal order management.
- Add AI/report workflow.
- Add analytics for internal operations.

## 7. Client Portal Mode

Target user/entity:

- Lenders.
- Direct appraisal clients.
- Client organizations that only need order submission/status/communication.

Client Portal blueprint:

- The canonical request/status/document Client Portal doctrine lives in `docs/FALCON_CLIENT_PORTAL_BLUEPRINT.md`.
- Client Portal should feel like a complete client-facing workspace, not a restricted Staff Appraisal or AMC Operations account.
- Client access is scoped to requests, statuses, documents/reports, and communication. Client-facing status is a projection layer, not canonical workflow authority.
- Client users should not see internal AMC queues, vendor packet lifecycle, assignment mechanics, reviewer/appraiser workflow, private notes, internal escalation, or relationship topology.

Primary jobs-to-be-done:

- Submit orders.
- Track status and due dates.
- Respond to requests.
- Review delivery milestones.
- Access reports/documents where allowed.

Core dashboard:

- Client order portal: submitted orders, status, action required, recent updates, delivered work.

Key modules:

- Client order request.
- Order status tracking.
- Communication/activity.
- Document/report access.
- Billing if needed.

Permissions needed:

- `core.dashboard.view`
- `client_portal.*`
- `orders.create`
- `orders.read.assigned` or client-specific order read permissions.
- `reports.read.assigned`
- `billing.*` if enabled.
- `settings.*`

Should be hidden:

- Internal staff assignment.
- Vendor panel management.
- Team role management beyond client organization users.
- Appraiser/reviewer workflows.
- AMC operational queues.

Upgrade/cross-sell path:

- Add lender/client integrations.
- Add analytics/reporting.
- Add managed workflow controls.

## 8. Hybrid / Ecosystem Mode

Target user/entity:

- Companies that operate in more than one role.
- Staff appraisal companies that also receive AMC panel work.
- AMCs that also run internal appraisal teams.
- Larger firms with client, vendor, and internal operations needs.

Primary jobs-to-be-done:

- Run internal operations while participating in network relationships.
- Keep internal orders, assigned packets, client requests, and vendor/client relationships distinct.
- Expand modules without confusing users who only need one surface.

Core dashboard:

- Role-aware dashboard with clear lanes: internal operations, assigned network work, sent assignments, client requests, and exceptions.

Key modules:

- Selected modules from Staff, AMC, Vendor, and Client Portal modes.
- Relationship management.
- Assignment packets.
- Advanced analytics.
- Integrations.

Permissions needed:

- Capability-derived bundle from enabled modules.
- Company relationship permissions for network actions.
- No implicit visibility from relationship status alone.

Should be hidden:

- Any module not enabled for the company's package or role.
- Cross-network data without explicit assignment/client/order visibility.

Upgrade/cross-sell path:

- Add AMC module.
- Add vendor panel participation.
- Add client portal.
- Add analytics, AI, and integrations.

## 9. Capability / Module Model

Falcon should model product access as capabilities/modules layered over company membership and permissions.

The canonical initial module registry lives in `docs/FALCON_MODULE_REGISTRY.md`. That registry is the Phase 9B source of truth for module IDs, categories, default product modes, dependencies, permission domains, route/nav/dashboard ownership, visibility behavior, upgrade relevance, and implementation status.

The canonical permission/module matrix lives in `docs/FALCON_PERMISSION_MATRIX.md`. That matrix defines permission domains, route/nav permissions, workflow/action permissions, scoped visibility concepts, dangerous permissions, owner-sensitive permissions, and product-mode default permission bundles.

The canonical product-mode composition matrix lives in `docs/FALCON_PRODUCT_MODE_COMPOSITION.md`. That matrix defines included, optional, hidden, and foundational modules for each mode, plus dashboard/nav expectations, upgrade paths, minimum viable complete experiences, and anti-clutter rules.

The canonical navigation/dashboard composition registry lives in `docs/FALCON_NAVIGATION_COMPOSITION.md`. That registry defines how enabled modules should eventually compose navigation entries, dashboard widgets, command palette entries, empty states, setup steps, dependency requirements, and contextual upgrade prompts.

The canonical product-mode implementation slice map lives in `docs/FALCON_PRODUCT_MODE_IMPLEMENTATION_SLICES.md`. That roadmap sequences safe future implementation from constants and metadata through resolvers, shadow registries, dashboard shells, empty states, upgrade prompts, onboarding/package resolution, billing/package mapping, and later company module settings.

The canonical mode-specific dashboard and navigation blueprint lives in `docs/FALCON_MODE_NAV_DASHBOARD_BLUEPRINT.md`. That blueprint defines dashboard names, primary daily questions, section hierarchy, navigation lanes, mobile expectations, command palette expectations, empty states, upgrade surfaces, language rules, hidden surfaces, anti-reuse rules, minimum viable dashboards, and future enhanced dashboards for each product mode.

The canonical product packaging and onboarding doctrine lives in `docs/FALCON_PRODUCT_PACKAGING_AND_ONBOARDING_DOCTRINE.md`. That doctrine defines conceptual package families such as Staff Essentials, Staff Professional, Staff AI+, AMC Operations, Vendor Portal, Client Portal, Hybrid/Ecosystem, and Enterprise later; it also locks the rule that packages enable module bundles but never bypass permission or visibility doctrine.

Recommended module groups:

- Core workspace.
- Orders.
- Clients.
- Team Access.
- Assignments.
- Reviews.
- Calendar.
- Reports.
- AI.
- AMC operations.
- Vendor portal.
- Client portal.
- Billing.
- Analytics.
- Settings.
- Integrations.

Principles:

- Modules determine product surface.
- Permissions determine actions and data access.
- Relationships determine possible network interactions.
- Assignments/orders determine actual operational visibility.

## 10. Permission Domain Recommendations

Recommended permission domains:

- `core.dashboard.view`
- `orders.*`
- `clients.*`
- `users/team.*`
- `assignments.*`
- `reviews.*`
- `calendar.*`
- `reports.*`
- `ai.*`
- `amc.*`
- `vendor.*`
- `client_portal.*`
- `billing.*`
- `analytics.*`
- `settings.*`
- `integrations.*`

Guidance:

- Use domain permissions for route/nav access.
- Use action permissions for mutation buttons and workflow transitions.
- Use read permissions with row-level helper predicates for visibility.
- Avoid role strings as authority.
- Preserve display role labels only as non-authoritative context.

## 11. Navigation / UX Differences By Mode

Staff Appraisal Mode:

- Dashboard, Orders, Calendar, Clients, Team Access, Reports/Analytics, Settings.

AMC Operations Mode:

- AMC Dashboard, Orders, Assignments, Vendor Panel, Clients/Lenders, Reviews, Analytics, Integrations, Settings.

Vendor Portal Mode:

- My Assignments, Due Soon, Revisions, Messages/Updates, Completed Work, Profile/Availability later, Settings.

Client Portal Mode:

- Submit Request, My Requests, Status Updates, Documents/Reports, Messages/Updates, Organization Users later, Billing later, Settings.

Hybrid / Ecosystem Mode:

- Navigation should group internal operations and network work into separate lanes. Do not mix assigned AMC packets into the same mental model as owned internal orders unless the user intentionally opens a unified view.

Important UX rule:

- Do not make the UI feel like missing features. If a mode does not include a module, the navigation/dashboard should be purpose-built for that mode.

## 12. Company Relationship Model

Recommended relationship types to support product modes:

- `staff_company`
- `amc_operator`
- `amc_panel_vendor`
- `client_organization`
- `lender_client`
- `review_partner`
- `affiliate_partner`
- `hybrid_company`

Relationship rules:

- Relationship records describe business topology.
- Relationship status does not grant operational visibility by itself.
- Assignment packets grant assignment-scoped visibility.
- Client portal access grants client/order-scoped visibility.
- Staff companies joining an AMC panel keep internal operations isolated from AMC work unless explicitly linked through assignments.

## 13. Onboarding Model By Entity Type

Staff appraisal company:

- Create company.
- Invite team.
- Configure clients/AMCs.
- Configure order defaults.
- Optional: join Continental AMC Panel.

AMC:

- Create AMC operator company.
- Configure client/lender relationships.
- Configure vendor panel.
- Configure assignment/SLA/review policy.
- Optional: enable client portal and vendor portal.

Vendor:

- Accept panel/vendor invitation.
- Create vendor profile.
- Configure availability/contact info.
- Optional: upgrade to Staff Appraisal Mode.

Client/lender:

- Accept client organization invitation.
- Configure requester users.
- Submit/view orders.
- Optional: integrations and analytics.

Hybrid:

- Choose base mode.
- Enable additional modules.
- Configure relationship lanes and dashboards.

## 14. Upgrade Paths / Sales Strategy

Primary SaaS path:

- Staff Appraisal Mode is the default commercial product because most likely customers want an internal staff appraisal operations system.

Network expansion:

- Staff appraisal companies can join Continental AMC Panel for incentives and order opportunities.
- External vendors can participate in Continental AMC Panel without buying the full staff platform.
- Vendors that outgrow portal-only work can upgrade to Staff Appraisal Mode.
- Client/lender organizations can start with portal access and upgrade to deeper integrations/analytics.

Packaging:

- A la carte modules should map to capability bundles.
- Sales should describe outcomes, not missing modules.
- Upgrade prompts should be contextual and sparse.
- Product packages should follow `docs/FALCON_PRODUCT_PACKAGING_AND_ONBOARDING_DOCTRINE.md`.
- Billing and onboarding enforcement remain deferred until package/module semantics and runtime module composition are stable.

## 15. Continental AMC As Flagship Deployment

Continental AMC should be Falcon's internal and flagship AMC deployment.

Purpose:

- Prove AMC Operations Mode.
- Act as the guinea pig for panel/vendor workflows.
- Create an incentive network for staff appraisal companies.
- Validate client portal and vendor portal assumptions before selling them broadly.

Guardrails:

- Do not let Continental-specific workflows contaminate Staff Appraisal Mode.
- Keep AMC panel participation optional.
- Keep external vendor portal experience complete enough for non-Falcon vendors.
- Use Continental to validate module boundaries, relationship states, and assignment packet behavior.

## 16. Implementation Phases

Phase 9A - Product Mode Architecture:

- Define product modes, capability model, relationship model, UX principles, and roadmap alignment.

Phase 9B - Module / Permission Matrix:

- Map each module to routes, permissions, role presets, company types, and enabled product modes.
- Define the future composition registry for navigation, dashboards, command palette entries, empty states, setup steps, dependency requirements, and contextual upgrade prompts.
- Define the safe implementation slice map for converting Phase 9B docs into runtime constants, resolvers, shadow registries, and later package/company settings work.

Phase 9C - Navigation / Dashboard Mode Design:

- Design mode-specific navigation, dashboard shells, empty states, and upgrade surfaces.
- Lock the Staff, AMC, Vendor, Client, and Hybrid dashboard/nav blueprints before implementation.

Phase 9D - Continental AMC Operational Blueprint:

- Define AMC queues, vendor panel operations, client intake, assignment SLA, reviews, analytics, and internal deployment assumptions.

Phase 9E - Vendor Portal Blueprint:

- Define assignment-only vendor onboarding, packet workflow, profile requirements, communication, and upgrade path.

Phase 9F - Client Portal Blueprint:

- Define client/lender order submission, status tracking, documents/reports, messaging, billing, and integration path.

Phase 9G - Onboarding / Billing Packaging:

- Define product packages, enabled modules, billing assumptions, trial/demo flows, and relationship invitations.

Phase 9H - Implementation Slices:

- Break mode architecture into safe backend/frontend slices without reopening deferred legacy SQL cleanup prematurely.

## 17. Risks And Guardrails

Risks:

- A single navigation shell can make smaller modes feel incomplete.
- AMC-specific workflows can overcomplicate the core Staff Appraisal product.
- Relationship records can be mistaken for visibility grants.
- Vendor/client portal users can be overwhelmed by internal operations language.
- A la carte modules can create confusing permission states if not paired with mode-specific UX.

Guardrails:

- Staff Appraisal Mode remains the primary SaaS default.
- Continental AMC validates AMC mode without forcing AMC concepts into every customer account.
- Vendor Portal and Client Portal use dedicated dashboards and navigation.
- Product mode, module capability, permission, relationship, and row visibility stay separate.
- Backend permission/RPC boundaries remain authoritative.
- Legacy SQL cleanup stays paused until product direction and implementation path are locked.

## 18. Open Questions

- What exact modules are included in the base Staff Appraisal package?
- Which Continental AMC features are internal-only versus sellable AMC product features?
- Should Vendor Portal users belong to their own vendor company record by default, or can lightweight vendor identities exist before full company creation?
- How much client/lender portal functionality is required for first commercial release?
- Should billing package enforcement live in the same capability system as product modules?
- What is the minimum viable upgrade prompt model that does not clutter primary workflows?
- Which analytics belong in Staff Appraisal Mode versus AMC Operations Mode?
- How should hybrid companies choose default dashboard lanes per user?
- Which onboarding paths need guided setup before general release?
- What demo/seed package best represents the product-mode architecture?
