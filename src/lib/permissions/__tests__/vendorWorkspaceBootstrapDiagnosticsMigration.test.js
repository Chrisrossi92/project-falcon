import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(testDir, "../../../..");
const migrationPath = resolve(
  repoRoot,
  "supabase/migrations/20260610140000_vendor_workspace_bootstrap_diagnostics.sql",
);

const migrationSql = readFileSync(migrationPath, "utf8");
const normalizedSql = migrationSql.replace(/\s+/g, " ");

describe("Vendor Workspace bootstrap diagnostics migration", () => {
  it("adds an admin-only read diagnostic RPC for vendor workspace bootstrap linkage", () => {
    [
      "create or replace function public.rpc_admin_vendor_workspace_bootstrap_diagnostics",
      "public.current_app_user_has_permission('users.manage_company_access')",
      "public.current_app_user_has_permission('roles.read')",
      "raise exception 'vendor_workspace_diagnostics_admin_permission_required'",
      "grant execute on function public.rpc_admin_vendor_workspace_bootstrap_diagnostics(text)",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it("reports the user, vendor contact, membership, role assignment, and Vendor Admin permission wiring", () => {
    [
      "from public.users u",
      "from public.vendor_contacts vc",
      "join public.company_vendor_profiles cvp",
      "from public.company_memberships cm",
      "from public.user_role_assignments ura",
      "lower(r.name) = lower('Vendor Admin')",
      "rp.permission_key = 'vendor_workspace.view'",
      "'public_users'",
      "'vendor_contacts'",
      "'memberships'",
      "'role_assignments'",
      "'vendor_admin_permissions'",
      "'active_vendor_company_membership_exists'",
      "'vendor_admin_role_assigned'",
      "'vendor_admin_has_vendor_workspace_view'",
      "'contact_linked_to_public_user'",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it("keeps the diagnostic RPC read-only and free of bootstrap side effects", () => {
    [
      "insert into public.company_memberships",
      "update public.company_memberships",
      "insert into public.user_role_assignments",
      "update public.user_role_assignments",
      "update public.vendor_contacts",
      "insert into public.notifications",
      "insert into public.email_queue",
      "gen_random_bytes",
      "token_hash",
    ].forEach((sqlSnippet) => {
      expect(normalizedSql).not.toContain(sqlSnippet);
    });
  });
});
