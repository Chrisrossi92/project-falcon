import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const permissionWrapperSql = readFileSync(
  resolve(repoRoot, "supabase/migrations/20260518010000_company_permission_helper_wrappers.sql"),
  "utf8",
);
const appContextSql = readFileSync(
  resolve(repoRoot, "supabase/migrations/20260518052000_current_user_app_context_rpc.sql"),
  "utf8",
);
const memberListSql = readFileSync(
  resolve(repoRoot, "supabase/migrations/20260518039000_company_member_role_read_projections.sql"),
  "utf8",
);
const memberMutationSql = readFileSync(
  resolve(repoRoot, "supabase/migrations/20260518040000_company_member_mutation_rpcs.sql"),
  "utf8",
);
const invitationSql = readFileSync(
  resolve(repoRoot, "supabase/migrations/20260518041000_company_member_invitations.sql"),
  "utf8",
);

describe("operation role scope audit", () => {
  it("resolves active permission checks through the current company context", () => {
    expect(permissionWrapperSql).toContain(
      "current_app_user_permission_keys_for_company(public.current_company_id())",
    );
    expect(permissionWrapperSql).toContain(
      "public.current_app_user_has_permission_for_company(\n    public.current_company_id(),",
    );
    expect(permissionWrapperSql).not.toMatch(/from\s+public\.user_roles/i);
  });

  it("builds current app context from current-company role assignments, not global roles", () => {
    expect(appContextSql).toContain("public.current_company_id() as resolved_company_id");
    expect(appContextSql).toContain("on ura.user_id = ctx.app_user_id");
    expect(appContextSql).toContain("and ura.company_id = ac.id");
    expect(appContextSql).toContain("coalesce(rs.has_owner, false) as is_owner");
    expect(appContextSql).not.toMatch(/\b(from|join)\s+public\.user_roles\b/i);
  });

  it("scopes user-management reads and role mutation targets to current company membership", () => {
    expect(memberListSql).toContain("v_company_id uuid := public.current_company_id()");
    expect(memberListSql).toContain("where cm.company_id = v_company_id");
    expect(memberListSql).toMatch(/on\s+ura\.company_id\s+=\s+cm\.company_id\s+and\s+ura\.user_id\s+=\s+cm\.user_id/i);

    expect(memberMutationSql).toContain("v_company_id uuid := public.current_company_id()");
    expect(memberMutationSql).toContain("where cm.company_id = v_company_id");
    expect(memberMutationSql).toContain("where ura.company_id = v_company_id");
    expect(memberMutationSql).toContain("v_company_id,\n    p_user_id,");
  });

  it("scopes invites to current company without granting access to sibling operations", () => {
    expect(invitationSql).toContain("v_company_id uuid := public.current_company_id()");
    expect(invitationSql).toContain("if not public.current_app_user_has_current_company() then");
    expect(invitationSql).toContain("company_id,\n    email,");
    expect(invitationSql).toContain("v_company_id,");
    expect(invitationSql).toContain("insert into public.company_memberships");
  });
});
