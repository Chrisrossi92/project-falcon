import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260607120000_amc18_pilot_blocker_fixes.sql"),
  "utf8",
);

describe("AMC-18 pilot blocker migration", () => {
  it("qualifies Permission Center access-save PL/pgSQL variable conflicts", () => {
    expect(migrationSql).toContain("create or replace function public.rpc_company_member_access_save");
    expect(migrationSql).toContain("create or replace function public.rpc_company_member_permission_overrides_save");
    expect(migrationSql.match(/#variable_conflict use_column/g)).toHaveLength(2);
    expect(migrationSql).toContain("membership_id := v_role_result.membership_id");
    expect(migrationSql).toContain("membership_id := v_membership_id");
  });

  it("sets default client contacts through qualified current-company updates", () => {
    expect(migrationSql).toContain("create or replace function public.rpc_client_contact_set_default");
    expect(migrationSql).toContain("update public.client_contacts cc");
    expect(migrationSql).toContain("where cc.company_id = v_contact.company_id");
    expect(migrationSql).toContain("and cc.client_id = v_contact.client_id");
    expect(migrationSql).toContain("where cc.id = v_contact.id");
  });

  it("adds operation-scoped client relationship list and detail projections", () => {
    expect(migrationSql).toContain("public.client_relationship_has_operations_scope");
    expect(migrationSql).toContain("p_operations_scope text default null");
    expect(migrationSql).toContain("coalesce(o.operations_scope, 'internal_operations') = 'amc_operations'");
    expect(migrationSql).toContain("coalesce(o.operations_scope, 'internal_operations') = 'internal_operations'");
    expect(migrationSql).toContain("rpc_client_management_list");
    expect(migrationSql).toContain("rpc_client_management_detail");
    expect(migrationSql).toContain("invalid_client_operations_scope");
  });
});
