# Implementation Roadmap

## Purpose

This roadmap translates Falcon's architecture docs and current schema audit into a disciplined implementation sequence. It exists to prevent ad hoc patching and to keep source changes tied to a clear phase.

Primary rule:

No source code changes should be made unless they map to a specific roadmap phase.

Core architectural decision:

`public.users.id` is Falcon's canonical application user identity.

Implications:

- Domain tables should reference `public.users.id`.
- `auth.users.id` is authentication identity only.
- Any database function using `auth.uid()` must map it through `public.users.auth_id` before comparing to domain records.
- Order assignment, activity actors, notification recipients, preferences, and responsibility records should use `public.users.id`.

## Current MVP Polish Lock - 2026-05-16

These completed UI and service slices are locked as part of the current MVP hardening pass. They support Phase 0 visible-contract discipline, Phase 2 permission/profile compatibility, Phase 3 order operations, and Phase 4 activity/notification readability without adding new schema requirements.

Completed:

- New Order intake UX polish is complete: create/edit copy, compact intake header, generated order number preview, default/current status, operational section order, non-blocking recommended cues, and single post-create navigation to order detail when available.
- Inline manual client creation from New Order is complete for the opt-in MVP path: duplicate name check first, create client first, then create order with `client_id`; if client creation fails, the order is not created as a fake linked record.
- Clients MVP lock-in is complete for the current primary-contact model: client forms label Primary Client Contact fields, client detail uses live `contact_*_1` fields, related order numbers link to full order detail, and New Order previews selected-client primary contact context.
- Team Directory MVP polish is complete: Users is framed as Team Directory, Add Team Member creates a Falcon team profile only, identity color is labeled consistently, and card/list visual definition is improved.
- Identity color save behavior is FK-safe: profile/color writes target `auth_id`, then `uid`, and only fall back to public user ID when older data shape requires it; unlinked profiles show a calm error instead of causing a `user_profiles_user_id_fkey` 409.
- Orders page inventory layout polish is complete for the current table/drawer surface, including stronger row definition and a more compact operational inventory feel.

Deferred:

- Team profile/auth linking and true auth invite/login credential creation remain future Team Management work.
- Order-specific client POC fields remain deferred until schema-backed fields are added: `client_contact_name`, `client_contact_email`, and `client_contact_phone`.
- The existing contacts table remains dormant. Save-to-client-profile contact behavior should wait for a cleaned-up, company-scoped client contacts model.

## Engineering Infrastructure Stabilization - 2026-05-16

Completed:

- ESLint flat config is stabilized for the current JavaScript/JSX app surface.
- Generated/build/vendor output is excluded from lint scope, including `dist/`, `node_modules/`, `coverage/`, `.supabase/`, `tmp/`, and `build/`.
- TypeScript files are intentionally excluded for now, including generated Supabase type files.
- JSX parsing works for active app/test JavaScript files.
- Browser globals are configured for app files.
- Duplicate unused-variable reporting is reduced by disabling core `no-unused-vars` where `unused-imports/no-unused-vars` is active.
- React hooks lint plugin is wired.
- Current lint errors were fixed, and `npm run lint` exits zero with warnings only.
- `npm run build` passes.
- `git diff --check` passes.

Deferred:

- 193 lint warnings remain and should be handled in a separate warning cleanup pass.
- TypeScript linting remains deferred until parser/plugin setup and Supabase type-file encoding decisions are handled.
- Full CI is future work.
- Existing build warnings remain: Tailwind ambiguous `ease-[${EASING}]` class warning and large bundle chunk warning.

## Database Baseline Recovery - 2026-05-17

Completed:

- Supabase migration replay was recovered for clean local bootstrap.
- Historical replay-unsafe migrations were archived under `supabase/migrations_archive/pre_baseline_replay_unsafe_20260517/active`.
- Active migrations are now the curated Falcon baseline plus the multi-company foundation migrations through Phase 8C3, with frontend assignment foundation, owner offer UX, RPC-only Relationship Management UI, owner-side OrderDetail Company Assignments panel, assignment-scoped packet activity timeline, and assignment-native dashboard surfaces completed through Phase 8C4. Phase 8C4 is frontend-only and adds no backend migration.
- The active migration chain starts from:
  - `20260518000000_baseline_extensions_and_schema.sql`
  - `20260518001000_baseline_rls_policies_triggers_grants.sql`
  - `20260518002000_baseline_static_seed_data.sql`
- Local `supabase db reset` passed after baseline replay fixes, after the Slice 6C wrapper migration, after the Slice 7A active-company contract migration, after the Slice 7B order read isolation migration, after the Slice 7C order-derived read safety migration, after the Slice 7D client read isolation migration, after the Slice 7E1 client table write authorization migration, after the Slice 7E2 client mutation RPC hardening migration, after the Slice 7E3A order intake attachment authorization migration, after the Slice 7E3B legacy order RPC/import quarantine migration, after the Slice 7F1 order write policy cleanup migration, after the Slice 7F2 canonical workflow transition RPC hardening migration, after the Slice 7F3 legacy workflow/status RPC quarantine migration, after the Slice 7F4A assignment/date mutation guardrail migration, after the Slice 7G1 activity log policy/RPC hardening migration, after the Slice 7G2A notification policy/RPC hardening migration, after the Slice 7H1 legacy view/grant quarantine migration, after the Slice 7H2A explicit authenticated grants migration, after the Phase 8B1/8B2 company relationship foundation migration, and after the Phase 8B3 relationship lifecycle RPC foundation migration.
- Local Supabase types were regenerated from the replayed local database.
- Supabase Storage startup failure during validation was traced to local temp-state/tooling, not Falcon public-schema SQL.

Current lock:

- Do not reintroduce historical migrations into the active migration chain.
- New database work must build on the curated baseline chain rather than patching archived replay-unsafe migrations.
- Multi-Company Slice 7H2A is complete for explicit authenticated grants and app-role broad-grant cleanup. Phase 8B1/8B2 is complete for static company type, relationship type, and directional company relationship foundation. Phase 8B3 is complete for RPC-only relationship lifecycle operations. Phase 8B4 is complete for assignment-backed cross-company work packets, lifecycle RPCs, assignment activity/notifications, assignment-native frontend surfaces, and owner-side Offer Assignment UX. Phase 8C1 is complete for safe target-company discovery and RPC-only Relationship Management UI. Phase 8C2 is complete for the order-scoped owner assignment list RPC and owner-only OrderDetail Company Assignments panel. Phase 8C3 is complete for assignment-scoped packet activity timeline reads through `rpc_order_company_assignment_activity(uuid)` without `activity_log`, `rpc_get_activity_feed`, or canonical order activity exposure. Phase 8C4 is complete for frontend-only assignment-native dashboard surfaces that use assignment list RPC wrappers only, do not reuse order dashboards/lists/KPIs/calendar/activity, and route assignment-only users through `DashboardGate` without broadening order/client visibility. Relationship records and lifecycle status alone grant no visibility; assignment packet access is not canonical order access. Onboarding UI, notification preference company semantics, productized manual/system notifications, users/team isolation, calendar table policy tightening, `current_reviewer_id` model cleanup, review-route redesign, importer rewrite, client canonicalization/duplicate uniqueness, broader RLS cleanup, service-role grant reduction, `supabase_admin` platform default-ACL cleanup, and frontend org switching must remain separate forward migrations.

Hosted deployment blocker:

- Order document backend migrations and the `OrderDetail` Files UI are implemented against the newer company-scoped `20260518` migration chain.
- The hosted Supabase target `okwqhkrsjgxrhyisaovc` currently reflects the older/non-company schema captured in `supabase/schema_dumps/20260517_remote_public_schema.sql`.
- That hosted schema lacks `public.companies`, `orders.company_id`, current-company helpers such as `default_company_id()`, `current_company_id()`, and `current_app_user_has_current_company()`, and `current_app_user_can_read_order(uuid)`.
- Order document migrations must not be manually adapted to the hosted legacy schema. The attachment model depends on company-scoped order readability, document permissions, metadata-authorized storage, and guarded RPC/Edge flows.
- Remote attachment deployment is blocked until the hosted database is migrated to the company-scoped foundation or a staging clone is created and upgraded first.
- Edge Functions may deploy before the database is synchronized, but upload/download will fail until the required database migrations and RPCs exist on the target project.
- Do not weaken attachment security, broaden legacy order access, or bypass company-scoped authorization to support the older hosted schema.

## Phase 9: Product Mode Architecture

Status: Phase 9A planning is now open. Deep legacy SQL retirement remains paused while product direction and final implementation path are locked.

Reference:

- `docs/FALCON_PRODUCT_MODE_ARCHITECTURE.md`
- `docs/FALCON_MODULE_REGISTRY.md`
- `docs/FALCON_PERMISSION_MATRIX.md`
- `docs/FALCON_PRODUCT_MODE_COMPOSITION.md`
- `docs/FALCON_NAVIGATION_COMPOSITION.md`
- `docs/FALCON_PRODUCT_MODE_IMPLEMENTATION_SLICES.md`
- `docs/FALCON_MODE_NAV_DASHBOARD_BLUEPRINT.md`
- `docs/FALCON_MODE_EMPTY_STATES_AND_UPGRADES.md`
- `docs/FALCON_MODE_LANGUAGE_GUIDE.md`
- `docs/FALCON_PRODUCT_MODE_GUARDRAILS.md`
- `docs/FALCON_CONTINENTAL_AMC_BLUEPRINT.md`
- `docs/FALCON_AMC_QUEUE_WORKFLOW_TAXONOMY.md`
- `docs/FALCON_AMC_VENDOR_PANEL_DOCTRINE.md`
- `docs/FALCON_AMC_CLIENT_LENDER_DOCTRINE.md`
- `docs/FALCON_AMC_NOTIFICATION_ACTIVITY_ESCALATION_DOCTRINE.md`
- `docs/FALCON_VENDOR_PORTAL_BLUEPRINT.md`
- `docs/FALCON_VENDOR_PACKET_LIFECYCLE_TAXONOMY.md`
- `docs/FALCON_VENDOR_PROFILE_AVAILABILITY_UPGRADE_DOCTRINE.md`
- `docs/FALCON_CLIENT_PORTAL_BLUEPRINT.md`
- `docs/FALCON_PRODUCT_PACKAGING_AND_ONBOARDING_DOCTRINE.md`

Core decision:

- Falcon should support multiple complete product modes without making customers feel like they are using a half-baked subset.
- Staff Appraisal Mode is the primary SaaS path because most likely customers will want Falcon for internal staff appraisal operations.
- Continental AMC is the internal/flagship AMC deployment and should validate AMC Operations, Vendor Portal, Client Portal, and ecosystem assumptions without forcing AMC clutter into Staff Appraisal Mode.
- Product modules should be a la carte, capability/permission driven, and expressed through mode-specific navigation and dashboards.

Planned Phase 9 slices:

- Phase 9A Product Mode Architecture: define product modes, philosophy, capability model, relationship model, UX principles, implementation phases, and open questions.
- Phase 9B Module/Permission Matrix: map the canonical module registry to permission domains, route surfaces, role presets, company types, and product modes.
- Phase 9C Navigation/Dashboard Mode Design: design mode-specific navigation, dashboards, empty states, and upgrade surfaces so unavailable modules do not feel like missing features.
- Phase 9D Continental AMC Operational Blueprint: define Continental's AMC queues, vendor panel management, client/lender intake, SLA, review, analytics, and deployment assumptions.
- Phase 9E Vendor Portal Blueprint: define assignment-only vendor onboarding, packet workflow, profile requirements, communication, and Staff Mode upgrade path.
- Phase 9F Client Portal Blueprint: define client/lender order submission, status tracking, reports/documents, messaging, billing, and integrations.
- Phase 9G Onboarding/Billing Packaging: define packages, enabled modules, relationship invitations, demos, trials, and a la carte upgrade paths.
- Phase 9H Implementation Slices: break the product-mode plan into safe backend/frontend slices without reopening deferred SQL cleanup prematurely.

Phase 9B1 Canonical Module Registry is complete as planning documentation. `docs/FALCON_MODULE_REGISTRY.md` defines Falcon modules as bounded operational capability surfaces, groups them into system, core operations, network/ecosystem, intelligence, and platform/admin categories, and records the initial module list, default product modes, dependencies, route/nav/dashboard ownership, visibility behavior, upgrade relevance, and current/partial/future status. No route, navigation, dashboard, billing, permission seed, database, or onboarding implementation was added.

Phase 9B2 Permission Domain Matrix is complete as planning documentation. `docs/FALCON_PERMISSION_MATRIX.md` maps modules to permission domains, route/nav permissions, workflow/action permissions, scoped visibility concepts, dangerous permission classes, owner-sensitive permissions, and initial product-mode role preset templates. It records the doctrine that permissions never create visibility alone; visibility still requires company membership plus readable order/client/assignment packet/relationship/portal scope. No source code, route/nav changes, permission seed changes, database migrations, billing logic, or onboarding UI were added.

Phase 9B3 Product Mode Composition Matrix is complete as planning documentation. `docs/FALCON_PRODUCT_MODE_COMPOSITION.md` maps Staff Appraisal, AMC Operations, Vendor Portal, Client Portal, and Hybrid/Ecosystem modes to included modules, optional modules, hidden modules, required foundations, default navigation lanes, dashboard expectations, role preset families, visibility doctrine, upgrade paths, minimum viable complete experiences, and anti-clutter rules. It reinforces that a mode is a complete operating surface, not a permission preset. No code, route/nav/dashboard implementation, permission seed changes, billing logic, onboarding UI, or migrations were added.

Phase 9B4 Navigation + Dashboard Composition Registry is complete as planning documentation. `docs/FALCON_NAVIGATION_COMPOSITION.md` defines how enabled modules plus permissions should eventually compose navigation entries, dashboard widgets, command palette entries, empty states, setup steps, dependency requirements, and contextual upgrade prompts. It reinforces that product mode decides lane structure, dashboard shells are mode-specific, hidden modules should not appear as disabled clutter, Vendor/Client dashboards must not reuse staff/admin cockpit language, command palette entries must not expose hidden module concepts, and upgrade prompts should be sparse and contextual. No code, route config, navigation components, dashboards, permission seed changes, billing logic, onboarding UI, or migrations were added.

Phase 9B5 Product Mode Implementation Slice Map is complete as planning documentation. `docs/FALCON_PRODUCT_MODE_IMPLEMENTATION_SLICES.md` sequences future work from module registry constants, product mode constants, enabled-module resolution, permission/module compatibility helpers, shadow navigation and command registries, dashboard shell resolution, mode-native empty states, and contextual upgrade prompts into later onboarding/package, billing/package, and tenant/company module settings work. It locks the doctrine that implementation must start with constants/metadata only, existing routes/nav/dashboard behavior should remain stable during early slices, billing and onboarding remain deferred until packages/modules are stable, relationship visibility must not widen, and hidden modules must not render as locked clutter. No code, route/nav/dashboard implementation, permission seed changes, billing logic, onboarding UI, tenant settings, or migrations were added.

Phase 9C1 Mode-Specific Dashboard + Navigation Design Blueprint is complete as planning documentation. `docs/FALCON_MODE_NAV_DASHBOARD_BLUEPRINT.md` defines dashboard names, primary daily questions, primary and secondary dashboard sections, default navigation lanes, mobile navigation expectations, command palette expectations, empty states, upgrade prompt surfaces, language/tone rules, hidden surfaces, anti-reuse rules, minimum viable dashboards, and future enhanced dashboards for Staff Appraisal, AMC Operations, Vendor Portal, Client Portal, and Hybrid/Ecosystem modes. It locks the doctrine that Staff remains an operational cockpit, AMC is a network operations command center, Vendor is assigned packet execution, Client is order request/status visibility, Hybrid uses separate lanes, assignment-only users do not see canonical order dashboards, and hidden modules stay hidden rather than disabled. No code, routes, nav, dashboard components, permissions, billing logic, onboarding UI, or migrations were changed.

Phase 9C2 Mode-Native Empty States + Upgrade Surfaces Blueprint is complete as planning documentation. `docs/FALCON_MODE_EMPTY_STATES_AND_UPGRADES.md` defines first-run, no-data, filtered-empty, permission-limited, relationship/assignment/client-scope, and setup-needed empty states plus contextual upgrade surfaces, wording rules, hidden surfaces, no-upsell conditions, minimum viable implementation, and future enhanced implementation for Staff Appraisal, AMC Operations, Vendor Portal, Client Portal, and Hybrid/Ecosystem modes. It locks the doctrine that empty states should suggest the next natural action rather than expose missing modules, upgrade prompts should be sparse and tied to real intent, Vendor states speak in assignment/packet language, Client states speak in request/status/document language, Staff states focus on operational work, AMC states focus on intake/assignment/vendor/client flow readiness, and Hybrid states keep internal and network lanes separate. No code, routes, nav/dashboard components, permissions, seeds, billing/onboarding enforcement, or migrations were changed.

Phase 9C3 Mode-Native Language + Surface Vocabulary Blueprint is complete as planning documentation. `docs/FALCON_MODE_LANGUAGE_GUIDE.md` defines preferred product language, dashboard title language, navigation labels, command palette labels, empty-state language, upgrade-prompt language, notification/activity label considerations, words to avoid, internal terms that must not leak, good/bad copy examples, and minimum/future implementation guidance for Staff Appraisal, AMC Operations, Vendor Portal, Client Portal, and Hybrid/Ecosystem modes. It locks the doctrine that language should match the user's job in that mode; Staff can use order/workflow/review language, AMC can use intake/assignment/vendor/SLA/QC/review/delivery-risk language, Vendor should use assignment/packet/work request language, Client should use request/status/document/delivery language, Hybrid should use clear lane labels, and architecture/security terms must not leak into normal UI copy. No code, component copy, routes, nav/dashboard implementation, permissions, seeds, billing/onboarding enforcement, or migrations were changed.

Phase 9C4 Product Mode UX Guardrails + Anti-Patterns is complete as planning documentation. `docs/FALCON_PRODUCT_MODE_GUARDRAILS.md` defines UX guardrails, forbidden UI patterns, product-mode isolation rules, visibility-leak prevention doctrine, navigation/dashboard/upgrade-prompt anti-patterns, Hybrid lane safety rules, assignment-only user safety rules, Client Portal safety rules, vocabulary leak prevention, safe defaults, good/bad examples, future contributor guardrails, and an implementation-review checklist. It locks the doctrine that product modes must feel intentionally designed, hidden surfaces are preferable to disabled clutter, visibility remains explicit and scoped, assignment packet access is not canonical order access, Vendor/Client users should not feel like second-class users, Hybrid must preserve mental separation, and language/nav/dashboards/empty states are part of authorization design. No code, routes, nav/dashboard components, permissions, seeds, billing/onboarding enforcement, tenant/module/package enforcement, or migrations were changed.

Phase 9D1 Continental AMC Operational Blueprint is complete as planning documentation. `docs/FALCON_CONTINENTAL_AMC_BLUEPRINT.md` defines Continental AMC as Falcon's flagship internal AMC deployment and proving ground for AMC Operations Mode, Vendor Portal Mode, Client Portal Mode, Hybrid/Ecosystem participation, assignment packet doctrine, SLA/queue systems, and escalation behavior. It documents the AMC operational lifecycle from intake through post-delivery communication, intake doctrine, vendor panel doctrine, assignment packet boundaries, operational queues, SLA/escalation doctrine, AMC dashboard blueprint, conceptual AMC role families, hybrid participation, client/lender surfaces, notification/activity doctrine, guardrails, and deferred future systems such as vendor scoring, SLA analytics, auto-routing, AI recommendations, marketplace behavior, automated escalation, and billing/fee split systems. It locks the doctrine that Continental AMC is the proving ground rather than the global default UX, assignment packet access is not canonical order access, clients/lenders do not see internal operations, internal AMC surfaces should feel like a network command center, Hybrid participants keep lane separation, visibility remains explicit and scoped, and Staff Appraisal Mode remains the primary SaaS sales path. No code, routes, nav/dashboard components, permissions, seeds, onboarding/billing logic, tenant/module/package enforcement, or migrations were changed.

Phase 9D2 AMC Queue + Workflow Taxonomy is complete as planning documentation. `docs/FALCON_AMC_QUEUE_WORKFLOW_TAXONOMY.md` defines the canonical AMC queue taxonomy, queue fields, AMC workflow stages, relationships between canonical order lifecycle, AMC operational lifecycle, assignment lifecycle, vendor packet status, and client status, dashboard grouping, SLA/notification doctrine, guardrails, and future analytics relevance. It documents queue IDs and display labels for new intake, intake needs review, unassigned, vendor pending response, vendor declined, vendor active work, due soon, overdue, stalled vendor, revision required, review queue, review overdue, final approval, ready for delivery, delivery risk, client waiting, and recently completed work. It locks the doctrine that queue membership is operational attention rather than workflow status, not every queue is a notification, queue IDs are not user-facing, AMC workflow should not blindly reuse Staff order status labels, assignment packet status is distinct from AMC queue status, client status is an outward-facing projection, and predictive scoring remains deferred. No code, statuses, queue implementation, notifications, permissions, seeds, onboarding/billing logic, tenant/module/package enforcement, or migrations were changed.

Phase 9D3 AMC Vendor Panel + Assignment Eligibility Doctrine is complete as planning documentation. `docs/FALCON_AMC_VENDOR_PANEL_DOCTRINE.md` defines Continental AMC vendor panel purpose, conceptual vendor relationship states, assignment eligibility inputs, vendor profile concepts, assignment routing doctrine, AMC-side and vendor-side dashboard expectations, guardrails, and a future contributor checklist. It locks the doctrine that vendor panel membership is a business eligibility layer rather than an operational data grant, relationship state alone grants no order/client visibility, eligibility only determines whether an assignment may be offered, assignment packets remain the scoped visibility grant, manual routing comes before suggested vendors or auto-routing, vendor scoring must not be a subjective black box, and external vendors must not be written into owner-company appraiser/reviewer/staff assignment fields. No code, relationship statuses, assignment lifecycle, dashboards, routes, navigation, permissions, seeds, onboarding/billing logic, tenant/module/package enforcement, or migrations were changed.

Phase 9D4 AMC Client/Lender Intake + Delivery Doctrine is complete as planning documentation. `docs/FALCON_AMC_CLIENT_LENDER_DOCTRINE.md` defines Continental AMC client/lender purpose, conceptual intake channels, client-facing status doctrine, communication doctrine, delivery doctrine, Client Portal dashboard expectations, AMC-side client/lender management expectations, guardrails, and a future contributor checklist. It locks the doctrine that client/lender access is request/status/document scoped rather than internal AMC workflow visibility, client-facing status is a projection and not lifecycle authority, client communication must stay separate from internal AMC notes unless explicitly made visible, delivery/report access is request/account-scoped, clients should not see vendor names/performance by default, reviewer/appraiser workflow, vendor SLA risk, assignment packet details, internal queues, or internal escalation mechanics, and lender integrations and billing enforcement remain deferred. No code, statuses, dashboards, routes, navigation, permissions, seeds, client portal UI, onboarding/billing logic, tenant/module/package enforcement, or migrations were changed.

Phase 9D5 AMC Notifications, Activity, and Escalation Doctrine is complete as planning documentation. `docs/FALCON_AMC_NOTIFICATION_ACTIVITY_ESCALATION_DOCTRINE.md` defines Continental AMC notification doctrine, notification event families, activity memory streams, escalation triggers, communication separation, guardrails, and a future contributor checklist. It locks the doctrine that notifications are interruptive/actionable prompts, queue membership is not automatically notification-worthy, activity remains durable memory, escalations are sparse and role-targeted, assignment packet notifications stay separate from canonical owner-order notifications, client-facing updates stay separate from internal AMC notifications, and internal AMC notes, vendor packet messages, client-facing updates, system status updates, audit/security events, and notification summaries must not collapse into one generic message surface. No code, notification policies/seeds, activity tables/RPCs, dashboards, routes, navigation, automation, escalation code, permissions, tenant/module/package enforcement, or migrations were changed.

Phase 9E1 Vendor Portal Operational Blueprint is complete as planning documentation. `docs/FALCON_VENDOR_PORTAL_BLUEPRINT.md` defines Vendor Portal purpose, vendor operational lifecycle, packet visibility doctrine, dashboard and navigation blueprint, vendor language and communication doctrine, Staff Appraisal upgrade framing, visibility guardrails, deferred future systems, and a future contributor checklist. It locks the doctrine that Vendor Portal is an assignment-only packet execution workspace, not canonical order operations; vendors should never feel like restricted Staff users; relationship and panel membership do not grant visibility; assignment packet access is scoped and separate from full order/client/internal AMC operations; vendor packet messages, activity, documents, and notifications stay packet-scoped; and Staff Appraisal upgrades should be contextual operational outcomes rather than hidden-module clutter. No code, routes, navigation, dashboard components, permissions, seeds, Vendor Portal UI, onboarding/billing logic, tenant/module/package enforcement, or migrations were changed.

Phase 9E2 Vendor Portal Packet Lifecycle + Surface Taxonomy is complete as planning documentation. `docs/FALCON_VENDOR_PACKET_LIFECYCLE_TAXONOMY.md` defines conceptual vendor packet lifecycle states, vendor-safe dashboard queues, packet-scoped vendor actions, vendor-visible activity families, document/report boundaries, guardrails, and a future contributor checklist. It locks the doctrine that vendor packet states are assignment-scoped and not canonical owner-order statuses, vendor actions do not mutate owner-order lifecycle directly, vendor dashboard queues are packet-safe attention groupings rather than AMC internal queue names, vendor activity is assignment-scoped and does not reuse canonical order activity directly, client/internal AMC notes remain hidden unless intentionally relayed, and relationship/panel state never grants packet visibility. No code, routes, navigation, dashboard components, assignment lifecycle code, notification/activity tables or RPCs, permissions, seeds, tenant/module/package enforcement, or migrations were changed.

Phase 9E3 Vendor Profile, Availability, and Upgrade Doctrine is complete as planning documentation. `docs/FALCON_VENDOR_PROFILE_AVAILABILITY_UPGRADE_DOCTRINE.md` defines Vendor Portal profile purpose, conceptual profile fields, availability doctrine, onboarding readiness concepts, Staff Appraisal upgrade framing, AMC-side profile usage, guardrails, and a future contributor checklist. It locks the doctrine that vendor profile supports assignment eligibility and communication but is not a visibility grant, profile/readiness/availability affect assignment eligibility only, assignment packets remain the operational visibility grant, vendor profile should feel useful to the vendor rather than AMC-only data collection, private AMC notes and scorecards stay hidden until productized, availability/capacity must not expose internal workload or trigger auto-routing prematurely, and upgrade prompts should be contextual, respectful, and absent from urgent packet execution. No code, routes, navigation, dashboard components, relationship/assignment lifecycle, permissions, seeds, payment/compliance surfaces, tenant/module/package enforcement, or migrations were changed.

Phase 9F1 Client Portal Operational Blueprint is complete as planning documentation. `docs/FALCON_CLIENT_PORTAL_BLUEPRINT.md` defines Client Portal purpose, client operational lifecycle, client-facing visibility doctrine, dashboard and navigation blueprint, client language and communication doctrine, contextual upgrade framing, visibility guardrails, deferred future systems, and a future contributor checklist. It locks the doctrine that Client Portal is a request/status/document/report/message workspace, not restricted Staff or AMC operations; client access is request/account scoped; client-facing status is a projection layer rather than lifecycle authority; clients do not see internal AMC queues, vendor packet lifecycle, assignment mechanics, reviewer/appraiser workflow, private notes, internal escalation, or relationship topology; and client notifications, activity, communication, and documents route only to client-safe surfaces. No code, routes, navigation, dashboard components, permissions, seeds, Client Portal UI, onboarding/billing logic, tenant/module/package enforcement, or migrations were changed.

Phase 9G1 Product Packaging + Commercialization Doctrine is complete as planning documentation. `docs/FALCON_PRODUCT_PACKAGING_AND_ONBOARDING_DOCTRINE.md` defines Falcon's commercialization philosophy, conceptual package families, module bundle doctrine, onboarding flows, upgrade paths, trial/demo posture, conceptual billing doctrine, guardrails, deferred future systems, and a future contributor checklist. It locks the doctrine that Staff Appraisal Mode remains the primary SaaS path; AMC sophistication should grow the ecosystem without contaminating Staff UX; Vendor Portal and Client Portal must feel like complete products; packages map to operational outcomes rather than hidden features; modules are capability bundles; packages enable modules but do not create permissions or visibility; onboarding, billing, tenant enforcement, marketplace/plugins, and package runtime logic remain deferred until module composition and metadata systems are stable. No code, migrations, billing, onboarding UI, permission seeds, runtime module logic, payment provider work, tenant/module/package enforcement, or visibility behavior changed.

Phase 9H1 through Phase 9H10 Runtime Metadata + Shadow Composition Foundation is complete as inert source metadata, shadow diagnostics, and a protected developer diagnostics surface. Falcon now has product mode constants, product mode metadata, module category constants, a module registry, module helpers, dependency metadata, metadata-only nav/dashboard registration shapes, and shadow composition diagnostics for navigation, routes, command palette, dashboards, empty states, and upgrade prompts. The cross-registry integrity guard verifies product modes have valid module compositions, shadow diagnostics reference registered module IDs, Vendor and Client diagnostics do not leak hidden internal concepts, Hybrid diagnostics preserve lane separation, permission domains remain metadata-only, unknown inputs return safe empty diagnostics, and shadow composition imports are limited to tests plus the protected diagnostics page.

The completed diagnostics route is `/settings/product-metadata-diagnostics`. It is protected by the existing `settings.view` permission gate, is read-only, diagnostic/non-authoritative, local-state-only, performs no writes, and does not control runtime routes, navigation, dashboards, command palette behavior, permissions, billing, onboarding, company settings, or module enablement. Shadow imports remain forbidden from `TopNav`, `DashboardGate`, `CommandPalette`, active route authority, billing, onboarding, company settings, and module enforcement. This foundation changed no active route authority, navigation, mobile navigation, dashboards, command palette behavior, permissions, seeds, billing, onboarding, company/module settings, tenant enforcement, migrations, RLS, or RPC behavior.

Phase 9H12 Current Navigation vs Shadow Navigation Parity Audit is complete as documentation in `docs/FALCON_NAVIGATION_PARITY_AUDIT.md`. It records current active `TopNav`, mobile nav, command palette, settings/admin links, dashboard links, assignment links, relationship links, route authority, and diagnostics route behavior against Staff, AMC, Vendor, Client, and Hybrid shadow navigation expectations. The audit finds Staff/default surfaces are the closest parity baseline, AMC has partial operational foundations but lacks AMC-native lanes/copy, Vendor has assignment packet foundations but no safe live portal nav, Client has no live client portal shell, and Hybrid lacks lane-separated live navigation. No code, routes, navigation, command palette, dashboard behavior, permissions, seeds, migrations, billing, onboarding, or company settings changed.

Phase 9H13 Current Command Palette vs Shadow Composition Parity Audit is complete as documentation in `docs/FALCON_COMMAND_PALETTE_PARITY_AUDIT.md`. It records current active command entries, permission gates, route behavior, naming/copy, grouping behavior, settings/admin exposure, assignment exposure, and relationship exposure against Staff, AMC, Vendor, Client, and Hybrid shadow command expectations. The audit finds Staff/default command behavior is the closest current baseline, AMC has partial overlap but lacks AMC-native intake/command-center commands, Vendor should be limited to packet/workspace concepts once real portal routes exist, Client has no safe live request/status/document command shell yet, and Hybrid lacks lane-aware command grouping. No code, routes, navigation, command palette behavior, dashboards, permissions, seeds, migrations, billing, onboarding, or company settings changed.

Phase 9H14 Current Dashboard vs Shadow Dashboard Parity Audit is complete as documentation in `docs/FALCON_DASHBOARD_PARITY_AUDIT.md`. It records current `DashboardGate` behavior, the Staff/default order dashboard, assignment-native dashboard behavior, owner sent-assignment widgets, calendar/operational attention/worklist surfaces, dashboard links/actions, and role/permission/lens assumptions against Staff, AMC, Vendor, Client, and Hybrid shadow dashboard expectations. The audit finds Staff/default dashboard behavior is the closest current baseline, assignment-only dashboard safety is already a critical foundation, AMC lacks a command-center shell and implementation-ready queue contracts, Vendor has assignment packet foundations but no portal-native shell, Client has no request/status/document dashboard shell, and Hybrid lacks lane-separated dashboard behavior. No code, routes, navigation, command palette behavior, dashboard components, permissions, seeds, migrations, billing, onboarding, or company settings changed.

