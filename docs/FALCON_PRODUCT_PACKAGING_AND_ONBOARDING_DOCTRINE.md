# Falcon Product Packaging and Onboarding Doctrine

## Purpose

This document defines Falcon's canonical product packaging, module bundle, onboarding, upgrade, trial/demo, and commercialization doctrine before implementation.

It is planning documentation only. It does not change source code, route configuration, navigation components, dashboard components, command palette behavior, permission seeds, package enforcement, billing logic, onboarding UI, company settings, database migrations, payment processing, tenant/module/package runtime behavior, or visibility enforcement.

Reference docs:

- `docs/FALCON_PRODUCT_MODE_ARCHITECTURE.md`
- `docs/FALCON_PRODUCT_MODE_COMPOSITION.md`
- `docs/FALCON_MODULE_REGISTRY.md`
- `docs/FALCON_PERMISSION_MATRIX.md`
- `docs/FALCON_NAVIGATION_COMPOSITION.md`
- `docs/FALCON_MODE_EMPTY_STATES_AND_UPGRADES.md`
- `docs/FALCON_PRODUCT_MODE_GUARDRAILS.md`
- `docs/FALCON_PRODUCT_MODE_IMPLEMENTATION_SLICES.md`
- `docs/FALCON_CONTINENTAL_AMC_BLUEPRINT.md`
- `docs/FALCON_VENDOR_PORTAL_BLUEPRINT.md`
- `docs/FALCON_CLIENT_PORTAL_BLUEPRINT.md`

## Core Commercialization Philosophy

- Staff Appraisal Mode remains the primary SaaS path.
- AMC sophistication should support ecosystem growth without contaminating core Staff Appraisal UX.
- Vendor Portal and Client Portal should feel like complete products, not restricted Staff or AMC accounts.
- Packaging should map to operational outcomes, not hidden features.
- Modules are capability bundles, not arbitrary feature flags.
- Product packages enable coherent module bundles. They do not create visibility by themselves.
- Permissions determine authority inside enabled modules.
- Company relationships describe network topology and eligibility. They do not expose operational data.
- Assignment packets, readable orders, readable clients, and portal/request scope remain the visibility boundary.
- Upgrade paths should be contextual, sparse, and framed around the next operational outcome.

Falcon should sell clear operating outcomes:

- Run a staff appraisal operation.
- Add professional operational controls and reporting.
- Add AI-assisted work where appropriate.
- Operate an AMC network.
- Complete assigned vendor packets.
- Give clients/lenders request, status, document, and communication access.
- Combine internal and network operations intentionally.

Falcon should not sell:

- A locked-feature catalog.
- A universal admin app with hidden panels.
- Permission names or module IDs.
- Internal architecture.
- Access to data that the visibility model would otherwise hide.

## Product Packages

### Staff Essentials

Target customer:

- Independent appraisal shops and staff appraisal teams that need core internal operations.

Included modules:

- `core_workspace`
- `dashboard`
- `notifications`
- `activity`
- `settings`
- `orders`
- `clients`
- `team_access`
- `calendar`
- Basic `reviews` where review workflow is part of the core operational surface.

Optional modules:

- `reports`
- `analytics`
- `client_portal`
- `relationships` for future network participation.

Hidden modules:

- `amc_operations`
- `vendor_portal`
- Broad `assignments` network surfaces unless enabled.
- `billing`, `integrations`, `ai_workspace`, `tenant_admin`, and advanced onboarding unless packaged.

Intended operational scale:

- Small to midsize internal teams focused on order intake, assignment, due dates, review, delivery, clients, and team access.

Onboarding expectations:

- Create company.
- Invite team.
- Add clients/AMCs.
- Configure order defaults and basic notification preferences.
- Create first order.

Future billing concepts:

- Seat-based subscription with possible tier limits around team size, reporting, and support.

Future analytics/AI concepts:

- Basic operational summaries may become included later; advanced analytics and AI remain upgrade paths.

### Staff Professional

Target customer:

- Growing staff appraisal companies that need stronger review, reporting, client-facing delivery, and operational visibility.

Included modules:

- Staff Essentials modules.
- Expanded `reviews`.
- `reports` where report/document surfaces are productized.
- `analytics` for operational trends.
- Optional `client_portal` as packaged client-facing access.

Optional modules:

- `ai_workspace`
- `integrations`
- `relationships`
- Network `assignments` for Continental AMC participation.
- `billing` later.

Hidden modules:

- `amc_operations` unless the company intentionally expands into AMC/hybrid operations.
- `vendor_portal` as a vendor-only surface.
- `tenant_admin` unless enterprise-style administration is packaged.

