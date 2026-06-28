import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260622092000_owner_setup_v2g_readiness_rpc.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");

const rpcBody = migrationSql.slice(
  migrationSql.indexOf("create or replace function public.rpc_owner_setup_readiness()"),
  migrationSql.indexOf("revoke all on function public.rpc_owner_setup_readiness()"),
);

describe("Owner Setup V2G readiness RPC migration", () => {
  it("creates a guarded read-only readiness RPC", () => {
    expect(migrationSql).toContain("create or replace function public.rpc_owner_setup_readiness()");
    expect(migrationSql).toContain("returns jsonb");
    expect(migrationSql).toContain("stable");
    expect(migrationSql).toContain("security definer");
    expect(migrationSql).toContain("set search_path = public");
    expect(migrationSql).toContain("current_app_user_has_current_company()");
    expect(migrationSql).toContain("current_app_user_has_permission('company.setup.read')");
    expect(migrationSql).toContain("current_app_user_has_permission('company.setup.manage')");
    expect(migrationSql).toContain("grant execute on function public.rpc_owner_setup_readiness() to authenticated, service_role");
  });

  it("explicitly evaluates only required setup sections", () => {
    expect(migrationSql).toContain("v_required_sections constant text[] := array[");
    ["company_profile", "owner_profile", "team_access"].forEach((sectionId) => {
      expect(migrationSql).toContain(`'${sectionId}'`);
    });
    expect(migrationSql).toContain("foreach v_section in array v_required_sections loop");
    expect(migrationSql).toContain("missing_required_sections");
  });

  it("keeps optional and deferred sections from blocking readiness", () => {
    expect(migrationSql).toContain("v_optional_sections constant text[] := array[");
    [
      "workflow_defaults",
      "notification_defaults",
      "order_numbering",
      "branding",
      "product_modes",
    ].forEach((sectionId) => {
      expect(migrationSql).toContain(`'${sectionId}'`);
    });
    expect(migrationSql).toContain("ignored_optional_sections");
    expect(rpcBody).not.toMatch(/foreach v_section in array v_optional_sections/);
  });

  it("returns the readiness output contract and next action logic", () => {
    [
      "minimum_ready",
      "completed_required_sections",
      "required_sections",
      "percent_complete",
      "missing_required_sections",
      "next_recommended_action",
      "completed_sections",
    ].forEach((fieldName) => {
      expect(migrationSql).toContain(`'${fieldName}'`);
    });
    expect(migrationSql).toContain("Company setup is ready for launch review.");
    expect(migrationSql).toContain("Next: Company Profile");
    expect(migrationSql).toContain("Next: Owner Profile");
    expect(migrationSql).toContain("Next: Team Access");
  });

  it("does not write setup state, timestamps, banners, or tutorials", () => {
    expect(rpcBody).not.toMatch(/insert into public\.company_setup_states/i);
    expect(rpcBody).not.toMatch(/update public\.company_setup_states/i);
    expect(rpcBody).not.toMatch(/delete from public\.company_setup_states/i);
    expect(rpcBody).not.toContain("updated_at = now()");
    expect(rpcBody).not.toContain("setup_banner_dismissed_at =");
    expect(rpcBody).not.toContain("tutorial_acknowledgements =");
    expect(migrationSql).toContain("write_on_read', false");
    expect(migrationSql).toContain("performs no writes");
  });
});
