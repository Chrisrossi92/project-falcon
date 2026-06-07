import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260607130000_production_schema_alignment.sql"),
  "utf8",
);

describe("AMC-18B production schema alignment migration", () => {
  it("defines operation-scoped client relationship RPC signatures required by production frontend", () => {
    expect(migrationSql).toContain("create or replace function public.client_relationship_has_operations_scope");
    expect(migrationSql).toContain("create or replace function public.rpc_client_management_list");
    expect(migrationSql).toContain("p_search text default ''");
    expect(migrationSql).toContain("p_category text default 'all'");
    expect(migrationSql).toContain("p_sort text default 'orders_desc'");
    expect(migrationSql).toContain("p_operations_scope text default null");
    expect(migrationSql).toContain("create or replace function public.rpc_client_management_detail");
    expect(migrationSql).toContain("invalid_client_operations_scope");
  });

  it("defines operation-scoped company member list overload required by production frontend", () => {
    expect(migrationSql).toContain("create or replace function public.company_role_matches_operations_scope");
    expect(migrationSql).toContain("create or replace function public.rpc_company_member_list");
    expect(migrationSql).toContain("p_include_inactive boolean default false");
    expect(migrationSql).toContain("p_operations_scope text default null");
    expect(migrationSql).toContain("invalid_member_operations_scope");
    expect(migrationSql).toContain("public.company_role_matches_operations_scope(ura.role_id, v_operations_scope)");
  });

  it("includes the Permission Center and default-contact production blocker fixes", () => {
    expect(migrationSql).toContain("create or replace function public.rpc_company_member_access_save");
    expect(migrationSql).toContain("create or replace function public.rpc_company_member_permission_overrides_save");
    expect(migrationSql.match(/#variable_conflict use_column/g)).toHaveLength(2);
    expect(migrationSql).toContain("membership_id := v_role_result.membership_id");
    expect(migrationSql).toContain("membership_id := v_membership_id");
    expect(migrationSql).toContain("create or replace function public.rpc_client_contact_set_default");
    expect(migrationSql).toContain("update public.client_contacts cc");
    expect(migrationSql).toContain("where cc.company_id = v_contact.company_id");
    expect(migrationSql).toContain("where cc.id = v_contact.id");
  });

  it("preserves backward compatibility by not dropping older production RPC signatures", () => {
    expect(migrationSql).not.toContain("drop function if exists public.rpc_client_management_list");
    expect(migrationSql).not.toContain("drop function if exists public.rpc_company_member_list");
    expect(migrationSql).toContain("grant execute on function public.rpc_client_management_list(text, text, text, text)");
    expect(migrationSql).toContain("grant execute on function public.rpc_company_member_list(boolean, text)");
  });
});