Intended operational scale:

- Teams with multiple coordinators, appraisers, reviewers, delivery flows, and recurring client relationships.

Onboarding expectations:

- Staff Essentials setup plus review policy, reporting preferences, client delivery rules, and optional client access setup.

Future billing concepts:

- Higher per-seat or company subscription tier with included reporting/client-facing surfaces.

Future analytics/AI concepts:

- Delivery trends, review cycle visibility, workload reports, and optional AI add-ons.

### Staff AI+

Target customer:

- Staff appraisal companies that want AI-assisted operational summaries, report assistance, and decision support after core workflow is stable.

Included modules:

- Staff Professional modules.
- `ai_workspace` where productized.
- Expanded `analytics` where needed for AI context.

Optional modules:

- `integrations`
- `client_portal`
- `billing`
- Advanced reporting exports.

Hidden modules:

- AMC-only operations unless intentionally enabled.
- Vendor-only packet execution unless network participation is enabled.

Intended operational scale:

- Teams with enough order volume, review activity, and reporting needs to benefit from AI assistance.

Onboarding expectations:

- Core Staff onboarding first.
- AI setup should follow after operational data and workflow practices are established.
- AI prompts should be contextual to order, activity, report, or operational summary surfaces.

Future billing concepts:

- Seat plus AI usage, pooled usage, or tiered AI capability later.

Future analytics/AI concepts:

- AI summaries, report assistance, communication drafting, exception explanations, and future deterministic-to-AI handoff surfaces.

### AMC Operations

Target customer:

- Continental AMC and future AMC operators managing client/lender intake, vendor relationships, assignment packets, reviews, SLA pressure, and delivery.

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

Optional modules:

- `vendor_portal`
- `client_portal`
- `reports`
- `analytics`
- `integrations`
- `billing`
- `ai_workspace`

Hidden modules:

- Staff-only appraisal shop UX unless the AMC has internal staff appraisal operations.
- Vendor-only packet workspace for AMC internal users.
- Client-only request/status workspace for AMC internal users.

Intended operational scale:

- Network operations with vendor panels, client/lender accounts, outsourced assignments, review/QC, delivery risk, and escalation management.

Onboarding expectations:

- Create AMC operator company.
- Configure client/lender relationships.
- Configure vendor panel relationships.
- Define assignment/SLA/review policy.
- Invite operations users.
- Enable Vendor Portal and Client Portal only when those surfaces are ready.

Future billing concepts:

- Organization subscription, operations seats, network volume, assignment volume, integrations, and analytics tiers later.

Future analytics/AI concepts:

- Vendor performance, SLA analytics, client/lender analytics, delivery-risk summaries, and future routing suggestions.

### Vendor Portal

Target customer:

- External vendors/appraisers that only need assigned packet execution for AMC or network work.

Included modules:

- `core_workspace`
- `dashboard`
- `notifications`
- `activity`
- `settings`
- `assignments`
- `vendor_portal`
- Limited `calendar` where assignment scheduling is exposed.

Optional modules:

- Vendor profile/readiness surfaces.
- `reports` for packet deliverables where productized.
- `ai_workspace` for packet assistance later.
- Upgrade to Staff Appraisal package for owned internal operations.

Hidden modules:

- Owned internal `orders`.
- `clients` CRM.
- `amc_operations`.
- `client_portal`.
- Broad `team_access`, `analytics`, `billing`, and `integrations` unless specifically packaged.

Intended operational scale:

- Single vendors or small vendor organizations completing assigned packets without adopting full internal operations.

Onboarding expectations:

- Accept panel/vendor invitation.
- Create or confirm vendor profile.
- Set communication preferences and availability where enabled.
- Receive and work assignment packets.

Future billing concepts:

- Often free or AMC-sponsored initially; future vendor upgrades, AI assistance, or payout/billing surfaces may be priced separately.

Future analytics/AI concepts:

- Packet history, availability insights, profile readiness, AI packet assistance, and future Staff upgrade analytics.

### Client Portal

Target customer:

- Lenders, direct clients, requester organizations, and future client account users.

Included modules:

- `core_workspace`
- `dashboard`
- `notifications`
- `activity`
- `settings`
- `client_portal`
- `reports` where document/report access is enabled.
- Limited `orders` request/status surfaces only.

Optional modules:

- `billing`
- `integrations`
- `analytics`
- Limited `team_access` for client organization users later.

Hidden modules:

- Internal Staff/AMC order operations.
- `clients` CRM.
- `assignments`
- `reviews`
- `amc_operations`
- `vendor_portal`

Intended operational scale:

