import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));

const ordersServiceMock = vi.hoisted(() => ({
  OrderStatus: {
    NEW: "new",
  },
  updateSiteVisitAtViaRpc: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  default: supabaseMock,
}));

vi.mock("@/lib/services/ordersService", () => ordersServiceMock);

const {
  assignAppraiser,
  bulkAssignAppraiser,
  createOrder,
  updateSiteVisitAt,
} = await import("../orders.js");

describe("updateSiteVisitAt", () => {
  beforeEach(() => {
    supabaseMock.rpc.mockReset();
    supabaseMock.from.mockReset();
    ordersServiceMock.updateSiteVisitAtViaRpc.mockReset();
  });

  it("updates site_visit_at through the RPC-backed service wrapper", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const updatedOrder = {
      id: "order-1",
      site_visit_at: "2026-05-20T14:00:00",
    };
    ordersServiceMock.updateSiteVisitAtViaRpc.mockResolvedValue(updatedOrder);
    supabaseMock.rpc.mockResolvedValue({ data: "calendar-1", error: null });

    await expect(
      updateSiteVisitAt("order-1", "2026-05-20T14:00:00", {
        address: "1 Main St",
        appraiserId: "appraiser-1",
      }),
    ).resolves.toBe(updatedOrder);

    expect(ordersServiceMock.updateSiteVisitAtViaRpc).toHaveBeenCalledWith(
      "order-1",
      "2026-05-20T14:00:00",
    );
    expect(supabaseMock.from).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("keeps calendar event creation as a best-effort side effect after success", async () => {
    ordersServiceMock.updateSiteVisitAtViaRpc.mockResolvedValue({
      id: "order-1",
      site_visit_at: "2026-05-20T14:00:00",
    });
    supabaseMock.rpc.mockResolvedValue({ data: "calendar-1", error: null });

    await updateSiteVisitAt("order-1", "2026-05-20T14:00:00", {
      address: "1 Main St",
      appraiserId: "appraiser-1",
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_create_calendar_event", {
      p_event_type: "site_visit",
      p_title: "Site Visit – 1 Main St",
      p_start_at: "2026-05-20T14:00:00",
      p_end_at: "2026-05-20T14:00:00",
      p_order_id: "order-1",
      p_appraiser_id: "appraiser-1",
      p_location: "1 Main St",
      p_notes: null,
    });
  });

  it("does not fail the site visit update when calendar event creation fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const updatedOrder = {
      id: "order-1",
      site_visit_at: "2026-05-20T14:00:00",
    };
    ordersServiceMock.updateSiteVisitAtViaRpc.mockResolvedValue(updatedOrder);
    supabaseMock.rpc.mockRejectedValue(new Error("calendar unavailable"));

    await expect(
      updateSiteVisitAt("order-1", "2026-05-20T14:00:00"),
    ).resolves.toBe(updatedOrder);

    expect(warnSpy).toHaveBeenCalledWith(
      "rpc_create_calendar_event (site_visit) failed:",
      "calendar unavailable",
    );

    warnSpy.mockRestore();
  });

  it("returns null and skips calendar event creation when the order update fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    ordersServiceMock.updateSiteVisitAtViaRpc.mockRejectedValue(new Error("not authorized"));

    await expect(updateSiteVisitAt("order-1", "2026-05-20T14:00:00")).resolves.toBeNull();

    expect(supabaseMock.rpc).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("emits a development warning when the legacy direct create helper is used", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const single = vi.fn().mockResolvedValue({
      data: { id: "order-1" },
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    supabaseMock.from.mockReturnValue({ insert });

    await expect(createOrder({ property_address: "1 Main St" })).resolves.toEqual({
      id: "order-1",
    });

    expect(warnSpy).toHaveBeenCalledWith(
      "[ordersApi] createOrder performs a direct orders table mutation and is deprecated. Use createOrderViaRpc instead."
    );

    warnSpy.mockRestore();
  });

  it("keeps deprecated direct appraiser assignment helpers quarantined as throwing stubs", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(assignAppraiser("order-1", "appraiser-1")).rejects.toThrow(
      "Order assignment changes must use backend-owned assignment/order RPCs.",
    );
    await expect(bulkAssignAppraiser(["order-1"], "appraiser-1")).rejects.toThrow(
      "Order assignment changes must use backend-owned assignment/order RPCs.",
    );

    expect(supabaseMock.from).not.toHaveBeenCalled();
    expect(supabaseMock.rpc).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
