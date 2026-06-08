import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260608100000_amc18_production_persistence_fixes.sql"),
  "utf8",
);

describe("AMC-18 production persistence fixes migration", () => {
  it("adds explicit client relationship operation scope for zero-order client creates", () => {
    expect(migrationSql).toContain("add column if not exists operations_scope text null");
    expect(migrationSql).toContain("clients_operations_scope_valid");
    expect(migrationSql).toContain("idx_clients_company_operations_scope");
    expect(migrationSql).toContain("operations_scope is null or operations_scope in ('internal_operations', 'amc_operations')");
  });

  it("uses explicit client scope before falling back to order-derived relationship scope", () => {
    expect(migrationSql).toContain("create or replace function public.client_relationship_has_operations_scope");
    expect(migrationSql).toContain("tc.operations_scope = p_operations_scope");
    expect(migrationSql).toContain("tc.operations_scope <> p_operations_scope");
    expect(migrationSql).toContain("coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'");
    expect(migrationSql).toContain("coalesce(o.operations_scope, 'internal_operations') = 'internal_operations'");
  });

  it("persists active operation scope during client create without changing the RPC signature", () => {
    expect(migrationSql).toContain("create or replace function public.rpc_client_management_create");
    expect(migrationSql).toContain("v_operations_scope text := nullif(lower(trim(coalesce(p_client->>'operations_scope', ''))), '')");
    expect(migrationSql).toContain("invalid_client_operations_scope");
    expect(migrationSql).toContain("company_id,\n    operations_scope,");
    expect(migrationSql).toContain("v_company_id,\n    v_operations_scope,");
    expect(migrationSql).toContain("c.operations_scope = v_operations_scope");
    expect(migrationSql).not.toContain("drop function if exists public.rpc_client_management_create");
  });

  it("keeps Appraiser and Reviewer work-eligibility templates visible in AMC-scoped reloads", () => {
    expect(migrationSql).toContain("create or replace function public.company_role_matches_operations_scope");
    expect(migrationSql).toContain("'orders.assignable_as_appraiser'");
    expect(migrationSql).toContain("'orders.assignable_as_reviewer'");
    expect(migrationSql).toContain("rp.permission_key like 'vendor_workspace.%'");
    expect(migrationSql).toContain("rp.permission_key like 'orders.%'");
  });
});
