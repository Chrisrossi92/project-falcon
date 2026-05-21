import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  default: supabaseMock,
}));

const {
  getCompanySetupContext,
  isCompanySetupPermissionDeniedError,
  normalizeCompanySetupContext,
} = await import("../companySetupContextApi.js");

const sourcePath = resolve(dirname(fileURLToPath(import.meta.url)), "../companySetupContextApi.js");

const setupRow = {
  company_id: "company-1",
  company_slug: "company-one",
  company_name: "Company One",
  company_type: "staff_shop",
  company_status: "active",
  timezone: "America/New_York",
  locale: "en-US",
  active_company_claim_id: "company-1",
  active_company_context_valid: true,
  profile_complete: true,
  owner_invariant_ok: true,
  active_owner_count: 1,
  active_member_count: 2,
  active_role_assignment_count: 2,
  role_presets_ready: true,
  owner_role_ready: true,
  relationship_readiness: { enabled: true },
  assignment_readiness: { enabled: true },
  dashboard_readiness: { has_any_dashboard: true },
  audit_readiness: { has_bootstrap_audit: true },
  setup_complete: true,
  setup_blockers: [],
  checklist: [{ key: "company_profile", ready: true }],
};

describe("companySetupContextApi", () => {
  beforeEach(() => {
    supabaseMock.rpc.mockReset();
  });

  it("calls only the setup context RPC and returns normalized data", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: [setupRow], error: null });

    await expect(getCompanySetupContext()).resolves.toEqual({
      ...setupRow,
      relationship_readiness: { enabled: true },
      assignment_readiness: { enabled: true },
      dashboard_readiness: { has_any_dashboard: true },
      audit_readiness: { has_bootstrap_audit: true },
    });

    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_company_setup_context");
  });

  it("returns null for an empty setup context result", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: [], error: null });

    await expect(getCompanySetupContext()).resolves.toBeNull();
  });

  it("throws RPC errors for the hook or caller to handle safely", async () => {
    const error = Object.assign(new Error("setup_read_permission_missing"), { code: "42501" });
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(getCompanySetupContext()).rejects.toBe(error);
  });

  it("identifies setup permission and membership errors", () => {
    expect(isCompanySetupPermissionDeniedError({ code: "42501" })).toBe(true);
    expect(isCompanySetupPermissionDeniedError(new Error("setup_read_permission_missing"))).toBe(true);
    expect(isCompanySetupPermissionDeniedError(new Error("current_company_membership_required"))).toBe(true);
    expect(isCompanySetupPermissionDeniedError(new Error("some_transient_failure"))).toBe(false);
  });

  it("normalizes missing optional setup fields without authority fields", () => {
    expect(normalizeCompanySetupContext({ company_id: "company-1" })).toEqual({
      company_id: "company-1",
      company_slug: null,
      company_name: null,
      company_type: null,
      company_status: null,
      timezone: null,
      locale: null,
      active_company_claim_id: null,
      active_company_context_valid: false,
      profile_complete: false,
      owner_invariant_ok: false,
      active_owner_count: 0,
      active_member_count: 0,
      active_role_assignment_count: 0,
      role_presets_ready: false,
      owner_role_ready: false,
      relationship_readiness: {},
      assignment_readiness: {},
      dashboard_readiness: {},
      audit_readiness: {},
      setup_complete: false,
      setup_blockers: [],
      checklist: [],
    });
  });

  it("does not include browser provisioning or mutation calls", () => {
    const source = readFileSync(sourcePath, "utf8");

    expect(source).toContain("rpc_company_setup_context");
    expect(source).not.toMatch(/rpc_company_bootstrap/);
    expect(source).not.toMatch(/\.(insert|update|upsert|delete)\(/);
    expect(source).not.toMatch(/access[_-]?granted|grant/i);
  });
});
