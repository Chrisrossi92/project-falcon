import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  default: supabaseMock,
}));

const { completeOwnerSetup, getOwnerSetupState } = await import("../ownerSetupStateApi.js");

describe("ownerSetupStateApi", () => {
  beforeEach(() => {
    supabaseMock.rpc.mockReset();
  });

  it("calls only the guarded owner setup state read RPC", async () => {
    const result = {
      state_exists: true,
      setup_banner_dismissed_at: "2026-06-22T15:00:00Z",
      banner_should_show: false,
    };
    supabaseMock.rpc.mockResolvedValue({ data: result, error: null });

    await expect(getOwnerSetupState()).resolves.toBe(result);

    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_owner_setup_state_get");
    expect(supabaseMock.insert).toBeUndefined();
    expect(supabaseMock.update).toBeUndefined();
    expect(supabaseMock.upsert).toBeUndefined();
    expect(supabaseMock.delete).toBeUndefined();
  });

  it("calls only the guarded owner setup completion RPC", async () => {
    const result = {
      setup_state: { minimum_ready_at: "2026-06-22T15:00:00Z" },
      readiness: { minimum_ready: true },
    };
    supabaseMock.rpc.mockResolvedValue({ data: result, error: null });

    await expect(completeOwnerSetup()).resolves.toBe(result);

    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_owner_setup_mark_complete");
    expect(supabaseMock.insert).toBeUndefined();
    expect(supabaseMock.update).toBeUndefined();
    expect(supabaseMock.upsert).toBeUndefined();
    expect(supabaseMock.delete).toBeUndefined();
  });

  it("throws RPC errors for the page to map safely", async () => {
    const error = Object.assign(new Error("owner_setup_minimum_readiness_required"), {
      code: "22023",
    });
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(completeOwnerSetup()).rejects.toBe(error);
  });

  it("throws setup state read errors for the dashboard to handle safely", async () => {
    const error = Object.assign(new Error("owner_setup_state_read_permission_required"), {
      code: "42501",
    });
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(getOwnerSetupState()).rejects.toBe(error);
  });
});