- Request/status/document access for client organizations from individual requesters to larger lender teams.

Onboarding expectations:

- Accept client organization invitation.
- Confirm requester/account information.
- Submit or view requests.
- Configure notification and document delivery preferences where enabled.

Future billing concepts:

- Client portal may be included with AMC/Staff packages, billed by client organization, or connected to billing/invoice modules later.

Future analytics/AI concepts:

- Portfolio status reporting, lender integrations, AI status summaries, and document/report analytics later.

### Hybrid / Ecosystem

Target customer:

- Companies intentionally combining internal staff operations, AMC operations, vendor packet participation, and/or client-facing access.

Included modules:

- Selected module bundles from Staff, AMC, Vendor Portal, and Client Portal.
- Always includes foundational system modules.

Optional modules:

- Any module can be optional if the package and product design support it.

Hidden modules:

- Any lane not explicitly enabled.
- Any surface the current user lacks permission and visibility scope to use.

Intended operational scale:

- Multi-role companies that need clear lane separation rather than one blended dashboard.

Onboarding expectations:

- Choose a base operating mode.
- Enable additional lanes deliberately.
- Configure relationship, assignment, client, and internal-operation boundaries.
- Use separate guided setup for each enabled lane.

Future billing concepts:

- Bundled module pricing, multi-company billing, network volume, analytics, AI, integrations, and enterprise controls later.

Future analytics/AI concepts:

- Cross-lane analytics and AI summaries only after lane boundaries and visibility rules are stable.

### Enterprise later

Target customer:

- Large organizations, multi-office groups, enterprise clients, complex AMCs, reseller/franchise models, and partner ecosystems.

Included modules:

- To be determined after core Staff, AMC, Vendor, Client, and Hybrid packages are proven.

Optional modules:

- Enterprise administration.
- Advanced analytics.
- Integrations.
- Public APIs.
- White-labeling later.
- Multi-org hierarchy management.

Hidden modules:

- Anything not explicitly enabled or scoped.

Intended operational scale:

- Multi-org, multi-role, high-volume, integration-heavy operations.

Onboarding expectations:

- Implementation-led onboarding, data migration, SSO/identity planning, integration mapping, policy configuration, and staged rollout later.

Future billing concepts:

- Enterprise licensing, usage, integrations, AI, support, implementation services, and custom terms later.

Future analytics/AI concepts:

- Advanced AI tiers, enterprise reporting, cross-company analytics, and integration intelligence later.

## Module Bundle Doctrine

System modules:

- `core_workspace`
- `dashboard`
- `notifications`
- `activity`
- `settings`

System modules are foundational. They should be broadly available but still mode-native in language, dashboard composition, notification content, and activity visibility.

Required modules:

- Required modules are the minimum capability set that makes a package feel complete.
- Staff packages require internal order, client, team, calendar, and workflow foundations.
- AMC Operations requires orders, clients, assignments, relationships, reviews, calendar, and AMC operations.
- Vendor Portal requires assignment packets and vendor portal surfaces.
- Client Portal requires client portal request/status/document/message surfaces.

Optional modules:

- Optional modules expand the operating surface when the customer has a natural need.
- Optional modules should not appear as locked clutter when absent.
- Optional modules should produce contextual upgrade prompts only where the current workflow makes the value obvious.

Dependent modules:

- Dependent modules require foundations before they can work safely.
- `ai_workspace` depends on stable source surfaces and safe summarization boundaries.
- `billing` depends on stable package/module semantics and account ownership.
- `integrations` depend on stable intake/delivery/identity mapping.
- `onboarding` depends on runtime module composition and package semantics.
- `tenant_admin` depends on stable company settings, membership, package, and policy models.

Premium modules:

- Premium modules should represent outcomes such as analytics, AI assistance, integrations, billing visibility, advanced reporting, or enterprise controls.
- Premium modules should not bypass visibility doctrine or reveal hidden data.

Marketplace/plugin concepts later:

- Marketplace and plugin systems are deferred until core packages, modules, permissions, visibility, and company settings are stable.
- Future plugins should declare module dependencies, visibility boundaries, onboarding steps, and billing implications before activation.

Clarifications:

- Modules determine product surface.
- Permissions determine authority.
- Packaging enables modules.
- Relationships do not create visibility.
- Visibility still comes from readable orders, readable clients, assignment packets, portal/request scope, and explicit company/user context.

## Onboarding Doctrine

### Staff company

First-run goals:

- Help the company create its operational workspace and first usable order flow.

Required setup:

- Company identity.
- Owner/admin account.
- Team invitation path.
- Client/AMC setup.
- Order defaults.
- Basic notification and calendar assumptions.

