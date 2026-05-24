# Operational Status Input Data Contract Plan

## Purpose

This document defines the future data-contract shape for explicit operational status inputs before
any runtime, schema, Supabase, RPC, UI, notification, automation, lifecycle, route, dashboard, or
mobile implementation.

Operational status inputs are lightweight evidence records. They help Falcon preserve explicit
human context such as `inspection_scheduled`, `report_on_track`, and `waiting_on_client` without
creating a second lifecycle system.

This is planning documentation only. It does not create tables, migrations, functions, UI, actions,
notifications, automation, lifecycle mutations, AI inference, routes, dashboards, navigation,
mobile/PWA/native behavior, Client Portal behavior, or production data changes.

## Data Model Philosophy

Operational inputs should be modeled as lightweight evidence records.

They should be:

- explicit: created by a user action, not inferred from silence;
- append-friendly: new confirmations can be recorded without destroying prior evidence;
- auditable: actor, timestamp, company, order, source, and input type should be recoverable;
- freshness-aware: each input can expire or stop suppressing attention after a defined window;
- non-authoritative: inputs do not change lifecycle state, route authority, permissions, RLS/RPC
  behavior, Smart Actions, or workflow action availability;
- company-scoped: every record belongs to a company context;
- object-scoped: every record points to the relevant order, and future records may point to
  assignment or document context only after separate planning;
- conservative: the data contract should preserve what was explicitly stated, not over-interpret
  intent.

The data contract should support future resolver behavior, activity logging, mobile quick inputs,
and automation suppression without requiring any of those systems to exist in Phase 2B.

## Why Not A Single Current Operational Status

Falcon should not model operational context as one `current_operational_status` field.

Reasons:

- operational context is multidimensional;
- an order can be both `inspection_scheduled` and `waiting_on_client`;
- a report can be `report_on_track` while still due soon;
- dependency context and progress confidence are different kinds of evidence;
- old evidence should remain auditable even after a newer input supersedes it;
- a single current field risks becoming a second lifecycle system;
- a single field would encourage UI and automation to treat context as authority;
- future automation needs to know why a reminder was suppressed, not just the latest label.

Recommended model direction:

- records are append-friendly;
- resolvers compute the current effective context from valid, unexpired records;
- manual clearing or superseding can be represented as later evidence;
- lifecycle/workflow state remains separate and authoritative.

## First-Wave Input Contract

### `inspection_scheduled`

Contract meaning:

- user confirms that inspection or site-visit scheduling is handled or known.

Contract boundaries:

- does not mean inspection completed;
- does not mean the appointment happened;
- does not move lifecycle status;
- does not imply report progress.

Resolver use later:

- may suppress or soften `appointment_not_scheduled` while fresh;
- should expire if no structured appointment date exists and freshness window passes;
- should not suppress overdue pressure.

### `report_on_track`

Contract meaning:

- user confirms that report progress appears current.

Contract boundaries:

- does not mean report submitted;
- does not mean inspection completed;
- does not move the order into review;
- does not approve an extension.

Resolver use later:

- may suppress stale/no-update attention while fresh;
- should not suppress overdue entirely;
- should expire faster when due date is near or overdue.

### `waiting_on_client`

Contract meaning:

- user confirms that progress depends on client-side response, documentation, clarification, or
  coordination.

Contract boundaries:

- does not mean client was notified;
- does not send a notification;
- does not remove internal responsibility;
- does not approve an extension;
- does not change lifecycle status.

Resolver use later:

- may replace generic stale copy with client-waiting copy while fresh;
- may increase owner/admin attention if unresolved near due date;
- should not suppress overdue entirely.

## Suggested Fields

The eventual persisted contract should be minimal and explicit.

Suggested fields:

| Field | Purpose |
|---|---|
| `id` | Stable record id. |
| `company_id` | Company/workspace scope. |
| `order_id` | Target order. |
| `input_type` | Explicit input id such as `inspection_scheduled`, `report_on_track`, or `waiting_on_client`. |
| `actor_user_id` | Falcon app-user id of the actor. |
| `actor_role` | Role label or role context at the time of input, if safely available. |
| `actor_context` | Optional JSON context such as shell/profile/surface metadata. |
| `created_at` | When the input was recorded. |
| `expires_at` | When the input stops suppressing or shaping attention. |
| `cleared_at` | When the input was manually cleared, if later supported. |
| `cleared_by_user_id` | User who cleared the input, if later supported. |
| `note` | Optional short human note. |
| `source` | Initial value should be manual-only, such as `manual_order_detail` or `manual_mobile`. |
| `payload` | JSON metadata for future-safe extension. |

