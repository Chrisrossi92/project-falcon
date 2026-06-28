import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const PLAN_DIR = "imports/historical-orders/plans";
const SQL_DIR = "imports/historical-orders/sql";
const IMPORT_SOURCE = "Historical Import";
const IMPORT_BATCH = "2025_2026";
const INTERNAL_SCOPE = "internal_operations";

const CLIENT_PLAN = path.join(PLAN_DIR, "falcon_2025_2026_clients_import_plan.csv");
const STAFF_PLAN = path.join(PLAN_DIR, "falcon_2025_2026_staff_assignment_plan.csv");
const ORDER_PLAN = path.join(PLAN_DIR, "falcon_2025_2026_orders_import_plan.csv");

function cleanHeader(value) {
  return String(value || "").replace(/^\uFEFF/, "").trim();
}

function clean(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(value);
      if (row.some((cell) => clean(cell) !== "")) rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value !== "" || row.length) {
    row.push(value);
    if (row.some((cell) => clean(cell) !== "")) rows.push(row);
  }

  if (!rows.length) return [];
  const headers = rows[0].map(cleanHeader);
  return rows.slice(1).map((cells) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = clean(cells[index]);
    });
    return record;
  });
}

function readPlan(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing required plan file: ${filePath}`);
  }
  return parseCsv(readFileSync(filePath, "utf8"));
}

function sqlString(value) {
  const text = clean(value);
  if (!text) return "null";
  return `'${text.replace(/'/g, "''")}'`;
}

function sqlNumber(value) {
  const text = clean(value).replace(/[$,]/g, "");
  if (!text) return "null";
  const number = Number(text);
  return Number.isFinite(number) ? String(number) : "null";
}

function sqlDate(value) {
  const text = clean(value);
  if (!text) return "null";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return "null";
  return `'${text}'::date`;
}

function sqlUuid(value) {
  const text = clean(value);
  if (!text) return "null::uuid";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    throw new Error(`Invalid UUID value in import plan: ${text}`);
  }
  return `'${text}'::uuid`;
}

function assertUuidExpressions(context, expressions) {
  const invalid = expressions.filter((expression) => !/::uuid$/i.test(expression));
  if (invalid.length) {
    throw new Error(`${context} emitted UUID expressions without explicit ::uuid casts`);
  }
}

function sqlBigint(value) {
  const text = clean(value);
  if (!/^\d+$/.test(text)) return "null";
  return `${text}::bigint`;
}

function normalizedSql(expression) {
  return `lower(regexp_replace(trim(coalesce(${expression}, '')), '\\s+', ' ', 'g'))`;
}

function attachableInternalClientSql(alias) {
  return `coalesce(${alias}.company_id, public.default_company_id()) = public.current_company_id()
           and coalesce(${alias}.is_merged, false) = false
           and public.current_app_user_can_attach_order_client(${alias}.id)
           and public.client_relationship_has_operations_scope(${alias}.id, public.current_company_id(), '${INTERNAL_SCOPE}')`;
}

function writeClientsSql(clientRows) {
  const createRows = clientRows.filter((row) => row.action === "create");
  const values = createRows
    .map(
      (row) =>
        `    (${sqlString(row.source_client_name)}, ${sqlString(row.normalized_client_name)}, ${sqlString(
          row.source_years,
        )}, ${sqlString(row.source_order_numbers)})`,
    )
    .join(",\n");

  const sql = `-- Falcon historical clients import
-- Generated from ${CLIENT_PLAN}
-- Approval gate: generated SQL only. Review before applying.
-- Expected planned creates: ${createRows.length}
-- Import source: ${IMPORT_SOURCE}
-- Import batch: ${IMPORT_BATCH}

begin;

do $$
begin
  if not exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'clients'
       and column_name = 'operations_scope'
  ) then
    raise exception 'clients.operations_scope is required before historical import';
  end if;
end;
$$;

with source_clients (
  source_client_name,
  normalized_client_name,
  source_years,
  source_order_numbers
) as (
  values
${values || "    (null, null, null, null)"}
),
eligible_clients as (
  select *
    from source_clients
   where source_client_name is not null
),
inserted_clients as (
  insert into public.clients (
    company_id,
    operations_scope,
    name,
    status,
    category,
    contact_mode,
    notes,
    created_at
  )
  select
    public.default_company_id(),
    '${INTERNAL_SCOPE}',
    ec.source_client_name,
    'active',
    'client',
    'contacts',
    concat('Created by historical import planner. source=', '${IMPORT_SOURCE}', '; batch=', '${IMPORT_BATCH}', '; source_order_numbers=', ec.source_order_numbers),
    now()
  from eligible_clients ec
  where not exists (
    select 1
      from public.clients c
     where coalesce(c.company_id, public.default_company_id()) = public.default_company_id()
       and coalesce(c.is_merged, false) = false
       and lower(coalesce(nullif(c.status, ''), 'active')) = 'active'
       and coalesce(c.operations_scope, '${INTERNAL_SCOPE}') = '${INTERNAL_SCOPE}'
       and ${normalizedSql("c.name")} = ${normalizedSql("ec.source_client_name")}
  )
  returning id, name
)
select
  'historical_clients_import' as check_name,
  (select count(*) from eligible_clients) as planned_create_clients,
  (select count(*) from inserted_clients) as inserted_clients,
  (
    select count(*)
      from eligible_clients ec
     where exists (
       select 1
         from public.clients c
        where coalesce(c.company_id, public.default_company_id()) = public.default_company_id()
          and coalesce(c.is_merged, false) = false
          and lower(coalesce(nullif(c.status, ''), 'active')) = 'active'
          and coalesce(c.operations_scope, '${INTERNAL_SCOPE}') = '${INTERNAL_SCOPE}'
          and ${normalizedSql("c.name")} = ${normalizedSql("ec.source_client_name")}
     )
  ) as available_after_import;

commit;
`;

  writeFileSync(path.join(SQL_DIR, "historical_clients_import.sql"), sql);
}

