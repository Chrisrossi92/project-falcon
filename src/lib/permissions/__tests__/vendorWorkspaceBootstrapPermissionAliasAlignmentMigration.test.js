import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(testDir, "../../../..");
const migrationPath = resolve(
  repoRoot,
  "supabase/migrations/20260610150000_vendor_workspace_bootstrap_permission_alias_alignment.sql",
);

const migrationSql = readFileSync(migrationPath, "utf8");

describe("Vendor Workspace bootstrap permission alias alignment migration", () => {
  it("replaces the bootstrap RPC and aliases the set-returning permission helper", () => {
    expect(migrationSql).toContain("create or replace function public.rpc_vendor_workspace_bootstrap()");
    expect(migrationSql).toContain(
      "from public.current_app_user_permission_keys_for_company(v_match.vendor_company_id)",
    );
    expect(migrationSql).toContain("as granted(permission_key)");
    expect(migrationSql).toContain(
      "array_agg(granted.permission_key order by granted.permission_key)",
    );
    expect(migrationSql).not.toMatch(
      /array_agg\(permission_key order by permission_key\)\s+into v_permission_keys\s+from public\.current_app_user_permission_keys_for_company/,
    );
  });

  it("returns role diagnostics and computes vendor_workspace.view from the real permission identifier", () => {
    [
      "'role_id', v_vendor_role_id",
      "'role_name', v_vendor_role_name",
      "'permission_keys'",
      "'has_vendor_workspace_view'",
      "'vendor_workspace.view' = any",
      "'permission_helper_aliased', true",
      "rp.permission_key = 'vendor_workspace.view'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it("replaces the admin diagnostic RPC without using the set-returning helper incorrectly", () => {
    expect(migrationSql).toContain(
      "create or replace function public.rpc_admin_vendor_workspace_bootstrap_diagnostics",
    );
    expect(migrationSql).toContain("jsonb_agg(rp.permission_key order by rp.permission_key)");
    expect(migrationSql).toContain("'vendor_admin_has_vendor_workspace_view'");
    expect(migrationSql).not.toContain("v_vendor_admin_permissions ? 'vendor_workspace.view'");
  });

  it("does not rename production permission columns", () => {
    expect(migrationSql).toContain("public.role_permissions");
    expect(migrationSql).toContain("rp.permission_key");
    expect(migrationSql).not.toContain("permission_id");
    expect(migrationSql).not.toContain("permissions.key as permission_key");
  });
});