Field rules:

- `input_type` should use a closed allowlist;
- `source` should not imply automation in the first implementation;
- `payload` must not be required for first-wave behavior;
- `note` should be optional and length-limited if implemented;
- `expires_at` should be computed from input type and due/status context by governed logic;
- `cleared_at` should not delete history;
- actor fields should reflect the authenticated app user, not arbitrary display input.

## Freshness And Expiration Behavior

Freshness should be resolver-driven, not a permanent status flag.

Rules:

- an input is active only when created, not cleared, and not expired;
- expired inputs remain audit evidence but stop suppressing passive signals;
- manual clearing may be allowed later through a governed action;
- expiration should be computed consistently for each input type;
- expiration should consider due pressure only after the policy is explicitly designed;
- expired inputs should not be hidden from audit/history surfaces merely because they no longer
  affect current attention.

Suggested first-wave freshness:

| Input | Freshness behavior |
|---|---|
| `inspection_scheduled` | Fresh until `expires_at`, or superseded by structured appointment evidence. |
| `report_on_track` | Fresh until `expires_at`; shorter windows near due/overdue work. |
| `waiting_on_client` | Fresh until `expires_at`; may remain visible as historical explanation after expiry. |

Manual clearing:

- should be append/audit-preserving;
- should not erase the original input;
- should be permission-checked;
- should create activity evidence;
- should not change lifecycle state.

## Suppression Resolver Contract

The future suppression resolver should compute attention presentation from ordered evidence.

Recommended hierarchy:

1. Lifecycle/workflow state remains authority.
2. Valid explicit operational evidence can explain or soften attention.
3. Passive derived operational signals provide context from loaded data.
4. Fallback attention heuristics provide conservative copy when evidence is weak.

Resolver rules:

- `overdue` should never disappear solely because operational input exists;
- valid `report_on_track` can soften `stale_update` but not remove due pressure;
- valid `inspection_scheduled` can suppress `appointment_not_scheduled`;
- valid `waiting_on_client` can replace generic stale copy with dependency-specific copy;
- expired or cleared inputs must not suppress active passive signals;
- lifecycle-required actions must remain visible according to workflow/permission authority;
- resolver output should identify which input caused suppression or copy changes for future audit
  and debugging.

Suppression output should remain presentation-only:

- no workflow transitions;
- no notification sends;
- no route access changes;
- no permission changes;
- no Smart Action changes.

## Activity Logging And Audit Expectations

Every future operational input mutation should create an activity/audit trail.

Expected activity events:

- input recorded;
- input refreshed;
- input cleared;
- input expired by resolver, if expiration events are later materialized;
- input superseded by structured evidence, if that becomes part of the policy.

Activity record should capture:

- company id;
- order id;
- input type;
- actor user id;
- actor role/context if available;
- created timestamp;
- expiration timestamp;
- source surface;
- note, if provided;
- previous active input of same type, if superseded;
- cleared actor/timestamp, if cleared.

Audit wording should remain operational:

- `Inspection scheduled was confirmed.`;
- `Report on track was confirmed.`;
- `Waiting on client was marked.`;
- `Operational status input was cleared.`

Audit wording must not say:

- lifecycle status changed;
- report was submitted;
- inspection completed;
- client was notified;
- reminder was sent or suppressed, unless a future automation audit event explicitly records that.

## Permission / RLS Planning Considerations

Operational inputs should be written only through controlled backend paths in a future
implementation.

Planning requirements:

- company scoping is mandatory;
- order visibility is mandatory;
- action permission is separate from route visibility;
- direct public table mutation should not be exposed;
- future writes should use controlled RPCs or equivalent governed server actions;
- RLS should prevent cross-company reads/writes;
- owner/admin users may read all company operational inputs where order visibility allows;
- appraisers may write relevant inputs for assigned work only where permitted;
- reviewers may write review-relevant inputs only where permitted in a future category;
- assignment/vendor recipients should not write internal order operational inputs unless a separate
  assignment-scoped contract is designed;
- Client Portal users should not see or write internal operational inputs.

First-wave role considerations:

