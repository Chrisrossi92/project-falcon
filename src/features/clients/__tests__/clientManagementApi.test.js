import { describe, expect, it, vi, beforeEach } from "vitest";

const fetchOrdersWithFiltersMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/orders", () => ({
  fetchOrdersWithFilters: fetchOrdersWithFiltersMock,
}));

vi.mock("@/lib/supabaseClient", () => ({
  default: {
    rpc: vi.fn(),
  },
}));

import { listAssignedOrderClients } from "../clientManagementApi";

describe("clientManagementApi assigned order clients", () => {
  beforeEach(() => {
    fetchOrdersWithFiltersMock.mockReset();
  });

  it("groups appraiser-visible current and historical assigned orders by client", async () => {
    fetchOrdersWithFiltersMock.mockResolvedValue({
      rows: [
        {
          id: "order-1",
          client_id: "client-acme-capital",
          client_name: "Acme Capital",
          status: "completed",
          appraiser_fee: 500,
          created_at: "2026-04-10T12:00:00.000Z",
        },
        {
          id: "order-2",
          client_id: "client-acme-appraisal",
          client_name: "ACME Appraisal",
          status: "in_progress",
          appraiser_fee: 625,
          created_at: "2026-05-20T12:00:00.000Z",
        },
        {
          id: "order-3",
          client_id: "client-acme-capital",
          client_name: "Acme Capital",
          status: "cancelled",
          base_fee: 700,
          created_at: "2026-05-01T12:00:00.000Z",
        },
      ],
      error: null,
    });

    const rows = await listAssignedOrderClients({
      appraiserId: "chris-user",
      sort: "name_asc",
    });

    expect(fetchOrdersWithFiltersMock).toHaveBeenCalledWith({
      appraiserId: "chris-user",
      includeArchived: true,
      includeRetiredLifecycle: true,
      orderBy: "created_at",
      ascending: false,
      page: 0,
      pageSize: 1000,
      scope: "orders",
    });
    expect(rows).toEqual([
      expect.objectContaining({
        id: "client-acme-appraisal",
        name: "ACME Appraisal",
        total_orders: 1,
        avg_fee: 625,
        status: "active",
      }),
      expect.objectContaining({
        id: "client-acme-capital",
        name: "Acme Capital",
        total_orders: 2,
        avg_fee: 600,
        status: "inactive",
      }),
    ]);
  });

  it("returns no appraiser clients without an appraiser id", async () => {
    await expect(listAssignedOrderClients()).resolves.toEqual([]);
    expect(fetchOrdersWithFiltersMock).not.toHaveBeenCalled();
  });
});
