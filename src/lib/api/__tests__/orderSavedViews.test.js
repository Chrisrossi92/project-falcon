import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  default: supabaseMock,
}));

const {
  createOrderSavedView,
  deleteOrderSavedView,
  listOrderSavedViews,
  updateOrderSavedView,
} = await import("../orderSavedViews.js");

describe("orderSavedViews API wrappers", () => {
  beforeEach(() => {
    supabaseMock.rpc.mockReset();
    supabaseMock.from.mockReset();
  });

  it("lists saved views through the backend RPC only", async () => {
    const views = [{ id: "view-1", name: "Review queue", filters: { status: "in_review" } }];
    supabaseMock.rpc.mockResolvedValue({ data: views, error: null });

    await expect(listOrderSavedViews()).resolves.toBe(views);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_saved_views_list");
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("creates saved views through the backend RPC with name and filters", async () => {
    const created = { id: "view-1", name: "Review queue", filters: { status: "in_review" } };
    supabaseMock.rpc.mockResolvedValue({ data: created, error: null });

    await expect(createOrderSavedView("Review queue", { status: "in_review" })).resolves.toBe(created);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_saved_view_create", {
      p_name: "Review queue",
      p_filters: { status: "in_review" },
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("updates saved views through the backend RPC with id, name, and filters", async () => {
    const updated = { id: "view-1", name: "Needs revisions", filters: { status: "needs_revisions" } };
    supabaseMock.rpc.mockResolvedValue({ data: updated, error: null });

    await expect(
      updateOrderSavedView("view-1", "Needs revisions", { status: "needs_revisions" }),
    ).resolves.toBe(updated);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_saved_view_update", {
      p_view_id: "view-1",
      p_name: "Needs revisions",
      p_filters: { status: "needs_revisions" },
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("deletes saved views through the backend RPC with id only", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: true, error: null });

    await expect(deleteOrderSavedView("view-1")).resolves.toBe(true);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_saved_view_delete", {
      p_view_id: "view-1",
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("propagates RPC errors for callers to handle", async () => {
    const error = Object.assign(new Error("current_company_membership_required"), { code: "42501" });
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(createOrderSavedView("Denied", { status: "in_review" })).rejects.toBe(error);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it.each([
    ["createOrderSavedView", () => createOrderSavedView("Bad", null)],
    ["createOrderSavedView array", () => createOrderSavedView("Bad", [])],
    ["updateOrderSavedView", () => updateOrderSavedView("view-1", "Bad", "status=in_review")],
  ])("rejects non-object filter payloads before calling %s", async (_name, action) => {
    await expect(action()).rejects.toThrow("Saved view filters must be an object.");

    expect(supabaseMock.rpc).not.toHaveBeenCalled();
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("does not expose direct order_saved_views table access", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: [], error: null });

    await listOrderSavedViews();

    expect(supabaseMock.from).not.toHaveBeenCalledWith("order_saved_views");
  });
});
