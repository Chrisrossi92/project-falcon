# Operational Status Input Authorization And Activity Plan

## Purpose

This document defines who should be able to create, clear, view, and audit explicit operational
status inputs before any runtime implementation.

Operational status inputs are human evidence records. They must be:

- permission-scoped;
- company-scoped;
- object-scoped;
- auditable;
- non-authoritative.

This phase is planning only. It does not implement runtime code, database schema, Supabase
migrations, RLS/RPC changes, UI, automation, notifications, lifecycle mutation, Smart Actions,
routes, navigation, dashboards, command palette behavior, AI inference, or production data changes.

## Authorization Principles

Lifecycle/workflow authority remains separate.

Rules:

- operational evidence cannot grant workflow power;
- operational evidence cannot bypass permissions;
- operational evidence cannot expose hidden orders or assignments;
- operational evidence cannot move lifecycle state;
- operational evidence cannot make a Smart Action available or unavailable;
- company scoping is mandatory;
- order/object visibility is mandatory;
- future mutations should go through controlled RPCs or equivalent governed server actions, not
  direct public table writes;
- server-side validation should generate audit/activity records where possible;
- route visibility is not enough to authorize operational input writes.

Operational input authorization should be narrower than order read access when needed. A user may
be able to view an order without being allowed to mark every operational input on it.

## First-Wave Input Permissions

First-wave inputs:

- `inspection_scheduled`;
- `report_on_track`;
- `waiting_on_client`.

Recommended actor matrix:

| Input | Appraiser | Reviewer | Admin | Owner |
|---|---|---|---|---|
| `inspection_scheduled` | Create on assigned orders | View only by default | Create/clear in company scope | Create/clear in company scope |
| `report_on_track` | Create on assigned orders | View only by default | Create/clear in company scope | Create/clear in company scope |
| `waiting_on_client` | Create on assigned orders where client dependency is relevant | Create only if review context requires client-side follow-up, otherwise view | Create/clear in company scope | Create/clear in company scope |

Reviewer write access should remain conservative in the first wave because reviewer context may
need its own later input category. Reviewers can still view operational inputs when they can view
the order.

Assignment/vendor recipients should not create internal order operational inputs in the first wave.
If vendor-facing operational inputs are needed later, they should use assignment-scoped contracts.

Future Client Portal users should not create or view internal operational inputs. Client-safe
status projection requires separate planning.

## Create Rules

Create rules:

- appraisers can create operational inputs on assigned orders where their order visibility and
  role/action authority allow it;
- reviewers can create review/context inputs only on assigned review orders and only where a
  specific future input category allows it;
- admins and owners can create first-wave inputs within their company scope when they can view the
  order;
- users cannot create inputs outside current company;
- users cannot create inputs for orders they cannot view;
- users cannot create inputs against assignment packets unless a separate assignment-scoped input
  contract exists;
- users cannot create inputs through direct table mutation;
- duplicate active inputs should refresh or append according to server-side policy, not silently
  overwrite history.

Create validation should check:

- authenticated app user;
- active company;
- active membership;
- order belongs to current company or is otherwise visible through governed object visibility;
- input type is allowed;
- actor is permitted to create that input type for that order;
- optional note/context passes length and content constraints;
- freshness/expiration is computed by governed logic.

## Clear Rules

Clear rules:

- an actor can clear their own active input where they still have order visibility;
- admin/owner can clear company-scoped active inputs where they can view the order;
- clearing should not delete evidence;
- clearing sets `cleared_at`;
- clearing records `cleared_by_user_id`;
- clearing creates an activity/audit record;
- clearing must not change lifecycle state;
- clearing must not imply the underlying work is complete.

Clear validation should check:

- authenticated app user;
- active company;
- active membership;
- visibility to the target order;
- permission to clear own input or company-scoped input;
- target input is active and not already cleared;
- clearing reason/note constraints if a note is later supported.

## View Rules

View rules:

- operational inputs are visible to users who can view the order, subject to company/object scope;
- owner/admin can view company-scoped operational inputs where order visibility allows;
- appraisers can view inputs on assigned orders;
- reviewers can view inputs on review-visible orders;
- assignment/vendor recipients should not see internal order operational inputs;
- future clients should not see internal operational inputs without a client-safe projection.

Operational summaries should use only valid/fresh inputs for suppression or copy changes.

