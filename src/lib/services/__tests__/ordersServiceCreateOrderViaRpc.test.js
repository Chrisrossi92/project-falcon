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
  fetchOrderRoleRecipients: vi.fn(),
}));

vi.mock("@/lib/orders/resolveOrderParticipants", () => ({
  resolveOrderParticipants: vi.fn(),
}));

vi.mock("@/lib/workflow/orderWorkflowGuards", () => ({
  assertOrderWorkflowTransition: vi.fn(),
}));

const {
  archiveOrder,
  archiveOrderViaRpc,
  assignAppraiser,
  assignParticipants,
  assignReviewer,
  cancelOrderViaRpc,
  clearReview,
  completeOrder,
  createOrder,
  createOrderViaRpc,
  deleteOrder,
  getOrder,
  isOrderNumberAvailableV2,
  listOrders,
  overrideOrderNumber,
  overrideOrderStatusViaRpc,
  markReadyForClient,
  requestFinalApproval,
  setOrderStatus,
  startReview,
  sendOrderBackToAppraiser,
  sendOrderToReview,
  updateOrder,
  updateAssignees,
  updateOrderStatus,
  updateOrderViaRpc,
  updateSiteVisitAtViaRpc,
  voidOrderViaRpc,
} = await import("../ordersService.js");

