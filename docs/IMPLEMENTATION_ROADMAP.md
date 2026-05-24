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

Phase 10K10 Unified Operational Header Polish is complete as frontend-only dashboard layout polish. `src/features/dashboard/DashboardPage.jsx` now uses a stable `Operations Dashboard` title with calmer role-aware subtitle copy, compact current-company and work-view context chips from existing app/dashboard context, and an active-order count from existing `summary.orders.count`. The Owner Setup prompt is now a compact `Setup Guidance` strip below the operational header, while Calendar remains the primary operational context, Orders remains the primary work surface, and the deterministic single-column Status rail remains beside the Orders table on wide screens. KPI cards, workload visibility, and read-only operational readiness now sit in a clearly labeled `Operational Support` section below the primary Calendar plus Orders flow. Tests assert the unified header, context chips, primary Calendar/Orders/Status ordering, secondary support section, setup guidance copy, and unchanged table/status filtering behavior. No migrations, backend behavior, routes, registries, permissions, RLS/RPCs, analytics queries, new dashboard data sources, fake KPIs, predictive scoring, dashboard authority change, smart-action behavior, product-mode/module authority, or dashboard mutation path changed.

Phase 10K11 Dashboard Polish Closeout is complete as documentation-only consolidation. The completed operational dashboard foundation is now locked: unified `Operations Dashboard` header, compact company/work-view/active-order context, read-only setup guidance separated from operational work, Calendar first, Orders as the primary work surface, deterministic simple Status rail, and KPIs/workload/readiness moved to secondary `Operational Support`. Guardrails remain no backend changes, no new queries, no analytics redesign, no dashboard authority changes, no product-mode authority, no hidden mutation behavior, no cross-company aggregates, no fake KPIs, and no predictive scoring. Deferred dashboard work is richer owner analytics/reporting, true server-side analytics if needed, configurable widgets, dashboard personalization, later mode-specific dashboards, later calendar scheduling intelligence, trends/exports, and production/deployment verification as a separate track. No runtime files, tests, backend behavior, routes, registries, permissions, RLS/RPCs, analytics queries, dashboard data sources, smart-action behavior, product-mode/module authority, or dashboard mutation path changed.

Orders Workspace Polish Slice 1A plans the next governed active Orders page polish pass in `docs/ORDERS_WORKSPACE_POLISH_STRATEGY.md`. The strategy reviews the current active Orders page, Historical Orders secondary surface, URL-backed filters, active filter chips, Saved Views, deterministic queue filtering, reviewer/appraiser/client/status/due filters, `UnifiedOrdersTable`, Smart Actions, lifecycle-action separation from the table, and archived/cancelled/voided exclusion by default. UX goals are to make Orders feel like the primary operational inventory, improve hierarchy, reduce filter/action clutter, clarify active versus historical orders, make saved views and filter chips intentional, keep workflow actions obvious but controlled, and improve mobile stacking and empty states. The recommended first implementation is frontend-only header/filter layout polish that preserves current data, query, saved-view, workflow, lifecycle, and table behavior with no table column redesign yet. Deferred work remains table column density redesign, bulk actions, advanced saved views, owner analytics/reporting, historical admin search, server-side queue filtering, configurable table views, shared/team saved views, and table personalization. This slice is docs-only and adds no runtime behavior, backend change, filter/query behavior change, route change, table behavior change, Smart Action change, saved view behavior change, lifecycle action, RLS/RPC change, or mutation behavior change.

Orders Workspace Polish Slice 1B audits the current Orders page header and context before implementation in `docs/ORDERS_WORKSPACE_POLISH_STRATEGY.md`. The audit records the active structure across the `Operational Inventory` header, `Saved Views`, `Historical Orders`, `New Order`, `OrdersFilters`, active filter chips, queue-derived context, `UnifiedOrdersTable`, empty/loading states, and mobile stacking. It identifies the primary work surface as search/filters, active chips, the table, Smart Actions, and `New Order`, while `Saved Views`, `Historical Orders`, and queue context should remain secondary/supporting elements with clearer hierarchy. Findings include weak active-versus-historical context, header action competition, dense filter rows, detached active chips, queue-derived state that is not explained until the table, and mobile stacking that can push the work surface down. Safe first-pass targets are frontend-only header/context polish, secondary control grouping, filter/chip spacing cleanup, historical-link hierarchy cleanup, mobile wrapping polish, and table support copy from existing filter state only. This slice is docs-only and explicitly avoids table column redesign, filter/query changes, Smart Actions changes, Saved Views behavior changes, queue logic changes, lifecycle behavior changes, backend changes, new filters, historical leakage into active Orders, and table-level lifecycle actions.

Orders Workspace Polish Slice 1C is complete as frontend-only header/filter/layout polish. `src/pages/orders/Orders.jsx` now presents the active page as `Orders Workspace` under `Active Operations`, keeps `New Order` as the only primary header action, moves `Saved Views` into the filter/search control area, keeps `Historical Orders` as a secondary read-only workspace link beside Saved Views, improves active filter chip wrapping/alignment, and adds a compact read-only workspace context strip before the table using existing filter state only. `src/features/orders/OrdersFilters.jsx` now accepts an optional actions slot and uses `Filter Active Orders` copy while preserving existing filter controls and state updates. Focused Orders tests cover the new hierarchy, filter-action grouping, context strip, saved-view behavior, chip behavior, and unchanged table prop behavior. No backend, Supabase, route, permission, RLS/RPC, query/filter semantic, Saved Views behavior, Smart Actions behavior, table column, lifecycle action, archived/cancelled/voided visibility, data-source, mutation, fake analytics, or predictive scoring change was introduced.

Orders Workspace Polish Slice 1D is complete as frontend-only Orders table presentation polish. `src/features/orders/UnifiedOrdersTable.jsx` now includes a compact table chrome/header with an `Orders Table` label, active table mode (`Active orders` or `Queue worklist`), existing total count, existing page context, and short explanatory copy derived only from current table mode. Loading rows now render lightweight skeletons from the existing loading/page-size state, error output is presented as a clearer alert block, empty state copy is cleaner and action-free, and row spacing is slightly tighter. Existing active queue panel behavior, `rowsOverride`, table filters, column definitions, cell renderers, drawer expansion, pagination, Smart Actions, lifecycle separation, archived/cancelled/voided exclusions, query behavior, Saved Views behavior, backend behavior, Supabase behavior, routes, permissions, RLS/RPCs, fake analytics, predictive scoring, and mutation behavior are unchanged. A focused table presentation test covers active table chrome, queue worklist context, empty-state behavior, loading skeleton behavior, and absence of lifecycle action controls in the empty state.

Orders Workspace Polish Slice 1E is complete as frontend-only inline drawer/detail presentation polish. `src/components/orders/drawer/OrderDrawerContent.jsx` now renders clearer loading, no-selection, and error states; uses a stronger inline detail header with `Inline order detail`, larger order number, existing status badge, existing client/appraiser/property context, and the existing full-detail link; keeps Activity as the primary drawer content area with the existing `ActivityLog` composer; and groups client contact, property contact, access notes, and location preview with calmer spacing, borders, labels, and typography. `src/components/orders/drawer/OrderOpenFullLink.jsx` now has secondary button-like styling while preserving the same `/orders/:id` route. A focused drawer presentation test covers the loaded hierarchy, no-selection state, error state, full-detail link, activity composer, and absence of lifecycle actions in the no-selection state. No backend, Supabase, query/filter/Saved Views, drawer open/close, drawer data-loading query, activity fetch/composer, Smart Actions, lifecycle action, permission/authority, table column, mutation control, or new drawer feature behavior changed.

Orders Workspace Polish Slice 1F is complete as the first-pass consistency, accessibility, and responsive-readability checkpoint. The touched Orders workspace surfaces now include safe accessible labels for the workspace context strip, filter utility group, Orders table wrapper, loading status indicators, active search input, and status filter group; filter labels are associated with their existing client/appraiser/priority/due controls; and unused React default imports were removed from the touched files where the JSX transform does not require them. The completed first Orders Workspace polish foundation now covers strategy, audit, active page header/filter/context polish, table presentation polish, drawer/detail presentation polish, and consistency/a11y/responsive cleanup. It remains frontend-only and changes no backend, Supabase behavior, query/filter/Saved Views semantics, Smart Actions behavior, lifecycle action placement, table column design, product feature scope, permission/authority behavior, archived/cancelled/voided active-list exclusion, data source, fake analytics, predictive scoring, route behavior, RLS/RPC behavior, or mutation path.

Standalone Calendar Workspace Polish Slice 1A plans the next governed standalone calendar polish pass in `docs/CALENDAR_WORKSPACE_POLISH_STRATEGY.md`. The strategy reviews the current `/calendar` route, role-scoped active-order loading from `v_orders_active_frontend_v4`, order-derived calendar event normalization, two-week/month views, weekend visibility, Lens filtering, explanatory legend, selected-day support rail, shared calendar primitives, and dashboard-versus-standalone calendar inconsistencies. UX goals are to make `/calendar` feel like a true scheduling and coordination workspace, establish clearer operational hierarchy, group scheduling controls intentionally, keep selected-day support secondary, improve loading/error/empty-state tone, and align the page with the completed Dashboard and Orders workspace polish language. The recommended first implementation is frontend-only route-shell and control layout polish that preserves all current data, query, event, lens, selected-day, event-click, workflow, lifecycle, permission, and order navigation behavior. Deferred work remains shared dashboard/standalone calendar shell extraction, backend calendar event source unification, company timezone and working-hours policy, calendar saved views, standalone week/day parity, drag/drop scheduling, appointment rescheduling permissions, conflict detection, workload/capacity modeling, predictive scheduling risk, unassigned/at-risk lenses, external calendar sync, and calendar-specific production smoke. This slice is docs-only and adds no runtime behavior, backend change, Supabase change, route change, query semantic change, data source, scheduling mutation, workflow behavior change, lifecycle behavior change, permission change, archived/cancelled/voided leakage, fake analytics, predictive scoring, cross-company aggregate, RLS/RPC change, or mutation behavior change.

Standalone Calendar Workspace Polish Slice 1B is complete as frontend-only header and workspace hierarchy polish. `src/pages/Calendar.jsx` now frames `/calendar` as `Calendar Workspace` under `Scheduling Coordination`, adds compact read-only context chips for current company, work view, and loaded active-order count, groups existing calendar controls under `Scheduling Controls`, adds a current-view summary from existing view/Lens/selected-day state, keeps the legend as supporting explanation, and improves loading/error presentation. `src/pages/__tests__/Calendar.test.jsx` covers the polished hierarchy and verifies the active-order read source plus reviewer scope filters remain intact. Existing Supabase query source, query semantics, role scoping, order-derived event normalization, Lens filtering, selected-day behavior, event click behavior, Order Detail navigation, shared dashboard calendar behavior, permissions, workflow/lifecycle behavior, scheduling semantics, backend behavior, routes, RLS/RPCs, archived/cancelled/voided active-calendar exclusion, fake analytics, predictive scoring, cross-company aggregates, and mutation paths are unchanged.

Standalone Calendar Workspace Polish Slice 1C is complete as frontend-only calendar body, grid/rail hierarchy, and empty-state polish. `src/pages/Calendar.jsx` now wraps the primary standalone calendar area in a `Schedule Board` section with view-derived support copy, a board mode badge, and small-screen horizontal overflow protection around the existing grid component. `src/components/calendar/CalendarDayDetailRail.jsx` now uses `Selected Day` hierarchy, a compact total badge, accessible event-count grouping, a calm no-events state, and accessible order-opening labels. Tests cover the new `Schedule Board` hierarchy plus selected-day rail empty/grouped event behavior and preserved order-opening callback behavior. Existing grid components, shared dashboard calendar behavior, Supabase read path, query semantics, event derivation, role scoping, date selection, Lens filtering, order navigation, scheduling semantics, workflow/lifecycle behavior, permissions, backend behavior, routes, RLS/RPCs, archived/cancelled/voided active-calendar exclusion, fake analytics, predictive scoring, cross-company aggregates, new scheduling features, and mutation paths are unchanged.

Standalone Calendar Workspace Polish Slice 1D is complete as the first-pass consistency, accessibility, and responsive-readability checkpoint. The touched Calendar workspace surfaces now use cleaner Lens summary copy, normalized `Orders` context labeling with singular/plural active-order count copy, an accessible combined schedule-board / selected-day-details region label, selected-day total badge pluralization, and an accessible selected-day total label. The completed first Calendar Workspace polish foundation now covers strategy, header/workspace hierarchy, calendar body/grid/rail presentation, selected-day empty-state polish, and consistency/a11y/responsive cleanup. It remains frontend-only and changes no backend, Supabase behavior, event/query semantics, scheduling mutation behavior, permission/workflow/lifecycle behavior, shared dashboard behavior, archived/cancelled/voided active-calendar exclusion, fake analytics, predictive scoring, new calendar features, route behavior, RLS/RPC behavior, or mutation path.

Clients Workspace Polish Slice 1A plans the next governed standalone Clients workspace polish pass in `docs/CLIENTS_WORKSPACE_POLISH_STRATEGY.md`. The strategy reviews current Clients routes and permission gates, including `/clients`, `/clients/cards`, `/clients/:id`, `/clients/new`, `/clients/edit/:clientId`, and legacy `/clients/profile/:clientId`; the RPC-backed client management list/detail/create/update wrappers; existing category/search/sort controls; client cards; Client Detail related-order readback; and legacy compatibility service boundaries. UX goals are to make Clients feel like an operational relationship workspace, improve hierarchy, reduce search/filter/sort clutter, clarify full versus assigned client work-view context, keep client identity/contact and related order context primary, and align the surface with the completed Dashboard, Orders, and Calendar workspace polish language. The recommended first implementation is frontend-only `ClientsIndex` header/control layout polish that preserves current client data, query, category, search, sort, create-link visibility, card navigation, permissions, and mutation behavior. Deferred work remains Client Detail layout polish, New/Edit Client form shell polish, card/table view redesign, URL-backed client filters, saved client views, client duplicate/canonicalization model, company-scoped contacts model, client archive/restore doctrine, relationship graph expansion, Client Portal surfaces, client analytics/reporting, server-side search/pagination, CRM segmentation/scoring, bulk actions, and imports/exports. This slice is docs-only and adds no runtime behavior, backend change, Supabase change, route change, query behavior change, client data model change, relationship/company-scoping change, permission/workflow/lifecycle change, order visibility change, fake analytics, predictive scoring, CRM expansion, Client Portal activation, RLS/RPC change, or mutation path.

Clients Workspace Polish Slice 1B is complete as frontend-only workspace hierarchy and header polish. `src/pages/clients/ClientsIndex.jsx` now frames `/clients` and `/clients/cards` as `Clients Workspace` under relationship management, adds compact read-only context for work view, active category filter, and result count, groups search/category/sort plus the permission-gated `New Client` link under `Relationship Controls`, and wraps the card grid in a clearer `Client Directory` section with calmer loading, error, and empty states. `src/pages/clients/__tests__/ClientsIndex.test.jsx` covers the hierarchy, create-link permission visibility, preserved search/category/sort API arguments, normalized card data, and empty state. No backend behavior, Supabase behavior, route behavior, permissions, RLS/RPCs, client model/API/RPC behavior, query semantics, relationship/company-scoping behavior, order visibility, workflow/lifecycle behavior, Client Portal behavior, CRM expansion, fake analytics, predictive scoring, card navigation, or mutation paths changed.

Clients Workspace Polish Slice 1C is complete as frontend-only client card and directory presentation polish. `src/components/clients/ClientCard.jsx` now uses a cleaner relationship-card hierarchy with stronger client identity, category/status badges, compact order count, clearer contact presentation, three read-only metric tiles, and a more explicit detail link. `src/components/clients/__tests__/ClientCard.test.jsx` covers rendered identity, contact, metrics, status, detail navigation, phone navigation, permission-derived helper copy, absence of new button actions, and missing-data placeholders. The card still renders the same client/metric fields, links to `/clients/:id`, preserves the phone `tel:` link, derives helper copy from `clients.update.all`, and changes no backend behavior, Supabase behavior, routes, permissions, company scoping, RLS/RPCs, client model/API/RPC behavior, query/filter/sort semantics, Client Portal behavior, CRM feature behavior, new client actions, card navigation, or mutation paths.

Clients Workspace Polish Slice 1D is complete as frontend-only client detail/profile presentation polish. `src/pages/clients/ClientDetail.jsx` now uses a cleaner `Relationship Detail` header, read-only context tiles, clearer edit/back action hierarchy, a grouped `Client Contact` section, a `Related Orders` section that preserves current visible-order scope, and a renamed `Visible Order Context` rail instead of analytics-heavy KPI language. `src/pages/clients/ClientProfile.jsx` received a light read-only legacy shell polish with `Legacy Client Profile` framing and a clearer `Previous Orders` section. `src/pages/clients/__tests__/ClientDetail.test.jsx` covers the hierarchy, existing client-detail wrapper call, existing related-order view/query/scoping behavior, edit-form visibility through `clients.update.all`, and absence of edit controls without update permission. No backend behavior, Supabase behavior, routes, permissions, company scoping, RLS/RPCs, client model/API/RPC behavior, displayed client/order data, query semantics, edit submission behavior, Client Portal behavior, CRM feature behavior, new actions, new mutations, or order visibility behavior changed.

Clients Workspace Polish Slice 1E is complete as the first-pass consistency, accessibility, and responsive cleanup checkpoint. The touched Clients workspace surfaces now include accessible labels for individual client cards and the relationship-card grid, hidden decorative separators from assistive technology, normalized `AMC` category display on Client Detail, clearer `Active orders` context labeling, and horizontal overflow protection for the legacy Client Profile order history grid. The completed first Clients Workspace polish foundation now covers strategy, workspace header/control hierarchy, client card/directory presentation, client detail/profile presentation, and consistency/accessibility/responsive cleanup. No backend behavior, Supabase behavior, routes, permissions, company scoping, RLS/RPCs, client model/API/RPC behavior, displayed client/order data, query/filter/sort semantics, edit submission behavior, Client Portal behavior, CRM feature behavior, new client actions, new mutations, order visibility behavior, fake analytics, or predictive scoring changed.

Assignments Workspace Polish Slice 1A plans the next governed standalone Assignments workspace polish pass in `docs/ASSIGNMENTS_WORKSPACE_POLISH_STRATEGY.md`. The strategy reviews the current `/assignments` and `/assignments/:assignmentId` routes, assignment packet read permission gates, assigned-company and owner-company lanes, status filters, packet detail resolution order, `rpc_order_company_assignment_*` lifecycle wrappers, assignment-scoped activity timeline, assignment dashboard widgets, and owner-side Order Detail assignment panels. UX goals are to make Assignments feel like a packet coordination workspace, clarify received work versus sent assignments, improve workspace hierarchy and lane/control grouping, keep workflow visibility packet-native, and align the surface with the completed Dashboard, Orders, Calendar, and Clients workspace polish language. The recommended first implementation is frontend-only `AssignmentsPage` shell and lane-header polish that preserves current list/detail/action data flow, status filter semantics, packet resolution, assignment lifecycle RPC wrappers, permissions, and routes. Deferred work remains packet detail hierarchy polish, assignment activity readability, JSON section readability, saved assignment views, assignment history/admin readback, assignment search/pagination, packet messaging, server-side assignment analytics if needed, staffing/dispatch recommendations, vendor eligibility/scoring, capacity forecasting, Vendor Portal activation, and AMC-native queue command-center behavior. This slice is docs-only and adds no runtime behavior, backend change, Supabase change, route change, assignment query behavior change, assignment workflow/state-machine change, permission/company-scoping change, Smart Action change, staffing/dispatch logic, fake analytics, predictive scoring, queue semantic change, canonical order/client/relationship visibility broadening, Vendor/Client Portal activation, RLS/RPC change, or mutation path.

Assignments Workspace Polish Slice 1B is complete as frontend-only workspace shell and lane-header polish. `src/features/assignments/AssignmentsPage.jsx` now frames `/assignments` as `Assignments Workspace` under `Packet Coordination` and adds a compact read-only context strip for visible work lanes, packet-scoped access, and packet-only navigation. `src/features/assignments/AssignedAssignmentInbox.jsx` now presents the assigned-company lane as `Received Work` with clearer packet-scope support copy, labeled status filter, polished header spacing, and calmer loading/empty copy. `src/features/assignments/OwnerAssignmentManagement.jsx` now presents the owner-company lane as `Sent Assignments` with clearer owner-side packet support copy, labeled status filter, polished header spacing, and calmer loading/empty copy. `src/features/assignments/__tests__/AssignmentsPage.test.jsx` covers the hierarchy, lane labels, preserved list RPC calls, preserved status filter arguments, packet navigation links, and denied access state. No backend behavior, Supabase behavior, routes, permissions, company scoping, RLS/RPCs, assignment query semantics, assignment workflow/state-machine behavior, Smart Actions, staffing/dispatch logic, queue semantics, canonical order/client/relationship visibility, fake analytics, predictive scoring, dashboard assignment behavior, Order Detail assignment behavior, or mutation paths changed.

Assignments Workspace Polish Slice 1C is complete as frontend-only assignment packet card/list presentation polish. `src/features/assignments/AssignedAssignmentInbox.jsx` now renders Received Work rows as clearer packet cards with `Received Packet` hierarchy, order-number identity, status/attention badges, labeled owner/type/location metadata, instruction preview treatment, due/expiration dates, descriptive accessible packet links, and an explicit `Open packet` affordance. `src/features/assignments/OwnerAssignmentManagement.jsx` now renders Sent Assignments rows as clearer packet cards with `Sent Packet` hierarchy, assigned-company identity, status/attention badges, labeled type/relationship metadata, instruction preview treatment, due/updated dates, descriptive accessible packet links, and the same explicit packet-opening affordance. `src/features/assignments/__tests__/AssignmentsPage.test.jsx` covers the card labels, accessible packet links, displayed metadata, instruction previews, and unchanged list/filter RPC behavior. No backend behavior, Supabase behavior, routes, permissions, company scoping, RLS/RPCs, assignment query semantics, assignment workflow/state-machine behavior, Smart Actions, staffing/dispatch logic, queue semantics, canonical order/client/relationship visibility, fake analytics, predictive scoring, new packet actions, dashboard assignment behavior, Order Detail assignment behavior, or mutation paths changed.