Phase 9H15 Active Navigation Migration Plan is complete as documentation in `docs/FALCON_ACTIVE_NAVIGATION_MIGRATION_PLAN.md`. It defines a behavior-preserving path for live navigation migration: first extract current live nav definitions into a stable registry, add Staff/default and mobile parity tests, expose live-vs-shadow comparison in diagnostics only, migrate one low-risk nav section at a time, and defer mode-aware navigation until company/module settings and Vendor/Client portal routes exist. It locks the doctrine that metadata may inform composition but never authorize access, permissions and routes remain authority, no Vendor/Client concepts should appear before real routes/data contracts, and no company/module setting enforcement is introduced. No code, routes, navigation components, command palette behavior, dashboards, permissions, seeds, migrations, billing, onboarding, or company settings changed.

Phase 9H16 Current Live Navigation Registry Extraction is complete. `src/lib/navigation/currentNavigationRegistry.js` describes current active navigation behavior only, including desktop/mobile/avatar/route-only surfaces, current labels/routes, diagnostic route treatment, permission metadata, assignment and relationship gates, and Staff/default current concepts. It remains descriptive and non-authoritative. No active `TopNav`, mobile nav, routes, command palette behavior, dashboards, permissions, seeds, migrations, billing, onboarding, or company settings changed.

Phase 9H17 Live Nav Registry vs Shadow Nav Parity Diagnostics is complete. `src/lib/navigation/navigationParityDiagnostics.js` compares the extracted current live navigation registry against shadow product-mode navigation composition and reports matched concepts, live-only diagnostic gaps, shadow-only/future gaps, diagnostic route entries, and permission metadata warnings. Output is diagnostic only and non-authoritative. No active navigation rendering, routes, permissions, command palette behavior, dashboard behavior, seeds, migrations, billing, onboarding, or company settings changed.

Phase 9H18 Display Nav Parity Diagnostics in Product Metadata Page is complete. The protected Product Metadata Diagnostics page now displays live-vs-shadow navigation parity alongside product modes, module registry, and shadow composition diagnostics. The page remains read-only, local-state-only, diagnostic/non-authoritative, and protected by `settings.view`. No active `TopNav`, mobile nav, route authority, command palette behavior, dashboard behavior, permissions, seeds, migrations, billing, onboarding, or company settings changed.

Phase 9H19 Display Command Palette Parity Diagnostics is complete. `src/lib/commandPalette/currentCommandRegistry.js` describes current live command behavior only, and `src/lib/commandPalette/commandPaletteParityDiagnostics.js` compares it against shadow command composition. The protected diagnostics page displays matched commands, live-only command gaps, shadow-only/future command gaps, lane metadata, and permission metadata warnings. At the time of H19, active `CommandPalette` remained unchanged and did not import the registry or parity helper; since H34, it imports only current-live command helpers, not shadow parity helpers.

Phase 9H20 Display Dashboard Parity Diagnostics is complete. `src/lib/dashboard/currentDashboardRegistry.js` describes current live dashboard behavior only, and `src/lib/dashboard/dashboardParityDiagnostics.js` compares it against shadow dashboard composition. The protected diagnostics page displays matched dashboard concepts, live-only dashboard entries, shadow-only/future dashboard gaps, lane metadata, widget/section notes, and permission metadata warnings. At the time of H20, active `DashboardGate`, `DashboardPage`, `AssignmentDashboardPage`, and dashboard widgets remained unchanged and did not import the registry or parity helper; since H38, `DashboardGate` imports only the current-live dashboard resolution helper, not shadow parity helpers.

Phase 9H21 Live Surface Diagnostics Doc Lock is complete as documentation. The live-vs-shadow diagnostics layer is now documented across implementation slices, active navigation migration planning, navigation parity audit, command palette parity audit, dashboard parity audit, and this roadmap before any active migration begins. The lock records completed current-live registries, parity helpers, Product Metadata Diagnostics coverage, safety boundaries, migration readiness state, and allowed next implementation options. No code, active UI, routes, permissions, seeds, migrations, billing, onboarding, or company settings changed.

Phase 9H22 Registry-Driven Settings Diagnostic Link Migration is complete as the first tiny current-live registry-backed route reference. The Product Metadata Diagnostics route now derives its path and required permission from `currentNavigationRegistry` through `src/routes/diagnosticRoutes.js`; the existing `/settings/product-metadata-diagnostics` path and `settings.view` gate are preserved. This is current-live route metadata only, not product-mode or shadow metadata authority. No active `TopNav`, mobile navigation, `CommandPalette`, `DashboardGate`, dashboard components, visible settings links, permissions, seeds, migrations, billing, onboarding, company settings, or module settings changed.

Phase 9H23 Diagnostic Route Registry Doc Lock + Settings Link Planning is complete as documentation. The H22 route-reference migration is now documented across implementation slices, active navigation migration planning, navigation parity audit, and this roadmap. The lock records that route authority remains permission-based, `currentNavigationRegistry` has only proven safe for one live route reference, product-mode/shadow metadata remains diagnostic only, and the next recommended low-risk migration candidate is Notification Settings route/link metadata because it is settings-scoped, already permission-gated, and lower risk than primary navigation. No additional routes, navigation, command palette behavior, dashboards, permissions, seeds, migrations, billing, onboarding, company settings, or module settings changed.

Phase 9H24 Registry-Driven Notification Settings Route Metadata is complete. The Notification Settings route now derives its path and required permission from `currentNavigationRegistry` through the current route metadata helper while preserving `/settings/notifications` and `notifications.preferences.manage_own`. Product Metadata Diagnostics route binding remains unchanged. No primary `TopNav`, mobile navigation, `CommandPalette`, dashboard behavior, permissions, seeds, migrations, billing, onboarding, company settings, or module settings changed.

Phase 9H25 Registry-Driven Settings/Admin Link Group is complete. `src/lib/navigation/currentSettingsUtilityLinks.js` now drives the low-risk settings/admin utility link group from current-live registry metadata: the avatar `Account settings` link and Settings page `Notification Settings →` link read current labels and paths from the registry-backed helper, while Product Metadata Diagnostics remains hidden and diagnostic-only. Current labels, ordering, routes, and gates are preserved. No primary operational nav, mobile nav, `CommandPalette`, dashboards, permissions, seeds, migrations, Vendor/Client concepts, mode-aware behavior, or company/module setting enforcement changed.

Phase 9H26 Settings Utility Registry Migration Doc Lock is complete as documentation. The H25 settings/admin utility migration is documented across implementation slices, active navigation migration planning, navigation parity audit, and this roadmap. The lock records the safety boundary, validation baseline, and readiness checklist required before any primary operational nav migration. The next recommended slice is Phase 9H27 TopNav primary nav behavior audit/planning, or alternatively extracting current primary nav entries into a registry-backed helper without rendering changes. No code, active behavior, permissions, seeds, migrations, billing, onboarding, company settings, or module settings changed.

Phase 9H27 TopNav Primary Navigation Behavior Audit is complete as documentation in `docs/FALCON_TOPNAV_PRIMARY_NAV_AUDIT.md`. The audit records current desktop and mobile TopNav behavior for Dashboard, Orders, Calendar, Clients, Relationships, Assignments, Users, Activity, and Settings; documents permission-only authority, loading/hidden-link behavior, dynamic Clients routing, assignment visibility, duplicated rendering patterns, exact active-state behavior, and command palette/dashboard relationships; and defines the safe extraction sequence before registry-backed primary nav rendering. No code, TopNav behavior, mobile nav, routes, dashboards, command palette behavior, permissions, seeds, migrations, product-mode authority, Vendor/Client concepts, or module/company setting enforcement changed.

Phase 9H31 TopNav Registry Migration Doc Lock is complete as documentation. Phase 9H28 through Phase 9H30 completed the behavior-preserving primary TopNav migration: `src/lib/navigation/currentPrimaryNavLinks.js` derives current primary nav entries from `currentNavigationRegistry`, desktop primary TopNav rendering uses `getCurrentPrimaryNavLinks()`, and mobile primary TopNav rendering uses the same helper. Current order, labels, paths, permission hiding, Clients dynamic routing, active-state behavior, mobile close-on-navigation behavior, and separate settings/account utility behavior are preserved. No product-mode/shadow metadata authority, mode-aware nav, Vendor/Client future concepts, CommandPalette migration, dashboard migration, route authority changes, permissions, seeds, migrations, company settings, or module settings were introduced. It identified command palette planning or helper extraction as the next boundary before dashboard work.

Phase 9H32 Active CommandPalette Migration Plan is complete as documentation in `docs/FALCON_ACTIVE_COMMAND_PALETTE_MIGRATION_PLAN.md`. The plan records current active command construction, permission gates, search behavior, order-search fallback behavior, route behavior, loading/error fallback behavior, labels/copy, grouping, and the relationship between `CommandPalette`, `TopNav`, `clientsPath`, and current-live registries. It defines a behavior-preserving sequence: helper-only extraction, parity tests against `currentCommandRegistry`, active `CommandPalette` helper switch, diagnostics-only current-vs-shadow comparison, and future mode-aware commands only after company/module settings and routes exist. It locks risks, required tests, and stop conditions including no hidden concept search leakage, no order-search fallback regression, no route/path drift, no Vendor/Client premature commands, and no product-mode/shadow authority. No code, active `CommandPalette` behavior, routes, navigation, dashboards, permissions, seeds, migrations, company settings, or module settings changed.

Phase 9H35 CommandPalette Registry Migration Doc Lock is complete as documentation. Phase 9H33 and Phase 9H34 completed the behavior-preserving active CommandPalette registry migration: `src/lib/commandPalette/currentCommandPaletteCommands.js` now provides `getCurrentCommandPaletteCommands()` and `getCurrentOrderSearchFallback()`, active `CommandPalette` uses `getCurrentCommandPaletteCommands()` for command construction, and order-search fallback uses `getCurrentOrderSearchFallback()`. Current command labels, ordering, routes, permission gates, loading/error fallback behavior, Clients dynamic routing, label search behavior, and `/orders?q=<query>` fallback behavior are preserved. No product-mode/shadow authority, Vendor/Client future commands, mode-aware command composition, route/nav/dashboard authority changes, permissions, seeds, migrations, company settings, or module settings were introduced.

Phase 9H36 Active Dashboard Migration Plan is complete as documentation in `docs/FALCON_ACTIVE_DASHBOARD_MIGRATION_PLAN.md`. The plan records current `DashboardGate` behavior, Staff/default order dashboard behavior, assignment-only dashboard routing, owner sent-assignment dashboard widgets, role/permission/lens assumptions, current data hooks and RPC boundaries, and dashboard links/actions. It defines a behavior-preserving sequence: helper-only extraction, parity tests against `currentDashboardRegistry`, diagnostics-only current-vs-shadow comparison, one optional low-risk dashboard metadata reference, and only later `DashboardGate` shell resolution. It locks risks, required tests, and stop conditions including no assignment-only safety regression, no widened data access, no Staff dashboard exposure to assignment-only users, no Vendor/Client future shell exposure, and no product-mode/shadow runtime authority. No code, `DashboardGate`, dashboard components, routes, navigation, command palette behavior, permissions, seeds, migrations, company settings, or module settings changed.

Phase 9H39 DashboardGate Registry Migration Doc Lock is complete as documentation. Phase 9H37 and Phase 9H38 completed the behavior-preserving active dashboard registry migration: `src/lib/dashboard/currentDashboardResolution.js` now resolves current dashboard state from current capability inputs and current-live dashboard registry metadata, and active `DashboardGate` uses that helper for branch selection. Loading behavior, Staff/default order dashboard priority, assignment-only dashboard behavior, mixed-user order priority, and unavailable/no-dashboard fallback are preserved. No Vendor Portal or Client Portal future dashboard shell is live. No product-mode/shadow dashboard authority, mode-aware dashboard shell, dashboard component/data hook/RPC change, route/nav/CommandPalette change, permission/seed change, or migration was introduced.

Phase 9H40 Phase 9H Runtime Metadata Consolidation Lock is complete as documentation. Phase 9H now has a locked inert runtime metadata foundation with product mode constants/metadata, module registry/categories/helpers, shadow navigation/route/command/dashboard/empty-state/upgrade diagnostics, a cross-registry integrity guard, and the protected Product Metadata Diagnostics page. Current-live registries/helpers now cover `currentNavigationRegistry`, `currentSettingsUtilityLinks`, `currentPrimaryNavLinks`, `currentCommandRegistry`, `currentCommandPaletteCommands`, `currentDashboardRegistry`, and `currentDashboardResolution`. Completed active migrations are limited to Product Metadata Diagnostics route metadata, Notification Settings route metadata, settings/admin utility links, desktop primary `TopNav`, mobile primary `TopNav`, active `CommandPalette` command construction, and `DashboardGate` dashboard resolution. Active app behavior is preserved; route/action permissions remain authority; product-mode/shadow metadata remains diagnostic and non-authoritative; no Vendor/Client future live surfaces, company/module settings, billing/onboarding enforcement, migrations, permission/seed changes, RLS changes, or RPC authority changes were introduced. Falcon is now ready either for another tiny live registry migration phase or to pause Phase 9H and move to another roadmap/product-mode slice.

Phase 9H validation lock:

- Product mode metadata tests pass.
- Module registry and module helper tests pass.
- Shadow navigation, route/permission mapping, command palette, dashboard, empty-state, and upgrade-prompt composition tests pass.
- Cross-registry shadow composition integrity guard passes.
- Product metadata diagnostics page render smoke test passes.
- Product Metadata Diagnostics route registry binding test passes.
- Notification Settings route registry binding test passes.
- Current settings utility link tests pass.
- Current primary nav helper tests pass.
- TopNav desktop/mobile primary nav tests pass.
- Current live navigation registry and navigation parity diagnostics tests pass.
- Current live command palette registry and command parity diagnostics tests pass.
- Current CommandPalette helper tests pass.
- Active CommandPalette tests pass.
- Current DashboardGate resolution helper tests pass.
- Active DashboardGate tests pass.
- Current live dashboard registry and dashboard parity diagnostics tests pass.
- Navigation parity audit exists before active nav migration.
- Command palette parity audit exists before active command migration.
- Active command palette migration plan, helper extraction, and helper-backed rendering are complete before active dashboard migration.
- Dashboard parity audit exists before active dashboard migration.
- Active dashboard migration plan, helper extraction, and helper-backed `DashboardGate` resolution are complete before any further dashboard shell work.
- Active navigation migration plan exists before any live registry rendering changes.
- `npm run lint` passes with the existing warning profile.
- The active CommandPalette helper migration reduced the current lint warning count from 159 to 158 by removing the stale React default import in the touched palette file.
- `npm run build` passes with the existing Tailwind ambiguity and chunk-size warnings.
- `git diff --check` passes.
- Static scans confirm shadow composition imports are limited to tests and `/settings/product-metadata-diagnostics`.
- Static scans confirm live-vs-shadow parity imports are limited to tests and `/settings/product-metadata-diagnostics`.
- Static scans confirm no product-mode/shadow metadata imports in active command, navigation, route, or dashboard authority surfaces.
- Phase 9H40 consolidation documentation is locked before any further live registry migration or product-mode runtime implementation.

Phase 9 active migration readiness checklist:

- Diagnostics output reviewed manually across Staff Appraisal, AMC Operations, Vendor Portal, Client Portal, and Hybrid/Ecosystem modes.
- Current navigation parity audit reviewed and kept current.
- Current command palette parity audit reviewed and kept current.
- Active command palette migration plan followed through helper extraction and helper-backed rendering.
- Current dashboard parity audit reviewed and kept current.
- Active dashboard migration plan exists and must be followed before any further dashboard shell work.
- Active navigation migration plan followed before any live registry rendering changes.
- Staff current navigation and dashboard parity understood before replacing active behavior.
- Assignment-only dashboard safety remains intact before dashboard composition work.
- Vendor/Client hidden-surface guardrails still passing.
- Hybrid lane metadata confirmed.
- Command palette behavior mapped and reviewed before active command migration.
- Dashboard behavior mapped and reviewed before active dashboard migration.
- Route exposure mapped.
- Permission keys and permission domains remain non-authoritative metadata.
- No runtime composition until a fallback plan exists.
- Primary operational nav helper extraction and desktop/mobile helper-backed rendering are complete. Before command palette or dashboard migration, the safety boundary in `docs/FALCON_TOPNAV_PRIMARY_NAV_AUDIT.md` must remain locked: no product-mode/shadow authority, no mode-aware nav, no Vendor/Client future concepts, no route authority drift, and no permission/seed/migration changes.
- Before any further command or dashboard migration, `docs/FALCON_ACTIVE_COMMAND_PALETTE_MIGRATION_PLAN.md` must remain the boundary: preserve command labels/order/routes, permission gates, loading/error fallback, search behavior, order-search fallback, and absence of future portal commands.
- Before any further dashboard shell work, `docs/FALCON_ACTIVE_DASHBOARD_MIGRATION_PLAN.md` must remain the boundary: preserve `DashboardGate` precedence, assignment-only dashboard safety, Staff/default dashboard behavior, dashboard links/actions, and existing data hook/RPC boundaries.

Next allowed Phase 9 implementation paths:

- Pause Phase 9H and begin a fresh phase/thread from the H40 consolidation baseline.
- Start H41 route metadata broader extraction as a tiny behavior-preserving live registry migration.
- Start H41 current dashboard widget registry cleanup as a tiny behavior-preserving metadata cleanup.
- Continue onboarding/package planning later, after route/data contracts and product-mode rollout semantics are clearer.
- Database-backed company module settings, runtime package enforcement, billing enforcement, onboarding enforcement, and tenant-specific module behavior remain deferred until the metadata runtime is proven and explicit rollout semantics are documented.

## Phase 10A: Company Bootstrap Doctrine

Status: Complete as documentation/design contracts through Phase 10A8. Runtime implementation is not complete.

Phase 10A starts the transition from internal Falcon app toward a replicable company-instance platform.

Reference:

- `docs/COMPANY_BOOTSTRAP_ARCHITECTURE.md`
- `docs/COMPANY_BOOTSTRAP_BACKEND_DEPENDENCY_AUDIT.md`
- `docs/COMPANY_BOOTSTRAP_RPC_CONTRACT.md`
- `docs/COMPANY_ONBOARDING_STATE_MODEL.md`
- `docs/OWNER_SETUP_UI_SHELL_CONTRACT.md`
- `docs/INVITE_STAFF_SETUP_BRIDGE_CONTRACT.md`
- `docs/COMPANY_BOOTSTRAP_READINESS_CHECKLIST.md`
- `docs/COMPANY_BOOTSTRAP_IMPLEMENTATION_READINESS.md`

Phase 10A1 Company Bootstrap Doctrine is complete as documentation. It defines what a Falcon company instance means, the owner instance lifecycle, company bootstrap lifecycle, global versus company-scoped boundaries, owner authority limits, why Owner is not platform/system admin, why modules and product modes are enablement/composition metadata rather than security authority, what bootstrap must eventually provision, what bootstrap must not do, and recommended future slices for backend dependency audit, bootstrap RPC design, onboarding state model, owner setup UI shell, invite/staff setup bridge, and bootstrap validation. No runtime code, migrations, permission seeds, RLS policies, RPCs, routes, registries, UI, product-mode authority, module-authoritative security, Vendor/Client live surfaces, or Continental-default company template assumptions were introduced.

Phase 10A2 Company Bootstrap Backend Dependency Audit is complete as documentation. It maps the active bootstrap-related backend surfaces across companies, memberships, roles, permissions, invitations, relationships, users/profiles, audit, activity, notifications, clients, vendor concepts, orders, assignment visibility, order numbering, settings, modules/product-mode defaults, onboarding state, registries, and diagnostics. The audit records that Falcon already has a service-role/operator `rpc_company_bootstrap(...)`, `company_audit_events`, and `rpc_company_setup_context()`, but these are partial audited foundations rather than a productized bootstrap/onboarding contract. No runtime code, migrations, permission seeds, RLS policies, RPC edits, routes, registries, UI, product-mode authority, module-authoritative security, Vendor/Client live surfaces, or Continental-default company template assumptions were introduced.

Phase 10A3 Company Bootstrap RPC Design Contract is complete as documentation. It defines the future productized bootstrap contract, proposed wrapper strategy, caller model, authorization boundary, service-role/operator constraints, idempotency, transaction, audit, error/result, rollback, post-bootstrap validation, inputs, outputs, operation sequence, hard no-go rules, and open design decisions before SQL implementation. The recommendation is to keep existing `rpc_company_bootstrap(...)` as a service-role internal primitive for now and wrap it through a future backend/Edge service boundary or versioned JSON-shaped successor rather than exposing or broadening the current positional RPC directly. No runtime code, migrations, permission seeds, RLS policies, RPC edits, routes, registries, UI, product-mode authority, module-authoritative security, Vendor/Client live surfaces, or Continental-default company template assumptions were introduced.

Phase 10A4 Company Onboarding State Model Contract is complete as documentation. It defines onboarding state as operational guidance rather than security authority, proposes a company onboarding state machine from `not_started` through `complete` with `paused` and `error` states, defines a checklist/task model, owner setup flow, readiness expectations for company profile, settings, staff invites, client/vendor setup, workflow defaults, notifications, order numbering, package/module metadata, and future runtime integration points. No runtime code, migrations, permission seeds, RLS policies, RPC edits, routes, registries, UI, product-mode authority, module-authoritative security, Vendor/Client live surfaces, or Continental-default company template assumptions were introduced.

Phase 10A5 Owner Setup UI Shell Contract is complete as documentation. It defines the future first-owner setup shell, proposed future setup routes, dashboard/empty-state integration, settings/company profile relationship, onboarding checklist relationship, product-mode/module influence, routing and access doctrine, recommended setup flow, UI primitives, implementation slices, and hard no-go rules. The shell is guidance and configuration UX only; it does not grant access, bypass permissions/RLS/RPCs, activate product modes as authority, or expose Vendor/Client live shells. No runtime code, migrations, permission seeds, RLS policies, RPC edits, routes, registries, UI, product-mode authority, module-authoritative security, Vendor/Client live surfaces, or Continental-default company template assumptions were introduced.

Phase 10A6 Invite / Staff Setup Bridge Contract is complete as documentation. It defines how bootstrap, onboarding, owner setup, Team Access invitations, membership activation, role review, and staff readiness should connect without making invitations or onboarding state security authority. The contract records the existing invitation primitives, pending versus active membership and role-assignment concepts, staff setup sequence, role/permission default expectations, checklist integration, tenant-safety rules, audit implications, implementation slices, and hard no-go rules. No runtime code, migrations, permission seeds, RLS policies, RPC edits, routes, registries, UI, product-mode authority, module-authoritative security, Vendor/Client live surfaces, global admin escalation, or Continental-specific staff defaults were introduced.

Phase 10A7 Bootstrap Validation / Readiness Checklist Contract is complete as documentation. It defines readiness validation as diagnostic guidance rather than runtime authority, maps critical/warning/optional/deferred/unknown severity semantics, proposes a future readiness result shape, defines operationally ready criteria for Staff Appraisal companies, and maps readiness categories across company profile, owner membership, owner role, role/permission seeds, settings, onboarding, order numbering, notifications, team/staff, invitations, workflow, client/vendor readiness, branding, audit, and diagnostics. No runtime code, migrations, permission seeds, RLS policies, RPC edits, routes, registries, UI, product-mode authority, module-authoritative security, Vendor/Client live surfaces, global admin escalation, or Continental-specific defaults were introduced.

Phase 10A8 Company Bootstrap Implementation Readiness Lock is complete as documentation. It closes the Phase 10A design-contract arc, summarizes locked doctrine and confirmed primitives, explains why existing `rpc_company_bootstrap(...)` should remain internal for now, identifies unresolved implementation decisions, and recommends Phase 10B as a read-only runtime inspection and readiness foundation before any provisioning wrapper is implemented. Phase 10A is complete through implementation readiness only; no runtime code, migrations, permission seeds, RLS policies, RPC edits, routes, registries, UI, product-mode authority, module-authoritative security, Vendor/Client live surfaces, global admin escalation, or Continental-specific defaults were introduced.

Phase 10A safety boundary:

- Bootstrap must be backend-owned and auditable before implementation.
- Product-mode and module metadata may seed defaults or compose UX, but they do not authorize data access or actions.
- Route/action permissions, company membership, RLS/RPC checks, readable order/client/assignment predicates, and workflow transition rules remain canonical runtime authority.
- Owner authority is company-scoped and does not imply platform/system admin capability.
- Continental AMC remains a flagship internal deployment and proving ground, not the default company bootstrap template.
- The recommended next runtime phase is Phase 10B: start with read-only existing bootstrap/setup-context inspection and readiness diagnostics before any bootstrap wrapper or provisioning mutation.

## Phase 10B: Company Bootstrap Runtime Inspection And Readiness Foundation

Status: Complete through Phase 10B9. Productized bootstrap/onboarding remains deferred.

Reference:

- `docs/COMPANY_BOOTSTRAP_IMPLEMENTATION_READINESS.md`
- `docs/COMPANY_BOOTSTRAP_PRIMITIVE_INSPECTION.md`
- `docs/COMPANY_BOOTSTRAP_READINESS_RESOLVER.md`
- `docs/COMPANY_SETUP_STORAGE_DECISION.md`
- `docs/COMPANY_BOOTSTRAP_WRAPPER_SQL_DESIGN.md`
- `docs/OWNER_SETUP_UI_SHELL_CONTRACT.md`
- `docs/COMPANY_BOOTSTRAP_RUNTIME_FOUNDATION_HANDOFF.md`
- `docs/COMPANY_SETUP_CONTEXT_CLIENT_INTEGRATION_PLAN.md`

Phase 10B1 Read-Only Bootstrap Primitive Inspection is complete as documentation plus read-only code/schema inspection. It documents the current SQL and Edge Function definitions for `rpc_company_bootstrap(...)`, `company_audit_events`, `rpc_company_setup_context()`, company memberships, company role assignments, member/role projections, company member invitation lifecycle RPCs, and invite/resend Edge Functions. It confirms the current bootstrap primitive is a mutating service-role/operator-only internal primitive; setup context is a guarded authenticated read projection; invitation prepare/list/cancel/resend-prepare are authenticated current-company RPCs; invitation finalize/resend-finalize are service-role-only; and invitation acceptance activates membership and staged role assignments only after identity checks. No runtime code, migrations, permission seeds, RLS policies, RPC edits, routes, registries, UI, tests, or generated files were changed.

Phase 10B2 Read-Only Readiness Resolver Design/Test Scaffold is complete. `src/lib/companyBootstrap/companyReadinessResolver.js` defines a pure, local, unwired readiness resolver over setup-context-like input, and `src/lib/companyBootstrap/__tests__/companyReadinessResolver.test.js` locks the result shape, critical blockers, unknown unresolved domains, and diagnostic-only output. The scaffold is not imported by active UI, routes, registries, dashboards, diagnostics pages, Supabase clients, Edge Functions, or backend code. No migrations, backend behavior, permission seeds, RLS policies, RPC edits, route changes, registry changes, UI changes, product-mode authority, module-authoritative security, Vendor/Client live surfaces, global admin escalation, or Continental defaults were introduced.

Phase 10B3 Company Setup Readiness Diagnostics Preview is complete. The existing protected Product Metadata Diagnostics page now includes a read-only sample/static readiness preview driven by `resolveCompanyReadiness(...)` and a local setup-context fixture only. It displays sample status, severity counts, blocking items, warnings, unknown domains, and next recommended action while clearly labeling the output as diagnostic and non-authoritative. It does not call Supabase, does not call `rpc_company_setup_context()`, does not fetch live company data, does not mutate anything, and does not affect dashboard behavior, navigation behavior, route guards, permissions, onboarding, registries, RLS/RPCs, workflow behavior, product-mode/module authority, Vendor/Client surfaces, or bootstrap provisioning.

Phase 10B4 Company Settings / Onboarding Storage Decision is complete as documentation plus read-only schema inspection. `docs/COMPANY_SETUP_STORAGE_DECISION.md` recommends a hybrid, derived-first setup storage strategy: keep readiness mostly derived from canonical backend facts, use existing `companies.settings` and `companies.operating_mode_settings` only as non-authoritative JSON shells for later low-risk metadata, defer durable onboarding and module/package state, require a company-safe numbering model before bootstrap seeds order-numbering defaults, and require company notification-default storage before bootstrap seeds notification defaults. No migrations, runtime code, permission seeds, RLS/RPC edits, route changes, registry changes, UI changes, tests, product-mode authority, Vendor/Client activation, onboarding enforcement, or bootstrap wrapper behavior were introduced.

Phase 10B5 Versioned Bootstrap Wrapper SQL Design is complete as documentation plus read-only schema/function inspection. `docs/COMPANY_BOOTSTRAP_WRAPPER_SQL_DESIGN.md` proposes a future service-role-only `rpc_company_bootstrap_v1(p_payload jsonb)` wrapper, recommends delegating to the existing internal `rpc_company_bootstrap(...)` primitive rather than broadening or duplicating it, defines payload/result shapes, validation order, transaction/idempotency/audit expectations, dry-run behavior, warning-safe readiness output, and explicit exclusions for 10B6. No migrations, runtime code, permission seeds, RLS/RPC edits, route changes, registry changes, UI changes, tests, product-mode authority, Vendor/Client activation, onboarding enforcement, or bootstrap provisioning mutation were introduced.

Phase 10B6 Minimal Bootstrap Wrapper Implementation is complete. `supabase/migrations/20260518057000_company_bootstrap_v1_wrapper.sql` adds `public.rpc_company_bootstrap_v1(p_payload jsonb) returns jsonb` as a service-role-only, security-definer wrapper with explicit `auth.role() = 'service_role'` guard. The wrapper validates JSON payloads, supports dry-run without calling the mutating primitive, delegates non-dry-run bootstrap to existing `rpc_company_bootstrap(...)`, returns warning-safe JSONB output, and preserves the existing primitive. It does not add browser/client exposure, app-role grants, order-numbering seeds, notification-default seeds, durable onboarding state, module/package entitlement state, Vendor/Client activation, settings editor/write behavior, owner setup UI wiring, dashboard prompts, live setup-context integration, route changes, registry changes, UI changes, or self-serve bootstrap.

Phase 10B7 Post-Bootstrap Validation Wiring is complete. `supabase/migrations/20260518058000_company_bootstrap_v1_post_validation.sql` preserves the wrapper signature and service-role-only boundary while replacing the placeholder readiness summary with SQL-local diagnostic checks from the bootstrap result and `company_audit_events`. Dry-run returns a readiness-style validation summary without writes. Non-dry-run returns checks for company id, owner user id, owner membership id, owner role assignment id, bootstrap status, audit event count/ids, skipped unknown domains, and next recommended action. `rpc_company_setup_context()` is intentionally avoided inside the service-role wrapper because it requires authenticated current-company user/session state. No frontend/runtime authority, routes, registries, UI, onboarding persistence, order-numbering or notification seeding, module/package entitlement state, Vendor/Client activation, or browser/self-serve bootstrap was introduced.

Phase 10B8 Owner Setup Route Shell is complete. `/settings/owner-setup` now renders `src/pages/admin/OwnerSetup.jsx` behind the existing `settings.view` route guard. The page is a static/sample/read-only shell only: it uses a local setup fixture with the pure readiness resolver, shows future owner setup steps, and labels readiness as non-authoritative. It does not call Supabase, `rpc_company_setup_context()`, bootstrap RPCs, live company data, or mutation paths; it does not add navigation/settings links, dashboard prompts, onboarding enforcement, new permissions, readiness-based route guards, product-mode/module authority, Vendor/Client activation, or backend behavior.

Phase 10B9 Bootstrap Runtime Foundation Closeout / Handoff Lock is complete as documentation. `docs/COMPANY_BOOTSTRAP_RUNTIME_FOUNDATION_HANDOFF.md` summarizes completed 10B slices, current runtime inventory, service-role/internal boundaries, static/sample-only surfaces, validation baseline, known warnings, intentional exclusions, and the recommended Phase 10C live read-only setup-context integration sequence. It does not change migrations, runtime code, permissions, RLS/RPCs, routes, registries, UI, tests, bootstrap behavior, onboarding authority, product-mode authority, Vendor/Client activation, order-numbering defaults, or notification defaults.

