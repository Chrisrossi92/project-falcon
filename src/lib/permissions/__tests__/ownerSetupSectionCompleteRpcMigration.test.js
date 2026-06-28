import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260622091000_owner_setup_v2f_section_complete_rpc.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("Owner Setup V2F section completion RPC migration", () => {
  it("creates the guarded section completion RPC", () => {
    expect(migrationSql).toContain("create or replace function public.rpc_owner_setup_section_complete");
    expect(migrationSql).toContain("p_section_id text");
    expect(migrationSql).toContain("p_completed boolean default true");
    expect(migrationSql).toContain("returns jsonb");
    expect(migrationSql).toContain("volatile");
    expect(migrationSql).toContain("security definer");
    expect(migrationSql).toContain("set search_path = public");
    expect(migrationSql).toContain(
      "grant execute on function public.rpc_owner_setup_section_complete(text, boolean)",
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

  it("allows only owner-facing setup section ids and rejects unknown sections", () => {
    [
      "company_profile",
      "owner_profile",
      "team_access",
      "workflow_defaults",
      "notification_defaults",
      "order_numbering",
      "branding",
      "product_modes",
    ].forEach((sectionId) => {
      expect(migrationSql).toContain(`'${sectionId}'`);
    });

    expect(migrationSql).toContain("v_allowed_sections constant text[]");
    expect(migrationSql).toContain("v_section_id <> any(v_allowed_sections)");
    expect(migrationSql).toContain("owner_setup_unknown_section");
  });

  it("updates only completed_sections and returns the safe setup state shape", () => {
    expect(migrationSql).toContain("insert into public.company_setup_states");
    expect(migrationSql).toContain("completed_sections");
    expect(migrationSql).toContain("jsonb_build_object(v_section_id, v_section_payload)");
    expect(migrationSql).toContain("'completed', true");
    expect(migrationSql).toContain("'completed_at', now()");
    expect(migrationSql).toContain("'completed_by', v_app_user_id");
    expect(migrationSql).toContain("- v_section_id");
    expect(migrationSql).toContain("return public.rpc_owner_setup_state_get()");
    expect(migrationSql).not.toContain("setup_banner_dismissed_at =");
    expect(migrationSql).not.toContain("tutorial_acknowledgements =");
    expect(migrationSql).not.toContain("update public.companies");
  });

  it("does not broaden direct table access or unrelated authority", () => {
    expect(migrationSql).not.toContain("grant all privileges on table public.company_setup_states to authenticated");
    expect(migrationSql).not.toContain("grant select on table public.company_setup_states to authenticated");
    expect(migrationSql).not.toContain("company.setup.read");
    expect(migrationSql).not.toContain("rpc_company_profile_update");
    expect(migrationSql).not.toContain("operating_mode_settings");
    expect(migrationSql).not.toContain("company_type =");
  });
});