const {
  emitNotification,
  fetchAdminRecipients,
  fetchOrderRoleRecipients,
} = await import("@/lib/services/notificationsService");
const { resolveOrderParticipants } = await import("@/lib/orders/resolveOrderParticipants");
const { assertOrderWorkflowTransition } = await import("@/lib/workflow/orderWorkflowGuards");

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
      appraiser_id: "appraiser-1",
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

  it("keeps default create compatible by omitting the operations scope argument", async () => {
    const payload = {
      property_address: "1 Main St",
    };
    const createdOrder = {
      id: "order-1",
      operations_scope: "internal_operations",
    };

    supabaseMock.rpc.mockResolvedValue({ data: createdOrder, error: null });

    await expect(createOrderViaRpc(payload)).resolves.toBe(createdOrder);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_create_order", {
      payload,
    });
  });

  it("passes explicit AMC operations scope when requested", async () => {
    const payload = {
      property_address: "1 AMC Way",
    };
    const createdOrder = {
      id: "order-amc",
      operations_scope: "amc_operations",
    };

    supabaseMock.rpc.mockResolvedValue({ data: createdOrder, error: null });

    await expect(
      createOrderViaRpc(payload, { operationsScope: "amc_operations" }),
    ).resolves.toBe(createdOrder);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_create_order", {
      payload,
      p_operations_scope: "amc_operations",
    });
  });

  it("derives the RPC operations scope from the payload when an intermediate caller drops options", async () => {
    const payload = {
      operations_scope: "amc_operations",
      property_address: "1 AMC Way",
    };
    const createdOrder = {
      id: "order-amc",
      operations_scope: "amc_operations",
    };

    supabaseMock.rpc.mockResolvedValue({ data: createdOrder, error: null });

    await expect(createOrderViaRpc(payload)).resolves.toBe(createdOrder);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_create_order", {
      payload,
      p_operations_scope: "amc_operations",
    });
  });

  it("passes explicit Internal operations scope when requested", async () => {
    const payload = {
      property_address: "1 Internal Way",
    };
    const createdOrder = {
      id: "order-internal",
      operations_scope: "internal_operations",
    };

    supabaseMock.rpc.mockResolvedValue({ data: createdOrder, error: null });

    await expect(
      createOrderViaRpc(payload, { operationsScope: "internal_operations" }),
    ).resolves.toBe(createdOrder);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_create_order", {
      payload,
      p_operations_scope: "internal_operations",
    });
  });

  it("rejects invalid frontend operations scope before calling the RPC", async () => {
    await expect(
      createOrderViaRpc(
        { property_address: "1 Main St" },
        { operationsScope: "vendor" },
      ),
    ).rejects.toThrow("Invalid order create operations scope.");

    expect(supabaseMock.rpc).not.toHaveBeenCalled();
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

describe("listOrders workspace data isolation", () => {
  beforeEach(() => {
    supabaseMock.rpc.mockReset();
    supabaseMock.from.mockReset();
  });

  it("passes explicit operations scope to the shared order projection query", async () => {
    const builder = {
      neq: vi.fn(() => builder),
      not: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      order: vi.fn(() => builder),
      range: vi.fn(() => Promise.resolve({ data: [], count: 0, error: null })),
    };
    const select = vi.fn(() => builder);
    supabaseMock.from.mockReturnValue({ select });

    await listOrders({ operationsScope: "amc_operations", activeOnly: true });

    expect(supabaseMock.from).toHaveBeenCalledWith("v_orders_frontend_v4");
    expect(select.mock.calls[0][0]).toContain("operations_scope");
    expect(builder.eq).toHaveBeenCalledWith("operations_scope", "amc_operations");
    expect(builder.neq).toHaveBeenCalledWith("is_archived", true);
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
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

  it("blocks status changes through deprecated updateOrder", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(updateOrder("order-1", { status: "in_review" })).rejects.toThrow(
      "Order status changes must use canonical workflow transition RPCs.",
    );

    expect(warnSpy).toHaveBeenCalledWith(
      "[ordersService] updateOrder performs a direct orders table mutation and is deprecated. Use updateOrderViaRpc instead."
    );
    expect(supabaseMock.from).not.toHaveBeenCalled();
    expect(supabaseMock.rpc).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("keeps deprecated status helpers quarantined as throwing stubs", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(setOrderStatus("order-1", "in_review")).rejects.toThrow(
      "Order status changes must use canonical workflow transition RPCs.",
    );
    await expect(updateOrderStatus("order-1", "in_review")).rejects.toThrow(
      "Order status changes must use canonical workflow transition RPCs.",
    );
    await expect(startReview("order-1")).rejects.toThrow(
      "Order status changes must use canonical workflow transition RPCs.",
    );

    expect(supabaseMock.from).not.toHaveBeenCalled();
    expect(supabaseMock.rpc).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("keeps deprecated deleteOrder quarantined as a throwing stub", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(deleteOrder("order-1")).rejects.toThrow(
      "Order archive/delete must use backend-owned lifecycle RPCs.",
    );

    expect(warnSpy).toHaveBeenCalledWith(
      "[ordersService] deleteOrder performs a direct orders table mutation and is deprecated. Use backend-owned lifecycle RPCs instead."
    );
    expect(supabaseMock.from).not.toHaveBeenCalled();
    expect(supabaseMock.rpc).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("keeps deprecated archiveOrder quarantined as a throwing stub", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(archiveOrder("order-1")).rejects.toThrow(
      "Order archive/delete must use backend-owned lifecycle RPCs.",
    );

    expect(warnSpy).toHaveBeenCalledWith(
      "[ordersService] archiveOrder performs a direct orders table mutation and is deprecated. Use rpc_order_archive instead."
    );
    expect(supabaseMock.from).not.toHaveBeenCalled();
    expect(supabaseMock.rpc).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("keeps deprecated direct assignment helpers quarantined as throwing stubs", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(assignParticipants("order-1", { appraiser_id: "appraiser-1" })).rejects.toThrow(
      "Order assignment changes must use backend-owned assignment/order RPCs.",
    );
    await expect(assignAppraiser("order-1", "appraiser-1")).rejects.toThrow(
      "Order assignment changes must use backend-owned assignment/order RPCs.",
    );
    await expect(assignReviewer("order-1", "reviewer-1")).rejects.toThrow(
      "Order assignment changes must use backend-owned assignment/order RPCs.",
    );
    await expect(updateAssignees("order-1", { appraiser_id: "appraiser-1" })).rejects.toThrow(
      "Order assignment changes must use backend-owned assignment/order RPCs.",
    );

    expect(supabaseMock.from).not.toHaveBeenCalled();
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

  it("calls the guarded update order RPC with participant fields in the submitted patch", async () => {
    const patch = {
      property_address: "1 Main St",
      appraiser_id: "appraiser-1",
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
    expect(supabaseMock.from).not.toHaveBeenCalled();
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
      site_visit_at: "2026-05-20T14:00:00",
    };
    supabaseMock.rpc.mockResolvedValue({ data: updatedOrder, error: null });

    await expect(
      updateSiteVisitAtViaRpc("order-1", "2026-05-20T14:00:00"),
    ).resolves.toBe(updatedOrder);

    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_update_order", {
      order_id: "order-1",
      patch: {
        site_visit_at: "2026-05-20T14:00:00",
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
      updateSiteVisitAtViaRpc("order-1", "2026-05-20T14:00:00"),
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

describe("archiveOrderViaRpc", () => {
  beforeEach(() => {
    supabaseMock.rpc.mockReset();
    supabaseMock.from.mockReset();
  });

  it("calls the guarded order archive RPC with expected args", async () => {
    const result = {
      status: "archived",
      order_id: "order-1",
      order_number: "2026001",
      order_status: "in_progress",
      is_archived: true,
    };
    supabaseMock.rpc.mockResolvedValue({ data: result, error: null });

    await expect(archiveOrderViaRpc("order-1", "Duplicate retained for audit")).resolves.toBe(
      result,
    );

    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_archive", {
      p_order_id: "order-1",
      p_reason: "Duplicate retained for audit",
    });
  });

  it("passes null reason by default", async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: { status: "archived", order_id: "order-1" },
      error: null,
    });

    await archiveOrderViaRpc("order-1");

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_archive", {
      p_order_id: "order-1",
      p_reason: null,
    });
  });

  it("does not direct update or delete orders", async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: { status: "archived", order_id: "order-1" },
      error: null,
    });

    await archiveOrderViaRpc("order-1", "No longer active");

    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("throws archive RPC errors for callers to handle", async () => {
    const error = Object.assign(new Error("order_archive_not_authorized"), {
      code: "42501",
    });
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(archiveOrderViaRpc("order-1", "No longer active")).rejects.toBe(error);
  });

  it("returns null when the archive RPC returns no result and no error", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: null, error: null });

    await expect(archiveOrderViaRpc("order-1")).resolves.toBeNull();
  });
});

describe("cancelOrderViaRpc", () => {
  beforeEach(() => {
    supabaseMock.rpc.mockReset();
    supabaseMock.from.mockReset();
  });

  it("calls the guarded order cancel RPC with expected args", async () => {
    const result = {
      status: "cancelled",
      order_id: "order-1",
      order_number: "2026001",
      order_status: "cancelled",
      is_archived: false,
    };
    supabaseMock.rpc.mockResolvedValue({ data: result, error: null });

    await expect(cancelOrderViaRpc("order-1", "Client withdrew")).resolves.toBe(result);

    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_cancel", {
      p_order_id: "order-1",
      p_reason: "Client withdrew",
    });
  });

  it("requires and trims the cancellation reason before calling the RPC", async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: { status: "cancelled", order_id: "order-1" },
      error: null,
    });

    await expect(cancelOrderViaRpc("order-1", "  Client withdrew  ")).resolves.toEqual({
      status: "cancelled",
      order_id: "order-1",
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_cancel", {
      p_order_id: "order-1",
      p_reason: "Client withdrew",
    });

    supabaseMock.rpc.mockClear();
    await expect(cancelOrderViaRpc("order-1", "   ")).rejects.toThrow(
      "Order cancellation reason is required.",
    );
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("does not direct update orders", async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: { status: "cancelled", order_id: "order-1" },
      error: null,
    });

    await cancelOrderViaRpc("order-1", "Client withdrew");

    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("throws cancel RPC errors for callers to handle", async () => {
    const error = Object.assign(new Error("order_cancel_not_authorized"), {
      code: "42501",
    });
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(cancelOrderViaRpc("order-1", "Client withdrew")).rejects.toBe(error);
  });
});

