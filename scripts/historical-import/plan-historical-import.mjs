import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const APPROVED_STAGING_REF = "voompccpkjfcsmehdoqu";
const DEFAULT_PRODUCTION_REFS = "okwqhkrsjgxrhyisaovc";
const INPUT_DIR = "imports/historical-orders";
const OUTPUT_DIR = path.join(INPUT_DIR, "plans");
const IMPORT_SOURCE = "Historical Import";
const IMPORT_BATCH = "2025_2026";
const INTERNAL_SCOPE = "internal_operations";

const ORDER_FILES = [
  "falcon_2025_orders_enriched_review.csv",
  "falcon_2026_orders_enriched_review.csv",
];

const CLIENT_FILES = [
  "falcon_2025_clients_from_orders.csv",
  "falcon_2026_clients_from_orders.csv",
];

const REQUIRED_ORDER_COLUMNS = [
  "order_number",
  "client_name",
  "property_address",
  "city",
  "state",
  "year",
  "status",
  "property_type",
  "fee",
  "ordered_date",
  "completed_date",
  "appraiser_name",
  "reviewer_name",
  "normalized_client_name",
  "confidence",
];

const REQUIRED_CLIENT_COLUMNS = [
  "client_name",
  "year",
  "included_order_count",
  "source_order_numbers",
];

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

  if (!rows.length) return { headers: [], records: [] };
  const headers = rows[0].map(cleanHeader);
  const records = rows.slice(1).map((cells, index) => {
    const record = { __row: index + 2 };
    headers.forEach((header, colIndex) => {
      record[header] = clean(cells[colIndex]);
    });
    return record;
  });

  return { headers, records };
}

function readCsv(filePath) {
  const text = readFileSync(filePath, "utf8");
  return parseCsv(text);
}

