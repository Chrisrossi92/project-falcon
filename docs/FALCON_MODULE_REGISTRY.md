# Falcon Module Registry

## Purpose

This document defines Falcon's canonical product module registry before any frontend, backend, billing, onboarding, or permission-seed implementation.

Product modes decide which modules are enabled for a company. Modules determine product surface. Permissions determine what a user can do inside that surface. Relationships describe network topology. Assignments, client access, and order access determine actual operational visibility.

The canonical permission/module matrix lives in `docs/FALCON_PERMISSION_MATRIX.md`.
The canonical product-mode composition matrix lives in `docs/FALCON_PRODUCT_MODE_COMPOSITION.md`.
The canonical navigation/dashboard composition registry lives in `docs/FALCON_NAVIGATION_COMPOSITION.md`.
The canonical product packaging and onboarding doctrine lives in `docs/FALCON_PRODUCT_PACKAGING_AND_ONBOARDING_DOCTRINE.md`.

## Runtime Metadata Implementation Status

Phase 9H has established the module registry as inert runtime metadata.

Implemented source metadata now includes:

- Product mode constants and product mode metadata.
- Module category constants.
- Module registry constants for canonical module IDs, labels, categories, implementation status, bundle type, default product modes, dependencies, permission domains, navigation registration metadata, and dashboard registration metadata.
- Module helpers for product-mode module composition, optional/hidden module lookup, dependency coverage, and metadata-only nav/dashboard registrations.
- Shadow diagnostic consumers for navigation, command palette, dashboards, empty states, and upgrade prompts.
- A cross-registry integrity guard that verifies product modes, modules, and shadow diagnostics remain aligned.

Safety boundary:

- The registry is metadata only.
- Dependency metadata is diagnostic only.
- Permission domains are metadata only and do not authorize visibility, actions, route access, billing, onboarding, or package access.
- Nav/dashboard/command/empty/upgrade registration shapes are not imported into active app surfaces.
- No company/module setting enforcement exists yet.
- No database migrations, permission seeds, billing logic, onboarding logic, or tenant/module runtime behavior were added by the metadata foundation.

## What A Falcon Module Is

A Falcon module is a bounded operational capability surface.

A module can own:

- Routes.
- Navigation items.
- Dashboard widgets.
- Permission domains.
- Onboarding steps.
- Empty states.
- Upgrade prompts.
- Product packaging and billing eligibility.
- Documentation and support language.

A module is not just a feature flag. It should represent a coherent area of work that can be enabled, hidden, sold, supported, and tested as a product surface.

## Module Categories

System modules:

- Baseline surfaces needed for almost every authenticated Falcon experience.

Core operations modules:

- Internal appraisal operations surfaces used by Staff Appraisal Mode and some Hybrid companies.

Network/ecosystem modules:

- Cross-company relationship, assignment, AMC, vendor, and client-portal surfaces.

Intelligence modules:

- Reporting, analytics, AI, and decision-support surfaces.

Platform/admin modules:

- Billing, integrations, onboarding, tenant administration, and product configuration.

## Doctrine

- Modules determine product surface.
- Permissions determine user action authority.
- Relationships do not grant visibility.
- Assignment packets and client/order access grant scoped visibility.
- Hidden modules should not appear as disabled clutter.
- Navigation, dashboards, command palette entries, empty states, and upgrade prompts should eventually derive from enabled modules, product-mode lanes, and permissions.
- Billing/packages should eventually map to module bundles.
- Packaging enables module bundles; modules determine product surface; permissions determine authority.
- Packaging, billing state, and relationship state do not grant operational visibility.
- System modules should generally be always available.
- Optional modules may be add-ons.
- Dependent modules should not be enabled without required foundations.
- Product modes should feel complete and purpose-built, not like stripped-down versions of another mode.

## Bundle Semantics

Module bundle types:

- System modules are foundational workspace capabilities needed across most packages.
- Required modules are the minimum operational surfaces that make a package complete.
- Optional modules are add-ons that expand the product surface where the customer has a natural operating need.
- Dependent modules require stable foundations before activation.
- Premium modules represent paid outcomes such as analytics, AI, integrations, billing visibility, advanced reports, or enterprise controls.

Packaging implications:

- Staff Essentials, Staff Professional, Staff AI+, AMC Operations, Vendor Portal, Client Portal, Hybrid/Ecosystem, and Enterprise later should consume this registry as coherent module bundles.
- Modules should not be enabled as arbitrary isolated switches when their dependencies, vocabulary, onboarding, dashboard, and visibility semantics are not ready.
- Future marketplace/plugin concepts must declare module dependencies, visibility boundaries, onboarding steps, and billing implications before activation.
- Billing and onboarding enforcement remain deferred until runtime module composition, package semantics, account ownership, and rollout doctrine are stable.

## Implementation Status Values

- `current`: Active product surface exists and is aligned enough to be treated as present.
- `partial`: Some product surface exists, but mode/module boundaries need more design or hardening.
- `future`: Planned module; no complete product surface yet.

## Canonical Initial Module List

| Module ID | Display Name | Category | Status |
|---|---|---|---|
| `core_workspace` | Core Workspace | System | Partial |
| `dashboard` | Dashboard | System | Current |
| `notifications` | Notifications | System | Current |
| `activity` | Activity | System | Current |
| `settings` | Settings | System | Current |
| `orders` | Orders | Core operations | Current |
| `clients` | Clients | Core operations | Current |
| `team_access` | Team Access | Core operations | Current |
| `assignments` | Assignments | Network/ecosystem | Partial |
| `reviews` | Reviews | Core operations | Partial |
| `calendar` | Calendar | Core operations | Current |
| `reports` | Reports | Intelligence | Future |
| `analytics` | Analytics | Intelligence | Partial |
| `ai_workspace` | AI Workspace | Intelligence | Future |
| `relationships` | Relationships | Network/ecosystem | Partial |
| `amc_operations` | AMC Operations | Network/ecosystem | Future |
| `vendor_portal` | Vendor Portal | Network/ecosystem | Partial |
| `client_portal` | Client Portal | Network/ecosystem | Future |
| `billing` | Billing | Platform/admin | Future |
| `integrations` | Integrations | Platform/admin | Future |
| `onboarding` | Onboarding | Platform/admin | Future |
| `tenant_admin` | Tenant Administration | Platform/admin | Future |

## Module Definitions

### `core_workspace`

Display name: Core Workspace

Category: System

Purpose:

- Provide the authenticated app shell, company context, user identity context, command surfaces, and baseline workspace behavior.

Default product modes:

- Staff Appraisal Mode.
- AMC Operations Mode.
- Vendor Portal Mode.
- Client Portal Mode.
- Hybrid / Ecosystem Mode.

Required/dependent modules:

- None.

Primary permission domains:

- `core.*`
- `core.dashboard.view`
- `settings.*`

Owned route surfaces:

- App shell.
- Authenticated landing behavior.
- Current-company context surfaces.

Owned nav surfaces:

- Shell-level account/company controls.
- Baseline workspace controls.

Owned dashboard surfaces:

- None directly; delegates to `dashboard`.

Default visibility behavior:

- Always available for authenticated users with a valid app context.

Upgrade/cross-sell relevance:

- None. This is foundational.

Implementation status:

- Partial. App shell and current-user context exist, but product-mode-aware shell selection is future work.

### `dashboard`

Display name: Dashboard

Category: System

Purpose:

- Provide the default daily work surface for the user's enabled product mode.

Default product modes:

- Staff Appraisal Mode.
- AMC Operations Mode.
- Vendor Portal Mode.
- Client Portal Mode.
- Hybrid / Ecosystem Mode.

Required/dependent modules:

- `core_workspace`

Primary permission domains:

- `core.dashboard.view`
- Mode-specific read domains such as `orders.*`, `assignments.*`, `client_portal.*`, `amc.*`.

Owned route surfaces:

- `/dashboard`

Owned nav surfaces:

- Dashboard nav item.

Owned dashboard surfaces:

- Mode-specific dashboard shell.
- Operational queue widgets.
- Assignment packet dashboard widgets.

Default visibility behavior:

- Always available when the user has at least one dashboard capability.
- The dashboard should adapt to enabled modules instead of exposing irrelevant widgets.

Upgrade/cross-sell relevance:

- Can introduce contextual upgrade surfaces only when the current workflow naturally points to an unavailable module.

Implementation status:

- Current for order and assignment dashboard routing; partial for product-mode-aware dashboards.

### `notifications`

Display name: Notifications

Category: System

Purpose:

