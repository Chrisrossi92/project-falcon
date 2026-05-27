# Operational Status Input Runtime Slice Readiness Plan

## Purpose

This document defines the smallest safe runtime implementation path for explicit operational status
inputs before any schema, RPC, UI, automation, notification, lifecycle, route, dashboard, or mobile
work begins.

The goal is to transition from doctrine/planning into constrained implementation without scope
creep.

This phase is planning only. It does not implement runtime code, database schema, Supabase
migrations, RLS/RPC changes, UI, activity writes, automation, notifications, lifecycle mutation,
Smart Actions, routes, navigation, dashboards, command palette behavior, mobile/PWA/native
behavior, Client Portal behavior, AI inference, or production data changes.

## First Runtime Slice Name

The first possible runtime implementation slice is:

- **Operational Execution Phase 2E: Operational Status Input Schema/RPC Foundation**.

Phase 2E should happen only if MVP readiness review confirms explicit operational inputs are needed
before launch or are required to fix a verified blocker under the MVP stop-line.

## Runtime Readiness Purpose

Phase 2D exists to:

- prevent operational inputs from becoming a broad feature class;
- keep first implementation below UI and automation layers;
- define the exact schema/RPC foundation before touching Supabase;
- preserve lifecycle/workflow authority;
- ensure audit/activity expectations are designed before any write path exists;
- create a stop condition before UI, Attention Summary integration, or automation work.

## Phase 2E Allowed Scope

Phase 2E may include only:

- adding the operational input persistence foundation;
- adding narrow controlled RPCs for create and clear;
- adding server-side audit/activity behavior where feasible;
- adding RLS policies and grants needed for the persistence foundation;
- adding SQL tests or migration verification where the project pattern supports it;
- documenting source-scan expectations for no direct frontend table writes.

Phase 2E must not include:

- UI;
- dashboard changes;
- attention summary changes;
- signal suppression integration;
- automation;
- notifications;
- lifecycle mutation;
- Smart Action changes;
- route or navigation changes;
- mobile app work;
- Client Portal work;
- AI inference.

## Phase 2E Proposed Schema Concept

The schema should model operational inputs as evidence records.

Potential table concept:

- `order_operational_inputs`.

Suggested columns:

| Column | Purpose |
|---|---|
| `id` | Primary key. |
| `company_id` | Company scope. Include even if derivable from order for RLS/query clarity if approved. |
| `order_id` | Target order. |
| `input_type` | Allowlisted input type. |
| `actor_user_id` | App user who created the input. |
| `actor_role` | Optional role/context label captured at creation. |
| `actor_context` | Optional JSON context such as shell/surface metadata. |
| `note` | Optional short note/context. |
| `payload` | JSONB for future-safe metadata. |
| `source` | Manual source only in Phase 2E. |
| `created_at` | Creation timestamp. |
| `expires_at` | Server-calculated freshness expiration. |
| `cleared_at` | Clear timestamp, if cleared. |
| `cleared_by_user_id` | App user who cleared the input. |

Initial `input_type` allowlist:

- `inspection_scheduled`;
- `report_on_track`;
- `waiting_on_client`.

Initial `source` allowlist:

- `manual`.

Possible indexes:

- `(company_id, order_id, input_type, created_at desc)`;
- `(company_id, order_id, cleared_at, expires_at)`;
- partial index for active/fresh records where `cleared_at is null`;
- index supporting lookup by `order_id` for Order Detail summaries.

Schema constraints should consider:

- `expires_at > created_at`;
- `cleared_at is null or cleared_at >= created_at`;
- `cleared_by_user_id` required when `cleared_at` is set;
- `input_type` constrained to the allowlist;
- `source` constrained to manual-only for the first foundation.

The exact SQL names, constraints, policies, grants, and activity table integration should be
finalized in Phase 2E implementation review.

## Phase 2E Proposed RPCs

Proposed controlled RPCs:

- `rpc_order_operational_input_create(...)`;
- `rpc_order_operational_input_clear(...)`.

### `rpc_order_operational_input_create(...)`

Expected purpose:

- create an explicit operational input evidence record for a visible order.

Potential parameters:

- `p_order_id`;
- `p_input_type`;
- `p_note` optional;
- `p_payload` optional and constrained;
- `p_source` defaulting to `manual`.

Expected return:

- normalized active/fresh evidence row;
- display-safe fields only;
- optional activity summary if existing patterns support it.

### `rpc_order_operational_input_clear(...)`

