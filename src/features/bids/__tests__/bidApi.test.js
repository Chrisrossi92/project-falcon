import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  default: supabaseMock,
}));

const {
  createOrderVendorBidRequest,
  listOrderVendorBidRequests,
  recordOrderVendorBidResponse,
  selectOrderVendorBidResponse,
} = await import("../api.js");

describe("bid request API wrappers", () => {
  beforeEach(() => {
    supabaseMock.rpc.mockReset();
    supabaseMock.from.mockReset();
  });

  it("creates vendor bid requests through the backend RPC with mapped payload fields", async () => {
    const result = {
      bid_request_id: "bid-request-1",
      status: "sent",
      recipient_count: 2,
    };
    const recipients = [
      {
        vendor_profile_id: "profile-1",
        vendor_company_id: "company-1",
        relationship_id: "relationship-1",
        candidate_snapshot: {},
      },
      {
        vendor_profile_id: "profile-2",
        vendor_company_id: "company-2",
        relationship_id: "relationship-2",
        candidate_snapshot: {},
      },
    ];
    supabaseMock.rpc.mockResolvedValue({ data: result, error: null });

    await expect(
      createOrderVendorBidRequest({
        orderId: "order-1",
        recipients,
        message: "Please provide fee and turn time.",
        responseDueAt: "2026-06-03T20:00:00.000Z",
        clientDueAt: "2026-06-10T20:00:00.000Z",
        desiredVendorDueAt: "2026-06-08T20:00:00.000Z",
        metadata: { source: "candidate_panel" },
      }),
    ).resolves.toEqual(result);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_vendor_bid_request_create", {
      p_order_id: "order-1",
      p_payload: {
        recipients,
        request_message: "Please provide fee and turn time.",
        response_due_at: "2026-06-03T20:00:00.000Z",
        client_due_at: "2026-06-10T20:00:00.000Z",
        desired_vendor_due_at: "2026-06-08T20:00:00.000Z",
        candidate_snapshot: {},
        metadata: { source: "candidate_panel" },
      },
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("normalizes camelCase recipient ids to the RPC snake_case payload", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: { bid_request_id: "bid-request-1" }, error: null });

    await createOrderVendorBidRequest({
      orderId: "order-1",
      recipients: [
        {
          vendorProfileId: "profile-1",
          vendorCompanyId: "company-1",
          relationshipId: "relationship-1",
          candidateSnapshot: { vendor_profile_id: "profile-1" },
        },
      ],
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_vendor_bid_request_create", {
      p_order_id: "order-1",
      p_payload: expect.objectContaining({
        recipients: [
          {
            vendor_profile_id: "profile-1",
            vendor_company_id: "company-1",
            relationship_id: "relationship-1",
            candidate_snapshot: { vendor_profile_id: "profile-1" },
          },
        ],
      }),
    });
  });

  it("uses safe empty create payload defaults", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: { bid_request_id: "bid-request-1" }, error: null });

    await createOrderVendorBidRequest({ orderId: "order-1" });

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_vendor_bid_request_create", {
      p_order_id: "order-1",
      p_payload: {
        recipients: [],
        request_message: null,
        response_due_at: null,
        client_due_at: null,
        desired_vendor_due_at: null,
        candidate_snapshot: {},
        metadata: {},
      },
    });
  });

  it("lists vendor bid requests through the backend RPC", async () => {
    const rows = [
      {
        bid_request_id: "bid-request-1",
        status: "sent",
        recipients: [{ recipient_id: "recipient-1", status: "responded" }],
      },
    ];
    supabaseMock.rpc.mockResolvedValue({ data: rows, error: null });

    await expect(listOrderVendorBidRequests("order-1")).resolves.toEqual(rows);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_vendor_bid_requests_for_order", {
      p_order_id: "order-1",
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("returns an empty bid request list for non-array RPC payloads", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: null, error: null });

    await expect(listOrderVendorBidRequests("order-1")).resolves.toEqual([]);
  });

  it("records vendor bid responses through the backend RPC", async () => {
    const payload = {
      fee_amount: 1450,
      currency: "USD",
      proposed_due_at: "2026-06-08T20:00:00.000Z",
      turn_time_days: 5,
      comments: "Available next week.",
    };
    const result = {
      response_id: "response-1",
      recipient_status: "responded",
      request_status: "partially_responded",
    };
    supabaseMock.rpc.mockResolvedValue({ data: result, error: null });

    await expect(recordOrderVendorBidResponse("recipient-1", payload)).resolves.toEqual(result);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_vendor_bid_response_record", {
      p_recipient_id: "recipient-1",
      p_payload: payload,
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("selects vendor bid responses through the backend RPC", async () => {
    const result = {
      selected_response_id: "response-1",
      request_status: "closed",
    };
    supabaseMock.rpc.mockResolvedValue({ data: result, error: null });

    await expect(selectOrderVendorBidResponse("response-1")).resolves.toEqual(result);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_vendor_bid_response_select", {
      p_response_id: "response-1",
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("surfaces RPC errors for callers to handle", async () => {
    const error = Object.assign(new Error("bid request denied"), { code: "42501" });
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(listOrderVendorBidRequests("order-1")).rejects.toBe(error);
  });

  it("does not call assignment offer RPCs or table APIs", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: "response-1", error: null });

    await selectOrderVendorBidResponse("response-1");

    expect(supabaseMock.rpc).not.toHaveBeenCalledWith(
      "rpc_order_company_assignment_offer",
      expect.anything(),
    );
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });
});