- Deliver personal operational prompts and unread attention state.

Default product modes:

- Staff Appraisal Mode.
- AMC Operations Mode.
- Vendor Portal Mode.
- Client Portal Mode.
- Hybrid / Ecosystem Mode.

Required/dependent modules:

- `core_workspace`
- Activity/order/assignment/client portal modules may generate notifications.

Primary permission domains:

- `notifications.*`
- `notifications.preferences.*`

Owned route surfaces:

- Notification settings route where applicable.

Owned nav surfaces:

- Notification bell.
- Notification preferences entry.

Owned dashboard surfaces:

- Unread/action-required indicators where mode appropriate.

Default visibility behavior:

- Available to authenticated users, but notification content must follow row-level visibility.

Upgrade/cross-sell relevance:

- Low. Notification preferences may become part of higher package controls later.

Implementation status:

- Current.

### `activity`

Display name: Activity

Category: System

Purpose:

- Preserve durable operational memory and user-visible event history.

Default product modes:

- Staff Appraisal Mode.
- AMC Operations Mode.
- Vendor Portal Mode.
- Client Portal Mode.
- Hybrid / Ecosystem Mode.

Required/dependent modules:

- `core_workspace`
- Source modules such as `orders`, `assignments`, `client_portal`.

Primary permission domains:

- `activity.*`

Owned route surfaces:

- `/activity`
- Embedded activity panels.

Owned nav surfaces:

- Activity nav item where mode appropriate.

Owned dashboard surfaces:

- Recent activity widgets.

Default visibility behavior:

- Activity is visible only when the source order, assignment packet, or client portal object is visible.

Upgrade/cross-sell relevance:

- Advanced audit/search may become analytics/reporting upgrade territory.

Implementation status:

- Current for order activity; partial for broader mode-specific activity products.

### `settings`

Display name: Settings

Category: System

Purpose:

- Manage personal preferences, account settings, and eventually company/module configuration.

Default product modes:

- Staff Appraisal Mode.
- AMC Operations Mode.
- Vendor Portal Mode.
- Client Portal Mode.
- Hybrid / Ecosystem Mode.

Required/dependent modules:

- `core_workspace`

Primary permission domains:

- `settings.*`
- `notifications.preferences.*`

Owned route surfaces:

- `/settings`
- `/settings/notifications`

Owned nav surfaces:

- Account/settings link.

Owned dashboard surfaces:

- None by default.

Default visibility behavior:

- Personal settings should be broadly available. Company/module settings should require specific authority.

Upgrade/cross-sell relevance:

- Module configuration can expose available upgrades, but personal settings should stay clean.

Implementation status:

- Current for personal settings; partial for company/module settings.

### `orders`

Display name: Orders

Category: Core operations

Purpose:

- Manage appraisal order intake, tracking, detail, editing, workflow status, and operational execution.

Default product modes:

- Staff Appraisal Mode.
- AMC Operations Mode.
- Hybrid / Ecosystem Mode.

Required/dependent modules:

- `core_workspace`
- `dashboard`
- Usually `clients`

Primary permission domains:

- `orders.*`
- `workflow.status.*`

Owned route surfaces:

- `/orders`
- `/orders/new`
- `/orders/:id`
- `/orders/:id/edit`

Owned nav surfaces:

- Orders nav item.
- New Order actions.

Owned dashboard surfaces:

- Order queues.
- Due soon.
- Review/appraiser/admin lenses.

Default visibility behavior:

- Visible for product modes that own internal order operations.
- Row visibility is order-scoped and permission/responsibility-aware.

Upgrade/cross-sell relevance:

- Vendor Portal can upgrade to Staff Appraisal Mode for owned internal orders.
- Client Portal should not see internal order operations.

Implementation status:

- Current.

### `clients`

Display name: Clients

Category: Core operations

Purpose:

- Manage client, lender, and AMC contact/account records used by internal order operations.

Default product modes:

- Staff Appraisal Mode.
- AMC Operations Mode.
- Hybrid / Ecosystem Mode.

Required/dependent modules:

- `core_workspace`

Primary permission domains:

- `clients.*`

Owned route surfaces:

- `/clients`
- `/clients/new`
- `/clients/:id`
- `/clients/edit/:clientId`
- `/clients/profile/:clientId`

Owned nav surfaces:

- Clients nav item.