Expected purpose:

- clear an active input without deleting evidence.

Potential parameters:

- `p_input_id`;
- `p_order_id` optional for defensive validation;
- `p_note` optional;

Expected return:

- normalized cleared evidence row;
- optional activity summary if existing patterns support it.

## RPC Behavior Constraints

RPCs must:

- validate caller identity;
- resolve Falcon app user from authenticated context;
- validate current company;
- validate active membership;
- validate order visibility and company scope;
- validate permitted input type;
- validate permitted actor/action;
- calculate `expires_at` server-side;
- set actor fields server-side;
- reject client-authored actor/company overrides;
- prevent direct lifecycle mutation;
- avoid Smart Action side effects;
- create activity/audit event server-side where feasible;
- return normalized active/fresh evidence row;
- reject unsupported source values;
- preserve old evidence instead of silently overwriting it.

RPCs must not:

- update `orders.status`;
- update assignment lifecycle;
- send notifications;
- trigger automation;
- create client/vendor portal projections;
- infer inputs from passive derived signals;
- accept arbitrary future input types.

## RLS Constraints

The operational input table should be protected by RLS.

RLS direction:

- no broad direct inserts;
- no broad direct updates;
- no broad public deletes;
- reads scoped to visible orders and company membership;
- owner/admin read where company order visibility allows;
- appraiser read for assigned visible orders;
- reviewer read for review-visible orders;
- assignment-recipient reads denied unless a future assignment-scoped model exists;
- Client Portal reads denied unless a future client-safe projection exists;
- writes preferably through RPC only.

Grant direction:

- expose execute on narrow RPCs to authenticated users where appropriate;
- keep direct table mutation unavailable to frontend roles;
- preserve service role/system-managed activity behavior where required by existing patterns.

## Activity / Audit Behavior

Phase 2E should add server-side activity/audit generation where feasible.

Create event:

- `Inspection scheduled.`;
- `Report marked on track.`;
- `Waiting on client response.`

Clear event:

- `Operational status cleared: Inspection scheduled.`;
- `Operational status cleared: Report on track.`;
- `Operational status cleared: Waiting on client response.`

Activity payload should include:

- order id;
- company id;
- input id;
- input type;
- actor user id;
- actor role/context where available;
- created/cleared timestamps;
- expires timestamp;
- source;
- note presence or safe note content if existing activity doctrine permits it.

Activity must not imply:

- lifecycle transition;
- inspection completion;
- report submission;
- review clearance;
- client notification delivery;
- reminder suppression or escalation.

## Phase 2E Explicit Non-Goals

Phase 2E must not include:

- UI;
- Order Detail controls;
- drawer controls;
- dashboard changes;
- Attention Summary changes;
- row-level next-step changes;
- signal suppression integration;
- automation;
- notifications;
- lifecycle/status mutation;
- Smart Action changes;
- route changes;
- navigation changes;
- command palette changes;
- Client Portal work;
- mobile app work;
- PWA/native implementation;
- AI inference;
- required-document enforcement;
- reporting/analytics.

## Validation Expectations

Phase 2E validation should include:

- migration applies cleanly in the approved local/disposable target;
- rollback or down-migration expectations are explicit if project pattern requires them;
- RLS/RPC safety review;
- RPC rejects unauthorized order/company cases;
- RPC rejects unsupported input types;
- RPC computes `expires_at` server-side;
- RPC sets actor fields server-side;
- RPC creates activity/audit where feasible;
- source scans confirm no frontend direct table mutations;
- no route, navigation, dashboard, Smart Action, lifecycle, automation, notification, or UI
  behavior changed.

Lint/build:

- run only if runtime files are touched;
- SQL-only implementation should still run relevant migration/RPC verification and static checks
  required by the repo.

## Stop Condition

After Phase 2E, stop.

Do not proceed directly to UI, signal suppression, Attention Summary integration, mobile controls,
notifications, automation, or dashboard behavior.

Required pause review:

- schema shape;
- RLS policies;
- RPC behavior;
- activity/audit output;
- source-scan results;
- MVP blocker justification;
- whether UI is still needed before MVP.

The next phase after Phase 2E, if approved, should be a separate scoped plan for either:

- read-only operational input display; or
- minimal create/clear UI; or
- Attention Summary suppression resolver integration.

Those should not be bundled into Phase 2E.

## Phase 2E Implementation Record

Phase 2E implements the schema/RPC foundation as the first runtime/backend slice for explicit
operational status inputs.

Runtime migration added:

- `supabase/migrations/20260524090000_order_operational_inputs.sql`.

Phase 2E adds:

- `public.order_operational_inputs` as an append-friendly operational evidence table;
- first-wave input types limited to `inspection_scheduled`, `report_on_track`, and
  `waiting_on_client`;
- manual source only;
- server-calculated freshness windows:
  - `inspection_scheduled`: seven days;
  - `report_on_track`: forty-eight hours;
  - `waiting_on_client`: seventy-two hours;
- active/fresh, order history, company/order, and actor indexes;
- RLS-enabled read access scoped through current-company and order-read helpers;
- blocked direct authenticated insert, update, and delete policies;
- `rpc_order_operational_input_create(...)`;
- `rpc_order_operational_input_clear(...)`;
- server-side activity events for create and clear where existing activity-log contracts support
  them.

Phase 2E remains intentionally limited:

- no UI;
- no dashboard changes;
- no Attention Summary changes;
- no signal suppression integration;
- no automation;
- no notifications;
- no lifecycle/status mutation;
- no Smart Action changes;
- no route, navigation, command palette, mobile, Client Portal, or AI behavior.

Stop condition remains active after Phase 2E. Schema, RLS, RPC behavior, activity output, and
source scans should be reviewed before any UI, signal suppression, mobile execution, automation,
or notification slice begins.

## Phase 2E Review And Validation Note

Phase 2E review found the migration scope aligned with the runtime readiness plan:

- the table is append-friendly and non-authoritative;
- input types are constrained to the first wave;
- direct authenticated writes are blocked;
- reads are scoped through current-company and order-read helpers;
- create and clear mutations run only through controlled security-definer RPCs;
- clear behavior preserves evidence rather than deleting records;
- create and clear RPCs write activity events where existing activity-log contracts allow;
- the migration does not mutate order lifecycle/status, create notifications, trigger automation,
  or add UI behavior.

Phase 2E review initially found local migration replay blocked before Phase 2E by an existing local
compatibility issue:

- `20260518011000_company_active_context_contract.sql` depends on `auth.jwt()`;
- the current local Supabase database exposes `auth.uid()` and `auth.role()` but not `auth.jwt()`;
- the local database image inspected during review was `public.ecr.aws/supabase/postgres:17.6.1.121`;
- replay stops at `20260518011000`, before the Phase 2E migration is reached.

This blocker is not caused by `20260524090000_order_operational_inputs.sql`. The safe validation
path is to resolve the local Supabase `auth.jwt()` compatibility gap in a separate environment
validation slice or run the migration chain in an approved disposable Supabase environment that
matches hosted helper availability. Do not rewrite historical active-company migrations as part of
Phase 2E unless a separate migration-replay compatibility fix is explicitly approved.

## Phase 2F Local Migration Replay Compatibility Record

Phase 2F resolves the `auth.jwt()` replay blocker in the active migration chain without changing
Phase 2E operational input behavior.

Migration compatibility updates:

- `20260518011000_company_active_context_contract.sql`;
- `20260518038000_company_setup_context_rpc.sql`;
- `20260518042000_company_member_invite_acceptance.sql`.

The active-chain `auth.jwt()` calls were replaced with guarded reads from
`current_setting('request.jwt.claims', true)::jsonb`, which is the same JWT claim source already
used elsewhere in the active schema. This preserves the existing semantics:

- active-company claims are still read from JWT/app metadata;
- email matching for invite acceptance still reads the JWT email claim;
- missing claims still resolve to `{}` and fall back through existing compatibility behavior;
- authorization continues to validate membership, app user identity, and company scope through the
  existing helper chain.

Phase 2F local replay result:

- the chain now passes the previous `20260518011000` `auth.jwt()` blocker;
- replay continues through company, order, activity, notification, assignment, bootstrap, client,
  user-context, direct-write, and document metadata migrations;
- replay then stops at `20260518071000_order_documents_private_bucket_download_auth.sql` because
  the current local database has the `storage` schema but does not have `storage.buckets` or
  `storage.objects`.

The new blocker is a local Supabase storage-schema/bootstrap compatibility issue, not a Phase 2E
operational input issue. Do not create or retrofit Supabase Storage catalog tables inside Falcon
application migrations. The safe validation path is to repair or reset the local Supabase
environment so Storage's managed schema exists, or validate in a disposable hosted-compatible
Supabase environment. Phase 2E still must pause before UI, signal suppression, mobile execution,
automation, or notification work.