describe("voidOrderViaRpc", () => {
  beforeEach(() => {
    supabaseMock.rpc.mockReset();
    supabaseMock.from.mockReset();
  });

  it("calls the guarded order void RPC with expected args", async () => {
    const result = {
      status: "voided",
      order_id: "order-1",
      order_number: "2026001",
      order_status: "voided",
      is_archived: false,
    };
    supabaseMock.rpc.mockResolvedValue({ data: result, error: null });

    await expect(voidOrderViaRpc("order-1", "Duplicate order")).resolves.toBe(result);

    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_void", {
      p_order_id: "order-1",
      p_reason: "Duplicate order",
    });
  });

  it("requires and trims the void reason before calling the RPC", async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: { status: "voided", order_id: "order-1" },
      error: null,
    });

    await expect(voidOrderViaRpc("order-1", "  Duplicate order  ")).resolves.toEqual({
      status: "voided",
      order_id: "order-1",
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_void", {
      p_order_id: "order-1",
      p_reason: "Duplicate order",
    });

    supabaseMock.rpc.mockClear();
    await expect(voidOrderViaRpc("order-1", "   ")).rejects.toThrow(
      "Order void reason is required.",
    );
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("does not direct update orders", async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: { status: "voided", order_id: "order-1" },
      error: null,
    });

    await voidOrderViaRpc("order-1", "Duplicate order");

    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("throws void RPC errors for callers to handle", async () => {
    const error = Object.assign(new Error("order_void_not_authorized"), {
      code: "42501",
    });
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(voidOrderViaRpc("order-1", "Duplicate order")).rejects.toBe(error);
  });
});