function writeStaffSql(staffRows) {
  assertUuidExpressions(
    "staff mapping SQL",
    staffRows.map((row) => sqlUuid(row.existing_user_id)),
  );

  const values = staffRows
    .map(
      (row) =>
        `    (${sqlString(row.action)}, ${sqlString(row.role)}, ${sqlString(row.source_name)}, ${sqlUuid(
          row.existing_user_id,
        )}, ${sqlString(row.existing_user_name)}, ${sqlString(row.match_type)}, ${sqlString(row.source_order_numbers)})`,
    )
    .join(",\n");
  const staffMappingCte = `with staff_mapping (
  action,
  role,
  source_name,
  existing_user_id,
  existing_user_name,
  match_type,
  source_order_numbers
) as (
  values
${values || "    (null, null, null, null::uuid, null, null, null)"}
)`;

  const sql = `-- Falcon historical staff mapping report
-- Generated from ${STAFF_PLAN}
-- This pass intentionally creates no auth users, staff rows, profiles, memberships, or roles.
-- Reused user ids are consumed by historical_orders_import.sql.

${staffMappingCte}
select
  action,
  role,
  count(*) as mapping_rows
from staff_mapping
group by action, role
order by role, action;

${staffMappingCte}
select *
from staff_mapping
where action <> 'reuse'
order by role, source_name;
`;

  writeFileSync(path.join(SQL_DIR, "historical_staff_mapping.sql"), sql);
}