Optional setup:

- Review policy.
- Client portal access.
- Analytics/reporting.
- AI features.
- Continental AMC Panel participation.

What should remain hidden initially:

- AMC command center.
- Vendor Portal packet workspace.
- Client Portal administration unless enabled.
- Billing/package configuration not needed for first operational value.

Guided setup concepts:

- Create first client.
- Invite first team member.
- Create first order.
- Configure review/delivery defaults.

Future demo/sample data concepts:

- Sample order pipeline, demo client, sample team roles, and safe activity examples.

### AMC operator

First-run goals:

- Help the AMC configure network operations without inheriting Staff-only UX.

Required setup:

- AMC company identity.
- Operations users.
- Client/lender relationships.
- Vendor relationship foundation.
- Assignment/SLA/review policy assumptions.
- Intake and delivery basics.

Optional setup:

- Vendor Portal.
- Client Portal.
- Integrations.
- Analytics.
- AI summaries.
- Billing later.

What should remain hidden initially:

- Vendor-only packet execution shell for internal AMC users.
- Client-only request/status shell for internal AMC users.
- Staff appraisal cockpit unless the AMC intentionally enables internal staff operations.

Guided setup concepts:

- Add first client/lender.
- Invite or activate first vendor relationship.
- Create or intake first order.
- Offer first assignment.
- Configure review/delivery rules.

Future demo/sample data concepts:

- Sample intake queue, vendor panel, assignment packets, review queue, client status projection, and SLA examples.

### Vendor-only participant

First-run goals:

- Help the vendor become ready to receive and complete assignment packets.

Required setup:

- Accept vendor/panel invitation.
- Confirm profile identity.
- Add primary contact.
- Set communication preferences.
- Complete basic readiness fields where required.

Optional setup:

- Availability.
- Service areas.
- Compliance documents later.
- Packet assistance later.
- Staff Appraisal upgrade exploration.

What should remain hidden initially:

- Internal orders.
- Clients CRM.
- AMC queues.
- Client portal.
- Internal team/admin surfaces unless vendor organization administration is enabled.

Guided setup concepts:

- Complete vendor profile.
- Confirm availability.
- Review first packet offer.
- Submit first packet work.

Future demo/sample data concepts:

- Demo packet offer and sample packet timeline in sandbox/demo contexts only.

### Client/lender organization

First-run goals:

- Help client users submit requests, see status, respond to action-needed items, and access documents/reports.

Required setup:

- Accept client organization invitation or create client account context.
- Confirm requester profile.
- Configure notification preferences where available.
- Submit or view first request.

Optional setup:

- Organization users later.
- Document delivery preferences.
- Billing/invoice visibility later.
- Lender integrations later.
- Analytics/reporting later.

What should remain hidden initially:

- Internal AMC queues.
- Vendor packet lifecycle.
- Reviewer/appraiser workflow.
- Relationship topology.
- Staff/AMC operational dashboards.

Guided setup concepts:

- Submit first request.
- Upload requested document.
- View status.
- Download delivered report when available.

Future demo/sample data concepts:

- Demo request, sample status updates, sample document checklist, and sample delivered report placeholder.

### Hybrid company

First-run goals:

- Help the company choose a base operating lane and add additional lanes deliberately.

Required setup:

- Base product mode.
- Company identity.
- Team/membership.
- Core lane setup.
- Relationship/assignment/client scope rules for any enabled network lanes.

Optional setup:

- Additional lanes.
- Analytics/AI.
- Integrations.
- Billing.
- Enterprise controls later.

What should remain hidden initially:

- Any lane not explicitly selected.
- Cross-lane dashboards without labels.
- Disabled module catalogs.

Guided setup concepts:

- Choose starting lane.
- Configure internal operations.
- Add network participation.
- Configure client/vendor relationships.
- Validate dashboard lane separation.

Future demo/sample data concepts:

- Lane-specific samples for internal orders, sent assignments, received packets, relationships, and client requests.

## Upgrade Doctrine

Vendor to Staff:

- Frame as running the vendor's own appraisal operations.
- Trigger from profile/settings or internal-operations exploration, not urgent packet execution.
- Do not say the vendor is missing Staff tools.

Client to Analytics/Integrations later:

- Frame as portfolio visibility, automated request submission, and delivery integration.
- Trigger from repeated request/document workflows, reporting exports, or account administration.
- Do not expose internal AMC tools or hidden operations.

Staff to AI:

- Frame as order summaries, report assistance, communication drafting, and operational insight.
- Trigger from existing order/activity/report surfaces.
- Do not introduce AI before the core workflow has stable data and clear source attribution.

