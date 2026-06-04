import { beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabaseClient", () => ({
  default: {
    rpc: rpcMock,
  },
}));

const { fetchVendorWorkspaceDashboardSummary } = await import("../api.js");

describe("vendorWorkspace api", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("loads dashboard summary through the vendor-scoped RPC", async () => {
    const summary = {
      ok: true,
      counts: {
        available_work: 1,
        pending_bids: 2,
        assignment_offers: 3,
        active_assigned_orders: 4,
        submitted_awaiting_review: 5,
        needs_attention: 6,
      },
      actions: [{ kind: "bid_request", label: "Submit bid" }],
    };
    rpcMock.mockResolvedValue({ data: summary, error: null });

    await expect(fetchVendorWorkspaceDashboardSummary()).resolves.toEqual(summary);
    expect(rpcMock).toHaveBeenCalledWith("rpc_vendor_workspace_dashboard_summary");
  });

  it("normalizes missing response sections to the safe empty dashboard shape", async () => {
    rpcMock.mockResolvedValue({ data: { ok: true }, error: null });

    await expect(fetchVendorWorkspaceDashboardSummary()).resolves.toEqual({
      ok: true,
      counts: {
        available_work: 0,
        pending_bids: 0,
        assignment_offers: 0,
        active_assigned_orders: 0,
        submitted_awaiting_review: 0,
        needs_attention: 0,
      },
      actions: [],
    });
  });

  it("propagates RPC errors so the dashboard can show its safe error state", async () => {
    rpcMock.mockResolvedValue({ data: null, error: new Error("vendor_workspace_view_permission_required") });

    await expect(fetchVendorWorkspaceDashboardSummary()).rejects.toThrow(
      "vendor_workspace_view_permission_required",
    );
  });
});