function writeOrdersSql(orderRows) {
  const insertRows = orderRows.filter((row) => row.action === "insert");
  const skippedRows = orderRows.filter((row) => row.action === "skip_existing");
  const manualRows = orderRows.filter((row) => row.action === "manual_review");
  assertUuidExpressions(
    "orders SQL",
    insertRows.flatMap((row) => [sqlUuid(row.appraiser_user_id), sqlUuid(row.reviewer_user_id)]),
  );

  const values = insertRows
    .map(
      (row) =>
        `    (${sqlString(row.order_number)}, ${sqlString(row.client_name)}, ${sqlString(
          row.normalized_client_name,
        )}, ${sqlBigint(row.existing_client_id)}, ${sqlString(row.property_address)}, ${sqlString(
          row.city,
        )}, ${sqlString(row.state)}, ${sqlString(row.property_type)}, ${sqlNumber(row.fee)}, ${sqlDate(
          row.ordered_date,
        )}, ${sqlDate(row.inspection_date)}, ${sqlDate(row.completed_date)}, ${sqlUuid(
          row.appraiser_user_id,
        )}, ${sqlUuid(row.reviewer_user_id)}, ${sqlString(row.confidence)}, ${sqlString(row.source_file)}, ${sqlString(
          row.source_row,
        )})`,
    )
    .join(",\n");

  const sql = `-- Falcon historical orders import
-- Generated from ${ORDER_PLAN}
-- Approval gate: generated SQL only. Review before applying.
-- Planned safe order inserts: ${insertRows.length}
-- Planned exact order-number skips excluded from this file: ${skippedRows.length}
-- Planned manual-review collisions excluded from this file: ${manualRows.length}
-- Import source: ${IMPORT_SOURCE}
-- Import batch: ${IMPORT_BATCH}

begin;

-- Direct psql execution does not automatically carry Supabase JWT claims.
-- Set a transaction-local service-role claim so order attachment trigger
-- predicates evaluate the same way this approved staging import was planned.
set local "request.jwt.claims" = '{"role":"service_role","suppress_notifications":true,"suppress_email_queue":true}';

-- Historical imports are data backfills, not live workflow events. This flag
-- is consumed by notification/email trigger guards and prevents fanout.
set local "app.suppress_notifications" = 'on';

do $$
begin
  if not exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'orders'
       and column_name = 'import_source'
  ) then
    raise exception 'orders.import_source is required. Apply 20260626090000_add_historical_import_order_metadata.sql first.';
  end if;

  if not exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'orders'
       and column_name = 'import_batch'
  ) then
    raise exception 'orders.import_batch is required. Apply 20260626090000_add_historical_import_order_metadata.sql first.';
  end if;
end;
$$;

with source_orders (
  order_number,
  client_name,
  normalized_client_name,
  planned_existing_client_id,
  property_address,
  city,
  state,
  property_type,
  fee,
  ordered_date,
  inspection_date,
  completed_date,
  appraiser_user_id,
  reviewer_user_id,
  confidence,
  source_file,
  source_row
) as (
  values
${values || "    (null, null, null, null::bigint, null, null, null, null, null::numeric, null::date, null::date, null::date, null::uuid, null::uuid, null, null, null)"}
),
resolved_orders as (
  select
    so.*,
    coalesce(
      (
        select c.id
          from public.clients c
         where c.id = so.planned_existing_client_id
           and ${attachableInternalClientSql("c")}
         limit 1
      ),
      (
        select c.id
          from public.clients c
         where ${attachableInternalClientSql("c")}
           and coalesce(c.operations_scope, '${INTERNAL_SCOPE}') = '${INTERNAL_SCOPE}'
           and ${normalizedSql("c.name")} = ${normalizedSql("so.client_name")}
         order by c.created_at asc nulls last, c.id asc
         limit 1
      )
    ) as resolved_client_id
  from source_orders so
  where so.order_number is not null
),
insertable_orders as (
  select *
    from resolved_orders ro
   where ro.resolved_client_id is not null
     and public.current_app_user_can_attach_order_client(ro.resolved_client_id)
     and not exists (
       select 1
         from public.orders o
        where coalesce(o.company_id, public.default_company_id()) = public.default_company_id()
          and coalesce(o.order_number, '') = ro.order_number
     )
),
inserted_orders as (
  insert into public.orders (
    company_id,
    operations_scope,
    order_number,
    status,
    client_id,
    manual_client,
    manual_client_name,
    property_address,
    address,
    city,
    state,
    property_type,
    base_fee,
    fee_amount,
    date_ordered,
    inspection_date,
    date_billed,
    appraiser_id,
    assigned_to,
    reviewer_id,
    import_source,
    import_batch,
    notes,
    created_at,
    updated_at
  )
  select
    public.default_company_id(),
    '${INTERNAL_SCOPE}',
    io.order_number,
    'completed',
    io.resolved_client_id,
    null,
    null,
    io.property_address,
    io.property_address,
    io.city,
    io.state,
    io.property_type,
    io.fee,
    io.fee,
    io.ordered_date,
    io.inspection_date,
    io.completed_date,
    io.appraiser_user_id,
    io.appraiser_user_id,
    io.reviewer_user_id,
    '${IMPORT_SOURCE}',
    '${IMPORT_BATCH}',
    concat('Historical import from ', io.source_file, ' row ', io.source_row, '. confidence=', coalesce(io.confidence, '')),
    now(),
    now()
  from insertable_orders io
  returning id, order_number
)
select
  'historical_orders_import' as check_name,
  (select count(*) from source_orders where order_number is not null) as planned_safe_orders,
  (select count(*) from resolved_orders where resolved_client_id is null) as unresolved_client_orders,
  (
    select count(*)
      from resolved_orders
     where resolved_client_id is not null
       and not public.current_app_user_can_attach_order_client(resolved_client_id)
  ) as non_attachable_client_orders,
  (select count(*) from insertable_orders) as insertable_orders_this_run,
  (select count(*) from inserted_orders) as inserted_orders,
  (
    select count(*)
      from source_orders so
     where exists (
       select 1
         from public.orders o
        where coalesce(o.company_id, public.default_company_id()) = public.default_company_id()
          and coalesce(o.order_number, '') = so.order_number
     )
  ) as available_or_existing_after_import;

commit;
`;

  writeFileSync(path.join(SQL_DIR, "historical_orders_import.sql"), sql);
}

function main() {
  const clientRows = readPlan(CLIENT_PLAN);
  const staffRows = readPlan(STAFF_PLAN);
  const orderRows = readPlan(ORDER_PLAN);

  mkdirSync(SQL_DIR, { recursive: true });
  writeClientsSql(clientRows);
  writeStaffSql(staffRows);
  writeOrdersSql(orderRows);

  const summary = {
    clients: {
      planned_create: clientRows.filter((row) => row.action === "create").length,
      planned_reuse: clientRows.filter((row) => row.action === "reuse").length,
    },
    staff: {
      reuse: staffRows.filter((row) => row.action === "reuse").length,
      mapping_needed: staffRows.filter((row) => row.action === "mapping_needed").length,
    },
    orders: {
      planned_insert: orderRows.filter((row) => row.action === "insert").length,
      excluded_skip_existing: orderRows.filter((row) => row.action === "skip_existing").length,
      excluded_manual_review: orderRows.filter((row) => row.action === "manual_review").length,
    },
  };

  console.log(JSON.stringify(summary, null, 2));
}

main();