Assignments Workspace Polish Slice 1D is complete as frontend-only assignment packet detail presentation polish. `src/features/assignments/AssignmentPrimitives.jsx` now provides a shared `PacketHeader`, wraps field grids as `Packet Context`, provides shared instruction display treatment, and updates the detail back link to `Back to Assignments Workspace`. `src/features/assignments/AssignedOfferPacket.jsx`, `src/features/assignments/AssignedWorkPacket.jsx`, and `src/features/assignments/OwnerAssignmentPacket.jsx` now use the same packet detail hierarchy for eyebrow, title, subtitle, status, packet meta chips, and action placement while preserving existing packet content and lifecycle action components. Owner packet `Open Order` remains an owner-side secondary action with a descriptive accessible label. `src/features/assignments/__tests__/AssignmentPacketPresentation.test.jsx` covers assigned offer hierarchy, assigned work hierarchy, owner order navigation, packet context rendering, instruction rendering, and activity timeline preservation. No backend behavior, Supabase behavior, routes, permissions, company scoping, RLS/RPCs, packet resolution order, assignment query semantics, assignment workflow/state-machine behavior, Smart Actions, staffing/dispatch logic, queue semantics, canonical order/client/relationship visibility, fake analytics, predictive scoring, new packet actions, dashboard assignment behavior, Order Detail assignment behavior, or mutation paths changed.

Assignments Workspace Polish Slice 1E is complete as the first-pass consistency, accessibility, and responsive cleanup checkpoint. `src/features/assignments/AssignedAssignmentInbox.jsx` and `src/features/assignments/OwnerAssignmentManagement.jsx` now expose accessible region labels for Received Work and Sent Assignments. `src/features/assignments/AssignmentPrimitives.jsx` now exposes accessible packet detail-region labels through the shared packet header and an accessible `Packet actions` region around packet action content. Assignment presentation tests now lock the lane region labels plus packet detail/action labels. The completed first Assignments Workspace polish foundation now covers strategy, packet-coordination shell hierarchy, lane-header polish, packet card/list presentation, shared packet detail presentation, and consistency/accessibility/responsive cleanup. No backend behavior, Supabase behavior, routes, permissions, company scoping, RLS/RPCs, packet resolution order, assignment query semantics, assignment workflow/state-machine behavior, Smart Actions, staffing/dispatch logic, queue semantics, canonical order/client/relationship visibility, fake analytics, predictive scoring, new packet actions, dashboard assignment behavior, Order Detail assignment behavior, or mutation paths changed.

Falcon Design System Foundation Phase 1A is complete as docs-only codification in `docs/FALCON_DESIGN_SYSTEM_FOUNDATION.md`. It records the operational UX philosophy and reusable standards that emerged across the completed Dashboard, Orders, Calendar, Clients, and Assignments workspace polish foundations: workspace headers, context strips, primary work surfaces, support rails, section shells, cards, badges, action hierarchy, control grouping, empty/loading/error states, responsive stacking, accessibility expectations, and soft reactive motion guidance. It also separates current standards from future component extraction, token cleanup, and deferred experimental design work. No runtime code, component rewrites, Tailwind/global theme changes, backend behavior, Supabase behavior, query behavior, permissions, product-mode authority, feature expansion, dark-mode overhaul, animation library integration, or design-system abstraction implementation was added.

Falcon Design System Foundation Phase 1B is complete as docs-only primitive extraction inventory in `docs/FALCON_DESIGN_SYSTEM_FOUNDATION.md`. It inventories repeated workspace UI patterns across Dashboard, Orders, Calendar, Clients, and Assignments; ranks candidate primitives by safety, reuse value, and implementation risk; and recommends a small future state-block primitive extraction as the safest first runtime slice, followed by a passive context-tile extraction. Deferred candidates include workspace headers, section shells, action buttons, status badges, card shells, support rails, global motion tokens, Tailwind theme changes, and whole-page workspace shells. No runtime code, component rewrites, Tailwind/global theme changes, backend behavior, Supabase behavior, query behavior, routes, permissions, workflow/lifecycle/mutation behavior, visual redesign, or animation library integration was added.

Falcon Design System Foundation Phase 1C is complete as the first runtime primitive extraction. `src/components/workspace/WorkspaceState.jsx` now provides passive `WorkspaceState`, `WorkspaceLoadingState`, `WorkspaceErrorState`, and `WorkspaceEmptyState` helpers for stable workspace loading, error, and empty states. Initial migration is intentionally narrow: Calendar route loading/error states, Clients directory loading/error/empty states, and Client Detail loading/error/not-found states now use the shared primitive while preserving existing copy, `role="status"` loading semantics, `role="alert"` error semantics, non-alerting empty states, layout intent, and all route/query/permission/data/workflow/lifecycle/mutation behavior. Assignment packet states and Orders table states remain separate because their domain/table-specific behavior is higher risk. Focused tests cover the shared primitive and migrated client/calendar surfaces. No backend behavior, Supabase behavior, query/filter behavior, workflow/lifecycle behavior, permission behavior, visual redesign, Tailwind/global theme rewrite, motion system, broad workspace-shell extraction, or large refactor was added.

Falcon Design System Foundation Phase 1D is complete as the second runtime primitive extraction. `src/components/workspace/WorkspaceContext.jsx` now provides passive `WorkspaceContextStrip` and `WorkspaceContextTile` helpers for read-only workspace context display. Initial migration is intentionally narrow: Calendar workspace header context, Clients workspace header context, Client Detail header context, and Assignments workspace context now use the shared primitive while preserving existing labels, values, aria labels, responsive layout ownership, caller-derived data, and non-interactive behavior. Orders workspace context remains local because it is filter-aware and chip-based; Dashboard header context remains local because its dark active-count tile needs a separate count-tile or header extraction design. No backend behavior, Supabase behavior, query/filter behavior, workflow/lifecycle behavior, permission behavior, visual redesign, Tailwind/global theme rewrite, motion system, workspace header extraction, interactive filter/control extraction, or broad refactor was added.

Falcon Design System Foundation Phase 1E is complete as the third runtime primitive extraction. `src/components/workspace/WorkspaceSection.jsx` now provides passive `WorkspaceSection` and `WorkspaceSectionMeta` helpers for stable workspace section shells with title, optional support copy, optional eyebrow, optional read-only meta, and caller-owned content. Initial migration is intentionally narrow: Calendar `Schedule Board`, Clients `Client Directory`, and Client Detail `Client Contact`, `Related Orders`, `Visible Order Context`, and `Relationship Notes` now use the shared section primitive while preserving existing copy, heading IDs, aria relationships, spacing intent, responsive alignment, data sources, forms, tables, and read-only meta. Orders table chrome, Dashboard support areas, Assignments lane wrappers, and Clients `Relationship Controls` remain local because they include table/worklist/widget/control/action semantics that need separate focused designs. No backend behavior, Supabase behavior, query/filter behavior, workflow/lifecycle behavior, permission behavior, visual redesign, Tailwind/global theme rewrite, motion system, card-shell extraction, workspace header extraction, interactive control extraction, or broad refactor was added.

Falcon Interaction and Motion Foundation Phase 1A is complete as docs-only codification in `docs/FALCON_INTERACTION_AND_MOTION_FOUNDATION.md`. It records Falcon's operational interaction philosophy, current Tailwind-native interaction patterns, soft operational responsiveness principles, hover/press/card/modal/toast/loading/state-change/focus standards, reduced-motion expectations, and future motion token guidance for durations, easing, elevation, opacity, and spatial movement. It explicitly separates current standards from future implementation phases and deferred experimental ideas such as animation libraries, route transitions, drag-and-drop scheduling, animated analytics, global theme rewrites, and dark-mode motion variants. No runtime code, component rewrites, animation library integration, Tailwind/global theme changes, backend behavior, Supabase behavior, query behavior, permissions, workflow/lifecycle behavior, feature expansion, branding overhaul, or visual redesign was added.

Falcon Interaction and Motion Foundation Phase 1B is complete as the first runtime interaction refinement. `src/components/feedback/FalconToaster.jsx` now centralizes restrained `react-hot-toast` presentation options, and the app root uses `FalconToaster` while preserving existing direct toast call sites and timing semantics. The local `ToastProvider` in `src/lib/hooks/useToast.jsx` now uses the same operational acknowledgment language: subtle Tailwind-native entrance motion, reduced-motion handling, calmer spacing, stronger but restrained elevation, tone-specific borders/accent rail, `role="status"` for passive acknowledgments, and `role="alert"` for errors. Existing toast triggers, message copy, stack order, local default `3500ms` dismissal timing, mutation flows, notification logic, backend behavior, Supabase behavior, query behavior, workflow/lifecycle behavior, and route behavior are unchanged. Drawer/modal transitions, card hover token extraction, button press transforms, global Tailwind motion tokens, route transitions, notification logic rewrites, and toast message normalization remain deferred.

Falcon Interaction and Motion Foundation Phase 1C is complete as a restrained primitive-level tactile feedback slice. `WorkspaceContextTile` and `WorkspaceSection` now share a reduced-motion-safe transition cadence for border, background, shadow, and transform changes, with hover lift, hover shadow, stronger border, and focus-within ring feedback available only through an explicit `interactive` prop. Existing workspace callers remain passive because none were migrated to interactive treatment. `WorkspaceState` now has only a color-transition cadence for mounted loading/error/empty state changes and no hover or spatial motion. Layout, copy, aria relationships, roles, state semantics, data flow, query behavior, workflow behavior, mutation behavior, backend behavior, Supabase behavior, route behavior, animation-library posture, Tailwind/global theme, and visual hierarchy are unchanged. Context strips, card-shell extraction, button/action press transforms, modal/drawer transitions, global motion tokens, Tailwind theme changes, and current-surface interactive migrations remain deferred.

CRUD Stabilization Sprint 1A through 2C is now in progress as a focused hardening track. `docs/CRUD_STABILIZATION_MATRIX.md` records approved write paths, deprecated direct helper seams, and source-scan guard expectations. Sprint 1B removed notification preference direct fallback writes from the frontend so preference creation/update now use `rpc_notification_prefs_ensure` and `rpc_notification_prefs_update`. Sprint 2A formalized order retirement doctrine in `docs/ORDER_RETIREMENT_DOCTRINE.md`: archive retires orders from active operations without deleting history, cancel and void remain deferred future terminal-status work, and hard delete remains unavailable in normal UI.

Sprint 2B implemented backend-only `public.rpc_order_archive(p_order_id uuid, p_reason text default null)` in `supabase/migrations/20260518075000_order_archive_rpc.sql`. The RPC is authenticated-only, requires current-company context, active membership, readable current-company order scope, and `orders.archive`; updates only `orders.is_archived` and `orders.updated_at`; writes backend-owned `activity_log.event_type = 'order.archived'` with safe payload; and preserves order status, order number, documents, assignments, notifications, calendar rows, and existing activity. No archive UI, frontend wrapper, cancel/void logic, delete behavior, status mutation, RLS weakening, or legacy compatibility hack was added. Local SQL validation applied the migration directly to the local Postgres container and verified the signature/grants; full `supabase db reset` was blocked by a Supabase storage image pull failure for `public.ecr.aws/supabase/storage-api:optimize-existing-functions-again`.

Sprint 2C documents the backend-only archive RPC state without runtime/UI changes. No repo SQL test harness exists yet, so archive behavior tests remain future SQL/browser smoke work: unauthenticated denial, missing `orders.archive` denial, authorized archive, retained status/order number, and `order.archived` activity. Sprint 2D quarantined direct archive/delete helper reachability without adding UI: deprecated `deleteOrder` / `archiveOrder` helpers now throw `Order archive/delete must use backend-owned lifecycle RPCs.`, and the CRUD source scan blocks direct frontend `orders.delete`, direct `orders` archive updates, and active uses of those deprecated helpers outside the quarantined helper files. Sprint 2E added `archiveOrderViaRpc(orderId, reason = null)` as a safe frontend service wrapper over `rpc_order_archive(p_order_id, p_reason)` for future use only; no archive button, menu, modal, route, status mutation, cancel/void behavior, direct table write, RLS change, or migration was added. Sprint 2F added pure archive readiness logic through `canArchiveOrder(order, permissions)`, using existing `PERMISSIONS.ORDERS_ARCHIVE` and `useEffectivePermissions()`-compatible permission data, plus source-scan coverage that keeps `archiveOrderViaRpc(...)` disconnected from active UI/source reachability. Sprint 2G defined archive confirmation UX copy/state doctrine without runtime wiring: title `Archive order`, optional reason label `Reason for archive (optional)`, confirm label `Archive order`, success/failure toast copy, and warning language that archive hides from active operational lists but does not delete, change status, remove documents/activity, or release the order number. Sprint 2H added the first fully guarded internal archive action entry point on Order Detail only: visibility uses `canArchiveOrder(order, permissions)`, confirmation uses the 2G copy, submission calls only `archiveOrderViaRpc(orderId, reason)`, success refreshes loaded order state, and failure keeps the modal open without local mutation. Sprint 2I hardened archived visibility after archive UI activation: active list queries exclude archived orders by default with `includeArchived` reserved for future readback surfaces, Order Detail still loads archived orders directly for preserved history, `is_archived` is mapped through the shared order mapper, archived details show an archived-order notice, and the archive action disappears once the refreshed order is archived. Sprint 2J completed archived-order operational documentation and future surface guardrails: archived rows may appear only in explicit Archived, History, or Admin surfaces; default queues/lists/dashboards/calendar pressure surfaces must not mix archived rows in; restore/unarchive is unsupported; archived records are read-only preserved-history records by default; and the CRUD source scan keeps `includeArchived` confined to low-level order read API files until a future archived/history surface is explicitly whitelisted. Sprint 2K defined cancel vs void lifecycle doctrine before implementation: cancel is a legitimate order stopped before completion, void is administrative invalidation for an error/duplicate/mistaken order, archive remains active-surface retirement without status mutation, hard delete remains forbidden in normal UI, future events are `order.cancelled` and `order.voided`, and future permissions are reserved as `orders.cancel` and `orders.void`; active source/migration inspection found no current `orders.cancel` or `orders.void` constants or seed entries. Sprint 2L added `supabase/migrations/20260518076000_order_cancel_void_permission_seeds.sql` to seed `orders.cancel` and `orders.void` as permission catalog rows only, following existing seed/upsert conventions and adding no template role grants. Sprint 2M added static frontend permission constants `PERMISSIONS.ORDERS_CANCEL` and `PERMISSIONS.ORDERS_VOID` plus pure readiness helpers `canCancelOrder(order, permissions)` and `canVoidOrder(order, permissions)`, which deny missing orders, archived orders, loading/error permission state, and missing matching permission keys. No archived list UI, table-row archive, bulk archive, hard delete, cancel/void implementation, restore/unarchive behavior, status mutation, RPC wrapper, role grants, RLS change, source-scan change, direct order write, button, modal, or active UI reachability was added.

Sprint 2N defined cancel/void UX copy doctrine before backend or UI implementation. Future cancel confirmation uses title `Cancel order`, required reason label `Reason for cancellation`, confirm label `Cancel order`, success toast `Order cancelled. Its history was preserved.`, and failure toast `Could not cancel order. No changes were made.` Future void confirmation uses title `Void order`, required reason label `Reason for voiding`, confirm label `Void order`, success toast `Order voided. Its history was preserved.`, and failure toast `Could not void order. No changes were made.` Both warnings must state that the action does not delete the order, release the order number, or remove documents/activity. No runtime helper, UI, RPC, migration, status mutation, source-scan change, or active behavior was added.

Sprint 2O added backend-only guarded cancel/void RPCs in `supabase/migrations/20260518077000_order_cancel_void_rpcs.sql`: `rpc_order_cancel(p_order_id uuid, p_reason text)` and `rpc_order_void(p_order_id uuid, p_reason text)`. The migration extends the order status constraint for `cancelled` and `voided`, requires authenticated current-company access, active membership, readable order scope, matching `orders.cancel` / `orders.void`, and a trimmed non-empty reason, denies archived orders, updates only `status` and `updated_at`, writes backend-owned `order.cancelled` / `order.voided` activity with safe `{ order_id, reason }` payload, and preserves order number, documents, existing activity, assignments, notifications, and calendar rows. Sprint 2P added isolated frontend service wrappers `cancelOrderViaRpc(orderId, reason)` and `voidOrderViaRpc(orderId, reason)` only. The wrappers trim and require a non-empty reason, call only `rpc_order_cancel` / `rpc_order_void`, throw RPC errors, do not use `supabase.from`, and remain blocked from active UI reachability by the CRUD source scan. No UI, modal, frontend status mutation, direct write, archive change, restore/unarchive behavior, RLS change, or migration was added in Sprint 2P.

Sprint 2Q exposed cancel/void only in the controlled internal Order Detail action area. Visibility uses `canCancelOrder(order, permissions)` and `canVoidOrder(order, permissions)`, confirmation uses Sprint 2N copy, reason is required and trimmed before submit, confirm is disabled while the trimmed reason is empty, submit calls only `cancelOrderViaRpc(order.id, reason)` or `voidOrderViaRpc(order.id, reason)`, success shows doctrine toast copy and refreshes loaded order state, and RPC failure shows inline modal copy without local status mutation. Cancel/void actions disappear after refreshed `cancelled` or `voided` state because readiness now denies those terminal statuses. The CRUD source scan allows wrapper reachability only in `ordersService.js` and `OrderDetail.jsx`. No table row action, bulk action, hard delete, restore/reopen, direct write, RLS change, migration, or smart-action behavior was added.

Sprint 2R hardened post-cancel/void visibility and preserved-history behavior. Active order list queries now exclude `cancelled` and `voided` by default, with low-level `includeRetiredLifecycle` reserved for future explicit History/Admin surfaces and blocked from active components by the CRUD source scan. Direct Order Detail remains loadable for cancelled/voided orders, shows `Cancelled order` or `Voided order` preserved-history notices, and hides archive/cancel/void actions after those terminal lifecycle states. No restore/reopen, history list UI, table-row lifecycle action, bulk action, direct write, RLS change, or migration was added.

Sprint 2S locks the archive/cancel/void lifecycle as complete for the current backend and Order Detail scope. Hard delete remains forbidden in normal UI, backend RPCs own archive/cancel/void mutations, Order Detail is the only active UI surface, active lists exclude archived/cancelled/voided orders by default, direct preserved-history Order Detail readback remains available, and future History/Admin surfaces must explicitly opt in through low-level readback flags and source-scan whitelists. Restore, reopen, and unarchive are unsupported. Source scans continue to block direct delete/archive writes and restrict lifecycle wrappers plus archived/retired readback flags. Sprint 2S is documentation-only and changes no runtime files.

Sprint 3A inventories order workflow/status mutation entry points before any additional workflow expansion. `docs/ORDER_WORKFLOW_STATUS_WRITE_AUDIT.md` now records the authoritative mutation map: active normal workflow transitions use named `ordersService` helpers backed by `rpc_transition_order_status(...)`, while archive/cancel/void remain separate Order Detail lifecycle RPC paths. The audit identifies quarantined or legacy risks in direct/generic status helpers, bulk status helpers, `src/lib/utils/updateOrderStatus.js`, `src/features/orders/actions.js`, `src/features/orders/OrderActionsPanel.jsx`, and `src/lib/api/reviews.js`; duplicated active UI rendering across table/dashboard, drawer quick actions, and reviewer shortcut cells; frontend-owned workflow notification side effects; optional frontend workflow note creation; and role/permission coupling in Smart Actions. No runtime files, migrations, permissions, workflow features, lifecycle behavior, lint, or build were changed.

Sprint 3B quarantines direct frontend order status writes outside approved workflow RPC paths. Deprecated generic status helpers in `ordersService`, `src/lib/api/orders.js`, `src/lib/utils/updateOrderStatus.js`, and `src/features/orders/actions.js` now throw before direct `orders.status` mutation, legacy arbitrary-status RPC calls, or fallback activity writes; `ordersService.updateOrder(...)` also rejects patches containing `status`. The CRUD source scan now blocks direct frontend `orders.status` update patterns and legacy status helper reachability outside quarantine files. Approved Smart Action orchestration through named service helpers and `rpc_transition_order_status(...)` is preserved, and no workflow feature, permission redesign, status model redesign, UI expansion, lifecycle behavior, migration, or RLS change was added.

Sprint 3C consolidates approved workflow transition wrapper usage without changing workflow behavior. `ordersService.js` now owns the only direct frontend call to `rpc_transition_order_status(...)` through one internal transition RPC helper, while active Smart Actions, table/dashboard actions, drawer quick actions, and reviewer shortcuts continue to call named service helpers only. Service tests now assert the canonical RPC name, required payload fields, RPC error propagation, and absence of direct `orders.status` updates for approved helpers. The CRUD source scan also blocks direct `rpc_transition_order_status` reachability outside `ordersService.js`. No new workflow behavior, UI expansion, permission redesign, status model redesign, lifecycle change, migration, or RLS change was added.

Sprint 3D audits workflow activity and notification ownership as documentation-only inventory. `rpc_transition_order_status(...)` remains the backend-owned normal workflow status mutation boundary, while `tg_orders_audit_upd` owns the canonical `status_changed` activity row produced by the order update. Optional send-to-review/request-revisions notes are still frontend-orchestrated through `logNote(...)` / `rpc_log_event(...)` before the transition, and normal workflow notification fanout is still frontend service-owned through `emitNotification(...)` / `rpc_notification_create(...)` after the transition returns. Deprecated order notification trigger behavior is inert, duplicate legacy order activity trigger behavior remains disabled, and no clear duplicate active workflow activity/notification write bug was found. No runtime files, lint/build, migrations, permissions, UI, workflow behavior, lifecycle behavior, or RLS changed.

