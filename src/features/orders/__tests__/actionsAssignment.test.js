import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  default: supabaseMock,
  supabase: supabaseMock,
}));

const { assignOrder } = await import("../actions.js");

describe("legacy assignOrder compatibility adapter", () => {
  beforeEach(() => {
    supabaseMock.rpc.mockReset();
    supabaseMock.from.mockReset();
  });

  it("routes assigned_to assignment through rpc_assign_order", async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: { id: "order-1", assigned_to: "appraiser-1" },
      error: null,
    });

    await expect(assignOrder("order-1", "appraiser-1", "Assigned")).resolves.toEqual({
      id: "order-1",
      assigned_to: "appraiser-1",
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_assign_order", {
      p_order_id: "order-1",
      p_assigned_to: "appraiser-1",
      p_note: "Assigned",
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("throws rpc_assign_order errors for callers to handle", async () => {
    const error = Object.assign(new Error("assignment denied"), { code: "42501" });
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(assignOrder("order-1", "appraiser-1")).rejects.toThrow("assignment denied");
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });
});
