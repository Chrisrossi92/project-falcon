# Operational Status Input Read-Only Surface Plan

## Purpose

This document defines the smallest safe frontend/read layer for Phase 2E operational evidence
records before any create, clear, suppression, automation, notification, lifecycle, dashboard,
mobile, or Client Portal work.

The goal is to display valid and fresh operational inputs as context without allowing user mutation
yet. This gives Falcon a chance to confirm the frontend read shape, language, placement, and
loading/error behavior before adding create/clear UI.

This phase is planning only. It does not implement runtime code, frontend UI, Supabase queries,
RPCs, schema changes, table mutations, lifecycle/status mutation, Smart Actions, automation,
notifications, signal suppression, routes, navigation, dashboards, command palette behavior,
mobile/PWA/native behavior, Client Portal behavior, AI inference, or production data changes.

## Read-Only Scope

A future read-only slice may show operational evidence from `order_operational_inputs` only as a
small secondary surface on order detail views.

Allowed future read-only scope:

- small read-only chips or rows on Order Detail or the order drawer;
- visible only when the user can already view the order;
- active/fresh inputs only by default;
- expired or cleared history deferred;
- no create, clear, edit, or form controls;
- no lifecycle/status mutation;
- no Attention Summary suppression yet.

The first read-only display should prove that users understand the evidence without implying it is
the order's authoritative lifecycle state.

## First-Wave Display Labels

Initial labels should be short and operational:

| Input type | Display label |
|---|---|
| `inspection_scheduled` | Inspection scheduled |
| `report_on_track` | Report on track |
| `waiting_on_client` | Waiting on client |

Labels should not imply:

- inspection completion;
- report submission;
- review clearance;
- client notification delivery;
- overdue exemption;
- automation suppression.

## Display Metadata

The read-only surface may include:

- actor name if available through the selected read shape;
- created timestamp;
- freshness or expiration indicator if useful;
- optional note only when safe, concise, and not visually dominant.

Metadata should stay secondary. The primary message is the operational evidence, not a full audit
timeline.

Recommended display examples:

- `Inspection scheduled · added by Alex · today`;
- `Report on track · fresh for 2 days`;
- `Waiting on client · expires tomorrow`;
- `Waiting on client · note available`.

Avoid:

- fake risk scores;
- certainty beyond the evidence;
- hidden-record hints;
- exposing raw UUIDs, permission names, RLS language, or RPC names;
- displaying stale/expired evidence as active context.

## Query And Data Access Approach

The read-only slice should choose the narrowest project-consistent read path.

Preferred direction:

- use the existing Supabase client to read `order_operational_inputs` directly only if RLS is
  confirmed safe and the frontend pattern is consistent with nearby order-detail reads;
- otherwise add a dedicated read RPC or read view in a separate approved backend slice before
  frontend display;
- filter to `cleared_at is null` and `expires_at > now()` for the first visible surface;
- scope by the current order id;
- sort newest or most relevant evidence first;
- do not write to `order_operational_inputs`;
- do not call create/clear RPCs;
- do not mutate lifecycle/status fields;
- do not query expired/cleared history in the first slice unless explicitly approved.

If a read RPC/view is needed, it must remain read-only and must not be bundled with create/clear UI.

## UX Boundaries

Operational inputs should read as secondary context/evidence.

UX rules:

- keep the surface calm and compact;
- place it near existing order context, not inside Smart Actions;
- avoid mixing it with authoritative lifecycle state badges;
- use plain operational language;
- prefer one compact row/chip group over a large panel;
- show an empty state only if the surrounding section needs it;
- do not make absence of evidence sound like failure;
- do not imply reminder suppression, escalation, or automation behavior.

Possible placement:

- Order Detail, near the existing attention/context summaries;
- order drawer, near current operational summaries if space allows;
- avoid Orders table rows in the first read-only slice.

## History Boundary

History is useful, but not first.

Deferred history behavior:

- expired inputs;
- cleared inputs;
- complete audit timeline;
- actor-by-actor history;
- filtering by input type;
- activity feed deep links.

History should remain available through activity/audit surfaces later, not as the first operational
read surface.

## Explicit Non-Goals

Phase 2H and the first read-only display slice must not include:

- create controls;
- clear controls;
- forms;
- note editing;
- direct table mutation;
- create/clear RPC calls;
- signal suppression logic;
- Attention Summary suppression integration;
- dashboard integration;
- Orders table row integration;
- automation;
- notifications;
- lifecycle/status mutation;
- Smart Action changes;
- route changes;
- navigation or command palette changes;
- mobile-specific build;
- Client Portal exposure;
- AI inference;
- required-document enforcement;
- reporting or analytics.

## Suggested Next Implementation Slice

The safest next runtime slice is:

- **Operational Execution Phase 2I: Read-Only Operational Input Display**.

Phase 2I should:

- inspect current Order Detail and drawer data-loading patterns;
- decide whether direct RLS-backed reads are sufficient or whether a read RPC/view is required;
- add a small read-only display for active/fresh operational inputs only;
- use first-wave labels only;
- avoid create/clear controls;
- avoid signal suppression;
- preserve all existing workflow, lifecycle, Smart Action, route, navigation, dashboard, command
  palette, automation, notification, mobile, and Client Portal behavior.

After Phase 2I, pause for review before any create/clear UI, Attention Summary suppression
integration, mobile quick action, notification, or automation slice.

## Phase 2I Implementation Record

Phase 2I implements the first read-only frontend surface for active/fresh operational inputs.

Runtime files added:

- `src/features/orders/operational-inputs/orderOperationalInputsApi.js`;
- `src/features/orders/operational-inputs/useOrderOperationalInputs.js`;
- `src/features/orders/operational-inputs/OperationalInputsReadOnly.jsx`.

Runtime files updated:

- `src/pages/orders/OrderDetail.jsx`;
- `src/components/orders/drawer/OrderDrawerContent.jsx`.

Focused tests added or updated:

- `src/features/orders/operational-inputs/__tests__/orderOperationalInputsApi.test.js`;
- `src/features/orders/operational-inputs/__tests__/OperationalInputsReadOnly.test.jsx`;
- `src/pages/orders/__tests__/OrderDetail.test.jsx`;
- `src/components/orders/drawer/__tests__/OrderDrawerContent.presentation.test.jsx`.

Phase 2I behavior:

- reads `order_operational_inputs` directly through the existing Supabase client;
- relies on Phase 2E RLS for order visibility;
- filters to the current order, `cleared_at is null`, and `expires_at > now()`;
- sorts newest evidence first;
- displays only first-wave input labels:
  - `inspection_scheduled` as `Inspection scheduled`;
  - `report_on_track` as `Report on track`;
  - `waiting_on_client` as `Waiting on client`;
- displays optional actor role, created timestamp, freshness timestamp, and note when present;
- renders no surface for loading, error, empty, expired, cleared, or unsupported input states;
- mounts the read-only evidence surface after existing attention/context summaries in Order Detail
  and the order drawer.

Phase 2I preserves:

- no create controls;
- no clear controls;
- no forms;
- no direct frontend writes;
- no create/clear RPC calls;
- no lifecycle/status mutation;
- no Smart Action changes;
- no Attention Summary suppression integration;
- no Orders table row integration;
- no dashboard integration;
- no automation or notifications;
- no route, navigation, command palette, mobile/PWA/native, Client Portal, AI, branding, or
  production data behavior change.

Pause after Phase 2I before any create/clear UI or signal-suppression integration.

## Phase 2J Minimal Create/Clear UI Plan

Phase 2J adds the docs-only create/clear UI plan for first-wave operational inputs.

New planning document:

- `docs/OPERATIONAL_STATUS_INPUT_CREATE_CLEAR_UI_PLAN.md`.

Phase 2J defines:

- Order Detail as the first recommended placement for create/clear controls;
- order drawer controls as optional/later;
- no dashboard, table-row, bulk, or mobile-specific controls in the first UI slice;
- compact secondary controls for `inspection_scheduled`, `report_on_track`, and
  `waiting_on_client`;
- clear behavior as deliberate but lightweight;
- optional notes only where useful;
- UI calls to controlled RPCs only, with server-side activity/audit remaining authoritative;
- no lifecycle/status mutation, Smart Action changes, signal suppression, automation,
  notifications, Client Portal exposure, or AI inference.

The next possible runtime slice is **Operational Execution Phase 2K: Minimal Create/Clear UI
Implementation**, only after the 2J plan is reviewed.