Sprint 3E inventories frontend-owned workflow note and notification orchestration without runtime changes. `UnifiedOrdersTable` remains the transitional source of optional `submit_to_review` resubmission notes and `request_revisions` revision notes through `logNote(...)` / `rpc_log_event(...)` before the status RPC. `ordersService` remains the transitional frontend fanout owner for `order.sent_to_review`, `order.sent_back_to_appraiser`, `order.review_cleared`, `order.ready_for_client`, and `order.completed` through `emitNotification(...)` / `rpc_notification_create(...)`; `request_final_approval` has no currently identified notification fanout. General order note notifications from `ActivityNoteForm` remain separate from status transition authority, while legacy review-field and generic activity/notification helpers remain compatibility seams. Future backend workflow notification or note ownership must replace these frontend emissions rather than duplicate them. No runtime files, lint/build, migrations, permissions, UI, workflow behavior, lifecycle behavior, or RLS changed.

Sprint 3F audits Smart Actions against the canonical workflow transition doctrine without runtime changes. The valid Smart Actions remain the six normal workflow transitions: `submit_to_review`, `request_revisions`, `approve_review`, `request_final_approval`, `ready_for_client`, and `complete`. Table/dashboard rendering and drawer quick actions use shared Smart Action descriptors or named `ordersService` helpers backed by `rpc_transition_order_status(...)`; reviewer shortcut actions still call canonical helpers but remain a duplicated transitional surface outside the shared renderer. The audit records that `request_final_approval` still has no identified notification fanout, and Sprint 3G later confirms that frontend resubmission visibility and backend transition enforcement both use `workflow.status.resubmit` when current status is `needs_revisions`. Archive, cancel, void, restore, reopen, unarchive, hard delete, and bulk status/lifecycle behavior remain outside Smart Actions. No runtime files, lint/build, migrations, permissions, UI redesign, workflow behavior, lifecycle behavior, or RLS changed.

Sprint 3G audits workflow transition permission semantics between frontend visibility and backend enforcement without runtime changes. The active canonical transition permissions are now documented as: `submit_to_review` from `new` / `in_progress` requires `workflow.status.submit_to_review`; resubmit from `needs_revisions` requires `workflow.status.resubmit`; `request_revisions` requires `workflow.status.request_revisions`; `approve_review` requires `workflow.status.approve_review`; both `request_final_approval` and `ready_for_client` require `workflow.status.ready_for_client`; and `complete` requires `workflow.status.complete`. Frontend Smart Action role checks remain visibility rules only, while backend current-company scope, readable/updateable order scope, and `rpc_transition_order_status(...)` permission checks remain authoritative. Reviewer shortcut actions still bypass shared descriptor rendering and remain a UI consolidation target. No runtime files, tests, lint/build, migrations, permission model redesign, UI redesign, workflow behavior, lifecycle behavior, or RLS changed.

Sprint 3H documents reviewer shortcut and duplicated workflow action surface doctrine without runtime changes. Table/dashboard Smart Actions are the primary normal workflow surface for Send/Resubmit to Review, Request Revisions, Clear Review, Request Final Approval, Mark Ready for Client, and Mark Complete. Drawer quick actions are acceptable contextual duplicates while they use shared Smart Action descriptors and canonical service helpers. `ReviewerActionCell` remains a transitional duplicate for Request Revisions and Clear Review because it calls canonical helpers but bypasses the shared descriptor renderer; it should eventually merge into shared descriptors or be removed from active rendering. Request Final Approval, Ready for Client, and Complete remain table/dashboard-only in current UI, and Order Detail has no separate normal workflow action set. Archive, cancel, and void remain controlled Order Detail-only lifecycle actions and must not move into Smart Actions without a separate lifecycle design slice. No runtime files, lint/build, migrations, status/permission changes, UI redesign, workflow behavior, lifecycle behavior, or RLS changed.

Sprint 3I locks workflow mutation stabilization as substantially complete for the current product scope without runtime changes. Normal workflow status mutation is backend-owned by `rpc_transition_order_status(...)`; active frontend transition calls must use canonical `ordersService` helpers; direct frontend status writes, generic status helpers, bulk status helpers, arbitrary status adapters, and freeform status UI remain quarantined or source-scan blocked. Smart Actions are the primary workflow surface, drawer actions remain transitional contextual duplicates, and lifecycle actions remain Order Detail-only. Backend workflow mutation and `status_changed` audit activity are authoritative, while frontend review/revision notes and workflow notifications remain transitional orchestration only. Deferred cleanup remains backend-owned workflow notifications, backend-owned review/revision notes, reviewer shortcut consolidation, `request_final_approval` notification fanout and permission semantics, and future explicit History/Admin readback surfaces. No runtime files, tests, lint/build, migrations, status/permission changes, UI redesign, workflow behavior, lifecycle behavior, or RLS changed.

Sprint 4A inventories order assignment mutation paths as documentation-only CRUD stabilization. `docs/ORDER_ASSIGNMENT_MUTATION_AUDIT.md` separates internal order participant assignment (`orders.appraiser_id`, `orders.assigned_to`, `orders.reviewer_id`, `orders.current_reviewer_id`) from cross-company assignment packets (`order_company_assignments`). Cross-company packet lifecycle mutations are backend-owned through `rpc_order_company_assignment_*` RPCs with assignment-scoped activity and notifications; packet access does not grant canonical order/client visibility and does not write owner-company participant columns. Internal participant assignment remains mixed: routed create/edit flows use order create/update RPCs plus assignment target trigger validation, `rpc_assign_order(...)` is a guarded compatibility RPC for `assigned_to`, and deprecated direct helper seams in `ordersService.js` / `src/lib/api/orders.js` remain future quarantine and source-scan candidates. No runtime files, tests, lint/build, migrations, workflow behavior, lifecycle behavior, assignment feature behavior, permission changes, UI redesign, or RLS changed.

Sprint 4B quarantines deprecated direct internal assignment helper paths while preserving approved assignment behavior. `ordersService.assignParticipants(...)`, `assignAppraiser(...)`, `assignReviewer(...)`, and `updateAssignees(...)` now throw `Order assignment changes must use backend-owned assignment/order RPCs.` before any direct `orders` mutation. `src/lib/api/orders.js#assignAppraiser(...)` and `bulkAssignAppraiser(...)` now throw the same quarantine error. Approved order create/edit RPCs, guarded compatibility `rpc_assign_order(...)`, and `rpc_order_company_assignment_*` packet lifecycle RPCs are unchanged. The CRUD source scan now blocks explicit frontend `orders` participant-column insert/update/upsert calls and keeps legacy internal assignment helper reachability confined to quarantined files. Tests cover the throwing stubs. No new assignment UI, assignment packet behavior, workflow/lifecycle behavior, permission model change, migration, or RLS change was added.

Sprint 4C documents and tests the approved assignment mutation paths without behavior changes. `docs/ORDER_ASSIGNMENT_MUTATION_AUDIT.md` now records the fields, permissions/scope assumptions, activity behavior, notification behavior, and canonical/transitional status for order create assignment, order edit participant assignment, guarded `rpc_assign_order(...)`, and cross-company assignment packet lifecycle RPCs. Nearby tests now assert `createOrderViaRpc(...)` and `updateOrderViaRpc(...)` carry participant fields only through order RPCs, `assignOrder(...)` calls only guarded `rpc_assign_order(...)`, and assignment packet helpers call only `rpc_order_company_assignment_*` RPCs. Source-scan tests continue to block explicit direct frontend participant-column writes and active legacy helper usage outside quarantine files. No new assignment UI, RPC, packet behavior, workflow/lifecycle behavior, permission change, migration, or RLS change was added.

Sprint 4D audits assignment activity and notification ownership without behavior changes. Internal order create/edit participant side effects are backend trigger-owned: order insert writes `order_created`, appraiser/reviewer updates write `assignee_changed`, and appraiser insert/update emits `order.new_assigned` or `order.reassigned` notifications. The guarded `rpc_assign_order(...)` compatibility path owns only its transitional `assigned_to` activity row and has no notification fanout. Cross-company assignment packet lifecycle side effects remain backend RPC-owned through `log_order_company_assignment_event(...)` and `notify_order_company_assignment_event(...)`, with `assignment.started` intentionally activity-only. No active duplicate activity/notification bug was found. Deferred cleanup remains reviewer assignment notification doctrine, `assigned_to` fanout semantics, and any future dedicated participant assignment RPC side-effect ownership decision.

Sprint 4E locks assignment mutation stabilization as substantially complete for the current product scope without behavior changes. Order create/update participant assignment remains RPC-owned through `rpc_create_order(...)` and `rpc_update_order(...)`; direct frontend participant-column writes are quarantined or source-scan blocked; canonical assignment mutation paths are documented in `docs/ORDER_ASSIGNMENT_MUTATION_AUDIT.md`; cross-company assignment packet lifecycle remains backend-owned through `rpc_order_company_assignment_*`; deprecated assignment helpers remain quarantined; and assignment activity/notification ownership is explicitly split between order triggers, the transitional `rpc_assign_order(...)` path, and packet lifecycle RPCs. Deferred cleanup remains dedicated participant assignment RPC design, reviewer assignment notification doctrine, `assigned_to` compatibility-path retirement, unified participant assignment side-effect ownership, and future assignment History/Admin surfaces if product needs them.

Sprint 5A inventories activity event ownership without behavior changes. `docs/ACTIVITY_EVENT_OWNERSHIP_AUDIT.md` separates trigger-owned order activity, backend RPC-owned lifecycle/document/order-number events, frontend-orchestrated notes, transitional review/activity wrappers, disabled duplicate legacy triggers, and assignment-scoped packet activity. Normal order create/update/workflow activity remains owned by `trg_orders_audit_ins` / `trg_orders_audit_upd`; archive/cancel/void, order-number override, and document upload/archive activity remain backend RPC-owned; notes remain frontend-orchestrated through guarded `rpc_log_event(...)`; and cross-company assignment packet activity remains in `order_company_assignment_activity`. No severe active duplicate-write bug was found. Deferred cleanup remains backend-owned note/workflow orchestration if atomic notes are required, low-level activity wrapper quarantine, legacy review helper retirement, activity payload/actor normalization, `rpc_assign_order(...)` event-shape cleanup, and future direct activity source-scan hardening.

Sprint 5B inventories notification mutation and fanout ownership without behavior changes. `docs/NOTIFICATION_OWNERSHIP_AUDIT.md` records `rpc_notification_create(...)` as the guarded insert gate for frontend-created order-tied notifications, normal workflow and general note notifications as transitional frontend-orchestrated fanout through `emitNotification(...)`, internal appraiser assignment notifications as backend trigger-owned, and cross-company assignment packet notifications as backend RPC-owned through `notify_order_company_assignment_event(...)`. Lifecycle archive/cancel/void notifications, document upload/archive notifications, reviewer assignment notifications, `assigned_to` compatibility notifications, and `request_final_approval` fanout remain deferred doctrine gaps. No obvious duplicate-spam bug was found, and future backend notification ownership must replace current frontend fanout rather than duplicate it.

Sprint 5C defines unified activity and notification ownership doctrine without behavior changes. `docs/ACTIVITY_NOTIFICATION_OWNERSHIP_DOCTRINE.md` now records that authoritative domain mutations should own durable activity and eventual notification fanout whenever possible; frontend-emitted activity or notification side effects are transitional unless explicitly product-approved; backend fanout must replace matching frontend fanout rather than duplicate it; payloads must be safe, minimal, and source-traceable; and authoritative actor attribution should come from backend app user/company context rather than arbitrary frontend strings. Priority future migrations are workflow notifications, review/revision notes, reviewer assignment notifications, lifecycle notification doctrine, document notification doctrine, and generic helper quarantine/source-scan hardening. No runtime files, tests, lint/build, migrations, workflow behavior, lifecycle behavior, assignment behavior, notification redesign, permission changes, UI, or RLS changed.

Sprint 5D creates a consolidated operational governance snapshot without behavior changes. `docs/OPERATIONAL_GOVERNANCE_SNAPSHOT.md` rolls up order retirement lifecycle, workflow mutation, assignment mutation, activity ownership, and notification ownership into a single reference covering authoritative mutation owners, approved frontend surfaces, quarantined/deprecated paths, source-scan protections, deferred/transitional items, and known future migrations. The snapshot also records current governance principles: backend-owned authoritative mutation, RPC-first operational writes, no direct frontend domain writes, preserved operational history, transitional frontend orchestration, source scans as an enforcement layer, explicit opt-in for historical surfaces, and no hidden lifecycle destruction. Major deferred areas remain backend notification migration, reviewer shortcut consolidation, participant assignment RPC unification, History/Admin surfaces, future multi-company operational isolation refinements, and eventual production cutover tasks. No runtime files, tests, lint/build, migrations, workflow behavior, lifecycle behavior, assignment behavior, notification redesign, permission changes, UI, or RLS changed.

Order Detail Print Packets are now recorded as a planned follow-on after Order Detail layout stabilization and before or alongside attachments/files work. Admin users need a safe print/export path for invoicing support, workfile/server documentation, internal admin records, and later dispute/audit review. Two read-only modes are planned: `Order Summary`, containing the operational overview only with no activity log, and `Order Audit`, containing the operational overview plus activity log. The likely first implementation should reuse already loaded order and activity data where possible, then evaluate whether a dedicated print route or PDF export is warranted. This planning note does not change app code, backend behavior, routes, permissions, RLS/RPCs, storage, activity visibility, or order mutation paths, and any future implementation must preserve existing authorization boundaries.

Next Phase Slice 1A plans the read-only Order Detail Print Packet feature without runtime changes in `docs/ORDER_DETAIL_PRINT_PACKET_PLAN.md`. The plan defines internal printable/shareable packets only, with no mutation controls, no new backend writes, no lifecycle/workflow/assignment behavior changes, no signed document downloads, no private file exposure beyond current user access, no new database tables, and no new RPCs for the first implementation. Likely packet sections include order summary, property/subject details, client/lender/borrower details where already authorized, assignment participants, key dates/deadlines, status/history summary, document/file metadata, activity timeline summary for audit mode, and notes/disclaimers. The recommended first implementation is a browser print stylesheet with a dedicated read-only preview component inside Order Detail; dedicated print routes and PDF export remain future options.

Next Phase Slice 1B implements the Order Detail Print Packet foundation. `src/features/orders/print/OrderPrintPacket.jsx` renders a read-only internal packet from currently loaded Order Detail data, and Order Detail now exposes a controlled `Print Packet` preview that uses browser-native `window.print()`. Initial packet content covers order summary, subject/property details, client and assignment participant summary, key dates, status/activity summary, and file count summary only. The slice does not add PDF generation, a print route, signed document downloads, backend APIs/RPCs, database tables, lifecycle/workflow/assignment behavior, activity writes, notification fanout, archived/history behavior changes, inline editing, or mutation controls. Focused tests cover print entry visibility, read-only packet rendering, browser print invocation, and absence of mutation actions from the packet.

Next Phase Slice 1C polishes the browser print packet layout without changing data scope or behavior. The packet now has a cleaner print header, status/lifecycle/file-count summary chips, compact print grids, section dividers, print-safe spacing, and page-break avoidance on major sections where browser support allows it. The active print preview uses a dedicated print surface so app navigation, footer, Order Detail action chrome, lifecycle/workflow buttons, preview controls, and other surrounding UI are hidden in print output. The slice adds no PDF generation, route, backend API/RPC, database table, signed URL behavior, document content exposure, new fetches, lifecycle/workflow/assignment behavior, activity writes, notification fanout, or mutation controls.

Next Phase Slice 1D reviews Print Packet data completeness without runtime changes. The review compares `OrderPrintPacket.jsx` against the current Order Detail read path (`useOrder(id)` -> `getOrder(id)` -> `v_orders_frontend_v4` -> `mapOrderRow(...)`) and records which additions are available now, which require a safe existing fetch, which require backend/API work, and which are privacy-sensitive exclusions. Safe future additions from existing loaded data include stronger retired lifecycle notices and possibly internal reference fields if product asks for them. Safe existing-fetch enhancements include compact document category counts or sanitized document metadata passed from the already loaded Files card. Deferred backend/API items include property identifiers, report use/purpose, borrower/lender expansion, completion/delivery dates, participant contact/company info, assigned-to display names, generated-by actor display, and real activity summaries. Signed URLs, file contents, storage internals, raw activity payloads, auth ids, permission keys, and company membership internals remain excluded.

Next Phase Slice 1E adds read-only retired lifecycle notices to the Order Detail Print Packet using only already loaded `is_archived` and `status` data. Archived packets now explain that the order was removed from active operational lists and preserved; cancelled packets explain that a legitimate order was stopped before completion and preserved; and voided packets explain that the order was administratively invalidated and preserved. The notices are print-safe and contain no action controls. The slice adds no new data fetches, backend APIs/RPCs, routes, signed URL behavior, file content exposure, PDF generation, workflow behavior, assignment behavior, activity writes, notification fanout, or lifecycle mutation behavior.

Next Phase Slice 1F adds read-only document category counts to the Order Detail Print Packet using only document rows already loaded for the compact Order Detail Files card. Order Detail now derives sanitized label/count pairs from existing document `category`, `document_type`, or `type` fields, with missing category/type data grouped as `Uncategorized`, and passes only those counts plus total file count into the packet. The packet does not render download links, signed URLs, storage paths, bucket names, file contents, upload controls, archive controls, or individual document access actions. The slice adds no new fetches, backend APIs/RPCs, routes, database tables, PDF generation, signed URL behavior, lifecycle/workflow/assignment behavior, activity writes, notification fanout, or mutations.

Next Phase Slice 1G closes out the Order Detail Print Packet as Falcon's first governed product expansion. The completed foundation is a read-only internal packet inside Order Detail with browser-native print, print isolation, order/property/client/participant/date/status/file summary sections, retired lifecycle notices, and document category counts derived only from already loaded data. The foundation remains intentionally non-authoritative: it has no signed URLs, download links, file contents, storage internals, upload/archive controls, workflow/lifecycle/assignment controls, inline editing, new fetches, backend APIs/RPCs, routes, database tables, PDF generation, activity writes, notification fanout, permission changes, or lifecycle/workflow/assignment behavior changes. Deferred enhancements are sanitized document metadata rows, a dedicated print route if needed, optional PDF export later, richer activity summaries or true audit mode, and a separately designed client-safe/external packet variant.

Historical/Admin Readback Slice 1A plans governed historical surfaces before implementation in `docs/HISTORICAL_ADMIN_READBACK_PLAN.md`. The plan defines the purpose as archived order visibility, cancelled/voided order visibility, operational audit/history review, admin recovery/reference workflows, and future historical reporting/search foundations. It locks strict rules: read-only by default, explicit opt-in query behavior only, active operational queues remain clean, no restore/reopen/unarchive, no lifecycle mutation actions initially, clear retired-state indicators, and no bypass of existing company/RLS/read scope. Likely future surfaces are an archived orders view, retired orders view, admin-only historical filters, historical Order Detail readback, and lifecycle timeline visibility. The recommended initial MVP is a simple read-only `Historical Orders` list that reuses existing order table patterns, explicitly opts into historical rows, and links to preserved-history Order Detail. Deferred items are restore/reopen flows, bulk historical actions, export/reporting, advanced audit analytics, cross-company admin views, and external/client history views. This slice is docs-only and adds no runtime surface, route, query whitelist, source-scan change, lifecycle behavior, mutation flow, backend API/RPC, activity write, or notification behavior.

Historical/Admin Readback Slice 1B adds the controlled read-only query foundation without exposing a UI route. `src/lib/api/orders.js` now exports `listHistoricalOrders(...)`, a dedicated low-level helper that reuses `fetchOrdersWithFilters(...)`, forces normal orders read scope, and explicitly opts into `includeArchived: true` plus `includeRetiredLifecycle: true` so archived, cancelled, and voided orders can be queried by a future approved historical surface. Active/default order list behavior remains unchanged and still excludes archived/cancelled/voided rows. Source-scan restrictions remain intact because the historical flags stay confined to approved low-level order readback files. Tests cover historical opt-in behavior, default active-list exclusion behavior, and absence of mutation RPC calls. The slice adds no UI route, nav item, restore/reopen/unarchive behavior, lifecycle mutation actions, table actions, backend/RPC/RLS change, migration, activity write, or notification behavior.

Historical/Admin Readback Slice 1C adds the first read-only Historical Orders page foundation. `src/pages/orders/HistoricalOrders.jsx` calls only `listHistoricalOrders(...)`, renders a simple historical list, clearly labels archived/cancelled/voided states, and links each row to existing `/orders/:id` preserved-history Order Detail readback. The route `/orders/historical` is protected by existing order read permissions, but no prominent navigation entry is added in this slice. The page deliberately does not reuse Smart Actions or active table action controls and renders no row actions, lifecycle buttons, restore/reopen/unarchive controls, workflow actions, assignment controls, or document download behavior. Tests cover helper usage, retired state labels, detail links, and absence of mutation/action controls. The slice adds no backend API/RPC/RLS change, migration, active-list behavior change, lifecycle behavior, activity write, notification fanout, or table action change.

Historical/Admin Readback Slice 1D defines conservative access and navigation doctrine for Historical Orders. The route `/orders/historical` remains protected by the same existing order read permissions as `/orders`, preserving current company/read scope and introducing no new permission, backend API, RPC, RLS policy, or active-list behavior. The page is discoverable through a secondary `Historical Orders` link on the active Orders page header, visually separated from the primary active queue and shown without counts or additional historical fetches. It is still not added to primary app navigation, dashboard widgets, or an equal-weight operational queue position. The slice adds no row actions, Smart Actions, archive/cancel/void controls, restore/reopen/unarchive behavior, workflow/assignment controls, signed URL behavior, lifecycle mutation, backend/RPC/RLS change, activity write, notification fanout, or active-list query change.