function normalizeText(value) {
  return clean(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(limited liability company|llc|l\.l\.c\.|incorporated|inc\.|corp\.|corporation|company|co\.)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeClientName(value) {
  return normalizeText(value);
}

function normalizeOrderNumber(value) {
  return clean(value).toUpperCase();
}

function normalizeAddress(value) {
  return normalizeText(value)
    .replace(/\bstreet\b/g, "st")
    .replace(/\bavenue\b/g, "ave")
    .replace(/\broad\b/g, "rd")
    .replace(/\bdrive\b/g, "dr")
    .replace(/\bboulevard\b/g, "blvd")
    .replace(/\blane\b/g, "ln")
    .replace(/\bhighway\b/g, "hwy")
    .replace(/\broute\b/g, "rt")
    .replace(/\bnorth\b/g, "n")
    .replace(/\bsouth\b/g, "s")
    .replace(/\beast\b/g, "e")
    .replace(/\bwest\b/g, "w")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(value) {
  return new Set(normalizeText(value).split(" ").filter(Boolean));
}

function jaccard(left, right) {
  const a = tokenSet(left);
  const b = tokenSet(right);
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  return intersection / (a.size + b.size - intersection);
}

function isSimilar(left, right, threshold = 0.82) {
  const a = normalizeText(left);
  const b = normalizeText(right);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a) || jaccard(a, b) >= threshold;
}

function toNumber(value) {
  const normalized = clean(value).replace(/[$,]/g, "");
  if (!normalized) return "";
  const num = Number(normalized);
  return Number.isFinite(num) ? num : "";
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function writeCsv(filePath, rows, columns) {
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")),
  ];
  writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function requireColumns(fileName, headers, requiredColumns) {
  const missing = requiredColumns.filter((column) => !headers.includes(column));
  return missing.map((column) => ({
    file: fileName,
    severity: "error",
    issue: "missing_required_column",
    detail: column,
  }));
}

function loadInputs() {
  const validationIssues = [];
  const orders = [];
  const clients = [];

  for (const fileName of ORDER_FILES) {
    const filePath = path.join(INPUT_DIR, fileName);
    if (!existsSync(filePath)) {
      validationIssues.push({ file: fileName, severity: "error", issue: "missing_file", detail: filePath });
      continue;
    }
    const { headers, records } = readCsv(filePath);
    validationIssues.push(...requireColumns(fileName, headers, REQUIRED_ORDER_COLUMNS));
    for (const record of records) {
      orders.push({ ...record, source_file: fileName });
    }
  }

  for (const fileName of CLIENT_FILES) {
    const filePath = path.join(INPUT_DIR, fileName);
    if (!existsSync(filePath)) {
      validationIssues.push({ file: fileName, severity: "error", issue: "missing_file", detail: filePath });
      continue;
    }
    const { headers, records } = readCsv(filePath);
    validationIssues.push(...requireColumns(fileName, headers, REQUIRED_CLIENT_COLUMNS));
    for (const record of records) {
      clients.push({ ...record, source_file: fileName });
    }
  }

  for (const order of orders) {
    for (const field of ["order_number", "client_name", "property_address", "year", "status"]) {
      if (!clean(order[field])) {
        validationIssues.push({
          file: order.source_file,
          row: order.__row,
          severity: "error",
          issue: "missing_required_value",
          detail: field,
        });
      }
    }
    if (clean(order.status).toLowerCase() !== "completed") {
      validationIssues.push({
        file: order.source_file,
        row: order.__row,
        severity: "warning",
        issue: "unexpected_historical_status",
        detail: order.status,
      });
    }
    if (!["2025", "2026"].includes(clean(order.year))) {
      validationIssues.push({
        file: order.source_file,
        row: order.__row,
        severity: "warning",
        issue: "unexpected_year",
        detail: order.year,
      });
    }
  }

  return { orders, clients, validationIssues };
}

function projectRefFromUrl(url) {
  try {
    return new URL(url).host.split(".")[0] || "";
  } catch {
    return "";
  }
}

function loadEnv() {
  dotenv.config({ path: ".env.staging.local", override: false, quiet: true });
  dotenv.config({ override: false, quiet: true });

  const stagingUrl = process.env.AMC_STAGING_SUPABASE_URL || "";
  const stagingRef = process.env.AMC_STAGING_PROJECT_REF || "";
  const serviceRoleKey =
    process.env.AMC_STAGING_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const productionRefs = new Set(
    (process.env.AMC_PRODUCTION_PROJECT_REFS || DEFAULT_PRODUCTION_REFS)
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const actualRef = projectRefFromUrl(stagingUrl);

  return { stagingUrl, stagingRef, serviceRoleKey, productionRefs, actualRef };
}

function assertApprovedStaging(env) {
  if (!env.stagingRef || !env.stagingUrl || !env.serviceRoleKey) {
    return { ok: false, reason: "missing_staging_environment" };
  }
  if (env.stagingRef !== APPROVED_STAGING_REF) {
    return { ok: false, reason: `unexpected_staging_ref:${env.stagingRef}` };
  }
  if (env.actualRef !== APPROVED_STAGING_REF || env.actualRef !== env.stagingRef) {
    return { ok: false, reason: `staging_url_ref_mismatch:${env.actualRef || "unknown"}` };
  }
  if (env.productionRefs.has(env.actualRef)) {
    return { ok: false, reason: `ref_is_denied_production:${env.actualRef}` };
  }
  return { ok: true, reason: "approved_staging_ref_confirmed" };
}

async function fetchAll(client, table, select, options = {}) {
  const pageSize = options.pageSize || 1000;
  const rows = [];
  let from = 0;

  while (true) {
    let query = client.from(table).select(select).range(from, from + pageSize - 1);
    if (options.orderBy) query = query.order(options.orderBy, { ascending: true });
    if (options.eq) {
      for (const [column, value] of Object.entries(options.eq)) {
        query = query.eq(column, value);
      }
    }
    const { data, error } = await query;
    if (error) throw new Error(`${table} inventory failed: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

async function fetchInventory(env) {
  const client = createClient(env.stagingUrl, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: currentCompanyId, error: currentCompanyError } = await client.rpc("current_company_id");
  if (currentCompanyError) throw new Error(`current company inventory failed: ${currentCompanyError.message}`);

  const [clients, orders, users, userProfiles] = await Promise.all([
    fetchAll(
      client,
      "clients",
      "id,name,status,category,client_type,kind,is_merged,merged_into_id,amc_id,company_id,operations_scope,created_at",
      { orderBy: "id" },
    ),
    fetchAll(
      client,
      "orders",
      "id,order_number,client_id,managing_amc_id,manual_client,manual_client_name,property_address,address,city,state,postal_code,zip,status,operations_scope,appraiser_id,reviewer_id,assigned_to,created_at",
      { orderBy: "created_at" },
    ),
    fetchAll(
      client,
      "users",
      "id,name,email,role,display_name,full_name,status,is_active,auth_id,created_at",
      { orderBy: "name" },
    ),
    fetchAll(
      client,
      "user_profiles",
      "user_id,display_name,full_name,name,role,status,is_active",
      { orderBy: "user_id" },
    ),
  ]);

  return { clients, orders, users, userProfiles, currentCompanyId };
}

function buildIndexes(inventory) {
  const clientsById = new Map();
  const clientsByNormalizedName = new Map();
  for (const client of inventory.clients || []) {
    clientsById.set(String(client.id), client);
    const normalized = normalizeClientName(client.name);
    if (!normalized) continue;
    if (!clientsByNormalizedName.has(normalized)) clientsByNormalizedName.set(normalized, []);
    clientsByNormalizedName.get(normalized).push(client);
  }

  const ordersByNumber = new Map();
  const ordersByAddress = new Map();
  for (const order of inventory.orders || []) {
    const orderNumber = normalizeOrderNumber(order.order_number);
    if (orderNumber) ordersByNumber.set(orderNumber, order);
    const address = normalizeAddress(order.property_address || order.address);
    if (!address) continue;
    if (!ordersByAddress.has(address)) ordersByAddress.set(address, []);
    ordersByAddress.get(address).push(order);
  }

  const staffCandidates = [];
  for (const user of inventory.users || []) {
    const profile = (inventory.userProfiles || []).find((row) => row.user_id === user.id) || {};
    const names = [
      user.name,
      user.display_name,
      user.full_name,
      user.email,
      profile.name,
      profile.display_name,
      profile.full_name,
    ].filter(Boolean);
    staffCandidates.push({
      ...user,
      profile,
      normalizedNames: [...new Set(names.map(normalizeClientName).filter(Boolean))],
    });
  }

  return {
    clientsById,
    clientsByNormalizedName,
    ordersByNumber,
    ordersByAddress,
    staffCandidates,
    currentCompanyId: inventory.currentCompanyId || "",
  };
}

function clientDisplayNameForOrder(order, indexes) {
  const clientId = order?.client_id == null ? "" : String(order.client_id);
  const client = clientId ? indexes.clientsById.get(clientId) : null;
  return client?.name || order?.manual_client_name || order?.manual_client || "";
}

function clientHasInternalRelationship(client, indexes) {
  if (!client?.id) return false;
  const companyId = client.company_id || indexes.currentCompanyId;
  const relatedOrders = [...indexes.ordersByNumber.values()].filter(
    (order) =>
      String(order.client_id || "") === String(client.id) || String(order.managing_amc_id || "") === String(client.id),
  );
  const hasAmcOrders = relatedOrders.some((order) => (order.operations_scope || "internal_operations") === "amc_operations");
  const hasInternalOrders = relatedOrders.some(
    (order) => (order.operations_scope || "internal_operations") === "internal_operations",
  );

  if (!companyId || !indexes.currentCompanyId || companyId !== indexes.currentCompanyId) return false;
  return !hasAmcOrders || hasInternalOrders;
}

function isAttachableInternalClient(client, indexes) {
  const companyId = client?.company_id || indexes.currentCompanyId;
  return Boolean(
    client?.id &&
      companyId &&
      indexes.currentCompanyId &&
      companyId === indexes.currentCompanyId &&
      !client.is_merged &&
      clientHasInternalRelationship(client, indexes),
  );
}

function findClientMatch(name, indexes) {
  const normalized = normalizeClientName(name);
  const exact = indexes.clientsByNormalizedName.get(normalized) || [];
  const reusableExact = exact.find((client) => isAttachableInternalClient(client, indexes));
  if (reusableExact) return { action: "reuse", match_type: "exact_normalized_name_attachable_internal", client: reusableExact };

  for (const client of indexes.clientsByNormalizedName.values()) {
    for (const candidate of client) {
      if (isAttachableInternalClient(candidate, indexes) && isSimilar(name, candidate.name, 0.86)) {
        return { action: "reuse", match_type: "similar_name_attachable_internal", client: candidate };
      }
    }
  }

  return { action: "create", match_type: "none", client: null };
}

function findStaffMatch(rawName, indexes) {
  const name = clean(rawName);
  if (!name) return { action: "blank", match_type: "blank", user: null };
  if (/^(unknown|n\/a|na|none|unassigned)$/i.test(name)) {
    return { action: "blank", match_type: "unknown", user: null };
  }

  const normalized = normalizeClientName(name);
  for (const candidate of indexes.staffCandidates) {
    if (candidate.normalizedNames.includes(normalized)) {
      return { action: "reuse", match_type: "exact_normalized_name", user: candidate };
    }
  }

  for (const candidate of indexes.staffCandidates) {
    if (candidate.normalizedNames.some((candidateName) => isSimilar(normalized, candidateName, 0.88))) {
      return { action: "reuse", match_type: "similar_name", user: candidate };
    }
  }

  return { action: "mapping_needed", match_type: "none", user: null };
}

function detectAddressCollision(candidate, indexes) {
  const normalizedAddress = normalizeAddress(candidate.property_address);
  if (!normalizedAddress) return null;

  const exactAddressRows = indexes.ordersByAddress.get(normalizedAddress) || [];
  const possibleRows = exactAddressRows.length
    ? exactAddressRows
    : [...indexes.ordersByAddress.entries()]
        .filter(([address]) => isSimilar(normalizedAddress, address, 0.88))
        .flatMap(([, rows]) => rows);

  for (const existing of possibleRows) {
    const existingClient = clientDisplayNameForOrder(existing, indexes);
    const candidateClient = candidate.normalized_client_name || candidate.client_name;
    if (isSimilar(candidateClient, existingClient, 0.78)) {
      return {
        existing,
        existing_client_name: existingClient,
        match_type: exactAddressRows.includes(existing)
          ? "same_normalized_address_similar_client"
          : "similar_address_similar_client",
      };
    }
  }

  return null;
}

function createPlans(inputs, inventory, inventoryStatus) {
  const indexes = buildIndexes(inventory);
  const uniqueClients = new Map();

  for (const client of inputs.clients) {
    const name = client.client_name;
    const normalized = normalizeClientName(name);
    if (!normalized) continue;
    if (!uniqueClients.has(normalized)) {
      uniqueClients.set(normalized, {
        normalized_client_name: normalized,
        client_name: name,
        years: new Set(),
        source_order_numbers: new Set(),
        source_files: new Set(),
      });
    }
    const aggregate = uniqueClients.get(normalized);
    aggregate.years.add(client.year);
    aggregate.source_files.add(client.source_file);
    for (const orderNumber of clean(client.source_order_numbers).split(";").map(clean).filter(Boolean)) {
      aggregate.source_order_numbers.add(orderNumber);
    }
  }

  for (const order of inputs.orders) {
    const name = order.normalized_client_name || order.client_name;
    const normalized = normalizeClientName(name);
    if (!normalized || uniqueClients.has(normalized)) continue;
    uniqueClients.set(normalized, {
      normalized_client_name: normalized,
      client_name: name,
      years: new Set([order.year]),
      source_order_numbers: new Set([order.order_number]),
      source_files: new Set([order.source_file]),
    });
  }

  const clientPlan = [...uniqueClients.values()]
    .sort((a, b) => a.client_name.localeCompare(b.client_name))
    .map((client) => {
      const match = inventoryStatus === "ok" ? findClientMatch(client.client_name, indexes) : { action: "unknown", match_type: "db_inventory_unavailable", client: null };
      return {
        action: match.action,
        match_type: match.match_type,
        source_client_name: client.client_name,
        normalized_client_name: client.normalized_client_name,
        existing_client_id: match.client?.id || "",
        existing_client_name: match.client?.name || "",
        target_operations_scope: INTERNAL_SCOPE,
        import_source: IMPORT_SOURCE,
        import_batch: IMPORT_BATCH,
        source_years: [...client.years].sort().join("; "),
        source_order_numbers: [...client.source_order_numbers].sort().join("; "),
      };
    });

  const staffNames = new Map();
  for (const order of inputs.orders) {
    for (const [role, rawName] of [
      ["appraiser", order.appraiser_name],
      ["reviewer", order.reviewer_name],
    ]) {
      const normalized = normalizeClientName(rawName);
      if (!normalized) continue;
      const key = `${role}:${normalized}`;
      if (!staffNames.has(key)) {
        staffNames.set(key, {
          role,
          raw_name: rawName,
          normalized_name: normalized,
          source_order_numbers: new Set(),
        });
      }
      staffNames.get(key).source_order_numbers.add(order.order_number);
    }
  }

  const staffPlan = [...staffNames.values()]
    .sort((a, b) => `${a.role}:${a.raw_name}`.localeCompare(`${b.role}:${b.raw_name}`))
    .map((staff) => {
      const match = inventoryStatus === "ok" ? findStaffMatch(staff.raw_name, indexes) : { action: "unknown", match_type: "db_inventory_unavailable", user: null };
      return {
        action: match.action,
        role: staff.role,
        source_name: staff.raw_name,
        normalized_name: staff.normalized_name,
        existing_user_id: match.user?.id || "",
        existing_user_name: match.user?.display_name || match.user?.full_name || match.user?.name || "",
        existing_user_email: match.user?.email || "",
        match_type: match.match_type,
        source_order_numbers: [...staff.source_order_numbers].sort().join("; "),
      };
    });

  const clientPlanByNormalized = new Map(clientPlan.map((client) => [client.normalized_client_name, client]));
  const staffPlanByRoleName = new Map(staffPlan.map((staff) => [`${staff.role}:${staff.normalized_name}`, staff]));

  const orderPlan = [];
  const collisionAudit = [];

  for (const order of inputs.orders) {
    const orderNumber = normalizeOrderNumber(order.order_number);
    const existingOrder = inventoryStatus === "ok" ? indexes.ordersByNumber.get(orderNumber) : null;
    const clientKey = normalizeClientName(order.normalized_client_name || order.client_name);
    const client = clientPlanByNormalized.get(clientKey);
    const appraiser = staffPlanByRoleName.get(`appraiser:${normalizeClientName(order.appraiser_name)}`);
    const reviewer = staffPlanByRoleName.get(`reviewer:${normalizeClientName(order.reviewer_name)}`);

    let action = "insert";
    let reason = "no_collision_detected";
    let existingOrderId = "";
    let existingOrderNumber = "";
    let existingClientName = "";

    if (inventoryStatus !== "ok") {
      action = "unknown";
      reason = "db_inventory_unavailable";
    } else if (existingOrder) {
      action = "skip_existing";
      reason = "exact_existing_order_number";
      existingOrderId = existingOrder.id;
      existingOrderNumber = existingOrder.order_number;
      existingClientName = clientDisplayNameForOrder(existingOrder, indexes);
    } else {
      const addressCollision = detectAddressCollision(order, indexes);
      if (addressCollision) {
        action = "manual_review";
        reason = addressCollision.match_type;
        existingOrderId = addressCollision.existing.id;
        existingOrderNumber = addressCollision.existing.order_number;
        existingClientName = addressCollision.existing_client_name;
      }
    }

    const row = {
      action,
      reason,
      order_number: order.order_number,
      source_file: order.source_file,
      source_row: order.__row,
      client_name: order.client_name,
      normalized_client_name: order.normalized_client_name || order.client_name,
      client_action: client?.action || "unknown",
      existing_client_id: client?.existing_client_id || "",
      property_address: order.property_address,
      city: order.city,
      state: order.state,
      year: order.year,
      status: "completed",
      property_type: order.property_type,
      fee: toNumber(order.fee),
      ordered_date: order.ordered_date,
      inspection_date: order.inspection_date,
      completed_date: order.completed_date,
      appraiser_source_name: order.appraiser_name,
      appraiser_action: appraiser?.action || "blank",
      appraiser_user_id: appraiser?.existing_user_id || "",
      reviewer_source_name: order.reviewer_name,
      reviewer_action: reviewer?.action || "blank",
      reviewer_user_id: reviewer?.existing_user_id || "",
      target_operations_scope: INTERNAL_SCOPE,
      import_source: IMPORT_SOURCE,
      import_batch: IMPORT_BATCH,
      existing_order_id: existingOrderId,
      existing_order_number: existingOrderNumber,
      existing_client_name: existingClientName,
      confidence: order.confidence,
      evidence_notes: order.evidence_notes,
    };

    orderPlan.push(row);

    if (action !== "insert") {
      collisionAudit.push({
        collision_type: reason,
        recommended_action: action,
        order_number: order.order_number,
        client_name: order.client_name,
        property_address: order.property_address,
        existing_order_id: existingOrderId,
        existing_order_number: existingOrderNumber,
        existing_client_name: existingClientName,
        source_file: order.source_file,
        source_row: order.__row,
      });
    }
  }

  return { clientPlan, staffPlan, orderPlan, collisionAudit };
}

function countBy(rows, field) {
  return rows.reduce((counts, row) => {
    const key = row[field] || "blank";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function inspectMetadataRecommendation() {
  const baselinePath = "supabase/migrations/20260518000000_baseline_extensions_and_schema.sql";
  const baseline = existsSync(baselinePath) ? readFileSync(baselinePath, "utf8") : "";
  const tableStart = baseline.indexOf('CREATE TABLE IF NOT EXISTS "public"."orders"');
  const nextTable = tableStart >= 0 ? baseline.indexOf("CREATE TABLE", tableStart + 1) : -1;
  const ordersDefinition =
    tableStart >= 0 ? baseline.slice(tableStart, nextTable > tableStart ? nextTable : undefined) : "";
  const ordersHasImportSource = /"import_source"\s+/i.test(ordersDefinition);
  const ordersHasImportBatch = /"import_batch"\s+/i.test(ordersDefinition);
  const hasDetailsJson =
    /"(metadata|details|detail)"\s+"?jsonb"?/i.test(ordersDefinition);

  if (ordersHasImportSource && ordersHasImportBatch) {
    return "Use existing orders.import_source and orders.import_batch columns.";
  }
  if (hasDetailsJson) {
    return "Use existing order metadata/details JSON field for import_source and import_batch after approval.";
  }
  return "No existing orders import_source/import_batch or obvious metadata JSON field was found in inspected migrations. Recommend adding explicit nullable orders.import_source and orders.import_batch columns, plus optional historical_import_batches metadata table, before SQL generation.";
}

function writeOutputs(plans, validationIssues, summary) {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  writeCsv(path.join(OUTPUT_DIR, "falcon_2025_2026_clients_import_plan.csv"), plans.clientPlan, [
    "action",
    "match_type",
    "source_client_name",
    "normalized_client_name",
    "existing_client_id",
    "existing_client_name",
    "target_operations_scope",
    "import_source",
    "import_batch",
    "source_years",
    "source_order_numbers",
  ]);

  writeCsv(path.join(OUTPUT_DIR, "falcon_2025_2026_staff_assignment_plan.csv"), plans.staffPlan, [
    "action",
    "role",
    "source_name",
    "normalized_name",
    "existing_user_id",
    "existing_user_name",
    "existing_user_email",
    "match_type",
    "source_order_numbers",
  ]);

  writeCsv(path.join(OUTPUT_DIR, "falcon_2025_2026_orders_import_plan.csv"), plans.orderPlan, [
    "action",
    "reason",
    "order_number",
    "source_file",
    "source_row",
    "client_name",
    "normalized_client_name",
    "client_action",
    "existing_client_id",
    "property_address",
    "city",
    "state",
    "year",
    "status",
    "property_type",
    "fee",
    "ordered_date",
    "inspection_date",
    "completed_date",
    "appraiser_source_name",
    "appraiser_action",
    "appraiser_user_id",
    "reviewer_source_name",
    "reviewer_action",
    "reviewer_user_id",
    "target_operations_scope",
    "import_source",
    "import_batch",
    "existing_order_id",
    "existing_order_number",
    "existing_client_name",
    "confidence",
    "evidence_notes",
  ]);

  writeCsv(path.join(OUTPUT_DIR, "falcon_2025_2026_existing_db_collision_audit.csv"), plans.collisionAudit, [
    "collision_type",
    "recommended_action",
    "order_number",
    "client_name",
    "property_address",
    "existing_order_id",
    "existing_order_number",
    "existing_client_name",
    "source_file",
    "source_row",
  ]);

  writeCsv(path.join(OUTPUT_DIR, "falcon_2025_2026_validation_issues.csv"), validationIssues, [
    "file",
    "row",
    "severity",
    "issue",
    "detail",
  ]);

  const markdown = `# Falcon 2025/2026 Historical Import Plan

Generated: ${new Date().toISOString()}

## Target

- Staging status: ${summary.staging.status}
- Project ref: ${summary.staging.project_ref || "(not confirmed)"}
- Database writes: none
- Final SQL generated: no
- Target operations scope: ${INTERNAL_SCOPE}
- Import source: ${IMPORT_SOURCE}
- Import batch: ${IMPORT_BATCH}

## Input Counts

- Candidate orders: ${summary.input.orders}
- Candidate clients: ${summary.input.clients}
- Validation errors: ${summary.validation.errors}
- Validation warnings: ${summary.validation.warnings}

## Staging Inventory

- Existing orders read: ${summary.inventory.orders}
- Existing clients read: ${summary.inventory.clients}
- Existing staff/users read: ${summary.inventory.staff}

## Plan Counts

### Clients

${Object.entries(summary.plans.clients)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join("\n")}

### Staff

${Object.entries(summary.plans.staff)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join("\n")}

### Orders

${Object.entries(summary.plans.orders)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join("\n")}

## Metadata Recommendation

${summary.metadataRecommendation}

## Notes

- Exact existing order number matches are marked \`skip_existing\`.
- Same or similar property address plus same or similar client is marked \`manual_review\`.
- Missing staff are marked \`mapping_needed\`; users are not created by this planner.
- Unknown or blank appraiser/reviewer values remain unassigned.
- AMC operations are not targeted by this plan.
`;

  writeFileSync(path.join(OUTPUT_DIR, "falcon_2025_2026_real_db_audit_summary.md"), markdown);
}

async function main() {
  const inputs = loadInputs();
  const env = loadEnv();
  const stagingCheck = assertApprovedStaging(env);

  let inventory = { clients: [], orders: [], users: [], userProfiles: [] };
  let inventoryStatus = "skipped";
  let stagingStatus = stagingCheck.reason;

  if (stagingCheck.ok) {
    inventory = await fetchInventory(env);
    inventoryStatus = "ok";
    stagingStatus = "approved_staging_read_only_inventory_complete";
  }

  const plans = createPlans(inputs, inventory, inventoryStatus);
  const validationCounts = countBy(inputs.validationIssues, "severity");
  const summary = {
    staging: {
      status: stagingStatus,
      project_ref: stagingCheck.ok ? env.actualRef : "",
    },
    input: {
      orders: inputs.orders.length,
      clients: inputs.clients.length,
    },
    validation: {
      errors: validationCounts.error || 0,
      warnings: validationCounts.warning || 0,
    },
    inventory: {
      orders: inventory.orders.length,
      clients: inventory.clients.length,
      staff: inventory.users.length,
    },
    plans: {
      clients: countBy(plans.clientPlan, "action"),
      staff: countBy(plans.staffPlan, "action"),
      orders: countBy(plans.orderPlan, "action"),
    },
    metadataRecommendation: inspectMetadataRecommendation(),
  };

  writeOutputs(plans, inputs.validationIssues, summary);

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
