import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const createOrderMigrationSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260624102000_rpc_create_order_attachment_scope_guards.sql"),
  "utf8",
);

const operationsScopeMigrationSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260601143000_amc_order_operations_scope_foundation.sql"),
  "utf8",
);

const routesSource = readFileSync(resolve(process.cwd(), "src/routes/index.jsx"), "utf8");

function normalizeSql(sql) {
  return sql.replace(/\s+/g, " ").trim().toLowerCase();
}

function rpcCreateOrderBody() {
  const match = createOrderMigrationSql.match(
    /create or replace function public\.rpc_create_order\([\s\S]*?\)\s*returns public\.orders[\s\S]*?\$\$;/i,
  );
  expect(match).toBeTruthy();
  return match[0];
}

function rpcCreateOrderInsertColumnBlock() {
  const body = rpcCreateOrderBody();
  const match = body.match(/insert into public\.orders\s*\(([\s\S]*?)\)\s*values/i);
  expect(match).toBeTruthy();
  return normalizeSql(match[1]);
}

describe("AMC create-order RPC contract", () => {
  it("keeps create authority and company context backend-owned", () => {
    const body = rpcCreateOrderBody();

    expect(body).toContain("security definer");
    expect(body).toContain("set search_path = public");
    expect(body).toContain("public.current_app_user_can_create_order()");
    expect(body).toContain("raise exception 'not authorized to create orders'");
    expect(body).toContain("v_company_id := public.current_company_id()");
    expect(body).toContain("public.next_order_number_v2(v_company_id, now())");
    expect(body).not.toMatch(/payload\s*->>\s*'company_id'/i);
  });

  it("requires active-company-safe client AMC and contact attachments", () => {
    const body = rpcCreateOrderBody();

    expect(body).toContain("public.current_app_user_can_attach_order_client(v_client_id)");
    expect(body).toContain("client_id % is not attachable to orders in the current company");
    expect(body).toContain("public.current_app_user_can_attach_order_amc(v_managing_amc_id)");
    expect(body).toContain("managing_amc_id % is not an attachable current-company AMC client");
    expect(body).toContain("raise exception 'client_contact_requires_client'");
    expect(body).toContain("cc.company_id = v_company_id");
    expect(body).toContain("cc.client_id = v_client_id");
    expect(body).toContain("cc.status = 'active'");
    expect(body).toContain("raise exception 'client_contact_not_found'");
  });

  it("explicitly inserts operations_scope rather than relying on the table default", () => {
    const insertColumns = rpcCreateOrderInsertColumnBlock();

    expect(operationsScopeMigrationSql).toContain(
      "add column if not exists operations_scope text default 'internal_operations'",
    );
    expect(operationsScopeMigrationSql).toContain(
      "operations_scope in ('internal_operations', 'amc_operations')",
    );
    expect(insertColumns).toContain("operations_scope");
    expect(createOrderMigrationSql).toContain("'amc_operations'");
  });

  it("keeps AMC create explicit instead of deriving authority from route context", () => {
    const body = normalizeSql(rpcCreateOrderBody());

    expect(body).not.toContain("operations_mode");
    expect(body).not.toContain("product_context");
    expect(body).not.toContain("route_context");
    expect(body).toContain("p_operations_scope");
    expect(body).toContain("amc_operations");
    expect(body).toContain("internal_operations");
  });

  it("allowlists create status input", () => {
    const body = rpcCreateOrderBody();

    expect(body).toContain("v_status text");
    expect(body).toContain("if v_status <> 'new' then");
    expect(body).toContain("raise exception 'invalid_order_create_status'");
    expect(body).not.toContain("coalesce(nullif(payload->>'status',''),'new'),");
  });

  it("documents that create-side activity and notification fanout are deferred outside this RPC", () => {
    const body = normalizeSql(rpcCreateOrderBody());

    expect(body).not.toContain("insert into public.activity");
    expect(body).not.toContain("insert into public.activity_log");
    expect(body).not.toContain("insert into public.notifications");
    expect(body).not.toContain("rpc_notification_create");
    expect(body).not.toContain("pg_notify");
  });

  it("registers the AMC create route only after frontend scope wiring is proven", () => {
    expect(routesSource).toContain('path="/amc/orders/new"');
    expect(routesSource).toContain("AmcNewOrderPage");
  });

  it("extends rpc_create_order with an optional defaulted operations scope parameter", () => {
    expect(createOrderMigrationSql).toMatch(
      /create or replace function public\.rpc_create_order\(\s*payload jsonb,\s*p_operations_scope text default null\s*\)/i,
    );
  });

  it("normalizes null scope to internal_operations and accepts explicit amc_operations", () => {
    const body = normalizeSql(rpcCreateOrderBody());

    expect(body).toContain("v_operations_scope");
    expect(body).toContain("coalesce(nullif");
    expect(body).toContain("p_operations_scope");
    expect(body).toContain("'internal_operations'");
    expect(body).toContain("'amc_operations'");
  });

  it("rejects invalid operations scopes before inserting the order", () => {
    const body = normalizeSql(rpcCreateOrderBody());
    const invalidScopePosition = body.indexOf("invalid_order_operations_scope");
    const insertPosition = body.indexOf("insert into public.orders");

    expect(body).toContain("invalid_order_operations_scope");
    expect(invalidScopePosition).toBeGreaterThan(-1);
    expect(insertPosition).toBeGreaterThan(invalidScopePosition);
  });

  it("keeps operations_scope in the insert column list", () => {
    const insertColumns = rpcCreateOrderInsertColumnBlock();

    expect(insertColumns).toContain("operations_scope");
  });

  it("allowlists or normalizes create status before insert", () => {
    const body = normalizeSql(rpcCreateOrderBody());
    const statusGuardPosition = Math.max(
      body.indexOf("invalid_order_create_status"),
      body.indexOf("v_status"),
    );
    const insertPosition = body.indexOf("insert into public.orders");

    expect(statusGuardPosition).toBeGreaterThan(-1);
    expect(insertPosition).toBeGreaterThan(statusGuardPosition);
    expect(body).not.toContain("coalesce(nullif(payload->>'status',''),'new')");
  });

  it("keeps active-company client AMC and contact validation in the scoped create contract", () => {
    const body = rpcCreateOrderBody();

    expect(body).toContain("public.current_app_user_can_attach_order_client(v_client_id)");
    expect(body).toContain("public.current_app_user_can_attach_order_amc(v_managing_amc_id)");
    expect(body).toContain("cc.company_id = v_company_id");
    expect(body).toContain("cc.client_id = v_client_id");
    expect(body).toContain("cc.status = 'active'");
  });

  it("rejects clients that are incompatible with the requested operations scope before insert", () => {
    const body = normalizeSql(rpcCreateOrderBody());
    const clientScopeGuardPosition = body.indexOf("client_scope_incompatible");
    const insertPosition = body.indexOf("insert into public.orders");

    expect(body).toContain(
      "public.client_relationship_has_operations_scope(v_client_id, v_company_id, v_operations_scope)",
    );
    expect(clientScopeGuardPosition).toBeGreaterThan(-1);
    expect(insertPosition).toBeGreaterThan(clientScopeGuardPosition);
  });

  it("rejects managing AMC attachments that are incompatible with the requested operations scope before insert", () => {
    const body = normalizeSql(rpcCreateOrderBody());
    const amcScopeGuardPosition = body.indexOf("managing_amc_scope_incompatible");
    const insertPosition = body.indexOf("insert into public.orders");

    expect(body).toContain(
      "public.client_relationship_has_operations_scope(v_managing_amc_id, v_company_id, v_operations_scope)",
    );
    expect(amcScopeGuardPosition).toBeGreaterThan(-1);
    expect(insertPosition).toBeGreaterThan(amcScopeGuardPosition);
  });

  it("keeps client contact attachment constrained to the selected client current company and active status", () => {
    const body = normalizeSql(rpcCreateOrderBody());
    const contactGuardPosition = body.indexOf("client_contact_not_found");
    const insertPosition = body.indexOf("insert into public.orders");

    expect(body).toContain("client_contact_requires_client");
    expect(body).toContain("cc.company_id = v_company_id");
    expect(body).toContain("cc.client_id = v_client_id");
    expect(body).toContain("cc.status = 'active'");
    expect(contactGuardPosition).toBeGreaterThan(-1);
    expect(insertPosition).toBeGreaterThan(contactGuardPosition);
  });
});