Phase 10B safety boundary:

- No browser-callable or self-serve bootstrap wrapper exists.
- Minimal wrapper exists as service-role-only `rpc_company_bootstrap_v1(p_payload jsonb)`; no browser/self-serve exposure exists.
- No provisioning mutation in early 10B slices.
- No onboarding storage yet.
- No settings storage changes yet.
- No live readiness resolver RPC/setup-context wiring yet.
- Static owner setup shell route exists at `/settings/owner-setup`, but no live setup-context wiring, readiness-based route guard, dashboard/user-facing onboarding behavior, navigation link, or non-diagnostic setup mutation exists.
- No order-numbering or notification-default bootstrap seeding until company-safe domain models are implemented.
- `rpc_company_bootstrap(...)` remains internal/service-role only until a later explicit wrapper/versioning phase.

Recommended next phase: Phase 10C Live Read-Only Setup Context Integration. Start with client-side pattern inspection for `rpc_company_setup_context()`, then add guarded read-only setup context fetching, diagnostics live preview, Owner Setup live read-only display, optional settings utility link, and dashboard prompt only after each boundary is verified as non-authoritative.

## Phase 10C: Live Read-Only Setup Context Integration

Status: Started. Setup/readiness remains diagnostic only.

Reference:

- `docs/COMPANY_SETUP_CONTEXT_CLIENT_INTEGRATION_PLAN.md`
- `docs/COMPANY_SETUP_LIVE_READONLY_HANDOFF.md`
- `docs/COMPANY_BOOTSTRAP_RUNTIME_FOUNDATION_HANDOFF.md`
- `docs/COMPANY_BOOTSTRAP_READINESS_RESOLVER.md`
- `docs/OWNER_SETUP_UI_SHELL_CONTRACT.md`

Phase 10C1 Read-Only Setup Context Client Pattern Inspection is complete as documentation plus read-only code inspection. It inspected the Supabase client, feature API modules, current app context hook, permission/session hooks, diagnostics and Owner Setup static pages, setup-context SQL output, and existing test patterns. The new plan recommends adding a read-only `getCompanySetupContext()` API and `useCompanySetupContext()` hook under `src/features/company-setup/` in 10C2, preserving snake_case setup-context fields for `resolveCompanyReadiness(...)`, surfacing loading/error/permission-denied states, and avoiding all UI wiring until the read-only boundary is tested. No runtime code, migrations, backend behavior, route changes, registry changes, UI changes, test changes, bootstrap calls, mutations, readiness authority, product-mode authority, Vendor/Client activation, new permissions, or legacy role authority were introduced.

Phase 10C2 Read-Only Company Setup Context API/Hook is complete. `src/features/company-setup/companySetupContextApi.js` adds `getCompanySetupContext()` over `rpc_company_setup_context` only, preserving resolver-compatible setup-context fields and safe defaults. `src/features/company-setup/useCompanySetupContext.js` adds a session-aware hook with `context`/`data`, `loading`, `error`, `permissionDenied`, and `refetch`. Focused tests cover successful setup-context reads, empty results, RPC errors, permission-denied handling, refetch behavior, and source scans preventing bootstrap or mutation calls. The API/hook is still unwired: no diagnostics page, Owner Setup page, route, dashboard, navigation, registry, permission, redirect, bootstrap, mutation, product-mode/module authority, Vendor/Client activation, or legacy role authority behavior was changed.

Phase 10C3 Diagnostics-Only Live Setup Context Integration is complete. The protected Product Metadata Diagnostics page now uses `useCompanySetupContext()` to read live `rpc_company_setup_context()` output, feeds it into `resolveCompanyReadiness(...)` when available, and labels the result as live read-only setup context, diagnostic only, and non-authoritative. Loading, permission-denied, and error states remain safe display states, and the static sample fallback remains visible. Owner Setup remains static/sample only. No migrations, backend behavior, permission seeds, RLS/RPC edits, route changes, registry changes, dashboard behavior, navigation behavior, bootstrap calls, mutations, readiness authority, product-mode/module authority, Vendor/Client activation, or legacy role authority behavior changed.

Phase 10C4 Owner Setup Live Read-Only Setup Context Integration is complete. `/settings/owner-setup` now uses `useCompanySetupContext()` to read live `rpc_company_setup_context()` output, feeds it into `resolveCompanyReadiness(...)` when available, and labels the result as read-only setup guidance, diagnostic only, and non-authoritative. Loading, permission-denied, and error states remain safe display states, and the static sample fallback remains visible. Route protection remains the existing `settings.view` guard. No migrations, backend behavior, permission seeds, RLS/RPC edits, route changes, registry changes, dashboard behavior, navigation behavior, bootstrap calls, mutations, onboarding persistence, settings writes, invite submission, order-numbering setup, notification-default writes, readiness authority, product-mode/module authority, Vendor/Client activation, or legacy role authority behavior changed.

Phase 10C5 Owner Setup Settings Utility Link is complete. The Settings page utility link registry now exposes `Owner Setup ->` backed by `settings.ownerSetup` current-live navigation metadata. The link points to `/settings/owner-setup` and uses the existing `settings.view` visibility/route metadata. This is navigation convenience only: no migrations, backend behavior, permission seeds, RLS/RPC edits, route changes, dashboard behavior, bootstrap calls, mutations, onboarding behavior, readiness authority, product-mode/module authority, Vendor/Client activation, new permissions, or route guard changes were introduced.

Phase 10C6 Dashboard Owner Setup Prompt is complete. The order dashboard now renders a small `Review owner setup` prompt for users who already have `settings.view`; it links to `/settings/owner-setup` and is labeled `Diagnostic guidance only`. The prompt does not fetch readiness, call setup context, call bootstrap, mutate records, redirect users, alter `DashboardGate`, change dashboard resolution, introduce new permissions, or make readiness authoritative. No migrations, backend behavior, permission seeds, RLS/RPC edits, route changes, registry authority changes, workflow behavior, product-mode/module authority, Vendor/Client activation, or onboarding enforcement changed.

Phase 10C7 Live Read-Only Setup Integration Closeout / Handoff Lock is complete as documentation. `docs/COMPANY_SETUP_LIVE_READONLY_HANDOFF.md` summarizes completed 10C slices, current frontend inventory, route/link/prompt inventory, safety boundaries, validation baseline, known warnings, intentional exclusions, and the recommended Phase 10D sequence. Phase 10C is complete through live read-only setup integration only. It does not claim setup/onboarding writes, company settings editing, onboarding persistence, order-numbering setup, notification-default setup, Vendor/Client activation, product-mode/module authority, or readiness authority are complete.

Recommended next phase: Phase 10D Company Profile / Settings Write Design And Minimal Actionable Owner Setup. Suggested sequence: 10D1 inspect existing company settings/profile edit patterns; 10D2 design guarded company settings/profile update RPC; 10D3 implement minimal company profile update RPC; 10D4 wire company profile card only; 10D5 design branding/settings shell card; 10D6 design order numbering model only; 10D7 design notification defaults model only; 10D8 closeout.

## Phase 10D: Company Profile / Settings Write Design And Minimal Actionable Owner Setup

Status: Complete through 10D8. Only the Company Profile card is actionable; broader setup/onboarding domains remain deferred until each backend authority boundary is designed and implemented deliberately.

Reference:

- `docs/COMPANY_PROFILE_UPDATE_PATTERN_AUDIT.md`
- `docs/COMPANY_PROFILE_UPDATE_RPC_CONTRACT.md`
- `docs/COMPANY_BRANDING_SETTINGS_SHELL_DESIGN.md`
- `docs/COMPANY_ORDER_NUMBERING_MODEL_DESIGN.md`
- `docs/COMPANY_NOTIFICATION_DEFAULTS_MODEL_DESIGN.md`
- `docs/OWNER_SETUP_ACTIONABLE_FOUNDATION_HANDOFF.md`
- `docs/COMPANY_SETUP_LIVE_READONLY_HANDOFF.md`
- `docs/OWNER_SETUP_UI_SHELL_CONTRACT.md`
- `docs/COMPANY_SETUP_STORAGE_DECISION.md`

Phase 10D1 Company Profile / Settings Edit Pattern Inspection is complete as documentation plus read-only schema/frontend inspection. It confirmed that `public.companies` currently supports narrow profile fields such as `name`, `timezone`, and `locale`, with `settings` and `operating_mode_settings` existing only as non-authoritative JSON shells. No active company profile update RPC was found. Existing frontend and backend write patterns favor feature API wrappers, guarded RPCs, current-company scope, explicit permissions, allowlisted payloads, narrow result projections, safe toast/error copy, and audit events. The recommended 10D2 direction is to design a guarded `rpc_company_profile_update(p_patch jsonb)`-style RPC using `company.update_profile`, current-company membership, active-company validation, field allowlisting, audit logging, and no broad settings writes.

Phase 10D2 Company Profile Update RPC Contract is complete as documentation plus read-only schema/function inspection. `docs/COMPANY_PROFILE_UPDATE_RPC_CONTRACT.md` defines the future `public.rpc_company_profile_update(p_patch jsonb)` contract: authenticated current-company callers with active membership and `company.update_profile`, current-company scoped updates only, allowed fields limited to `name`, `timezone`, and `locale`, unknown/unsafe key rejection, active-company validation, audit event behavior, narrow non-authoritative result shape, setup-context refresh guidance, and explicit no-go rules for broad settings JSON, onboarding authority, product-mode/module authority, Vendor/Client activation, bootstrap mutation, order numbering, notification defaults, roles, permissions, slug, status, and company type. The recommended 10D3 direction is one SQL migration that implements this narrow RPC without wiring Owner Setup edits yet.

Phase 10D3 Minimal Company Profile Update RPC Implementation is complete. `supabase/migrations/20260518059000_company_profile_update_rpc.sql` adds `public.rpc_company_profile_update(p_patch jsonb) returns jsonb` as a guarded current-company profile update RPC. It requires an authenticated app user, active current-company membership, an active company, and `company.update_profile`; rejects null/non-object patches and unknown keys; only allows `name`, `timezone`, and `locale`; validates non-empty names up to 160 characters, PostgreSQL timezone names, and `en-US` locale; writes `company.profile_updated` audit only on effective changes; returns a narrow non-authoritative JSONB result; revokes `public`/`anon`; and grants execute to `authenticated` and `service_role`. It does not add frontend wiring, Owner Setup writes, route changes, registry changes, broad settings writes, readiness/onboarding authority, product-mode/module authority, Vendor/Client activation, bootstrap calls, order-numbering changes, or notification-default changes.

Phase 10D4 Owner Setup Company Profile Card Wiring is complete. `src/features/company-setup/companyProfileApi.js` adds `updateCompanyProfile(patch)` over `rpc_company_profile_update` only, forwarding only `name`, `timezone`, and `locale`. `/settings/owner-setup` now renders an actionable Company Profile card using live setup context values, supports editing company name/timezone/locale only, submits through the guarded RPC wrapper, refetches setup context after success, shows safe loading/success/error states, and keeps the static fallback visible when live context is unavailable. Tests cover live value rendering, allowed-field payloads, setup context refetch, safe RPC errors, no bootstrap calls, no direct settings/table mutation, no broad fields, no authority language, and fallback behavior. No migrations, backend behavior, permission seeds, RLS/RPC edits, route changes, registry/nav/dashboard changes, other setup-card writes, broad settings writes, onboarding persistence, readiness authority, product-mode/module authority, Vendor/Client activation, bootstrap calls, order-numbering writes, or notification-default writes were added.

Phase 10D5 Branding / Settings Shell Design is complete as documentation plus read-only schema/code inspection. `docs/COMPANY_BRANDING_SETTINGS_SHELL_DESIGN.md` defines the future branding/basic settings Owner Setup card area, confirms that `companies.settings` is the only plausible near-term company-level JSON shell for sparse non-authoritative presentation metadata, and confirms no active company branding table, logo field, branding RPC, company logo storage bucket, or report branding model was found. The design defers branding implementation; if branding becomes actionable later, it recommends a narrow guarded `companies.settings.branding` subkey RPC requiring company-scoped authority such as `company.manage_branding`, field allowlisting, audit events, and no broad settings writes, `operating_mode_settings` writes, product/package flags, module entitlement flags, onboarding completion, order numbering, notification defaults, Vendor/Client activation, or setup authority. The recommended next direction is 10D6 order-numbering model design, not branding implementation.

Phase 10D6 Company-Safe Order Numbering Model Design is complete as documentation plus read-only schema/code inspection. `docs/COMPANY_ORDER_NUMBERING_MODEL_DESIGN.md` documents the current legacy/default-company numbering model: `order_numbering_rules.company_key`, `order_number_counters(rule_id, counter_year)`, `rpc_get_next_order_number(p_company_key text default 'falcon_default', ...)`, global `orders.order_number` uniqueness, frontend prefetch from `OrderForm`, direct global availability checks, and order create/update paths that accept submitted `order_number`. The recommended future model is company-id-backed rules and counters, server-side current-company number generation, company-scoped uniqueness, guarded read/update RPCs, audit events for rule changes, explicit manual override validation, no broad settings JSON storage, no frontend-generated numbers, and no bootstrap seeding until the model and order creation flow are company-safe. No migrations, backend behavior, runtime code, UI changes, tests, or order-numbering behavior changed.

Phase 10D7 Company Notification Defaults Model Design is complete as documentation plus read-only schema/code inspection. `docs/COMPANY_NOTIFICATION_DEFAULTS_MODEL_DESIGN.md` documents the current model: global/event-scoped `notification_policies`, user-scoped `notification_prefs`, user/type/channel-scoped `user_notification_prefs`, older user email `notification_preferences`, tenant-safe order-tied notification creation through `rpc_notification_create(jsonb)`, and Settings/notification APIs that manage personal preferences rather than company defaults. No company-id-backed notification-default table or guarded company-default update RPC was found. The recommended future model is company-id-scoped event/channel/role defaults, explicit fallback precedence from required system rules to user overrides to company defaults to global defaults, guarded current-company update RPCs, audit events, read-only setup readiness signals, and no bootstrap seeding until the company-safe model is live. No migrations, backend behavior, runtime code, UI changes, tests, or notification-default behavior changed.

Phase 10D8 Actionable Owner Setup Foundation Closeout / Handoff Lock is complete as documentation. `docs/OWNER_SETUP_ACTIONABLE_FOUNDATION_HANDOFF.md` summarizes completed 10D slices, current backend/frontend inventory, actionable fields, safety boundaries, validation baseline, known warnings, intentional exclusions, recommended next phase options, and no-go rules. Phase 10D leaves only Company Profile actionable in Owner Setup: `companies.name`, `companies.timezone`, and `companies.locale` are updated through guarded `rpc_company_profile_update(p_patch jsonb)`, and Owner Setup refetches live setup context after success. Branding/settings implementation, order-numbering implementation, notification-default implementation, onboarding persistence, readiness authority, Vendor/Client activation, product-mode/module authority, and bootstrap mutation from browser remain intentionally excluded. The recommended default next phase is order-numbering refactor prep because the current numbering path still includes browser-prefetched order numbers, legacy `company_key = 'falcon_default'`, and global `orders.order_number` uniqueness.

## Phase 10E: Company-Safe Order Numbering Refactor Prep

Status: Started. Phase 10E is design-first; no numbering behavior, order creation behavior, uniqueness constraints, bootstrap seeding, or Owner Setup numbering configuration should change until dependencies and migration strategy are locked.

Reference:

- `docs/ORDER_NUMBERING_DEPENDENCY_AUDIT.md`
- `docs/ORDER_NUMBERING_MIGRATION_STRATEGY.md`
- `docs/ORDER_NUMBERING_COMPATIBILITY_ANALYSIS.md`
- `docs/COMPANY_ORDER_NUMBERING_MODEL_DESIGN.md`
- `docs/OWNER_SETUP_ACTIONABLE_FOUNDATION_HANDOFF.md`

Phase 10E1 Order Creation / Numbering Dependency Inspection is complete as documentation plus read-only schema/code inspection. `docs/ORDER_NUMBERING_DEPENDENCY_AUDIT.md` maps confirmed backend numbering objects, global uniqueness constraints, generation paths, validation paths, direct table create/update paths, guarded order RPC create/update paths, manual override/edit paths, display/search dependencies, RLS/grant observations, critical tenant-safety risks, migration risks, and open questions. Confirmed risks include global `orders.order_number` uniqueness rather than `(company_id, order_number)`, browser prefetch from `rpc_get_next_order_number()` with default `company_key = 'falcon_default'`, editable/manual order-number form paths, direct table writes that submit `order_number`, guarded RPCs that accept submitted `order_number`, global availability checks, multiple create/update paths, and reservation drift because number generation is separated from order creation. Recommended 10E2 direction is a design-only company-safe numbering migration strategy covering compatibility, v2 generation, server-side order-create generation, transition behavior, uniqueness/index migration, manual override guards, and continued Owner Setup deferral.

Phase 10E2 Company-Safe Order Numbering Migration Strategy is complete as documentation plus read-only schema/code inspection. `docs/ORDER_NUMBERING_MIGRATION_STRATEGY.md` defines the target architecture: company-id-backed numbering rules/counters, server-side generation during order creation, company-scoped uniqueness, guarded manual override behavior, compatibility with existing `orders.order_number` display/search usage, and no frontend-generated authoritative numbers. The proposed migration sequence is 10E3 compatibility/read-only mapping analysis, 10E4 additive company-id-backed storage, 10E5 v2 server-side generation helper, 10E6 RPC order creation adoption, 10E7 frontend create-path migration away from browser prefetch, 10E8 company-scoped availability/manual override checks, 10E9 uniqueness/index migration, 10E10 Owner Setup read-only numbering card, and later configurable numbering rules. No numbering behavior, order creation behavior, uniqueness constraints, bootstrap seeding, Owner Setup configuration, runtime code, migrations, routes, UI, registries, RLS/RPCs, or tests changed.

Phase 10E3 Order Numbering Compatibility / Read-Only Mapping Analysis is complete as documentation plus read-only schema inspection. `docs/ORDER_NUMBERING_COMPATIBILITY_ANALYSIS.md` records current compatibility assumptions, legacy `falcon_default` mapping to `default_company_id()`, global uniqueness implications, null/blank order-number treatment, manual-looking order-number heuristics, read-only preflight SQL, 10E4 blockers, and recommended 10E4 additive storage direction. It recommends no helper view in 10E3 and no behavior changes. No migrations, runtime code, backend behavior, order creation/update behavior, numbering generation, uniqueness/index changes, frontend behavior, Owner Setup configuration, bootstrap seeding, RLS/RPC edits, permissions, routes, registries, UI, or tests changed.

Phase 10E4 Additive Company-ID-Backed Numbering Storage is implemented and verified. `supabase/migrations/20260518060000_company_order_numbering_storage.sql` adds nullable `company_id` compatibility/future-v2 columns to `order_numbering_rules` and `order_number_counters`, `NOT VALID` company foreign keys, company lookup indexes, future-safe partial unique indexes for mapped company/rule/counter rows, comments documenting the non-authoritative compatibility role, and deterministic backfill from `company_key = 'falcon_default'` to `public.default_company_id()` with existing counters inheriting mapped rule company context when present. It preserves `company_key`, existing constraints, `next_order_number(...)`, `rpc_get_next_order_number(...)`, `rpc_is_order_number_available(...)`, order create/update RPCs, frontend behavior, `orders.order_number` global uniqueness, bootstrap behavior, and Owner Setup. Phase 10E4V repaired a stuck local Docker Desktop/backend state, reran `supabase db reset` successfully, and smoke-verified columns, `NOT VALID` FKs, indexes, default-rule mapping, and legacy numbering RPC behavior. No seed counter rows existed during migration; a counter created afterward by the unchanged legacy RPC remains legacy-shaped with `company_id = null`, so company-id-backed counter writes remain a 10E5 v2 helper responsibility. The recommended 10E5 direction is a v2 server-side generation helper using company-id-backed storage without active create-path adoption.

Phase 10E5 Company-ID-Backed Order Number Generation Helper is complete. `supabase/migrations/20260518061000_company_order_numbering_v2_helper.sql` adds `public.next_order_number_v2(p_company_id uuid default public.current_company_id(), p_effective_at timestamptz default now())` as an additive server-side helper only. The helper requires a concrete company id, requires an active company-id-backed numbering rule, writes/increments company-id-backed counters atomically, preserves the existing `YYYY###` format, fails closed when a legacy/null-company counter already occupies the same rule/year, and does not use legacy `company_key` as tenant authority. Execute is granted only to `service_role`; active order creation/update, legacy `rpc_get_next_order_number(...)`, frontend prefetch, availability checks, uniqueness constraints, Owner Setup, bootstrap seeding, and dashboard/readiness behavior remain unchanged. The recommended 10E6 direction is guarded RPC order creation adoption of v2 generation, still without direct frontend-generated authoritative numbers.

Phase 10E6A RPC Order Creation v2 Numbering Design is complete as documentation plus read-only schema/code inspection. `docs/ORDER_CREATION_V2_NUMBERING_RPC_DESIGN.md` selects guarded `public.rpc_create_order(payload jsonb)` as the first create path to migrate because it already enforces create authorization, current-company context, linked client/AMC attachment checks, and backend insert control. The recommended 10E6B implementation is one migration that preserves the existing RPC name/return type/guards, generates `orders.order_number` server-side with `next_order_number_v2(current_company_id(), now())`, accepts but ignores submitted `payload.order_number` for normal create compatibility, returns the created row with the server-generated number, keeps `next_order_number_v2(...)` non-browser-callable, and handles legacy/null-company counter compatibility before replacement. Direct table creation, frontend browser prefetch, update/manual override paths, availability checks, uniqueness constraints, Owner Setup, bootstrap seeding, and frontend behavior remain unchanged in 10E6A.

Phase 10E6B Guarded RPC Order Creation Uses v2 Numbering is complete. `supabase/migrations/20260518062000_rpc_create_order_v2_numbering.sql` replaces only `public.rpc_create_order(payload jsonb)`, preserving its signature, return type, authorization behavior, current-company client/AMC attachment guards, and authenticated execute grant. The guarded RPC now generates `orders.order_number` server-side with `next_order_number_v2(current_company_id(), now())`, ignores submitted `payload.order_number` for normal create compatibility, and returns the created row with the generated number. SQL smoke verified generated RPC create, submitted-number ignore behavior, company-backed v2 counter creation, legacy `rpc_get_next_order_number()` behavior, direct table insert behavior, and function grants. Direct table creation, frontend browser prefetch, update/manual override paths, availability checks, uniqueness constraints, Owner Setup, bootstrap seeding, and frontend behavior remain unchanged. If a legacy/null-company counter conflicts with v2 generation, the RPC surfaces the v2 helper's fail-closed error and does not fall back to legacy numbering.

Phase 10E7A Frontend Order Create Path Migration Design is complete as documentation plus read-only code/schema inspection. `docs/FRONTEND_ORDER_CREATE_RPC_MIGRATION_DESIGN.md` maps the active create flow: `OrderForm` local state, legacy `rpc_get_next_order_number()` browser prefetch, `buildOrderPayload` carrying `order_number`, `ordersService.createOrder` direct table insert, secondary `src/lib/api/orders.js#createOrder` direct table insert, editable `AssignmentFields` order-number input, and global `OrderNumberField` availability behavior. The recommended implementation sequence is 10E7B add a focused RPC create API wrapper, 10E7C move `OrderForm` create submit to the RPC wrapper, 10E7D remove legacy browser prefetch, 10E7E make create-mode order number display-only/generated-later, 10E7F remove global availability checks from create mode, and later design manual override/update hardening. No runtime code, migrations, backend behavior, UI, routes, registries, tests, direct table behavior, uniqueness constraints, Owner Setup, bootstrap, or manual override behavior changed.

Phase 10E7B Frontend RPC Create API Wrapper is complete. `src/lib/services/ordersService.js` now exports `createOrderViaRpc(payload)`, which calls only `supabase.rpc("rpc_create_order", { payload })`, returns the created order row, and propagates RPC errors. Focused tests in `src/lib/services/__tests__/ordersServiceCreateOrderViaRpc.test.js` verify the wrapper calls `rpc_create_order`, does not direct insert into `orders`, does not call legacy numbering or availability RPCs, passes payload through, returns the server result including `order_number`, and handles errors. The wrapper is intentionally not wired into `OrderForm` yet. Active create behavior, browser prefetch, direct table helpers, `OrderNumberField`, edit/update/manual override behavior, routes, UI, backend/RPCs, uniqueness constraints, Owner Setup, and bootstrap remain unchanged. Recommended 10E7C is to migrate only the create branch of `OrderForm` submit to `createOrderViaRpc(payload)`.

Phase 10E7C OrderForm Submit Uses RPC Create is complete. `src/components/orders/form/OrderForm.jsx` now uses `createOrderViaRpc(payload)` for the new-order submit branch while preserving `updateOrder(order.id, payload)` for edit submit. The existing `onSaved(result)` and navigation behavior continue to use the returned order row, including the server-generated `order_number`. Targeted tests in `src/components/orders/form/__tests__/OrderForm.test.jsx` verify create submit calls `createOrderViaRpc`, does not call direct `createOrder`, edit submit still calls `updateOrder`, and browser prefetch remains unchanged for now. The direct table helper remains available but is no longer the active `OrderForm` create path. Browser prefetch, create-mode order-number UI, `OrderNumberField`, update/manual override behavior, backend/RPCs, routes, registries, uniqueness constraints, Owner Setup, and bootstrap remain unchanged. Recommended 10E7D is to remove or disable authoritative browser prefetch from create mode.

Phase 10E7D Remove Authoritative Browser Prefetch From Create Mode is complete. `src/components/orders/form/OrderForm.jsx` no longer imports the Supabase client or calls legacy `rpc_get_next_order_number()` in new-order create mode. The create preview now reads `Generated on save`, and blank create-mode order-number state submits as `order_number: null`; guarded `rpc_create_order` remains the source of truth and generates the actual number server-side. Targeted tests verify create mode no longer prefetches, create submit still calls `createOrderViaRpc`, edit submit remains on `updateOrder`, and no manual override behavior was added. Edit/update/manual override behavior, backend/RPCs, route/registry behavior, legacy function definitions, `OrderNumberField`, direct table helper definitions, uniqueness constraints, Owner Setup, and bootstrap remain unchanged. Recommended 10E7E is to make the create-mode order-number field display-only/generated-later.

Phase 10E7E OrderNumberField Create Mode Generated-Later State is complete. `src/components/orders/form/AssignmentFields.jsx` now renders create-mode order-number state as read-only/generated-later copy (`Generated on save` and `Assigned automatically when saved.`) instead of a normal editable `Order #` input. Edit mode keeps the existing editable order-number input. Create submit still uses `createOrderViaRpc(payload)` and the current payload builder still sends `order_number: null` when no browser number exists; guarded `rpc_create_order` remains the authoritative generator. Targeted tests cover create-mode generated-later UI, edit-mode input preservation, RPC create submit, and no prefetch regression. Backend/RPCs, edit/update/manual override behavior, route/registry behavior, legacy function definitions, `OrderNumberField`, direct table helper definitions, uniqueness constraints, Owner Setup, and bootstrap remain unchanged. Recommended 10E7F is to clean up create-mode global availability/check dependencies and keep manual override as a separate backend-guarded design.

Phase 10E7F Create-Mode Availability Check and Payload Cleanup is complete. `src/components/orders/form/OrderForm.jsx` now omits `order_number` from new-order create payloads while still including it for edit/update payloads. Active create mode has no order-number availability check and no order-number required-field behavior; `OrderNumberField` remains unchanged for nonblank values outside the active create path, with targeted tests proving blank values do not trigger its global lookup. Targeted tests cover RPC create submit without `order_number`, generated-later/read-only create UI, edit-mode order-number preservation, and no availability check for blank order-number state. Backend/RPCs, edit/update/manual override behavior, route/registry behavior, legacy function definitions, direct table helper definitions, uniqueness constraints, Owner Setup, and bootstrap remain unchanged. Recommended next work is manual override/update hardening and company-scoped availability design under a separate phase.

Phase 10E8A Company-Scoped Availability and Manual Override Design is complete as documentation plus read-only code/schema inspection. `docs/ORDER_NUMBER_MANUAL_OVERRIDE_DESIGN.md` documents current edit/update/manual behavior, global/direct availability checks, why global availability is insufficient for SaaS, and the desired company-scoped strategy. The recommended next implementation is 10E8B: add guarded `rpc_is_order_number_available_v2(p_order_number text, p_order_id uuid default null)` scoped to `current_company_id()`, returning structured JSON and safe global-uniqueness warnings while preserving legacy availability RPCs and all edit/update behavior. Manual override remains deferred until a later explicit RPC/action with a permission decision, reason support if selected, company-scoped validation, and order activity/audit logging. No migrations, backend behavior, frontend behavior, tests, uniqueness constraints, Owner Setup, bootstrap, or manual override behavior changed.

Phase 10E8B Company-Scoped Order Number Availability RPC is complete. `supabase/migrations/20260518063000_order_number_availability_v2.sql` adds read-only `public.rpc_is_order_number_available_v2(p_order_number text, p_order_id uuid default null) returns jsonb`. The RPC resolves `current_company_id()`, requires active current-company membership for authenticated callers, rejects blank order numbers, checks conflicts only within the current company, excludes the supplied order only when it belongs to the current company, returns narrow JSON (`available`, `order_number`, `company_id`, `conflicting_order_id`, `scope`), and performs no mutation/audit. Grants are revoked from `public`/`anon` and granted to `authenticated`/`service_role`. `supabase db reset` passed, and SQL smoke verified blank rejection, available true, same-company conflict false with conflict id, same-order exclusion true, legacy RPC presence, and grant exposure. Other-company fixture smoke was not run because existing order company-scope triggers normalize normal order inserts to the current company in this local service-role fixture. No frontend wiring, edit/update behavior, manual override behavior, create-mode behavior, uniqueness constraints, Owner Setup, bootstrap, or legacy availability RPC behavior changed.

Phase 10E8C Edit-Mode Order Number Availability Uses v2 RPC is complete. `src/lib/services/ordersService.js` now exposes `isOrderNumberAvailableV2(orderNo, { orderId })`, calling only `rpc_is_order_number_available_v2(...)`. `src/components/inputs/OrderNumberField.jsx` uses that v2 wrapper instead of a direct/global `orders` table lookup, and `src/components/orders/form/AssignmentFields.jsx` passes the current edit order id so the backend can exclude the current order. Targeted tests cover v2 RPC wrapper calls, no direct table lookup, blank/no-check behavior, conflict/available rendering, create-mode no-lookup behavior, and edit-mode current-order id wiring. Create mode, edit/update submit behavior, manual override behavior, backend/RPC definitions, legacy availability RPC, uniqueness constraints, Owner Setup, and bootstrap remain unchanged. Recommended next work is a dedicated 10E8D manual override/update hardening design.

Phase 10E8D Guarded Manual Override Backend Design is complete as documentation plus read-only code/schema inspection. `docs/ORDER_NUMBER_MANUAL_OVERRIDE_BACKEND_CONTRACT.md` documents current direct/generic update behavior, existing update RPC behavior, the v2 availability relationship, and a recommended dedicated future `rpc_order_number_override(p_order_id uuid, p_order_number text, p_reason text default null) returns jsonb`. The contract recommends active current-company membership, company-owned order scope, explicit override authority, nonblank/format validation, company-scoped availability validation, update of only `orders.order_number`, and an `activity_log` event with old/new number and reason. Generic order update should later reject or ignore `order_number`, but no migrations, backend behavior, frontend behavior, tests, uniqueness constraints, legacy functions, Owner Setup, bootstrap, update submit behavior, or manual override behavior changed in this slice.

