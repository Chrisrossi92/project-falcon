# Order Numbering Compatibility Analysis

## Purpose

Phase 10E3 defines the read-only compatibility analysis required before adding company-id-backed order-numbering storage.

This is documentation-only plus read-only schema/code inspection. It does not add migrations, helper views, backend behavior, runtime code, UI changes, route changes, registry changes, tests, permission seeds, RLS/RPC edits, order creation changes, order update changes, numbering generation changes, uniqueness/index changes, bootstrap seeding, Owner Setup numbering configuration, readiness authority, product-mode authority, or Vendor/Client activation.

The goal is to define what must be checked before 10E4 can safely add additive company-id-backed numbering storage or compatibility columns.

## Sources Inspected

Documentation inspected:

- `docs/ORDER_NUMBERING_MIGRATION_STRATEGY.md`
- `docs/ORDER_NUMBERING_DEPENDENCY_AUDIT.md`
- `docs/COMPANY_ORDER_NUMBERING_MODEL_DESIGN.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Schema assumptions inspected:

- `orders.company_id`
- `orders.order_number`
- `public.default_company_id()`
- `tg_orders_preserve_company_id()`
- `order_numbering_rules`
- `order_number_counters`
- `order_counters`
- global `orders.order_number` unique constraint/indexes
- default `order_numbering_rules.company_key = 'falcon_default'` seed

## Current Compatibility Assumptions

Current confirmed assumptions:

- `orders.company_id` exists and is backfilled toward `falcon_default` during the multi-company foundation.
- `orders.company_id` has a `NOT VALID` foreign key to `public.companies(id)`.
- `idx_orders_company_id` exists.
- `orders.order_number` is nullable text.
- `orders.order_number` has global uniqueness through `orders_order_number_key` and `orders_order_number_unique_idx`.
- `order_numbering_rules` is keyed by legacy text `company_key`, not `company_id`.
- `order_number_counters` references `order_numbering_rules(id)` and is unique by `(rule_id, counter_year)`.
- The seeded active default rule uses `company_key = 'falcon_default'`.
- `public.default_company_id()` resolves the company row where `companies.slug = 'falcon_default'`.
- Active order creation currently may submit a browser-held `order_number`.

Compatibility implication:

- The first additive storage slice should not assume numbering storage is already company-id-backed.
- The first additive storage slice should be able to map the existing `falcon_default` rule to `default_company_id()` without changing active generation behavior.
- Existing visible order numbers should remain unchanged.

## Existing Data To Check Before Migration

Before adding company-id-backed numbering storage, operators should inspect:

- whether any orders still have null `company_id`;
- whether any orders have null or blank `order_number`;
- whether current data already has duplicate `(company_id, order_number)` pairs;
- whether global duplicates somehow exist despite current global constraints;
- whether `falcon_default` maps to exactly one company;
- whether every legacy numbering rule can be mapped to a company;
- whether counters exist for each active rule/year;
- whether nonstandard/manual-looking order numbers exist and need preservation;
- whether direct create/update paths are still active and accounted for in the implementation plan.

These checks should run against the target database before 10E4 implementation. Migration code should not proceed on assumptions copied from a local baseline alone.

## Legacy `falcon_default` Mapping

The current default numbering rule uses:

- `order_numbering_rules.company_key = 'falcon_default'`

The current default company helper resolves:

- `public.default_company_id()`
- company row with `companies.slug = 'falcon_default'`

Recommended mapping for compatibility:

- Treat `company_key = 'falcon_default'` as a legacy compatibility key only.
- Map that rule to `public.default_company_id()` when adding company-id-backed storage.
- Preserve the existing `company_key` column and behavior until callers are migrated.
- Do not use `company_key` as tenant authority for new logic.

If a future database has additional legacy `company_key` values, each key needs an explicit mapping rule before counters can be safely company-owned.

## Global Uniqueness Impact

Global uniqueness currently protects against duplicate `orders.order_number` values across all companies.

This is helpful during transition because it prevents duplicate visible labels while write paths remain mixed. It is also a blocker for the final SaaS model because two companies cannot use the same natural sequence.

10E4 should not alter uniqueness. The global uniqueness model should remain in place until:

- company-id-backed numbering storage exists;
- v2 generation exists;
- active create paths are migrated;
- manual override checks are company-scoped;
- `(company_id, order_number)` uniqueness is ready and validated;
- collision repair has an explicit plan.

## Null And Blank Order Numbers

Current schema allows `orders.order_number` to be null.

Null and blank handling recommendations:

- Treat `null` order numbers as needing investigation before company-scoped uniqueness migration.
- Treat blank/whitespace order numbers as data quality issues because uniqueness and display logic may not treat them the same as null.
- Do not auto-generate replacements in 10E3 or 10E4.
- Preserve historical nulls until an explicit repair/backfill plan exists.
- Future generated numbers should be non-null for normal order creation once server-side generation is active.

Readiness should report numbering unknown/deferred until this data shape is understood.

## Manual Override Detection

Manual-looking order numbers cannot be perfectly identified from schema alone.

Useful heuristics:

- Values not matching the current default format `^[0-9]{7}$`.
- Values whose year prefix does not match order `created_at` year.
- Values with letters, punctuation, spaces, or custom prefixes.
- Values lower than or far above the known counter for the corresponding year.
- Values on orders updated after creation where audit/activity records indicate manual edit, if available.

These should be treated as inspection signals, not proof of wrongdoing. Existing manual values should generally be preserved unless a later collision repair plan says otherwise.

## Read-Only Preflight Queries

The following SQL snippets are for manual/operator inspection before 10E4. They should not be added as migrations in this slice.

### Count Orders By Company

```sql
select
  o.company_id,
  c.slug as company_slug,
  c.name as company_name,
  count(*) as order_count,
  count(*) filter (where nullif(btrim(o.order_number), '') is null) as missing_order_number_count