describe("overrideOrderStatusViaRpc", () => {
  beforeEach(() => {
    supabaseMock.rpc.mockReset();
    supabaseMock.from.mockReset();
  });

  it("calls the guarded order status override RPC with expected args", async () => {
    const result = {
      status: "updated",
      order_id: "order-1",
      from_status: "in_review",
      to_status: "ready_for_client",
      reason: "Correcting field reality",
    };
    supabaseMock.rpc.mockResolvedValue({ data: result, error: null });

    await expect(
      overrideOrderStatusViaRpc("order-1", "ready_for_client", "Correcting field reality"),
    ).resolves.toBe(result);

    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_status_override", {
      p_order_id: "order-1",
      p_target_status: "ready_for_client",
      p_reason: "Correcting field reality",
    });
  });

  it("requires and trims the override reason before calling the RPC", async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: { status: "updated", order_id: "order-1" },
      error: null,
    });

    await expect(
      overrideOrderStatusViaRpc("order-1", "review_cleared", "  Reviewer cleared offline  "),
    ).resolves.toEqual({
      status: "updated",
      order_id: "order-1",
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_status_override", {
      p_order_id: "order-1",
      p_target_status: "review_cleared",
      p_reason: "Reviewer cleared offline",
    });

    supabaseMock.rpc.mockClear();
    await expect(overrideOrderStatusViaRpc("order-1", "review_cleared", "   ")).rejects.toThrow(
      "Order status override reason is required.",
    );
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("does not direct update orders", async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: { status: "updated", order_id: "order-1" },
      error: null,
    });

    await overrideOrderStatusViaRpc("order-1", "in_progress", "Work happened offline");

    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("throws status override RPC errors for callers to handle", async () => {
    const error = Object.assign(new Error("order_status_override_not_authorized"), {
      code: "42501",
    });
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(
      overrideOrderStatusViaRpc("order-1", "ready_for_client", "Correcting field reality"),
    ).rejects.toBe(error);
  });

  it("returns null when the status override RPC returns no result and no error", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: null, error: null });

    await expect(
      overrideOrderStatusViaRpc("order-1", "ready_for_client", "Correcting field reality"),
    ).resolves.toBeNull();
  });
});