Phase 10E8E Guarded Order Number Override RPC is complete. `supabase/migrations/20260518064000_order_number_override_rpc.sql` adds backend-only `public.rpc_order_number_override(p_order_id uuid, p_order_number text, p_reason text default null) returns jsonb`. Authenticated callers require active current-company scope and `orders.update.all`; `service_role` is allowed. The RPC locks the order, confirms current-company ownership, trims and validates the candidate number, rejects same-company conflicts, updates only `orders.order_number` and `updated_at`, writes `activity_log.event_type = 'order_number.manual_override'` on effective changes, returns `updated` or `unchanged`, and preserves a warning that global order-number uniqueness remains enforced during migration. Reason is accepted and trimmed but not required. `supabase db reset` passed; rollback smoke checks verified valid override, activity row creation, same-number no-op, duplicate same-company rejection, blank rejection, authenticated caller without app user rejection, and legacy availability RPC presence. No frontend API wrapper/UI wiring, normal edit/update behavior change, create-mode behavior change, uniqueness/index change, Owner Setup change, bootstrap seeding, or legacy function removal was added.

Phase 10E8F Frontend Order Number Override API Wrapper is complete. `src/lib/services/ordersService.js` now exports `overrideOrderNumber(orderId, orderNumber, reason = null)`, which calls only `supabase.rpc("rpc_order_number_override", { p_order_id, p_order_number, p_reason })`, returns the RPC JSON result, and propagates errors. Focused service tests verify expected RPC arguments, default `null` reason behavior, result/error handling, no direct `orders` update, no `updateOrder` path use, and no legacy/v2 availability RPC calls. The wrapper remains unwired: normal edit submit, UI behavior, create mode, backend/RPC definitions, uniqueness constraints, Owner Setup, bootstrap, and legacy functions remain unchanged.

Phase 10E8G Explicit Order Number Override UI Design is complete as documentation plus read-only frontend inspection. `docs/ORDER_NUMBER_OVERRIDE_UI_DESIGN.md` recommends moving edit-mode order-number changes out of casual field editing and into an explicit `Change order number` action/dialog. The design keeps create mode server-numbered and excluded, shows the current edit-mode order number read-only by default, collects a candidate number and optional reason, uses company-scoped v2 availability as guidance only, submits later through `overrideOrderNumber(...)`, and then updates local order state or refetches. Normal edit submit should later stop carrying `order_number`; generic update cleanup is deferred. No runtime code, migrations, backend behavior, UI changes, routes, registries, tests, uniqueness constraints, Owner Setup, bootstrap, or legacy function behavior changed.

Phase 10E8H Order Number Override UI Shell is complete. `src/components/orders/form/AssignmentFields.jsx` now shows edit-mode order number as read-only by default and exposes a `Change order number` action. The action opens an unwired shell dialog with a candidate order-number field and optional reason field; `Save order number` is disabled until the API wiring slice. The shell does not call `overrideOrderNumber(...)`, does not call availability RPCs, does not mutate order/form state, and does not change backend/RPC behavior. Create mode remains generated on save with no order-number input or availability check. Normal edit submit remains unchanged and still carries the existing `order_number` until the planned cleanup slice.

Phase 10E8I Wire Explicit Order Number Override Action is complete. `src/components/orders/form/AssignmentFields.jsx` now wires the dedicated edit-mode shell to `overrideOrderNumber(orderId, candidate, reason || null)`. `Save order number` is enabled only for a nonblank changed candidate, the shell shows loading and safe error states, and company-scoped `isOrderNumberAvailableV2(...)` is used only as guidance before submit. Successful override closes the dialog and updates the displayed order number through the parent form callback. Create mode remains generated on save with no override action, and normal edit submit remains on the existing update path. Recommended next work is 10E8J: remove `order_number` from the normal edit payload/update path so only the explicit override action can change order numbers.

Phase 10E8J Remove Order Number From Normal Edit Payload is complete. `src/components/orders/form/OrderForm.jsx` no longer includes `order_number` in `buildOrderPayload(..., { isEdit: true })`, while create payloads continue to omit `order_number`. The edit form still keeps order-number state for read-only display and explicit override updates, but normal `Save Changes` no longer carries or updates `order_number`. The explicit `Change order number` flow through `overrideOrderNumber(...)` is now the only frontend order-number mutation path. Backend generic update RPCs/direct helper definitions, create mode, uniqueness constraints, Owner Setup, bootstrap, and legacy functions remain unchanged; backend generic update hardening remains future work.

Phase 10E8K Backend Generic Update Hardening Design is complete as documentation plus read-only code/schema inspection. `docs/ORDER_NUMBER_GENERIC_UPDATE_HARDENING_DESIGN.md` maps the remaining backend/direct order update surfaces that can still treat `order_number` as ordinary patch data: `rpc_update_order(order_id uuid, patch jsonb)`, `rpc_order_update(p_order_id uuid, p jsonb)`, `ordersService.updateOrder(orderId, patch)`, direct non-number update helpers in `src/lib/api/orders.js`, and the row-scoped `orders_update_company_authorized` update policy. The recommended implementation sequence is 10E8L reject `order_number` keys in generic order update RPCs, 10E8M inspect and limit direct table update policy/helper risk, and 10E8N add an optional trigger guard only if direct table writes remain too broad. No migrations, backend behavior, frontend behavior, tests, uniqueness constraints, Owner Setup, bootstrap, or legacy function behavior changed in this design slice.

Phase 10E8L Generic Order Update RPC Order-Number Rejection is complete. `supabase/migrations/20260518065000_generic_order_update_reject_order_number.sql` replaces `rpc_update_order(uuid,jsonb)`, `rpc_order_update(uuid,jsonb)`, and the quarantined `rpc_order_update(text,jsonb)` overload without changing signatures or return types. The two active UUID generic update RPCs now reject JSON payloads containing `order_number` and direct callers to `rpc_order_number_override(...)`; ordinary update fields, authorization/scoping, client/AMC attachment guards, and authenticated grants are preserved. The quarantined text overload remains service-role-only and rejects `order_number` before its legacy quarantine exception. `supabase db reset` passed, and transaction-scoped SQL smoke verified ordinary generic updates still succeed, `order_number` is rejected by both active UUID RPCs and the text overload, the explicit override RPC still succeeds, and duplicate override rejection still works. Frontend behavior, direct table update policy/helper behavior, create mode, uniqueness constraints, Owner Setup, bootstrap, and legacy function removal remain unchanged.

Phase 10E9 Order Numbering Refactor Closeout / Remaining Risk Audit is complete as documentation plus read-only inspection. `docs/ORDER_NUMBERING_REFACTOR_CLOSEOUT_AUDIT.md` summarizes the completed 10E order-numbering work, current active create flow, current edit/override flow, backend protections, remaining legacy objects, and a risk table grouped by fix-now/defer/monitor. The audit finds no remaining high-risk active-path issue: create is server-numbered through guarded RPC, create mode no longer prefetches or submits `order_number`, normal edit submit no longer carries `order_number`, explicit override is backend-guarded and audited, and generic update RPCs reject `order_number`. Remaining medium risks are direct table create/update helper exposure, row-scoped direct update RLS, global uniqueness, and legacy/null-company counter compatibility. Recommended decision: Phase 10E is safe enough to pause unless direct table order writes are confirmed to be actively used in production-critical paths that can pass `order_number`; direct table/RLS hardening and uniqueness migration should be handled later as focused backend phases.

Phase 10F1 Direct Table Order Write / RPC-Only Mutation Strategy is complete as documentation plus read-only code/schema inspection. `docs/ORDER_MUTATION_RPC_ONLY_STRATEGY.md` maps known direct table order create/update/delete helpers, RPC order mutation paths, active frontend callers, inactive/legacy callers, fields affected, authority model, side effects, and risk. The strategy explains why RPC-only order mutations matter for audit consistency, notification consistency, workflow integrity, tenant safety, order-number safety, client/AMC relationship guards, and future SaaS onboarding. The known active direct write still needing migration is normal `OrderForm` edit submit through `ordersService.updateOrder(...)`; active create already uses `rpc_create_order(...)`, explicit order-number override uses `rpc_order_number_override(...)`, and main smart workflow actions use `rpc_transition_order_status(...)`. Recommended 10F plan: 10F2 update-path consolidation design/test plan, 10F3 migrate active edit/update service to a guarded RPC, 10F4 audit status/smart action/date/assignment mutations, 10F5 direct helper deprecation/warnings, 10F6 direct-write restriction design, 10F7 backend restriction implementation if safe, and 10F8 closeout. No migrations, backend behavior, frontend behavior, tests, RLS/RPCs, routes, registries, or UI changed.

Phase 10F2 Order Edit Update RPC Migration Design and Test Plan is complete as documentation plus read-only inspection. `docs/ORDER_EDIT_RPC_MIGRATION_DESIGN.md` maps the current active edit flow (`EditOrder` loads view/direct rows, `OrderForm` builds an edit payload, and edit submit calls direct `ordersService.updateOrder(...)`) and the target flow (`OrderForm` edit submit calls a new `updateOrderViaRpc(orderId, patch)` wrapper). The recommended first target is existing `rpc_update_order(order_id uuid, patch jsonb)` because it already enforces update authorization, current-company scope through existing helpers, client/AMC attachment guards, and `order_number` rejection. The design records a required 10F3 decision: current edit payload includes fields not fully covered by `rpc_update_order(...)` (`reviewer_id`, `split_pct`, property/report type, entry contact fields, and review/final date fields), so implementation must either defer those fields explicitly or expand the RPC narrowly with SQL smoke tests. The parity test plan covers wrapper behavior, edit submit using RPC wrapper, create submit staying on create RPC, override staying separate, payload exclusion of `order_number`, success behavior, and safe error rendering. No runtime code, migrations, backend behavior, frontend behavior, tests, RLS/RPCs, routes, registries, or UI changed.

Phase 10F3A Order Update RPC Field Coverage Design is complete as documentation plus read-only inspection. `docs/ORDER_UPDATE_RPC_FIELD_COVERAGE_DESIGN.md` provides a field coverage matrix for the active `OrderForm` edit payload against direct table update behavior and current `rpc_update_order(...)` coverage. The design recommends a backend-coverage-first 10F3B slice that narrowly expands `rpc_update_order(order_id uuid, patch jsonb)` before frontend edit wiring. Required parity fields are `reviewer_id`, `split_pct`, `property_type`, `report_type`, `entry_contact_name`, `entry_contact_phone`, `site_visit_at`, `review_due_at`, and `final_due_at`; existing support for client/manual client/AMC, appraiser, fees, property address/city/state/postal code, and notes should be preserved. The no-go rules remain: no `order_number`, no broad arbitrary patching, no status transition bypass, no tenant/company changes, no create behavior changes, no direct helper removal, and no RLS restriction in this slice. No runtime code, migrations, backend behavior, frontend behavior, tests, RLS/RPCs, routes, registries, or UI changed.

Phase 10F3B Expand `rpc_update_order` Field Coverage is complete. `supabase/migrations/20260518066000_rpc_update_order_edit_field_coverage.sql` replaces `public.rpc_update_order(order_id uuid, patch jsonb)` without changing the signature or return type. The RPC now explicitly supports the normal `OrderForm` edit payload fields identified in 10F3A: `reviewer_id`, `split_pct`, `property_type`, `report_type`, `entry_contact_name`, `entry_contact_phone`, `site_visit_at`, `review_due_at`, and `final_due_at`, while preserving existing coverage for client/manual client/AMC, appraiser, base/appraiser fee, property address/city/state/postal code, and notes. `order_number` remains rejected with guidance to use `rpc_order_number_override(...)`; client/AMC attachment guards, update authorization, current-company scoping, authenticated grant, and row return shape are preserved. `split_pct` is also mirrored to `appraiser_split` for compatibility with existing read surfaces. `supabase db reset` passed, and transaction-scoped SQL smoke verified new field updates, null clearing, existing covered field updates, assignment guard preservation, and `order_number` rejection. No frontend edit wiring, create behavior, direct helper removal, RLS restriction, status/workflow behavior, routes, registries, or UI changed.

Phase 10F3C Wire OrderForm Edit Submit to Guarded RPC Update is complete. `src/lib/services/ordersService.js` now exports `updateOrderViaRpc(orderId, patch)`, which calls only `supabase.rpc("rpc_update_order", { order_id: orderId, patch })` and returns the updated row or propagates the RPC error. `src/components/orders/form/OrderForm.jsx` now uses that wrapper for normal edit submit. Create submit remains on `createOrderViaRpc(...)`, explicit order-number override remains on `overrideOrderNumber(...)`, `order_number` remains excluded from normal create/edit payloads, and `ordersService.updateOrder(...)` remains exported but is no longer the active normal `OrderForm` edit path. Tests were updated for service wrapper behavior and form path separation. No migrations, backend/RPC behavior, create behavior, override behavior, status/workflow behavior, direct helper removal, RLS restriction, routes, registries, or UI changed.

Phase 10F4 Remaining Order Mutation Path Audit / Grouped Migration Plan is complete as documentation plus read-only inspection. `docs/ORDER_MUTATION_REMAINING_PATH_AUDIT.md` maps remaining order mutation surfaces after create/edit/override moved to RPCs, including status/smart actions, assignment/reviewer/appraiser helpers, date/site-visit helpers, archive/delete helpers, legacy utility adapters, direct helpers still exported from `ordersService`, `src/lib/api/orders.js`, and row-scoped direct-write RLS policies. The audit finds active smart workflow actions are already on canonical transition helpers, while the highest confirmed active direct mutations are site-visit/date updates in `UnifiedOrdersTable` through `updateSiteVisitAt(...)` and `OrderDetail.saveAppt(...)`. Recommended next batch is date/site-visit mutation consolidation before direct helper deprecation or RLS restriction. No migrations, backend behavior, frontend behavior, tests, RLS/RPCs, routes, registries, or UI changed.

Phase 10F5A Site Visit Date Mutation Consolidation Design is complete as documentation plus read-only inspection. `docs/SITE_VISIT_DATE_RPC_MIGRATION_DESIGN.md` maps the active site-visit mutation paths: `UnifiedOrdersTable` uses `updateSiteVisitAt(...)`, which direct-updates `orders.site_visit_at` and then best-effort calls `rpc_create_calendar_event(...)`, while `OrderDetail.saveAppt(...)` direct-updates `orders.site_visit_at` without calendar projection. The design recommends 10F5B migrate both active callers through a shared RPC-backed site-visit service using existing `updateOrderViaRpc(orderId, { site_visit_at })`, preserve the current best-effort calendar projection after successful update, and defer any backend transaction that combines order date update plus calendar event creation to a separate calendar-side-effect design. No migrations, backend behavior, frontend behavior, tests, RLS/RPCs, routes, registries, or UI changed.

Phase 10F5B Migrate Active Site-Visit Updates to RPC Path is complete. `src/lib/services/ordersService.js` now exports `updateSiteVisitAtViaRpc(orderId, siteVisitAt)`, which delegates to `updateOrderViaRpc(orderId, { site_visit_at: siteVisitAt || null })`. `src/lib/api/orders.js#updateSiteVisitAt(...)` now uses that RPC-backed wrapper instead of direct-updating `orders`, and preserves the existing best-effort `rpc_create_calendar_event(...)` side effect after successful update. `OrderDetail.saveAppt(...)` now uses the RPC-backed wrapper and preserves its existing refresh-only behavior, without adding calendar event creation. Targeted tests cover the wrapper, the table helper/calendar behavior, and the OrderDetail save path. No migrations, backend/RPC behavior, status/workflow behavior, RLS restriction, route/registry changes, or broad date mutation overhaul changed.

Phase 10F6 Direct Order Helper Deprecation / Usage Guard Plan is complete as documentation plus read-only inspection. `docs/ORDER_DIRECT_HELPER_DEPRECATION_PLAN.md` classifies remaining exported direct order helpers in `ordersService`, `src/lib/api/orders.js`, `src/features/orders/actions.js`, and `src/lib/utils/updateOrderStatus.js` by active path, legacy/unmounted status, caller presence, RPC replacement, risk, and timing. Active primary create/edit/site-visit/order-number/status paths are now RPC-backed or canonical; `updateSiteVisitAt(...)` remains active only as a compatibility table helper and now delegates to the RPC-backed site-visit wrapper while preserving best-effort calendar projection. Most remaining direct helpers have no active user-facing caller found and should receive grouped deprecation annotations or development-only usage guards before any RLS restriction. Recommended 10F7 is deprecation annotations and usage guards only; assignment/archive/delete helper replacement remains deferred to dedicated semantics design. No runtime code, migrations, backend behavior, frontend behavior, tests, RLS/RPCs, routes, registries, or UI changed.

Phase 10F7 Direct Order Helper Deprecation Annotations / Usage Guards is complete. High-risk direct order mutation helpers in `src/lib/services/ordersService.js` and `src/lib/api/orders.js` now have deprecation annotations and development-only warnings. The guards cover direct create, update, delete/archive, status, date, assignment, bulk status, and bulk assignment helpers, while canonical RPC-backed wrappers remain quiet. `src/features/orders/actions.js` and `src/lib/utils/updateOrderStatus.js` now warn in development when legacy action/fallback paths are used. `updateSiteVisitAt(...)` remains intentionally warning-free because it is now RPC-backed and retained for calendar projection compatibility. Targeted tests verify active create/edit/site-visit paths avoid deprecated direct helpers and that warnings are emitted only for direct helper usage under test. No helpers were removed, and no migrations, backend/RPC behavior, RLS policy, route/registry behavior, or active app behavior changed.

Phase 10F8 RPC-Only Order Mutation Closeout / RLS Restriction Readiness is complete as documentation plus read-only inspection. `docs/ORDER_RPC_ONLY_MUTATION_CLOSEOUT.md` summarizes completed 10F work, the active mutation inventory, deprecated/direct helper inventory, remaining direct-write risks, and RLS restriction readiness. The closeout finds active primary create, edit, site-visit, order-number override, and smart workflow mutation paths are RPC-backed or canonical. Remaining risks are exported deprecated direct helpers, row-scoped direct insert/update/delete RLS policies, assignment/archive/delete semantics still needing design, frontend-orchestrated calendar projection, and deferred legacy numbering compatibility. Recommended next phase is 10G: direct-write RLS restriction design, production-like route/import smoke, narrow RLS restriction implementation only if safe, and closeout. Do not implement RLS restriction before route/import smoke. No runtime code, migrations, backend behavior, frontend behavior, tests, RLS/RPCs, routes, registries, or UI changed.

Phase 10G1 Direct Order Write RLS Restriction Design is complete as documentation plus read-only schema/code inspection. `docs/ORDER_DIRECT_WRITE_RLS_RESTRICTION_DESIGN.md` inventories current `orders` RLS policies, the current RPC-backed mutation access model, target direct-write restriction model, restriction options, preflight requirements, rollback plan, and no-go rules. The recommended path is cautious: leave select/read policies unchanged, run 10G2 route/import smoke and direct-write caller verification first, then implement a narrow 10G3 write-policy restriction only if canonical create/edit/site-visit/status/override RPC paths pass smoke. Helper removal, RPC behavior changes, assignment/archive/delete semantics, status/workflow behavior, uniqueness/numbering changes, and read access changes remain out of scope. No migrations, backend behavior, frontend behavior, tests, RLS/RPCs, routes, registries, UI, or helper behavior changed.

Phase 10G2 Order Direct-Write Preflight / Active Caller Verification is complete as read-only code inspection plus targeted tests and documentation updates. `docs/ORDER_DIRECT_WRITE_RLS_RESTRICTION_DESIGN.md` now includes the 10G2 import/caller scan summary and preflight table. The scan found active create uses `createOrderViaRpc(...)`, active edit uses `updateOrderViaRpc(...)`, detail site visit uses `updateSiteVisitAtViaRpc(...)`, table site visit uses the RPC-backed `updateSiteVisitAt(...)` compatibility helper, order-number override uses `overrideOrderNumber(...)`, and smart workflow surfaces import canonical `ordersService` helpers backed by `rpc_transition_order_status(...)`. Deprecated direct helpers remain exported and legacy surfaces remain documented, but no active user-facing direct `orders` insert/update/delete path was found in primary routed flows. Targeted tests passed for service wrappers, `OrderForm`, `AssignmentFields`, site-visit calendar projection, and `OrderDetail`. Decision: ready for 10G3 narrow RLS direct-write restriction implementation, with explicit status/smart workflow route or browser smoke required during 10G3 because no dedicated status workflow test file was found. No runtime code, migrations, backend behavior, frontend behavior, RLS/RPCs, routes, registries, UI, production behavior, or helper behavior changed.

Phase 10G3 Narrow Orders Direct-Write RLS Restriction is complete. `supabase/migrations/20260518067000_restrict_orders_direct_writes.sql` replaces the previous direct authenticated `orders` insert/update/delete policies with explicit RPC-only false policies: `orders_insert_rpc_only`, `orders_update_rpc_only`, and `orders_delete_rpc_only`. The existing `orders_select_company_lifecycle_visibility` read policy, order read projections, RPC definitions, RPC grants, helper exports, frontend behavior, routes, registries, UI, numbering, and uniqueness remain unchanged. SQL smoke against the local reset database confirmed `rpc_create_order(...)`, `rpc_update_order(...)`, site-visit update through `rpc_update_order(...)`, `rpc_order_number_override(...)`, and `rpc_transition_order_status(...)` still succeed; direct authenticated insert is blocked with `42501`, direct authenticated update/delete affect zero rows, authenticated read still succeeds, and service-role direct insert remains available. Local `supabase db reset` applied the migration but exited nonzero at the final storage health check because `supabase_storage_project-falcon` was unhealthy; direct DB smoke passed. Targeted active mutation tests, lint, build, and `git diff --check` were run after the migration.

Phase 10G4 Order RLS Restriction Closeout / Verification Lock is complete as documentation plus verification review. `docs/ORDER_DIRECT_WRITE_RLS_RESTRICTION_CLOSEOUT.md` summarizes the completed 10G work, the 10G3 policy changes, the preserved active RPC mutation paths, blocked direct authenticated writes, preserved read/select access, preserved service-role direct behavior, deprecated direct helper expectations, and the local Supabase storage health caveat. The closeout explicitly separates the `supabase_storage_project-falcon container is not ready: unhealthy` reset-health issue from the successful DB/order RLS smoke. Recommended default is to pause order mutation/RLS work here unless active route smoke fails, storage-backed features require storage repair, or deprecated helper warnings reveal active callers. No runtime code, migrations, backend behavior, frontend behavior, permissions, RLS/RPCs, routes, registries, UI, tests, or helper behavior changed in 10G4.

Phase 10H1 Owner Setup Layout / Card Polish Design is complete as documentation plus read-only inspection. `docs/OWNER_SETUP_LAYOUT_POLISH_DESIGN.md` maps the current `/settings/owner-setup` layout, identifies that the page currently uses a guidance hero, live context panel, actionable Company Profile card, flat setup-step list, authority rail, live readiness summary, and static sample fallback, and recommends grouped card sections for Core Setup, Operations Setup, Communication / Branding, and Readiness. The design normalizes card status labels to `Ready`, `Needs attention`, `Available`, `Coming later`, `Diagnostic only`, and `Deferred`; preserves Company Profile as the only actionable write; keeps readiness non-authoritative; and recommends 10H2 as visual layout/card/copy polish only. No runtime code, migrations, backend behavior, route changes, registry changes, UI changes, tests, setup writes, onboarding authority, readiness authority, product-mode/module authority, Vendor/Client activation, order-numbering configuration, notification-default configuration, branding configuration, or broad settings writes changed.

Phase 10H2 Owner Setup Layout / Card Polish Implementation is complete. `src/pages/admin/OwnerSetup.jsx` now renders grouped Owner Setup sections for Core Setup, Operations Setup, Communication / Branding, and Readiness, uses the fixed status labels `Ready`, `Needs attention`, `Available`, `Coming later`, `Diagnostic only`, and `Deferred`, keeps Company Profile as the only actionable setup card, labels readiness as diagnostic-only, and keeps the static sample fallback secondary. Existing Company Profile behavior is preserved: it writes only `name`, `timezone`, and `locale` through the guarded profile update path and refetches live setup context on success. No migrations, backend behavior, route changes, registry changes, permission changes, RLS/RPC changes, new setup writes, readiness authority, blocking gate, Vendor/Client activation, order-numbering configuration, notification-default configuration, branding configuration, bootstrap mutation, or broad settings writes were added.

Phase 10H3 Owner Setup Readiness Card State Mapping is complete. Owner Setup now maps safe live read-only readiness diagnostics into selected card badges: Owner Profile reflects owner presence and active owner membership signals, Role Review reflects role preset and owner role assignment signals, and Team / Staff Invitations can show ready only when invitation and staff readiness summaries both pass. Company Profile remains `Available`, Readiness remains `Diagnostic only`, and deferred implementation cards remain `Deferred`. The mapping is diagnostic-only and adds no migrations, backend behavior, route changes, registry changes, permission changes, RLS/RPC changes, setup writes, readiness authority, blocking gate, Vendor/Client activation, order-numbering configuration, notification-default configuration, branding configuration, bootstrap mutation, or broad settings writes.

Phase 10H4 Owner Setup Deferred Card UX Polish is complete. Deferred cards for Basic Settings, Order Numbering, Notification Preferences, and Branding now show consistent `Planned later` explanatory copy and do not render disabled buttons, fake actions, configuration links, or controls. Company Profile remains the only actionable setup card. No migrations, backend behavior, route changes, registry changes, permission changes, RLS/RPC changes, setup writes, readiness authority, blocking gate, Vendor/Client activation, order-numbering configuration, notification-default configuration, branding configuration, bootstrap mutation, or broad settings writes were added.

Phase 10H5 Owner Setup Readiness Summary Polish is complete. The Owner Setup live readiness panel now leads with owner-readable counts for blockers, warnings, and unknown/deferred items, while raw diagnostic status, severity counts, blocker keys, and unknown keys remain visible as secondary diagnostic detail. The static sample fallback remains secondary and uses the same diagnostic summary format. Rendered copy avoids access, completion, unlock, and activation language. No migrations, backend behavior, route changes, registry changes, permission changes, RLS/RPC changes, setup writes, readiness authority, blocking gate, Vendor/Client activation, order-numbering configuration, notification-default configuration, branding configuration, bootstrap mutation, or broad settings writes were added.

Phase 10H6 Owner Setup Product Polish Closeout / Handoff is complete as documentation plus read-only inspection. `docs/OWNER_SETUP_PRODUCT_POLISH_HANDOFF.md` summarizes the completed 10H work, current Owner Setup UX, current card inventory, current safety boundaries, and recommended next phase options. The current state remains: `/settings/owner-setup` is guarded by existing `settings.view`, consumes live setup context and the readiness resolver, keeps Company Profile as the only actionable write card for `name`, `timezone`, and `locale`, keeps readiness diagnostic-only, and keeps deferred cards non-actionable. The recommended default next step is route-level browser smoke validation after the Phase 10G direct-write RLS changes and Phase 10H setup polish. No runtime code, migrations, backend behavior, route changes, registry changes, UI changes, tests, setup writes, readiness authority, blocking gate, Vendor/Client activation, order-numbering configuration, notification-default configuration, branding configuration, bootstrap mutation, or broad settings writes changed in 10H6.

Phase 10I1 Route-Level Browser Smoke Plan is complete as documentation plus read-only inspection in `docs/ROUTE_LEVEL_BROWSER_SMOKE_PLAN.md`. The plan defines the browser checklist for `/settings/owner-setup`, `/orders/new`, `/orders/:id/edit`, `/orders/:id`, `/orders`, and dashboard/table smart-action surfaces after Phase 10G direct authenticated `orders` write restriction and Phase 10H Owner Setup polish. It records smoke data requirements, recommended execution order, expected RPC/network signals, failure signs, blocker/non-blocker classification, and the failure-capture template. This is a smoke plan only; actual browser execution remains the next step. No runtime code, migrations, backend behavior, routes, registries, UI, tests, permissions, RLS/RPCs, setup writes, order mutation behavior, or helper behavior changed in 10I1.

Phase 10I2 Route-Level Browser Smoke Execution is complete as execution plus documentation in `docs/ROUTE_LEVEL_BROWSER_SMOKE_RESULTS.md`, but the route smoke did not fully pass. Owner Setup loaded live setup context, Company Profile saved through the guarded profile RPC, deferred cards remained non-actionable, `/orders/new` preserved generated-on-save order-number behavior without browser prefetch, and order creation succeeded through `rpc_create_order(...)` with generated order number `2026001`. Blockers found: `rpc_company_assignable_users` fails with `column u.split_pct does not exist`, `/orders/:id/edit` fails with `permission denied for table amcs`, `/orders/:id` fails to load the smoke order, and `/orders` did not expose the smoke order as actionable for table site-visit or smart-action smoke. Recommended next step is narrow 10I3 blocker repair for the assignable-users RPC and authorized order read projection/grant issues, then rerun 10I2 from Order Create onward. No runtime code, migrations, backend behavior, routes, registries, UI, tests, permissions, RLS/RPCs, setup writes, order mutation behavior, or helper behavior changed in 10I2.

Phase 10I3 Smoke Blocker Repair is complete. `supabase/migrations/20260518068000_fix_assignable_users_and_order_read_views.sql` replaces `rpc_company_assignable_users(text)` so assignable-user default split derives from existing `users.fee_split` / `users.split` instead of missing `users.split_pct`, and it changes the routed order read projections (`v_orders_frontend_v4`, `v_orders_active_frontend_v4`, `v_orders_list`, and `v_orders_list_with_last_activity`) back to owner-backed safe projections while preserving their current-company/order-read predicates. This fixes the 10I2 assignable selector failure and the browser read dependency on forbidden joined tables such as `amcs` without adding broad direct table grants. A focused frontend test was added for `assignableUsersApi`. SQL smoke confirmed assignable users, Owner/Admin order detail/list projections, assigned-appraiser order detail/list projections, and direct authenticated order write blocking. Direct authenticated `orders` insert/update/delete remain blocked, and active order create/edit/site-visit/status/override mutation paths were not changed. Recommended next step is Phase 10I4: rerun the browser smoke from Order Create onward before new product work or deprecated helper removal.

Phase 10I4 Route-Level Browser Smoke Rerun After 10I3 Repairs is complete as browser execution plus documentation in `docs/ROUTE_LEVEL_BROWSER_SMOKE_RESULTS.md`, but the full route smoke still does not pass. The 10I3 repairs were confirmed: `/orders/new` assignment selectors load, order create still uses `rpc_create_order(...)` with generated order number `2026001`, `/orders/:id` and `/orders/:id/edit` load without the previous `amcs` permission failure, normal edit saves through `rpc_update_order(...)` without changing the order number, `/orders` exposes the smoke order, and table/detail site-visit updates save through the RPC-backed path. Remaining blockers are now narrower and activity-related: `Send to Review` fails before status transition because `activity_log_created_by_fkey` rejects workflow-note logging, and explicit order-number override opens safely but does not persist because `rpc_order_number_override(...)` returns an error during save while the order number remains unchanged. Recommended next step is a narrow Phase 10I5 activity-log/workflow blocker repair, then rerun only the failed smart-action and order-number override steps plus final readback. No runtime code, migrations, backend behavior, routes, registries, UI, tests, permissions, RLS/RPCs, or order mutation behavior changed in 10I4.

Phase 10I5 Activity Log Identity / FK Repair is complete. `supabase/migrations/20260518069000_activity_log_identity_fk_repair.sql` repairs the activity-log blocker found in 10I4 by keeping `activity_log.actor_user_id = current_app_user_id()` as the canonical app-user FK while making legacy `created_by` FK-safe: it is populated only when the authenticated user has a matching `profiles_legacy` row, otherwise it remains null. Both active `rpc_log_event(...)` overloads and `rpc_order_number_override(...)` now use this identity behavior, while preserving `actor_id = auth.uid()`, `created_by_name`, `created_by_email`, activity writes, workflow guards, order-number override authorization, and existing order mutation RPC paths. `supabase db reset` passed. SQL smoke with users that intentionally lacked `profiles_legacy` rows confirmed workflow note logging succeeds, `rpc_transition_order_status(...)` transitions `new` to `in_review`, `rpc_order_number_override(...)` returns `updated` and writes activity, activity rows have valid FK-backed `actor_user_id` attribution, direct authenticated `orders` insert remains blocked by RLS, and direct authenticated update affects zero rows. Recommended next step is Phase 10I6: browser rerun only the failed 10I4 smart-action and order-number override flows plus final list/detail/edit readback before broader product work.