from public.orders o
left join public.companies c on c.id = o.company_id
group by o.company_id, c.slug, c.name
order by order_count desc;
```

### Find Orders Without Company

```sql
select id, order_number, created_at, updated_at
from public.orders
where company_id is null
order by created_at nulls last, id;
```

### Find Null Or Blank Order Numbers

```sql
select company_id, id, order_number, created_at, updated_at
from public.orders
where nullif(btrim(order_number), '') is null
order by created_at nulls last, id;
```

### Find Duplicate `(company_id, order_number)` Pairs

```sql
select
  company_id,
  order_number,
  count(*) as duplicate_count,
  array_agg(id order by created_at nulls last, id) as order_ids
from public.orders
where nullif(btrim(order_number), '') is not null
group by company_id, order_number
having count(*) > 1
order by duplicate_count desc, company_id, order_number;
```

### Find Duplicate Global Order Numbers

The current global unique constraint/index should prevent non-null duplicates. This query verifies the target data and detects any drift from failed/partial historical states.

```sql
select
  order_number,
  count(*) as duplicate_count,
  array_agg(id order by created_at nulls last, id) as order_ids
from public.orders
where nullif(btrim(order_number), '') is not null
group by order_number
having count(*) > 1
order by duplicate_count desc, order_number;
```

### Inspect Numbering Rules By Company Key

```sql
select
  id,
  company_key,
  format_kind,
  year_digits,
  sequence_digits,
  reset_period,
  manual_override_allowed,
  is_active,
  created_at,
  updated_at
from public.order_numbering_rules
order by company_key, id;
```

### Inspect Counters By Rule And Year

```sql
select
  r.company_key,
  c.rule_id,
  c.counter_year,
  c.last_value,
  c.created_at,
  c.updated_at
from public.order_number_counters c
join public.order_numbering_rules r on r.id = c.rule_id
order by r.company_key, c.counter_year;
```

### Map `falcon_default` To Default Company

```sql
select
  public.default_company_id() as default_company_id,
  c.slug,
  c.name,
  c.status
from public.companies c
where c.id = public.default_company_id();
```

### Check `falcon_default` Rule Mapping Candidate

```sql
select
  r.id as rule_id,
  r.company_key,
  public.default_company_id() as proposed_company_id
from public.order_numbering_rules r
where r.company_key = 'falcon_default';
```

### Find Manual-Looking Or Nonstandard Order Numbers

Current generated format is `YYYY` plus three digits. This query identifies values that do not match that shape.

```sql
select company_id, id, order_number, created_at, updated_at
from public.orders
where nullif(btrim(order_number), '') is not null
  and btrim(order_number) !~ '^[0-9]{7}$'
order by created_at nulls last, id;
```

This query identifies seven-digit values whose prefix does not match the order creation year. It is only a heuristic.

```sql
select company_id, id, order_number, created_at, updated_at
from public.orders
where nullif(btrim(order_number), '') is not null
  and btrim(order_number) ~ '^[0-9]{7}$'
  and created_at is not null
  and substring(btrim(order_number) from 1 for 4) <> extract(year from created_at)::text
order by created_at, id;
```

### Inspect Grants For Numbering RPCs

```sql
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args,
  r.rolname as grantee,
  has_function_privilege(r.oid, p.oid, 'EXECUTE') as can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join pg_roles r
where n.nspname = 'public'
  and p.proname in ('rpc_get_next_order_number', 'rpc_is_order_number_available', 'next_order_number')
  and r.rolname in ('anon', 'authenticated', 'service_role')
order by p.proname, r.rolname;
```

### Inspect Dependencies On Legacy Numbering Objects

```sql
select
  dependent_ns.nspname as dependent_schema,
  dependent_view.relname as dependent_object,
  source_ns.nspname as source_schema,
  source_table.relname as source_object
from pg_depend d
join pg_rewrite r on r.oid = d.objid
join pg_class dependent_view on dependent_view.oid = r.ev_class
join pg_namespace dependent_ns on dependent_ns.oid = dependent_view.relnamespace
join pg_class source_table on source_table.oid = d.refobjid
join pg_namespace source_ns on source_ns.oid = source_table.relnamespace
where source_ns.nspname = 'public'
  and source_table.relname in ('order_numbering_rules', 'order_number_counters', 'order_counters')
