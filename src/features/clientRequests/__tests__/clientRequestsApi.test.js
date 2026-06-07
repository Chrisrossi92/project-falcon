import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseClient", () => ({
  default: {
    rpc: vi.fn(),
  },
}));

const supabase = (await import("@/lib/supabaseClient")).default;
const {
  clientRequestReviewRpcNames,
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