Owned dashboard surfaces:

- Client KPIs and client-related attention widgets where enabled.

Default visibility behavior:

- Visible when a company manages client records directly.
- Client rows must stay company-scoped and readable through client permissions/order-derived predicates.

Upgrade/cross-sell relevance:

- Client Portal is a separate external-facing upgrade, not the same as internal client management.

Implementation status:

- Current.

### `team_access`

Display name: Team Access

Category: Core operations

Purpose:

- Manage company members, invitations, role presets, and active/inactive company access.

Default product modes:

- Staff Appraisal Mode.
- AMC Operations Mode.
- Hybrid / Ecosystem Mode.
- Limited organization-user management in Client Portal where needed.

Required/dependent modules:

- `core_workspace`

Primary permission domains:

- `users.*`
- `users/team.*`
- `roles.*`

Owned route surfaces:

- `/users`
- `/accept-invite/:invitationId`

Owned nav surfaces:

- Team Access nav item for internal/admin modes.

Owned dashboard surfaces:

- Optional setup/invite widgets.

Default visibility behavior:

- Visible to users with team/user read permissions.
- Invite acceptance route remains public but performs acceptance only after authentication.

Upgrade/cross-sell relevance:

- Larger teams may need advanced role preset and onboarding package features later.

Implementation status:

- Current.

### `assignments`

Display name: Assignments

Category: Network/ecosystem

Purpose:

- Manage assignment-backed cross-company work packets and owner/assigned-company collaboration.

Default product modes:

- AMC Operations Mode.
- Vendor Portal Mode.
- Hybrid / Ecosystem Mode.
- Optional add-on for Staff Appraisal Mode that sends or receives overflow/network work.

Required/dependent modules:

- `core_workspace`
- `relationships`
- Often `orders`

Primary permission domains:

- `assignments.*`
- `order_company_assignments.*`

Owned route surfaces:

- `/assignments`
- `/assignments/:assignmentId`

Owned nav surfaces:

- Assignments nav item.
- Owner-side assignment panel/action surfaces.

Owned dashboard surfaces:

- Assigned work dashboard.
- Owner sent-assignment dashboard.

Default visibility behavior:

- Assignment packet access is scoped to the assignment record.
- Assignment access is not canonical order access unless explicitly granted through order read permissions.

Upgrade/cross-sell relevance:

- Staff companies can join Continental AMC Panel.
- Vendors can upgrade from Vendor Portal to Staff Appraisal Mode.

Implementation status:

- Partial. Assignment packet infrastructure exists; full product-mode packaging is future work.

### `reviews`

Display name: Reviews

Category: Core operations

Purpose:

- Manage appraisal review workflow, revision requests, review approval, and quality-control handoffs.

Default product modes:

- Staff Appraisal Mode.
- AMC Operations Mode.
- Hybrid / Ecosystem Mode.

Required/dependent modules:

- `orders`
- `activity`

Primary permission domains:

- `reviews.*`
- `workflow.status.request_revisions`
- `workflow.status.approve_review`
- `workflow.status.ready_for_client`

Owned route surfaces:

- Embedded review actions in order detail.
- Future review queues.

Owned nav surfaces:

- Future Reviews nav item or dashboard lane.

Owned dashboard surfaces:

- Review queue widgets.
- Revision request widgets.

Default visibility behavior:

- Visible to users with review/order workflow responsibility or review permissions.

Upgrade/cross-sell relevance:

- AMC quality-control review can be a premium AMC/analytics workflow.

Implementation status:

- Partial.

### `calendar`

Display name: Calendar

Category: Core operations

Purpose:

- Show operational schedule, inspections, due dates, and assigned work timing.

Default product modes:

- Staff Appraisal Mode.
- AMC Operations Mode.
- Vendor Portal Mode.
- Hybrid / Ecosystem Mode.
- Client Portal Mode only where client-visible milestones are needed.

Required/dependent modules:

- `core_workspace`
- Source modules such as `orders` or `assignments`

Primary permission domains:

- `calendar.*`
- `orders.read.*`
- `assignments.read.*`

Owned route surfaces:

- `/calendar`

Owned nav surfaces:

- Calendar nav item.

Owned dashboard surfaces:

- Upcoming events widgets.

Default visibility behavior:

- Calendar events are visible only when the underlying order or assignment is visible.

