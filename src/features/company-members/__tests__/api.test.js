import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseClient", () => ({
  default: {
    rpc: vi.fn(),
  },
}));

const supabase = (await import("@/lib/supabaseClient")).default;
const { listCompanyMembers } = await import("../api");

describe("company member api", () => {
  beforeEach(() => {
    supabase.rpc.mockReset();
  });

  it("passes the active operation scope to the member list RPC", async () => {
    supabase.rpc.mockResolvedValue({ data: [], error: null });

    await listCompanyMembers({
      includeInactive: true,
      operationsScope: "amc_operations",
    });

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_company_member_list", {
      p_include_inactive: true,
      p_operations_scope: "amc_operations",
    });
  });

  it("preserves no-scope fallback for callers without operation context", async () => {
    supabase.rpc.mockResolvedValue({ data: [], error: null });

    await listCompanyMembers();

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_company_member_list", {
      p_include_inactive: false,
      p_operations_scope: null,
    });
  });
});
