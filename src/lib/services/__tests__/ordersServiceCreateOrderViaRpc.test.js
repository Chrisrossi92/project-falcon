import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  default: supabaseMock,
}));

vi.mock("@/lib/services/notificationsService", () => ({
  emitNotification: vi.fn(),
  fetchAdminRecipients: vi.fn(),
}));

vi.mock("@/lib/orders/resolveOrderParticipants", () => ({
  resolveOrderParticipants: vi.fn(),
}));

vi.mock("@/lib/workflow/orderWorkflowGuards", () => ({
  assertOrderWorkflowTransition: vi.fn(),
}));

const {
  createOrder,
  createOrderViaRpc,
  isOrderNumberAvailableV2,
  overrideOrderNumber,
  updateOrder,
  updateOrderViaRpc,
  updateSiteVisitAtViaRpc,
} = await import("../ordersService.js");

describe("createOrderViaRpc", () => {
  beforeEach(() => {
    supabaseMock.rpc.mockReset();
    supabaseMock.from.mockReset();
  });

  it("calls the guarded create order RPC with the submitted payload", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const payload = {
      order_number: "LEGACY-PREFETCH",
      property_address: "1 Main St",
      city: "Austin",
    };
    const createdOrder = {
      id: "order-1",
      order_number: "2026001",
      property_address: "1 Main St",
    };

    supabaseMock.rpc.mockResolvedValue({ data: createdOrder, error: null });

    await expect(createOrderViaRpc(payload)).resolves.toBe(createdOrder);

    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_create_order", {
      payload,
    });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("does not direct insert orders or call legacy numbering RPCs", async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: { id: "order-1", order_number: "2026001" },
      error: null,
    });

    await createOrderViaRpc({ order_number: "LEGACY-PREFETCH" });

    expect(supabaseMock.from).not.toHaveBeenCalled();
    expect(supabaseMock.rpc).not.toHaveBeenCalledWith("rpc_get_next_order_number");
    expect(supabaseMock.rpc).not.toHaveBeenCalledWith("rpc_is_order_number_available");
  });

  it("throws RPC errors for callers to handle", async () => {
    const error = Object.assign(new Error("not authorized to create orders"), {
      code: "42501",
    });

    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(createOrderViaRpc({ property_address: "1 Main St" })).rejects.toBe(error);
  });

  it("returns null when the RPC returns no row and no error", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: null, error: null });

    await expect(createOrderViaRpc({ property_address: "1 Main St" })).resolves.toBeNull();
  });
});

describe("deprecated direct order helpers", () => {
  beforeEach(() => {
    supabaseMock.rpc.mockReset();
    supabaseMock.from.mockReset();
  });

  it("emits a development warning when direct createOrder is used", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "order-1" },
      error: null,
    });
    const select = vi.fn(() => ({ maybeSingle }));
    const insert = vi.fn(() => ({ select }));
    supabaseMock.from.mockReturnValue({ insert });

    await expect(createOrder({ property_address: "1 Main St" })).resolves.toEqual({
      id: "order-1",
    });

    expect(warnSpy).toHaveBeenCalledWith(
      "[ordersService] createOrder performs a direct orders table mutation and is deprecated. Use createOrderViaRpc instead."
    );
    expect(supabaseMock.rpc).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("emits a development warning when direct updateOrder is used", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const single = vi.fn().mockResolvedValue({
      data: { id: "order-1", notes: "Updated" },
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    supabaseMock.from.mockReturnValue({ update });

    await expect(updateOrder("order-1", { notes: "Updated" })).resolves.toEqual({
      id: "order-1",
      notes: "Updated",
    });

    expect(warnSpy).toHaveBeenCalledWith(
      "[ordersService] updateOrder performs a direct orders table mutation and is deprecated. Use updateOrderViaRpc instead."
    );
    expect(supabaseMock.rpc).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});

describe("isOrderNumberAvailableV2", () => {
  beforeEach(() => {
    supabaseMock.rpc.mockReset();
    supabaseMock.from.mockReset();
  });

  it("calls the company-scoped availability RPC with the current order id", async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: {
        available: true,
        order_number: "2026001",
        company_id: "company-1",
        conflicting_order_id: null,
        scope: "company",
      },
      error: null,
    });

    await expect(
      isOrderNumberAvailableV2("2026001", { orderId: "order-1" }),
    ).resolves.toBe(true);

    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_is_order_number_available_v2", {
      p_order_number: "2026001",
      p_order_id: "order-1",
    });
    expect(supabaseMock.rpc).not.toHaveBeenCalledWith("rpc_is_order_number_available");
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("returns false for v2 conflict responses", async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: {
        available: false,
        order_number: "2026001",
        company_id: "company-1",
        conflicting_order_id: "order-2",
        scope: "company",
      },
      error: null,
    });

    await expect(isOrderNumberAvailableV2("2026001")).resolves.toBe(false);
  });

  it("throws v2 RPC errors for callers to handle", async () => {
    const error = Object.assign(new Error("order_number_required"), {
      code: "22023",
    });

    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(isOrderNumberAvailableV2("")).rejects.toBe(error);
  });
});

