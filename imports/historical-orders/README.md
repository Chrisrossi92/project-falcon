# Historical Orders Import

This folder holds reusable Falcon historical import inputs, plans, and generated SQL.

## Phase 1-3 Plan Generation

Run:

```bash
npm run historical-import:plan
```

The planner validates local CSV inputs, confirms the approved staging Supabase ref before any
read-only inventory query, detects client/order/staff collisions, and writes files under
`imports/historical-orders/plans/`.

The planner does not write to the database and does not generate final import SQL.

## Phase 4 SQL Generation

Run only after the plan has been reviewed and approved:

```bash
npm run historical-import:generate-sql
```

The SQL generator reads the approved plan files and writes SQL under
`imports/historical-orders/sql/`. It does not connect to Supabase and does not apply SQL.

For the 2025/2026 batch, only rows marked `insert` in
`plans/falcon_2025_2026_orders_import_plan.csv` are emitted into the order import SQL. Exact
order-number matches and manual-review collisions are excluded.

## Current Metadata Decision

Historical imported orders use nullable columns on `public.orders`:

- `import_source`
- `import_batch`

Apply the generated metadata migration before applying the order import SQL.