Historical/Admin Readback Slice 1E polishes the Historical Orders page without expanding behavior. The page now explicitly states it is read-only, explains that archived/cancelled/voided orders are preserved for internal history and reference, and clarifies that active orders remain in the normal Orders queue. It adds frontend-only state filters for `All historical`, `Archived`, `Cancelled`, and `Voided`, operating only on the already loaded `listHistoricalOrders(...)` rows with no new backend/API/RPC/RLS/query behavior. Tests cover explanatory copy, local filter visibility, detail links, and absence of mutation/action controls. The slice adds no row actions, Smart Actions, archive/cancel/void controls, restore/reopen/unarchive behavior, lifecycle mutation, workflow/assignment controls, document download, signed URL behavior, activity write, notification fanout, dashboard widget, active-list behavior change, or backend/RPC/RLS change.

Historical/Admin Readback Slice 1F closes out the initial Historical Orders readback feature without runtime changes. The completed foundation includes the dedicated `/orders/historical` route, read-only list, explicit `listHistoricalOrders(...)` query helper, archived/cancelled/voided state labels, frontend-only state filters, existing Order Detail preserved-history links, and conservative secondary entry from the active Orders page. The feature remains locked against row actions, Smart Actions, restore/reopen/unarchive, lifecycle mutation controls, backend API/RPC/RLS changes, active-list behavior changes, activity writes, notification fanout, dashboard widgets, and primary navigation promotion. Deferred future enhancements are server-side historical filtering/search, historical counts/KPIs, richer lifecycle timeline views, admin-only permission tightening if needed, restore/reopen/unarchive doctrine before implementation, exports/reporting, client-safe history views, advanced audit analytics, and any cross-company admin view under separate doctrine.

Dashboard Analytics Slice 1A plans governed operational KPI/dashboard metrics before implementation in `docs/DASHBOARD_ANALYTICS_PLAN.md`. Candidate KPIs are categorized as active operational metrics, historical metrics, admin-only metrics, or future analytics metrics. Active operational candidates include active order count, overdue orders, in-review backlog, appraiser workload, and reviewer workload. Historical candidates include cancelled/voided counts and future archived summaries through explicit historical sources. Future/admin analytics candidates include review turnaround, lifecycle trends, assignment load distribution, exports, scheduled reporting, cross-company analytics, and advanced BI/reporting. Governance rules require dashboards to remain read-only, respect company scope/RLS, keep active metrics free of hidden archived/cancelled/voided leakage, use explicit opt-in sources for historical metrics, and avoid direct mutation coupling. The recommended first implementation is lightweight operational KPI cards that reuse existing order read paths and avoid expensive analytics pipelines. This slice is docs-only and adds no runtime dashboard change, backend API/RPC/RLS change, analytics backend redesign, mutation behavior, lifecycle behavior, activity write, or notification behavior.

Dashboard Analytics Slice 1B adds the first governed operational KPI card row to the active order dashboard. `DashboardPage` now renders read-only compact cards for `Active Orders`, `In Review`, `Needs Revisions`, and `Overdue Orders`. The values flow through existing dashboard read paths (`useDashboardSummary(...)`, `useDashboardKpis(...)`, and `fetchDashboardKpis(...)`) and `fetchDashboardKpis(...)` continues to read from `v_orders_active_frontend_v4`, keeping company/RLS scope authoritative and excluding archived/cancelled/voided rows from active metrics. Focused tests cover the card rendering, absence of action/link controls in the KPI row, and active-view-only KPI query behavior. The slice adds no backend analytics pipeline, new RPC, migration, dashboard-specific analytics contract, charting library, historical KPI, cross-company aggregate, mutation control, lifecycle/workflow behavior, activity write, notification fanout, or active-list behavior change.

Dashboard Analytics Slice 1C adds safe state drill links to supported operational KPI cards. `Active Orders` links to the existing `/orders` active queue, `In Review` links to `/orders?status=in_review`, and `Needs Revisions` links to `/orders?status=needs_revisions`, reusing the Orders page's existing status query support. `Overdue Orders` deliberately remains non-clickable because the current Orders table read path does not yet support a complete governed overdue filter from the page URL through `fetchOrdersWithFilters(...)`. Tests cover supported KPI card links, the read-only overdue card, and absence of mutation controls. The slice adds no backend analytics infrastructure, new RPC, migration, new overdue filter behavior, charting, historical/retired drill link, lifecycle/workflow behavior, mutation action, activity write, notification fanout, or active-list default behavior change.

Dashboard Analytics Slice 1D plans overdue order filtering before wiring the dashboard Overdue KPI drill link. The inventory confirms that `OrdersPage` already reads/writes `?due=...` as `dueWindow` and `OrdersFilters` already exposes an `Overdue` due option, but the active `UnifiedOrdersTable` -> `useOrders(...)` -> `fetchOrdersWithFilters(...)` path does not yet pass or implement `dueWindow=overdue`. The planned overdue definition uses non-null `final_due_date` before the current time/day boundary, aligned with the Dashboard KPI helper's `final_due_date < now` logic, and keeps archived/cancelled/voided rows out of active overdue filtering by default. Completed/historical overdue reporting remains separate from the active workload drill path. The recommended first implementation is a small read-path slice that wires the existing `due=overdue` URL state through the table hook into `fetchOrdersWithFilters(...)` with `final_due_date < now` plus non-null due date checks, preserving default Orders behavior when no due filter is present. This slice is docs/inventory only and adds no runtime filter behavior, Overdue KPI link, backend analytics redesign, RPC, migration, lifecycle/workflow behavior, mutation behavior, activity write, notification fanout, or historical leakage into active metrics.

Dashboard Analytics Slice 1E implements governed active Orders overdue filter support. The existing `?due=overdue` Orders page query state now reaches `fetchOrdersWithFilters(...)` through `OrdersPage`, `UnifiedOrdersTable`, and `useOrders(...)`. `fetchOrdersWithFilters(...)` applies `final_due_date < now` plus non-null `final_due_date` for `dueWindow: "overdue"` while preserving default archived and retired lifecycle exclusions, so archived/cancelled/voided rows do not leak into active overdue filtering. Default active Orders behavior remains unchanged when no `due` query is present. Tests cover URL filter propagation into the active Orders table filters, overdue final-due predicates, missing due-date exclusion, unchanged default behavior, and default retired lifecycle exclusion. The dashboard `Overdue Orders` KPI remains non-clickable until a separate drill-link slice. The slice adds no backend analytics redesign, new RPC, migration, charting, mutation behavior, workflow/lifecycle behavior, activity write, notification fanout, historical count, or retired-record drill path.

Dashboard Analytics Slice 1F enables the validated Overdue KPI drill link. The dashboard KPI cards now resolve to governed active Orders views: `Active Orders` -> `/orders`, `In Review` -> `/orders?status=in_review`, `Needs Revisions` -> `/orders?status=needs_revisions`, and `Overdue Orders` -> `/orders?due=overdue`. The overdue link uses the Slice 1E read path, which filters active Orders by non-null `final_due_date` before the current timestamp while preserving default archived/cancelled/voided exclusions. Tests cover the Overdue card as a link, its target URL, and absence of mutation controls. The slice adds no backend analytics redesign, new RPC, migration, charting, mutation behavior, workflow/lifecycle behavior, activity write, notification fanout, historical KPI, or retired-record drill path.

Dashboard Analytics Slice 1G closes out the initial KPI foundation without runtime changes. The completed foundation contains four compact active operational dashboard cards: `Active Orders`, `In Review`, `Needs Revisions`, and `Overdue Orders`, with governed drill links to `/orders`, `/orders?status=in_review`, `/orders?status=needs_revisions`, and `/orders?due=overdue`. The cards remain read-only, active-order-only metrics backed by existing dashboard/order read paths, preserving company scope, RLS, default archived/cancelled/voided exclusions, and no historical leakage. The foundation adds no mutations, workflow/lifecycle behavior, activity writes, notification fanout, backend analytics pipeline, dashboard-specific RPC, migration, materialized view, charting, export, scheduled reporting, historical metric, or cross-company aggregate. Deferred analytics work remains workload cards, reviewer/appraiser queues, trend charts, historical metrics, lifecycle analytics, server-side analytics views if needed, and exports/reporting.

Workload Visibility Slice 1A plans governed workload visibility surfaces before implementation in `docs/WORKLOAD_VISIBILITY_PLAN.md`. The plan defines workload goals for appraiser workload awareness, reviewer workload awareness, operational bottleneck visibility, overdue concentration visibility, and assignment distribution visibility. Candidate metrics include active assignments per appraiser, in-review counts per reviewer, overdue counts by assignee, needs-revisions ownership, aging workload buckets, unassigned orders, and workload distribution imbalance, categorized as operational/live, historical, admin-only, or future analytics metrics. Governance rules require read-only visibility, authoritative company scope/RLS, active-order-only metrics by default, no hidden historical leakage, no employee scoring or punitive ranking semantics, and reuse of existing governed order read paths where possible. The recommended first implementation is lightweight workload cards or compact tables for current active assignments in a dashboard section with no charts. Deferred items are trend analytics, historical productivity metrics, SLA calculations, forecasting, staffing recommendations, cross-company benchmarking, server-side analytics views if needed, exports/reporting, and admin-only permission tightening. This slice is docs-only and adds no runtime behavior, workflow/lifecycle/assignment mutation, backend analytics redesign, route, UI, RPC, migration, activity write, notification fanout, or permission change.

Workload Visibility Slice 1B audits the existing governed read paths for lightweight workload visibility without runtime changes. `v_orders_active_frontend_v4` is the safest first workload source because it already backs dashboard KPI counts and dashboard active order rows through `fetchDashboardKpis(...)`, `useDashboardKpis(...)`, `useDashboardSummary(...)`, and `useOrdersSummary(..., { scope: "dashboard" })`. `fetchOrdersWithFilters(...)` already selects the active order fields needed for first-pass workload grouping: status, archive flag, final due date, appraiser id/name, and reviewer id/name, while preserving default archived/cancelled/voided exclusions. The audit classifies active assignments per appraiser, in-review counts per reviewer, unassigned order count, and needs-revisions ownership as safely derivable from existing active order reads with lightweight frontend aggregation; overdue-by-assignee is possible but wording-sensitive and should either be deferred or presented only as neutral coordination context; aging buckets and workload distribution imbalance remain deferred because they need stronger semantics or admin-only design. Assignment packet RPC dashboards remain assignment-native and should not be blended into canonical order workload metrics without a separate design slice. The recommended first implementation remains a compact dashboard workload section using active operational rows only, with no historical metrics, employee scoring/ranking, backend analytics pipeline, mutations, workflow/lifecycle/assignment behavior, route, UI, RPC, migration, activity write, notification fanout, or permission change in this docs/inventory slice.

Workload Visibility Slice 1C adds the first lightweight dashboard workload visibility section using existing active dashboard order rows only. `DashboardPage` now derives compact read-only cards from already loaded `ordersRows`: `Assigned Work` groups active appraiser-owned `new`, `in_progress`, and `needs_revisions` rows by appraiser; `Review Queue` groups active `in_review` rows by reviewer; `Unassigned Active` counts active appraiser-work rows missing an appraiser plus active review rows missing a reviewer; and `Revision Follow-Up` groups active `needs_revisions` rows by appraiser. The derivation explicitly ignores archived, completed, cancelled, and voided rows even though the dashboard read path should already be active-only. Tests cover section rendering, expected derived values, retired-row exclusion, empty states, and absence of mutation/action controls in the workload section. The slice adds no backend analytics redesign, new RPC, view, migration, materialized view, charting, route, historical metric, employee scoring/ranking semantics, mutation behavior, workflow/lifecycle behavior, assignment mutation behavior, activity write, notification fanout, document behavior, or permission change.

Workload Visibility Slice 1D adds safe workload drill links only where existing Orders filters already support the target route. `Review Queue` links to `/orders?status=in_review`, `Unassigned Active` links to `/orders?queue=unassigned_orders`, `Revision Follow-Up` links to `/orders?status=needs_revisions`, assigned appraiser workload rows link to `/orders?appraiserId=<appraiser-id>`, and revision follow-up appraiser rows link to `/orders?status=needs_revisions&appraiserId=<appraiser-id>`. Reviewer-specific workload rows remain read-only because the Orders page does not currently support a general `reviewerId` URL filter. Tests cover supported workload links, unsupported reviewer rows remaining read-only, and absence of mutation controls/actions. The slice adds no new Orders filters, incomplete query params, backend analytics redesign, RPC, view, migration, materialized view, charting, historical metric, scoring/ranking semantics, mutation behavior, workflow/lifecycle behavior, assignment mutation behavior, activity write, notification fanout, document behavior, route change, or permission change.

Workload Visibility Slice 1E closes out the initial workload visibility foundation without runtime changes. The completed foundation is a read-only `DashboardPage` workload section derived from existing active dashboard order rows only, with `Assigned Work` for appraiser workload awareness, `Review Queue` for active review queue visibility, `Unassigned Active` for dispatch visibility, and `Revision Follow-Up` for active needs-revisions ownership. Safe drill links remain limited to existing supported Orders filters: `/orders?status=in_review`, `/orders?queue=unassigned_orders`, `/orders?status=needs_revisions`, `/orders?appraiserId=<appraiser-id>`, and `/orders?status=needs_revisions&appraiserId=<appraiser-id>`. Reviewer-specific drill links remain deferred until a general reviewer Orders URL filter is supported end to end. The locked guardrails are active operational rows only, no archived/completed/cancelled/voided or historical leakage, no mutations, no workflow/lifecycle/assignment changes, no ranking/scoring/performance semantics, no backend analytics pipeline, no new RPCs/views, and authoritative company scope/RLS through existing read paths. Deferred future work remains reviewer-specific Orders filter support, overdue-by-assignee, workload aging buckets, charts/trends, staffing/forecasting, and server-side analytics views or RPCs only if active-row frontend aggregation becomes insufficient.

Operational UX Slice A1 plans reviewer-specific Orders filtering before enabling dashboard review workload row drill links. The inventory confirms existing Orders URL/filter support for `status`, `appraiserId`, `queue`, and `due`, while `reviewerId` is not currently read, written, seeded, or preserved by the public `Orders.jsx` URL path. Low-level read support already exists: `fetchOrdersWithFilters(...)` selects `reviewer_id` and `reviewer_name`, accepts `reviewerId`, applies it as `reviewer_id`, and preserves default archived/cancelled/voided active-list exclusions. The desired behavior is `/orders?reviewerId=<id>` for reviewer-owned active Orders and `/orders?status=in_review&reviewerId=<id>` for reviewer-owned active review queue drill links. The recommended implementation is to extend the existing Orders filter chain by adding `reviewerId` to URL read/write behavior, `UnifiedOrdersTable` filter seeding, and the normal `useOrders(...)` filter payload, while keeping `fetchOrdersWithFilters(...)` as the read authority. A manual reviewer filter control can remain optional; the first requirement is safe URL support for dashboard drill links. This planning slice adds no runtime behavior, reviewer drill-link activation, backend API/RPC/view/migration, analytics pipeline, mutation behavior, workflow/lifecycle behavior, assignment mutation, activity write, notification fanout, historical leakage, charting, export, report, route change, or permission change.

Operational UX Slice A2 wires governed reviewer-specific Orders filtering through the existing Orders read path. `Orders.jsx` now reads and writes `?reviewerId=<id>` alongside existing `status`, `appraiserId`, `clientId`, `due`, `queue`, search, page, and page-size query parameters. `UnifiedOrdersTable` seeds `reviewerId` as a normal filter, `useOrders(...)` passes it through to `fetchOrdersWithFilters(...)`, and the existing low-level read helper applies it as `reviewer_id` while preserving default archived/cancelled/voided active-list exclusions. The supported reviewer views are now `/orders?reviewerId=<id>` and `/orders?status=in_review&reviewerId=<id>`. Dashboard `Review Queue` workload rows now link to reviewer-specific active review queue views. Tests cover reviewerId URL parsing, reviewer filter propagation through the read helper, dashboard reviewer workload drill links, and unchanged default Orders filter behavior. The slice adds no backend API/RPC/view/migration, analytics pipeline, mutation behavior, workflow/lifecycle behavior, assignment mutation, activity write, notification fanout, historical metric/leakage, charting, export, report, permission change, ranking/scoring semantics, or new manual filter control.

Operational UX Slice A3 closes out workload drill-link behavior without runtime changes. Reviewer-specific workload drill links are now complete: reviewer workload rows link to `/orders?status=in_review&reviewerId=<id>`, appraiser workload rows remain linked to `/orders?appraiserId=<id>`, revision follow-up appraiser rows remain linked to `/orders?status=needs_revisions&appraiserId=<id>`, Review Queue remains linked to `/orders?status=in_review`, Revision Follow-Up remains linked to `/orders?status=needs_revisions`, and Unassigned Active remains linked to `/orders?queue=unassigned_orders`. The locked guardrails are active operational rows only, no hidden historical leakage, no backend API/RPC/view/migration/analytics pipeline, no mutation behavior, no workflow/lifecycle/assignment changes, and no ranking/scoring semantics. Deferred workload UX/analytics items remain optional manual reviewer filter controls, overdue-by-assignee, workload aging buckets, trend charts, and server-side workload analytics only if active-row frontend aggregation and existing Orders filters become insufficient.

Operational UX Slice B1 audits current Orders filtering/search capabilities without runtime changes in `docs/OPERATIONS_FILTERING_AUDIT.md`. The audit maps the active `Orders.jsx` -> `OrdersFilters` -> `UnifiedOrdersTable` -> `useOrders(...)` -> `fetchOrdersWithFilters(...)` chain and classifies `status`, `q` search, `clientId`, `appraiserId`, `reviewerId`, `due=overdue`, page, and page size as fully wired active read filters. `queue` is documented as frontend-only over governed active rows loaded through `useOrdersSummary(...)` and `orderHasQueue(...)`. `priority`, `due=this_week`, and `due=next_week` are documented as partial/transitional because visible controls or legacy helpers exist without complete current active-table predicate support in `fetchOrdersWithFilters(...)`. Hidden/internal filters include `assignedAppraiserId`, `inspectedAwaitingReport`, `finalDueWithinDays`, `from`/`to`, `mode`, `scope`, `rowsOverride`, and restricted historical flags `includeArchived` / `includeRetiredLifecycle`. Recommended first UX improvements are active-filter chips, a unified clear-filters action, and reconciling visible controls with implemented predicates before saved queries. This slice adds no runtime behavior, backend analytics redesign, RPC, view, migration, materialized view, mutation behavior, workflow/lifecycle behavior, assignment mutation, activity write, notification fanout, permission change, or historical leakage into active defaults.

Operational UX Slice B2 plans governed active-filter visibility for the Orders page without runtime changes in `docs/OPERATIONS_FILTERING_AUDIT.md`. The planned UX is a compact chip/token row above the Orders table generated only from URL/query-backed active filter state: `status`, `q`, `clientId`, `appraiserId`, `reviewerId`, `due`, and `queue`. The goal is to make filtered queues immediately understandable after navigation or refresh, especially dashboard and workload drill links such as `/orders?status=in_review&reviewerId=<id>`, `/orders?appraiserId=<id>`, and `/orders?status=needs_revisions&appraiserId=<id>`. Removable chips should clear only their own query parameter and reset `page` to `0`; a unified `Clear filters` affordance should clear active URL-backed filters without creating saved views or hidden local-only state. Pagination remains table behavior rather than operational filter meaning. Guardrails require active operational rows only, no historical/admin leakage into active defaults, no mutations, no workflow/lifecycle/assignment behavior, no backend analytics pipeline, no new RPC/view, and no saved views yet. Transitional risks to resolve before implementation are `queue` frontend-only semantics, visible-but-partial `due=this_week` / `due=next_week`, current `priority` predicate mismatch, and future historical/admin filters needing separate visual treatment.

Operational UX Slice B3 implements the first governed active-filter chips foundation for the Orders page. `Orders.jsx` now renders a compact active-filter chip row above the Orders table when supported URL/query-backed filters are present. Initial chips cover `status`, `q`, `clientId`, `appraiserId`, `reviewerId`, `due`, and `queue`; chips are derived strictly from existing Orders page filter state and are removed through the existing `onChange(...)` / `writeFilters(...)` path so page reset behavior remains consistent. `Clear Filters` clears the supported active filter set while preserving existing page-size behavior. Queue chips are labeled as derived because queue filtering remains frontend-only over governed active rows, and transitional due values such as `this_week` / `next_week` are labeled transitional if present. Unsupported hidden/internal filters, `priority`, and historical/admin opt-in flags are not exposed as chips. Tests cover chip rendering from URL state, chip removal, clear-filters behavior, and unchanged default Orders behavior. The slice adds no backend/API/RPC/view/migration change, filter redesign, saved views, mutation behavior, workflow/lifecycle behavior, assignment mutation, backend analytics pipeline, or historical leakage into active defaults.

Operational UX Slice B4 closes out the active-filter chip foundation without runtime changes. The locked behavior is URL/query/filter-state-derived chips for `status`, `q`, `clientId`, `appraiserId`, `reviewerId`, `due`, and `queue`; chip removal updates Orders URL/filter state through the existing filter write path; `Clear Filters` resets supported active filters; page size is preserved; page reset continues through the existing filter-change path; queue chips remain labeled as derived; transitional due values remain labeled transitional; and historical/admin flags, hidden/internal filters, unsupported filters, and `priority` are not exposed as chips. Deferred filter UX work is reconciling `due=this_week` and `due=next_week`, deciding the `priority` filter direction, adding richer assignee/client labels where safe, and separately designing saved views, filter presets, and historical/admin filter chips. This closeout adds no runtime behavior, backend/API/RPC/view/migration change, filter redesign, saved views, mutation behavior, workflow/lifecycle behavior, assignment mutation, backend analytics pipeline, or historical leakage into active defaults.