Phase 10I6 Focused Browser Smoke Rerun After 10I5 is complete and passed. The focused browser rerun used a disposable local order `30000000-0000-4000-8000-000000010601` with original number `10I6-001-826557`. As the assigned appraiser, `/orders` exposed the row, `Send to Review` with a note logged activity through `rpc_log_event(...)` HTTP 200 and transitioned through `rpc_transition_order_status(...)` HTTP 200 from `new` to `in_review` without `activity_log_created_by_fkey`. As Owner/Admin, `/orders/:id/edit` opened the explicit order-number dialog, availability passed, `rpc_order_number_override(...)` returned HTTP 200, and the order number changed to `10I6-OVERRIDE-163217`. Final readback across `/orders`, `/orders/:id`, and `/orders/:id/edit` consistently showed the updated order number and `In Review` status with no `amcs` permission error, no assignable-users `split_pct` error, no `Failed to load order`, and no direct-write RLS error. Database readback confirmed the updated status/order number and valid activity actor attribution. The route-level smoke blockers from 10I2 and 10I4 are now cleared in local browser smoke. Recommended next step is to move to the next product phase, keeping the separate nonblocking owner-profile lookup 403 and existing lint/build warnings on the general cleanup list.

Phase 10I7 Browser Smoke Validation Closeout is complete as documentation only in `docs/ROUTE_LEVEL_BROWSER_SMOKE_CLOSEOUT.md`. Phase 10I is now complete through plan, initial smoke, two focused blocker repairs, reruns, and closeout. Final validated flows are Owner Setup, Order Create, Order Detail, Order Edit, Site Visit table path, Site Visit detail path, Smart Action / Status Workflow, Order Number Override, and final list/detail/edit readback. The closeout confirms active order mutations remain on RPC/canonical paths, direct authenticated `orders` writes remain blocked, authorized read projections work, Owner Setup product polish did not break Company Profile save, and activity logging works for workflow and override paths. The only recorded remaining nonblocking observation is the owner profile lookup HTTP 403, which did not affect smoke criteria. Recommended default next phase is a Team/Staff setup bridge from Owner Setup to the existing Team Access route, with no new backend writes and existing permissions/route guards kept intact. No runtime code, migrations, backend behavior, routes, registries, UI, tests, permissions, RLS/RPCs, setup writes, order mutation behavior, or helper behavior changed in 10I7.

Phase 10J1 Team/Staff Setup Bridge Design is complete as documentation plus read-only inspection in `docs/OWNER_SETUP_TEAM_STAFF_BRIDGE_DESIGN.md`. The existing Team Access route is `/users`, guarded by `PERMISSIONS.USERS_READ` / `users.read`, while invitation actions remain inside `UsersIndex` and use existing `users.invite`, `users.manage_company_access`, `roles.assign`, company-member RPCs, and invite/resend Edge Functions. The designed bridge is a navigation-only Owner Setup action on the Team / Staff Invitations card: show `Open Team Access` or `Manage team access` only when existing `users.read` visibility is available, navigate to `/users`, and let the existing route guard and Team Access action permissions remain authoritative. The card should remain non-writing, preserve readiness/status mapping, and must not embed invite forms, submit invitations, add RPCs, add permissions, bypass route guards, activate staff, persist onboarding completion, create product-mode/module authority, or activate Vendor/Client surfaces. Recommended 10J2 implementation is a narrow frontend-only link/action on that card plus Owner Setup tests; no backend changes are recommended.

Phase 10J2 Owner Setup Team Access Bridge Implementation is complete. `src/pages/admin/OwnerSetup.jsx` now marks the Team / Staff Invitations card as a Team Access bridge card, updates its copy to point to the existing guarded Team Access workflow, checks existing `PERMISSIONS.USERS_READ` visibility with the current permission helper, and renders a single `Open Team Access` link to `/users` only when `users.read` is allowed. Without `users.read`, the card remains informational. `src/pages/admin/__tests__/OwnerSetup.test.jsx` now covers link visibility, absence without permission, `/users` target, absence of invite UI inside Owner Setup, and preservation of existing write boundaries. Company Profile remains the only Owner Setup write card. No migrations, backend behavior, routes, registries, permissions, RLS/RPCs, invitation APIs, Edge Function calls, invite forms, setup writes, staff activation, product-mode/module authority, Vendor activation, or Client activation changed.

Phase 10J3 Team/Staff Bridge Closeout and Next Onboarding Step Decision is complete as documentation plus read-only inspection in `docs/OWNER_SETUP_TEAM_STAFF_BRIDGE_HANDOFF.md`. Phase 10J is complete through design, implementation, and closeout. The handoff confirms the bridge behavior, `/users` route guard preservation, safety boundaries, and current Owner Setup inventory: Company Profile remains the only write card; Team / Staff Invitations is navigation-only; Owner Profile, Role Review, Workflow Assumptions, and Readiness remain diagnostic; Basic Settings, Order Numbering, Notification Preferences, and Branding remain deferred or non-actionable. Recommended next options are Owner Profile diagnostic/identity polish, Team Access route smoke from the bridge, Company onboarding persistence design, Basic Settings narrow contract design, and later notification/defaults or branding storage design. Default next step is Team Access route smoke if confidence in the bridge is needed; otherwise Owner Profile diagnostic/identity polish because the owner profile lookup HTTP 403 remains the known nonblocking observation. No runtime code, migrations, backend behavior, routes, registries, UI, tests, permissions, RLS/RPCs, setup writes, invitation writes, staff activation, product-mode/module authority, Vendor activation, or Client activation changed in 10J3.

Phase 10K1 Operational Dashboard Polish Strategy is complete as documentation plus read-only inspection in `docs/OPERATIONAL_DASHBOARD_POLISH_STRATEGY.md`. The strategy records the current dashboard state: `/dashboard` remains selected by `DashboardGate`, order-capable users render `DashboardPage`, assignment-only users remain on assignment-native dashboard surfaces, dashboard rows/KPIs come from existing order read projections through `useDashboardSummary`, `useDashboardKpis`, `useOrdersSummary`, and `fetchOrdersWithFilters`, operational queues are deterministic summaries over already loaded dashboard rows, and smart actions remain inside existing table/drawer canonical workflow paths. Current gaps are workload clarity, first-class review bottlenecks, due/overdue triage, recent activity, role-specific copy, and safe team capacity framing. Recommended dashboard sections are Workload Snapshot, Orders Needing Action, Review Bottlenecks, Overdue / Due Soon, Recent Activity, My Assignments, Team Capacity / Assignment Load, and Quick Links / Smart Actions. Recommended 10K2 is frontend-only dashboard copy/layout polish using existing dashboard data only, with at most one or two high-value widgets derived from already loaded rows; no migrations, backend behavior, routes, registries, permissions, RLS/RPCs, analytics RPCs, product-mode/module authority, fake metrics, cross-company aggregates, or dashboard mutation changes are recommended.

Phase 10K2 Operational Dashboard Layout Shell is complete as a frontend-only dashboard polish. `src/features/dashboard/DashboardPage.jsx` now frames the page around operational triage with a header active-work count, a `Workload Snapshot` section using existing `summary.orders` values, clearer `Orders Needing Action` copy, two existing-row-derived triage widgets (`Due Soon / Overdue` and `Review Bottlenecks`), a labeled `Calendar Context` area, and role-specific worklist headings (`Active Worklist`, `My Review Work`, `My Assignments`). The widgets use only already loaded dashboard rows and existing deterministic queue summaries from `summarizeOperationalQueues(...)`, `getTopOperationalQueues(...)`, and `getQueueSummaryById(...)`; no new data source was added. `src/features/dashboard/__tests__/DashboardPage.test.jsx` covers the new sections, honest widget counts from mocked loaded rows, queue filtering, and reviewer worklist copy. `DashboardGate` behavior, route guards, permissions, order projections, `UnifiedOrdersTable`, dashboard calendar data, and existing smart-action/canonical workflow paths are preserved. No migrations, backend behavior, routes, registries, permissions, RLS/RPCs, analytics RPCs, direct table reads, fake metrics, product-mode/module authority, assignment-native dashboard behavior, or dashboard mutation paths changed.

Phase 10K3 Dashboard Worklist Interaction Polish is complete as a frontend-only dashboard polish. `src/features/dashboard/DashboardPage.jsx` now adds a scan-friendly `Priority Worklist Preview` built only from already loaded `ordersRows` and deterministic `orderHasQueue(...)` checks. Selecting an operational queue turns the preview into a focused queue worklist, cards show existing row labels for order number, status, address, due date, and assigned appraiser/reviewer when available, and each card links to the existing `/orders/:id` detail workflow with `View order`. The triage widgets and queue preview now have clearer empty states for no due soon/overdue work, no review bottlenecks, no operational queue alerts, and no orders needing action. `UnifiedOrdersTable` remains the complete worklist and smart-action surface. Tests cover preview rows, detail links, selected-queue copy, empty states, role-aware labels, and preserved table/calendar props. No migrations, backend behavior, routes, registries, permissions, RLS/RPCs, analytics queries, new backend calls, fake metrics, product-mode/module authority, smart-action behavior, or dashboard mutation paths changed.

Phase 10K4 Dashboard Calendar-First Layout Rebalance is complete as a frontend-only dashboard polish. `src/features/dashboard/DashboardPage.jsx` now places `Calendar Context` directly below the header/setup prompt, keeps the existing Orders table as the primary worklist immediately after Calendar, and moves `Workload Snapshot`, `Orders Needing Action`, and operational queue filters into a compact supporting panel beside the table on wide screens. The 10K3 `Priority Worklist Preview` mini-worklist was removed because it could imply stronger prioritization than the deterministic queue signals support. Compact indicators still use existing `summary.orders`, `ordersRows`, queue summaries, and `orderHasQueue(...)`, while `DashboardCalendarPanel` and `UnifiedOrdersTable` keep their existing behavior, smart-action paths, queue filtering, and refresh callbacks. Tests assert Calendar renders before Orders/support widgets, the priority preview is absent, compact widgets still render from existing data, table filtering still works, and role-aware labels remain. No migrations, backend behavior, routes, registries, permissions, RLS/RPCs, analytics queries, new backend calls, pinning, fake prioritization, fake metrics, product-mode/module authority, smart-action behavior, or dashboard mutation paths changed.

Phase 10K5 Dashboard Copy Simplification and Sticky Utility Rail Design is complete as a frontend-only dashboard polish. `src/features/dashboard/DashboardPage.jsx` now uses simpler product copy (`Schedule`, `Active Orders`, `Attention`), removes runtime `pressure` wording, trims explanatory subtitles, removes the redundant `Workload Snapshot` card stack, and keeps only compact operational attention cards plus queue filters in a support rail. The rail uses `lg:sticky lg:top-24 lg:self-start` so it supports the Orders table on wide screens without interfering with table scrolling. Calendar remains first, and the Orders table remains the primary worklist immediately after Calendar. Tests assert the simplified schedule label, no rendered pressure copy, removed snapshot section, compact support cards, table-before-rail ordering, and unchanged queue filtering. No migrations, backend behavior, routes, registries, permissions, RLS/RPCs, analytics queries, new backend calls, pinning, fake prioritization, fake metrics, product-mode/module authority, smart-action behavior, or dashboard mutation paths changed.

Phase 10K6 Dashboard Status Timeline Rail is complete as a frontend-only dashboard polish. `src/features/dashboard/DashboardPage.jsx` now replaces subjective rail widgets with a canonical status timeline using `New`, `In Progress`, `In Review`, `Needs Revisions`, and `Ready for Client`. Counts are derived only from already loaded dashboard `ordersRows` using `normalizeOrderStatus(...)`, selecting a status filters the existing `UnifiedOrdersTable` row override, and `Clear Filter` restores the full loaded-row table. `Review Bottlenecks`, due/overdue attention widgets, queue-derived rail filtering, and priority preview behavior are no longer part of the dashboard rail. Calendar remains first, Orders remains the primary worklist, and the sticky rail stays compact on wide screens. Tests assert simple status labels, status counts from loaded rows, no `Review Bottlenecks`, no rendered `pressure` copy, status filtering, and clear-filter restoration. No migrations, backend behavior, routes, registries, permissions, RLS/RPCs, analytics queries, new backend calls, pinning, fake prioritization, fake metrics, product-mode/module authority, smart-action behavior, or dashboard mutation paths changed.

Phase 10K7 Dashboard Compact Status Grid Rail is complete as a frontend-only dashboard polish. `src/features/dashboard/DashboardPage.jsx` now renders the right rail as a compact two-column colored status grid instead of a vertical status timeline. The grid keeps the canonical status filters (`New`, `In Progress`, `In Review`, `Needs Revisions`, `Ready for Client`), uses colors aligned with the existing order status badge palette, shows only label and count, and marks selection with same-family color/ring plus `aria-pressed`. The wide-screen rail column was reduced from `22rem` to `17rem` so the Orders table has more horizontal room, while sticky behavior remains. Tests assert status labels/counts, status color classes, selected state, clear-filter restoration, no older operational-attention wording, and unchanged table filtering. No migrations, backend behavior, routes, registries, permissions, RLS/RPCs, analytics queries, new backend calls, pinning, fake prioritization, fake metrics, product-mode/module authority, smart-action behavior, or dashboard mutation paths changed.

Phase 10K8 Dashboard Single-Column Status Rail and Subtle Status Motion is complete as a frontend-only dashboard polish. `src/features/dashboard/DashboardPage.jsx` now renders the status filters as a sticky single-column rail instead of the 10K7 two-column grid, reducing the wide-screen rail column from `17rem` to `13rem` so the Orders table gets more horizontal room. Status cards remain compact, colored by the existing order status badge palette, and show only label plus count. Selecting a card still filters the existing `UnifiedOrdersTable` rows and `Clear Filter` restores the full loaded-row table. Selected cards now use CSS/Tailwind-only subtle motion via same-family color, ring, light shadow, and a small horizontal shift with `motion-reduce` handling. Tests assert the single-column status filter group, status counts, selected state, clear-filter restoration, and unchanged table filtering. No migrations, backend behavior, routes, registries, permissions, RLS/RPCs, analytics queries, new backend calls, pinning, fake prioritization, fake metrics, product-mode/module authority, smart-action behavior, or dashboard mutation paths changed.

Phase 10K9 Dashboard Calendar Copy Cleanup is complete as a frontend-only copy polish. `src/features/dashboard/DashboardPage.jsx` now labels the primary dashboard calendar section `Calendar`, removes the extra calendar tagline, and keeps `Schedule pressure` out of the rendered dashboard copy. `DashboardCalendarPanel` controls, labels, legend, date range, event behavior, and open-order behavior are unchanged. Calendar remains first, Orders remains the primary worklist after Calendar, and the status rail/table filtering behavior is unchanged. Tests assert `Calendar` renders and the removed calendar copy does not render. No migrations, backend behavior, routes, registries, permissions, RLS/RPCs, analytics queries, new backend calls, data sources, smart-action behavior, or dashboard mutation paths changed.

Order Detail Print Packets are now recorded as a planned follow-on after Order Detail layout stabilization and before or alongside attachments/files work. Admin users need a safe print/export path for invoicing support, workfile/server documentation, internal admin records, and later dispute/audit review. Two read-only modes are planned: `Order Summary`, containing the operational overview only with no activity log, and `Order Audit`, containing the operational overview plus activity log. The likely first implementation should reuse already loaded order and activity data where possible, then evaluate whether a dedicated print route or PDF export is warranted. This planning note does not change app code, backend behavior, routes, permissions, RLS/RPCs, storage, activity visibility, or order mutation paths, and any future implementation must preserve existing authorization boundaries.

## Phase 0: Contract Freeze

### Goal

Freeze the core system contracts before adding more behavior.

Contracts:

- App identity: `public.users.id`.
- Visible order identity: `orders.order_number`.
- Internal routing identity: `orders.id`.
- Activity log is durable history.
- Notifications are delivery records.
- Order responsibility beats global role for workflow and notification routing.
- Permission checks should move away from literal role names.

### Why It Matters

Falcon currently has several transitional paths: auth IDs, public user IDs, profile IDs, role strings, overlapping order views, and evolving notification payloads. Freezing contracts prevents new work from deepening those conflicts.

### Files / Areas Likely Affected

- Architecture docs only.
- Code review checklist.
- Future PR descriptions.

### Database Changes

None.

### App Changes

None.

### Validation Checklist

- New work references a roadmap phase.
- No new full UUIDs appear in user-facing notification/order labels.
- No new global-role-only notification routing is introduced.
- No new `auth.uid()` comparison to app-domain IDs is introduced.

### Stop Conditions Before Moving On

- Team agrees `public.users.id` is canonical.
- Team agrees not to add ad hoc role/status/notification logic.
- Existing docs reflect the contract.

## Phase 1: Identity Alignment Helpers And RPC Cleanup

Status: MVP identity bridge complete; canonical activity payload enrichment remains in progress.

Completed:

- Batch 1 notification identity alignment.
- Batch 2 Step 1 access/RLS identity fixes.
- Lifecycle-based reviewer order visibility.
- Canonical `activity_log.actor_user_id` write path is in place for current activity RPC logging while legacy actor fields remain populated for compatibility.
- Activity timeline rendering now preserves available actor identity fields and falls back to generic `User` only after real identity options are exhausted.

Still pending:

- Canonical activity payload enrichment.
- Profile/display-name hydration cleanup where seeded/demo users still resolve to generic or incorrect names.
- Generic status/helper audit before legacy activity/status write paths are restricted.

### Goal

Make current auth-to-app-user behavior explicit and consistent.

Add helper functions and update RPCs/triggers so database logic maps `auth.uid()` to `public.users.id` before comparing or writing app-domain user references.

Implementation decisions now locked in:

- `public.users.id` is the canonical app identity.
- `public.current_app_user_id()` is the required bridge from Supabase auth identity to app identity.
- RLS and RPC authorization must compare app-domain user columns to `public.current_app_user_id()`.
- Reviewer visibility is lifecycle-based, not global-role-based.
- Global reviewer role must not grant all-order visibility.

### Why It Matters

Current schema paths mix:

- `auth.uid()`
- `public.users.id`
- `public.users.auth_id`
- `public.user_profiles.user_id`

This has already caused notification delivery bugs. It is the highest-risk foundation issue.

Role leakage also caused order visibility bugs: users with broad or overlapping roles could satisfy helper checks that were intended for appraiser assignment visibility. Lifecycle visibility must override global role visibility because order responsibility changes by status. A reviewer assigned to an order is not active for every lifecycle state, so reviewer access is limited to review-active or historical review statuses.

### Files / Areas Likely Affected

Database:

- Supabase migrations for helper functions.
- Notification RPCs.
- Notification preference RPCs/RLS.
- Email outbox trigger.
- Activity logging RPCs.
- Assignment notification triggers.

App:

- `src/lib/services/notificationsService.js`
- Any code passing recipient user IDs.
- Hooks that expose current user ID.

### Database Changes

Add helpers:

```sql
public.current_app_user_id()
public.current_app_user_role_names()
```

Update:

- `rpc_get_notifications`
- `rpc_get_unread_count`
- `rpc_mark_notification_read`
- `rpc_mark_all_notifications_read`
- `rpc_notification_create`
- `rpc_set_notification_preferences`
- notification preference RLS
- notification email trigger
- activity logging RPC authorization
- assignment notification trigger
- orders, clients, and activity RLS read/check paths where safe
- order lifecycle visibility policies for assigned reviewers

Completed Batch 1:

- Added `public.current_app_user_id()`.
- Updated notification read and mark-read RPCs.
- Updated notification creation fallback.
- Updated notification preference RLS and RPC.
- Updated assignment notification recipient semantics to `public.users.id`.
- Wired notification email queue lookup to app user identity.

Completed Batch 2 Step 1:

- Updated `current_is_admin()` to use `public.current_app_user_id()`.
- Updated `current_is_appraiser()` to require explicit appraiser role assignment.
- Patched orders, clients, and activity RLS read/check paths to use app identity.
- Dropped broad reviewer/all-order order policies.
- Added lifecycle-aware order select/update policy for assigned reviewers.
- Set frontend order views to `security_invoker = true` where supported.

Completed Phase 1 cleanup:

- Added `activity_log.actor_user_id` as the canonical `public.users.id` actor field.
- Kept legacy `created_by` and `actor_id` compatible with auth/profile identity for existing activity display.
- Updated both `rpc_log_event` overloads to write `actor_user_id = public.current_app_user_id()` while `created_by` and `actor_id` remain `auth.uid()`.
- Reviewer/Pam can post activity notes without `activity_log_created_by_fkey` errors.

### App Changes

- Ensure app code sends `public.users.id` for notification recipients.
- Ensure self-notification suppression compares against `public.users.id`.
- Ensure current-user hooks expose both auth id and public user id clearly when needed.

### Validation Checklist

- User where `public.users.id != auth_id` can receive bell notifications.
- Same user can read and mark notifications.
- Notification preferences work for same user.
- Assignment notifications still work.
- Activity notes still log correctly.
- No FK conflict when creating notifications.
- Reviewer assigned to a `new` or `in_progress` order cannot see it solely because `reviewer_id` matches.
- Reviewer assigned to `in_review`, `needs_revisions`, or `completed` orders can see review-active/historical work.
- Admin/owner still sees all orders.
- Assigned appraiser still sees assigned orders.
- Order views used by the frontend apply base-table RLS through `security_invoker` when supported.

### Stop Conditions Before Moving On

- All notification paths work with mismatched public user id/auth id.
- Local migrations and live DB behavior agree on notification user ID semantics.
- No known read/check RPC or RLS path compares domain `user_id` directly to `auth.uid()` without mapping.
- Remaining `auth.uid()` activity actor writes are isolated for the next Phase 1 batch.

## Phase 2: Permission Compatibility Layer

Status: MVP complete; Phase 3 responsibility resolver work has started and is MVP-complete for the current single-company workflow scope.

Completed:

- Step 1 permission foundation.
- `public.permissions`, `public.roles`, and `public.role_permissions` now exist.
- System permissions are seeded.
- Template roles `Owner`, `Admin`, `Appraiser`, `Reviewer`, and `Billing` are seeded.
- Template `role_permissions` are seeded.
- Step 2 compatibility permission resolver.
- `public.current_app_user_permission_keys()` returns effective permission keys for the current app user.
- `public.current_app_user_has_permission(text)` checks one permission.
- `public.current_app_user_has_any_permission(text[])` checks any requested permission.
- `public.current_app_user_has_all_permissions(text[])` checks all requested permissions.
- Resolver maps legacy `public.user_roles.role` rows to seeded template roles.
- Step 3 frontend permission helper plumbing.
- Added `PERMISSIONS` / `ALL_PERMISSION_KEYS`.
- Added `useEffectivePermissions()`, `useCan()`, and `useCanAny()`.
- Step 4 frontend permission plumbing is MVP-complete.
- `TopNav` now uses `CLIENTS_READ_ALL` to choose the full clients route, with the legacy admin fallback during permission loading/errors.
- TopNav avatar Settings link and mobile Settings nav item now use `SETTINGS_VIEW`.
- TopNav Settings visibility preserves existing behavior while permission loading/errors occur.
- `ProtectedRoute` now supports optional `requiredPermission`, `requiredAnyPermissions`, and `requiredAllPermissions` props.
- Step 4 safe route guard migration is MVP-complete.
- `/users` now uses `USERS_READ`.
- `/users/:userId` now uses `USERS_UPDATE`.
- `/users/new` now uses `USERS_CREATE`.
- `/users/view/:userId` now uses `USERS_READ`.
- `/settings` now uses `SETTINGS_VIEW`.
- `/settings/notifications` now uses `NOTIFICATIONS_PREFERENCES_MANAGE_OWN`.
- Historical Step 4 note: migrated routes kept legacy role arrays as fallback at that time. This was superseded by Phase 8C5J2; active route authority is now permission-only.
- Step 4 CommandPalette filtering is complete.
- Orders, Clients, Users, Settings, and Notification Settings commands now have permission gates.
- CommandPalette preserves legacy command visibility during permission loading/errors.
- NewOrderButton now uses `ORDERS_CREATE`.
- Chris/appraiser validated: no New Order button.
- Abby/admin validated: New Order button visible.
- UserDetail edit action now uses `USERS_UPDATE`.
- UserCard edit/view behavior now uses `USERS_UPDATE`.
- Users nav visibility now uses `USERS_READ`.
- Users directory access model is finalized: `USERS_READ` grants read-only directory access, `USERS_UPDATE` grants edit actions, and `USERS_CREATE` grants user creation.
- `USERS_READ` is granted to Appraiser, Reviewer, and Billing template roles.
- `USERS_CREATE` is granted to the Admin template role.
- UsersIndex edit/create UI is fully permission-driven.
- Chris/appraiser validated read-only Users access.
- Chris/appraiser validated user view access works and edit/new user routes are blocked.
- Abby/admin validated full Users access.
- Abby/admin validated user view, edit, and new user routes work.
- Desktop validation passed for the TopNav Settings permission patch where applicable.
- Client create/edit UI and routes now use `CLIENTS_CREATE` and `CLIENTS_UPDATE_ALL`.
- Remaining client panel Edit/Delete actions are gated by `CLIENTS_UPDATE_ALL` and `CLIENTS_DELETE`.
- Client drawer direct save/update path is gated by `CLIENTS_UPDATE_ALL`.
- ClientCard text reflects `CLIENTS_UPDATE_ALL`.
- Chris/appraiser validated scoped read-only client access with no client Edit/Delete actions.
- Chris/appraiser client cards now say `Click to see orders`.
- Abby/admin validated client edit access and admin edit capability.

Deferred / later-phase work:

- Order routes, order navigation, order workflow buttons, and order action buttons are deferred to responsibility/lifecycle work.
- Client scoped route and navigation behavior is deferred to responsibility/scoped visibility work.
- Calendar route and navigation gating is deferred until a calendar permission model exists.
- Dashboard route/query behavior is deferred because it is role/responsibility scoped.
- Backend/RLS permission enforcement is deferred to later permission/normalization phases.
- `getEffectivePermissions(userId, companyId)` and `canUserPerform(userId, permissionKey, context)` service contracts are deferred to later Phase 2/Phase 6 support work.
- Mobile login currently shows a blank screen; defer mobile-specific investigation unless it affects desktop or core live app flows.
- User edit form and role management are still legacy where not explicitly permission-gated.

### Goal

Introduce permission-based app checks without immediately changing the database role model.

### Why It Matters

Falcon's future role system uses configurable permission bundles. The app should stop adding new behavior tied directly to literal role names like `admin`, `reviewer`, or `appraiser`.

### Files / Areas Likely Affected

App:

- `src/lib/permissions/*`
- `src/features/auth/useCurrentUserAppContext.js`
- Navigation components.
- Order action components.
- Admin/user management components.
- Activity/notification code touched by future work.

Docs:

- `docs/ROLE_PERMISSION_MODEL.md`

### Database Changes

Completed Step 1:

```txt
permissions
roles
role_permissions
```

Seeded:

- System permission catalog.
- Template roles: Owner, Admin, Appraiser, Reviewer, Billing.
- Template role permissions.

Completed Step 2:

- Added read-only compatibility resolver functions.
- Resolver reads legacy `public.user_roles.role` and maps role names to seeded template roles.
- Owner role effectively receives all seeded permissions.
- No RLS, frontend, or legacy helper behavior changed.

Validation note:

- Supabase SQL editor has no app auth context, so `public.current_app_user_id()` returns null there.
- Validate resolver behavior through an authenticated app request, or with manual user-id queries that simulate the same joins.

### App Changes

Completed Step 3:

```ts
PERMISSIONS
ALL_PERMISSION_KEYS
useEffectivePermissions()
useCan(permissionKey)
useCanAny(permissionKeys)
```

The new hooks fetch permission keys from `current_app_user_permission_keys()`. Phase 2 Step 4 now uses them for the safe MVP frontend permission plumbing listed below.

Completed Step 4 MVP frontend permission plumbing:

- `TopNav` uses `useCan(PERMISSIONS.CLIENTS_READ_ALL)` to choose `/clients` versus `/clients/cards`.
- `TopNav` preserves the legacy `isAdmin` fallback while permission loading is pending or the resolver errors.
- TopNav avatar Settings link and mobile Settings nav item use `useCan(PERMISSIONS.SETTINGS_VIEW)`.
- TopNav Settings visibility remains unchanged while the permission check is loading or errors.
- `ProtectedRoute` accepts optional permission gate props without changing existing route declarations.
- `/users` uses `requiredPermission={PERMISSIONS.USERS_READ}`.
- `/users/:userId` uses `requiredPermission={PERMISSIONS.USERS_UPDATE}`.
- `/users/new` uses `requiredPermission={PERMISSIONS.USERS_CREATE}`.
- `/users/view/:userId` uses `requiredPermission={PERMISSIONS.USERS_READ}`.
- `/settings` uses `requiredPermission={PERMISSIONS.SETTINGS_VIEW}`.
- `/settings/notifications` uses `requiredPermission={PERMISSIONS.NOTIFICATIONS_PREFERENCES_MANAGE_OWN}`.
- Historical Step 4 note: migrated routes retained legacy role arrays as resolver-error fallback at that time. This was superseded by Phase 8C5J2; active route authority is now permission-only.
- Remaining route config that depends on order lifecycle, client scope, calendar behavior, or dashboard responsibility remains deferred rather than migrated in Step 4.
- CommandPalette filters commands by permission:
  - Orders: `NAVIGATION_ORDERS_VIEW`
  - Clients: `NAVIGATION_CLIENTS_VIEW`
  - Users: `USERS_READ` or `NAVIGATION_USERS_VIEW`
  - Settings: `SETTINGS_VIEW` or `NAVIGATION_SETTINGS_VIEW`
  - Notification Settings: `NOTIFICATIONS_PREFERENCES_MANAGE_OWN`
- CommandPalette shows the legacy full command list while permissions are loading or the resolver errors.
- NewOrderButton uses `useCan(PERMISSIONS.ORDERS_CREATE)` for visibility.
- NewOrderButton preserves the legacy `isAdmin` fallback while permission loading is pending or the resolver errors.
- UserDetail Edit action uses `useCan(PERMISSIONS.USERS_UPDATE)` for visibility.
- UserDetail preserves the legacy admin-ish fallback while permission loading is pending or the resolver errors.
- Existing self-profile/view behavior was not changed.
- UserCard edit/view behavior uses `useCan(PERMISSIONS.USERS_UPDATE)`.
- UserCard preserves the legacy admin fallback while permission loading is pending or the resolver errors.
- TopNav Users nav visibility uses `useCan(PERMISSIONS.USERS_READ)`.
- TopNav Users nav preserves the legacy admin fallback while permission loading is pending or the resolver errors.
- UsersIndex edit buttons, inline edit mode, Save controls, and user creation UI are permission-driven.
- UsersIndex gates edit behavior with `USERS_UPDATE`.
- UsersIndex gates New user behavior with `USERS_CREATE`.
- Chris/appraiser has read-only directory access.
- Chris/appraiser can access user view routes and is blocked from edit/new user routes.
- Abby/admin has full Users access.
- Abby/admin can access user view, edit, and new user routes.
- Desktop validation passed for the TopNav Settings permission patch where applicable.
- ClientsIndex gates New Client with `CLIENTS_CREATE`.
- ClientDetail gates Edit Client and inline edit form with `CLIENTS_UPDATE_ALL`.
- `/clients/new` uses `requiredPermission={PERMISSIONS.CLIENTS_CREATE}`.
- `/clients/edit/:clientId` uses `requiredPermission={PERMISSIONS.CLIENTS_UPDATE_ALL}`.
- ClientDetailPanel gates Edit with `CLIENTS_UPDATE_ALL` and Delete with `CLIENTS_DELETE`.
- ClientDrawerContent gates the direct save/update path with `CLIENTS_UPDATE_ALL`.
- ClientCard text now uses `CLIENTS_UPDATE_ALL`: users with edit permission see `Click to see orders & edit`; read-only users see `Click to see orders`.
- Client query/KPI/scoped visibility logic was not changed.
- `/clients` and `/clients/cards` visibility behavior was not changed.
- Chris/appraiser can view scoped clients, does not see client Edit/Delete actions, and sees client cards that say `Click to see orders`.
- Abby/admin can edit clients and sees admin edit capability.
- User edit form and role management were not otherwise changed.
- Order creation route, order form, and workflow/action buttons were not changed.
- Order workflow/action buttons were not changed.
- Orders, Clients, Calendar, CommandPalette, routes, layout, styling, dashboard behavior, Supabase, RLS, backend, migrations, and workflow/action logic were not changed by the latest TopNav Settings permission slice.

