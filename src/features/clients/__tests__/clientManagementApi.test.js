import { describe, expect, it, vi, beforeEach } from "vitest";

const fetchOrdersWithFiltersMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/orders", () => ({
  fetchOrdersWithFilters: fetchOrdersWithFiltersMock,
  listHistoricalOrders: fetchOrdersWithFiltersMock,
}));

vi.mock("@/lib/supabaseClient", () => ({
  default: {
    rpc: vi.fn(),
  },
}));

import supabase from "@/lib/supabaseClient";
import {
  createClientManagementClient,
  getClientManagementDetail,
  listAssignedOrderClients,
  listClientManagementClients,
  updateClientManagementClient,
} from "../clientManagementApi";

describe("clientManagementApi management clients", () => {
  beforeEach(() => {
    supabase.rpc.mockReset();
  });

  it("normalizes AMC umbrella metrics without rolling them into lender rows", async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        {
          client_id: 10,
          client_name: "MountainSeed",
          status: "active",
          category: "amc",
          amc_id: null,
          amc_name: null,
          contact_mode: "no_specific_contact",
          portal_url: "https://mountainseed.example.com",
          portal_notes: "Portal intake only.",
          order_count: 3,
          active_order_count: 2,
          completed_order_count: 1,
          direct_order_count: 0,
          managed_order_count: 3,
          avg_fee: 525,
          last_order_date: "2026-05-20T12:00:00.000Z",
        },
        {
          client_id: 20,
          client_name: "Bank A",
          status: "active",
          category: "lender",
          amc_id: 10,
          amc_name: "MountainSeed",
          order_count: 1,
          active_order_count: 1,
          completed_order_count: 0,
          direct_order_count: 1,
          managed_order_count: 0,
          avg_fee: 500,
          last_order_date: "2026-05-18T12:00:00.000Z",
        },
      ],
      error: null,
    });

    const rows = await listClientManagementClients();

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_client_management_list", {
      p_search: "",
      p_category: "all",
      p_sort: "orders_desc",
      p_operations_scope: null,
    });
    expect(rows).toEqual([
      expect.objectContaining({
        id: 10,
        name: "MountainSeed",
        category: "amc",
        contact_mode: "no_specific_contact",
        portal_url: "https://mountainseed.example.com",
        portal_notes: "Portal intake only.",
        total_orders: 3,
        active_orders: 2,
        completed_orders: 1,
        direct_order_count: 0,
        managed_order_count: 3,
      }),
      expect.objectContaining({
        id: 20,
        name: "Bank A",
        category: "lender",
        amc_id: 10,
        amc_name: "MountainSeed",
        total_orders: 1,
        direct_order_count: 1,
        managed_order_count: 0,
      }),
    ]);
  });

  it("normalizes client detail rollup fields from the management RPC", async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        client_id: 10,
        client_name: "MountainSeed",
        status: "active",
        category: "amc",
        contact_mode: "no_specific_contact",
        portal_url: "https://mountainseed.example.com",
        portal_notes: "Portal intake only.",
        order_count: 3,
        active_order_count: 2,
        completed_order_count: 1,
        direct_order_count: 0,
        managed_order_count: 3,
        avg_fee: 525,
        last_order_date: "2026-05-20T12:00:00.000Z",
      },
      error: null,
    });

    await expect(getClientManagementDetail(10)).resolves.toEqual(
      expect.objectContaining({
        id: 10,
        name: "MountainSeed",
        category: "amc",
        contact_mode: "no_specific_contact",
        portal_url: "https://mountainseed.example.com",
        portal_notes: "Portal intake only.",
        total_orders: 3,
        active_order_count: 2,
        completed_order_count: 1,
        direct_order_count: 0,
        managed_order_count: 3,
      }),
    );
    expect(supabase.rpc).toHaveBeenCalledWith("rpc_client_management_detail", {
      p_client_id: 10,
      p_operations_scope: null,
    });
  });

  it("passes active operation scope through client list and detail reads", async () => {
    supabase.rpc.mockResolvedValue({ data: [], error: null });

    await listClientManagementClients({ operationsScope: "amc_operations" });
    expect(supabase.rpc).toHaveBeenLastCalledWith("rpc_client_management_list", {
      p_search: "",
      p_category: "all",
      p_sort: "orders_desc",
      p_operations_scope: "amc_operations",
    });

    supabase.rpc.mockResolvedValue({
      data: { client_id: 10, client_name: "First Buckeye Bank" },
      error: null,
    });
    await getClientManagementDetail(10, { operationsScope: "internal_operations" });
    expect(supabase.rpc).toHaveBeenLastCalledWith("rpc_client_management_detail", {
      p_client_id: 10,
      p_operations_scope: "internal_operations",
    });
  });

  it("passes and normalizes contact optionality through create/update RPC helpers", async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        client_id: 20,
        client_name: "Portal Lender",
        status: "active",
        category: "lender",
        contactMode: "no_specific_contact",
        portal_url: "https://portal.example.com",
        portal_notes: "Use intake dashboard.",
      },
      error: null,
    });

    await expect(
      createClientManagementClient({
        name: "Portal Lender",
        category: "lender",
        contact_mode: "no_specific_contact",
        portal_url: "https://portal.example.com",
        portal_notes: "Use intake dashboard.",
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 20,
        name: "Portal Lender",
        contact_mode: "no_specific_contact",
        contactMode: "no_specific_contact",
        portal_url: "https://portal.example.com",
        portal_notes: "Use intake dashboard.",
      }),
    );
    expect(supabase.rpc).toHaveBeenLastCalledWith("rpc_client_management_create", {
      p_client: {
        name: "Portal Lender",
        category: "lender",
        contact_mode: "no_specific_contact",
        portal_url: "https://portal.example.com",
        portal_notes: "Use intake dashboard.",
      },
    });

    await updateClientManagementClient(20, {
      contactMode: "contacts",
      portal_url: null,
      portal_notes: null,
    });
    expect(supabase.rpc).toHaveBeenLastCalledWith("rpc_client_management_update", {
      p_client_id: 20,
      p_patch: { contact_mode: "contacts", portal_url: null, portal_notes: null },
    });
  });

  it("maps camelCase contactMode to RPC contact_mode on writes", async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        client_id: 22,
        client_name: "Portal AMC",
        status: "active",
        category: "amc",
        contact_mode: "no_specific_contact",
      },
      error: null,
    });

    await createClientManagementClient({
      name: "Portal AMC",
      contactMode: "no_specific_contact",
    });
    expect(supabase.rpc).toHaveBeenLastCalledWith("rpc_client_management_create", {
      p_client: {
        name: "Portal AMC",
        contact_mode: "no_specific_contact",
      },
    });

    await updateClientManagementClient(22, { contactMode: "contacts" });
    expect(supabase.rpc).toHaveBeenLastCalledWith("rpc_client_management_update", {
      p_client_id: 22,
      p_patch: { contact_mode: "contacts" },
    });
  });
});