Saved Views Slice 1A plans governed saved operational views/presets before implementation in `docs/SAVED_VIEWS_PLAN.md`. Saved views are defined as read-only navigation presets over existing Orders URL/query state so users can quickly return to common operational queues, reduce repetitive filtering/navigation, and preserve governed query/filter behavior. The likely allowlisted state is `status`, `due`, `q`, `appraiserId`, `reviewerId`, and derived `queue`; applying a view should reset page position, page-size behavior should remain existing table/user behavior unless deliberately productized, and historical/admin flags remain deferred. Governance requires saved views to use existing governed Orders filters only, keep URL/query state canonical, expose no hidden filters, bypass no permissions/RLS/current-company scope/active-list exclusions, store no arbitrary backend predicates or query fragments, and add no mutation behavior. The first MVP recommendation is user-scoped views only, with lightweight local persistence first or a lightweight backend table later depending on implementation audit; no shared team views, admin/global presets, dashboard-linked views, historical/admin presets, pinned queues, or alerting/subscriptions initially. This slice is docs-only and adds no runtime behavior, backend/API/RPC/schema/RLS change, mutation behavior, filter redesign, saved-view sharing, permission change, or historical leakage into active defaults.

Saved Views Slice 1B audits persistence options before implementation in `docs/SAVED_VIEWS_PLAN.md`. Active local persistence is limited to `Settings.jsx` theme storage under `falcon.theme`; no active saved queue, saved filter, or operational view local persistence pattern was found. Current user/profile persistence is backend-owned through `rpc_current_user_settings_get` / `rpc_current_user_settings_update`, while notification preferences use `rpc_notification_prefs_ensure` / `rpc_notification_prefs_get` / `rpc_notification_prefs_update`; existing JSON preference/settings fields such as `notification_prefs.categories`, company settings JSON, and relationship settings JSON are domain-specific and should not become generic saved-view containers. The audit compares local-only saved views against backend user-scoped saved views across governance consistency, multi-device usability, complexity, migration risk, company scoping, future shared/admin views, and production readiness. The recommended first production MVP is backend user/company-scoped saved views with explicit storage, narrow RPC/API wrappers, backend allowlist validation, and URL/query state remaining canonical; local-only persistence is acceptable only for a throwaway prototype or temporary spike. Saved payloads must contain governed active Orders filters only and must exclude hidden/internal flags, raw SQL/query fragments, arbitrary predicates, mutation state, and historical/admin flags initially. This slice is docs/inventory-only and adds no runtime behavior, backend schema/RPC/API/RLS change, saved-view implementation, filter redesign, mutation behavior, permission change, or historical leakage into active defaults.

Saved Views Slice 1C designs the backend saved views schema and RPC contract before implementation in `docs/SAVED_VIEWS_PLAN.md`. The proposed table is `order_saved_views` with `id`, `company_id`, `user_id`, `name`, `filters`, optional `sort_order`, reserved `is_default`, `created_at`, and `updated_at`. The strict initial filter allowlist is `status`, `q`, `clientId`, `appraiserId`, `reviewerId`, `due`, `queue`, and maybe `pageSize` if product decides page size is saved presentation state; `page`, hidden/internal filters, `priority` until governed, raw SQL/query fragments, arbitrary predicates, mutation state, and historical/admin flags are rejected. The proposed RPCs are `rpc_order_saved_views_list()`, `rpc_order_saved_view_create(p_name text, p_filters jsonb)`, `rpc_order_saved_view_update(p_view_id uuid, p_name text, p_filters jsonb)`, and `rpc_order_saved_view_delete(p_view_id uuid)`, with a default setter deferred unless clean one-default-per-user/company enforcement is included later. Backend validation must require authenticated current app user, current company context, active membership, row ownership for update/delete, and allowlisted payload shapes only. Security direction is RPC-owned CRUD, RLS enabled, no direct frontend table access, user/company scoping, and no authorization bypass for Orders reads. This slice is docs/design-only and adds no migration, runtime behavior, UI, backend schema/RPC/API/RLS change, saved-view implementation, filter redesign, mutation behavior, permission change, or historical leakage into active defaults.

Saved Views Slice 1D implements the backend-only saved views schema and RPC foundation in `supabase/migrations/20260522090000_order_saved_views.sql`. The migration adds `public.order_saved_views` with `id`, `company_id`, `user_id`, `name`, `filters`, `sort_order`, `is_default`, `created_at`, and `updated_at`; enables RLS; revokes direct `public` / `anon` / `authenticated` table access; and keeps normal browser access RPC-owned only. It adds `order_saved_view_validate_filters(p_filters jsonb)` to require a JSON object and accept only `status`, `q`, `clientId`, `appraiserId`, `reviewerId`, `due`, `queue`, and `pageSize`, while rejecting `page`, historical/admin flags, hidden/internal keys, `priority` until governed, unknown keys, non-object filters, and mutation/query-fragment state by omission. The RPCs `rpc_order_saved_views_list()`, `rpc_order_saved_view_create(p_name text, p_filters jsonb)`, `rpc_order_saved_view_update(p_view_id uuid, p_name text, p_filters jsonb)`, and `rpc_order_saved_view_delete(p_view_id uuid)` require authenticated current app user, current company context, active current-company membership, and user/company ownership for update/delete, and are granted only to `authenticated`. This slice adds no frontend UI, frontend wrappers, Orders filter change, saved-view application behavior, order mutation behavior, activity write, notification fanout, permission change, or historical leakage into active defaults.

Saved Views Slice 1E adds isolated frontend saved-view API wrappers in `src/lib/api/orderSavedViews.js` without UI or saved-view application behavior. The wrappers are `listOrderSavedViews()`, `createOrderSavedView(name, filters)`, `updateOrderSavedView(viewId, name, filters)`, and `deleteOrderSavedView(viewId)`, and each calls only its corresponding backend RPC: `rpc_order_saved_views_list`, `rpc_order_saved_view_create`, `rpc_order_saved_view_update`, and `rpc_order_saved_view_delete`. Focused tests cover RPC names and payloads, RPC error propagation, absence of `supabase.from("order_saved_views")`, and rejection of non-object filter payloads before create/update while keeping backend validation authoritative. The CRUD source scan now blocks direct frontend `order_saved_views` table access. This slice adds no UI, saved view dropdown, localStorage behavior, Orders page change, saved-view application behavior, backend migration, order mutation behavior, activity write, notification fanout, permission change, or historical leakage into active defaults.

Saved Views Slice 1F plans the first minimal Orders-page Saved Views UI before implementation in `docs/SAVED_VIEWS_PLAN.md`. The planned MVP is a compact secondary `Saved Views` dropdown or panel in the Orders filter/header area that lists personal saved views, applies a saved view by writing approved Orders URL/query state, saves the current filter state as a named view, and deletes a saved view. Update/rename and personal default saved views remain deferred unless rename is trivial during implementation. Saveable filters remain `status`, `q`, `clientId`, `appraiserId`, `reviewerId`, `due`, `queue`, and `pageSize` if product keeps it approved; `page`, hidden/internal filters, mutation state, and historical/admin flags remain excluded. The UI must use existing frontend wrappers only, keep URL/query state canonical, surface backend validation errors clearly, and add tests for list/apply/save/delete without creating sharing/team views. This slice is docs-only and adds no runtime behavior, UI implementation, backend change, Orders filter redesign, order mutation behavior, activity write, notification fanout, permission change, dashboard placement, or historical leakage into active defaults.

Saved Views Slice 1G implements the first minimal Orders-page Saved Views UI foundation. The Orders page header now exposes a compact secondary `Saved Views` control that loads personal saved views through `listOrderSavedViews()`, applies selected views by writing allowlisted filters into the existing Orders URL/query filter path, saves the current filter state through `createOrderSavedView(name, filters)`, and deletes views through `deleteOrderSavedView(viewId)`. Save payloads include only `status`, `q`, `clientId`, `appraiserId`, `reviewerId`, `due`, `queue`, and `pageSize`; unsupported filters, `page`, `priority`, hidden/internal filters, historical/admin flags, selected rows, pending actions, and mutation state are not persisted. Applying a view with unsupported returned keys surfaces an error and leaves the current Orders filters unchanged. Focused tests cover saved view load/render, apply behavior, create payloads, delete behavior, unsupported filter rejection, and absence of order mutation controls. This slice adds no backend change, direct table access, localStorage fallback, filter redesign, rename/edit behavior, default saved view, team/shared view, dashboard-linked view, historical/admin preset, order mutation behavior, activity write, notification fanout, permission change, or historical leakage into active defaults.

Saved Views Slice 1H closes out the first Saved Views foundation without runtime changes. The locked foundation includes backend user/company-scoped `order_saved_views` storage, RPC-owned saved-view CRUD, strict backend filter allowlist validation, frontend RPC wrappers, source-scan blocking for direct frontend table access, compact Orders-page UI, list/apply/save/delete behavior, URL/query-state application only, unsupported returned keys rejected, no localStorage fallback, no hidden filters, and no historical/admin presets. The governing doctrine is that saved views are read-only navigation presets, never order mutation surfaces; they do not bypass RLS, permissions, current company scope, active-list exclusions, or backend authorization; URL/query state remains canonical; and backend validation remains authoritative. Deferred work remains rename/edit, default saved view, team/shared views, admin/global presets, historical/admin saved views, dashboard-linked saved views, saved-view ordering/pinning, and alerting/subscriptions.

Document Experience Slice 1A plans the next governed document/files experience improvements in `docs/DOCUMENT_EXPERIENCE_PLAN.md` without runtime changes. The plan records the completed secure document foundation: private bucket, metadata model, signed download path, upload prepare/finalize flow, backend-owned archive, backend document activity logging, drag/drop upload UI, Files card inside Order Detail, and document category counts in the Print Packet. Candidate improvements include category/type display polish, metadata rows, uploaded-by/uploaded-at display, file size display, grouped document sections, document status chips, safer preview planning, expected document checklist planning, and packet/report-ready document summaries. The recommended first implementation is read-only metadata display polish in the Order Detail Files card, with category/type grouping only if already available and no preview/PDF/image rendering yet. Guardrails require no raw storage paths, no public file URLs, signed downloads only through approved paths, backend-owned archive, no automatic AI extraction, no content preview without separate design, no new mutation paths without backend RPC ownership, no backend/RPC/storage policy/signed URL changes, and no document mutation behavior.

Document Experience Slice 1B audits the existing Order Detail Files card data shape before UI polish in `docs/DOCUMENT_EXPERIENCE_PLAN.md` without runtime changes. The current card loads rows through `listOrderDocuments(orderId)` -> `rpc_order_documents_list(p_order_id)`, displays the latest five rows, and currently uses `title` / `file_name`, `category`, `created_at`, `file_size`, and `status === archived`. Downloads go through `createOrderDocumentDownloadUrl(document.id)` and the `order-document-download-url` Edge Function, while archive goes through `archiveOrderDocument(document.id)` -> `rpc_order_document_archive(...)`. The list RPC returns safe metadata including `uploaded_by_user_id`, `category`, `title`, `file_name`, `mime_type`, `file_size`, `visibility_scope`, `status`, `created_at`, and `updated_at`, but does not return storage bucket/path or signed URLs. Safe display fields are filename/title, category/type, uploaded/created date, formatted file size, archived state, and optionally MIME type; uploaded-by remains deferred because only a raw app user id is currently available. Fields that must not be exposed include raw storage paths, bucket/object keys, signed URL internals, private backend metadata, raw uploader UUIDs as display names, file contents, and previews. The first safe polish target is grouped rows by category/type, compact metadata display, clearer existing download/archive actions, and improved empty states.

Document Experience Slice 1C implements the first Order Detail Files card metadata polish using only already-safe document metadata. Visible rows are grouped by already returned category/type metadata with deterministic group labels and existing list order preserved inside each group. Rows now show title/file name, category/type chips, uploaded/created date, formatted file size, and archived state when available, with a clearer empty state and `Download` / `Archive` controls that continue to use the existing signed download and archive helper paths. Focused tests cover grouped rendering, row metadata, empty state, unsafe/internal field omission, and preserved download/archive controls. This slice adds no backend/API/RPC/view/migration change, storage policy change, signed URL change, upload flow change, preview/PDF/image rendering, AI extraction, checklist behavior, client sharing, new mutation path, activity write, notification fanout, permission change, or order mutation behavior.

Document Experience Slice 1D closes out the initial Order Detail Files card metadata polish without runtime changes. The locked foundation includes grouped rows by category/type, safe metadata-only display, display name from existing title/file name fields, uploaded date, formatted file size, archived state when available, the signed-download action renamed to `Download`, existing archive behavior preserved, and an improved empty state. Guardrails remain no raw storage paths, no bucket/object keys, no signed URL internals, no file contents/previews, no backend/API/RPC/storage policy changes, no upload flow changes, and no mutation expansion. Deferred document experience work remains secure previews, document checklist, AI extraction/review panel, packet export attachments, client-safe file sharing, document retention rules, and richer document metadata normalization.

Production Readiness Slice 1A audits Falcon's current production readiness before infrastructure or runtime changes in `docs/PRODUCTION_READINESS_AUDIT.md`. The audit records modern staging Supabase project `voompccpkjfcsmehdoqu` as the company-scoped validation reference, legacy hosted project `okwqhkrsjgxrhyisaovc` as the old non-company production/archive source, the current decision not to retrofit modern features into the legacy schema, and the future direction of a clean production cutover/project based on the modern staging architecture. Readiness areas are categorized as ready enough, needs verification, blocker before production cutover, or deferred post-MVP hardening across migration replay, project bootstrap, permissions/seeds, storage, Edge Functions, environment/secrets, Vercel alignment, rollback, backup/recovery, tenant/company bootstrap, admin/owner setup, and observability. The first recommended production-readiness track is migration replay/bootstrap checklist, environment parity checklist, seed/permission verification checklist, and storage/function deployment checklist. This slice is docs-only and adds no runtime behavior, migration, Supabase project change, Vercel/env/secret change, storage policy change, Edge Function deployment, or production data mutation.

Production Readiness Slice 1B creates the concrete migration replay and bootstrap validation checklist in `docs/PRODUCTION_MIGRATION_REPLAY_CHECKLIST.md`. The checklist is designed to prove the modern schema can replay cleanly into a fresh Supabase project, identify migration/order/storage/function blockers before production cutover, and document manual evidence steps. It covers prerequisites, local reset/replay, fresh project replay, migration order verification, extension assumptions, enum/check constraint verification, permission seed verification, owner/admin bootstrap, RLS, RPC signatures, storage bucket/policies, Edge Function deployment, smoke-test data setup, and rollback/failure handling. It explicitly records the known blocker that a prior local `supabase db reset` was blocked by a Supabase storage image pull issue, and that targeted `psql` replay worked for specific migrations but does not replace full reset or fresh-project replay validation. This slice is docs-only and adds no runtime behavior, migration, Supabase project change, storage policy change, Edge Function deployment, Vercel/env/secret change, or production data mutation.

Production Readiness Slice 1C creates the concrete environment parity checklist in `docs/ENVIRONMENT_PARITY_CHECKLIST.md`. The checklist covers local development, modern staging Supabase project `voompccpkjfcsmehdoqu`, future clean production Supabase project, legacy hosted project `okwqhkrsjgxrhyisaovc` as non-retrofit reference only, GitHub `main`, and Vercel deployment alignment. It records required parity across Supabase project refs, frontend environment variables, anon/service key handling, Edge Function deployment status, storage bucket/policy status, migration head/version, seed/permission parity, owner/admin bootstrap parity, allowed redirect URLs/auth settings, Vercel project/env alignment, branch/deployment expectations, and rollback/tag references. It also lists baseline tags `governance-baseline-v1`, `product-expansion-foundation-v1`, `operations-dashboard-foundation-v1`, `operational-ux-foundation-v1`, `operational-timeline-foundation-v1`, `saved-views-foundation-v1`, and `document-experience-foundation-v1`, with `document-experience-foundation-v1` called out for verification because it is not currently present in the local tag list. This slice is docs-only and adds no environment change, Supabase change, Vercel change, GitHub branch/tag change, migration, storage policy change, Edge Function deployment, runtime behavior, or production data mutation.

Production Readiness Slice 1D designs the future clean-production bootstrap sequence in `docs/PRODUCTION_BOOTSTRAP_PLAN.md` before implementation. The plan defines staged bootstrap order: create fresh Supabase project, apply migrations, verify extensions/enums/constraints, seed permissions/system rows, configure storage buckets/policies, deploy Edge Functions, configure auth/redirects, create first owner/company, verify admin bootstrap, connect Vercel production env, and smoke-test critical flows. It records dependency gates including migrations before seeds, storage before uploads, auth before login tests, owner bootstrap before operational testing, and Vercel production connection only after database/storage/functions/auth/admin bootstrap pass. Manual verification points cover RPC access, RLS behavior, file upload/download, workflow transitions, lifecycle actions, saved views, dashboard KPIs, historical orders, and print packets. Rollback expectations are environment recreation or traffic/env restoration rather than partial mutation, with git tag references and migration replay confidence required. This slice is docs-only and adds no live production project, Supabase/Vercel change, runtime behavior, migration, Edge Function deployment, storage policy change, env/secret change, Git tag change, or production data mutation.

Production Readiness Slice 1E creates the manual production smoke test checklist in `docs/PRODUCTION_SMOKE_TEST_CHECKLIST.md`. The checklist covers login/auth, current company context, owner/admin access, Team Access, Orders list, Order Detail, workflow transitions, lifecycle actions archive/cancel/void, Historical Orders, Print Packet, secure document upload/download/archive, activity timeline, notifications, Saved Views, dashboard KPIs, workload visibility, filtering/drill links, permission denial checks, and RLS/company isolation spot checks. Each section records test goal, basic steps, expected result, and failure notes/escalation. This slice is docs-only and adds no automated tests, runtime behavior, Supabase/Vercel/env/migration/storage/function change, production project change, or production data mutation.

Production Verification Slice 2A checks local migration replay status against the production readiness checklist. A local-only `supabase db reset` was attempted on branch `main` with Supabase CLI `2.101.0` and Docker `29.4.3`. The first attempt was blocked by local sandbox permissions writing `~/.supabase/telemetry.json`; after rerunning with local CLI filesystem approval, the reset reached database recreation and schema initialization but failed before full replay because Docker could not resolve `public.ecr.aws/supabase/storage-api:optimize-existing-functions-again`. Full local reset/replay therefore remains unvalidated, migration replay confidence remains a blocker before production cutover, and targeted `psql` replay remains fallback-only for specific reviewed migrations rather than proof of clean replay. The status is documented in `docs/PRODUCTION_MIGRATION_REPLAY_CHECKLIST.md` and `docs/PRODUCTION_READINESS_AUDIT.md`. This slice makes no staging, hosted legacy, future production, Vercel, environment variable, storage policy, Edge Function, schema, migration, or runtime change.

Production Verification Slice 2B captures concrete environment/version/tag evidence without changing environments. Local evidence records branch `main`, commit `a25a588251093b9c464a95ee41176faef572e80c`, `HEAD` tag `admin-invite-flow-polish-v1`, local tags through `admin-invite-flow-polish-v1`, Node `v22.16.0`, npm `10.8.0`, Supabase CLI `2.101.0`, Docker `29.4.3`, Vercel CLI `47.0.6`, a present `vercel.json`, and no local `.vercel` project-link directory. Read-only GitHub remote checks verify `origin/main` matches local `HEAD` and the local baseline/release tags are present on `origin`. Docs/repo configuration still identifies modern staging project `voompccpkjfcsmehdoqu`, legacy hosted project `okwqhkrsjgxrhyisaovc`, and the no-retrofit legacy decision; `vercel.json` still includes a CSP `connect-src` entry for the legacy hosted Supabase URL. Vercel deployment commit/env alignment remains requiring Vercel UI confirmation, and Supabase project settings/storage/functions/migration-head parity remain requiring Supabase dashboard confirmation. This slice updates `docs/ENVIRONMENT_PARITY_CHECKLIST.md` and `docs/PRODUCTION_READINESS_AUDIT.md` and makes no env var, Supabase, Vercel, production project, schema, storage, Edge Function, migration, runtime, or Git tag change.

Production Verification Slice 2C audits repository-local Vercel and env configuration without changing it. `vercel.json` still references legacy project `okwqhkrsjgxrhyisaovc` through CSP `connect-src`, which currently allows only `'self'` and `https://okwqhkrsjgxrhyisaovc.supabase.co` for Supabase network access; it does not include the modern staging host or future clean production host. The only repo-root env file found is `.env.local`, which defines `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; the URL target ref is `voompccpkjfcsmehdoqu`, and no secret values were printed or recorded. No local `.vercel` project-link directory exists. Vercel dashboard confirmation remains required for project linkage, deployed commit/tag, production/preview env vars, domains, headers/redirects, and Supabase Auth/CORS alignment. This slice updates `docs/ENVIRONMENT_PARITY_CHECKLIST.md` and `docs/PRODUCTION_READINESS_AUDIT.md` and makes no `vercel.json`, env var, Vercel dashboard, Supabase setting/project, runtime, schema, storage, Edge Function, migration, or production project change.

Production Verification Slice 2D verifies the local runtime environment without changing configuration or runtime code. The local Vite app was started at `http://127.0.0.1:5173/`; the first sandboxed start was blocked by local bind restrictions, and the approved local rerun started successfully. The served Vite app shell returned HTTP 200 for `/`, `/dashboard`, and `/orders`; served runtime modules resolved `VITE_SUPABASE_URL` to modern staging project ref `voompccpkjfcsmehdoqu`; active runtime source scans found no legacy hosted project ref in `src`, `public`, `index.html`, `package.json`, or `vite.config.*`; and a clean headless Chrome route/network check for `/dashboard` and `/orders` showed protected-route redirects to `/login` with nonblank sign-in UI and no Vite/React error overlay. No browser network/resource request to legacy project `okwqhkrsjgxrhyisaovc` was observed, and no mixed modern/legacy Supabase target behavior was found. Because the temporary browser profile had no authenticated session, authenticated dashboard/orders data loading remains a future staging-user smoke item. Local Vite does not apply the `vercel.json` CSP header, so the Slice 2C Vercel CSP mismatch remains a separate dashboard/deployment verification item. This slice updates `docs/ENVIRONMENT_PARITY_CHECKLIST.md` and `docs/PRODUCTION_READINESS_AUDIT.md` and makes no env var, `vercel.json`, Vercel dashboard, Supabase setting/project, runtime code, schema, storage, Edge Function, migration, CSP, or production project change.

