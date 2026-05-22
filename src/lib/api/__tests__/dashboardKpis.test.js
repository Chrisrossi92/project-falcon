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
    then: (resolve, reject) => Promise.resolve(builder.result).then(resolve, reject),
  };

  builders.push(builder);
  builder.result = { count: builders.length, error: null };
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

    expect(builders).toHaveLength(8);
    expect(builders.every((builder) => builder.table === "v_orders_active_frontend_v4")).toBe(true);
    expect(builders.every((builder) => builder.options?.head === true)).toBe(true);
    expect(result).toEqual({
      total_active: 1,
      in_progress: 2,
      due_in_7: 3,
      inspected_awaiting_report: 4,
      due_to_client_2: 5,
      in_review: 6,
      needs_revisions: 7,
      overdue: 8,
    });
  });

  it("derives the initial dashboard card counts without mutation calls", async () => {
    await fetchDashboardKpis({ appraiserId: "appraiser-1", statusIn: ["new", "in_progress"] });

    expect(builders[0].eq).toHaveBeenCalledWith("appraiser_id", "appraiser-1");
    expect(builders[0].in).toHaveBeenCalledWith("status", ["new", "in_progress"]);
    expect(builders[5].eq).toHaveBeenCalledWith("status", "in_review");
    expect(builders[6].eq).toHaveBeenCalledWith("status", "needs_revisions");
    expect(builders[7].lt).toHaveBeenCalledWith("final_due_date", expect.any(String));
    expect(builders[7].not).toHaveBeenCalledWith("final_due_date", "is", null);
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });
});
