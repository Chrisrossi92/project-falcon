import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260608130000_amc19_client_contact_onboarding_fix.sql"),
  "utf8",
);

describe("AMC-19 client contact onboarding migration", () => {
  it("replaces the client contact write RPCs used before portal invitation", () => {
    expect(migrationSql).toContain("create or replace function public.rpc_client_contact_create");
    expect(migrationSql).toContain("create or replace function public.rpc_client_contact_update");
    expect(migrationSql).toContain("create or replace function public.rpc_client_contact_set_default");
  });

  it("qualifies company and client columns in default-clearing updates", () => {
    expect(migrationSql).toContain("update public.client_contacts cc");
    expect(migrationSql).toContain("where cc.company_id = v_company_id");
    expect(migrationSql).toContain("and cc.client_id = p_client_id");
    expect(migrationSql).toContain("where cc.company_id = v_contact.company_id");
    expect(migrationSql).toContain("and cc.client_id = v_contact.client_id");
    expect(migrationSql).not.toContain("where company_id =");
    expect(migrationSql).not.toContain("where client_id =");
  });

  it("preserves company scoping and client update authorization", () => {
    expect(migrationSql).toContain("v_company_id uuid := public.current_company_id()");
    expect(migrationSql).toContain("public.current_app_user_has_current_company()");
    expect(migrationSql).toContain("public.current_app_user_can_update_client_row(v_client_company_id, p_client_id)");
    expect(migrationSql).toContain("public.current_app_user_can_update_client_row(v_contact.company_id, v_contact.client_id)");
  });

  it("supports minimal name and email contact setup before inviting", () => {
    expect(migrationSql).toContain("v_name text := trim(coalesce(p_contact->>'name', ''))");
    expect(migrationSql).toContain("nullif(p_contact->>'email', '')");
    expect(migrationSql).toContain("nullif(p_contact->>'phone', '')");
    expect(migrationSql).toContain("nullif(p_contact->>'title', '')");
    expect(migrationSql).toContain("client_contact_name_required");
  });
});