Production Verification Slice 2E defines the exact Vercel dashboard verification checklist before touching deployed settings. The checklist covers project link/name, production deployment commit SHA, production branch, production domain, preview domain behavior, production and preview env var names only, production Supabase target classification, preview Supabase target classification, deployed custom headers/CSP behavior, and rollback/deployment history availability. It locks the evidence format as checked item, observed safe summary, status (`verified`, `mismatch`, or `needs decision`), and required follow-up. It explicitly forbids recording secret values, anon key values, service-role values, full env var values, or screenshots containing secrets/env values. The proposed next step is manual Vercel dashboard inspection and evidence capture only; do not change env vars, update CSP, change domains/settings, promote deployments, change Supabase settings/projects, or edit runtime code yet. This slice updates `docs/ENVIRONMENT_PARITY_CHECKLIST.md` and `docs/PRODUCTION_READINESS_AUDIT.md` and makes no Vercel, env var, Supabase, CSP, runtime, schema, storage, Edge Function, migration, or production project change.

Admin Onboarding Slice 1A plans the first governed admin/company onboarding and setup UX improvements in `docs/ADMIN_ONBOARDING_PLAN.md`. The plan defines goals for smoother first-owner setup, easier company/user onboarding, reduced manual configuration, clearer operational readiness, and safer permission/role setup. It reviews the current foundation of company-scoped memberships, Team Access, permissions, owner/admin hierarchy, invitation infrastructure, current company context, and onboarding/bootstrap docs. Candidate surfaces include a first-login owner checklist, company setup checklist, invite-team flow polish, missing configuration indicators, role/permission summaries, onboarding progress states, and operational readiness checks. The recommended first implementation is a lightweight owner/admin onboarding/readiness checklist with read-only indicators, no guided wizard, no multi-step setup flow, no setup automation, no permission redesign, and no mutation shortcuts that bypass RPC/Edge ownership. This slice is docs-only and adds no runtime behavior, backend change, permission/RLS change, route/UI change, invitation behavior change, onboarding automation, Supabase/Vercel/env change, or production data mutation.

Admin Onboarding Slice 1B designs the first lightweight operational readiness/onboarding checklist in `docs/ADMIN_ONBOARDING_PLAN.md` before implementation. Candidate checks are owner account exists, company profile configured, at least one appraiser/reviewer/admin added, Team Access reachable, permission seeds verified, storage/document system configured, order workflow operational, dashboard metrics operational, Saved Views available, Historical Orders accessible, and Print Packet operational. Checks are categorized as read-only informational, warning/attention state, future automated validation, or future onboarding automation. The recommended MVP is a lightweight read-only checklist card with no blocking wizard, no automated enforcement, no hidden setup actions, no backend onboarding automation, and no permission changes. Governance requires the checklist to reflect actual governed system state only, avoid fake readiness assumptions, avoid hidden permission escalation, and produce no mutation side effects from viewing the checklist. Future extensions include onboarding completion percentage, guided setup flows, role-specific onboarding, client onboarding readiness, and AMC/vendor onboarding readiness. This slice is docs-only and adds no runtime behavior, backend change, onboarding automation, permission/RLS change, route/UI change, Supabase/Vercel/env change, or production data mutation.

Admin Onboarding Slice 1C audits existing governed readiness data shapes before implementation in `docs/ADMIN_ONBOARDING_PLAN.md`. Existing usable signals include `rpc_current_user_app_context`, `current_app_user_permission_keys`, `rpc_company_setup_context`, `rpc_company_member_list`, invitation list RPCs, dashboard KPI/read hooks, saved-view RPC wrappers, Historical Orders readback helper, and Order Detail Print Packet rendering from an already authorized order. Truthful MVP fields available now are current company resolved, current membership valid, company profile configured, owner invariant and owner count, active member and role assignment counts, role preset and owner role readiness, current user role labels, selected permission affordance states, Team Access link availability, dashboard setup projection, setup blockers, and backend setup checklist entries. Role-specific appraiser/reviewer/admin staffing needs a member-list or derived read helper; permission seed completeness, storage/document system configuration, workflow health, saved-view availability, Historical Orders availability, and print packet availability either require a new read helper, backend validation, or manual/smoke validation later. Unsafe assumptions are explicitly blocked: do not claim storage is configured unless validated, do not claim permissions are fully seeded unless backend-verified, do not infer company readiness from login alone, and do not treat lack of orders, saved views, or historical orders as failure. This slice is docs/inventory-only and adds no runtime behavior, backend change, onboarding automation, permission/RLS change, route/UI change, Supabase/Vercel/env change, or production data mutation.

Admin Onboarding Slice 1D implements the first lightweight read-only Operational Readiness card as a dashboard secondary section for owner/admin users. The card uses existing governed read state only: current app/company context, dashboard summary role state, `users.read` and order-read permission hooks, existing setup context active-member count, loaded dashboard state, Orders/Historical Orders route availability, and authorized Order Detail availability for Print Packet. Initial checks are current company loaded, owner/admin access confirmed, Team Access reachable, at least one additional member exists, dashboard KPI system operational, Historical Orders reachable, Saved Views available, and Print Packet available. Unknown or optional states remain neutral, solo-owner operation and no orders are handled safely, and the card shows no fake completion score. Focused dashboard tests cover rendering, expected states, no mutation controls/actions, optional missing-member and no-order handling, unverified states, and owner/admin-only visibility. This slice adds no backend change, onboarding automation, permission/RLS change, mutation behavior, storage/document validation, production readiness validation, or fake readiness scoring.

Admin Onboarding Slice 1E closes out the first Operational Readiness card foundation without runtime changes. The locked foundation is an owner/admin-only dashboard card that is read-only/advisory, uses existing governed read state only, shows company context, owner/admin access, Team Access, additional-member state, dashboard KPIs, Historical Orders, Saved Views, and Print Packet readiness, keeps unknown/optional states neutral, has no score/gamification, no wizard/automation, no mutation buttons, and no backend/permission/RLS/storage/Supabase/Vercel changes. Guardrails require the card not to claim unverified production, storage, document, or permission-seed readiness; not to perform hidden setup actions; not to escalate permissions; and not to become a blocking onboarding flow without a separate guided setup design. Deferred work remains guided onboarding wizard, company setup checklist automation, role-specific onboarding, storage/permission/backend validation signals, client/AMC/vendor onboarding, setup completion tracking, onboarding emails/templates, billing, and subscription setup. This slice is docs-only and adds no runtime behavior, backend change, onboarding automation, permission/RLS change, route/UI change, Supabase/Vercel/env change, or production data mutation.

Admin Onboarding Slice 2A plans the next Team Access onboarding/admin UX improvements in `docs/ADMIN_ONBOARDING_PLAN.md` without runtime changes. The plan reviews the current foundation: user/member listing through company member RPCs, roles/permissions display, invitation infrastructure, owner/admin hierarchy, permission-based access, and company-scoped membership authority. UX goals are to make access obvious, clarify each person's role/function, show invitation/member status clearly, reduce owner/admin uncertainty, and support onboarding without permission confusion. Candidate improvements include clearer member status chips, role summary cards, invited versus active member sections, permission summary display, pending-invite next-step copy, owner/admin explanatory help text, and safer empty states. The recommended first implementation is read-only/status clarity polish only, with no new invite behavior, no role editing behavior changes, and no backend changes. Guardrails require no permission redesign, no hidden role escalation, all mutations staying on existing approved paths, no direct user/role table writes, company scope remaining authoritative, and owner/admin hierarchy remaining backend-governed. Deferred work remains guided invite wizard, role templates, bulk invites, onboarding email polish, permission diff views, audit trail for access changes, role-specific onboarding paths, and access review exports. This slice is docs-only and adds no runtime behavior, backend change, permission/RLS change, invite behavior change, role editing behavior change, Supabase/Vercel/env change, or production data mutation.

Admin Onboarding Slice 2B audits current Team Access data/read flows before UX polish in `docs/ADMIN_ONBOARDING_PLAN.md`. Active Team Access uses `rpc_company_member_list(...)` for member rows, `rpc_company_role_preset_list()` for role presets, and `rpc_company_member_invitations_list(...)` for invitation rows, with invite send/resend Edge paths and existing member/invitation mutation RPCs preserved. Safe member fields include identity/display fields, membership status/type, joined/auth-linked state, owner indicator, active role assignment labels, and backend-provided action booleans. Safe invitation fields include invite email, lifecycle status, role labels, inviter display name, timestamps, and backend-provided resend/cancel booleans. Existing role preset summaries include role name/description, owner/system/template flags, active assignment count, permission count, owner-only permission count, and `assignable_by_current_user`, but exact permission diff views and per-member effective permissions are not available. The audit identifies label risks around `Listed Members`, inline `primary` role labels, `Login linked`, Owner/Admin meaning, and prepared/sent/auth-failed invite states. Safe first-pass polish targets are clearer status chips, active versus inactive/invited grouping, improved invitation state/next-step copy, role description/help text, safer empty states, and owner/admin explanatory copy. Unsafe areas remain inferred permissions, frontend-generated role assumptions, hidden escalation paths, bypassing backend `can_*` booleans, direct user/role/invitation table writes, treating pending invites as active access, and exposing raw permissions/Auth ids/tokens/cross-company data. This slice is docs/inventory-only and adds no runtime behavior, backend change, permission/RLS change, invite flow change, role editing behavior change, Supabase/Vercel/env change, or production data mutation.

Admin Onboarding Slice 2C implements the first Team Access readability polish using existing governed member and invitation data only. The `/users` Team Access page now separates active rows under `Active Team Members`, shows non-active rows under `Inactive / Invited Members` when inactive rows are enabled, changes `Listed Members` to `Members Shown`, adds Owner/Admin emphasis chips, shows role primary markers separately, and adds a compact access summary derived only from active role assignment data. The invitation panel keeps `Pending Invitations` separate from active membership, adds next-step text for invitation statuses, improves empty state copy, and labels primary invite roles as `(primary)`. Existing member list, invitation list, invite send/resend, cancel, role update, deactivate, and reactivate paths remain unchanged and still use the existing governed APIs/RPCs/Edge Functions. Focused tests cover grouped rendering, status chips, Owner/Admin indicators, invitation status help, empty states, and no mutation API calls during readability rendering. This slice adds no backend change, permission/RLS change, invite workflow change, role editing redesign, hidden escalation, frontend-invented permission, onboarding automation, Supabase/Vercel/env change, or production data mutation.

Admin Onboarding Slice 2D closes out the Team Access readability/onboarding polish foundation without runtime changes. The locked foundation includes `Active Team Members` grouping, `Inactive / Invited Members` grouping when inactive rows are enabled, clearer Owner/Admin indicators derived from existing safe fields, separate role primary markers, compact access summaries derived from active role assignments, safer empty states, and improved Pending Invitations copy/status help text. Guardrails remain no permission changes, no role editing behavior changes, no invite flow changes, no hidden escalation, no frontend-invented permissions, company scope remains authoritative, backend `can_*` booleans remain action authority, and existing RPC/Edge paths remain the only approved member/role/invitation mutation paths. Deferred work remains guided invite wizard, role templates, bulk invites, onboarding email polish, permission diff views, audit trail for access changes, role-specific onboarding paths, access review exports, and deeper setup checklist automation. This slice is docs-only and adds no runtime behavior, backend change, permission/RLS change, invite workflow change, role editing behavior change, onboarding automation, Supabase/Vercel/env change, or production data mutation.

Admin Onboarding Slice 3A plans safer and clearer invite-flow UX improvements in `docs/ADMIN_ONBOARDING_PLAN.md` without runtime changes. The plan reviews the current invite foundation: company invitation infrastructure is Edge/RPC mediated, Team Access lists pending invitations, statuses distinguish `prepared`, `sent`, `auth_failed`, `accepted`, `cancelled`, and `expired`, invite creation uses assignable role presets plus primary-role selection, and inactive/invited membership handling plus acceptance remain backend-governed. UX goals are to reduce admin confusion, make invite state obvious, clarify what happens after send, reduce accidental role mistakes, improve first-owner confidence, keep pending invites distinct from active access, and make failure/resend guidance clear. Candidate improvements include clearer invite status chips, expiration/resent messaging from existing fields, invite success confirmation polish, role/primary-role help text, pending-member messaging, empty-state onboarding hints, and `what happens next` copy. The recommended first implementation is read-only/status/help-text polish only, with no invitation workflow redesign, no automated onboarding emails, no bulk invite behavior, and no backend/API/RPC/schema changes. Guardrails require no permission escalation, backend invitation ownership remaining authoritative, no direct role/member/user/invitation table writes, backend-governed acceptance, no hidden auto-activation, no invite bypasses, no frontend authorization authority, and no exact permission claims without authoritative reads. Deferred work remains invite resend flow redesign, invite expiration management, onboarding email templates, guided onboarding wizard, role templates, bulk/team onboarding, and invite audit trail UI. This slice is docs-only and adds no runtime behavior, backend change, permission/RLS change, invite behavior change, role assignment behavior change, acceptance behavior change, onboarding automation, Supabase/Vercel/env change, or production data mutation.

Admin Onboarding Slice 3B audits the current invitation/member onboarding data flow before invite UX polish implementation in `docs/ADMIN_ONBOARDING_PLAN.md`. The audit records that `CompanyInvitationsPanel` reads `rpc_company_member_invitations_list(...)`, `InviteCompanyMemberModal` reads assignable role presets and sends through `invite-company-member`, resend uses `resend-company-member-invite`, cancel uses `rpc_company_member_invitation_cancel(...)`, and acceptance uses `rpc_company_member_invite_accept(...)`. Safe invitation row fields are `invitation_id`, `invite_email`, `invitation_status`, `role_assignments`, `primary_role_id`, `invited_by_display_name`, `created_at`, `expires_at`, `auth_invite_sent_at`, `accepted_at`, `cancelled_at`, `can_cancel`, and `can_resend`. Authoritative states are `prepared`, `sent`, `auth_failed`, `accepted`, `cancelled`, and `expired`, with `open` and `terminal` filters mapped backend-side. The audit identifies ambiguity around `Prepared`, `Sent`, `Auth failed`, `Past/Terminal`, `Closed`, and role labels that do not explain exact permissions. Safe help text can explain waiting for acceptance, prepared/resend/cancel guidance, auth-failed attention, cancelled/expired replacement, primary-role meaning, and role descriptions from safe preset fields. Safe timestamps are created, expires, auth-invite-sent, accepted, and cancelled timestamps; expired rows can use `expires_at` because there is no separate `expired_at` projection. Expiration and resend support exist, but resend count/history, delivery receipts, recipient open/click tracking, and rich delivery diagnostics are not exposed. Safe polish targets are clearer pending chips, awaiting-acceptance messaging, role/primary-role copy, invite success next-step copy, safer empty states, and attention copy for failed/cancelled/expired states. Unsafe assumptions remain delivery success beyond known state, expiration/resend support beyond exposed fields, permissions before acceptance, onboarding completion from invitation existence, exact permissions from role names, staged inactive membership as active access, bypassing backend `can_*` flags, and exposing tokens/Auth ids/provider errors/raw metadata/cross-company invitation data. This slice is docs/inventory-only and adds no runtime behavior, backend change, permission/RLS change, invite behavior change, role assignment behavior change, acceptance behavior change, onboarding automation, Supabase/Vercel/env change, or production data mutation.

Admin Onboarding Slice 3C implements invitation readability polish using existing governed invitation/member state only. Invitation status chips now use owner-facing labels such as `Ready to send`, `Awaiting acceptance`, and `Needs attention`; sent invitations explain that access starts only after recipient acceptance; rows distinguish invited people as pending access, active after acceptance, or no active access based only on invitation status; role display states that role presets apply after acceptance; and timestamps include safer context labels for created, expiration deadline, backend send record, accepted, cancelled, or missing close timestamps. The invite modal now clarifies that invited people remain pending until acceptance, role labels describe intended access after acceptance while backend permissions remain authoritative, the primary role is the main role label shown after acceptance, and invite success copy states that access starts after recipient acceptance. Existing invite send/resend/cancel/list/acceptance paths remain unchanged. Focused tests cover invitation readability, status help, safe role copy, timestamp context, invite modal help text, empty states, and no mutation API calls during readability rendering. This slice adds no backend change, permission/RLS change, invite workflow change, resend behavior, expiration behavior, acceptance behavior, hidden activation/escalation, onboarding automation, Supabase/Vercel/env change, or production data mutation.

Admin Onboarding Slice 3D closes out the invitation/onboarding readability foundation without runtime changes. The locked foundation includes clearer invitation status chips, awaiting-acceptance semantics for sent invitations, safer role and primary-role explanation/help text, timestamp readability improvements, invite modal guidance, safer success messaging, and an explicit invited-versus-active distinction. Guardrails remain no invite workflow changes, no resend behavior changes, no expiration handling or management changes, no permission/RLS changes, no hidden activation or escalation, no frontend authority over access, and backend invitation ownership remains authoritative for listing, sending, resending, cancelling, and acceptance. Deferred work remains resend flow redesign, expiration management, onboarding email templates, invite audit trail UI, bulk invites, role templates, guided onboarding wizard, and any future delivery diagnostics or resend history. This slice is docs-only and adds no runtime behavior, backend change, permission/RLS change, invite workflow change, resend behavior, expiration behavior, acceptance behavior, onboarding automation, Supabase/Vercel/env change, or production data mutation.

Operational Timeline Slice 1A plans richer governed operational timeline surfaces before implementation in `docs/OPERATIONAL_TIMELINE_PLAN.md`. The plan defines the purpose as making Order Detail history easier to understand, visually unifying lifecycle, workflow, assignment, document, note, notification-relevant, and system/audit events, preserving audit integrity, and improving manager/appraiser/reviewer context without adding mutation behavior. Governance rules require timeline surfaces to remain read-only, use existing activity/order data only for the first pass, add no backend writes/RPCs/views/migrations, include no mutation controls inside timeline rows, display source/payload data safely and minimally, allow frontend categorization/formatting without inventing authoritative history, and keep backend activity as the source of truth. The recommended MVP is improving the existing Order Detail activity timeline with category chips or icons, compact chronological layout, clear event titles/descriptions, conservative fallback labels, actor/timestamp preservation, and safe payload rendering. Deferred work includes a dedicated timeline API/read model, advanced event-type filtering, assignment/lifecycle lanes, printable timeline inclusion, exportable audit trails, admin audit console, backend note/workflow ownership migrations if required, and payload/actor normalization. This slice is docs-only and adds no runtime behavior, backend/RPC change, mutation behavior, workflow/lifecycle/assignment/document behavior, activity ownership change, activity write, notification fanout, route, permission, or historical leakage.

Operational Timeline Slice 1B audits the existing Order Detail activity data shape before timeline UI changes in `docs/OPERATIONAL_TIMELINE_PLAN.md`. The audit records that active Order Detail and the order drawer both render `ActivityLog`, which loads `rpc_get_activity_feed` through `listOrderActivity(orderId)` and subscribes to `public.activity_log` inserts through `subscribeOrderActivity(...)`; active notes are written through `logNote(...)` / `rpc_log_event(...)` as `note` events, while notification fanout remains separate and must not be represented as confirmed delivery. The normalized frontend row shape includes `id`, `order_id`, `event_type`, `title`, `message` / `body`, `created_at`, `created_by`, actor name/email/id fields, and `detail`, with `detail` restricted to approved snippets rather than raw display. The event mapping classifies lifecycle events (`order.archived`, `order.cancelled`, `order.voided`), workflow events (`status_changed` and legacy workflow helper events), assignment events (`assignee_changed`, legacy `assignment`), document events (`order_document.uploaded`, `order_document.archived`), notes (`note`, `note_added`), system/audit events (`order_created`, `dates_updated`, `fee_changed`, `order_number.manual_override`, `site_visit`), and unknown events. Safe display fields are controlled titles, timestamps, resolved actor labels, short known descriptions, category chips, and sanitized payload snippets only. Risks logged for the future MVP include raw payload leakage from legacy rendering patterns, inconsistent actor naming, duplicated status/workflow titles, missing lifecycle/document/order-number display mappings, unknown event hiding, frontend-invented interpretations, and note event-type compatibility. This slice is inventory-only and adds no runtime behavior, backend/API/RPC change, mutation behavior, activity ownership change, workflow/lifecycle/assignment/document behavior, activity write, notification fanout, route, permission, or historical leakage.

Operational Timeline Slice 1C implements the first governed Order Detail timeline presentation foundation using existing loaded activity data only. The shared activity row renderer now maps existing `event_type` values into category chips and visual treatments for Lifecycle, Workflow, Assignment, Documents, Notes, System, and conservative Unknown rows. Titles are clearer for lifecycle, workflow, assignment, document, note/comment, order-number, date, fee, and system/audit rows; unknown/unmapped events remain visible as `Activity event` / `Unknown` / `Event recorded` instead of silently disappearing. Safe descriptions are derived only from existing row fields and approved payload snippets such as status from/to labels, lifecycle reasons, document title/category/visibility, order-number old/new values, date snippets, assignment labels, and note bodies. Document rows intentionally avoid storage paths, bucket names, signed URLs, and raw payload dumps. Actor display remains based on existing actor/creator fields, and system rows keep actor context when available. Focused tests cover category labels, unknown event visibility, safe payload display, and absence of row-level mutation controls. This slice adds no backend/API/RPC/view/migration change, activity write, notification fanout, mutation behavior, activity ownership change, workflow/lifecycle/assignment/document behavior, route, permission, saved view, export, print-packet integration, admin console, or historical/admin readback behavior.

