# Operational Status Input Architecture

## Purpose

This document defines Falcon's operational status input doctrine before any runtime UI, schema,
RPC, activity, notification, automation, mobile, route, dashboard, or workflow implementation.

Operational status inputs are explicit human-provided context signals. They help Falcon understand
whether work appears current, waiting, scheduled, or on track without changing lifecycle state or
workflow authority.

The first-wave input concepts are:

- `inspection_scheduled`;
- `report_on_track`;
- `waiting_on_client`.

This is planning documentation only. It does not change runtime behavior, database schema,
Supabase behavior, RLS/RPC behavior, query behavior, lifecycle/workflow behavior, Smart Actions,
activity writes, notifications, automation, routes, navigation, dashboards, mobile/PWA/native
behavior, Client Portal behavior, branding, or production data.

## Philosophy

Falcon should separate operational evidence from authoritative workflow state.

Lifecycle state answers:

- where is this order in the governed workflow;
- which actions are allowed;
- which permissions and RPCs control the next transition;
- what should be preserved in audit history as lifecycle truth.

Operational context answers:

- what does the responsible human say is happening right now;
- whether work appears current enough to avoid unnecessary pressure;
- whether owner/admin attention should be reduced or increased;
- whether future reminders should wait, summarize, or escalate after approved automation exists.

Operational inputs should be:

- explicit, not inferred from silence;
- non-authoritative;
- auditable;
- time-sensitive;
- easy to update on mobile;
- conservative in wording;
- suppressive or attention-shaping only, not lifecycle-mutating.

## Lifecycle State Versus Operational Context

Lifecycle state remains workflow authority.

Examples of lifecycle/workflow authority:

- `new`;
- `in_progress`;
- `in_review`;
- `needs_revisions`;
- `ready_for_client`;
- `completed`;
- assignment offered / accepted / submitted / completed where governed by assignment RPCs;
- document archive/upload/finalize state where governed by document contracts.

Operational context is not authority.

Examples of operational context:

- an inspection is scheduled;
- the appraiser says the report is on track;
- staff is waiting on a client response;
- a reviewer says review is blocked by missing supporting context;
- an owner/admin marks an order as watched or requiring follow-up in a future slice.

Rules:

- operational input must not unlock or hide workflow actions;
- operational input must not replace lifecycle transition actions;
- operational input must not mark inspection complete, review clear, report submitted, or
  assignment complete;
- operational input must not become permission authority;
- operational input must not change route access, object visibility, RLS, or RPC behavior;
- lifecycle status may influence which operational inputs are relevant, but operational input must
  not rewrite lifecycle status.

## Explicit Operational Input Categories

### Schedule Context

Schedule context records whether work has a known appointment or planned field-work milestone.

First-wave input:

- `inspection_scheduled`.

Future examples:

- inspection window proposed;
- inspection rescheduled;
- inspection blocked by access issue.

### Progress Confidence

Progress confidence records whether the responsible human is affirming that work still appears
current.

First-wave input:

- `report_on_track`.

Future examples:

- report drafting;
- waiting on internal QA;
- ready to submit soon;
- at risk, needs owner/admin attention.

### External Dependency

External dependency records that progress is waiting on someone outside the immediate Falcon staff
workflow.

First-wave input:

- `waiting_on_client`.

Future examples:

- waiting on borrower access;
- waiting on documents;
- waiting on lender clarification;
- waiting on vendor correction.

### Review / Revision Context

Review/revision context records non-authoritative explanation around a review loop.

Future examples:

- reviewer waiting on a file;
- appraiser preparing revision response;
- owner/admin monitoring repeated revisions.

This category is future-only in Phase 2A.

### Assignment Context

Assignment context records non-authoritative human explanation around external assignment progress.

Future examples:

- vendor confirmed work is in progress;
- vendor waiting on access;
- owner/admin waiting on submitted deliverable review.

This category is future-only in Phase 2A.

## Initial First-Wave Inputs

### `inspection_scheduled`

Meaning:

- a human indicates that inspection/site-visit scheduling is known or has been arranged.

Valid use:

- reduce noise from derived `appointment_not_scheduled` warnings when Falcon lacks enough structured
  appointment/date evidence;
- help owner/admin understand that schedule coordination appears active.

Must not mean:

- inspection is complete;
- appointment occurred;
- report work is on track;
- lifecycle status should move forward.

Suggested UI wording:

- `Inspection scheduled`;
- `Inspection scheduling is handled.`;
- `Appointment context was confirmed by a user.`

Freshness expectation:

