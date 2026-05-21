# Company-Safe Order Numbering Model Design

## Purpose

Phase 10D6 designs the future company-safe order numbering model before implementation.

This is documentation-only plus read-only schema/code inspection. It does not add migrations, backend behavior, runtime code, UI changes, route changes, registry changes, tests, permission seeds, RLS/RPC edits, bootstrap seeding, Owner Setup configuration, readiness authority, product-mode authority, module-authoritative security, Vendor/Client activation, order-numbering changes, or notification-default changes.

Order numbering is an operational identity system. It affects user-facing order labels, search, notifications, assignment packets, calendar labels, and client-facing references. It is not access authority.

Phase 10E1 extends this design with a read-only dependency audit in `docs/ORDER_NUMBERING_DEPENDENCY_AUDIT.md`. That audit maps current generation, validation, create, update/manual override, display, search, and uniqueness dependencies before any numbering migration design or implementation.

Phase 10E2 locks the migration strategy in `docs/ORDER_NUMBERING_MIGRATION_STRATEGY.md`. The strategy recommends additive compatibility storage first, a v2 server-side generation helper, guarded RPC create adoption before frontend migration, company-scoped manual/availability checks, and delayed uniqueness changes until company-scoped write safety is proven.

Phase 10E4 implements the additive storage foundation in `supabase/migrations/20260518060000_company_order_numbering_storage.sql`. The migration adds nullable company mapping to legacy numbering rules/counters and backfills the `falcon_default` rule/counters to `public.default_company_id()` when deterministic. It intentionally does not change active numbering generation, order creation/update, frontend behavior, global order-number uniqueness, bootstrap seeding, or Owner Setup.

Phase 10E5 implements the first additive company-id-backed generation helper in `supabase/migrations/20260518061000_company_order_numbering_v2_helper.sql`. `public.next_order_number_v2(uuid, timestamptz)` uses mapped company rules and company-backed counters, returns the existing `YYYY###` format, and fails closed when an existing legacy/null-company counter occupies the same rule/year. It is service-role-only for now and is not active in order creation or frontend prefetch.

## Sources Inspected

Documentation inspected:

- `docs/COMPANY_SETUP_STORAGE_DECISION.md`
- `docs/COMPANY_SETUP_LIVE_READONLY_HANDOFF.md`
- `docs/OWNER_SETUP_UI_SHELL_CONTRACT.md`
- `docs/COMPANY_BRANDING_SETTINGS_SHELL_DESIGN.md`
- `docs/COMPANY_SCOPE_BACKEND_DEPENDENCY_MAP.md`
- `docs/FALCON_MVP_VISION.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Schema and code inspected:

- `supabase/migrations/20260518000000_baseline_extensions_and_schema.sql`
- `supabase/migrations/20260518002000_baseline_static_seed_data.sql`
- `supabase/migrations/20260518017000_company_order_intake_attachment_authorization.sql`
- `supabase/migrations/20260518057000_company_bootstrap_v1_wrapper.sql`
- `supabase/migrations/20260518058000_company_bootstrap_v1_post_validation.sql`
- `src/components/orders/form/OrderForm.jsx`
- `src/components/inputs/OrderNumberField.jsx`
- `src/lib/services/ordersService.js`
- `src/lib/api/orders.js`
- `src/lib/permissions/constants.js`
- readiness resolver tests that keep `order_numbering` unknown

## Current Order-Numbering Model Found

Existing database objects:

- `public.order_counters`
  - legacy counter table keyed by `year`
- `public.next_order_number(p_year integer)`
  - legacy yearly sequence function using `order_counters`
- `public.order_numbering_rules`
  - `id bigint`
  - `company_key text not null unique`
  - `format_kind text default 'year_seq_3'`
  - `year_digits integer default 4`
  - `sequence_digits integer default 3`
  - `reset_period text default 'yearly'`
  - `manual_override_allowed boolean default true`
  - `is_active boolean default true`
  - timestamps
- `public.order_number_counters`
  - `id bigint`
  - `rule_id bigint references order_numbering_rules(id) on delete cascade`
  - `counter_year integer`
  - `last_value integer default 0`
  - timestamps
  - unique `(rule_id, counter_year)`
- `public.rpc_get_next_order_number(p_company_key text default 'falcon_default', p_effective_at timestamptz default now()) returns text`
- `public.rpc_is_order_number_available(p_order_number text, p_ignore_order_id text default null) returns boolean`
- global `orders.order_number` uniqueness through `orders_order_number_key`
- global partial unique index `orders_order_number_unique_idx` on `orders(order_number) where order_number is not null`

Seeded behavior:

- `supabase/migrations/20260518002000_baseline_static_seed_data.sql` seeds one `order_numbering_rules` row for `company_key = 'falcon_default'`.
- The current format returns `YYYY` plus a left-padded sequence, for example `2026001`.

Active frontend/backend behavior:

- `OrderForm` calls `supabase.rpc("rpc_get_next_order_number")` without arguments when creating a new order.
- `OrderForm` stores the returned value in the editable `order_number` field.
- `OrderForm` submits `order_number` through the order payload.
- Active direct order creation still inserts the submitted `order_number`.
- `rpc_create_order(jsonb)`, `rpc_update_order(uuid, jsonb)`, and `rpc_order_update(uuid, jsonb)` accept `order_number` from payload/patch.
- `OrderNumberField` checks global availability by directly reading `orders` where `order_number = value`.
- `ordersService.isOrderNumberAvailable(...)` checks global direct table availability.
- Order reads, search, notifications, activity, assignment packets, calendar events, and display mappers use `orders.order_number` as the user-facing order label.

## Why Legacy `company_key` Is Unsafe For Multi-Company SaaS

The current model is sufficient for the default single-company workspace but insufficient for productized multi-company SaaS.

Problems:

- `company_key` is free text, not a foreign key to `public.companies(id)`.
- The active frontend call defaults to `falcon_default`, so a new company would draw numbers from the default company's counter unless explicitly changed.
- `orders.order_number` is globally unique, so two companies cannot safely use the same natural numbering format.
- `rpc_is_order_number_available(...)` and direct frontend availability checks are global rather than company-scoped.
- Manual order-number entry is not clearly bounded by company rules.
- Order update RPCs can preserve or change `order_number` without a company-safe numbering authority.
- Bootstrap cannot seed safe numbering rules for new companies because there is no company-id-backed numbering contract.
- Readiness cannot truthfully mark numbering ready for new companies.

The text `company_key` may be useful for legacy compatibility, but it must not be the long-term tenant authority.

## Desired Company-ID-Backed Model

Future numbering should be scoped to `public.companies.id`.

Recommended rule model:

- `company_id uuid not null references public.companies(id) on delete restrict`
- one active default rule per company
- optional `rule_key text` only as a display/config key, not tenant authority
- `format_kind text not null`
- optional `prefix text`
- `year_digits integer`
- `sequence_digits integer`
- `reset_period text`
- `manual_override_allowed boolean`
- `is_active boolean`
- `created_at`, `updated_at`
- `created_by`, `updated_by` if consistent with company settings/audit doctrine

Recommended counter model:

- `company_id uuid not null references public.companies(id) on delete restrict`
- `rule_id bigint not null references numbering_rules(id) on delete restrict`
- `counter_period text not null`, such as `2026` for yearly reset
- `last_value integer not null default 0`
- unique `(company_id, rule_id, counter_period)`

Recommended order uniqueness:

- replace global `orders.order_number` uniqueness only after collision checks and backfill.
- target uniqueness should be `(company_id, order_number)` for non-null numbers.
- keep `orders.order_number` as the user-facing label, not a security boundary.

Recommended format behavior:

- Start with an explicit allowlist of supported formats.
- Preserve current default as a supported format: `YYYY` plus sequence padded to 3 digits.
- Add prefix only if validated, for example uppercase letters/digits/dash with short max length.
- Avoid arbitrary template strings in the first implementation.
- Keep reset cadence initially yearly unless a concrete product need exists.

Recommended fallback behavior:

- If no active company rule exists, return a warning/error from setup readiness.
- Order creation should not silently use `falcon_default` for a non-default company.
- A future order creation RPC can either:
  - require an active company rule, or
  - use a hardcoded safe default rule generated server-side for that company after the model exists.
- The fallback must be explicit and auditable; it must not read another company's counter.

## Transaction And Locking Behavior

Number generation must be server-side and atomic.

Recommended behavior:

- Generate the next number inside the same transaction as order creation when possible.
- Use an `insert ... on conflict ... do update ... returning last_value` counter increment pattern, partitioned by company/rule/period.
- Treat gaps as acceptable if a transaction obtains a number and later fails after the counter increments, unless product requirements demand gapless accounting.
- Never rely on frontend-generated sequence values.
- Retry on unique violation if a collision is detected during transition.
- Keep manual overrides separate from generated number allocation.

## Relationship To Bootstrap

Bootstrap should not create numbering rules yet.

Current bootstrap wrapper behavior is correct to return skipped/unknown warnings for order numbering because the company-safe model is not implemented.

Later bootstrap may seed default order-numbering rules only after:

- numbering rules are keyed by `company_id`;
- counters are keyed by company/rule/period;
- order creation uses a company-aware generation path;
- uniqueness is company scoped;
- readiness can verify rule existence;
- the default rule contract is product-approved.

Bootstrap should never seed numbering through broad `companies.settings`, `operating_mode_settings`, product-mode metadata, module metadata, or frontend orchestration.

## Relationship To Owner Setup

Owner Setup can eventually show order-numbering readiness.

Near term:

- Continue showing order numbering as unknown/deferred.
- Do not make Owner Setup block access based on numbering readiness.
- Do not expose a configuration form until backend contracts exist.

Future configuration should:

- use a guarded RPC only;
- require active current-company membership;
- require an explicit permission, likely a new company/order settings permission or a carefully chosen existing company settings permission;
- validate allowed fields;
- write a company audit event when rules change;
- return a narrow result;
- refetch setup context/readiness after success.

Owner Setup must not:

- directly write `order_numbering_rules`;
- directly write `order_number_counters`;
- write numbering into broad `companies.settings`;
- accept arbitrary executable format strings;
- generate numbers in the browser;
- imply numbering setup grants access.

## Relationship To Order Creation

Order creation must eventually become the numbering authority.

Recommended future direction:

- Add a company-aware `rpc_get_next_order_number_v2(...)` or lower-level helper that resolves `current_company_id()` server-side.
- Prefer order creation to generate a number server-side when `order_number` is absent, rather than requiring the browser to prefetch one.
- Preserve manual override only if the active company rule allows it.
- Validate manual overrides against current-company uniqueness.
- Block cross-company uniqueness checks from leaking other companies' order numbers.
- Update availability checks to use a company-scoped RPC rather than direct table reads.

Existing frontend prefill behavior can remain temporarily for the default-company workspace, but it is not the target SaaS design.

## Relationship To Readiness

Readiness should remain diagnostic only.

Future readiness can safely check:

- whether a current-company active numbering rule exists;
- whether the rule has a supported format;
- whether a current counter row can be initialized for the active period;
- whether global-to-company uniqueness migration is complete;
- whether order creation uses the company-aware generator.

Readiness must not:

- grant order creation;
- deny route access;
- bypass order creation permission;
- repair numbering state from the browser;
- hide a backend numbering gap as an optional UX warning once first-order creation depends on it.

## Migration Risks

Known risks:

- Existing global unique constraints/indexes on `orders.order_number` may block company-scoped duplicate formats until migrated.
- Existing order numbers may collide across companies after tenant data grows.
- Active frontend and service paths currently submit `order_number` directly.
- Direct order table writes still exist for some active frontend paths.
- Legacy order update RPCs can update `order_number`.
- Notifications, activity, assignment packets, calendar rows, and search depend on `orders.order_number` for display.
- `rpc_get_next_order_number(...)` mutates counters and is browser callable in active order form behavior.
- Removing global uniqueness too early could allow duplicates before company-scoped constraints are ready.

Migration should be staged and reversible.

## Recommended Future Implementation Slices

1. Inspect order creation dependency more deeply.
   - Confirm every active create/update path that can set `order_number`.
   - Confirm grants on `rpc_get_next_order_number(...)` and `rpc_is_order_number_available(...)`.
   - Confirm whether direct table writes remain required.
   - Completed as Phase 10E1 in `docs/ORDER_NUMBERING_DEPENDENCY_AUDIT.md`.

2. Add company-id-backed numbering compatibility.
   - Either add `company_id` to existing `order_numbering_rules` and `order_number_counters`, or create successor tables.
   - Backfill the existing `falcon_default` rule to `default_company_id()`.
   - Preserve the legacy text `company_key` path until callers are migrated.
   - Phase 10E2 recommends resolving in-place compatibility vs successor v2 tables during 10E3 before implementation.
   - Completed in Phase 10E4 using in-place nullable company mapping columns and no active behavior changes.

3. Implement guarded read/update RPC for numbering configuration.
   - Current-company scoped.
   - Permission guarded.
   - Field allowlisted.
   - Audit-backed.
   - No arbitrary format strings.

4. Implement safe `get_next_order_number` v2.
   - Resolve company server-side from `current_company_id()` or explicit service/operator company id.
   - Increment counters atomically by company/rule/period.
   - Return a generated number and metadata.

5. Update order creation to use v2.
   - Generate server-side when `order_number` is absent.
   - Validate manual overrides when present.
   - Keep order creation authorization separate from numbering readiness.

6. Migrate uniqueness.
   - Add company-scoped unique index on `(company_id, order_number)` where `order_number is not null`.
   - Verify no duplicate drift.
   - Drop or relax global uniqueness only after all active paths are company-aware.

7. Add Owner Setup read-only numbering card.
   - Display rule/readiness status only.
   - Link to future settings only if a guarded config RPC exists.

8. Add Owner Setup numbering configuration.
   - Only after backend model, generator, uniqueness, and tests are stable.

9. Consider bootstrap seeding.
   - Seed default rules only after model and order creation are company-safe.

## Hard No-Go Rules

- No legacy text `company_key` as tenant authority.
- No frontend-generated order numbers.
- No direct table updates from UI.
- No unvalidated arbitrary format execution.
- No cross-company counters.
- No global availability checks for productized multi-company setup.
- No bootstrap seeding before the company-safe model exists.
- No readiness authority.
- No order-numbering changes hidden in broad settings JSON.
- No product-mode/module authority.
- No Vendor/Client activation.
- No silent fallback to `falcon_default` for non-default companies.

## Phase 10D6 Lock

Phase 10D6 is complete as order-numbering model design only.

No order-numbering implementation was added. The next planned design slice is notification-default model design.