Operational Timeline Slice 1D plans lightweight grouping before additional timeline implementation in `docs/OPERATIONAL_TIMELINE_PLAN.md`. The reviewed options are date/day grouping, category grouping, lifecycle/workflow phase grouping, and no grouping beyond improved rows. The recommended first implementation is date/day grouping only because it preserves chronological audit reading while improving scanability. Category grouping and lifecycle/workflow phase grouping remain deferred because they can break chronology or imply frontend-invented authoritative phases; the no-grouping option remains a fallback but is not the preferred next step for long histories. Planned display behavior is `Today`, `Yesterday`, and specific human-readable dates for older events, with deterministic chronological ordering inside each group and conservative fallback handling for invalid timestamps. Guardrails require read-only presentation, existing loaded activity data only, no backend/API/RPC/view/migration change, no filtering/hiding/collapsing-by-default, no mutation controls/actions, no raw payload expansion, no event loss including unknown events, and no frontend-invented lifecycle/workflow history. This slice is docs-only and adds no runtime behavior, activity ownership change, activity write, notification fanout, workflow/lifecycle/assignment/document behavior, route, permission, export, print-packet integration, admin console, or historical/admin readback behavior.

Operational Timeline Slice 1E adds the lightweight date/day grouping foundation to the Order Detail operational timeline using existing governed activity data only. The active `ActivityLog` renderer groups loaded rows under `Today`, `Yesterday`, or a specific older calendar date label, preserves chronological ordering inside each date group by `created_at`, and uses deterministic fallback ordering for equal or invalid timestamps rather than dropping rows. Unknown/unmapped events remain visible within their date group, and all Slice 1C category chips, category styling, actor display, and safe detail descriptions are preserved. Focused tests cover Today, Yesterday, older-date labels, chronological ordering within a group, and unknown event visibility without raw payload expansion. This slice adds no timeline filters, event hiding, collapse behavior, mutation controls/actions, backend/API/RPC/view/migration change, activity data mutation, activity write, notification fanout, derived authoritative history, workflow/lifecycle/assignment/document behavior, route, permission, export, print-packet integration, admin console, or historical/admin readback behavior.

Operational Timeline Slice 1F closes out the initial governed Order Detail timeline foundation without runtime changes. The locked foundation includes category mapping for Lifecycle, Workflow, Assignment, Documents, Notes, System, and Unknown rows; category chips and category-specific styling; safe event labels and approved detail snippets; unknown/unmapped event preservation; date/day grouping under Today, Yesterday, and older calendar dates; deterministic chronological ordering inside groups; read-only presentation only; existing loaded activity data only; backend activity as the source of truth; frontend formatting/presentation only; no filters or event hiding yet; no raw payload expansion; no timeline actions, mutation controls, workflow controls, lifecycle controls, document actions, or assignment actions; and no backend/API/RPC/view/migration changes. Deferred future work remains event-type filters, richer timeline lanes, a dedicated timeline read model if needed, printable timeline inclusion, exportable audit trails, and an admin audit console.

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

Falcon Role-Centric Operational Shell Architecture Phase 1A completed docs-first role-centric
operational shell architecture in `docs/FALCON_ROLE_CENTRIC_OPERATIONAL_SHELL_ARCHITECTURE.md`.
The plan defines Falcon as one governed platform with multiple role-native operational shells:
Owner/Admin, Staff Appraiser, Reviewer, Assignment/Vendor Recipient, and future Client Portal user
at high level only. It separates permission authority from UX visibility: permissions, route
guards, RLS/RPCs, object visibility, and workflow actions remain canonical, while shell design
controls first-screen priority, navigation emphasis, terminology, alert style, onboarding, and
cognitive load. The plan concludes that Owner/Admin should get broad operational oversight without
alert overload; appraisers should get assigned-work and revision-first language; reviewers should
get review-queue and decision-first language; assignment/vendor recipients should get received-work
and work-request language rather than internal owner-company order operations; and future Client
Portal users should get request/status/document/report language rather than internal workflow,
assignment, or packet mechanics. It also records that `packet` may remain an internal and
assignment-scoped architecture term, but should not become universal user-facing product language.
No runtime behavior, route/permission behavior, shell implementation, backend/Supabase/query/
workflow behavior, role-authority model, dashboard rewrite, Client Portal implementation, branding,
or production data changed. The next recommended role-centric slice is Falcon Role-Centric
Operational Shell Architecture Phase 1B: Current Shell And Navigation Role Audit.

Falcon Role-Centric Operational Shell Architecture Phase 1B completed the docs-only current shell
and navigation role audit in `docs/FALCON_ROLE_CENTRIC_OPERATIONAL_SHELL_ARCHITECTURE.md`. The
audit inspected active route guards, `TopNav`, current navigation registry and primary nav
resolver, command palette registry/resolver, dashboard resolution, `DashboardPage`,
`AssignmentDashboardPage`, Orders, Calendar, Clients, Assignments, assignment primitives, and the
appraiser/reviewer dashboard wrappers. It concludes that Falcon's authority foundation is strong:
route guards remain canonical, `DashboardGate` already separates order-capable and
assignment-only users, assigned-company assignment access does not grant canonical order/client
visibility, and Clients has broad versus assigned-safe path resolution. The shell itself remains
mostly surface-centric, with Dashboard, Orders, Calendar, Clients, Assignments, Users, and Settings
as the shared frame. Owner/Admin is closest to the current broad shell, while Appraiser and
Reviewer need dedicated workbench planning. Assignment/Vendor Recipient is the strongest
role-centric boundary today, but user-facing copy still overuses `packet`; future Client Portal is
still unimplemented and must not reuse the internal Clients workspace as a trimmed portal. No
runtime behavior, route/permission behavior, navigation, dashboard, command palette behavior,
backend/Supabase/query/workflow behavior, role-authority model, shell implementation, Client Portal
implementation, branding, or production data changed. The next recommended role-centric slice is
Falcon Role-Centric Operational Shell Architecture Phase 1C: Shell Profile And Navigation
Vocabulary Plan.

Falcon Role-Centric Operational Shell Architecture Phase 1C completed docs-only shell profile and
navigation vocabulary planning in `docs/FALCON_ROLE_CENTRIC_OPERATIONAL_SHELL_ARCHITECTURE.md`.
The plan defines future role-native shell frames before implementation: Owner/Admin uses the
Operations Shell and Operations Dashboard; Staff Appraiser uses the My Work Shell and assigned-work
language; Reviewer uses the Review Workbench Shell and Review Queue language; Assignment/Vendor
Recipient uses the Received Work Shell with work-request and offer language; and future Client
Portal uses a high-level Client Requests Shell with request/status/document/report language only.
It records usage rules that `Orders` remains appropriate for owner/admin and broad internal order
inventory, `My Work` is for assigned internal appraiser execution, `Review Queue` is for review
decision work, and assignment/vendor recipient surfaces should lead with `Received Work`, `Work
Request`, `Offer`, `Active Work`, and `Submit Work`. `packet` remains valid internally and in
selective owner/admin assignment-scoped contexts, but should not be the primary recipient-facing
noun. Future Client Portal language must not reuse internal Clients Workspace, Orders, Review
Queue, vendor assignment, or packet terminology. Phase 1C also sets command palette direction
toward role-native actions such as `Open My Work`, `Open Review Queue`, `Open Received Work`,
`Open Offers`, `Open Team Access`, and `Open Action Needed`. No runtime behavior,
route/permission behavior, navigation implementation, dashboard rewrite, command palette behavior,
backend/Supabase/query/workflow behavior, role-authority model, shell switching, Client Portal
implementation, branding, or production data changed. The next recommended role-centric slice is
Falcon Role-Centric Operational Shell Architecture Phase 1D: Shell Resolution And Migration Slice
Plan.

Falcon Role-Centric Operational Shell Architecture Phase 1D completed docs-only shell resolution
and migration slice planning in
`docs/FALCON_ROLE_CENTRIC_OPERATIONAL_SHELL_ARCHITECTURE.md`. The plan defines shell resolution
inputs, profile records, primary-shell selection rules, multi-role defaults, fallback behavior,
navigation migration sequence, dashboard/workbench migration sequence, terminology migration
sequence, command palette and quick-action migration sequence, product-mode/module availability
rules, and the safest first runtime slice. Shell resolution is explicitly downstream of
authentication, current-company resolution, permissions, route guards, RLS/RPCs, and object
visibility; it chooses presentation and priority only. Owner/admin users who also perform
appraiser or reviewer production work should default to Operations, while future shell switching
into My Work or Review Queue remains presentation-only and deferred. Assignment-only users should
bypass Operations and default to Received Work. Appraiser/reviewer hybrids should not get a
combined workbench by default; use a deterministic production default and expose the other
workbench secondarily. Safe early migration work is limited to a pure shell-profile resolver and
tests, followed later by passive metadata, safe label changes such as Users to Team Access, packet
density reduction in recipient-facing copy, profile-aware command ordering, dashboard/workbench
heading migration, profile-aware nav grouping, and optional shell switching. No runtime behavior,
route/permission behavior, navigation implementation, dashboard rewrite, command palette behavior,
backend/Supabase/query/workflow behavior, role-authority model, shell switching, Client Portal
implementation, branding, or production data changed. The next recommended role-centric slice is
Falcon Role-Centric Operational Shell Architecture Phase R1: Pure Shell Profile Resolver And Test
Plan.

Falcon Role-Centric Operational Shell Architecture Phase R1 completed the first runtime foundation
for role-centric shells as a pure resolver plus focused tests. `src/lib/shell/resolveShellProfile.js`
now returns stable presentation profile ids for `operations`, `my_work`, `review_queue`,
`received_work`, `requests`, `unavailable`, `company_required`, `membership_inactive`,
`profile_ambiguous`, and `module_unavailable`. The resolver accepts plain data only, normalizes
permissions and role labels, returns `metadataAuthority: presentation_only`, and does not grant
access, replace permission checks, inspect routes or objects, call backend services, or connect to
live UI. `src/lib/shell/__tests__/resolveShellProfile.test.js` covers missing auth, missing current
company, inactive membership, owner/admin, owner/admin plus appraiser/reviewer production work,
assignment-only access, mixed internal order plus assignment access, appraiser-only, reviewer-only,
appraiser/reviewer hybrid default, review-work-waiting hybrid resolution, explicit future requests
enablement, disabled future requests fallback, explicit ambiguity, capability normalization, and
deterministic side-effect-free output. No `DashboardGate` behavior, navigation, routes,
permissions, command palette behavior, backend/Supabase/query/workflow behavior, shell switching,
Client Portal implementation, branding, or production data changed. The next recommended
role-centric slice is Falcon Role-Centric Operational Shell Architecture Phase R2: Passive Shell
Profile Metadata Audit.

Falcon Role-Centric Operational Shell Architecture Phase R2 completed passive shell profile
metadata for every R1 shell profile id. `src/lib/shell/shellProfiles.js` now provides
presentation-only metadata for `operations`, `my_work`, `review_queue`, `received_work`,
`requests`, `unavailable`, `company_required`, `membership_inactive`, `profile_ambiguous`, and
`module_unavailable`. Each record includes display label, short label, primary daily question,
default workspace label, navigation vocabulary notes, dashboard/workbench title, empty-state tone,
notification tone, preferred action language, status, priority, and `metadataAuthority:
presentation_only`. R2 marks `operations`, `my_work`, `review_queue`, and `received_work` active,
`requests` future-only, and unavailable/company/membership/ambiguous/module states as fallback
metadata. `src/lib/shell/__tests__/shellProfiles.test.js` covers id coverage, stable order,
required fields, presentation-only authority, active profile labels, future requests metadata,
fallback metadata, unknown-profile lookup behavior, frozen entries/nested arrays, and absence of
route/permission/component authority fields. No `DashboardGate` behavior, navigation, routes,
permissions, command palette behavior, backend/Supabase/query/workflow behavior, shell switching,
Client Portal implementation, branding, or production data changed. The next recommended
role-centric slice is Falcon Role-Centric Operational Shell Architecture Phase R3: Safe Label
Migration Plan.

Falcon Role-Centric Operational Shell Architecture Phase R3 completed docs-only safe label
migration planning in `docs/FALCON_ROLE_CENTRIC_OPERATIONAL_SHELL_ARCHITECTURE.md`. R3 inspected
current live labels in the navigation registry, primary TopNav helper, desktop/mobile TopNav,
command palette registry/helper/component, DashboardGate, current dashboard resolution,
DashboardPage, AssignmentDashboardPage, Assignments workspace, assignment primitives/detail/inbox,
UsersIndex, and OwnerSetup. The resulting migration matrix classifies labels as safe before shell
wiring, conditional before shell wiring, wait for shell wiring, or internal only. The safest first
runtime label migration is Users to Team Access because `/users` already represents guarded Team
Access invitation/member management and Owner Setup already uses `Open Team Access`; the matching
command label can move from `Go to Users` to `Open Team Access`, and the broad command placeholder
can replace `Users` with `Team Access` without changing routes, route guards, permissions, command
availability, ordering, DashboardGate, backend/Supabase/query/workflow behavior, shell switching,
Client Portal, branding, or production data. Assignment packet wording can be reduced only in
clearly recipient-facing lanes before shell wiring; packet precision remains internal and
owner/admin-safe elsewhere. Global Dashboard, Operations Dashboard, Orders, Assignments,
role-specific command ordering/search fallback, brand language, assignment detail packet/action
titles, and future Requests labels must wait for live shell-profile consumption. The next
recommended role-centric slice is Falcon Role-Centric Operational Shell Architecture Phase R3A:
Team Access Label Alignment.

Falcon Role-Centric Operational Shell Architecture Phase R3A completed the first safe runtime
role-language migration for the guarded Team Access surface. `src/lib/navigation/currentNavigationRegistry.js`
now labels the current live `users` navigation entry as `Team Access`; `src/lib/commandPalette/currentCommandRegistry.js`
now labels the matching command as `Open Team Access`; and `src/components/nav/CommandPalette.jsx`
now uses `Team Access` in the broad placeholder. Focused expectations were updated in current
primary nav, current command palette helper, TopNav, and CommandPalette tests. R3A preserves the
`/users` route path, `users` route/nav/command ids, `users.read` and `navigation.users.view`
permission keys, route guards, command availability, command ordering, primary nav order,
desktop/mobile nav behavior, command filtering, keyboard hints, order-search fallback, UsersIndex
internals, Owner Setup bridge behavior, backend/Supabase/query/workflow behavior, RLS/RPCs, shell
switching, Client Portal, branding, and production data. Dashboard, Orders, Assignments,
shell-level headings, role-native dashboard titles, assignment packet terminology, Client Portal
labels, routes, permissions, and profile-aware runtime logic were not changed. The next
recommended role-centric slice is Falcon Role-Centric Operational Shell Architecture Phase R3B:
Owner Setup And Settings Label Alignment.

Falcon Role-Centric Operational Shell Architecture Phase R3B completed the next safe runtime
owner/admin setup and settings terminology alignment. `src/lib/navigation/currentNavigationRegistry.js`
and `src/lib/commandPalette/currentCommandRegistry.js` now use `Open Account Settings` for the
personal settings command and `Open Notification Settings` for the notification settings command.
`src/pages/Settings.jsx` now frames the route as `Account Settings`, while `src/pages/admin/OwnerSetup.jsx`
uses clearer operational setup language: `Company Setup`, `Operational Setup`, `Workspace
Defaults`, `Workflow Settings`, `Team Access`, `Company Notification Settings`, and `Operational
Readiness Checklist`. The dashboard setup prompt in `src/features/dashboard/DashboardPage.jsx` now
uses `Owner Setup Guidance`, `Review operational setup readiness`, and `Review Owner Setup`.
Focused expectations were updated in current navigation registry, current command palette,
CommandPalette, OwnerSetup, and OwnerSetupDashboardPrompt tests. R3B preserves `/settings`,
`/settings/notifications`, `/settings/owner-setup`, and `/users` route paths; existing route/nav/
command ids and permission keys; settings utility link order; mobile nav placement; command
availability and ordering; keyboard hints; filtering; order-search fallback; Owner Setup's
advisory/read-only context behavior; and the narrow guarded company-profile save path. Dashboard,
Orders, Assignments, workbench headings, My Work, Review Queue, assignment packet terminology,
Client Portal labels, routes, permissions, DashboardGate behavior, backend/Supabase/query/workflow
behavior, RLS/RPCs, shell switching, profile-aware runtime logic, branding, and production data
were not changed. The next recommended role-centric slice is Falcon Role-Centric Operational Shell
Architecture Phase R3C: Assignment Recipient Copy Audit And Packet Density Reduction.

Falcon Role-Centric Operational Shell Architecture Phase R3C completed the next safe runtime
assignment-recipient copy alignment for clearly received-work and assigned-company-facing surfaces.
`src/features/assignments/AssignedAssignmentInbox.jsx` now leads with `Work requests assigned to
your company`, `Work Request`, `Open work request`, and received-work language instead of making
packet the dominant recipient noun. `src/features/assignments/AssignmentsPage.jsx` now uses
`Assignment-scoped` and `Open received work only` for assigned-only workspace context while
preserving packet-scoped language when owner/admin sent-assignment context is also present.
`src/features/assignments/AssignedOfferPacket.jsx` and `src/features/assignments/AssignedWorkPacket.jsx`
now render recipient detail headings and sections as `Work Request`, `Work Request Actions`, `Work
Request Details`, `Active Work`, `Assignment Actions`, and `Assignment Details`. `src/features/assignments/components/AssignedWorkDashboard.jsx`
now says `Open Assignment` and `Received assignment work`, while generic assignment loading,
unavailable, terminal, and error support copy avoids unnecessary packet wording. Focused
expectations were updated in `src/features/assignments/__tests__/AssignmentsPage.test.jsx` and
`src/features/assignments/__tests__/AssignmentPacketPresentation.test.jsx`. R3C preserves
`/assignments` and `/assignments/:assignmentId` routes, route ids, component/file/internal names,
permission keys, guards, list/detail API calls, packet resolution order, lifecycle actions,
dashboard data sources, owner/admin sent-assignment packet language, owner detail labels such as
`Owner Packet`, `Packet Actions`, and `Packet Context`, and internal architecture/diagnostic/test
wording where packet precision protects scoped visibility. Global `Assignments` nav/command
labels, Dashboard, Orders, My Work, Review Queue, shell-level workbench headings, DashboardGate,
routes, permissions, backend/Supabase/query/workflow behavior, RLS/RPCs, shell switching,
profile-aware runtime logic, Client Portal, branding, and production data were not changed. The
next recommended role-centric slice is Falcon Role-Centric Operational Shell Architecture Phase
R4: Passive Shell Profile Exposure.

Falcon Role-Centric Operational Shell Architecture Phase R4 completed the first passive runtime
shell profile exposure layer. `src/lib/shell/shellProfileExposure.js` now provides
`buildShellProfileInput(...)`, `resolveShellProfileExposure(...)`, and
`getShellProfileExposure(...)` for mapping already available session/current-user context/
permission state into the R1 resolver and returning presentation-only profile metadata.
`src/lib/shell/useShellProfile.js` observes the existing session, current-user app context, and
effective permission hooks and returns the resolved profile id, shell metadata, resolution reason,
resolver output, capabilities, loading/error state, and `metadataAuthority: presentation_only`.
Focused tests in `src/lib/shell/__tests__/shellProfileExposure.test.js` and
`src/lib/shell/__tests__/useShellProfile.test.jsx` cover app-context input mapping, owner/admin
and assignment-only profile exposure, non-leaky fallback profiles, presentation-only metadata, and
hook observation. R4 does not connect shell profile exposure to active navigation, routes,
DashboardGate, dashboard/workbench headings, command palette ordering/search/fallback behavior,
permissions, route guards, assignment lifecycle actions, packet resolution, object visibility,
backend/Supabase/query/workflow behavior, RLS/RPCs, product-mode authority, shell switching,
Client Portal implementation, branding, or production data. The next recommended role-centric
slice is Falcon Role-Centric Operational Shell Architecture Phase R5: DashboardGate Presentation
Readiness Plan.

Falcon Role-Centric Operational Shell Architecture Phase R5 completed docs-only DashboardGate
presentation readiness planning for passive shell profile exposure. R5 inspected
`src/features/dashboard/DashboardGate.jsx`, `src/lib/dashboard/currentDashboardResolution.js`,
`src/features/dashboard/DashboardPage.jsx`, `src/features/dashboard/AssignmentDashboardPage.jsx`,
`src/features/assignments/components/AssignedWorkDashboard.jsx`,
`src/features/assignments/components/OwnerSentAssignmentsDashboard.jsx`,
`src/pages/appraisers/AppraiserDashboard.jsx`, `src/pages/reviewers/ReviewerDashboard.jsx`, and
`src/features/dashboard/__tests__/DashboardGate.test.jsx`. The plan records that `DashboardGate`
must remain the dashboard selector and `resolveCurrentDashboard(...)` must remain the
permission-derived dashboard-selection helper. Shell profile exposure may later be observed and
passed downward only as optional presentation metadata after current dashboard resolution has
already selected `DashboardPage`, `AssignmentDashboardPage`, or the unavailable fallback. Shell
profile id must not grant dashboard access, choose a different dashboard component, redirect
routes, change permissions, alter queries/RPCs/data hooks, change workflow/action availability,
filter navigation, reorder command palette entries, introduce shell switching, or implement Client
Portal behavior. Safe future uses are limited to wording surfaces such as dashboard support copy,
subheadings, empty-state tone, unavailable-state tone, context chip wording, role-native intro
copy, and assignment dashboard title/subtitle copy after the assignment dashboard branch is already
selected. Appraiser and reviewer heading changes such as `My Work` or `Review Queue` should wait
until the product distinguishes true workbench behavior from the shared order dashboard. The next
recommended runtime slice is Falcon Role-Centric Operational Shell Architecture Phase R5A:
DashboardGate Passive Shell Metadata Prop, which should import `useShellProfile()` in
`DashboardGate` only as a passive observer, preserve existing dashboard branch order and
`resolveCurrentDashboard(...)` inputs, pass shell metadata as an optional prop to the already
selected dashboard component, and test that loading, order-capable, assignment-only, mixed, and
unavailable branches remain unchanged. R5 changed no runtime code, hook wiring, DashboardGate
behavior, routes, permissions, backend/Supabase/query/workflow behavior, navigation, command
palette behavior, dashboard data behavior, shell switching, Client Portal implementation,
branding, or production data.