describe("updateOrderViaRpc", () => {
  beforeEach(() => {
    supabaseMock.rpc.mockReset();
    supabaseMock.from.mockReset();
  });

  it("calls the guarded update order RPC with the submitted patch", async () => {
    const patch = {
      property_address: "1 Main St",
      reviewer_id: "reviewer-1",
      split_pct: 42.5,
    };
    const updatedOrder = {
      id: "order-1",
      property_address: "1 Main St",
    };

    supabaseMock.rpc.mockResolvedValue({ data: updatedOrder, error: null });

    await expect(updateOrderViaRpc("order-1", patch)).resolves.toBe(updatedOrder);

    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_update_order", {
      order_id: "order-1",
      patch,
    });
  });

  it("does not direct update orders or call create/override RPCs", async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: { id: "order-1" },
      error: null,
    });

    await updateOrderViaRpc("order-1", { property_address: "1 Main St" });

    expect(supabaseMock.from).not.toHaveBeenCalled();
    expect(supabaseMock.rpc).not.toHaveBeenCalledWith("rpc_create_order");
    expect(supabaseMock.rpc).not.toHaveBeenCalledWith("rpc_order_number_override");
  });

  it("throws update RPC errors for callers to handle", async () => {
    const error = Object.assign(new Error("not authorized to update order"), {
      code: "42501",
    });

    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(updateOrderViaRpc("order-1", { notes: "Updated" })).rejects.toBe(error);
  });

  it("returns null when the update RPC returns no row and no error", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: null, error: null });

    await expect(updateOrderViaRpc("order-1", { notes: "Updated" })).resolves.toBeNull();
  });
});

describe("updateSiteVisitAtViaRpc", () => {
  beforeEach(() => {
    supabaseMock.rpc.mockReset();
    supabaseMock.from.mockReset();
  });

  it("updates only site_visit_at through the guarded update RPC", async () => {
    const updatedOrder = {
      id: "order-1",
      site_visit_at: "2026-05-20T14:00:00.000Z",
    };
    supabaseMock.rpc.mockResolvedValue({ data: updatedOrder, error: null });

    await expect(
      updateSiteVisitAtViaRpc("order-1", "2026-05-20T14:00:00.000Z"),
    ).resolves.toBe(updatedOrder);

    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_update_order", {
      order_id: "order-1",
      patch: {
        site_visit_at: "2026-05-20T14:00:00.000Z",
      },
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("clears site_visit_at through the guarded update RPC", async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: { id: "order-1", site_visit_at: null },
      error: null,
    });

    await updateSiteVisitAtViaRpc("order-1", "");

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_update_order", {
      order_id: "order-1",
      patch: {
        site_visit_at: null,
      },
    });
  });

  it("throws update RPC errors for callers to handle", async () => {
    const error = Object.assign(new Error("not authorized to update order"), {
      code: "42501",
    });
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(
      updateSiteVisitAtViaRpc("order-1", "2026-05-20T14:00:00.000Z"),
    ).rejects.toBe(error);
  });
});

describe("overrideOrderNumber", () => {
  beforeEach(() => {
    supabaseMock.rpc.mockReset();
    supabaseMock.from.mockReset();
  });

  it("calls the guarded order-number override RPC with expected args", async () => {
    const result = {
      status: "updated",
      order_id: "order-1",
      old_order_number: "2026001",
      new_order_number: "MANUAL-2026-001",
    };
    supabaseMock.rpc.mockResolvedValue({ data: result, error: null });

    await expect(
      overrideOrderNumber("order-1", "MANUAL-2026-001", "Corrected import"),
    ).resolves.toBe(result);

    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_number_override", {
      p_order_id: "order-1",
      p_order_number: "MANUAL-2026-001",
      p_reason: "Corrected import",
    });
  });

  it("passes null reason by default", async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: { status: "unchanged" },
      error: null,
    });

    await overrideOrderNumber("order-1", "2026001");

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_number_override", {
      p_order_id: "order-1",
      p_order_number: "2026001",
      p_reason: null,
    });
  });

  it("does not direct update orders or call availability RPCs", async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: { status: "updated" },
      error: null,
    });

    await overrideOrderNumber("order-1", "MANUAL-2026-001", "Corrected import");

    expect(supabaseMock.from).not.toHaveBeenCalled();
    expect(supabaseMock.rpc).not.toHaveBeenCalledWith("rpc_is_order_number_available");
    expect(supabaseMock.rpc).not.toHaveBeenCalledWith("rpc_is_order_number_available_v2");
  });

  it("throws override RPC errors for callers to handle", async () => {
    const error = Object.assign(new Error("order_number_override_not_authorized"), {
      code: "42501",
    });
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(
      overrideOrderNumber("order-1", "MANUAL-2026-001", "Corrected import"),
    ).rejects.toBe(error);
  });

  it("returns null when the override RPC returns no result and no error", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: null, error: null });

    await expect(overrideOrderNumber("order-1", "2026001")).resolves.toBeNull();
  });
});
