import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  default: supabaseMock,
}));

const {
  listOrderFormClientOptions,
  searchOrderFormClientsByName,
} = await import("../orderClientOptionsApi.js");

describe("orderClientOptionsApi", () => {
  beforeEach(() => {
    supabaseMock.rpc.mockReset();
  });

  it("lists order form client options without scope by default", async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: [
        {
          client_id: 10,
          client_name: "Internal Bank",
          category: "client",
          operations_scope: "internal_operations",
        },
      ],
      error: null,
    });

    await expect(listOrderFormClientOptions()).resolves.toEqual([
      expect.objectContaining({
        id: 10,
        name: "Internal Bank",
        operations_scope: "internal_operations",
      }),
    ]);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_form_client_options");
  });

  it("passes explicit operations scope when listing order form client options", async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: [
        {
          client_id: 11,
          client_name: "AMC Bank",
          category: "client",
          operations_scope: "amc_operations",
        },
      ],
      error: null,
    });

    await expect(
      listOrderFormClientOptions({ operationsScope: "amc_operations" }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 11,
        name: "AMC Bank",
        operations_scope: "amc_operations",
      }),
    ]);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_form_client_options", {
      p_operations_scope: "amc_operations",
    });
  });

  it("preserves legacy duplicate search limit argument shape", async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: [{ client_id: 12, client_name: "Legacy Search", status: "active" }],
      error: null,
    });

    await searchOrderFormClientsByName("Legacy", 10);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_form_client_name_search", {
      p_search: "Legacy",
      p_limit: 10,
    });
  });

  it("passes explicit operations scope during duplicate search", async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: [
        {
          client_id: 13,
          client_name: "AMC Search",
          status: "active",
          operations_scope: "amc_operations",
        },
      ],
      error: null,
    });

    await expect(
      searchOrderFormClientsByName("AMC", {
        limit: 8,
        operationsScope: "amc_operations",
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 13,
        name: "AMC Search",
        operations_scope: "amc_operations",
      }),
    ]);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_form_client_name_search", {
      p_search: "AMC",
      p_limit: 8,
      p_operations_scope: "amc_operations",
    });
  });
});
