import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  default: supabaseMock,
}));

const {
  convertSelectedBidToAssignmentOffer,
  createOrderVendorBidInvitation,
  createOrderVendorBidRequest,
  fetchAmcOrderProcurementSummaries,
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

  it("exports AMC order procurement summary wrapper", () => {
    expect(fetchAmcOrderProcurementSummaries).toEqual(expect.any(Function));
  });

  it("fetches AMC order procurement summaries through the batched backend RPC", async () => {
    const rows = [
      {
        order_id: "order-1",
        status: "bids_requested",
        label: "Bids Requested",
        tone: "info",
      },
      {
        order_id: "order-2",
        status: "assigned",
        label: "Assigned",
        tone: "success",
      },
    ];
    supabaseMock.rpc.mockResolvedValue({ data: rows, error: null });

    await expect(fetchAmcOrderProcurementSummaries(["order-1", "order-2"])).resolves.toEqual(rows);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_amc_order_procurement_summaries", {
      p_order_ids: ["order-1", "order-2"],
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("returns an empty AMC procurement summary list without RPC for default empty input", async () => {
    await expect(fetchAmcOrderProcurementSummaries()).resolves.toEqual([]);

    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("returns an empty AMC procurement summary list without RPC for null or non-array input", async () => {
    await expect(fetchAmcOrderProcurementSummaries(null)).resolves.toEqual([]);
    await expect(fetchAmcOrderProcurementSummaries("order-1")).resolves.toEqual([]);

    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("filters empty AMC procurement summary ids before calling the RPC", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: [], error: null });

    await fetchAmcOrderProcurementSummaries(["order-1", "", null, "order-2"]);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_amc_order_procurement_summaries", {
      p_order_ids: ["order-1", "order-2"],
    });
  });

  it("returns an empty AMC procurement summary list for non-array RPC payloads", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: null, error: null });

    await expect(fetchAmcOrderProcurementSummaries(["order-1"])).resolves.toEqual([]);
  });

  it("surfaces AMC procurement summary RPC errors for callers to handle", async () => {
    const error = Object.assign(new Error("procurement summaries denied"), { code: "42501" });
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(fetchAmcOrderProcurementSummaries(["order-1"])).rejects.toBe(error);
  });

  it("exports vendor bid invitation create wrapper", () => {
    expect(createOrderVendorBidInvitation).toEqual(expect.any(Function));
  });

  it("creates vendor bid invitations through the backend RPC with a default payload", async () => {
    const result = {
      invitation_id: "invitation-1",
      recipient_id: "recipient-1",
      path: "/vendor/bid-invitations/token-1",
    };
    supabaseMock.rpc.mockResolvedValue({ data: result, error: null });

    await expect(createOrderVendorBidInvitation("recipient-1")).resolves.toEqual(result);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_vendor_bid_invitation_create", {
      p_recipient_id: "recipient-1",
      p_payload: {},
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("passes custom vendor bid invitation payloads through to the backend RPC", async () => {
    const payload = {
      vendor_contact_id: "contact-1",
      sent_to_email: "vendor@example.test",
      expires_at: "2026-06-05T20:00:00.000Z",
    };
    supabaseMock.rpc.mockResolvedValue({ data: { invitation_id: "invitation-1" }, error: null });

    await createOrderVendorBidInvitation("recipient-1", payload);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_vendor_bid_invitation_create", {
      p_recipient_id: "recipient-1",
      p_payload: payload,
    });
  });

  it("uses a safe empty vendor bid invitation payload for null payload input", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: { invitation_id: "invitation-1" }, error: null });

    await createOrderVendorBidInvitation("recipient-1", null);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_order_vendor_bid_invitation_create", {
      p_recipient_id: "recipient-1",
      p_payload: {},
    });
  });

  it("surfaces vendor bid invitation RPC errors for callers to handle", async () => {
    const error = Object.assign(new Error("bid invitation denied"), { code: "42501" });
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(createOrderVendorBidInvitation("recipient-1")).rejects.toBe(error);
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

  it("exports selected bid conversion wrapper", () => {
    expect(convertSelectedBidToAssignmentOffer).toEqual(expect.any(Function));
  });

  it("converts selected bid responses to assignment offers with an empty default payload", async () => {
    const result = {
      assignment_id: "assignment-1",
      bid_response_id: "response-1",
      status: "offered",
    };
    supabaseMock.rpc.mockResolvedValue({ data: result, error: null });

    await expect(convertSelectedBidToAssignmentOffer("response-1")).resolves.toEqual(result);

    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      "rpc_order_vendor_bid_response_convert_to_assignment_offer",
      {
        p_response_id: "response-1",
        p_payload: {},
      },
    );
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("passes custom selected bid conversion payload through to the backend RPC", async () => {
    const payload = {
      note: "Use selected bid terms.",
      due_at: "2026-06-08T20:00:00.000Z",
      review_due_at: "2026-06-09T20:00:00.000Z",
      expires_at: "2026-06-04T20:00:00.000Z",
      terms: { rush: true },
      handoff_payload: { source: "bid_panel" },
    };
    const result = {
      assignment_id: "assignment-1",
      result: "assignment_offer_created",
    };
    supabaseMock.rpc.mockResolvedValue({ data: result, error: null });

    await expect(convertSelectedBidToAssignmentOffer("response-1", payload)).resolves.toEqual(result);

    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      "rpc_order_vendor_bid_response_convert_to_assignment_offer",
      {
        p_response_id: "response-1",
        p_payload: payload,
      },
    );
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("uses a safe empty selected bid conversion payload for null payload input", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: { assignment_id: "assignment-1" }, error: null });

    await convertSelectedBidToAssignmentOffer("response-1", null);

    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      "rpc_order_vendor_bid_response_convert_to_assignment_offer",
      {
        p_response_id: "response-1",
        p_payload: {},
      },
    );
  });

  it("surfaces selected bid conversion RPC errors for callers to handle", async () => {
    const error = Object.assign(new Error("selected bid conversion denied"), { code: "42501" });
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(convertSelectedBidToAssignmentOffer("response-1")).rejects.toBe(error);
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
