import { beforeEach, describe, expect, it, vi } from "vitest";

const orderMock = vi.hoisted(() => vi.fn());
const gtMock = vi.hoisted(() => vi.fn());
const isMock = vi.hoisted(() => vi.fn());
const eqMock = vi.hoisted(() => vi.fn());
const selectMock = vi.hoisted(() => vi.fn());
const fromMock = vi.hoisted(() => vi.fn());
const rpcMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabaseClient", () => ({
  default: {
    from: fromMock,
    rpc: rpcMock,
  },
}));

const {
  clearOrderOperationalInput,
  createOrderOperationalInput,
  listActiveOrderOperationalInputs,
} = await import("../orderOperationalInputsApi");

describe("listActiveOrderOperationalInputs", () => {
  beforeEach(() => {
    orderMock.mockReset();
    gtMock.mockReset();
    isMock.mockReset();
    eqMock.mockReset();
    selectMock.mockReset();
    fromMock.mockReset();
    rpcMock.mockReset();

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

  it("creates operational input evidence through the controlled RPC only", async () => {
    rpcMock.mockResolvedValue({
      data: { id: "input-1", input_type: "report_on_track" },
      error: null,
    });

    const row = await createOrderOperationalInput("order-1", "report_on_track");

    expect(rpcMock).toHaveBeenCalledWith("rpc_order_operational_input_create", {
      p_order_id: "order-1",
      p_input_type: "report_on_track",
      p_note: null,
      p_payload: {},
      p_source: "manual",
    });
    expect(fromMock).not.toHaveBeenCalled();
    expect(row).toEqual({ id: "input-1", input_type: "report_on_track" });
  });

  it("clears operational input evidence through the controlled RPC only", async () => {
    rpcMock.mockResolvedValue({
      data: { id: "input-1", input_type: "waiting_on_client", cleared_at: "2026-05-24T12:00:00Z" },
      error: null,
    });

    const row = await clearOrderOperationalInput("input-1");

    expect(rpcMock).toHaveBeenCalledWith("rpc_order_operational_input_clear", {
      p_input_id: "input-1",
      p_note: null,
    });
    expect(fromMock).not.toHaveBeenCalled();
    expect(row?.cleared_at).toBe("2026-05-24T12:00:00Z");
  });
});