- expires quickly unless backed by an actual loaded appointment date;
- should be refreshed when due date pressure changes or appointment date is missed.

### `report_on_track`

Meaning:

- a responsible human explicitly says report work still appears on track.

Valid use:

- suppress or reduce stale-update pressure for a limited time;
- help owner/admin avoid interrupting work that has been recently confirmed;
- support future digest wording such as `Work was confirmed on track recently`.

Must not mean:

- report is complete;
- report was submitted;
- review can begin;
- due date changed;
- extension is approved.

Suggested UI wording:

- `Report on track`;
- `Report progress was confirmed recently.`;
- `Work appears current based on user confirmation.`

Freshness expectation:

- short-lived and dependent on due pressure;
- should expire sooner for overdue orders than for orders with comfortable due windows.

### `waiting_on_client`

Meaning:

- a human explicitly says work is waiting on client or client-side information.

Valid use:

- explain why an order may look stale;
- reduce inappropriate reminders to the wrong internal actor;
- increase owner/admin visibility if waiting persists;
- support future automation decisions after policy approval.

Must not mean:

- client has been notified;
- client received an automated message;
- extension is approved;
- lifecycle status changed;
- staff responsibility is removed.

Suggested UI wording:

- `Waiting on client`;
- `Client follow-up is needed.`;
- `Progress depends on client-side response.`

Freshness expectation:

- should expire or request refresh if no client-side response or updated note appears after the
  configured window;
- should become more attention-worthy as due date pressure increases.

## Freshness / Expiration Doctrine

Operational inputs are time-sensitive evidence, not permanent facts.

Freshness rules:

- every explicit operational input needs a timestamp;
- every input needs an actor;
- every input should have a source surface such as Order Detail, drawer, mobile quick action, or
  future command/action surface;
- every input should have an expiration policy before it can drive suppression or automation;
- stale inputs should fade or become `needs refresh`, not continue suppressing attention forever.

Suggested initial freshness windows:

| Input | Suggested freshness | Expiration behavior |
|---|---:|---|
| `inspection_scheduled` | 7 days or until appointment date passes | Stop suppressing appointment warnings unless a structured appointment date exists. |
| `report_on_track` | 2 business days, shorter if overdue | Stop suppressing stale-update pressure and ask for current evidence. |
| `waiting_on_client` | 3 business days | Continue explaining dependency but increase owner/admin attention if unresolved. |

Freshness windows are planning defaults only. They must not be implemented until a runtime slice
defines storage, audit, UI, and tests.

## Signal Suppression Hierarchy

Operational inputs may eventually suppress or soften derived attention signals, but only after
explicit runtime authority and policy are approved.

Recommended hierarchy:

1. Lifecycle/workflow state remains highest authority.
2. Due date and overdue evidence remains high attention.
3. Explicit operational inputs can temporarily explain or soften stale/silence signals.
4. File readiness and review context can refine attention but not suppress due/overdue pressure.
5. Derived silence alone should never infer user intent.
6. Expired operational inputs should not suppress current attention.

Suppression examples:

- `inspection_scheduled` may suppress `appointment_not_scheduled` while fresh.
- `report_on_track` may suppress `stale_update` while fresh, but should not suppress `overdue`.
- `waiting_on_client` may change a stale message from `No recent update` to
  `Waiting on client follow-up`, but should not hide owner/admin attention if due pressure rises.

Non-suppression examples:

- no input should suppress `overdue` entirely;
- no input should suppress workflow action requirements;
- no input should suppress missing permission/access errors;
- no input should suppress file readiness warnings if files are required by a separate future
  authority model.

## Activity Logging Expectations

Every explicit operational input should eventually create auditable evidence.

Activity log expectations:

- actor id;
- actor display label where available;
- company id;
- order id or assignment id;
- input id;
- input label;
- created timestamp;
- expiration timestamp or freshness policy reference;
- optional short note where supported;
- source surface;
- prior active input state if replacing a previous value.

Activity language should be plain:

- `Inspection scheduled was confirmed.`;
- `Report on track was confirmed.`;
- `Waiting on client was marked.`;

Activity logging must not:

- imply lifecycle transition;
- imply notification delivery;
- expose client/vendor/private data beyond existing visibility rules;
- bypass current company, permission, RLS, or RPC authority.

## Mobile Interaction Doctrine

Operational inputs are likely most useful on mobile because they capture quick human evidence at
the moment work is happening.

Mobile doctrine:

- inputs should be one-tap or two-tap confirmations where safe;
- labels must be short and role-native;
- destructive or workflow-changing language must be avoided;
- mobile controls should explain freshness where practical;
- mobile should not expose owner/admin-only inputs to non-admin users;
- mobile quick inputs must still use governed backend authority when implemented;
- offline/native/PWA behavior remains future-only.

Recommended mobile patterns later:

- compact quick action chips in Order Detail / drawer;
- role-specific status confirmation rail;
- lightweight note prompt after selecting `waiting_on_client`;
- freshness badge such as `Confirmed today` or `Needs refresh`;
- no bulk status input controls in MVP.

## Future Automation Compatibility

Operational inputs should be designed so future automation can consume them without changing their
meaning.

Future automation may eventually use inputs to:

- suppress reminders temporarily;
- delay escalation;
- change digest wording;
- route owner/admin attention;
- request refresh after expiration;
- avoid duplicate reminders when recent human confirmation exists.

Automation must not be implemented in Phase 2A.

Future automation rules:

- automation consumes explicit evidence, not silence;
- automation decisions must be owner/admin configurable;
- automation must be rate-limited and auditable;
- automation must preserve permission and object visibility boundaries;
- automation must record why a reminder was sent, suppressed, delayed, or escalated;
- automation must not expose internal status input labels to clients/vendors unless explicitly
  projected through a client/vendor-safe contract.

## Explicit Non-Goals

Phase 2A does not implement:

- runtime UI;
- database schema;
- migrations;
- Supabase changes;
- RLS/RPC changes;
- activity writes;
- notifications;
- automation;
- email/SMS;
- lifecycle transitions;
- Smart Action changes;
- route or navigation changes;
- dashboard changes;
- command palette changes;
- mobile/PWA/native implementation;
- Client Portal behavior;
- AI inference;
- risk scoring;
- required-document enforcement;
- client/vendor-facing status projection.

Do not use operational status input planning as a reason to add a new feature class before MVP
unless it fixes a verified MVP blocker.

## Recommended Next Slice

The safest next slice is **Operational Execution Phase 2B: Operational Status Input Data Contract
Plan**.

Phase 2B should define the minimum future data contract, authorization boundaries, activity log
shape, freshness fields, and test expectations for explicit status inputs before any runtime
implementation.

Phase 2B should still make no runtime UI, schema, migration, Supabase, notification, automation,
lifecycle, Smart Action, route, navigation, dashboard, mobile/PWA/native, Client Portal, AI, or
production data change.

## Phase 2B Cross-Reference

`docs/OPERATIONAL_STATUS_INPUT_DATA_CONTRACT_PLAN.md` now defines the first data-contract plan for
explicit operational inputs.

Phase 2B keeps the Phase 2A doctrine intact:

- operational inputs are lightweight evidence records;
- lifecycle/workflow state remains authority;
- first-wave inputs remain `inspection_scheduled`, `report_on_track`, and `waiting_on_client`;
- explicit inputs are append-friendly, auditable, freshness-aware, and non-authoritative;
- future suppression resolver behavior remains presentation-only;
- runtime UI, schema, Supabase migrations, notifications, automation, lifecycle mutation, AI
  inference, and route/navigation/dashboard changes remain out of scope.

## Phase 2C Cross-Reference

`docs/OPERATIONAL_STATUS_INPUT_AUTHORIZATION_AND_ACTIVITY_PLAN.md` now defines the authorization
and activity doctrine for future explicit operational input writes.

Phase 2C keeps this architecture constrained:

- operational input create/clear behavior must be permission-scoped and company-scoped;
- lifecycle/workflow authority remains separate;
- future mutations should use controlled RPCs or governed server actions, not direct public table
  writes;
- create and clear operations should generate audit/activity evidence;
- expired or cleared inputs remain history but stop suppressing passive signals;
- runtime code, schema, Supabase migration, UI, automation, notifications, lifecycle mutation, AI
  inference, and route/navigation/dashboard changes remain out of scope.

## Phase 2D Cross-Reference

`docs/OPERATIONAL_STATUS_INPUT_RUNTIME_SLICE_READINESS_PLAN.md` now defines the readiness boundary
for the first possible runtime implementation slice.

Phase 2D preserves this architecture:

- Phase 2E may only consider a schema/RPC foundation;
- no UI, Attention Summary integration, signal suppression, automation, notifications, lifecycle
  mutation, route/navigation/dashboard changes, mobile app work, Client Portal work, or AI
  inference are included in the first runtime slice;
- after any Phase 2E schema/RPC foundation, Falcon must pause and review before adding UI or
  suppression behavior.