describe("clientManagementApi assigned order clients", () => {
  beforeEach(() => {
    fetchOrdersWithFiltersMock.mockReset();
    supabase.rpc.mockReset();
  });

  it("groups appraiser-visible current and historical assigned orders by client", async () => {
    fetchOrdersWithFiltersMock.mockResolvedValue({
      rows: [
        {
          id: "order-1",
          client_id: "client-acme-capital",
          client_name: "Acme Capital",
          status: "completed",
          appraiser_fee: 500,
          created_at: "2026-04-10T12:00:00.000Z",
        },
        {
          id: "order-2",
          client_id: "client-acme-appraisal",
          client_name: "ACME Appraisal",
          status: "in_progress",
          appraiser_fee: 625,
          created_at: "2026-05-20T12:00:00.000Z",
        },
        {
          id: "order-3",
          client_id: "client-acme-capital",
          client_name: "Acme Capital",
          status: "cancelled",
          base_fee: 700,
          created_at: "2026-05-01T12:00:00.000Z",
        },
      ],
      error: null,
    });

    const rows = await listAssignedOrderClients({
      appraiserId: "chris-user",
      sort: "name_asc",
    });

    expect(fetchOrdersWithFiltersMock).toHaveBeenCalledWith({
      appraiserId: "chris-user",
      orderBy: "created_at",
      ascending: false,
      page: 0,
      pageSize: 1000,
      scope: "orders",
      operationsScope: null,
    });
    expect(rows).toEqual([
      expect.objectContaining({
        id: "client-acme-appraisal",
        name: "ACME Appraisal",
        total_orders: 1,
        avg_fee: 625,
        status: "active",
      }),
      expect.objectContaining({
        id: "client-acme-capital",
        name: "Acme Capital",
        total_orders: 2,
        avg_fee: 600,
        status: "inactive",
      }),
    ]);
  });

  it("returns no appraiser clients without an appraiser id", async () => {
    await expect(listAssignedOrderClients()).resolves.toEqual([]);
    expect(fetchOrdersWithFiltersMock).not.toHaveBeenCalled();
  });
});
