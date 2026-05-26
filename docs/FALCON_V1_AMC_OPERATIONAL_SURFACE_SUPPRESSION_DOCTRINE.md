# Falcon v1 AMC Operational Surface Suppression Doctrine

## Purpose

This document defines how Falcon may preserve AMC, multi-company, vendor, client, and network
architecture internally while keeping those operational concepts hidden from the Version 1 staff
appraisal experience unless they are explicitly enabled.

Falcon v1 is primarily:

- an internal appraisal operations platform;
- a staff appraisal workflow system;
- an operational coordination platform.

Falcon v1 is not:

- an open AMC marketplace;
- a vendor network exchange;
- an assignment marketplace;
- a dormant enterprise tooling showcase.

This is planning doctrine only. It does not implement runtime suppression, change routes,
navigation, permissions, backend/schema/Supabase behavior, product-mode enforcement, billing,
onboarding, notifications, workflow authority, or production data.

## Core Doctrine

Hidden architecture is intentional.

Falcon may maintain internal foundations for AMC operations, multi-company relationships,
assignment routing, external vendor fulfillment, client/lender portals, and future marketplace or
network extensibility. Those foundations should not appear in the active v1 operational UX until
the relevant operational domain is explicitly enabled and implemented.

Dormant architecture should not leak into active UX. A user should not see AMC queues, vendor
panels, assignment-marketplace language, multi-company abstractions, packet mechanics, or disabled
future modules simply because the database or metadata contains future-ready structures.

Permissions alone are not sufficient. A user can have broad operational authority inside the
internal staff appraisal domain without receiving visibility into AMC Operations. Operational
domain visibility is controlled separately from role title and action authority.

## Operational Domain Separation

Falcon distinguishes these decisions:

- role defines persona and worldview;
- permissions define action authority;
- product/module scope defines which operational world is visible;
- operational-domain exposure determines whether Staff Appraisal, AMC Operations, Vendor Portal,
  Client Portal, or Hybrid/Ecosystem concepts are active in the user's UX.

Admin is not AMC Admin.

An internal admin may coordinate orders, intake, users, clients, assignment visibility, schedule
pressure, files, and workflow cleanup inside Staff Appraisal Mode. That does not grant AMC command
center visibility, vendor panel authority, network assignment surfaces, or client/lender portal
administration.

Owner controls operational-domain exposure.

Owners may later enable AMC operational domains selectively for a company, role preset, or user
where module contracts and permission domains support it. Admins may or may not receive AMC
operational visibility. The role title `admin` is not enough.

AMC operations are a separate operational world from internal staff appraisal operations.

When AMC Operations is enabled, it should use AMC-native lanes and language such as intake,
assignment, vendor panel, client/lender, SLA, QC/review, escalation, and delivery risk. It should
not appear as Staff Appraisal Mode with extra buttons.

## V1 Suppression Rules

AMC operational concepts stay hidden or suppressed unless all three are true:

1. The AMC module or operational domain is explicitly enabled.
2. The user has the relevant AMC permissions.
3. The runtime surface intentionally exposes that operational domain.

Until then, v1 users should not routinely see:

- AMC operational terminology outside ordinary client relationship labels;
- vendor network concepts;
- assignment marketplace language;
- external panel management systems;
- multi-company operational abstractions;
- dormant enterprise tooling;
- locked or disabled future module navigation;
- command palette entries for hidden network features;
- dashboard cards for hidden AMC/vendor/client portal objects;
- empty states that advertise hidden AMC modules as missing features.

## Architecture Preserved Internally

Suppression does not mean removal.

Falcon may keep these foundations in the architecture:

- multi-company memberships and relationships;
- company relationship lifecycle;
- assignment routing foundations;
- owner-side assignment packet records;
- external vendor capability;
- AMC workflow foundations;
- client/lender relationship modeling;
- future Vendor Portal and Client Portal contracts;
- future marketplace/network extensibility;
- product-mode metadata and shadow diagnostics.

These foundations remain architectural capacity, not active UX promises.

## Hidden Versus Exposed Examples

Hidden in v1 Staff Appraisal Mode:

- `Vendor Panel`;
- `Network Assignments`;
- `AMC Command Center`;
- `Assignment Marketplace`;
- `External Vendor Capacity`;
- `Client Portal Administration`;
- `Hybrid Ecosystem`;
- disabled `Vendor Portal` or `AMC Operations` nav links;
- dashboard counts for unreadable or disabled network work.

Acceptable in v1 Staff Appraisal Mode when operationally relevant:

- `Clients`;
- `Lenders`;
- `AMC` as a client/relationship category where the order/client model already uses it;
- internal `Assignments` where permissioned and clearly staff/owner-side;
- `Users`;
- `Orders`;
- `Calendar`;
- `Files`;
- `Notes`;
- `Review`;
- `Revisions`.

Exposed only when AMC Operations is intentionally enabled:

- `Intake`;
- `Vendor Panel`;
- `Client / Lender Queue`;
- `SLA Risk`;
- `QC Queue`;
- `Sent Assignments`;
- `Received Packets`;
- `Network Work`;
- `Delivery Risk`;
- `Vendor Corrections`.

## Product Doctrine

Operational surfaces should feel focused and intentional. The active interface should describe the
work the user can perform now, not every capability Falcon may support later.

Runtime UX should prefer:

- no UI over locked future UI;
- domain-native labels over generic enterprise abstractions;
- lane separation over blended universal dashboards;
- permissioned action controls over broad feature catalogs;
- contextual setup guidance over dormant module promotion.

Runtime UX should avoid:

- explaining hidden modules to users who cannot use them;
- showing disabled AMC/vendor/client portal controls;
- making admin dashboards feel like owner analytics or AMC command centers;
- making Staff Appraisal users feel like they are in a marketplace product;
- using company, relationship, package, module, or permission internals as normal UI language.

## Owner Doctrine

Owners may later enable AMC operational domains selectively.

When that happens:

- enablement must be explicit and auditable;
- permission grants must remain separate from domain exposure;
- admin visibility should be configurable independently of admin role title;
- Staff Appraisal, AMC Operations, Vendor Portal, and Client Portal lanes must remain distinct;
- existing Staff Appraisal users should not inherit AMC/network clutter by default.

Owner authority can expose or delegate a domain. It should not blur domains.

## Future Implementation Notes

Any future runtime suppression implementation should start with metadata and diagnostics, then add
active wiring only after module settings, product-mode composition, permissions, route contracts,
and visibility scopes are ready.

Safe future implementation order:

1. Keep product-mode and module metadata non-authoritative.
2. Define operational-domain enablement separately from role title.
3. Add diagnostics proving hidden domains do not leak into active navigation, dashboards, command
   palette, empty states, notifications, or activity copy.
4. Wire active Staff Appraisal surfaces to suppress hidden AMC/vendor/client portal concepts.
5. Implement AMC Operations as a separate, complete operating surface only when approved.

Do not use this doctrine to remove backend foundations, delete multi-company architecture, weaken
permissions, or bypass future AMC planning documents.

## Validation Expectations

Docs-only doctrine updates should run:

- `git diff --check`;
- trailing whitespace scan.

Runtime implementation slices should also run focused navigation, dashboard, command palette,
orders, clients, users, and notification tests for hidden-concept leakage.
