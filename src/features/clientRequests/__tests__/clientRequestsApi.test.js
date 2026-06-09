import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseClient", () => ({
  default: {
    rpc: vi.fn(),
  },
}));

const supabase = (await import("@/lib/supabaseClient")).default;
const {
  clientRequestReviewRpcNames,
  convertClientOrderRequestToOrder,
  getClientOrderRequestReviewDetail,
  listClientOrderRequestsForReview,
  updateClientOrderRequestReviewStatus,
} = await import("../api");

describe("clientRequestsApi", () => {
  beforeEach(() => {
    supabase.rpc.mockReset();
  });

  it("lists client order requests through the staff review RPC", async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        {
          request_key: "request-key-1",
          status: "submitted",
          client_name: "Acme Lending",
          property_address: "200 Oak St",
          property_city: "Toledo",
          property_state: "OH",
          property_postal_code: "43604",
          property_county: "Lucas",
          property_type: "Condo",
          report_type: "Full appraisal",
          requested_due_date: "2026-06-20",
          vendor_company_id: "hidden",
        },
      ],
      error: null,
    });

    await expect(listClientOrderRequestsForReview()).resolves.toEqual([
      expect.objectContaining({
        requestKey: "request-key-1",
        status: "submitted",
        clientName: "Acme Lending",
        propertyAddress: "200 Oak St",
        propertyCity: "Toledo",
        propertyState: "OH",
        propertyPostalCode: "43604",
        propertyCounty: "Lucas",
      }),
    ]);

    expect(supabase.rpc).toHaveBeenCalledWith(clientRequestReviewRpcNames.list);
  });

  it("loads request detail by opaque request key", async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        request_key: "request-key-1",
        status: "under_review",
        client_name: "Acme Lending",
        property_address: "200 Oak St",
        property_city: "Toledo",
        property_state: "OH",
        property_postal_code: "43604",
        property_county: "Lucas",
        notes: "Gate code available.",
      },
      error: null,
    });

    await getClientOrderRequestReviewDetail("request-key-1");

    expect(supabase.rpc).toHaveBeenCalledWith(clientRequestReviewRpcNames.detail, {
      p_request_key: "request-key-1",
    });
  });

  it("updates request status through the manage RPC", async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        request_key: "request-key-1",
        status: "declined",
        reviewed_at: "2026-06-07T14:00:00Z",
        reviewed_by_name: "Coordinator",
      },
      error: null,
    });

    await expect(updateClientOrderRequestReviewStatus("request-key-1", "declined")).resolves.toEqual(
      expect.objectContaining({
        requestKey: "request-key-1",
        status: "declined",
        reviewedAt: "2026-06-07T14:00:00Z",
        reviewedByName: "Coordinator",
      }),
    );

    expect(supabase.rpc).toHaveBeenCalledWith(clientRequestReviewRpcNames.updateStatus, {
      p_request_key: "request-key-1",
      p_status: "declined",
    });
  });

  it("converts a request through the dedicated conversion RPC", async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        request_key: "request-key-1",
        status: "accepted",
        order_id: "order-1",
        order_number: "26-0001",
        property_address: "200 Oak St",
        client_name: "Acme Lending",
      },
      error: null,
    });

    await expect(convertClientOrderRequestToOrder("request-key-1")).resolves.toEqual({
      requestKey: "request-key-1",
      status: "accepted",
      orderId: "order-1",
      orderNumber: "26-0001",
      propertyAddress: "200 Oak St",
      clientName: "Acme Lending",
    });

    expect(supabase.rpc).toHaveBeenCalledWith(clientRequestReviewRpcNames.convert, {
      p_request_key: "request-key-1",
    });
  });

  it("normalizes converted order linkage from review detail", async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        request_key: "request-key-1",
        status: "accepted",
        accepted_order_id: "order-1",
        accepted_order_number: "26-0001",
      },
      error: null,
    });

    await expect(getClientOrderRequestReviewDetail("request-key-1")).resolves.toEqual(
      expect.objectContaining({
        requestKey: "request-key-1",
        status: "accepted",
        acceptedOrderId: "order-1",
        acceptedOrderNumber: "26-0001",
      }),
    );
  });

  it("does not preserve operational assignment vendor or fee fields from RPC payloads", async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        {
          request_key: "request-key-1",
          property_address: "200 Oak St",
          appraiser_id: "hidden",
          vendor_company_id: "hidden",
          bid_request_id: "hidden",
          fee_amount: 999,
        },
      ],
      error: null,
    });

    const rows = await listClientOrderRequestsForReview();

    expect(JSON.stringify(rows)).not.toMatch(/appraiser_id|vendor_company_id|bid_request_id|fee_amount/i);
  });
});