Expired or cleared inputs:

- remain audit/history evidence;
- stop suppressing passive signals;
- may remain visible in activity/history surfaces;
- should not appear as current status unless specifically labeled as expired or cleared.

## Activity Logging Expectations

Every create or clear should create an activity event.

Create activity should include:

- company id;
- order id;
- input type;
- actor user id;
- actor role/context where available;
- created timestamp;
- expires timestamp;
- optional note/context;
- source surface;
- generated user-facing copy.

Clear activity should include:

- company id;
- order id;
- input type;
- original input id;
- actor user id who cleared it;
- clear timestamp;
- optional clear note/context;
- generated user-facing copy.

Actor identity is required. Anonymous or system-ambiguous operational inputs should not be allowed
for first-wave human inputs.

Activity copy should be human-readable and appraisal-native.

Suggested create examples:

- `Inspection scheduled.`;
- `Report marked on track.`;
- `Waiting on client response.`

Suggested clear examples:

- `Operational status cleared: Inspection scheduled.`;
- `Operational status cleared: Report on track.`;
- `Operational status cleared: Waiting on client response.`

Activity copy must not imply:

- lifecycle status changed;
- inspection completed;
- report submitted;
- review cleared;
- client was notified;
- reminder was sent or suppressed;
- extension was approved.

## RLS / RPC Planning

Eventual storage should be RLS protected.

RLS planning:

- records must be scoped by company;
- reads must require order visibility;
- writes must require active membership and permitted action;
- clears must require own-active-input authority or owner/admin authority;
- assignment-recipient access should be denied unless separate assignment-scoped records exist;
- Client Portal access should be denied unless client-safe projection exists.

RPC planning:

- no direct broad public inserts;
- no direct broad public updates;
- mutation through narrow RPCs or equivalent governed server actions;
- RPC validates current company;
- RPC validates order membership/visibility;
- RPC validates permitted input type and permitted actor;
- RPC computes `expires_at`;
- RPC sets actor fields from authenticated context;
- RPC writes audit/activity server-side where possible;
- RPC returns the resulting record and display-safe activity summary where useful;
- RPC must not change lifecycle/workflow state.

Source-scan expectations for implementation:

- no frontend direct insert/update/delete to operational input table;
- no client-authored actor id;
- no client-authored company id overriding current context;
- no lifecycle status writes;
- no notification sends;
- no automation calls.

## Abuse / Staleness Protection

Operational inputs can reduce noise only if they cannot hide risk indefinitely.

Protection rules:

- no silent overwrites;
- evidence should be append-friendly;
- active duplicate policy must be explicit;
- freshness windows still apply;
- expired inputs stop suppressing passive signals;
- owner/admin should be able to inspect stale/cleared history where order visibility allows;
- users should not be able to repeatedly suppress overdue pressure without visible audit history;
- `report_on_track` must not hide overdue work forever;
- `waiting_on_client` must not remove internal accountability;
- `inspection_scheduled` must not imply inspection completed.

Potential anti-abuse policy:

- repeated refreshes inside a short window can create activity but should not extend suppression
  indefinitely without owner/admin visibility;
- overdue orders may use shorter freshness windows;
- clearing or replacing input should preserve prior evidence.

## Explicit Non-Goals

Phase 2C does not implement:

- runtime code;
- schema changes;
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
- production data changes.

## Recommended Next Slice

The safest next slice is **Operational Execution Phase 2D: Operational Status Input Runtime Slice
Readiness Plan**.

Phase 2D should decide whether MVP needs a runtime implementation before launch. If it does, the
slice should define the smallest safe runtime path and required blocker justification. If it does
not, the feature should remain post-MVP.

## Phase 2D Cross-Reference

`docs/OPERATIONAL_STATUS_INPUT_RUNTIME_SLICE_READINESS_PLAN.md` now defines the first possible
runtime implementation boundary.

Authorization and activity constraints for Phase 2E:

- future create/clear writes should use narrow governed RPCs;
- RPCs must validate caller identity, current company, order visibility, input type, and permitted
  actor/action;
- RPCs should create activity/audit server-side where feasible;
- no direct broad public inserts or updates should be exposed;
- no lifecycle mutation, notification, automation, UI, dashboard, Attention Summary, mobile,
  Client Portal, AI, or route/navigation behavior belongs in the first runtime foundation.
