import { beforeEach, describe, expect, it, vi } from "vitest";

const builders = vi.hoisted(() => []);
const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

function createBuilder({ table, columns, options }) {
  const builder = {
    table,
    columns,
    options,
    result: options?.head
      ? { count: 0, error: null }
      : { data: [], count: 0, error: null },
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    in: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    not: vi.fn(() => builder),
    or: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    then: (resolve, reject) => Promise.resolve(builder.result).then(resolve, reject),
  };

  builders.push(builder);
  return builder;
}

vi.mock("@/lib/supabaseClient", () => ({
  default: supabaseMock,
}));

const { fetchOrdersWithFilters, listHistoricalOrders } = await import("../orders.js");

describe("fetchOrdersWithFilters archived visibility", () => {
  beforeEach(() => {
    builders.length = 0;
    supabaseMock.from.mockReset();
    supabaseMock.rpc.mockReset();
    supabaseMock.from.mockImplementation((table) => ({
      select: (columns, options) => createBuilder({ table, columns, options }),
    }));
  });

  it("excludes archived orders from active list queries by default", async () => {
    await fetchOrdersWithFilters({ scope: "orders" });

    expect(builders).toHaveLength(2);
    expect(builders[0].table).toBe("v_orders_frontend_v4");
    expect(builders[1].table).toBe("v_orders_frontend_v4");
    expect(builders[1].columns).toContain("is_archived");

    for (const builder of builders) {
      expect(builder.or).toHaveBeenCalledWith("is_archived.is.null,is_archived.eq.false");
    }
  });

  it("excludes cancelled and voided orders from active list queries by default", async () => {
    await fetchOrdersWithFilters({ scope: "orders" });

    for (const builder of builders) {
      expect(builder.not).toHaveBeenCalledWith("status", "in", "(cancelled,voided)");
    }
  });

  it("can opt into archived rows for future archived readback surfaces", async () => {
    await fetchOrdersWithFilters({ scope: "orders", includeArchived: true });

    for (const builder of builders) {
      expect(builder.or).not.toHaveBeenCalledWith("is_archived.is.null,is_archived.eq.false");
    }
  });

  it("can opt into retired lifecycle rows for future history surfaces", async () => {
    await fetchOrdersWithFilters({ scope: "orders", includeRetiredLifecycle: true });

    for (const builder of builders) {
      expect(builder.not).not.toHaveBeenCalledWith("status", "in", "(cancelled,voided)");
    }
  });

  it("lists historical orders through an explicit read-only helper", async () => {
    await listHistoricalOrders({ page: 0, pageSize: 25 });

    expect(builders).toHaveLength(2);
    expect(builders[0].table).toBe("v_orders_frontend_v4");
    expect(builders[1].table).toBe("v_orders_frontend_v4");

    for (const builder of builders) {
      expect(builder.or).not.toHaveBeenCalledWith("is_archived.is.null,is_archived.eq.false");
      expect(builder.not).not.toHaveBeenCalledWith("status", "in", "(cancelled,voided)");
    }
  });

  it("keeps active/default list behavior unchanged after adding historical helper", async () => {
    await fetchOrdersWithFilters({ scope: "orders" });

    for (const builder of builders) {
      expect(builder.or).toHaveBeenCalledWith("is_archived.is.null,is_archived.eq.false");
      expect(builder.not).toHaveBeenCalledWith("status", "in", "(cancelled,voided)");
      expect(builder.lt).not.toHaveBeenCalledWith("final_due_date", expect.any(String));
    }
  });

  it("does not call mutation RPCs while listing historical orders", async () => {
    await listHistoricalOrders({ search: "2026" });

    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("filters active orders to overdue final due dates only when requested", async () => {
    await fetchOrdersWithFilters({ scope: "orders", dueWindow: "overdue" });

    for (const builder of builders) {
      expect(builder.lt).toHaveBeenCalledWith("final_due_date", expect.any(String));
      expect(builder.not).toHaveBeenCalledWith("final_due_date", "is", null);
      expect(builder.or).toHaveBeenCalledWith("is_archived.is.null,is_archived.eq.false");
      expect(builder.not).toHaveBeenCalledWith("status", "in", "(cancelled,voided)");
    }
  });

  it("filters active orders by reviewer id while preserving active-list exclusions", async () => {
    await fetchOrdersWithFilters({ scope: "orders", reviewerId: "reviewer-1" });

    for (const builder of builders) {
      expect(builder.eq).toHaveBeenCalledWith("reviewer_id", "reviewer-1");
      expect(builder.or).toHaveBeenCalledWith("is_archived.is.null,is_archived.eq.false");
      expect(builder.not).toHaveBeenCalledWith("status", "in", "(cancelled,voided)");
    }
  });

  it("filters order list queries by explicit operations scope when provided", async () => {
    await fetchOrdersWithFilters({
      scope: "orders",
      operationsScope: "amc_operations",
    });

    for (const builder of builders) {
      expect(builder.eq).toHaveBeenCalledWith("operations_scope", "amc_operations");
      expect(builder.or).toHaveBeenCalledWith("is_archived.is.null,is_archived.eq.false");
      expect(builder.not).toHaveBeenCalledWith("status", "in", "(cancelled,voided)");
    }
  });

  it("filters My Work orders by appraiser or reviewer assignment", async () => {
    await fetchOrdersWithFilters({ scope: "orders", assignedToMeUserId: "user-1" });

    for (const builder of builders) {
      expect(builder.or).toHaveBeenCalledWith("appraiser_id.eq.user-1,reviewer_id.eq.user-1");
      expect(builder.or).toHaveBeenCalledWith("is_archived.is.null,is_archived.eq.false");
      expect(builder.not).toHaveBeenCalledWith("status", "in", "(cancelled,voided)");
    }
  });

  it("keeps reviewer queue queries aligned with reviewer-visible active review statuses", async () => {
    await fetchOrdersWithFilters({ scope: "dashboard", mode: "reviewerQueue", reviewerId: "reviewer-1" });

    for (const builder of builders) {
      expect(builder.eq).toHaveBeenCalledWith("reviewer_id", "reviewer-1");
      expect(builder.in).toHaveBeenCalledWith("status", [
        "in_review",
        "needs_revisions",
        "review_cleared",
      ]);
    }
  });

  it("keeps retired lifecycle rows excluded from overdue filters by default", async () => {
    await fetchOrdersWithFilters({ scope: "orders", dueWindow: "overdue" });

    for (const builder of builders) {
      expect(builder.not).toHaveBeenCalledWith("status", "in", "(cancelled,voided)");
    }
  });
});