describe("canonical workflow transition helpers", () => {
  function mockExistingOrder(status) {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "order-1", status },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    supabaseMock.from.mockReturnValue({ select });
  }

  beforeEach(() => {
    supabaseMock.rpc.mockReset();
    supabaseMock.from.mockReset();
    emitNotification.mockReset();
    fetchAdminRecipients.mockReset();
    fetchOrderRoleRecipients.mockReset();
    resolveOrderParticipants.mockReset();
    assertOrderWorkflowTransition.mockReset();
    emitNotification.mockResolvedValue(undefined);
    fetchAdminRecipients.mockResolvedValue([]);
    fetchOrderRoleRecipients.mockResolvedValue([]);
    resolveOrderParticipants.mockReturnValue({
      recipients: [],
      suppressUserIds: [],
    });
  });

  it.each([
    {
      name: "sendOrderToReview",
      fn: () => sendOrderToReview("order-1", "user-1", { note: "Ready" }),
      currentStatus: "new",
      transitionKey: "submit_to_review",
      note: "Ready",
    },
    {
      name: "sendOrderBackToAppraiser",
      fn: () => sendOrderBackToAppraiser("order-1", "user-1", { note: "Fix needed" }),
      currentStatus: "in_review",
      transitionKey: "request_revisions",
      note: "Fix needed",
    },
    {
      name: "clearReview",
      fn: () => clearReview("order-1", "Approved"),
      currentStatus: "in_review",
      transitionKey: "approve_review",
      note: "Approved",
    },
    {
      name: "requestFinalApproval",
      fn: () => requestFinalApproval("order-1", "Final check"),
      currentStatus: "review_cleared",
      transitionKey: "request_final_approval",
      note: "Final check",
    },
    {
      name: "markReadyForClient",
      fn: () => markReadyForClient("order-1", "Release"),
      currentStatus: "pending_final_approval",
      transitionKey: "ready_for_client",
      note: "Release",
    },
    {
      name: "completeOrder",
      fn: () => completeOrder("order-1", "user-1"),
      currentStatus: "ready_for_client",
      transitionKey: "complete",
      note: null,
    },
  ])("routes $name through rpc_transition_order_status with required payload fields", async ({
    fn,
    currentStatus,
    transitionKey,
    note,
  }) => {
    const transitionedOrder = {
      id: "order-1",
      status: "transitioned",
      appraiser_id: "appraiser-1",
      reviewer_id: "reviewer-1",
    };
    mockExistingOrder(currentStatus);
    supabaseMock.rpc.mockResolvedValue({ data: transitionedOrder, error: null });

    await expect(fn()).resolves.toBe(transitionedOrder);

    expect(assertOrderWorkflowTransition).toHaveBeenCalledWith({
      currentStatus,
      transitionKey,
      permissions: { loading: true },
      allowDuringPermissionFallback: true,
    });
    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_transition_order_status", {
      p_order_id: "order-1",
      p_transition_key: transitionKey,
      p_note: note,
    });
    expect(supabaseMock.from).toHaveBeenCalledWith("orders");
    expect(supabaseMock.from.mock.results[0].value).not.toHaveProperty("update");
  });

  it("emits first send-to-review notifications without resubmission metadata", async () => {
    const transitionedOrder = {
      id: "order-1",
      status: "in_review",
      appraiser_id: "appraiser-1",
      reviewer_id: "reviewer-1",
    };
    mockExistingOrder("in_progress");
    supabaseMock.rpc.mockResolvedValue({ data: transitionedOrder, error: null });
    resolveOrderParticipants.mockReturnValue({
      recipients: ["reviewer-1"],
      suppressUserIds: [],
    });
    fetchOrderRoleRecipients.mockResolvedValue([{ userId: "reviewer-1", role: "reviewer" }]);

    await expect(
      sendOrderToReview("order-1", "appraiser-1", { noteText: "Submission note:\nReady" }),
    ).resolves.toBe(transitionedOrder);

    expect(emitNotification).toHaveBeenCalledWith("order.sent_to_review", {
      recipients: [{ userId: "reviewer-1", role: "reviewer" }],
      order: transitionedOrder,
      payload: {
        note_text: "Submission note:\nReady",
      },
    });
  });

  it("emits resubmission metadata only when sending from needs revisions", async () => {
    const transitionedOrder = {
      id: "order-1",
      status: "in_review",
      appraiser_id: "appraiser-1",
      reviewer_id: "reviewer-1",
    };
    mockExistingOrder("needs_revisions");
    supabaseMock.rpc.mockResolvedValue({ data: transitionedOrder, error: null });
    resolveOrderParticipants.mockReturnValue({
      recipients: ["reviewer-1"],
      suppressUserIds: [],
    });
    fetchOrderRoleRecipients.mockResolvedValue([{ userId: "reviewer-1", role: "reviewer" }]);

    await expect(
      sendOrderToReview("order-1", "appraiser-1", { noteText: "Resubmission note:\nReady" }),
    ).resolves.toBe(transitionedOrder);

    expect(emitNotification).toHaveBeenCalledWith("order.resubmitted_to_review", {
      recipients: [{ userId: "reviewer-1", role: "reviewer" }],
      order: transitionedOrder,
      payload: {
        note_text: "Resubmission note:\nReady",
        is_resubmission: true,
        previous_status: "needs_revisions",
      },
    });
  });

  it("propagates canonical workflow RPC errors", async () => {
    const error = Object.assign(new Error("workflow transition denied"), {
      code: "42501",
    });
    mockExistingOrder("new");
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(sendOrderToReview("order-1", "user-1", { note: "Ready" })).rejects.toBe(error);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_transition_order_status", {
      p_order_id: "order-1",
      p_transition_key: "submit_to_review",
      p_note: "Ready",
    });
    expect(supabaseMock.from.mock.results[0].value).not.toHaveProperty("update");
  });
});