order by dependent_schema, dependent_object, source_object;
```

Function-body dependency checks should also use source search because PL/pgSQL references may not appear as simple catalog dependencies.

## 10E4 Blockers

The following should block 10E4 additive storage implementation until resolved or explicitly accepted:

- Any orders with null `company_id`.
- Duplicate `(company_id, order_number)` values for non-null/non-blank order numbers.
- Blank order numbers without a documented treatment plan.
- Null order numbers without a documented fallback/repair posture.
- `public.default_company_id()` returning null or multiple ambiguous default company candidates.
- Missing `order_numbering_rules` row for `company_key = 'falcon_default'`.
- More than one active `falcon_default` rule, if data drift is discovered despite the unique key.
- Existing rules/counters that cannot be mapped to a company.
- Counter rows orphaned from rules.
- Unexpected grants that expose mutating legacy numbering functions more broadly than intended.
- Unaccounted active direct create/update paths that can write `order_number`.

10E4 can still be additive if some historical order numbers are nonstandard, but those values must be preserved and treated as manual/historical labels.

## Recommended 10E4 Additive Storage Direction

Recommended 10E4 scope:

- Add company-id-backed numbering storage without changing active order creation.
- Prefer in-place nullable `company_id` compatibility columns on `order_numbering_rules` and `order_number_counters` if preflight checks show this is safe.
- Backfill only the existing `falcon_default` rule/counters to `public.default_company_id()` initially.
- Preserve `company_key` behavior for existing `rpc_get_next_order_number(...)`.
- Add indexes needed for future v2 lookup, but do not swap uniqueness on `orders.order_number`.
- Do not change `OrderForm`.
- Do not change direct table create/update paths.
- Do not change `rpc_create_order(jsonb)`.
- Do not change `rpc_update_order(uuid, jsonb)` or `rpc_order_update(uuid, jsonb)`.
- Do not add Owner Setup numbering configuration.
- Do not seed numbering from bootstrap.

If in-place columns create too much ambiguity, 10E4 should instead add successor v2 tables and copy the default-company rule into them without active callers.

10E4 implementation result:

- `supabase/migrations/20260518060000_company_order_numbering_storage.sql` uses the in-place compatibility-column approach.
- `order_numbering_rules.company_id` and `order_number_counters.company_id` are nullable future v2 mapping columns.
- Existing `company_key` remains active and unchanged.
- Existing generation functions remain unchanged.
- The `falcon_default` rule maps to `public.default_company_id()` when that helper resolves a company.
- Existing counters inherit company mapping from their mapped rule.
- No order creation/update, frontend, uniqueness, bootstrap, or Owner Setup behavior changed.

10E4V verification status:

- Local reset verification passed after repairing a stuck Docker Desktop/backend state.
- `supabase db reset` replayed through `20260518060000_company_order_numbering_storage.sql`.
- Smoke checks confirmed `order_numbering_rules.company_id` and `order_number_counters.company_id` exist.
- Smoke checks confirmed `order_numbering_rules_company_id_fkey` and `order_number_counters_company_id_fkey` exist with `convalidated = false`.
- Smoke checks confirmed the company lookup indexes and future-safe partial unique indexes exist.
- Smoke checks confirmed the seeded `falcon_default` rule maps to `public.default_company_id()`.
- There were no seed counter rows at migration time. After calling the unchanged legacy `rpc_get_next_order_number()`, the created counter row kept `company_id = null`, which confirms active legacy generation was not changed. Future company-id-backed counter writes remain a 10E5 responsibility.
- Smoke checks confirmed legacy `rpc_get_next_order_number()` still returns the existing legacy format.

10E5 implementation status:

- `supabase/migrations/20260518061000_company_order_numbering_v2_helper.sql` adds `public.next_order_number_v2(uuid, timestamptz)` as an additive helper only.
- The helper uses `order_numbering_rules.company_id` as the rule lookup authority and writes `order_number_counters.company_id` on v2-created counters.
- The helper does not use `company_key` as tenant authority.
- Because the legacy counter table still has active uniqueness on `(rule_id, counter_year)`, the helper intentionally fails closed if the rule/year already has a legacy/null-company counter. It does not mutate that legacy counter into a company-backed row.
- Active legacy generation remains unchanged, and frontend/order-create adoption remains deferred.

## Optional Read-Only Helper Views

No helper view is recommended in 10E3.

Reason:

- A docs-only query pack is enough for the current inspection need.
- Helper views would require a migration.
- The next implementation decision is storage shape, not a reusable runtime diagnostic surface.

If future diagnostics need reusable catalog/data checks, add views after 10E4 storage shape is locked.

## Hard No-Go Rules

- No active numbering behavior changes.
- No order creation behavior changes.
- No order update behavior changes.
- No uniqueness/index changes.
- No frontend changes.
- No Owner Setup numbering configuration.
- No bootstrap seeding.
- No `company_key` as target tenant authority.
- No readiness authority.
- No product-mode/module authority.
- No Vendor/Client activation.
