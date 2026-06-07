import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260607123000_amc18_users_operation_scoping.sql"),
  "utf8",
);

describe("AMC-18 Users operation scoping migration", () => {
  it("adds an operation-aware member list overload while preserving no-scope fallback", () => {
    expect(migrationSql).toContain("create or replace function public.rpc_company_member_list");
    expect(migrationSql).toContain("p_operations_scope text default null");
    expect(migrationSql).toContain("v_operations_scope is null");
    expect(migrationSql).toContain("invalid_member_operations_scope");
  });

  it("derives role relevance from explicit permission metadata", () => {
    expect(migrationSql).toContain("create or replace function public.company_role_matches_operations_scope");
    expect(migrationSql).toContain("from public.role_permissions rp");
    expect(migrationSql).toContain("rp.permission_key like 'vendor\\_%' escape '\\'");
    expect(migrationSql).toContain("rp.permission_key like 'bid_requests.%'");
    expect(migrationSql).toContain("'client_portal.order_requests.manage'");
    expect(migrationSql).toContain("rp.permission_key like 'orders.%'");
    expect(migrationSql).toContain("rp.permission_key like 'assignments.%'");
  });

  it("filters returned users and role assignments by active operation scope", () => {
    expect(migrationSql).toContain("public.company_role_matches_operations_scope(ura.role_id, v_operations_scope)");
    expect(migrationSql).toContain("coalesce(mr.has_active_scoped_role, false)");
    expect(migrationSql).toContain("coalesce(mr.role_assignments, '[]'::jsonb) as role_assignments");
  });
});