describe("getOrder archived readback", () => {
  beforeEach(() => {
    supabaseMock.rpc.mockReset();
    supabaseMock.from.mockReset();
  });

  it("loads archived order detail directly without applying archive exclusion", async () => {
    const archivedOrder = {
      id: "order-1",
      order_number: "2026001",
      status: "in_progress",
      is_archived: true,
    };
    const ordersRow = {
      id: "order-1",
      appraiser_fee: 510,
    };
    const single = vi.fn().mockResolvedValue({ data: archivedOrder, error: null });
    const maybeSingle = vi.fn().mockResolvedValue({ data: ordersRow, error: null });
    const viewEq = vi.fn(() => ({ single }));
    const ordersEq = vi.fn(() => ({ maybeSingle }));
    const viewSelect = vi.fn(() => ({ eq: viewEq }));
    const ordersSelect = vi.fn(() => ({ eq: ordersEq }));
    supabaseMock.from
      .mockReturnValueOnce({ select: viewSelect })
      .mockReturnValueOnce({ select: ordersSelect });

    await expect(getOrder("order-1")).resolves.toEqual({
      ...archivedOrder,
      ...ordersRow,
    });

    expect(supabaseMock.from).toHaveBeenCalledWith("v_orders_frontend_v4");
    expect(supabaseMock.from).toHaveBeenCalledWith("orders");
    expect(viewSelect.mock.calls[0][0]).toContain("is_archived");
    expect(viewSelect.mock.calls[0][0]).toContain("operations_scope");
    expect(viewEq).toHaveBeenCalledWith("id", "order-1");
    expect(ordersEq).toHaveBeenCalledWith("id", "order-1");
  });
});