Upgrade/cross-sell relevance:

- Advanced scheduling/capacity may become analytics or AI upgrade territory.

Implementation status:

- Current for order calendar; partial for product-mode-specific calendar.

### `reports`

Display name: Reports

Category: Intelligence

Purpose:

- Provide report/document access, delivery status, and eventually operational reporting packages.

Default product modes:

- Staff Appraisal Mode.
- AMC Operations Mode.
- Client Portal Mode.
- Hybrid / Ecosystem Mode.

Required/dependent modules:

- `orders`

Primary permission domains:

- `reports.*`

Owned route surfaces:

- Future report/document routes.

Owned nav surfaces:

- Future Reports nav item where enabled.

Owned dashboard surfaces:

- Delivery/report status widgets.

Default visibility behavior:

- Report access follows order/client portal visibility and report-specific permissions.

Upgrade/cross-sell relevance:

- Report delivery and archive features can support client portal packaging.

Implementation status:

- Future.

### `analytics`

Display name: Analytics

Category: Intelligence

Purpose:

- Provide operational metrics, performance trends, vendor/client insights, and business intelligence.

Default product modes:

- Staff Appraisal Mode.
- AMC Operations Mode.
- Hybrid / Ecosystem Mode.

Required/dependent modules:

- `dashboard`
- Source modules such as `orders`, `clients`, `assignments`

Primary permission domains:

- `analytics.*`

Owned route surfaces:

- Future analytics routes.

Owned nav surfaces:

- Analytics nav item where enabled.

Owned dashboard surfaces:

- KPI widgets.
- Performance dashboards.

Default visibility behavior:

- Aggregates must respect company scope and the user's analytics permissions.

Upgrade/cross-sell relevance:

- Strong candidate for higher-tier packages.

Implementation status:

- Partial. Some KPI surfaces exist, but moduleized analytics is future work.

### `ai_workspace`

Display name: AI Workspace

Category: Intelligence

Purpose:

- Provide AI-assisted operations, report support, summarization, prioritization, and workflow help.

Default product modes:

- Optional add-on for Staff Appraisal Mode.
- Optional add-on for AMC Operations Mode.
- Optional add-on for Hybrid / Ecosystem Mode.

Required/dependent modules:

- Source modules such as `orders`, `activity`, `reports`

Primary permission domains:

- `ai.*`

Owned route surfaces:

- Future AI workspace routes.

Owned nav surfaces:

- AI nav item or contextual AI action surfaces where enabled.

Owned dashboard surfaces:

- AI insights and suggested attention widgets where enabled.

Default visibility behavior:

- AI output must not expose source data beyond the user's existing visibility.

Upgrade/cross-sell relevance:

- Premium add-on.

Implementation status:

- Future.

### `relationships`

Display name: Relationships

Category: Network/ecosystem

Purpose:

- Manage company-to-company relationships and network eligibility without granting operational visibility by relationship alone.

Default product modes:

- AMC Operations Mode.
- Vendor Portal Mode.
- Hybrid / Ecosystem Mode.
- Optional add-on for Staff Appraisal Mode.

Required/dependent modules:

- `core_workspace`

Primary permission domains:

- `relationships.*`

Owned route surfaces:

- `/relationships`
- `/relationships/:relationshipId`

Owned nav surfaces:

- Relationships nav item where enabled.

Owned dashboard surfaces:

- Relationship setup/compliance widgets where enabled.

Default visibility behavior:

- Relationship records are visible only through relationship permissions.
- Relationship status alone grants no order, client, activity, notification, calendar, or team visibility.

Upgrade/cross-sell relevance:

- Foundation for Continental AMC Panel and ecosystem packaging.

Implementation status:

- Partial.

### `amc_operations`

Display name: AMC Operations

Category: Network/ecosystem

Purpose:

- Provide AMC-specific operations for client/lender intake, panel vendor management, assignment distribution, SLA monitoring, and quality-control queues.

Default product modes:

- AMC Operations Mode.
- Hybrid / Ecosystem Mode for companies that explicitly enable AMC capability.

Required/dependent modules:

- `orders`
- `assignments`
- `relationships`
- `reviews`
- `clients`

Primary permission domains:

- `amc.*`
- `vendor.*`
- `client_portal.*`
- `assignments.*`
- `reviews.*`

Owned route surfaces:

- Future AMC command center routes.
- Future vendor panel routes.
- Future AMC client/lender operations routes.

Owned nav surfaces:

- AMC Operations nav group.
- Vendor Panel nav item.

Owned dashboard surfaces:

- AMC command center.
- Unassigned work.
- Vendor SLA.
- Review queues.
- Client exceptions.

Default visibility behavior:

- Hidden outside AMC or explicitly hybrid packages.

Upgrade/cross-sell relevance:

- Continental AMC flagship deployment and future enterprise/AMC package.

Implementation status:

- Future.

### `vendor_portal`

Display name: Vendor Portal

Category: Network/ecosystem

Purpose:

- Give external vendors/appraisers a complete assignment-only work experience without requiring full Falcon internal operations adoption.

Default product modes:

- Vendor Portal Mode.
- Hybrid / Ecosystem Mode.

Required/dependent modules:

- `assignments`
- `relationships`
- `core_workspace`

Primary permission domains:

- `vendor.*`
- `assignments.*`

Owned route surfaces:

- Assignment packet routes.
- Future vendor profile/onboarding routes.

Owned nav surfaces:

- My Assignments.
- Vendor profile/settings.

Owned dashboard surfaces:

- Vendor assigned work dashboard.

Default visibility behavior:

- Shows assigned packets and vendor profile surfaces only.
- Does not expose internal orders/clients/team operations by default.

Upgrade/cross-sell relevance:

- Upgrade path to Staff Appraisal Mode.

Implementation status:

- Partial. Assignment packet surfaces exist; dedicated vendor portal packaging is future work.

### `client_portal`

Display name: Client Portal

Category: Network/ecosystem

Purpose:

- Give lender/client users order request, status, communication, document/report, and billing visibility without internal operations clutter.

Default product modes:

- Client Portal Mode.
- AMC Operations Mode as an enabled client-facing surface.
- Hybrid / Ecosystem Mode.

Required/dependent modules:

- `core_workspace`
- `orders`
- `reports` where document delivery is enabled.

Primary permission domains:

- `client_portal.*`
- `orders.create`
- Client-scoped order read permissions.
- `reports.*`
- `billing.*` where enabled.

Owned route surfaces:

- Future client portal order request routes.
- Future client order status routes.
- Future document/report routes.

Owned nav surfaces:

- Submit Order.
- My Orders.
- Documents/Reports.

Owned dashboard surfaces:

- Client order status dashboard.
- Action-required widgets.

Default visibility behavior:

- Shows only client-visible orders, status, activity, documents, and billing surfaces.

Upgrade/cross-sell relevance:

- Add-on for staff companies and AMC operators.

Implementation status:

- Future.

### `billing`

Display name: Billing

Category: Platform/admin

Purpose:

- Manage subscription/package billing, client billing surfaces, invoices, payment status, and package entitlement controls.

Default product modes:

- Optional for all modes.

Required/dependent modules:

- `core_workspace`
- May depend on `client_portal` for client billing.

Primary permission domains:

- `billing.*`

Owned route surfaces:

- Future billing routes.

Owned nav surfaces:

- Billing nav item where enabled and permitted.

Owned dashboard surfaces:

- Billing status widgets where relevant.

Default visibility behavior:

- Hidden unless package/billing capability is enabled and the user has billing permissions.

Upgrade/cross-sell relevance:

- Billing should eventually map packages to module bundles.

Implementation status:

- Future.

### `integrations`

Display name: Integrations

Category: Platform/admin

Purpose:

- Manage external systems, lender/LOS integrations, email/provider configuration, webhooks, and data exchange.

Default product modes:

- Optional add-on for Staff Appraisal Mode.
- Optional add-on for AMC Operations Mode.
- Optional add-on for Client Portal and Hybrid packages.

Required/dependent modules:

- `core_workspace`
- Depends on source module being integrated.

Primary permission domains:

- `integrations.*`

Owned route surfaces:

- Future integration settings routes.

Owned nav surfaces:

- Integrations nav item under settings/admin where enabled.

Owned dashboard surfaces:

- Integration health widgets where enabled.

Default visibility behavior:

- Hidden unless integrations are enabled and permitted.

Upgrade/cross-sell relevance:

- Strong add-on for AMC, lender/client, and enterprise packages.

Implementation status:

- Future.

### `onboarding`

