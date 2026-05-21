import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  default: supabaseMock,
}));

const { updateCompanyProfile } = await import("../companyProfileApi.js");

describe("companyProfileApi", () => {
  beforeEach(() => {
    supabaseMock.rpc.mockReset();
  });

  it("calls only the guarded company profile update RPC with allowed fields", async () => {
    const result = {
      status: "updated",
      company_id: "company-1",
      profile: {
        name: "Company One",
        timezone: "America/New_York",
        locale: "en-US",
      },
    };
    supabaseMock.rpc.mockResolvedValue({ data: result, error: null });

    await expect(
      updateCompanyProfile({
        name: "Company One",
        timezone: "America/New_York",
        locale: "en-US",
        settings: { unsafe: true },
      }),
    ).resolves.toBe(result);

    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_company_profile_update", {
      p_patch: {
        name: "Company One",
        timezone: "America/New_York",
        locale: "en-US",
      },
    });
  });

  it("throws RPC errors for the caller to map safely", async () => {
    const error = Object.assign(new Error("company_update_profile_permission_required"), {
      code: "42501",
    });
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(updateCompanyProfile({ name: "Company One" })).rejects.toBe(error);
  });

  it("does not call bootstrap or table mutation APIs", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: null, error: null });

    await updateCompanyProfile({ name: "Company One" });

    expect(supabaseMock.rpc.mock.calls[0][0]).toBe("rpc_company_profile_update");
    expect(supabaseMock.rpc.mock.calls[0][0]).not.toMatch(/bootstrap/i);
    expect(supabaseMock.insert).toBeUndefined();
    expect(supabaseMock.update).toBeUndefined();
    expect(supabaseMock.upsert).toBeUndefined();
    expect(supabaseMock.delete).toBeUndefined();
  });
});
