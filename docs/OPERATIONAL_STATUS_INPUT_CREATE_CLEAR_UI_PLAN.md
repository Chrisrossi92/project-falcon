# Operational Status Input Create/Clear UI Plan

## Purpose

This document defines the smallest safe user interaction model for creating and clearing first-wave
operational inputs.

The goal is to move from read-only operational evidence display toward controlled user input
without turning operational context into workflow authority, lifecycle status, automation, or a new
feature class.

This phase is planning only. It does not implement runtime code, frontend controls, forms,
Supabase changes, RPC changes, lifecycle mutation, Smart Actions, signal suppression, automation,
notifications, route behavior, navigation behavior, dashboard behavior, command palette behavior,
mobile/PWA/native behavior, Client Portal behavior, AI inference, or production data changes.

## First-Wave Supported Actions

The first create/clear UI should support only existing Phase 2E input types:

- create `inspection_scheduled`;
- create `report_on_track`;
- create `waiting_on_client`;
- clear an active operational input.

No other input types should appear in the UI until a separate doctrine, authorization, activity,
and freshness review approves them.

## Placement Guidance

Recommended first placement:

- Order Detail first;
- near the existing read-only `Operational Context` evidence surface;
- visually secondary to lifecycle status, Smart Actions, and required order context.

Deferred placements:

- order drawer controls should be optional and later, after Order Detail behavior is proven;
- dashboard controls should not be added in the first create/clear slice;
- Orders table row controls should not be added unless separately approved;
- mobile-specific quick actions should wait until the desktop/detail interaction is stable.

The UI should help users add current operational context where they are already reviewing the order,
not create a new command surface that competes with workflow actions.

## Interaction Model

The preferred interaction model is compact and secondary:

- a small action menu or compact button group;
- no giant form;
- no multi-step workflow;
- optional note field only where useful and not required;
- create actions do not require confirmation;
- clear actions should be deliberate but lightweight;
- successful create/clear should refresh the read-only evidence display;
- failure should show a restrained error state and leave existing evidence unchanged.

The UI must not imply that these inputs submit work, complete inspection, clear review, update order
status, notify a client, or suppress future reminders by itself.

## UX Copy

Initial create copy:

- `Mark inspection scheduled`;
- `Mark report on track`;
- `Mark waiting on client`.

Initial clear copy:

- `Clear operational context`.

Supporting copy should stay operational and temporary:

- `Adds temporary context for this order.`;
- `This does not change lifecycle status.`;
- `Cleared and expired context remains available through audit/activity history.`

Avoid:

- `Set status`;
- `Complete inspection`;
- `Submit report`;
- `Stop reminders`;
- `Escalate`;
- `Notify client`;
- `Resolve risk`.

## Permission And Availability Rules

Controls may render only when:

- the user can already view the order;
- the first-wave input type is supported;
- the expected RPC permission path should allow the action;
- the order is in a context where operational evidence is meaningful.

Controls must:

- handle RPC denial gracefully;
- avoid exposing unsupported input types;
- avoid implying lifecycle authority;
- avoid bypassing RLS, route guards, or workflow permissions;
- never infer create availability from shell profile alone.

If the UI cannot confidently determine availability, the safer behavior is to hide the create/clear
control and keep the read-only evidence display.

## Activity And Audit Expectations

Create and clear activity should remain server-side.

The UI should:

- call the controlled RPC only;
- avoid direct table writes;
- avoid creating duplicate frontend activity events;
- display success from the normalized RPC response or refreshed evidence read;
- treat activity/history as an audit trail, not a live status engine.

The server-side activity copy remains:

- `Inspection scheduled.`;
- `Report marked on track.`;
- `Waiting on client response.`;
- `Operational status cleared: Inspection scheduled.`;
- `Operational status cleared: Report on track.`;
- `Operational status cleared: Waiting on client response.`

## Freshness Behavior

Operational inputs are temporary evidence.

The create/clear UI should:

- communicate temporary nature lightly;
- show active/fresh evidence in the read-only surface after create;
- allow clearing active evidence through the controlled clear RPC;
- let expired or cleared inputs disappear from the active display;
- avoid manual `extend forever` behavior;
- avoid promising exact suppression or escalation behavior before signal integration exists.

Expired and cleared records may remain available later through audit or activity history, but history
display is not part of the first create/clear UI slice.

## Explicit Non-Goals

The first create/clear UI must not include:

- automation;
- notifications;
- signal suppression integration;
- lifecycle/status mutation;
- Smart Action changes;
- dashboard controls;
- Orders table row controls;
- bulk controls;
- required-document enforcement;
- review approval or revision workflow;
- Client Portal exposure;
- mobile/native-specific implementation;
- AI inference;
- new input types;
- analytics or reporting.

## Suggested Next Runtime Slice

The safest next runtime slice is:

- **Operational Execution Phase 2K: Minimal Create/Clear UI Implementation**.

Phase 2K should happen only after this plan is reviewed.

Phase 2K should:

- implement Order Detail controls first;
- call only the Phase 2E create/clear RPCs;
- refresh the read-only evidence surface after mutation;
- keep controls compact and secondary;
- add focused tests proving no lifecycle/status, Smart Action, automation, notification, dashboard,
  route, navigation, command palette, mobile, Client Portal, or signal suppression behavior
  changed.

After Phase 2K, pause before Attention Summary suppression integration, mobile quick actions,
dashboard/table controls, notification behavior, or automation.

## Phase 2K Implementation Record

Phase 2K implements the smallest create/clear UI for first-wave operational inputs.

Runtime files added:

- `src/features/orders/operational-inputs/OperationalInputsCreateClearControls.jsx`;
- `src/features/orders/operational-inputs/__tests__/OperationalInputsCreateClearControls.test.jsx`.

Runtime files updated:

- `src/features/orders/operational-inputs/orderOperationalInputsApi.js`;
- `src/features/orders/operational-inputs/useOrderOperationalInputs.js`;
- `src/features/orders/operational-inputs/__tests__/orderOperationalInputsApi.test.js`;
- `src/pages/orders/OrderDetail.jsx`;
- `src/pages/orders/__tests__/OrderDetail.test.jsx`.

Phase 2K behavior:

- mounts compact secondary controls on Order Detail only;
- places controls near the existing read-only `Operational Context` evidence surface;
- creates only `inspection_scheduled`, `report_on_track`, and `waiting_on_client`;
- clears active supported operational input evidence;
- calls only `rpc_order_operational_input_create(...)` and
  `rpc_order_operational_input_clear(...)`;
- relies on server-side activity/audit writes from the Phase 2E RPCs;
- refreshes the read-only operational input surface after successful mutation;
- shows restrained success/error feedback;
- hides unsupported active input types from clear controls;
- avoids notes/forms in the first implementation.

Phase 2K preserves:

- no drawer create/clear controls;
- no dashboard controls;
- no Orders table controls;
- no bulk actions;
- no direct table writes;
- no frontend activity writes;
- no lifecycle/status mutation;
- no Smart Action changes;
- no signal suppression integration;
- no automation or notifications;
- no route, navigation, command palette, mobile/PWA/native, Client Portal, AI, branding, or
  production data behavior change.

Pause after Phase 2K before signal suppression integration, mobile quick actions, dashboard/table
controls, notification behavior, automation, or new operational input types.
