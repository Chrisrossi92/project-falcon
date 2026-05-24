import { beforeEach, describe, expect, it, vi } from "vitest";

const orderMock = vi.hoisted(() => vi.fn());
const gtMock = vi.hoisted(() => vi.fn());
const isMock = vi.hoisted(() => vi.fn());
const eqMock = vi.hoisted(() => vi.fn());
const selectMock = vi.hoisted(() => vi.fn());
const fromMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabaseClient", () => ({
  default: {
    from: fromMock,
  },
}));

const { listActiveOrderOperationalInputs } = await import("../orderOperationalInputsApi");

describe("listActiveOrderOperationalInputs", () => {
  beforeEach(() => {
    orderMock.mockReset();
    gtMock.mockReset();
    isMock.mockReset();
    eqMock.mockReset();
    selectMock.mockReset();
    fromMock.mockReset();

    fromMock.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ is: isMock });
    isMock.mockReturnValue({ gt: gtMock });
    gtMock.mockReturnValue({ order: orderMock });
  });

  it("reads active fresh operational inputs through RLS-backed table access", async () => {
    orderMock.mockResolvedValue({
      data: [
        {
          id: "input-1",
          order_id: "order-1",
          input_type: "waiting_on_client",
          cleared_at: null,
        },
      ],
      error: null,
    });

    const rows = await listActiveOrderOperationalInputs("order-1", {
      now: new Date("2026-05-24T12:00:00.000Z"),
    });

    expect(fromMock).toHaveBeenCalledWith("order_operational_inputs");
    expect(selectMock.mock.calls[0][0]).toContain("input_type");
    expect(eqMock).toHaveBeenCalledWith("order_id", "order-1");
    expect(isMock).toHaveBeenCalledWith("cleared_at", null);
    expect(gtMock).toHaveBeenCalledWith("expires_at", "2026-05-24T12:00:00.000Z");
    expect(orderMock).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(rows).toHaveLength(1);
  });

  it("returns an empty list without querying when order id is missing", async () => {
    await expect(listActiveOrderOperationalInputs(null)).resolves.toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });
});
