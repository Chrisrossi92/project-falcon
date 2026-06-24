import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const optionsSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260624101000_order_form_client_options_operations_scope.sql"),
  "utf8",
);

const orderClientOptionsApiSource = readFileSync(
  resolve(process.cwd(), "src/features/orders/orderClientOptionsApi.js"),
  "utf8",
);

const clientRequestConversionSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260609100000_client_request_structured_geography_conversion.sql"),
  "utf8",
);

const routesSource = readFileSync(resolve(process.cwd(), "src/routes/index.jsx"), "utf8");

function normalizeSql(sql) {
  return sql.replace(/\s+/g, " ").trim().toLowerCase();
}

function functionBody(name, sql = optionsSql) {
  const match = sql.match(
    new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?end;\\s*\\$\\$;`, "i"),
  );
  expect(match).toBeTruthy();
  return match[0];
}

describe("AMC order form client options scope contract", () => {
  it("keeps order form client options current-company guarded", () => {
    const body = functionBody("rpc_order_form_client_options");
    const normalized = normalizeSql(body);

    expect(body).toContain("public.current_app_user_id()");
    expect(body).toContain("public.current_company_id()");
    expect(body).toContain("public.current_app_user_has_current_company()");
    expect(body).toContain("public.current_app_user_can_use_order_form_client_options()");
    expect(normalized).toContain("coalesce(c.company_id, public.default_company_id()) = v_company_id");
    expect(normalized).toContain("lower(coalesce(nullif(c.status, ''), 'active')) = 'active'");
    expect(normalized).toContain("coalesce(c.is_merged, false) = false");
  });

  it("filters order form client options by optional operations scope", () => {
    const body = normalizeSql(functionBody("rpc_order_form_client_options"));

    expect(body).toContain("p_operations_scope text default null");
    expect(body).toContain("invalid_order_form_client_operations_scope");
    expect(body).toContain("v_operations_scope not in ('internal_operations', 'amc_operations')");
    expect(body).toContain("client_relationship_has_operations_scope(c.id, v_company_id, v_operations_scope)");
    expect(body).toContain("nullif(c.operations_scope, '') as operations_scope");
  });

  it("filters duplicate-name search by optional operations scope", () => {
    const body = normalizeSql(functionBody("rpc_order_form_client_name_search"));

    expect(body).toContain("coalesce(c.company_id, public.default_company_id()) = v_company_id");
    expect(body).toContain("c.name ilike");
    expect(body).toContain("p_operations_scope text default null");
    expect(body).toContain("invalid_order_form_client_operations_scope");
    expect(body).toContain("client_relationship_has_operations_scope(c.id, v_company_id, v_operations_scope)");
    expect(body).toContain("nullif(c.operations_scope, '') as operations_scope");
  });

  it("exposes operations scope metadata to the frontend option payload for diagnostics", () => {
    expect(orderClientOptionsApiSource).toContain("function normalizeClientOption");
    expect(orderClientOptionsApiSource).toContain("contact_name_1: row.contact_name");
    expect(orderClientOptionsApiSource).toContain("operations_scope");
    expect(orderClientOptionsApiSource).toContain('supabase.rpc("rpc_order_form_client_options")');
  });

  it("confirms client request conversion uses a separate AMC-scoped order path", () => {
    const body = normalizeSql(functionBody(
      "rpc_client_portal_order_request_convert_to_order",
      clientRequestConversionSql,
    ));

    expect(body).toContain("insert into public.orders");
    expect(body).toContain("operations_scope");
    expect(body).toContain("'amc_operations'");
    expect(body).toContain("v_request.company_id");
    expect(body).toContain("v_request.client_id");
  });

  it("registers the AMC create route only after scoped picker wiring exists", () => {
    expect(routesSource).toContain('path="/amc/orders/new"');
    expect(routesSource).toContain("AmcNewOrderPage");
  });
});
