import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseClient", () => ({
  default: {
    functions: {
      invoke: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));

const supabase = (await import("@/lib/supabaseClient")).default;
const {
  clientPortalRpcNames,
  createClientPortalReportDownloadUrl,
  getClientPortalOrderDetail,
  getClientPortalDashboard,
  listClientPortalOrders,
  normalizeClientPortalOrderDetail,
} = await import("../api");

describe("clientPortalApi", () => {
  beforeEach(() => {
    supabase.rpc.mockReset();
    supabase.functions.invoke.mockReset();
  });

  it("loads dashboard summary through the dedicated dashboard RPC", async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        active_order_count: 2,
        report_available_count: 1,
        next_due_at: "2026-06-15",
        recent_orders: [
          {
            order_key: "portal-order-1",
            order_number: "CP-001",
            property_address: "100 Main St",
          },
        ],
      },
      error: null,
    });

    await expect(getClientPortalDashboard()).resolves.toEqual({
      activeOrderCount: 2,
      reportAvailableCount: 1,
      nextDueAt: "2026-06-15",
      recentOrders: [
        expect.objectContaining({
          orderKey: "portal-order-1",
          orderNumber: "CP-001",
        }),
      ],
    });

    expect(supabase.rpc).toHaveBeenCalledWith(clientPortalRpcNames.dashboard);
  });

  it("lists client portal orders through the dedicated client-safe RPC", async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        {
          order_key: "portal-order-1",
          order_number: "CP-001",
          property_address: "100 Main St",
          status_label: "In progress",
          client_due_at: "2026-06-15",
          vendor_bid_amount: 900,
          internal_note: "Never expose",
        },
      ],
      error: null,
    });

    const orders = await listClientPortalOrders();

    expect(orders).toEqual([
      expect.objectContaining({
        orderKey: "portal-order-1",
        orderNumber: "CP-001",
        propertyAddress: "100 Main St",
        status: "In progress",
        dueAt: "2026-06-15",
      }),
    ]);

    expect(supabase.rpc).toHaveBeenCalledWith(clientPortalRpcNames.listOrders);
    expect(JSON.stringify(orders)).not.toMatch(/vendor_bid_amount|internal_note/i);
  });

  it("loads order detail by opaque client portal order key", async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        order_key: "portal-order-1",
        order_number: "CP-001",
        property_address: "100 Main St",
        report_available: true,
      },
      error: null,
    });

    await getClientPortalOrderDetail("portal-order-1");

    expect(supabase.rpc).toHaveBeenCalledWith(clientPortalRpcNames.orderDetail, {
      p_order_key: "portal-order-1",
    });
  });

  it("requests report download through the dedicated client portal Edge Function", async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: {
        signed_url: "https://signed.example/report.pdf",
        expires_in: 300,
        report: {
          file_name: "final-report.pdf",
        },
      },
      error: null,
    });

    await expect(createClientPortalReportDownloadUrl("portal-order-1")).resolves.toEqual({
      signedUrl: "https://signed.example/report.pdf",
      expiresIn: 300,
      fileName: "final-report.pdf",
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      clientPortalRpcNames.reportDownloadFunction,
      {
        body: {
          order_key: "portal-order-1",
        },
      },
    );
  });

  it("normalizes detail without internal assignment, vendor, procurement, or fee fields", () => {
    const normalized = normalizeClientPortalOrderDetail({
      order_key: "portal-order-1",
      order_number: "CP-001",
      property_address: "100 Main St",
      report_available: true,
      appraiser_private_note: "hidden",
      vendor_name: "hidden vendor",
      bid_request_id: "hidden procurement",
      client_fee: 1200,
      internal_review_note: "hidden review",
    });

    const serialized = JSON.stringify(normalized);

    expect(serialized).toContain("CP-001");
    expect(serialized).not.toMatch(/appraiser_private_note|vendor_name|bid_request_id|client_fee|internal_review_note/i);
  });
});
