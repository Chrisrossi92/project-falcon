import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  "supabase/migrations/20260621106000_order_projection_amcs_read_policy.sql",
  "utf8",
);

describe("order projection AMC read policy migration", () => {
  it("grants authenticated AMC reads only behind an order-readable RLS policy", () => {
    expect(migrationSql).toContain("grant select on table public.amcs to authenticated");
    expect(migrationSql).toContain("create policy amcs_select_for_readable_orders");
    expect(migrationSql).toContain("for select");
    expect(migrationSql).toContain("to authenticated");
    expect(migrationSql).toContain("from public.orders o");
    expect(migrationSql).toContain("o.amc_id = amcs.id");
    expect(migrationSql).toContain("public.current_app_user_can_read_order(o.id)");
  });

  it("does not grant anonymous or unrestricted AMC table access", () => {
    expect(migrationSql).not.toContain("to anon");
    expect(migrationSql).not.toMatch(/grant\s+all/i);
    expect(migrationSql).not.toMatch(/using\s*\(\s*true\s*\)/i);
  });

  it("does not change vendor coverage matching logic", () => {
    expect(migrationSql).not.toContain("rpc_get_matching_vendors_for_order");
    expect(migrationSql).not.toContain("vendor_coverage_states");
    expect(migrationSql).not.toContain("vendor_coverage_counties");
  });
});
