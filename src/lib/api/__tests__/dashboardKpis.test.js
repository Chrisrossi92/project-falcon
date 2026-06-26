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
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    in: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    not: vi.fn(() => builder),
    range: vi.fn(() => builder),
    then: (resolve, reject) => Promise.resolve(builder.result).then(resolve, reject),
  };

  builders.push(builder);
  builder.result = {
    data: [
      { id: "order-1", status: "in_progress", final_due_date: "2099-01-02T00:00:00.000Z" },
      { id: "order-2", status: "in_review", final_due_date: "2000-01-02T00:00:00.000Z" },
      {
        id: "order-3",
        status: "needs_revisions",
        final_due_date: "2099-01-03T00:00:00.000Z",
        site_visit_date: "2000-01-01T00:00:00.000Z",
      },
    ],
    count: 3,
    error: null,
  };
  return builder;
}

vi.mock("@/lib/supabaseClient", () => ({
  default: supabaseMock,
}));

const { fetchDashboardKpis } = await import("../dashboardKpis.js");

describe("fetchDashboardKpis", () => {
  beforeEach(() => {
    builders.length = 0;
    supabaseMock.from.mockReset();
    supabaseMock.rpc.mockReset();
    supabaseMock.from.mockImplementation((table) => ({
      select: (columns, options) => createBuilder({ table, columns, options }),
    }));
  });

  it("uses the active order view for governed operational KPI counts", async () => {
    const result = await fetchDashboardKpis();

    expect(builders).toHaveLength(1);
    expect(builders.every((builder) => builder.table === "v_orders_frontend_v4")).toBe(true);
    expect(builders[0].options).toEqual({ count: "exact" });
    expect(builders[0].options?.head).toBeUndefined();
    expect(builders[0].range).toHaveBeenCalledWith(0, 1999);
    expect(builders[0].in).toHaveBeenCalledWith("status", [
      "new",
      "in_progress",
      "in_review",
      "needs_revisions",
      "review_cleared",
      "pending_final_approval",
      "ready_for_client",
    ]);
    expect(result).toEqual({
      total_active: 3,
      in_progress: 1,
      due_in_7: 0,
      inspected_awaiting_report: 1,
      due_to_client_2: 0,
      in_review: 1,
      needs_revisions: 1,
      overdue: 1,
    });
  });

  it("derives the initial dashboard card counts without mutation calls", async () => {
    await fetchDashboardKpis({ appraiserId: "appraiser-1", statusIn: ["new", "in_progress"] });

    expect(builders[0].eq).toHaveBeenCalledWith("appraiser_id", "appraiser-1");
    expect(builders[0].in).toHaveBeenCalledWith("status", ["new", "in_progress"]);
    expect(builders[0].eq).not.toHaveBeenCalledWith("reviewer_id", expect.anything());
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("filters dashboard KPI counts by explicit operations scope", async () => {
    await fetchDashboardKpis({ operationsScope: "amc_operations" });

    for (const builder of builders) {
      expect(builder.eq).toHaveBeenCalledWith("operations_scope", "amc_operations");
    }
  });

  it("preserves explicit role status filters instead of broad active defaults", async () => {
    await fetchDashboardKpis({ appraiserId: "appraiser-1", statusIn: ["new", "in_progress"] });

    expect(builders[0].in).toHaveBeenCalledWith("status", ["new", "in_progress"]);
  });
});