Staff to AMC participation:

- Frame as joining network assignment opportunities or Continental AMC Panel participation.
- Keep internal operations isolated unless explicit assignment packets are created.

AMC to Client/Vendor ecosystem expansion:

- Frame as giving vendors packet execution tools and giving clients request/status/document access.
- Trigger from vendor assignment and client delivery workflows.
- Keep portal setup separate from internal AMC operations.

Hybrid expansion:

- Frame as adding a clearly labeled operating lane.
- Require lane separation and visibility boundaries before dashboard/nav exposure.

Upgrade rules:

- Upgrades should feel contextual.
- Do not use "missing features" framing.
- Do not create locked-feature graveyards.
- Do not use aggressive upgrade spam.
- Do not show prompts that reveal hidden data or internal package mechanics.
- Do not show upgrade prompts in urgent execution paths when they would slow down operational work.

## Trial / Demo Doctrine

Demo workspaces:

- Future demo workspaces should show a coherent product mode, not every module.
- Demo data should match the package and mode being sold.

Seeded sample data later:

- Staff demos should include clients, orders, team roles, review, calendar pressure, and activity.
- AMC demos should include intake, vendors, assignments, client status projection, review/QC, and SLA examples.
- Vendor demos should include assignment packet offers, active packets, due dates, submissions, and packet activity.
- Client demos should include requests, status updates, documents, messages, and delivered reports.
- Hybrid demos should use separated lanes.

Sandbox/demo mode later:

- Sandbox mode should be visibly non-production.
- Sandbox data must not affect real notifications, billing, assignments, vendor panel status, client delivery, or operational metrics.

Guided onboarding later:

- Guided onboarding should follow enabled modules and package outcomes.
- It should hide irrelevant steps, avoid disabled-module clutter, and preserve the current product mode's vocabulary.

Future sales/demo environments:

- Sales demos may need mode-specific demo tenants, role personas, sample data, and safe reset behavior.
- Demo environments should not become product authority for runtime package enforcement.

## Billing Doctrine

Billing is conceptual and deferred.

Possible future billing concepts:

- Seat-based subscriptions.
- Module-based packages.
- Organization billing.
- AMC network billing later.
- Assignment or transaction volume later.
- AI usage later.
- Vendor payout/billing later.
- Client portal or lender integration billing later.
- Enterprise licensing later.
- Implementation/support services later.

Billing clarifications:

- No billing implementation yet.
- No Stripe/payment work yet.
- No billing enforcement yet.
- No package enforcement yet.
- Billing state must not bypass permissions or visibility.
- Billing copy should describe outcomes, not backend modules or entitlements.
- Billing surfaces should appear only when package doctrine, runtime module composition, account ownership, invoicing rules, and payment provider choices are stable.

## Guardrails

- Do not expose disabled-module graveyards.
- Do not mix operational doctrine with billing enforcement.
- Do not expose internal module/package terminology to end users unnecessarily.
- Do not allow packaging to bypass visibility doctrine.
- Do not implement tenant enforcement before metadata/runtime systems are stable.
- Do not build onboarding before runtime module composition exists.
- Do not build billing before package/module semantics and account ownership are stable.
- Do not make Vendor Portal or Client Portal feel like restricted Staff/AMC workspaces.
- Do not let AMC sophistication contaminate Staff Appraisal UX.
- Do not turn relationships into visibility grants.
- Do not let demo/sample data trigger real operational side effects.
- Do not introduce marketplace/plugin systems before core module boundaries are proven.

## Future Deferred Systems

The following systems are intentionally deferred:

- Marketplace/plugins.
- White-labeling later.
- Enterprise multi-org hierarchies.
- Reseller/franchise models.
- Advanced AI tiers.
- Lender integrations.
- Mobile-first experiences.
- Public APIs.
- Partner ecosystems.
- SSO/SAML enterprise identity.
- Data migration tooling.
- Usage metering.
- Invoicing/payment provider integration.
- Vendor payout systems.

## Future Contributor Checklist

Before implementing package, onboarding, billing, or upgrade systems, verify:

- The package maps to a coherent operational outcome.
- Enabled modules produce a complete mode-native surface.
- Hidden modules stay hidden rather than disabled.
- Permissions still determine authority.
- Visibility still comes from explicit operational scope, not package state or relationship state.
- Onboarding steps match the selected package and mode.
- Upgrade prompts are contextual and not shown during urgent execution work.
- Billing concepts remain separate from operational doctrine until enforcement is intentionally designed.
- Demo/sample data cannot affect production operations.
