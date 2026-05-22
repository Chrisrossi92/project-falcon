import { beforeEach, describe, expect, it, vi } from "vitest";

const builders = vi.hoisted(() => []);
const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
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

const { fetchOrdersWithFilters } = await import("../orders.js");

describe("fetchOrdersWithFilters archived visibility", () => {
  beforeEach(() => {
    builders.length = 0;
    supabaseMock.from.mockReset();
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
});