| Role | Possible future access |
|---|---|
| Owner/Admin | Read company-scoped inputs; mark/clear where governed; inspect audit. |
| Appraiser | Mark `inspection_scheduled`, `report_on_track`, and possibly `waiting_on_client` on assigned work. |
| Reviewer | Read relevant context; first-wave write access should be limited or deferred. |
| Assignment recipient | No internal order operational input writes in first wave. |
| Client Portal user | No access in first wave; future projection must be client-safe and separate. |

Permission planning must preserve:

- lifecycle authority;
- object-scoped order visibility;
- assignment packet isolation;
- current company membership;
- audit history.

## Mobile Interaction Implications

The data contract should support mobile quick entry later.

Mobile expectations:

- first-wave inputs should be small and easy to tap;
- notes should be optional, not required for every input;
- mobile UI should show freshness labels such as `Confirmed today`, `Expires soon`, or
  `Needs refresh`;
- mobile should not show bulk operational input controls;
- mobile should not make operational inputs look like lifecycle actions;
- mobile actions must still use the same governed write path as desktop.

Data contract implications:

- `source` should identify mobile versus desktop/manual source where useful;
- `actor_context` can preserve shell or surface context without becoming authority;
- `expires_at` enables mobile refresh prompts;
- `payload` can support future device/context metadata only if privacy and audit rules allow.

## Future Automation Compatibility

The contract should be automation-compatible without implementing automation now.

Future automation may consume:

- active input type;
- input age;
- expiration;
- actor role/context;
- source;
- note presence, not necessarily note content;
- lifecycle status;
- due date pressure;
- passive derived signals.

Future automation may use this to:

- suppress a reminder temporarily;
- delay escalation;
- request refresh;
- explain digest context;
- route owner/admin attention;
- avoid duplicate reminders.

Automation constraints:

- no automation in Phase 2B;
- future automation must be owner/admin configurable;
- future automation must be auditable;
- future automation must record why a reminder was sent, suppressed, delayed, or escalated;
- future automation must not infer `report_on_track`, `waiting_on_client`, or
  `inspection_scheduled` from silence;
- future automation must not expose internal input labels to clients/vendors without a projection
  contract.

## Explicit Non-Goals

Phase 2B does not implement:

- runtime code;
- database schema;
- Supabase migration;
- RLS/RPC changes;
- UI changes;
- activity writes;
- automation;
- notifications;
- lifecycle mutation;
- Smart Action changes;
- route changes;
- navigation changes;
- dashboard changes;
- command palette changes;
- mobile/PWA/native implementation;
- Client Portal behavior;
- AI inference;
- risk scoring;
- required-document enforcement;
- public table mutation;
- production data changes.

## Recommended Next Slice

The safest next slice is **Operational Execution Phase 2C: Operational Status Input Authorization
And Activity Plan**.

Phase 2C should plan the exact permission, RPC, RLS, activity-event, audit, and source-scan
requirements for future operational input writes before any schema or runtime implementation.

Phase 2C should remain docs-only unless a separate implementation slice is explicitly approved.

## Phase 2C Cross-Reference

`docs/OPERATIONAL_STATUS_INPUT_AUTHORIZATION_AND_ACTIVITY_PLAN.md` now defines the recommended
create, clear, view, audit, RLS, RPC, and activity rules for the data contract described here.

Phase 2C preserves the data-contract posture:

- evidence is append-friendly and auditable;
- create/clear must not silently overwrite history;
- future writes should use narrow governed RPCs or equivalent server actions;
- actor identity, company scope, order visibility, input type, timestamp, and optional note/context
  remain required planning concepts;
- expired/cleared inputs stop suppressing passive signals;
- no runtime code, schema, migration, UI, automation, notification, lifecycle, route/navigation/
  dashboard, AI, or production data behavior is implemented.

## Phase 2D Cross-Reference

`docs/OPERATIONAL_STATUS_INPUT_RUNTIME_SLICE_READINESS_PLAN.md` now defines Phase 2E as the first
possible runtime slice: Operational Status Input Schema/RPC Foundation.

Phase 2D keeps the data contract constrained:

- the first runtime step may add persistence and narrow create/clear RPCs only;
- the evidence table concept should remain append-friendly, freshness-aware, and
  non-authoritative;
- RPCs should calculate `expires_at`, validate company/order/actor authority, and create
  activity/audit where feasible;
- no UI, dashboard, Attention Summary, suppression resolver, automation, notification, lifecycle,
  route/navigation, mobile, Client Portal, AI, or production data behavior belongs in Phase 2E.