Falcon Role-Centric Operational Shell Architecture Phase R5A completed the first passive runtime
DashboardGate connection to shell profile exposure. `src/features/dashboard/DashboardGate.jsx` now
observes `useShellProfile()` and passes the returned presentation-only exposure as
`shellProfilePresentation` to whichever dashboard component the existing permission-derived
`resolveCurrentDashboard(...)` branch has already selected. `src/features/dashboard/DashboardPage.jsx`
and `src/features/dashboard/AssignmentDashboardPage.jsx` accept and ignore the optional prop, so no
visible copy, dashboard data behavior, query behavior, assignment widget behavior, or object
visibility changes. Focused `DashboardGate` tests now prove loading, order-capable,
assignment-only, mixed order/assignment, and unavailable branches remain unchanged; shell metadata
reaches the selected dashboard component; and mismatched shell profile ids cannot select a
different dashboard branch. R5A preserves `/dashboard` route behavior, route guards, permission
keys, `resolveCurrentDashboard(...)` inputs and branch order, dashboard headings/subtitles/support
copy/empty states, navigation, command palette behavior, backend/Supabase/query/workflow behavior,
RLS/RPCs, product-mode authority, shell switching, Client Portal implementation, branding, and
production data. The next recommended role-centric slice is Falcon Role-Centric Operational Shell
Architecture Phase R6A: Assignment Dashboard Received Work Presentation.

Falcon Role-Centric Operational Shell Architecture Phase R6A completed the first visible
shell-aware dashboard presentation change in the isolated assignment dashboard branch.
`src/features/dashboard/AssignmentDashboardPage.jsx` now uses `shellProfilePresentation` only for
presentation copy: when the passive profile is `received_work`, the dashboard heading becomes
`Received Work` and the support copy focuses on assigned work requests, due dates, assignment
status, and owner review after submission. Non-received assignment dashboard contexts retain the
existing generic `Assignment Dashboard` frame. `src/features/dashboard/__tests__/AssignmentDashboardPage.test.jsx`
now covers received-work copy, packet-free support wording, generic fallback presentation,
permission-derived assigned/owner widget rendering, and unchanged loading behavior. Existing
`DashboardGate` tests continue to prove assignment-only, order-capable, mixed, loading, and
fallback dashboard selection remains permission-derived and unchanged. R6A preserves
`DashboardGate` branch selection, route paths, route guards, permission keys, assignment dashboard
data hooks, assignment widgets, assignment list/detail/workflow behavior, object visibility,
order-capable dashboard behavior, navigation, command palette behavior, backend/Supabase/query/
workflow behavior, RLS/RPCs, product-mode authority, shell switching, Client Portal implementation,
branding, and production data. The next recommended role-centric slice is Falcon Role-Centric
Operational Shell Architecture Phase R6B: Owner/Admin Operations Dashboard Presentation.

Falcon Role-Centric Operational Shell Architecture Phase R6B completed shell-aware presentation
copy for the owner/admin order-capable dashboard. `src/features/dashboard/DashboardPage.jsx` now
uses `shellProfilePresentation` only for presentation copy: when the passive profile is
`operations`, the dashboard keeps `Operations Dashboard` and uses owner/admin-native support copy:
`Track active work, review handoffs, due pressure, and operational readiness.` Non-operations
dashboard contexts retain the existing role-derived support copy. `src/features/dashboard/__tests__/DashboardPage.test.jsx`
now covers operations copy, non-operations fallback copy, and unchanged rendering of dashboard
sections, widgets, links, filters, table props, and readiness surfaces from the same data and
permission checks. Existing `DashboardGate` tests continue to prove assignment-only,
order-capable, mixed, loading, and fallback dashboard selection remains permission-derived and
unchanged; `AssignmentDashboardPage` tests continue to prove R6A received-work presentation remains
isolated. R6B preserves `DashboardGate`, `resolveCurrentDashboard(...)`, route paths, route guards,
permission keys, dashboard data hooks, queries, widgets, filters, layout, assignment dashboard
behavior, navigation, command palette behavior, backend/Supabase/query/workflow behavior, RLS/RPCs,
product-mode authority, shell switching, Client Portal implementation, branding, and production
data. The next recommended role-centric slice is Falcon Role-Centric Operational Shell
Architecture Phase R6C: Appraiser And Reviewer Workbench Presentation Plan.

Falcon Role-Centric Operational Shell Architecture Phase R6C completed a documentation-only plan
for appraiser and reviewer dashboard/workbench presentation before runtime copy or layout changes.
R6C inspected the shared `DashboardPage`, its tests, `DashboardGate`, current dashboard
resolution, shell profile metadata/resolution, and the appraiser/reviewer dashboard route wrappers.
The plan records that appraiser and reviewer pages still render the shared order-capable
`DashboardPage`, which receives passive shell presentation metadata but currently uses it only for
the `operations` presentation branch. Because the page still includes calendar context, status
filters, the Orders table, KPI cards, workload, operational support, and readiness/setup surfaces
where existing permissions allow, R6C defers heading-level `My Work` and `Review Queue`
presentation. Those headings would overpromise while the current surface remains a shared
dashboard rather than dedicated appraiser and reviewer workbench components. Future appraiser and
reviewer presentation may start with support-copy-only, section-label-only, or scoped empty-state
refinements after passive tests prove dashboard selection, routes, permissions, data hooks,
widgets, navigation, and commands remain unchanged. Hybrid behavior remains governed by the R1
resolver: owner/admin plus production responsibility defaults to `operations`, and appraiser plus
reviewer users default deterministically to `my_work` unless explicit review work waiting selects
`review_queue`. R6C preserves all runtime behavior, including `DashboardGate`, route paths, guards,
permissions, backend/Supabase/query/workflow behavior, navigation, command palette behavior, shell
switching, Client Portal implementation, branding, and production data. The next recommended
role-centric slice is Falcon Role-Centric Operational Shell Architecture Phase R6D: DashboardPage
Appraiser/Reviewer Passive Presentation Tests.

Falcon Role-Centric Operational Shell Architecture Phase R6D completed passive test coverage for
appraiser and reviewer shell presentation metadata on the shared order-capable `DashboardPage`.
`src/features/dashboard/__tests__/DashboardPage.test.jsx` now includes `my_work` and
`review_queue` shell presentation fixtures with future dashboard titles of `My Work` and
`Review Queue`. The tests prove those passive metadata inputs do not change the shared dashboard
heading, do not introduce `My Work` or `Review Queue` as page headings, and keep the existing
appraiser and reviewer support copy in place. The appraiser fixture still renders
`Operations Dashboard`, `Calendar context, assigned orders, and revision follow-up.`, `Appraiser`,
and `My Assignments`; the reviewer fixture still renders `Operations Dashboard`,
`Calendar context and review work assigned to your queue.`, `Reviewer`, and `My Review Work`.
The tests also prove calendar and Orders table props continue to come from existing dashboard
summary data and role-derived table modes, while R6B operations presentation coverage remains
intact. R6D makes no production runtime source change, no visible dashboard copy change, no
`DashboardGate` or `resolveCurrentDashboard(...)` change, no route/path or permission/guard change,
no dashboard data/query/widget/table/filter behavior change, no backend/Supabase/query/workflow
change, no navigation/command palette change, no shell switcher, and no Client Portal
implementation. The next recommended role-centric slice is Falcon Role-Centric Operational Shell
Architecture Phase R6E: Appraiser/Reviewer Scoped Dashboard Copy Plan.

Falcon Role-Centric Operational Shell Architecture Phase R6E completed a documentation-only
workbench surface plan for appraiser and reviewer experiences. R6E inspected the shared
`DashboardPage`, `DashboardGate`, Orders workspace filtering, `UnifiedOrdersTable`, and
`DashboardCalendarPanel`. The plan decides not to rename the shared `DashboardPage` to `My Work` or
`Review Queue`, not to start with route-level alternate views, and not to introduce shell switching.
The recommended direction is to create passive, unmounted appraiser/reviewer workbench component
boundaries first, fed by existing dashboard rows and props, then decide later whether proven
components should mount as scoped panels inside `DashboardPage` or become selected dashboard
presentation components in a separately approved slice. Safe reusable inputs include dashboard
summary rows, status counts, due/overdue fields on order rows, existing calendar rows,
dashboard-scoped `UnifiedOrdersTable` rendering, reviewer queue mode and reviewer id support,
role-derived appraiser table behavior, workload cards, and existing Orders filter links for
status, appraiser, reviewer, due, queue, and search. Deferred backend/query/workflow needs include
explicit assigned-work and reviewer-queue query contracts if dashboard rows are insufficient,
revision request detail, latest notes, revision-loop counts, file/report readiness, scoped
notes/activity feeds, report-progress state, and governed submit/resubmit/request-revisions/
clear-review/ready-for-client action availability inside future workbench components. R6E makes no
runtime code, dashboard copy, `DashboardGate`, route/path, permission/guard, backend/Supabase/query/
workflow, dashboard data/widget/table, navigation/command palette, shell switcher, Client Portal,
branding, or production data change. The next recommended role-centric slice is Falcon
Role-Centric Operational Shell Architecture Phase R6F: Passive Workbench Component Skeletons.

Falcon Role-Centric Operational Shell Architecture Phase R6F completed passive, unmounted
appraiser and reviewer workbench component skeletons. `src/features/dashboard/workbenches/AppraiserWorkbenchPreview.jsx`
renders a presentational `My Work` preview from plain `rows`, `loading`, and `appraiserLabel`
props, with appraiser-native sections for assigned work, revisions, due soon, site
visit/calendar context, and files/notes placeholders. `src/features/dashboard/workbenches/ReviewerWorkbenchPreview.jsx`
renders a presentational `Review Queue` preview from plain `rows`, `loading`, and `reviewerLabel`
props, with reviewer-native sections for in-review work, resubmissions, due pressure, revision
follow-up, and review notes/files placeholders. `src/features/dashboard/workbenches/__tests__/WorkbenchPreviews.test.jsx`
proves the headings, support copy, row-derived sections, empty states, and absence of action
buttons, and statically scans the preview sources to reject Supabase/API/router/DashboardGate/
DashboardPage/data-hook/permission-hook/workflow action references. The previews are not imported
or mounted by live dashboard, route, navigation, command palette, data, permission, or workflow
surfaces. R6F makes no live UI, dashboard copy, `DashboardGate`, route/path, permission/guard,
backend/Supabase/query/workflow, dashboard data/widget/table/KPI/workload/Calendar,
navigation/command palette, shell switcher, Client Portal, branding, or production data change.
The next recommended role-centric slice is Falcon Role-Centric Operational Shell Architecture
Phase R6G: Workbench Mount Readiness Plan.

Falcon Role-Centric Operational Shell Architecture Phase R6G completed a documentation-only mount
readiness plan for the R6F workbench previews. R6G inspected both passive preview components,
their tests, and the current `DashboardPage` layout. The plan decides that the previews are ready
only for a limited secondary-panel mount, not for page-level workbench replacement. A future mount
should keep the shared `Operations Dashboard` heading, avoid dedicated dashboard branch selection,
and place one scoped role-specific panel after the existing table/status area and before
`Operational Support`. The mount must be limited to non-admin shell profiles:
`AppraiserWorkbenchPreview` for `my_work` and `ReviewerWorkbenchPreview` for `review_queue`.
`DashboardPage` should pass only existing summary props: `rows={ordersRows || []}`,
`loading={loading}`, and either `appraiserLabel={roleLabel}` or `reviewerLabel={roleLabel}`. R6G
keeps blocked any heading replacement, `DashboardGate` or `resolveCurrentDashboard(...)` change,
route/path or permission/guard change, query/hook/Supabase/API/RPC addition, table/status/calendar/
KPI/workload behavior change, navigation/command change, workflow action button, shell switcher,
Client Portal behavior, files/notes/report preview, revision history, or activity feed. The next
recommended role-centric slice is Falcon Role-Centric Operational Shell Architecture Phase R6H:
DashboardPage Secondary Workbench Preview Mount.

Falcon Role-Centric Operational Shell Architecture Phase R6H completed the first live secondary
appraiser/reviewer workbench preview mount inside the existing shared `DashboardPage`.
`src/features/dashboard/DashboardPage.jsx` now imports the passive R6F preview components, derives
the passive shell profile id from the existing `shellProfilePresentation` prop, renders
`AppraiserWorkbenchPreview` only for non-admin `my_work` contexts, and renders
`ReviewerWorkbenchPreview` only for non-admin `review_queue` contexts. The selected panel mounts
after the current table/status area and before `Operational Support`, and receives only existing
dashboard props: `ordersRows`, `loading`, and `roleLabel`. Focused
`src/features/dashboard/__tests__/DashboardPage.test.jsx` coverage proves non-admin appraiser and
reviewer profiles receive the secondary panels while the page heading remains
`Operations Dashboard`; owner/admin operations users and owner/admin production-work hybrids do
not render the panels; calendar and Orders table props still come from existing dashboard summary
rows and role-derived table modes; and the preview panels render no action buttons. R6H changes no
`DashboardGate` behavior, dashboard branch selection, routes, permissions, guards, backend/
Supabase/query/workflow behavior, dashboard data hooks, table/filter/calendar/KPI/workload/setup/
readiness behavior, navigation, command palette behavior, shell switching, Client Portal
implementation, branding, or production data. The next recommended role-centric slice is Falcon
Role-Centric Operational Shell Architecture Phase R6I: Workbench Preview Data Sufficiency And Copy
Audit.

Falcon Role-Centric Operational Shell Architecture Phase R7A completed documentation-only
profile-aware navigation grouping planning before any runtime navigation changes. R7A inspected
the current navigation registry, primary nav helper, `TopNav`, command palette registry/helper/UI,
route guards, shell resolver and metadata, and `DashboardGate` shell behavior. The plan records
that navigation grouping is presentation and discoverability only: route guards, permissions,
RLS/RPCs, object visibility, and workflow contracts remain authority; showing a nav item must not
grant access; and hiding or de-emphasizing a nav item must not deny access. The grouping decision
keeps owner/admin users broad but organized into Operations, Management, and Setup / Support;
plans appraiser `my_work` navigation around My Work, assigned work, due/revision lanes, and
Calendar without globally renaming `Orders` yet; plans reviewer `review_queue` navigation around
Review Queue, in-review/resubmitted/revision lanes, and review Calendar without creating a new
route or dashboard branch; plans assignment-only `received_work` navigation around Received Work /
Assignments, Offers, Active Work, and Submitted Work while preserving owner/admin assignment
packet precision; keeps future `requests` navigation blocked until Client Portal authority,
routes, data projections, and client-safe status language exist; and keeps fallback profiles
minimal and non-leaky. Mobile nav should later collapse by shell priority rather than mirror every
authorized desktop surface, and command palette should remain broader than primary nav while
becoming role-prioritized only after navigation grouping metadata is proven. The safest next
runtime slice is Falcon Role-Centric Operational Shell Architecture Phase R7B: Passive Navigation
Group Metadata And Tests, which should add inert profile-aware grouping metadata for existing live
nav ids and tests proving current `TopNav`, mobile nav, command palette labels/order, route paths,
guards, permissions, `DashboardGate`, dashboards, backend/Supabase/query/workflow behavior, shell
switching, and Client Portal behavior remain unchanged.

Falcon Role-Centric Operational Shell Architecture Phase R7B completed passive profile-aware
navigation grouping metadata and tests. `src/lib/navigation/shellNavigationGroups.js` now exports
a frozen `presentation_only` metadata registry keyed by shell profile id, plus
`getShellNavigationGroups(...)`, `shellNavigationGroupsByProfileId`, and stable profile id
ordering. The registry references existing current live navigation ids only and defines group ids,
labels, ordered ids, notes, deemphasized ids, and future/fallback status without permission keys,
route guards, visibility gates, route authority, or command behavior. `operations` groups existing
ids into Operations, Management, and Setup / Support; `my_work` groups existing ids into Work and
Support; `review_queue` groups existing ids into Review Work and Support; `received_work` groups
existing ids into Received Work and Account; `requests` is future-only and makes no Client Portal
route assumption; fallback profiles use minimal workspace/account recovery grouping. Focused
`src/lib/navigation/__tests__/shellNavigationGroups.test.js` coverage proves every shell profile
metadata id has exactly one grouping record, every referenced nav id exists, future `requests`
metadata invents no Client Portal/Documents/Reports/Messages/Requests route ids, current primary
nav ids/labels/order/paths remain unchanged, existing Orders/Assignments/Team Access/Owner Setup
labels and paths remain unchanged, and entries/groups/arrays are frozen. R7B changes no
`currentNavigationRegistry` behavior, `getCurrentPrimaryNavLinks(...)` output, TopNav desktop or
mobile rendering, mobile Settings behavior, command palette registry/helper/rendering/labels/order/
fallback, route paths, route guards, permission keys/checks, `DashboardGate`, dashboards, backend/
Supabase/query/workflow behavior, RLS/RPCs, shell switching, Client Portal behavior, branding, or
production data. The next recommended role-centric slice is Falcon Role-Centric Operational Shell
Architecture Phase R7C: Navigation Grouping Render Readiness Plan.

Falcon Role-Centric Operational Shell Architecture Phase R7C completed documentation-only
navigation grouping render readiness planning. R7C inspected `TopNav`, current primary nav link
derivation, and passive shell navigation grouping metadata. The plan records that `TopNav`
currently maps `getCurrentPrimaryNavLinks(...)` directly for both desktop and mobile, mobile adds
Settings separately when allowed, command palette remains independent, and `TopNav` does not yet
call `useShellProfile()` or import `shellNavigationGroups`. The render decision is to apply future
grouping only after existing permission-filtered nav links are derived, intersect grouping metadata
with currently visible link ids, render no empty groups, keep unknown/fallback profiles on the
current flat nav, and start with desktop-only group labels/separators. Mobile grouping should wait
for a separate mobile-specific slice, and `deemphasizedNavEntryIds` should remain metadata only in
the first render slice. Grouping may later change visual grouping, section labels for non-empty
groups, visible-link ordering, and visual emphasis, but it must not change route access,
permission filtering, available link sets, URL paths, nav labels, command palette behavior,
DashboardGate/dashboard selection, backend/Supabase/query/workflow behavior, shell switching,
Client Portal behavior, branding, or production data. The next recommended role-centric slice is
Falcon Role-Centric Operational Shell Architecture Phase R7D: Desktop Navigation Group Labels From
Visible Links.

Falcon Role-Centric Operational Shell Architecture Phase R7D implemented desktop-only navigation
group labels from already visible permission-filtered links. R7D added
`src/lib/navigation/currentShellNavigationSections.js`, updated `TopNav`, and added focused helper
and TopNav tests. `TopNav` now observes `useShellProfile()` only as presentation metadata, keeps
`getCurrentPrimaryNavLinks(...)` as the source of visible links, and renders desktop grouping only
after intersecting passive shell navigation metadata with the visible link set. Active profile
groups render labels only when links are visible, fallback/future/unknown profiles keep flat
desktop nav, metadata-only ids do not create links, and visible links not covered by metadata stay
reachable in `More`. Mobile nav remains flat and unchanged, including Settings placement. Command
palette behavior remains unchanged. R7D changes no route paths, route guards, permission keys,
permission checks, nav labels, command labels/order/fallback, DashboardGate behavior, dashboard
selection, backend/Supabase/query/workflow behavior, RLS/RPCs, object visibility, shell switching,
Client Portal behavior, branding, or production data. The next recommended role-centric slice is
Falcon Role-Centric Operational Shell Architecture Phase R7E: Mobile Navigation Grouping Readiness
Plan.

Falcon Role-Centric Operational Shell Architecture Phase R7E completed documentation-only mobile
navigation grouping readiness planning. R7E inspected the current mobile drawer in `TopNav`,
current primary nav link derivation, the R7D desktop section helper, and passive shell navigation
group metadata. The plan records that mobile nav remains a flat drawer from already
permission-filtered `primaryNavLinks`, closes on link selection, and renders Settings separately
after a divider when allowed. Because desktop is Falcon's mission-control surface and mobile is
the operational-execution surface, R7E does not recommend copying desktop group labels into mobile
as the first mobile slice. It also defers mobile accordions, quick-action-first layout, and
role-native global label changes. The recommended runtime direction is flat mobile
profile-priority ordering from already visible links only: keep the same visible link set, labels,
paths, and Settings placement; reorder active-profile links by shell priority; append ungrouped
visible links in current relative order; and keep fallback, unknown, and future profiles in the
current flat order. The next recommended role-centric slice is Falcon Role-Centric Operational
Shell Architecture Phase R7F: Mobile Navigation Priority Ordering From Visible Links. R7F should
change only mobile ordering from visible links and must not change routes, permissions, guards,
command palette behavior, desktop grouping, DashboardGate, dashboards, backend/Supabase/query/
workflow behavior, shell switching, Client Portal behavior, branding, or production data.

Falcon Role-Centric Operational Shell Architecture Phase R7F implemented mobile navigation
priority ordering from already visible permission-filtered links. R7F added
`src/lib/navigation/currentShellMobileNavigationLinks.js`, updated `TopNav`, and added focused
mobile ordering and TopNav tests. Mobile nav remains a flat list with no group labels,
accordions, hidden links, de-emphasis behavior, quick actions, or label changes. `TopNav` still
uses `getCurrentPrimaryNavLinks(...)` as the source of visible links, then
`getCurrentShellMobileNavigationLinks(...)` reorders active-profile links by passive shell
navigation metadata. Metadata-only ids do not create links, ungrouped visible links remain
available in current relative order, and fallback/future/unknown profiles keep current flat mobile
order. Mobile Settings remains after the existing divider when allowed. Desktop R7D grouping and
command palette behavior remain unchanged. R7F changes no route paths, route guards, permission
keys/checks, visible link availability, nav labels, DashboardGate behavior, dashboard selection,
backend/Supabase/query/workflow behavior, RLS/RPCs, object visibility, shell switching, Client
Portal behavior, branding, or production data. The next recommended role-centric slice is Falcon
Role-Centric Operational Shell Architecture Phase R7G: Mobile Navigation Copy And Density Audit.