Deferred service contracts:

```ts
getEffectivePermissions(userId, companyId)
canUserPerform(userId, permissionKey, context)
```

These are later Phase 2/Phase 6 support work and are not blockers for moving to Phase 3.

### Validation Checklist

- Existing admin/appraiser/reviewer behavior remains unchanged.
- New checks use permission helpers.
- Navigation can be gated by permission helpers.
- `TopNav` clients path respects `CLIENTS_READ_ALL` and falls back to legacy admin behavior while permissions load.
- TopNav avatar Settings link and mobile Settings nav item use `SETTINGS_VIEW`.
- TopNav Settings visibility remains unchanged during permission loading/errors.
- `/users` route guard uses `USERS_READ`.
- `/users/:userId` route guard uses `USERS_UPDATE`.
- `/users/new` route guard uses `USERS_CREATE`.
- `/users/view/:userId` route guard uses `USERS_READ`.
- `/settings` route guard uses `SETTINGS_VIEW`.
- `/settings/notifications` route guard uses `NOTIFICATIONS_PREFERENCES_MANAGE_OWN`.
- Legacy role arrays on migrated routes are fallback only when the permission resolver errors.
- Chris, Pam, and Abby validated access successfully.
- Chris/appraiser validated no New Order button.
- Abby/admin validated New Order button visible.
- UserDetail edit action uses `USERS_UPDATE`.
- Existing self-profile/view behavior remains unchanged.
- UserCard edit/view behavior uses `USERS_UPDATE`.
- TopNav Users nav visibility uses `USERS_READ`.
- Appraiser, Reviewer, and Billing template roles include `USERS_READ`.
- Admin template role includes `USERS_CREATE`.
- UsersIndex edit/create UI is permission-driven.
- Chris/appraiser validated read-only Users access.
- Chris/appraiser validated user view access works and edit/new user routes are blocked.
- Abby/admin validated full Users access.
- Abby/admin validated user view, edit, and new user routes work.
- Desktop validation passed for the TopNav Settings permission patch where applicable.
- Client create/edit UI and routes use `CLIENTS_CREATE` and `CLIENTS_UPDATE_ALL`.
- Remaining client panel Edit/Delete actions use `CLIENTS_UPDATE_ALL` and `CLIENTS_DELETE`.
- Client drawer direct save/update path uses `CLIENTS_UPDATE_ALL`.
- ClientCard text reflects `CLIENTS_UPDATE_ALL`.
- Client query/KPI/scoped visibility logic remains legacy and responsibility-dependent.
- `/clients` and `/clients/cards` visibility behavior was not changed.
- Chris/appraiser validated scoped read-only client access, no client Edit/Delete actions, and read-only card text.
- Abby/admin validated client edit access and admin edit capability.
- CommandPalette only shows Orders, Clients, Users, Settings, and Notification Settings commands when the user has the corresponding permission.
- CommandPalette preserves legacy behavior during permission loading/errors.
- Order workflow/action buttons remain untouched.
- Order creation route and order form remain untouched.
- Orders, Clients, Calendar, CommandPalette, routes, layout, styling, Supabase/RLS, backend, migrations, dashboard behavior, and workflow/action logic remain untouched by the latest TopNav Settings permission slice.
- User edit form and role management remain otherwise untouched.
- Dashboard behavior, Supabase, and RLS remain untouched.
- Mobile login currently shows a blank screen; mobile-specific investigation is deferred unless it affects desktop or core live app flows.
- Existing tests/build pass.

### Stop Conditions Before Moving On

- No new feature code uses role strings directly when a permission helper could answer the question.
- Current role behavior is preserved through compatibility mapping.
- Safe frontend permission plumbing is complete enough for MVP; broader route/nav migration is deferred where it depends on responsibility, scoped visibility, calendar permissions, dashboard semantics, or backend/RLS enforcement.

## Phase 3: Responsibility Resolver

### Goal

Implement a central responsibility resolver using current order fields first.

Function:

```ts
resolveOrderParticipants(order, eventContext)
```

### Why It Matters

Notification and workflow behavior should be based on order responsibility, not global role. This prevents cases like a global admin assigned as appraiser being treated as admin for note routing.

### Files / Areas Likely Affected

App:

- `src/lib/orders/resolveOrderParticipants.*`
- `src/lib/services/notificationsService.js`
- `src/components/activity/ActivityNoteForm.jsx`
- Workflow modal components.
- Status transition utilities.

Docs:

- `docs/SYSTEM_DATA_MODEL.md`
- `docs/ORDER_LIFECYCLE_MODEL.md`

### Database Changes

None required in this phase.

### App Changes

Resolver should initially use:

- `order.appraiser_id`
- `order.reviewer_id`
- `order.status`
- current public user id
- event context

It should return:

- active participants
- visible user ids
- bell recipient ids
- passive participant ids
- actor role on order
- recipient contexts

Status: Resolver MVP complete for current scope. No app-code requirement remains before moving to the next phase.

Completed first resolver slice:

- Added `src/lib/orders/resolveOrderParticipants.js`.
- `ActivityNoteForm` uses the resolver for note notification routing only.
- Appraiser notes route to the reviewer.
- Reviewer notes route to the appraiser.
- Admin/other notes route to the appraiser.
- `resolveOrderParticipants` has explicit `workflow.sent_to_review` behavior returning `reviewer_id`.
- `sendOrderToReview` uses the resolver for reviewer recipient assembly with existing reviewer fallback.
- `sendOrderBackToAppraiser` uses the resolver for appraiser recipient assembly with existing appraiser fallback.
- `completeOrder` uses the resolver for appraiser recipient assembly with existing appraiser fallback.
- Admin recipients remain appended through `fetchAdminRecipients()`.
- Chris/appraiser send-to-review was validated: Pam/reviewer received notification, Abby/admin received notification, and status behavior remained normal.
- Complete order workflow still works and sends notifications.
- Send-to-review workflow emits a single notification with optional note snippet while preserving the full note in activity history through `logNote`.
- Send-to-review/resubmission workflow now suppresses self-notifications.
- Resubmission uses the existing `order.sent_to_review` event key with an `is_resubmission` payload flag, not a new notification policy.
- Resubmission notifications are visually/textually distinct from first send-to-review.
- Send-back-to-appraiser workflow emits a single notification with revision note snippet while preserving the full note in activity history through `logNote`.
- `clearReview` emits `order.review_cleared` to admin/owner recipients, with notification policy seeded for the event.
- Workflow notifications are now consistent for MVP: one actionable notification per action, with Activity / Communication History as the full communication source.
- `/orders/:id` shows Activity / Communication History with `ActivityLog`, so notification clicks land on a detail page with visible communication history.
- Notification payload/UI behavior is otherwise unchanged.
- No DB/RLS, order visibility, status lifecycle, or workflow button behavior changed.
- No routing or notification service changes were made for these slices.
- `npm run build` passed.

Deferred follow-up:

- Do not migrate `markReadyForClient` to `resolveOrderParticipants` yet. Default Falcon workflow should separate reviewer clearance from client release.
- Reviewer remains responsible for technical review actions such as send back to appraiser and clear review/review cleared.
- Admin/owner controls client release actions such as mark ready for client and mark completed by default.
- A future company setting may allow reviewer release for firms that permit reviewers to mark orders ready for client.
- When an order is marked ready for client, the appraiser should generally be notified that the report has been cleared/released, admins/owners should remain action-aware, and reviewer notification should be optional/configurable.
- These ready-for-client recipients should be controlled later by company workflow/notification settings.
- Final owner approval should be configurable: no final approval required, final approval always required, or final approval required by client/report type/threshold/manual decision later.
- Potential lifecycle statuses for this model include `in_review`, `needs_revisions`, `review_cleared`, `pending_final_approval`, `ready_for_client`, and `completed`.
- `review_cleared` is now introduced and validated for the default reviewer-to-admin handoff: reviewer actions move `in_review` to `review_cleared`, admin/owner can see those orders and continue client release, and `ready_for_client` remains the admin/owner release state.
- `clearReview()` works, reviewer-facing UI says "Clear Review", direct reviewer status shortcuts use `REVIEW_CLEARED`, activity records "In Review -> Review Cleared", notification copy indicates review cleared/admin release handoff, and `npm run build` passed.
- Appraiser dashboard active queue now includes only `new`, `in_progress`, and `needs_revisions`; `in_review`, `review_cleared`, `pending_final_approval`, `ready_for_client`, and `completed` are excluded from the active queue while remaining available in Orders/history.
- Dashboard operational cockpit direction is locked: slim role context, compact Operational Attention signals, calendar as the primary visual surface, and Active Worklist directly below the cockpit.
- Dashboard KPI/business cards were intentionally removed from the dashboard default experience. Business metrics and owner analytics are deferred to a dedicated Reports / Owner analytics surface.
- Future company settings can still configure analytics cards, thresholds, labels, and date fields, but that belongs outside the daily operational dashboard unless the signal is directly tied to immediate work.
- Calendar + Appointment System MVP is complete: site visit dates are visible in the order row Dates column, appraisers can set missing appointments inline through `SiteVisitPicker`, appointment saves use local wall-clock timestamps instead of UTC conversion, `site_visit_at` is selected before the date-only fallback, and the dashboard calendar refreshes through a dashboard summary refresh token after updates.
- Calendar labels now use compact visible chips with street plus time for site visits and street-only labels for review/final due dates; full address remains available in the tooltip and chip overflow is contained.
- Architecture decision: order rows stay compact and date-only for at-a-glance operations, while the calendar is the detailed scheduling surface where appointment time lives. Local browser time is the MVP source of truth for appointments.
- Calendar product distinction is locked: dashboard calendar is the operational pressure snapshot; standalone `/calendar` is the full operational scheduling workspace.
- Standalone Calendar Operational Alignment Slices 1-6 are complete: `/calendar` is reframed as Operational Schedule / Scheduling Workspace, toolbar/filter language is restrained and operational, standalone two-week/month views receive role context, shared calendar event normalization is used by `/calendar`, dashboard calendar, `MonthsCalendar`, and `useCalendarEvents` where safe, month view uses operational `EventChip` rendering, emoji-first month events are removed, and event shape carries richer order/client/status/ownership/address context where available.
- Slice 4 added selected-day state to standalone `/calendar`: month and two-week day cells can be selected, and the right rail shows contextual scheduling support with event count, Site / Review / Final counts, grouped event lists, and order/client/address/status/ownership context where available. Event chip order navigation remains preserved, and the rail is not an analytics/KPI reporting surface.
- Slice 5 made Lens the primary standalone calendar filter model: All shows all event types, My Work shows events where the current user is appraiser or reviewer, Site Visits shows site events, Review Handoffs shows review events, and Client Due shows final/client due events. Visible Signals controls were removed to avoid redundant double-filter behavior; the right rail reflects the same lensed event set, and the legend remains explanatory rather than interactive filter state.
- Slice 6 added lightweight deterministic scheduling intelligence hooks, not a prediction engine: normalized events now support `operationalSignals` for `missing_site_visit`, `review_compression`, `appraiser_unassigned`, and `reviewer_unassigned`; the right rail displays quiet per-event operational notes and soft aggregate notes for heavy selected-day review/final concentration, while calendar grid cells and chips remain uncluttered.
- No backend/schema/RPC/drag-drop/schedule-editing changes were made for Slice 6.
- Calendar QA/polish pass fixed dashboard Month mode navigation: `MonthsCalendar` now supports controlled or internal anchor state, dashboard Month mode receives the dashboard event loader, role, weekend visibility, and event click handler, `CalendarGrid` supports weekday-only rendering and event selection fallback behavior, standalone `/calendar` month navigation remains controlled directly from `Calendar.jsx`, and dashboard Month remains a pressure snapshot rather than a standalone workspace.
- Remaining standalone calendar roadmap: at-risk scoring, predictive risk, conflict detection, workload/capacity modeling, unassigned/at-risk lenses, chip/month-cell warning indicators, canonical backend calendar source, company timezone, and editable/reschedulable permissions remain deferred until deterministic metadata, policy, and permissions mature.
- Known calendar technical notes: build passes; lint now exits zero after ESLint stabilization with warnings only; current calendar still reads active-order normalized event data directly in places; right rail has no conflict/workload/unassigned logic yet and stacks below the calendar on smaller screens; canonical backend calendar source, company timezone, editable/reschedulable flags, and scheduling conflict metadata remain future hooks.
- Deferred appointment/calendar follow-up: existing incorrect stored timestamps need manual re-save, unified Smart Actions, company-level timezone support, and richer calendar UX such as drag/drop or direct calendar editing.
- Operational Queue Intelligence Slice 1 is complete: a shared deterministic frontend order assessment helper now returns `queueIds`, `signals`, `nextOwner`, and `primaryQueueId` for current normalized order rows.
- Current centralized queue assessment covers `due_soon`, `overdue`, `waiting_on_reviewer`, `waiting_on_appraiser`, `final_approval_queue`, `ready_for_delivery`, and `unassigned_orders`.
- Existing dashboard Operational Attention counts/filtering and Active Worklist behavior are preserved; signals are quiet explainable metadata, not predictive scoring.
- No backend/schema/RPC/UI changes were made for Operational Queue Intelligence Slice 1.
- Operational Queue Intelligence Slice 2 is complete: dashboard Active Worklist now shows quiet explanatory queue context when a queue is selected, derived from shared deterministic assessment signal labels.
- Slice 2 examples include due-soon due date context, waiting-on-reviewer action context, and ready-for-delivery context; queue cards/filtering/table columns/order click-through/Smart Actions remain unchanged.
- Row-level signal display is intentionally deferred to avoid table clutter, and no backend/schema/RPC/new queue/prediction/scoring changes were made for Slice 2.
- Operational Queue Intelligence Slice 3 is complete: Orders workspace now supports `/orders?queue=<queue_id>`, derives queue-filtered rows through the shared queue evaluator, and passes selected queue context into `UnifiedOrdersTable`.
- The Orders table now shows the same quiet queue explanation used by the dashboard when queue context is active; existing Orders filters/search remain preserved and combine with queue filtering.
- Normal `/orders` behavior is unchanged without a queue parameter. No dashboard queue cards, table columns, backend/schema/RPC changes, prediction, or scoring were added for Slice 3.
- Known Slice 3 limitation: queue filtering is frontend-derived from the current summary fetch and capped by the existing 1000-row pull; a backend canonical queue source remains future work for larger tenants.
- Operational Queue Intelligence Slice 4 is complete: when a dashboard operational queue is selected, the Active Worklist queue context exposes a restrained "View in Orders" action linking to `/orders?queue=<selectedQueueId>`.
- Slice 4 connects dashboard operational attention to the full Orders inventory while preserving dashboard queue selection/filtering and order click-through. No new queues, backend/schema/RPC changes, prediction/scoring, badges, or table redesign were added.
- Deferred queue intelligence work includes stuck orders, revision loop risk, reviewer/appraiser overload, capacity modeling, at-risk scoring, company-configurable thresholds, and a backend canonical queue source.
- Main table workflow actions are permission-gated while preserving legacy fallback during permission loading/errors.
- Reviewer template role no longer receives `workflow.status.ready_for_client`; reviewers keep `workflow.status.approve_review` for clear-review behavior.
- Row action dropdown/popover UX remains a deferred redesign item: current menus can overlap rows, render under the table near the bottom, and duplicate action logic across table, drawer, detail, reviewer shortcuts, and shared `OrderActions`.
- Frontend workflow hardening is complete for the current MVP surface: canonical workflow map added, workflow guards added, primary order workflow helpers guarded, drawer/reviewer shortcut actions routed through guarded helpers, `SmartActionsControl` extracted, `QuickActionsDrawerPanel` now uses the Smart Actions renderer, unsafe `OrderActionsPanel` barrel export quarantined, and generic status helpers documented as deprecated for normal workflow actions.
- Smart Actions consolidation is now active for the main table and quick actions drawer through shared action descriptors and `SmartActionsControl`.
- Workflow Cohesion Slice 1 is complete: canonical user-facing workflow vocabulary is locked and current labels align to Send to Review, Resubmit to Review, Request Revisions, Clear Review, Request Final Approval, Mark Ready for Client, and Mark Complete.
- Slice 1 added explicit `order.ready_for_client` notification copy, aligned activity fallback wording, and updated safe legacy action labels/comments without removing legacy surfaces.
- No workflow behavior, status, RPC, permission, queue, or lifecycle changes were made for Workflow Cohesion Slice 1.
- Notification + Activity Cohesion Slice 1 is complete: a canonical notification event registry now defines notification `key`, `label`, `category`, `priority`, `primaryRecipientRole`, `suppressActor`, `secondaryRecipientIntent`, `buildTitle`, and `buildBody`.
- Notification title/body generation is centralized for `order.new_assigned`, `order.sent_to_review`, `order.sent_back_to_appraiser`, `order.review_cleared`, `order.ready_for_client`, `order.completed`, `note.appraiser_added`, and `note.reviewer_added`.
- Notification Settings event keys/copy now align to canonical live event keys.
- Runtime behavior is preserved for Notification + Activity Cohesion Slice 1: no new notification types, recipient routing changes, backend/schema/RPC changes, or queue/calendar signal notifications were added.
- Notification + Activity Cohesion Slice 2 is complete: actor suppression is hardened for `order.sent_back_to_appraiser`, and `order.completed` suppresses the actor when actor identity is available.
- Runtime recipient doctrine otherwise remains unchanged for Slice 2: no `ready_for_client` routing changes, admin/owner role mapping changes, backend/schema/RPC/UI changes, queue/calendar signal notifications, reminders, or escalations were added.
- Deferred notification/activity cohesion work includes `ready_for_client` recipient doctrine review, admin/owner recipient distinction, registry-driven ownership recipient matrix, notification preference-policy reconciliation, and clearer separation between `/activity` notification history and order-level activity timeline.
- Legacy Surface Quarantine Slice 1 is complete: the unused `ReviewerActionCell` import was removed from `UnifiedOrdersTable`, high/medium-risk legacy workflow and calendar surfaces now carry explicit quarantine comments, and the unused `src/components/test.jsx` demo stub was deleted.
- Active canonical workflow, calendar, queue, notification, and activity surfaces remain unchanged. No runtime behavior, routes, backend/schema/RPC, workflow, or notification behavior changed, and lint warnings dropped from 199 to 196.
- Status-Write Cleanup Slice 1 is complete: active direct lifecycle status bypasses were removed from Order Detail and Order Form surfaces.
- Order Detail now renders lifecycle status as read-only, order edit saves no longer include lifecycle `status`, New Order creation always initializes status as `new`, and `AssignmentFields` no longer exposes editable lifecycle status selection.
- Legacy status mutation helpers are quarantined with explicit comments: `ordersService.setOrderStatus` and aliases, `lib/api/orders.updateOrderStatus`, `lib/api/orders.bulkUpdateStatus`, and `lib/utils/updateOrderStatus`.
- Canonical workflow transitions and Smart Actions remain the governed lifecycle path. No backend/schema/RPC, permission, queue, notification, workflow-status, or lifecycle behavior changes were made, and lint warnings dropped from 196 to 193.
- Deferred legacy cleanup includes deeper deletion, more aggressive legacy helper quarantine/removal after import verification, notification hooks/index classification, `ordersService` legacy alias cleanup, old API helper cleanup, transition capability matrix, backend enforcement review, and status-write CI/search guard.
- Multi-Company Readiness Slice 1 is complete: default platform policy modules were added for workflow, queue, calendar, and notification behavior.
- These modules represent current single-company platform defaults only. They abstract due-soon at 48 hours, active appraiser statuses, the completed status set, review compression at 2 days, and default weekend calendar visibility without behavior change.
- No tenant lookup, backend storage, settings UI, `company_id`, permission change, runtime policy resolution, workflow behavior change, queue behavior change, notification behavior change, or calendar behavior change was added. Future company policy should override through company-aware policy resolution.
- Backend workflow enforcement foundation is complete: `rpc_transition_order_status` was created and applied, transition validation works, permission enforcement works, missing permission and invalid transition rejections were validated, the happy path `submit_to_review` was validated, duplicate legacy order activity triggers were disabled, and RPC transitions now produce one clean `status_changed` activity row.
- Frontend workflow helper migration is complete: `sendOrderToReview`, `sendOrderBackToAppraiser`, `clearReview`, `requestFinalApproval`, `markReadyForClient`, and `completeOrder` now use `rpc_transition_order_status`.
- Full lifecycle was tested through the backend RPC: `new` -> `in_review` -> `review_cleared` -> `pending_final_approval` -> `ready_for_client` -> `completed`.
- Request revisions path was tested through the backend RPC: `in_review` -> `needs_revisions`.
- Activity logging is confirmed clean with one canonical `status_changed` row per new transition, and notification/toast behavior is preserved.
- Activity Timeline Refinement Sprint 1 is complete: human communication rows prioritize actor/message readability, system/workflow rows render as quieter audit memory, actor identity preservation is centralized, and new notes include best-effort actor metadata in `detail.actor`.
- Activity Timeline Refinement Sprint 2 is complete: adjacent human note plus workflow/status events group visually as frontend-only operational moments within 90 seconds while preserving all raw activity rows.
- Next milestone: audit remaining generic status helpers/RPCs before restriction.
- Do not remove old `rpc_update_order_status` yet.
- Do not tighten RLS until the generic usage audit is complete.
- Consider backend notification ownership later.
- Reference design: `docs/ORDER_WORKFLOW_BACKEND_PLAN.md`.
- Goal: move order lifecycle enforcement from frontend-only guards to Supabase-enforced transition logic with transition validation, permission validation, activity logging, and notification enqueueing.
- Deferred Smart Actions scope includes detail replacement, appointment/date editing inside Smart Actions, final approval policy settings, RLS tightening, and bulk actions.
- Admin/Abby note notifications can still display a generic actor label such as "User added a note" because the logged-in admin profile/identity hydrates as Demo User instead of Abby Rossi.
- Treat this as actor display-name/profile hydration cleanup, separate from responsibility resolver routing.
- Activity / Communication History presentation needs future polish, but is functional and visible.
- Some test/demo orders have null `order_number`, causing notification labels to fall back to UUID/short ID values; for example, order `ea359d71-4f6f-4a4a-9b26-4035ea3a7947` has `order_number` null. This is demo/test data cleanup, not a resolver failure.
- Future cleanup should backfill demo orders and ensure every order-facing notification has a visible `order_number`.

### Validation Checklist

- Appraiser note routes to reviewer.
- Reviewer note routes to appraiser.
- Admin assigned as appraiser routes as appraiser.
- Self-notification suppression still works.
- Missing recipient skip still works.
- Reviewer lifecycle cases behave as documented.

### Stop Conditions Before Moving On

- Activity note notifications and workflow note notifications both use the resolver or are ready to be migrated to it.
- No duplicated appraiser/reviewer recipient logic remains in newly touched code.

## Phase 4: Activity / Notification Payload Contract Enforcement

Status: Notification payload contract MVP complete.

### Goal

Make activity events and notifications consistently carry actor, recipient, order number, event type, importance, and communication context.

### Why It Matters

UI should render from explicit payload contracts, not inferred UUIDs, role strings, or generic fallback titles.

### Files / Areas Likely Affected

App:

- `src/lib/services/notificationsService.js`
- `src/components/notifications/NotificationBell.jsx`
- Activity logging helpers.
- Activity log components.
- Workflow modal emit paths.

Database:

- `rpc_notification_create`
- `rpc_log_event`
- activity feed view/RPCs

### Database Changes

Optional additive changes:

- Add nullable `payload` column to activity table if not already effectively represented by `detail`.
- Add nullable `company_id`, `category`, `title`, `body`, `visibility`, `importance`, `actor_user_id` later if needed.
- Do not drop legacy `detail`/`message` fields yet.

### App Changes

Enforce notification payload:

- `order_id`
- `order_number`
- `event_key`
- `importance`
- `actor.user_id`
- `actor.name`
- `actor.role_on_order`
- `recipient.user_id`
- `recipient.name`
- `recipient.role_on_order`
- `communication.kind`
- `communication.kind_label`
- `communication.direction_label`

Completed first payload slice:

- `emitNotification` now centrally resolves a valid user-facing `order_number`.
- UUID and short-id fallbacks are no longer persisted in `payload.order_number`.
- Missing `order_number` is fetched from `public.orders` when possible.
- Payload order number normalization is centralized instead of caller-dependent.
- Routing fields `order_id` and `link_path` are unchanged.
- Notifications now consistently display user-facing order numbers when available.
- Send-back-to-appraiser workflow notification now includes revision note text in the notification body when present.
- Revision note text is passed from `UnifiedOrdersTable` to `sendOrderBackToAppraiser` and included in the `emitNotification` payload.
- `buildNotificationBody("order.sent_back_to_appraiser")` now prefers `payload.note_text`.
- Duplicate note notification remains suppressed, so the appraiser receives a single informative notification instead of two separate ones.
- Routing, resolver behavior, recipients, DB/RLS, and status logic are unchanged.
- Send-to-review workflow notification now includes optional note text and suppresses the duplicate note notification.
- `order.review_cleared` notification policy is seeded for admin/owner handoff delivery.
- Notifications are consistent across current workflow actions: one actionable notification per action.
- Canonical notification event registry is now the frontend semantic source for current workflow/note title/body generation and fallback category/priority metadata.
- Notification Settings event keys and labels now align to canonical live event keys instead of stale legacy keys.
- Registry introduction preserved runtime behavior: no new notification types, no recipient routing changes, no backend/schema/RPC changes, and no queue/calendar signal notifications.
- Preference-policy semantics, a registry-driven recipient ownership matrix, and `/activity` notification-history versus order activity separation remain deferred.
- Activity log remains the source of full communication history; notifications are summaries.
- ActivityLog UX polish slice is complete: posted notes silently refresh through `listOrderActivity` without a full loading flash, the composer uses the `onSaved` callback, and the viewport remains fixed-height/scrollable even with `fill` layout.
- Activity logging, notifications, realtime subscription, and workflow logic were unchanged.
- Notification Center quick-view polish is MVP-complete: unread, seen, and dismissed states are distinct; unread items count toward the badge; seen items remain as reminders; dismissed items leave quick view but remain in history.
- Added `dismissed_at`, individual dismiss, `Dismiss seen`, click-outside close, and restored notification type color hints. `Mark all seen` clears the badge without removing reminders, and no notification history is deleted.
- `/activity` page MVP is implemented with existing user-scoped `rpc_get_notifications`: it shows unread, seen, and dismissed notification history, supports search across title/body/order number/payload, includes state and type/category filters, shows badges/order number/date/open action, and does not auto-mark seen or dismiss items.
- Raw `activity_log` aggregation, pagination, restore-dismissed behavior, and team-wide activity remain deferred.
- `npm run build` passed.

### Validation Checklist

- Bell displays human title, body, and visible order number.
- No full UUID is visible in normal notification UI.
- Admin feed prototypes can use payload without extra queries.
- Activity events keep enough context after reassignment/name changes.

### Stop Conditions Before Moving On

- All order-related notifications include `payload.order_number`.
- All note notification titles are actor/action based.
- Existing activity log remains readable.

## Phase 5: Company Foundation

Status: Multi-Company Foundation Phase 8C5K pause complete for assignment-native cross-company work packets, owner offer UX, Relationship Management UI, owner-side OrderDetail assignment state, assignment-scoped packet activity, frontend-only assignment-native dashboard surfaces, company setup/member read/mutation foundations, RPC/Edge-mediated company member invitation through frontend acceptance, Team Access invitation management, company-scoped assignable-user picker migration, order-form client intake cleanup, broad client management RPC cleanup, Settings self-profile RPC cleanup, permission-only route authority, and initial backend legacy role-surface containment. The default company foundation exists additively, core operational data preserves company context server-side, company memberships and normalized company role assignments exist for authorization, active company context is membership-validated, orders are the first backend-enforced company read-isolated operational root, order-derived calendar/activity/notification read bypasses respect readable source orders, clients are now company-owned operational records for read isolation, table-write authorization, and mutation RPC authorization, linked order intake client/AMC attachments are backend-enforced, stale uuid-based order RPC/import paths are quarantined, order table writes now use company-aware insert/update/delete policies, `rpc_transition_order_status(uuid, text, text)` is company-aware, legacy arbitrary workflow/status RPCs are quarantined, assignment/date mutation paths have current-company guardrails, `activity_log` table reads/inserts plus both active `rpc_log_event` overloads are company/order-aware, notification table/RPC access is current-user plus readable-source-order safe, unsafe legacy exposed views are no longer selectable by app roles, broad `PUBLIC`/`anon`/`authenticated` object grants are removed, `anon` has no table/view/sequence/function access, `authenticated` is explicit allowlist only, static company/relationship type plus directional company relationship tables exist, relationship lifecycle operations are exposed through guarded RPCs without granting operational visibility, explicit `order_company_assignments` packets now provide assignment-scoped cross-company work access, assignment activity, and assignment dashboard attention surfaces without granting canonical order/client visibility, company member invites now stage invited memberships/inactive role assignments until authenticated acceptance, assignment-facing appraiser/reviewer picker surfaces now use `rpc_company_assignable_users`, active order-form client/AMC intake now uses narrow RPC projections and creation, active broad client management reads/create/update paths now use guarded client-management RPCs, Settings profile color load/save uses current-user settings RPCs, route authority now uses permission props rather than legacy role gates, legacy role RPCs are revoked from `anon`/`authenticated`, direct app-role `public.user_roles` reads are revoked, and `order_activity`/`review_flow` RLS no longer use legacy role-string admin checks.

### Goal

Add company/tenant foundation without breaking the current single-company app.

### Why It Matters

Falcon should become sellable to other appraisal firms. Company scoping must be introduced before normalized roles, setup UX, company settings, or SaaS account switching.

### Files / Areas Likely Affected

Database:

- `public.companies` exists with a seeded `falcon_default` company.
- Nullable `company_id` now exists on `orders`, `clients`, `notifications`, and `activity_log`.
- Current company FKs are `NOT VALID` compatibility constraints.
- `public.default_company_id()` exists for current default-company compatibility.
- Order inserts receive default company scope when missing.
- Order updates preserve existing company ownership.
- Order read projections expose `company_id`.
- Order-generated activity and assignment notifications inherit order company context.
- Client inserts resolve company scope server-side through `current_company_id()`; frontend-sent `company_id` is ignored.
- Client updates preserve existing company ownership.
- Client table writes require company-aware backend authorization through create, update, and delete helpers.
- Legacy client mutation RPCs preserve their signatures as compatibility wrappers and enforce those same create, update, and delete helpers.
- `merge_clients` is current-company and permission hardened, reassigning only current-company linked orders and child clients.
- Client metric projections expose `company_id`, aggregate by company and client, and require readable client/order predicates.
- Client duplicate checks are scoped to `current_company_id()` and readable-client logic.
- Client merge is current-company and permission hardened, blocks cross-company drift and already-merged source/target clients, and only reassigns current-company linked orders/child clients.
- Company type foundation exists through `company_types`, `companies.company_type`, and `companies.operating_mode_settings`; existing companies are backfilled/defaulted to `staff_shop`.
- Relationship type foundation exists through `company_relationship_types`.
- `company_relationships` exists with directional source/target company semantics, lifecycle status, compliance/settings metadata, audit columns, timestamps, constraints, and indexes.
- Relationship records alone grant no operational visibility. Future cross-company visibility must be assignment-backed.
- New relationship foundation tables have RLS enabled and are service-role-only for now; no app-role grants or onboarding/relationship RPCs exist yet.
- Relationship lifecycle permissions are seeded.
- Relationship lifecycle helper predicates exist for read, invite, approve, suspend, archive, and compliance authority.
- Relationship lifecycle RPCs exist for list, detail, invite, accept, decline, suspend, reactivate, and archive.
- Direct relationship table access remains blocked for app roles; access is RPC-only.
- Relationship source company, target company, and relationship type are immutable.
- Relationship status transition rules are trigger-enforced.
- `order_company_assignments` exists as the explicit cross-company work grant record; relationship existence alone still grants no order/client visibility.
- Assignment lifecycle RPCs offer, accept, decline, start, submit, complete, cancel, and revoke assignments without writing assigned vendors into owner-company core order assignment columns.
- Assignment work/offer/owner packet RPCs expose assignment-native packets rather than canonical order views.
- Assignment activity and notifications are assignment-scoped; assignment notifications deep-link to `/assignments/:assignmentId`.
- Assigned-company frontend surfaces use assignment RPCs only and do not reuse canonical order detail/table/drawer/activity UI.
- Owner-side Offer Assignment starts from `OrderDetail`, lists only active outgoing relationships through RPC, derives assignment type from relationship type, and submits curated handoff payloads only.
- Notification creation derives company scope server-side from the source order when available.
- Notification table SELECT uses canonical `current_app_user_id()` identity, and direct authenticated notification INSERT/UPDATE/DELETE are blocked.
- Authenticated `rpc_notification_create(jsonb)` requires current-company membership plus readable/updateable source order for order-tied notifications, and recipients must be active members of the source order's company.
- Authenticated non-order notification creation is blocked; service-role non-order creation remains available for controlled system/operator paths.
- Notification mark/read/dismiss RPCs only affect current-user notifications that are personal or tied to readable source orders.
- Activity logging derives company scope server-side from the source order when available.
- Activity log table reads and inserts now require readable/updateable current-company source orders when accessed through authenticated app roles.
- Calendar projection events derive company scope server-side from the source order when available.
- Notification reads remain user-scoped, and order-tied notification reads/counts now require readable source orders.
- Activity reads remain order-scoped, and order-derived activity feed/compatibility reads now require readable source orders.
- Direct authenticated `activity_log` table reads/inserts are company/order-aware, broad `USING true` / `WITH CHECK true` policies were removed, `order_id is null` activity is blocked by default for authenticated app roles, and update/delete remain blocked.
- Calendar order-derived reads now require readable source orders; `calendar_events` table policy tightening remains deferred.
- `public.company_memberships` exists as the additive identity-to-company membership layer.
- `public.user_role_assignments` exists as the additive company-scoped role assignment layer.
- Existing users are seeded into `falcon_default` as active primary memberships.
- Company membership helper functions exist for future authorization and org switching.
- Existing legacy role rows are backfilled into `falcon_default` role assignments where they resolve to canonical app users and template roles.
- Company-aware permission resolver successors exist in parallel with current compatibility helpers.
- Order read helper predicates enforce current-company membership, company match, and existing lifecycle/responsibility visibility.
- Order-derived calendar, activity, and notification read paths route through the order read boundary.
- Client read helper predicates enforce current-company membership, client company match, and `clients.read.all` or `clients.read.assigned` through readable source orders.
- New company/settings migrations later.
- Backfill scripts.
- RLS policies later.

App:

- Default frontend policy modules exist for current workflow, queue, calendar, and notification defaults.
- `/accept-invite/:invitationId` exists as a public invite acceptance route that handles auth internally.
- Login honors safe relative `returnTo` paths so signed-out invite recipients can return to the accept route after authentication.
- The invite acceptance page calls `rpc_company_member_invite_accept` only after auth, refreshes the session after acceptance, calls `set-active-company` only when the accepted company is not the active context, refreshes again after a successful switch, and routes to `/dashboard`.
- Team Access invitation management on the Users page lists pending/past/all invitations through safe RPCs, sends new invites through `invite-company-member`, cancels through `rpc_company_member_invitation_cancel`, and resends through `resend-company-member-invite`.
- Assignment appraiser/reviewer pickers, the Orders appraiser filter, and `AppraiserSelect` use `rpc_company_assignable_users` through the company-members wrapper instead of legacy `listAssignableUsers`, `profiles.role`, or `user_roles` fallback reads.
- Legacy singular `userService.listAppraisers` assignable-user compatibility was removed after import scans confirmed it was dead.
- Active client management reads and create/update paths use guarded client-management RPC wrappers. Dormant legacy client components and `useClients` were removed. `clientsService` is limited to `listClientOrders` for ClientProfile order history and `isClientNameAvailable` for active ClientForm duplicate checks. Settings still uses `setUserColor` through `usersService`.
- Company context provider later.
- Setup/checklist later.
- Settings screens later.

### Database Changes

Added:

```txt
companies
company_memberships
user_role_assignments
orders.company_id
clients.company_id
notifications.company_id
activity_log.company_id
calendar_events.company_id
```

Still pending:

```txt
company_settings
```

Add company context to:

- `notification_preferences` if preferences become company-specific
- order numbering tables

Backfill a single default company.

Completed Slice 1 backfill:

- Existing orders and clients are backfilled to `falcon_default`.
- Existing notifications are backfilled from related orders where possible, then defaulted to `falcon_default`.
- Existing activity rows are backfilled from related orders where possible, then defaulted to `falcon_default`.
- No `NOT NULL` enforcement, FK validation, RLS change, frontend filtering, org switching, workflow change, or order-number uniqueness change was added.

Completed Slice 2 backend hardening:

- `v_orders_frontend_v4`, `v_orders_active_frontend_v4`, `v_orders_list`, and `v_orders_list_with_last_activity` are company-aware projections.
- `v_orders_list_with_last_activity` now joins last activity through `order_id` consistently.
- Order-generated `activity_log` rows inherit `orders.company_id`.
- Assignment notifications generated from order writes inherit `orders.company_id`.
- No tenant enforcement, org switching, frontend filters, numbering changes, workflow semantic changes, membership logic, or RLS hardening was added.

Completed Slice 3 client hardening:

- Client inserts initially defaulted missing `company_id` to `falcon_default`; Slice 7E1 later tightened inserts to resolve company scope through `current_company_id()` and ignore frontend-sent `company_id`.
- Client updates preserve existing company ownership.
- `v_client_kpis` and `v_client_metrics` are company-aware projections that preserve frontend-compatible names and filter through readable-client/readable-order predicates.
- `client_name_taken` checks duplicates through `current_company_id()` and readable-client logic.
- `merge_clients` rejects cross-company merges and updates only same-company order/client references.
- The migration reports mismatch counts for `orders.client_id`, `orders.amc_id`, and `orders.managing_amc_id`.
- The same-company order/client guard is deferred until those mismatch results are reviewed.
- No RLS, org switching, frontend filters, numbering changes, workflow semantic changes, `NOT NULL` enforcement, FK validation, or membership logic was added.

Completed Slice 4 notification/activity write hardening:

- Existing null notification company values are backfilled from related orders before falling back to `falcon_default`.
- Existing null activity company values are backfilled from related orders before falling back to `falcon_default`.
- `rpc_notification_create` derives `notifications.company_id` from `patch.order_id -> orders.company_id` and does not trust frontend-provided company context.
- Both active `rpc_log_event` overloads derive `activity_log.company_id` from `p_order_id -> orders.company_id`.
- `rpc_log_note` continues to inherit company behavior through its existing `rpc_log_event` delegation.
- Notification read filters remain user-scoped, and activity read filters remain order-scoped until active-company membership exists.
- No RLS, org switching, frontend filters, notification doctrine, activity doctrine, or membership logic was added.

Completed Slice 5 calendar projection hardening:

- `calendar_events.company_id` is added additively when `public.calendar_events` exists.
- Existing stored calendar events are backfilled from linked orders before falling back to `falcon_default`.
- `v_admin_calendar` and `v_admin_calendar_enriched` expose `company_id` while preserving frontend-compatible columns.
- `rpc_create_calendar_event` derives company scope server-side from `p_order_id -> orders.company_id`.
- Order-derived scheduling remains canonical; stored calendar events remain a projection/compatibility layer.
- `get_calendar_events` remained deferred during Slice 5 and was later patched in Slice 7C for order-derived read safety.
- No RLS, org switching, frontend filters, queue changes, workflow semantic changes, `NOT NULL` enforcement, FK validation, or tenant filtering was added.

Completed Slice 6A membership foundation:

- `company_memberships` exists with `company_id`, `user_id`, membership status/type, primary marker, invitation metadata, and timestamps.
- Existing `public.users` rows are backfilled to active primary `falcon_default` memberships.
- Membership FKs to `public.companies` and `public.users` are additive `NOT VALID` constraints.
- Slice 6A initially made `current_company_id()` return `falcon_default`; Slice 7A later upgrades it to use membership-validated active-company claims with default-company fallback.
- `current_app_user_company_ids()` and `current_app_user_has_company(company_id)` expose membership context for future authorization work.
- Existing permission helpers, RLS policies, role strings, route guards, role assignment RPCs, and frontend behavior remain unchanged.
- Company-aware RLS enforcement, org switching, and role-management RPC migration remain deferred.

Completed Slice 6B normalized role assignment foundation:

- `user_role_assignments` exists with `company_id`, `user_id`, `role_id`, assignment status, primary marker, assignment metadata, expiration support, and timestamps.
- Role-assignment FKs to `public.companies`, `public.users`, and `public.roles` are additive `NOT VALID` constraints.
- Existing legacy `public.user_roles` rows are seeded into `falcon_default` assignments where the legacy user ID resolves to `public.users.id` or `public.users.auth_id` and the role maps to a template role.
- `current_app_user_permission_keys_for_company(company_id)` resolves active company-scoped role assignment permissions and preserves owner semantics.
- `current_app_user_has_permission_for_company(company_id, permission_key)`, `current_app_user_has_any_permission_for_company(company_id, permission_keys)`, and `current_app_user_has_all_permissions_for_company(company_id, permission_keys)` exist as additive successors.
- Default-company compatibility fallback to legacy text roles remains inside the successor resolver while active authorization is migrated later.
- Existing RLS policies, route guards, frontend permission hooks, legacy role RPCs, `profiles.role`, and workflow behavior remain unchanged.
- Frontend hook migration, role admin RPC migration, org switching, and RLS enforcement remain deferred.

Completed Slice 6C permission helper wrapper migration:

- Permission parity passed before edits against the replay-safe local baseline.
- Legacy helper outputs matched company-aware successor helper outputs for `public.current_company_id()`.
- Owner semantics remained equivalent, and legacy role mappings resolved into default-company role assignments where applicable.
- `20260518010000_company_permission_helper_wrappers.sql` wraps these active helpers through company-aware resolution:
  - `current_app_user_permission_keys()` -> `current_app_user_permission_keys_for_company(current_company_id())`
  - `current_app_user_has_permission(text)` -> `current_app_user_has_permission_for_company(current_company_id(), permission_key)`
  - `current_app_user_has_any_permission(text[])` -> `current_app_user_has_any_permission_for_company(current_company_id(), permission_keys)`
  - `current_app_user_has_all_permissions(text[])` -> `current_app_user_has_all_permissions_for_company(current_company_id(), permission_keys)`
- `current_is_admin()` and `current_is_appraiser()` remain legacy compatibility helpers.
- Slice 6C did not change RLS, frontend hooks, `ProtectedRoute`, organization switching, role/responsibility helpers, or workflow semantics.
- Local `supabase db reset` passed after the wrapper migration.
- Generated Supabase TypeScript types were refreshed from the replayed local database.

Completed Slice 7A active-company context contract:

- `current_company_id()` now resolves an active-company JWT/app metadata claim when present and membership-valid.
- Missing, invalid, or non-member active-company claims fall back to `falcon_default` through `default_company_id()` while compatibility mode remains active.
- `current_app_user_has_current_company()` exposes whether the current app user has active membership in the resolved company.
- `rpc_current_company_context()` provides diagnostic visibility into auth user id, app user id, active-company claim id, resolved company id, membership state, permission count, and current-company role assignments.
- No tenant isolation was enforced.
- Existing RLS policies, security-definer RPC behavior, frontend flows, org switching, workflow semantics, Smart Actions, queues, calendar behavior, activity behavior, and notification behavior remain unchanged.
- Future enforcement must clean up permissive RLS policies and add active-company filters to security-definer RPCs before tenant isolation is treated as complete.
- Local `supabase db reset`, default-company parity checks, active-company claim checks, lint, build, and `git diff --check` passed after Slice 7A.

Completed Slice 7B order read isolation:

- Orders are now the first backend-enforced company read-isolated operational root.
- `current_app_user_can_read_order_row(...)` is the reusable row predicate for order reads.
- `current_app_user_can_read_order(uuid)` resolves order-by-id reads through the row predicate.
- `can_read_order(uuid)` now delegates to `current_app_user_can_read_order(uuid)` as a compatibility wrapper.
- Old order SELECT policies and the global admin `orders_owner_admin_full_access` ALL read bypass were removed.
- `orders_select_company_lifecycle_visibility` now requires current-company membership, order company match, and existing lifecycle/responsibility visibility.
- `v_orders_frontend_v4`, `v_orders_active_frontend_v4`, `v_orders_list`, and `v_orders_list_with_last_activity` were recreated with `security_invoker = true` and explicit order read predicates.
- `rpc_get_activity_feed(uuid)` and `rpc_list_orders(...)` now enforce order-derived read safety.
- Slice 7B did not change writes, workflow transitions, frontend code, organization switching, Smart Actions, client policies, calendar policies, notification policies, or user policies.
- Validation passed with clean `supabase db reset`, policy/view catalog checks, default-company compatibility parity checks, cross-company negative tests, regenerated Supabase types, lint, build, and `git diff --check`.

Completed Slice 7C order-derived read safety:

- Order-derived calendar reads now require a readable source order.
- `v_admin_calendar` and `v_admin_calendar_enriched` were recreated with explicit `order_id is null or current_app_user_can_read_order(order_id)` predicates.
- `get_calendar_events(timestamptz, timestamptz)`, `get_calendar_events()`, and `get_admin_calendar_events(...)` were patched to avoid `SECURITY DEFINER` order-read bypasses.
- Order-derived activity reads now require a readable source order.
- `get_order_activity_flexible(uuid)`, `get_order_activity_flexible_v3(uuid)`, `v_order_activity_feed`, and `v_order_activity_compat` now derive authorization from `current_app_user_can_read_order(...)`.
- Order-tied notifications are hidden and excluded from unread counts when their source order is unreadable.
- `rpc_get_notifications`, `rpc_get_unread_count`, `rpc_notifications_list`, and `rpc_notifications_unread_count` now preserve notification UX while filtering unreadable order-tied rows.
- Slice 7C did not change writes, workflow transitions, frontend code, organization switching, client policies, user/team policies, Smart Actions, or `calendar_events` table policies.
- Validation passed with clean `supabase db reset`, catalog checks, default-company parity, cross-company negative tests, notification unread-count checks, calendar visibility checks, activity visibility checks, regenerated Supabase types, lint, build, and `git diff --check`.

Completed Slice 7D client read isolation:

- Clients are now company-owned operational records for read isolation.
- `current_app_user_can_read_client_row(uuid, bigint)` was added as the reusable client read predicate.
- Broad client SELECT/read bypasses were removed and replaced with one company-aware SELECT policy.
- Legacy client `ALL` policies were converted into command-specific write policies so writes no longer imply SELECT bypass.
- `v_client_kpis`, `v_client_metrics`, and `v_client_kpis_appraiser` were recreated with `security_invoker = true` and explicit readable-client/readable-order predicates.
- `get_clients_for_user()` and `client_name_taken(text, bigint)` were patched for current-company readable-client behavior.
- Slice 7D did not change client write behavior, `merge_clients`, order intake, frontend code, contacts/AMC/lender hierarchy behavior, workflow semantics, or Smart Actions.
- Validation passed with clean `supabase db reset`, catalog checks, default-company parity, assigned-client appraiser visibility checks, cross-company negative tests, client search/autocomplete visibility coverage through direct client reads and client views, `client_name_taken` checks, `get_clients_for_user` explicit-shape checks, regenerated Supabase types, lint, build, and `git diff --check`.
- Caveat: `clients.name` still has global uniqueness; company-scoped duplicate/canonicalization strategy remains deferred.

Completed Slice 7E1 client table write authorization:

- Client table writes now require company-aware backend authorization.
- `current_app_user_can_create_client()` gates inserts through current-company membership and `clients.create`.
- `current_app_user_can_update_client_row(uuid, bigint)` gates updates through current-company membership, client company match, and `clients.update.all` or assigned-client visibility through a readable source order.
- `current_app_user_can_delete_client_row(uuid, bigint)` gates hard deletes through current-company membership, client company match, and `clients.delete`.
- `tg_clients_preserve_company_id()` resolves inserts to `current_company_id()` and preserves existing `company_id` on updates; frontend-sent `company_id` is ignored.
- Broad/global client write policies were removed and replaced with `clients_insert_company_authorized`, `clients_update_company_authorized`, and `clients_delete_company_authorized`.
- Direct frontend writes and inline New Order client creation remain compatible for authorized users.
- Hard delete remains current behavior but now requires `clients.delete`.
- Slice 7E1 did not change uniqueness, `merge_clients`, order intake RPCs, frontend code, workflow semantics, or Smart Actions.
- Validation passed with clean `supabase db reset`, catalog checks, admin/appraiser/no-role write tests, cross-company mutation tests, spoofed `company_id` tests, direct write and inline intake compatibility checks, regenerated Supabase types, lint, build, and `git diff --check`.

Completed Slice 7E2 client mutation RPC and merge hardening:

- `merge_clients(bigint, bigint, jsonb)` now requires current-company membership, readable source and target clients, `clients.update.all`, and `clients.archive`.
- `merge_clients` blocks cross-company source/target merges, cross-company linked order or child-client drift, and already-merged source or target clients.
- Merge reassignment is limited to current-company linked `orders.client_id`, `orders.managing_amc_id`, and child `clients.amc_id` rows.
- Legacy client mutation RPC signatures were preserved as compatibility wrappers:
  - `rpc_client_create(jsonb)`
  - `rpc_client_update(text, jsonb)`
  - `rpc_client_delete(text)`
  - `rpc_create_client(jsonb)`
  - `rpc_update_client(bigint, jsonb)`
  - `rpc_delete_client(bigint)`
- Legacy create/update/delete RPC wrappers now enforce the Slice 7E1 helper predicates.
- `PUBLIC` and `anon` execute privileges were revoked for the seven client mutation RPCs; `authenticated` and `service_role` grants remain.
- Slice 7E2 did not change frontend code, uniqueness or indexes, order-write RPCs, workflow semantics, or Smart Actions.
- Validation passed with clean `supabase db reset`, catalog checks for definitions/grants/comments, anon/no-role/appraiser negative checks, owner/admin-style mutation checks, spoofed company checks, cross-company update/delete/merge negatives, merge drift and already-merged guards, direct frontend write compatibility, inline New Order client creation compatibility, regenerated Supabase types, lint, build, and `git diff --check`.

Completed Slice 7E3A order intake attachment authorization:

- Order intake company/client/AMC attachment contract is backend-enforced for direct table writes and bigint-compatible order RPCs.
- `current_app_user_can_create_order()` gates order creation through current-company membership and `orders.create`.
- `current_app_user_can_update_order_row(uuid, uuid, uuid, uuid, text)` gates compatible order update RPCs through current-company membership, company match, and `orders.update.all` or assigned-order responsibility.
- `current_app_user_can_attach_order_client(bigint)` requires linked `client_id` rows to be readable, same-company, and non-merged.
- `current_app_user_can_attach_order_amc(bigint)` requires linked `managing_amc_id` rows to be readable, same-company, non-merged, and `category = 'amc'`.
- `tg_orders_preserve_company_id()` resolves inserts to `current_company_id()`, preserves `OLD.company_id` on updates, and ignores frontend-sent `company_id`.
- `tg_orders_validate_company_client_attachments()` enforces linked client and managing AMC attachment safety for direct `orders` table writes.
- Manual-only orders remain allowed when `client_id` is null.
- Bigint-compatible order RPCs were patched: `rpc_create_order(jsonb)`, `rpc_update_order(uuid, jsonb)`, and `rpc_order_update(uuid, jsonb)`.
- Legacy uuid order RPCs and `import_orders_from_json` remain deferred.
- Slice 7E3A did not change frontend code, workflow semantics, Smart Actions, uniqueness behavior, `orders.amc_id`, or import behavior.
- Validation passed with clean `supabase db reset`, same-company attach success, cross-company attach failure, spoofed `company_id` protection, manual-only order success, merged-client rejection, same-company AMC attach success, cross-company/non-AMC attach failure, inline order creation compatibility, patched RPC same-company/cross-company tests, role validation, regenerated Supabase types, lint, build, and `git diff --check`.

Completed Slice 7E3B legacy order RPC/import quarantine:

- Legacy uuid-based order RPCs are quarantined:
  - `rpc_order_create(jsonb)`
  - `rpc_order_update(text, jsonb)`
- Both legacy RPC signatures are preserved but now raise clear deprecated/quarantined exceptions.
- `import_orders_from_json(jsonb)` is service-role-only and marked deprecated/unsafe for multi-company imports.
- `PUBLIC`, `anon`, and `authenticated` execute privileges were revoked from all three legacy paths.
- Active bigint-compatible order RPCs remain working:
  - `rpc_create_order(jsonb)`
  - `rpc_update_order(uuid, jsonb)`
  - `rpc_order_update(uuid, jsonb)`
- Direct order create/update remains working.
- Slice 7E3B did not change frontend code, workflow semantics, uniqueness behavior, order intake UI, `managing_amc_id`, `orders.amc_id`, or active bigint-compatible intake behavior.
- Validation passed with clean `supabase db reset`, catalog grant/comment checks, anon/authenticated execution denial, service-role importer compatibility, deprecated exception checks, active bigint-compatible RPC checks, direct order create/update checks, lint, build, and `git diff --check`.

Completed Slice 7F1 order write policy cleanup:

- Legacy order insert/update/delete policies were removed:
  - `allow_admin_update_orders`
  - `orders_appraiser_update_own`
  - `orders_delete_admin`
  - `orders_insert_admin`
  - `orders_update_admin`
  - `orders_update_lifecycle_visibility`
  - `orders_update_my_assigned`
- New company-aware order write policies are active:
  - `orders_insert_company_authorized`
  - `orders_update_company_authorized`
  - `orders_delete_company_authorized`
- Order inserts now use `current_app_user_can_create_order()`.
- Order updates now use `current_app_user_can_update_order_row(uuid, uuid, uuid, uuid, text)`.
- Existing trigger-owned order `company_id` behavior is preserved: inserts resolve through `current_company_id()`, updates preserve existing company ownership, and frontend-sent `company_id` remains ignored.
- Direct frontend order writes remain compatible for authorized users.
- Workflow/status/date/assignment RPCs were intentionally unchanged.
- Smart Actions, lifecycle semantics, notification behavior, activity behavior, and frontend code were unchanged.
- Validation passed with clean `supabase db reset`, policy catalog checks, same-company admin/owner direct write checks, cross-company mutation blocking, appraiser/reviewer update compatibility checks, no-role negative checks, spoofed `company_id` checks, direct order update/archive/delete parity checks, regenerated Supabase types, lint, build, and `git diff --check`.

Completed Slice 7F2 canonical workflow transition RPC hardening:

- `rpc_transition_order_status(uuid, text, text)` now requires current-company membership before transition.
- The target order must match `current_company_id()`.
- The target order must be readable through `current_app_user_can_read_order(uuid)`.
- The target order must be updateable through `current_app_user_can_update_order_row(uuid, uuid, uuid, uuid, text)`.
- Existing transition validation logic, required workflow permission checks, Smart Actions semantics, lifecycle governance doctrine, and trigger-driven status activity behavior are preserved.
- Legacy workflow/status/date/assignment RPCs remain unchanged and deferred.
- Frontend code, Smart Actions UI, notification generation, and activity generation were unchanged.
- Validation passed with clean `supabase db reset`, same-company appraiser/reviewer/admin transition checks, cross-company transition rejection, stale company claim rejection, no-role rejection, status activity side-effect checks, regenerated Supabase types, lint, build, and `git diff --check`.

Completed Slice 7F3 legacy workflow/status RPC quarantine:

- Legacy arbitrary workflow/status RPC signatures are preserved but now raise explicit deprecated/quarantined exceptions:
  - `rpc_update_order_status(uuid, text)`
  - `rpc_update_order_status_with_note(uuid, text, text)`
  - `rpc_order_set_status(text, text)`
  - `rpc_order_set_status(uuid, text, text)`
  - `rpc_order_mark_complete(text, text)`
  - `rpc_order_ready_to_send(text)`
  - `rpc_order_send_to_client(text, jsonb)`
  - `rpc_review_approve(text, text)`
  - `rpc_review_request_revisions(text, text)`
  - `rpc_review_start(text)`
  - `rpc_update_order_v1(uuid, text, uuid, timestamptz, timestamptz, timestamptz, jsonb)`
  - `set_order_status(uuid, text)`
- `PUBLIC`, `anon`, and `authenticated` execute privileges were revoked from the quarantined RPCs.
- `service_role` remains granted, but bodies still raise deprecated exceptions to prevent accidental lifecycle mutation.
- `rpc_transition_order_status(uuid, text, text)` remains the only lifecycle authority.
- Assignment/date RPCs, frontend code, Smart Actions UI, canonical transition semantics, notification generation, and activity generation were unchanged.
- Validation passed with clean `supabase db reset`, catalog grant/comment checks, anon/authenticated execution denial, service-role deprecated exception checks, canonical same-company transition success, cross-company/no-role transition rejection, canonical status/activity side-effect checks, regenerated Supabase types, lint, build, and `git diff --check`.

Completed Slice 7F4A assignment/date mutation guardrails:

- Assignment target helpers were added:
  - `app_user_has_company_role(uuid, uuid, text[])`
  - `current_app_user_can_assign_order_target(uuid, uuid, text)`
- Trigger-level assignment validation now protects direct writes to `orders.appraiser_id`, `orders.assigned_to`, `orders.reviewer_id`, and `orders.current_reviewer_id`.
- Assignment target users must belong to the current company and have the appropriate appraiser/reviewer role capability where practical.
- Guarded assignment/date RPCs were patched:
  - `rpc_assign_order(uuid, uuid, text)`
  - `rpc_update_due_dates(uuid, date, date)`
  - `rpc_update_order_dates(uuid, timestamptz, timestamptz, timestamptz)`
- Stale assignment/date RPCs were quarantined:
  - `rpc_assign_order(uuid, uuid)`
  - `rpc_assign_reviewer(uuid, uuid)`
  - `rpc_assign_next_reviewer(uuid)`
  - both `rpc_order_set_dates(...)` overloads
  - `rpc_order_update_dates(text, ...)`
  - `set_order_appointment(uuid, timestamptz, text)`
- Date mutations require readable/updateable current-company orders.
- Direct table update compatibility, Smart Actions, queue/calendar projections, frontend behavior, and existing assignment/date activity side effects were preserved.
- `current_reviewer_id` model cleanup, review-route redesign, and `calendar_events` table policy cleanup remain deferred.
- Validation passed with clean `supabase db reset`, catalog grant/comment checks, same-company assignment success, cross-company and wrong-role assignment rejection, same-company date update success, unreadable-order mutation rejection, quarantined RPC exception checks, calendar/order projection date parity, assignment/date activity side-effect parity, regenerated Supabase types, lint, build, and `git diff --check`.

Completed Slice 7G1 activity log table/RPC hardening:

- `activity_log` table reads are company/order-aware and require readable source orders for authenticated app access.
- `activity_log` table inserts require non-null source orders plus readable/updateable current-company authorization.
- Broad `USING true` and `WITH CHECK true` activity policies were removed.
- Authenticated access to `order_id is null` activity is blocked by default.
- `activity_log` update/delete remain blocked for authenticated users.
- Both active `rpc_log_event` overloads now require current-company membership, readable source order, updateable source order, and order company matching `current_company_id()`:
  - `rpc_log_event(uuid, text, text, jsonb)`
  - `rpc_log_event(uuid, text, jsonb)`
- Activity side effects, Smart Actions activity, assignment/date activity behavior, and frontend activity feed shapes were preserved.
- Notifications table policies, users/team directory, `calendar_events` table policies, workflow semantics, frontend code, and org switching were unchanged.
- Validation passed with clean reset, activity policy catalog checks, same-company/cross-company/no-role activity visibility checks, direct insert and RPC positive/negative checks, assignment/date side-effect checks, regenerated Supabase types, lint, build, `git diff --check`, and final clean `supabase db reset`.

Completed Slice 7G2A notification table policy/RPC hardening:

- Notification table SELECT now uses canonical `current_app_user_id()` identity through `current_app_user_can_access_notification_row(uuid, uuid)`.
- Direct authenticated notification INSERT, UPDATE, and DELETE are blocked.
- `rpc_notification_create(jsonb)` requires current-company membership and a readable/updateable source order for authenticated order-tied notifications.
- Order-tied notification recipients must be active members of the source company.
- Authenticated non-order notification creation is blocked.
- Service-role non-order notification creation is preserved for controlled system/operator paths.
- Read, mark-read, mark-all-read, dismiss, and dismiss-seen RPCs only affect current-user notifications that are personal or tied to readable source orders.
- Legacy manual/debug notification RPCs are quarantined with app-role execute revoked and deprecated exceptions:
  - `rpc_notify_admins(text, text, text)`
  - `rpc_notify_user(uuid, text, text, text)`
  - `notify_admins(text, text, text)`
  - `notify_safe(uuid, text, text, text)`
  - `rpc_debug_notifications_access()`
- Notification bell/read-count compatibility, actor suppression behavior, and current frontend service shapes were preserved.
- Notification preference table/RPC changes, company-specific notification preferences, and productized manual/system notification paths remain deferred.
- Validation passed with clean reset, catalog policy/grant/comment checks, same-company order-tied notification creation, cross-company/unreadable-order and outside-recipient rejection, authenticated non-order creation rejection, service-role non-order creation, hidden cross-company mark/dismiss rejection, bell/read-count RPC compatibility checks, regenerated Supabase types, lint, build, `git diff --check`, and final clean `supabase db reset`.

Completed Slice 7H1 legacy exposed view/grant quarantine:

- `anon` and `authenticated` SELECT was revoked from 17 unsafe legacy views: `v_orders_unified`, `v_orders_frontend`, `v_orders_list_v2`, `v_orders_list_with_last_activity_v2`, `v_orders_unified_list`, `v_orders_dashboard_active`, `v_admin_dashboard_counts`, `v_calendar_events`, `v_calendar_unified`, `v_admin_calendar_v2`, `v_calendar_events_admin`, `v_calendar_events_appraiser`, `v_amcs`, `profiles`, `v_email_queue`, `v_staging_raw_orders_2025_ord`, and `v_user_notification_prefs`.
- Canonical hardened views remain accessible: `v_orders_frontend_v4`, `v_orders_active_frontend_v4`, `v_orders_list`, `v_orders_list_with_last_activity`, `v_admin_calendar`, `v_admin_calendar_enriched`, `v_client_kpis`, `v_client_metrics`, and `v_client_kpis_appraiser`.
- `v_order_activity_feed` and `v_order_activity_compat` now hide `order_id is null` rows and require readable source orders.
- Quarantine/future explicit-grants cleanup comments were added.
- No objects were moved, renamed, or removed.
- Active frontend smoke checks for orders, dashboard, calendar, clients, notifications, and activity passed.
- Validation passed with clean reset, catalog checks, regenerated Supabase types, lint, build, and `git diff --check`.

Completed Slice 7H2A explicit authenticated grants:

- Broad `PUBLIC`, `anon`, and `authenticated` table/view, sequence, and function privileges were revoked.
- Broad baseline `GRANT ... ON ALL` app-role exposure is no longer the active app access model.
- `anon` has no table, view, sequence, or function access in `public`.
- `authenticated` access is explicit allowlist only.
- Canonical hardened views, current direct-table compatibility surfaces, and active hardened RPC/helper functions remain granted.
- Quarantined workflow/status RPCs, legacy uuid order RPCs, importers, debug/manual notification helpers, and email queue worker paths remain inaccessible to app roles.
- `service_role` broad access is intentionally preserved for operator/backfill compatibility pending later operator-path cleanup.
- Current object grants validate cleanly.
- `supabase_admin` future-object default ACL cleanup remains a manual/platform-role follow-up because local migration replay cannot alter that platform role.
- Validation passed with clean reset, catalog grant/default-ACL checks, canonical surface accessibility checks, quarantined/import/debug path denial checks, regenerated Supabase types, lint, build, and `git diff --check`.

Completed Phase 8B1/8B2 relationship foundation:

