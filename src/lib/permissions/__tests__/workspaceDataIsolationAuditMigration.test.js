import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  "supabase/migrations/20260607102000_amc_workspace_data_isolation_audit.sql",
  "utf8",
);

const operationsScopeMigrationSql = readFileSync(
  "supabase/migrations/20260601143000_amc_order_operations_scope_foundation.sql",
  "utf8",
);

describe("AMC-14B workspace data isolation audit migration", () => {
  it("restores caller-RLS behavior on high-risk shared order projections", () => {
    [
      "v_orders_frontend_v4",
      "v_orders_active_frontend_v4",
      "v_orders_list",
      "v_orders_list_with_last_activity",
    ].forEach((viewName) => {
      expect(migrationSql).toContain(`alter view public.${viewName} set (security_invoker = true)`);
    });
  });

  it("documents explicit operations scope filtering as a service/RPC responsibility", () => {
    expect(migrationSql).toMatch(/includes operations_scope/i);
    expect(migrationSql).toMatch(/explicit operations_scope filter/i);
    expect(migrationSql).toMatch(/caller RLS remains authoritative/i);
  });

  it("locks the audited regression from the AMC operations-scope foundation", () => {
    expect(operationsScopeMigrationSql).toContain("alter view public.v_orders_frontend_v4 set (security_invoker = false)");
    expect(operationsScopeMigrationSql).toContain("alter view public.v_orders_active_frontend_v4 set (security_invoker = false)");
  });

  it("does not change vendor/client/public token RPC grants or invitation flows", () => {
    expect(migrationSql).not.toMatch(/grant execute on function public\.rpc_order_company_assignment_invitation_/i);
    expect(migrationSql).not.toMatch(/grant execute on function public\.rpc_vendor_workspace_/i);
    expect(migrationSql).not.toMatch(/revoke .* from anon/i);
    expect(migrationSql).not.toMatch(/insert\s+into\s+public\./i);
    expect(migrationSql).not.toMatch(/update\s+public\./i);
  });
});
