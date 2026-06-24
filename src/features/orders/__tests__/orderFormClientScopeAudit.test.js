import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const orderClientOptionsSource = readFileSync(
  resolve(process.cwd(), "src/features/orders/orderClientOptionsApi.js"),
  "utf8",
);

const orderFormClientCreateSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260518048000_order_form_client_create_rpc.sql"),
  "utf8",
);

const clientManagementSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260608100000_amc18_production_persistence_fixes.sql"),
  "utf8",
);

const routesSource = readFileSync(resolve(process.cwd(), "src/routes/index.jsx"), "utf8");

function normalizeSql(sql) {
  return sql.replace(/\s+/g, " ").trim().toLowerCase();
}

describe("OrderForm manual client creation scope audit", () => {
  it("documents that the OrderForm inline client helper does not pass operations scope today", () => {
    const createHelperSource = orderClientOptionsSource.slice(
      orderClientOptionsSource.indexOf("export async function createOrderFormClient"),
    );

    expect(orderClientOptionsSource).toContain("export async function createOrderFormClient");
    expect(orderClientOptionsSource).toContain('supabase.rpc("rpc_order_form_client_create"');
    expect(createHelperSource).toContain("name,");
    expect(createHelperSource).toContain("amc_id: amcId ?? null");
    expect(createHelperSource).not.toContain("operations_scope");
    expect(createHelperSource).not.toContain("operationsScope");
  });

  it("documents that the OrderForm inline client create RPC is current-company guarded but not scope-aware", () => {
    const sql = normalizeSql(orderFormClientCreateSql);

    expect(sql).toContain("create or replace function public.rpc_order_form_client_create(p_client jsonb)");
    expect(sql).toContain("public.current_app_user_has_current_company()");
    expect(sql).toContain("public.current_app_user_has_permission('orders.create')");
    expect(sql).toContain("coalesce(c.company_id, public.default_company_id()) = v_company_id");
    expect(sql).toContain("insert into public.clients");
    expect(sql).not.toContain("operations_scope");
    expect(sql).not.toContain("invalid_client_operations_scope");
  });

  it("confirms the general client management create contract has an operations scope path available", () => {
    expect(clientManagementSql).toContain("create or replace function public.rpc_client_management_create");
    expect(clientManagementSql).toContain("v_operations_scope text := nullif(lower(trim(coalesce(p_client->>'operations_scope', ''))), '')");
    expect(clientManagementSql).toContain("invalid_client_operations_scope");
    expect(clientManagementSql).toContain("company_id,\n    operations_scope,");
    expect(clientManagementSql).toContain("v_company_id,\n    v_operations_scope,");
  });

  it("registers the AMC create route through the existing-client-only wrapper while inline client creation remains unresolved", () => {
    const routeIndex = routesSource.indexOf('path="/amc/orders/new"');
    const wrapperIndex = routesSource.indexOf("<AmcNewOrderPage />", routeIndex);
    const detailRouteIndex = routesSource.indexOf('path="/amc/orders/:id"');

    expect(routeIndex).toBeGreaterThan(-1);
    expect(wrapperIndex).toBeGreaterThan(routeIndex);
    expect(detailRouteIndex).toBeGreaterThan(wrapperIndex);
  });
});