- Company type foundation exists through `company_types`, with seeded `staff_shop`, `amc`, `vendor`, `hybrid`, `review_firm`, and `enterprise` rows.
- `companies.company_type` and `companies.operating_mode_settings` exist, and existing companies are backfilled/defaulted to `staff_shop`.
- Relationship type foundation exists through `company_relationship_types`, with seeded `amc_vendor`, `staff_overflow_vendor`, `review_provider`, `enterprise_child`, `billing_managed`, and `support_managed` rows.
- `company_relationships` exists with directional `source_company_id` and `target_company_id` semantics, lifecycle status, compliance/settings JSON, audit user columns, timestamps, partial uniqueness, indexes, and doctrine comments.
- Relationship records alone grant no order, client, activity, notification, calendar, queue, workflow, or team visibility.
- Future cross-company visibility must be granted through explicit assignment records.
- New relationship foundation tables have RLS enabled and are service-role-only for now; no app-role grants were added.
- No order/client/workflow/onboarding/app behavior changed.
- Validation passed with clean reset, seed/catalog checks, `falcon_default` company type verification, RLS/grant checks, unchanged order/client policy checks, regenerated Supabase types, lint, build, and `git diff --check`.

Completed Phase 8B3 relationship lifecycle RPC foundation:

- Relationship lifecycle permissions are seeded: `relationships.read`, `relationships.invite`, `relationships.approve`, `relationships.suspend`, `relationships.archive`, `relationships.manage_compliance`, and `relationships.assign_work`.
- Helper predicates now gate relationship read, invite, approve, suspend, archive, and compliance authority.
- Direct app-role table access to `company_types`, `company_relationship_types`, and `company_relationships` remains blocked.
- Relationship lifecycle is RPC-only for app roles.
- Lifecycle RPCs control list/detail, invite, accept, decline, suspend, reactivate, and archive operations.
- `company_relationships.source_company_id`, `target_company_id`, and `relationship_type` are immutable.
- Status transition rules are enforced by trigger, including archived as terminal.
- Relationships and relationship lifecycle status still grant no order, client, activity, notification, calendar, queue, workflow, or team visibility.
- Assignment tables, vendor visibility, onboarding UI, workflow behavior, and order/client read-helper changes remain deferred.
- Validation passed with clean reset, permission seed checks, function/table grant checks, source invite success, target accept/decline success, source accept denial, unrelated company denial, status transition checks, duplicate current relationship blocking, unchanged order/client policy checks, regenerated Supabase types, lint, build, and `git diff --check`.

Completed Phase 8B4 assignment foundation and frontend packet UX:

- Phase 8B4A created `order_company_assignments` as the explicit assignment-backed cross-company work record.
- Phase 8B4B added lifecycle RPCs for offer, accept, decline, start, submit, complete, cancel, and revoke behavior.
- Phase 8B4D added assignment work packet RPCs so assigned-company users can operate from assignment-native packets.
- Phase 8B4E added assignment-scoped activity and notifications; assignment notifications route to `/assignments/:assignmentId` and do not use order detail deep links for assigned-company users.
- Phase 8B4G added the assigned offer packet RPC for offered assignments before acceptance.
- Phase 8B4H added assignment-native frontend routes, inbox/management surfaces, packet resolver, offer/work/owner packet views, lifecycle actions, timeline-lite, and navigation/command-palette entries gated by assignment permissions.
- Phase 8B4I hardened notification routing, command-palette visibility, payload allowlists, lifecycle confirmation UX, assignment states, and packet safety.
- Phase 8B4J added owner-side Offer Assignment UX from `OrderDetail` only, using active outgoing relationship list RPCs and `rpc_order_company_assignment_offer`.
- Phase 8B4K hardened modal accessibility, safe offer error copy, responsive order-detail action layout, success feedback, relationship picker copy, and curated handoff rendering.
- Relationship records and relationship lifecycle status still grant no order, client, activity, notification, calendar, queue, workflow, or team visibility.
- Assignment packet access is not canonical order access; assigned-company UI remains packet-only and does not call canonical order views, order detail, order drawers, unified order tables, or activity logs.
- Vendors are never written into owner-company `orders.appraiser_id`, `orders.assigned_to`, `orders.reviewer_id`, or `orders.current_reviewer_id` by assignment offer UX.
- Frontend validation passed with lint, build, `git diff --check`, and static scans for no direct assignment inserts, no direct assignment table reads, no direct orders/clients/relationship table reads in assignment feature code, no assigned-company `/orders` links, and positive allowlist payload rendering.

Completed Phase 8C1 Relationship Management UI:

- Phase 8C1A added `rpc_company_relationship_target_search(text, text, integer)` as a safe target-company discovery RPC for invite UX.
- The discovery RPC returns minimum company identity and invite eligibility fields only; it does not expose users, memberships, settings, orders, clients, metrics, billing, or operational data.
- Phase 8C1B added `/relationships` and `/relationships/:relationshipId` as RPC-only relationship management routes.
- Relationship list, detail, invite, target discovery, accept, decline, suspend, reactivate, and archive behavior use relationship RPCs only.
- Direct frontend reads from `companies`, `company_relationships`, and `company_relationship_types` remain blocked and unused.
- Relationship navigation, mobile navigation, command palette entries, invite, approve/decline, suspend/reactivate, and archive actions are permission-gated without legacy role fallback.
- Phase 8C1C hardened lifecycle confirmation UX, optional notes, per-action submitting state, safe lifecycle errors, direction/status callouts, focus handling, and target-picker accessibility.
- Static relationship type constants remain a temporary frontend vocabulary mirror of seeded backend relationship types until a productized relationship-type lookup surface exists.
- Relationship records and relationship lifecycle state still grant no order, client, assignment, activity, calendar, notification, queue, workflow, or team visibility.
- Validation passed with lint, build, `git diff --check`, and static scans for no direct company/relationship/order/client table reads and no order/client links in the relationship feature.

Completed Phase 8C2 owner-side OrderDetail assignment panel:

- Phase 8C2A added `rpc_order_company_assignment_list_for_order(uuid)` as the narrow owner-scoped, order-scoped assignment summary RPC for canonical order detail surfaces.
- The order-scoped RPC requires current-company membership, `order_company_assignments.read_owner`, owner-company order ownership, and `current_app_user_can_read_order(order_id)`.
- The RPC returns assignment lifecycle summary fields only and excludes payload JSONs, client/AMC data, fees, splits, internal notes, and owner assignment user columns.
- Phase 8C2B added the `Company Assignments` panel inside `OrderDetail`, mounted after the Client/Appraiser row and before Property/Dates.
- The panel is owner-only, permission-gated by `order_company_assignments.read_owner`, and calls only `listOwnerAssignmentsForOrder(orderId)` / `rpc_order_company_assignment_list_for_order`.
- The panel links rows to `/assignments/:assignmentId`; it does not link vendors or assigned-company users to `/orders/:orderId`.
- Phase 8C2C hardened the panel date label, packet link accessibility labels, no-canonical-order-access wording, and docs.
- Lifecycle actions are intentionally deferred from the `OrderDetail` panel; assignment lifecycle management remains on assignment packet surfaces.
- Assigned-company users gain no canonical order, client, owner workflow, or owner activity visibility from the panel.

Completed Phase 8C3 assignment activity timeline:

- Phase 8C3 added `rpc_order_company_assignment_activity(uuid)` as the assignment-scoped activity timeline read RPC.
- The RPC reads `order_company_assignment_activity` only and returns allowlisted event display fields.
- The RPC does not return `order_id`, raw payload JSON, actor user IDs, client/AMC/order activity fields, fees, splits, internal notes, or canonical order activity.
- Owner authorization preserves owner packet rules with `order_company_assignments.read_owner`, owner-company scope, assignment/order/relationship integrity, and `current_app_user_can_read_order(order_id)`.
- Assigned-company authorization preserves packet rules with `order_company_assignments.read_assigned`, assigned-company scope, active relationship status, and offered/work/completed assignment statuses without order read authorization.
- Owner, offer, and work packet pages now render `AssignmentActivityTimeline`, which calls only `listAssignmentActivity(assignmentId)` / `rpc_order_company_assignment_activity`.
- Timestamp-lite packet timelines were replaced on assignment packet pages; no `activity_log`, `rpc_get_activity_feed`, direct assignment activity table reads, canonical order activity exposure, broader order/client visibility, or assigned-company `/orders` links were added.
- Cancelled/revoked historical packet routing remains intentionally deferred.

Completed Phase 8C4 assignment-native dashboard surfaces:

- Phase 8C4 added pure frontend assignment dashboard metrics over assignment RPC rows only.
- `AssignedWorkDashboard` calls only `listAssignedAssignments`; `OwnerSentAssignmentsDashboard` calls only `listOwnerAssignments`.
- `AssignmentDashboardPage` renders assignment-native assigned-company and owner sent-assignment widgets without fetching assignment packets or activity until the user opens `/assignments/:assignmentId`.
- Assignment dashboard rows expose only safe fields: company name, assignment type, assignment status, due/review/expires dates, safe instruction preview, and Open Packet actions.
- Assignment dashboard links point only to `/assignments/:assignmentId`.
- `/dashboard` is now auth-only at the route wrapper level. `DashboardGate` routes order-capable and mixed users to the existing order dashboard, assignment-only users to `AssignmentDashboardPage`, and authenticated users without dashboard capability to a stable unavailable state instead of a same-route redirect loop.
- Phase 8C4 did not add backend/schema/RLS changes, order/client visibility, direct table reads, order dashboard widget imports, `UnifiedOrdersTable`, `useDashboardSummary`, `useDashboardKpis`, `rpc_list_orders`, `rpc_get_activity_feed`, calendar projection reuse, assigned-company `/orders` links, or mixed-user assignment widgets.

Completed Phase 8C5E3-E5 company member invitation lifecycle:

- Phase 8C5E3 added `public.company_member_invitations`, service-role-only invitation table access, `rpc_company_member_invite_prepare(...)`, `rpc_company_member_invite_finalize(...)`, and the `invite-company-member` Edge Function.
- Prepare is caller-scoped through the authenticated JWT and validates active current-company access, company active status, `users.invite`, `users.manage_company_access`, `roles.assign`, Owner grant permission when needed, preset role safety, active/inactive member conflicts, and pending duplicate invites.
- The Edge Function performs Supabase Auth Admin invite work with the service role only after prepare succeeds, stores non-authoritative invite metadata only, and finalizes through the service-role RPC.
- Finalize creates or links the app user, creates an invited membership, stages requested role assignments as inactive, marks the invitation `sent`, and writes audit without activating access, mutating `public.user_roles`, or relying on `public.users.role`.
- Phase 8C5E4 added `rpc_company_member_invite_accept(uuid, text)` for authenticated invite acceptance. It requires a `sent` invitation, matching invited auth/email identity, active company, valid staged membership, valid template/system role presets, and non-expired state.
- Acceptance activates the membership, activates only invitation-scoped role assignments, leaves unrelated assignments inactive/non-primary, marks the invitation `accepted`, writes `company.member_invite_accepted`, returns `session_refresh_required = true`, and does not update Auth app metadata or switch active company.
- Phase 8C5E5 added `/accept-invite/:invitationId`, a public frontend route that preserves logged-out return paths, calls the acceptance RPC only after auth, refreshes the session after acceptance, uses the existing `set-active-company` Edge Function only when the accepted company is not already active, refreshes again after a successful switch, and navigates to `/dashboard`.
- The frontend maps expired, wrong-account, inactive-company, stale-role, invalid/already-used, switch-failed, and generic errors to safe copy without preloading invitation/company details.
- Validation passed with clean reset, SQL invite prepare/finalize/accept fixture checks, grant/RLS catalog checks, frontend static leakage scans, lint, build, and `git diff --check`.
- Manual browser/Auth validation remains open for the real email link path: owner/admin sends invite, recipient opens while logged out, login returns to accept route, invite accepts, session refresh/switch works, dashboard loads for accepted company, wrong-user shows safe error, expired invite shows safe error, and already accepted invite shows safe error.
- Phase 8C6B added the first-pass manual browser E2E execution checklist in `docs/MANUAL_E2E_TEST_PLAN.md` to track this path alongside current-company, permission route, Team Access, order intake, client management, dashboard/calendar, and Settings smoke testing.

Completed Phase 8C5F1-F3 company invitation management:

- Phase 8C5F1 added `rpc_company_member_invitations_list(text, integer)` and `rpc_company_member_invitation_cancel(uuid, text, text)` as the canonical current-company invitation management read/cancel surfaces.
- Invitation list supports open, terminal, all, and exact status filters while returning only safe invite email, status, role display labels, invited-by display name, lifecycle timestamps, and action booleans.
- Cancel is limited to `prepared`, `sent`, and `auth_failed`, blocks accepted/expired states, requires Owner grant permission for Owner-role invitations, preserves history, and writes `company.member_invite_cancelled`.
- Phase 8C5F2 added resend prepare/finalize RPCs plus `resend-company-member-invite`. Resend creates a new invitation row, cancels/replaces prior pending rows when needed, reuses the invited membership safely, sends a fresh Auth invite from Edge/service-role code only, and never exposes provider links or tokens.
- Phase 8C5F3 added Team Access invitation UI on the Users page with pending/past/all filters, invite send, cancel confirmation, resend action, safe loading/empty/error states, and no direct frontend reads or writes to invitation, membership, role assignment, role, or role permission tables.
- `invite-company-member` now derives the default invite redirect from `APP_ORIGIN`, `SITE_URL`, `PUBLIC_SITE_URL`, or `APP_URL` and points to `/accept-invite/:invitationId`.
- Invitation state remains non-authoritative. Pending, sent, auth-failed, cancelled, and resent invitation rows grant no order, client, relationship, assignment, activity, notification, dashboard, or team visibility by themselves.
- Validation passed with clean reset, invitation management RPC catalog and behavior checks, resend RPC/Edge checks, Deno checks for both invite Edge Functions, frontend static leakage scans, lint, build, and `git diff --check`.
- Manual browser/Auth validation remains open for the full real-provider path: owner/admin sends invite, pending invite appears, resend creates/replaces a pending invite, cancel removes pending actionability, recipient opens the email link while logged out, login returns to `/accept-invite/:invitationId`, acceptance activates access, session refresh and `set-active-company` succeed, dashboard loads under the accepted company, and wrong-user/expired/already-accepted states show safe copy.
- Track manual execution in `docs/MANUAL_E2E_TEST_PLAN.md`.

Completed Phase 8C5G4A1-A3A assignable-user migration:

- Phase 8C5G4A1 added `rpc_company_assignable_users(text)` as the safe current-company assignment picker projection. It returns active company members, safe role display data, Appraiser/Reviewer eligibility derived from active normalized template role assignments, and `default_split_pct` compatibility without exposing auth IDs or raw permission keys.
- Phase 8C5G4A2 moved AssignmentFields appraiser/reviewer pickers, the Orders appraiser filter, and `AppraiserSelect` to the assignable-user RPC wrapper. The direct `user_roles`/`profiles` split fallback and old `listAssignableUsers` path were removed.
- Phase 8C5G4A3A deleted the dead singular `userService` assignable-user compatibility file after final import scans confirmed no active usage of `listAppraisers`, `listTeam`, or its `getUserById`.
- Remaining separate debt after this assignable-user slice was the Orders filter and order-form client picker direct client reads. These were addressed in Phase 8C5G4B/8C5G4C. Settings still uses `setUserColor` through `usersService`.

Completed Phase 8C5G4B1 through 8C5G4C4 order client intake cleanup:

- Phase 8C5G4B1 added `rpc_order_filter_clients()` as a narrow order-filter client option projection. It returns only distinct client IDs/names attached to orders readable by the current user.
- Phase 8C5G4B2 moved the Orders client filter dropdown from a direct `clients` read to `rpc_order_filter_clients`.
- Phase 8C5G4C1 added `rpc_order_form_client_options()` and `rpc_order_form_client_name_search(text, integer)` for order-form client/AMC picker options and duplicate-name checks.
- Phase 8C5G4C2 moved `ClientFields` client/AMC pickers and `OrderForm` duplicate search to those RPC wrappers while preserving AMC-filtered dropdown behavior and contact-preview display.
- Phase 8C5G4C3A added `rpc_order_form_client_create(jsonb)` as a narrow inline order-form client creation RPC. It forces `category = client`, `status = active`, validates optional same-company active non-merged AMC attachment, rejects blank/duplicate names, ignores unsupported/private fields, and returns only a safe created-client projection.
- Phase 8C5G4C3B moved `OrderForm` inline client creation from broad `createClient` to `rpc_order_form_client_create`.
- Phase 8C5G4C4 deleted dormant `ClientSelect.jsx` after import scans confirmed it was unused and still depended on broad client listing.
- Active order form and order filter paths no longer directly read `clients`, call broad `createClient`, or call broad `searchClientsByName`.
Completed Phase 8C5H1 through 8C5H2E broad client management cleanup:

- Phase 8C5H1A added `rpc_client_management_list(...)`, `rpc_client_management_detail(bigint)`, and `rpc_client_management_amc_options()` as safe current-company client management read projections.
- Phase 8C5H1B moved `ClientsIndex`, `ClientDetail`, `EditClient`, `ClientProfile`, and `ClientForm` read/preload/AMC-option paths to those RPC wrappers.
- Phase 8C5H2B added `rpc_client_management_create(jsonb)`, `rpc_client_management_update(bigint, jsonb)`, and `rpc_client_management_archive(bigint, text, text)` as guarded current-company client management mutation surfaces. Phase 8C5H2B-Fix fixture-validated create/update/archive positive and negative cases.
- Phase 8C5H2C moved active `NewClient`, `EditClient`, and `ClientDetail` create/update paths to the management mutation RPC wrappers. The archive wrapper exists, but hard delete/archive is not wired into active UI.
- Phase 8C5H2D1 through 8C5H2D3A deleted dormant legacy client drawer/detail/sidebar/form components, deleted the dormant `useClients` hook, and shrank `clientsService` to `listClientOrders` and `isClientNameAvailable` only.
- Active broad client management no longer directly reads or writes `clients` from the browser.
- Remaining compatibility seams: `ClientProfile` still uses `listClientOrders` over `v_orders_frontend_v4`; active `ClientForm` still uses `isClientNameAvailable` through `client_name_taken`.

Completed Phase 8C5I through 8C5J2 route/profile cleanup:

- Phase 8C5I added `rpc_current_user_settings_get()` and `rpc_current_user_settings_update(jsonb)`, moved Settings profile color load/save to those RPCs, and deleted dormant `usersService` / `useUsers` after import scans.
- Phase 8C5J1 added `rpc_current_user_app_context()` plus `getCurrentUserAppContext()` and `useCurrentUserAppContext()` as the stable frontend foundation for current app-user identity and display-only current-company role labels.
- Phase 8C5J2A converted route config from legacy `roles` props to explicit permission gates.
- Phase 8C5J2B removed `useRole` fallback behavior from `TopNav`; navigation visibility is permission-only.
- Phase 8C5J2C removed `useRole` and legacy role fallback authorization from `ProtectedRoute`; routes with permission props are permission-only, and routes without permission props remain authenticated-only.
- Phase 8C5J3-J4 moved simple UI action visibility, dashboard/calendar/order-table lenses, Quick Actions, ClientDetail order-history lensing, and ActivityNote actor metadata from legacy `useRole` to permission hooks plus `useCurrentUserAppContext`.
- Phase 8C5J5 deleted the dead `src/lib/hooks/useRole.js` and `src/lib/services/rolesService.js` files after source scans confirmed no active imports remained. Display/lens context now comes from `rpc_current_user_app_context()`.

Completed Phase 8C5J6 through 8C5K2B legacy role-surface containment:

- Phase 8C5J6A revoked `anon` and `authenticated` execute access from frontend-dead legacy role RPCs and marked them deprecated: `rpc_get_my_role()`, `rpc_list_users_with_roles()`, both `rpc_set_user_role(...)` overloads, and `rpc_admin_set_user_role(uuid, text)`. `service_role` compatibility remains.
- Phase 8C5K1 revoked direct `anon`/`authenticated` table reads from legacy `public.user_roles` and documented it as a backend compatibility table.
- Phase 8C5K2A moved `current_app_user_can_read_order_row(...)` off `current_is_admin()` and onto `orders.read.all` / `orders.read.assigned`, changed `order_activity` update/delete policies to `activity.moderate`, and removed the older `user_roles`-joining `order_activity` select policy. Targeted transaction-scoped fixtures passed.
- Phase 8C5K2B replaced the legacy `review_flow` admin read policy that checked `users.role = 'admin'` with an order-read policy using `can_read_order(order_id)`. Targeted transaction-scoped fixtures passed.

8C5K-PAUSE decision:

- Further legacy SQL retirement is intentionally paused until product direction and the final implementation path are locked.
- Do not drop `public.user_roles`, `public.users.role`, legacy role helper functions, or compatibility views yet.
- Final repo cleanup should revisit unused files, stale SQL helpers, overlapping policies, and compatibility surfaces after core product flows are settled.
- Deferred SQL cleanup includes users RLS rationalization, remaining helper bodies that read `public.user_roles` / `public.users.role`, `public.profiles.role` projection cleanup, default-company fallback removal from company-aware helpers, and eventual retirement of `public.user_roles` / `public.users.role`.
- Remaining active compatibility seams are `ClientProfile` through `listClientOrders`, active `ClientForm` through `isClientNameAvailable` / `client_name_taken`, and backend legacy helper/policy cleanup.

Slice 6C parity SQL used before wrapper migration:

```sql
with legacy as (
  select permission_key
  from public.current_app_user_permission_keys() as permission_key
),
company as (
  select permission_key
  from public.current_app_user_permission_keys_for_company(public.current_company_id()) as permission_key
)
select 'legacy_minus_company' as diff_type, permission_key from legacy
except
select 'legacy_minus_company', permission_key from company
union all
select 'company_minus_legacy' as diff_type, permission_key from company
except
select 'company_minus_legacy', permission_key from legacy
order by diff_type, permission_key;
```

```sql
select ur.*
from public.user_roles ur
left join public.users u_by_id on u_by_id.id = ur.user_id
left join public.users u_by_auth on u_by_auth.auth_id = ur.user_id
left join public.roles r
  on r.company_id is null
 and lower(r.name) = lower(ur.role)
where coalesce(u_by_id.id, u_by_auth.id) is null
   or r.id is null;
```

```sql
select
  ur.user_id as legacy_user_id,
  ur.role,
  coalesce(u_by_id.id, u_by_auth.id) as resolved_app_user_id,
  r.id as template_role_id,
  ura.id as assignment_id
from public.user_roles ur
left join public.users u_by_id on u_by_id.id = ur.user_id
left join public.users u_by_auth on u_by_auth.auth_id = ur.user_id
left join public.roles r
  on r.company_id is null
 and lower(r.name) = lower(ur.role)
left join public.user_role_assignments ura
  on ura.company_id = public.default_company_id()
 and ura.user_id = coalesce(u_by_id.id, u_by_auth.id)
 and ura.role_id = r.id
where ur.role is not null
order by ur.role, ur.user_id;
```

### App Changes

Minimal in this phase:

- Keep default platform policy modules as compatibility defaults until company-aware policy resolution exists.
- Read active/default company where needed.
- Do not require full account switching yet.

### Validation Checklist

- Existing app works with all current data backfilled to default company.
- Order creation still works.
- Notification reads still work.
- Activity reads still work.
- Existing users can still sign in.
- Existing users have default company membership.
- Legacy text roles that resolve cleanly have default-company role assignments.

### Stop Conditions Before Moving On

- Default company exists in all environments.
- Nullable company columns are populated for core data.
- No user-facing behavior regressed.
- Remaining company-aware backend hardening is planned before enforcement:
  - add the order/client same-company guard after mismatch verification,
  - update order numbering later,
  - migrate active-company context, RLS, and tenant UI in separate slices.

## Phase 6: Normalized Roles / Permissions

Status: Foundation partially complete; active permission helpers now resolve through default-company context, while RLS, frontend org switching, role admin RPCs, and workflow authorization remain compatibility-mode.

Foundation already completed in Phase 2 Step 1:

- `public.permissions`
- `public.roles`
- `public.role_permissions`
- Template roles Owner/Admin/Appraiser/Reviewer/Billing
- Template role-permission seeds

Multi-Company Foundation Slice 6B added:

- `public.user_role_assignments`
- Backfill from resolvable legacy `public.user_roles` rows into `falcon_default`
- Company-aware permission resolver successor functions

Multi-Company Foundation Slice 6C added:

- Permission parity verification before edits.
- Wrapper migration from the four active permission helpers to company-aware successors through `current_company_id()`.
- Generated Supabase TypeScript types refreshed after local replay.

Still pending for full Phase 6:

- Owner guardrails.
- Role editor/admin UI.
- Wiring app/RLS/RPC behavior to permission checks.

### Goal

Introduce database-backed configurable roles and permissions.

### Why It Matters

This is the foundation for Discord-like editable role bundles, custom company roles, owner delegation, and SaaS-friendly setup.

### Files / Areas Likely Affected

Database:

- `roles`
- `permissions`
- `role_permissions`
- normalized `user_roles`
- seed migrations/scripts

App:

- Role editor later.
- User invitation/management.
- Permission hooks.

### Database Changes

Already added in Phase 2 Step 1:

```txt
roles
permissions
role_permissions
```

Still needed: either create a new normalized join table or extend `user_roles` with:

- `role_id`
- `company_id`
- `assigned_by`
- `assigned_at`
- `expires_at`
- `is_active`

Seed template roles:

- Owner
- Admin
- Appraiser
- Reviewer
- Trainee
- Inspector / Field Rep
- Billing
- Client Portal User

Backfill existing text roles into normalized rows.

### App Changes

- Update effective permission loading to use normalized roles when available.
- Keep legacy text role fallback.
- Do not remove compatibility paths yet.

### Validation Checklist

- Existing users retain effective permissions.
- Owner/admin checks still work.
- Multi-role users resolve additive permissions.
- At least one owner exists.
- Role permission seeds are deterministic.

### Stop Conditions Before Moving On

- Permission compatibility layer reads normalized roles successfully.
- Legacy role fallback remains in place.
- No owner lockout risk.

## Phase 7: Order Participants

### Goal

Add `order_participants` as the central order responsibility model.

### Why It Matters

This unlocks lifecycle-aware responsibility, reviewer activation windows, inspector/task participation, watchers, tagged participants, billing responsibility, and clean notification routing.

### Files / Areas Likely Affected

Database:

- `order_participants`
- backfill migration from `orders.appraiser_id` and `orders.reviewer_id`

App:

- Responsibility resolver.
- Assignment UI.
- Notification routing.
- Workflow transitions.
- Activity payload creation.

### Database Changes

Add:

```txt
order_participants
- order_id
- user_id
- responsibility_type
- task_id
- active_from_status
- active_until_status
- is_active
- assigned_by
- assigned_at
- ended_at
- metadata
```

Backfill:

- appraiser participant from `orders.appraiser_id`
- reviewer participant from `orders.reviewer_id`

### App Changes

- Resolver prefers `order_participants`.
- Fallback to `orders.appraiser_id` / `orders.reviewer_id`.
- Assignment changes update participants and order convenience fields.

### Validation Checklist

- Existing orders resolve participants correctly.
- Assignment notifications still work.
- Reassignment ends old responsibility and starts new responsibility.
- Reviewer lifecycle can be represented.
- Appraiser/admin overlap still routes correctly.

### Stop Conditions Before Moving On

- Resolver works with both participant table and legacy order fields.
- No current order loses assignment visibility.
- Activity history remains attributed correctly.

## Phase 8: Setup / Onboarding UX

### Goal

Build first-run company setup and onboarding experience.

### Why It Matters

Falcon must be repeatable and sellable to new appraisal firms. Owners should configure company settings, numbering, workflow, roles, users, clients, and sample data without developer help.

### Files / Areas Likely Affected

App:

- Setup wizard routes/components.
- Company settings pages.
- Role selection UI.
- Invitation UI.
- Client setup UI.

Database:

- `company_settings`
- invitation tables if implemented in this phase
- seed/demo markers

### Database Changes

Potential additions:

```txt
company_invitations
invitation_roles
company_order_numbering or settings JSON
company_workflow_settings or settings JSON
```

### App Changes

Build wizard:

1. Company profile
2. Order numbering
3. Workflow defaults
4. Template role selection
5. Role permission review
6. Invite users
7. Add clients
8. Sample data
9. Review and launch

### Validation Checklist

- New owner sees setup wizard.
- Existing configured company sees dashboard.
- Setup progress persists.
- Demo data option is clearly labeled.
- Owner can launch with recommended defaults.

### Stop Conditions Before Moving On

- Setup can be completed end to end in local/staging.
- No manual Supabase dashboard edits required for basic onboarding.

## Phase 9: Admin Communication Feed

### Goal

Build admin/owner communication feed from activity events, separate from bell notifications.

### Why It Matters

Admins need visibility into all communication without receiving every item as an urgent alert.

### Files / Areas Likely Affected

App:

- Admin dashboard.
- Communication feed component.
- Activity feed service/RPC.
- Filters/search.

Database:

- Activity feed RPC/view enrichment.
- Indexes on activity fields.

### Database Changes

Add/enrich activity fields if not already done:

- `company_id`
- `category`
- `importance`
- `visibility`
- `payload`

Add indexes for:

- company/time
- order/time
- category/time
- importance/time

### App Changes

Feed item format:

```txt
Chris Rossi → Pam Casper · Appraiser note · ORD-26001
Any revisions yet?
10:42 AM · normal
```

Filters:

- person
- order
- client
- category
- status
- importance

### Validation Checklist

- Admin sees feed without bell noise.
- Direct participant notifications still go to bell.
- Feed never shows internal UUID as visible order label.
- Feed respects admin visibility permissions.

### Stop Conditions Before Moving On

- Admin feed can replace ad hoc monitoring views for communication.
- Bell notifications remain personal/actionable.

## Phase 10: Seed / Reset / Demo Company Packaging

### Goal

Make Falcon resettable, seedable, and demo-ready for repeatable sales/dev environments.

### Why It Matters

Falcon should be sellable to other appraisal firms and easy to test. A reset/seed system prevents brittle manual setup and makes demos consistent.

### Files / Areas Likely Affected

Scripts:

- `scripts/db/reset-demo.*`
- `scripts/db/seed-demo-company.*`
- `scripts/db/seed-template-roles.*`
- `scripts/db/seed-users.*`
- `scripts/db/seed-clients.*`
- `scripts/db/seed-orders.*`
- `scripts/db/seed-activity.*`

Database:

- `seed_runs`
- demo metadata columns/JSON where needed

Docs:

- `docs/TENANT_SETUP_AND_SEEDING.md`

### Database Changes

Optional:

```txt
seed_runs
metadata.is_demo
metadata.seed_key
```

### App Changes

None required unless adding UI for loading/removing sample data.

### Validation Checklist

- Local reset creates clean demo company.
- Seed creates users, roles, clients, orders, activity, and sparse notifications.
- Seeded orders have readable order numbers.
- Demo records can be removed safely.
- Scripts refuse production destructive reset by default.

### Stop Conditions Before Moving On

- Demo can be rebuilt from scratch without manual DB edits.
- Seed output is deterministic enough for tests and demos.

## Cross-Phase Rules

- Prefer additive database changes before destructive cleanup.
- Keep compatibility views/functions until app code is fully migrated.
- Do not remove legacy columns until reads/writes are proven unused.
- Do not widen lifecycle statuses until UI and transition logic support them.
- Do not build inspector/client portal workflows before identity, permissions, and responsibility resolver are stable.
- Every order-related notification must include visible `order_number`.
- Every source change should cite the roadmap phase it belongs to.

## Suggested Phase Order

1. Phase 0: Contract freeze.
2. Phase 1: Identity alignment helpers and RPC cleanup.
3. Phase 2: Permission compatibility layer.
4. Phase 3: Responsibility resolver.
5. Phase 4: Activity/notification payload enforcement.
6. Phase 5: Company foundation.
7. Phase 6: Normalized roles/permissions.
8. Phase 7: Order participants.
9. Phase 8: Setup/onboarding UX.
10. Phase 9: Admin communication feed.
11. Phase 10: Seed/reset/demo packaging.

Some phases can overlap in design, but implementation should avoid crossing phase boundaries in a single change unless the dependency is explicit and small.
