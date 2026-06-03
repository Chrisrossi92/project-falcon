import { describe, expect, it } from "vitest";

import { deriveOrderBidStatus } from "../bidStatus";

const baseRequest = {
  bid_request_id: "bid-request-1",
  status: "sent",
  response_due_at: "2026-06-03T20:00:00.000Z",
  client_due_at: "2026-06-10T20:00:00.000Z",
  created_at: "2026-06-02T15:00:00.000Z",
  recipients: [
    {
      recipient_id: "recipient-1",
      vendor_company_name: "Franklin Commercial Valuation",
      status: "sent",
      response: null,
    },
    {
      recipient_id: "recipient-2",
      vendor_company_name: "Metro Valuation Group",
      status: "sent",
      response: null,
    },
  ],
};

function derive(overrides = {}) {
  return deriveOrderBidStatus({
    bidRequests: overrides.bidRequests,
    activeVendorAssignment: overrides.activeVendorAssignment,
  });
}

describe("deriveOrderBidStatus", () => {
  it("returns not sent for bid for empty bid request history", () => {
    expect(derive({ bidRequests: [] })).toEqual({
      status: "not_sent_for_bid",
      label: "Not sent for bid",
      contactedCount: 0,
      respondedCount: 0,
      selectedVendorName: null,
      lowestFee: null,
      fastestTurnTimeDays: null,
      earliestProposedDueAt: null,
      responseDueAt: null,
      clientDueAt: null,
      assignmentStatus: null,
      tone: "neutral",
    });
  });

  it("returns out for bid for open outreach without responses", () => {
    const result = derive({ bidRequests: [baseRequest] });

    expect(result.status).toBe("out_for_bid");
    expect(result.label).toBe("Out for bid");
    expect(result.contactedCount).toBe(2);
    expect(result.respondedCount).toBe(0);
    expect(result.responseDueAt).toBe("2026-06-03T20:00:00.000Z");
    expect(result.clientDueAt).toBe("2026-06-10T20:00:00.000Z");
  });

  it("returns bids received for open outreach with responses and derives counts and best response metrics", () => {
    const result = derive({
      bidRequests: [
        {
          ...baseRequest,
          status: "partially_responded",
          recipients: [
            {
              ...baseRequest.recipients[0],
              status: "responded",
              response: {
                fee_amount: "1450",
                currency: "USD",
                proposed_due_at: "2026-06-08T20:00:00.000Z",
                turn_time_days: "5",
                submitted_at: "2026-06-02T16:00:00.000Z",
              },
            },
            {
              ...baseRequest.recipients[1],
              status: "responded",
              response: {
                fee_amount: 1250,
                currency: "USD",
                proposed_due_at: "2026-06-07T20:00:00.000Z",
                turn_time_days: 4,
                submitted_at: "2026-06-02T17:00:00.000Z",
              },
            },
          ],
        },
      ],
    });

    expect(result.status).toBe("bids_received");
    expect(result.contactedCount).toBe(2);
    expect(result.respondedCount).toBe(2);
    expect(result.lowestFee).toBe(1250);
    expect(result.fastestTurnTimeDays).toBe(4);
    expect(result.earliestProposedDueAt).toBe("2026-06-07T20:00:00.000Z");
  });

  it("returns bid selected and selected vendor name when a response is selected", () => {
    const result = derive({
      bidRequests: [
        {
          ...baseRequest,
          status: "closed",
          recipients: [
            {
              ...baseRequest.recipients[0],
              status: "selected",
              response: {
                response_id: "response-1",
                fee_amount: 1450,
                proposed_due_at: "2026-06-08T20:00:00.000Z",
                turn_time_days: 5,
                selected_at: "2026-06-02T18:00:00.000Z",
              },
            },
            {
              ...baseRequest.recipients[1],
              status: "not_selected",
              response: {
                response_id: "response-2",
                fee_amount: 1250,
                proposed_due_at: "2026-06-07T20:00:00.000Z",
                turn_time_days: 4,
              },
            },
          ],
        },
      ],
    });

    expect(result.status).toBe("bid_selected");
    expect(result.selectedVendorName).toBe("Franklin Commercial Valuation");
    expect(result.respondedCount).toBe(2);
    expect(result.lowestFee).toBe(1250);
  });

  it("lets active assignment offered state win over bid status", () => {
    const result = derive({
      bidRequests: [baseRequest],
      activeVendorAssignment: {
        id: "assignment-1",
        status: "offered",
      },
    });

    expect(result.status).toBe("assignment_offered");
    expect(result.label).toBe("Assignment offered");
    expect(result.assignmentStatus).toBe("offered");
  });

  it("lets accepted, in progress, and submitted assignment state win as assigned", () => {
    for (const status of ["accepted", "in_progress", "submitted"]) {
      expect(
        derive({
          bidRequests: [baseRequest],
          activeVendorAssignment: { status },
        }).status,
      ).toBe("assigned");
    }
  });

  it("returns no bids expired for expired outreach with no responses", () => {
    const result = derive({
      bidRequests: [
        {
          ...baseRequest,
          status: "expired",
        },
      ],
    });

    expect(result.status).toBe("no_bids_expired");
    expect(result.label).toBe("No bids / expired");
    expect(result.contactedCount).toBe(2);
  });

  it("returns cancelled for cancelled-only request history", () => {
    const result = derive({
      bidRequests: [
        {
          ...baseRequest,
          status: "cancelled",
        },
      ],
    });

    expect(result.status).toBe("cancelled");
    expect(result.label).toBe("Cancelled");
  });

  it("handles malformed data safely", () => {
    const result = deriveOrderBidStatus({
      bidRequests: [
        null,
        {
          status: "sent",
          recipients: [
            null,
            {
              status: "responded",
              vendor_name: "Fallback Vendor",
              response: {
                fee_amount: "not-a-number",
                turn_time_days: "",
                proposed_due_at: "invalid-date",
              },
            },
          ],
        },
      ],
      activeVendorAssignment: {
        status: "unknown",
      },
    });

    expect(result.status).toBe("bids_received");
    expect(result.contactedCount).toBe(1);
    expect(result.respondedCount).toBe(1);
    expect(result.lowestFee).toBeNull();
    expect(result.fastestTurnTimeDays).toBeNull();
    expect(result.earliestProposedDueAt).toBeNull();
    expect(result.assignmentStatus).toBe("unknown");
  });
});
