import { describe, expect, it } from "vitest";

import {
  buildAmcPipelineStageCounts,
  getAmcPipelineAttentionRows,
  getAmcPipelineStage,
} from "../amcPipeline";

const amcOrder = (id, dueDate = "2026-06-10") => ({
  id,
  order_number: id,
  operations_scope: "amc_operations",
  final_due_at: dueDate,
});

describe("AMC procurement pipeline helpers", () => {
  it("maps procurement summaries to plain-English AMC pipeline stages", () => {
    expect(getAmcPipelineStage(null).label).toBe("Needs Bids");
    expect(getAmcPipelineStage({ status: "bids_requested" }).label).toBe("Awaiting Responses");
    expect(getAmcPipelineStage({ status: "responses_received" }).label).toBe("Select Bid");
    expect(getAmcPipelineStage({ status: "bid_selected" }).label).toBe("Send Offer");
    expect(getAmcPipelineStage({ status: "assignment_offered", assignment_status: "offered" }).label).toBe("In Progress");
    expect(getAmcPipelineStage({ status: "assigned", assignment_status: "in_progress" }).label).toBe("In Progress");
    expect(getAmcPipelineStage({ status: "assigned", assignment_status: "submitted" }).label).toBe("Review");
  });

  it("counts only AMC-scoped orders in the command pipeline", () => {
    const orders = [
      amcOrder("order-1"),
      amcOrder("order-2"),
      amcOrder("order-3"),
      { id: "internal-order", operations_scope: "internal_operations" },
    ];
    const counts = buildAmcPipelineStageCounts(orders, {
      "order-2": { status: "responses_received" },
      "order-3": { status: "assigned", assignment_status: "submitted" },
    });

    expect(Object.fromEntries(counts.map((stage) => [stage.id, stage.count]))).toMatchObject({
      needs_bids: 1,
      select_bid: 1,
      review: 1,
      awaiting_responses: 0,
    });
  });

  it("returns only owner-action rows for the attention table", () => {
    const rows = getAmcPipelineAttentionRows(
      [
        amcOrder("needs-bids", "2026-06-12"),
        amcOrder("awaiting-response", "2026-06-08"),
        amcOrder("select-bid", "2026-06-09"),
        amcOrder("send-offer", "2026-06-07"),
        amcOrder("in-progress", "2026-06-06"),
      ],
      {
        "awaiting-response": { status: "bids_requested" },
        "select-bid": { status: "responses_received" },
        "send-offer": { status: "bid_selected" },
        "in-progress": { status: "assigned", assignment_status: "accepted" },
      },
    );

    expect(rows.map((row) => row.id)).toEqual(["needs-bids", "select-bid", "send-offer"]);
  });
});
