import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260622093000_owner_setup_v2h_mark_complete_rpc.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("Owner Setup V2H mark complete RPC migration", () => {
  it("creates the guarded setup completion RPC", () => {
    expect(migrationSql).toContain("create or replace function public.rpc_owner_setup_mark_complete()");
    expect(migrationSql).toContain("returns jsonb");
    expect(migrationSql).toContain("volatile");
    expect(migrationSql).toContain("security definer");
    expect(migrationSql).toContain("set search_path = public");
    expect(migrationSql).toContain(
      "grant execute on function public.rpc_owner_setup_mark_complete() to authenticated, service_role",
    );
  });

  it("requires active current-company context and setup management permission", () => {
    expect(migrationSql).toContain("current_app_user_id()");
    expect(migrationSql).toContain("current_company_id()");
    expect(migrationSql).toContain("current_app_user_has_current_company()");
    expect(migrationSql).toContain("company_inactive");
    expect(migrationSql).toContain("current_app_user_has_permission('company.setup.manage')");
    expect(migrationSql).toContain("owner_setup_manage_permission_required");
  });

  it("checks readiness and rejects companies that are not minimum ready", () => {
    expect(migrationSql).toContain("v_readiness := public.rpc_owner_setup_readiness()");
    expect(migrationSql).toContain("v_readiness->>'minimum_ready'");
    expect(migrationSql).toContain("owner_setup_minimum_readiness_required");
    expect(migrationSql).toContain("missing_required_sections");
  });

  it("sets completion and banner timestamps idempotently", () => {
    expect(migrationSql).toContain("insert into public.company_setup_states");
    expect(migrationSql).toContain("minimum_ready_at");
    expect(migrationSql).toContain("setup_banner_dismissed_at");
    expect(migrationSql).toContain(
      "minimum_ready_at = coalesce(public.company_setup_states.minimum_ready_at, now())",
    );
    expect(migrationSql).toContain(
      "setup_banner_dismissed_at = coalesce(public.company_setup_states.setup_banner_dismissed_at, now())",
    );
    expect(migrationSql).toContain("updated_at = now()");
  });

  it("returns safe setup state and readiness without broadening authority", () => {
    expect(migrationSql).toContain("'setup_state', public.rpc_owner_setup_state_get()");
    expect(migrationSql).toContain("'readiness', public.rpc_owner_setup_readiness()");
    expect(migrationSql).not.toContain("grant all privileges on table public.company_setup_states to authenticated");
    expect(migrationSql).not.toContain("grant select on table public.company_setup_states to authenticated");
    expect(migrationSql).not.toContain("rpc_company_profile_update");
    expect(migrationSql).not.toContain("operating_mode_settings");
    expect(migrationSql).not.toContain("company_type =");
  });

  it("does not write tutorial acknowledgement state", () => {
    expect(migrationSql).not.toContain("tutorial_acknowledgements =");
    expect(migrationSql).not.toContain("user_tutorial_acknowledgements");
    expect(migrationSql).not.toContain("rpc_user_tutorial_acknowledge");
    expect(migrationSql).toContain("without changing tutorial acknowledgements");
  });
});
