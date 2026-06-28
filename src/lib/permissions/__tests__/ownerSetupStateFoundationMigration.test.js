import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260622090000_owner_setup_v2e_sql_foundation.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("Owner Setup V2E SQL foundation migration", () => {
  it("creates locked-down company setup state storage", () => {
    expect(migrationSql).toContain("create table if not exists public.company_setup_states");
    expect(migrationSql).toContain("id uuid primary key default gen_random_uuid()");
    expect(migrationSql).toContain("company_id uuid not null");
    expect(migrationSql).toContain("setup_banner_dismissed_at timestamptz");
    expect(migrationSql).toContain("completed_sections jsonb not null default '{}'::jsonb");
    expect(migrationSql).toContain("tutorial_acknowledgements jsonb not null default '{}'::jsonb");
    expect(migrationSql).toContain("constraint company_setup_states_company_unique unique (company_id)");
    expect(migrationSql).toContain("alter table public.company_setup_states enable row level security");
    expect(migrationSql).toContain(
      "revoke all privileges on table public.company_setup_states from public, anon, authenticated",
    );
    expect(migrationSql).toContain("grant all privileges on table public.company_setup_states to service_role");
  });

  it("seeds setup management permission for owner and admin templates", () => {
    expect(migrationSql).toContain("'company.setup.manage'");
    expect(migrationSql).toContain("Manage company setup");
    expect(migrationSql).toContain("insert into public.role_permissions");
    expect(migrationSql).toContain("lower(r.name) in ('owner', 'admin')");
  });

  it("adds a guarded owner setup state read RPC without write-on-read", () => {
    expect(migrationSql).toContain("create or replace function public.rpc_owner_setup_state_get()");
    expect(migrationSql).toContain("returns jsonb");
    expect(migrationSql).toContain("security definer");
    expect(migrationSql).toContain("set search_path = public");
    expect(migrationSql).toContain("current_app_user_has_current_company()");
    expect(migrationSql).toContain("current_app_user_has_permission('company.setup.read')");
    expect(migrationSql).toContain("current_app_user_has_permission('company.setup.manage')");
    expect(migrationSql).toContain("'write_on_read', false");
    expect(migrationSql).toContain("grant execute on function public.rpc_owner_setup_state_get() to authenticated, service_role");
    expect(migrationSql).not.toMatch(/insert into public\.company_setup_states/i);
    expect(migrationSql).not.toMatch(/update public\.company_setup_states/i);
  });

  it("documents non-authority setup semantics", () => {
    expect(migrationSql).toContain("does not grant permissions");
    expect(migrationSql).toContain("Does not expose raw diagnostics");
    expect(migrationSql).not.toContain("companies.settings");
    expect(migrationSql).not.toContain("rpc_company_profile_update");
  });
});