Display name: Onboarding

Category: Platform/admin

Purpose:

- Guide company setup, module activation, team invite, client/vendor setup, package selection, and mode-specific first-run tasks.

Default product modes:

- Staff Appraisal Mode.
- AMC Operations Mode.
- Vendor Portal Mode.
- Client Portal Mode.
- Hybrid / Ecosystem Mode.

Required/dependent modules:

- `core_workspace`
- Product-mode module bundle.

Primary permission domains:

- `onboarding.*`
- Setup-specific permissions from enabled modules.

Owned route surfaces:

- Future onboarding/checklist routes.

Owned nav surfaces:

- Setup/checklist entry while incomplete.

Owned dashboard surfaces:

- Setup widgets and first-run prompts.

Default visibility behavior:

- Visible only during setup or to users responsible for setup.

Upgrade/cross-sell relevance:

- Can introduce optional modules in context after primary setup is complete.

Implementation status:

- Future.

### `tenant_admin`

Display name: Tenant Administration

Category: Platform/admin

Purpose:

- Manage company configuration, product mode selection, enabled modules, company policy, compliance, and platform/admin operations.

Default product modes:

- Staff Appraisal Mode.
- AMC Operations Mode.
- Vendor Portal Mode where vendor company administration is needed.
- Client Portal Mode where client organization administration is needed.
- Hybrid / Ecosystem Mode.

Required/dependent modules:

- `core_workspace`
- `settings`

Primary permission domains:

- `tenant_admin.*`
- `settings.*`
- `billing.*` where package changes are allowed.

Owned route surfaces:

- Future tenant administration routes.

Owned nav surfaces:

- Admin/settings nav group where enabled and permitted.

Owned dashboard surfaces:

- Company setup/admin health widgets where enabled.

Default visibility behavior:

- Hidden unless the user has company administration authority.

Upgrade/cross-sell relevance:

- Foundation for package/module changes and enterprise administration.

Implementation status:

- Future.

## Product Mode Defaults

| Module | Staff Appraisal | AMC Operations | Vendor Portal | Client Portal | Hybrid / Ecosystem |
|---|---|---|---|---|---|
| `core_workspace` | Default | Default | Default | Default | Default |
| `dashboard` | Default | Default | Default | Default | Default |
| `notifications` | Default | Default | Default | Default | Default |
| `activity` | Default | Default | Default | Default | Default |
| `settings` | Default | Default | Default | Default | Default |
| `orders` | Default | Default | Hidden | Limited | Optional |
| `clients` | Default | Default | Hidden | Hidden | Optional |
| `team_access` | Default | Default | Limited | Limited | Optional |
| `assignments` | Optional | Default | Default | Hidden | Optional |
| `reviews` | Default | Default | Hidden | Hidden | Optional |
| `calendar` | Default | Default | Default | Limited | Optional |
| `reports` | Optional | Optional | Limited | Default | Optional |
| `analytics` | Optional | Optional | Hidden | Optional | Optional |
| `ai_workspace` | Optional | Optional | Optional | Hidden | Optional |
| `relationships` | Optional | Default | Limited | Hidden | Optional |
| `amc_operations` | Hidden | Default | Hidden | Hidden | Optional |
| `vendor_portal` | Optional | Optional | Default | Hidden | Optional |
| `client_portal` | Optional | Optional | Hidden | Default | Optional |
| `billing` | Optional | Optional | Hidden | Optional | Optional |
| `integrations` | Optional | Optional | Hidden | Optional | Optional |
| `onboarding` | Default | Default | Default | Default | Default |
| `tenant_admin` | Default | Default | Limited | Limited | Optional |

Legend:

- Default: expected part of the mode's baseline product surface.
- Optional: add-on or package-dependent module.
- Limited: available only as a constrained portal/admin subset.
- Hidden: should not appear in normal navigation or dashboards.

## Future Implementation Notes

- A future module registry table or config file should use this document as its initial canonical source.
- A future module entitlement resolver should answer which modules are enabled for the current company.
- Route config, navigation, dashboard widgets, onboarding steps, and upgrade prompts should eventually derive from enabled modules.
- Permission checks must remain separate from module enablement. A module can be enabled for a company while an individual user lacks permission to act inside it.
- Billing/package logic should map to module bundles, but package logic must not bypass permissions or row-level visibility.
